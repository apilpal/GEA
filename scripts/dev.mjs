#!/usr/bin/env node
// Starts the backend (FastAPI) and frontend (Vite) together with one command.
//   pnpm dev            (or: npm run dev / node scripts/dev.mjs)
// Options via environment variables:
//   BACKEND_PORT=8000  FRONTEND_PORT=5173  RELOAD=1 (auto-restart backend on code changes)
//   HOST=0.0.0.0 to reach the app from other devices on your Wi-Fi
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const backendDir = join(root, 'backend');
const frontendDir = join(root, 'frontend');
const backendPort = process.env.BACKEND_PORT || '8000';
const frontendPort = process.env.FRONTEND_PORT || '5173';
const host = process.env.HOST || '127.0.0.1';

const venvPython = join(backendDir, '.venv', 'bin', 'python');
const python = existsSync(venvPython) ? venvPython : 'python3';
const vite = join(frontendDir, 'node_modules', '.bin', 'vite');

const problems = [];
if (!existsSync(join(backendDir, '.env.development'))) problems.push('backend/.env.development is missing');
if (!existsSync(venvPython)) problems.push('backend/.venv is missing');
if (!existsSync(vite)) problems.push('frontend packages are not installed');
if (problems.length) {
  console.error(`Setup is not finished: ${problems.join('; ')}.\nRun once:  bash scripts/termux-setup.sh`);
  process.exit(1);
}

const color = (code, text) => (process.stdout.isTTY ? `\x1b[${code}m${text}\x1b[0m` : text);
const services = [
  {
    name: 'api', tag: color(36, '[api]'), cwd: backendDir, cmd: python,
    args: ['-m', 'uvicorn', 'src.main:app', '--host', host, '--port', backendPort,
      ...(process.env.RELOAD ? ['--reload', '--reload-dir', 'src'] : [])],
    env: {},
  },
  {
    name: 'web', tag: color(35, '[web]'), cwd: frontendDir, cmd: vite,
    args: ['--host', host, '--port', frontendPort, '--strictPort'],
    env: { API_TARGET: `http://127.0.0.1:${backendPort}` },
  },
];

let stopping = false;
let exitCode = 0;
const running = new Set();

function pipeLines(stream, tag, out) {
  let buffer = '';
  stream.on('data', (chunk) => {
    buffer += chunk.toString();
    const lines = buffer.split('\n');
    buffer = lines.pop();
    for (const line of lines) out.write(`${tag} ${line}\n`);
  });
  stream.on('end', () => { if (buffer) out.write(`${tag} ${buffer}\n`); });
}

function stopAll(code) {
  if (!stopping) { stopping = true; exitCode = code; }
  for (const child of running) child.kill('SIGTERM');
  setTimeout(() => { for (const child of running) child.kill('SIGKILL'); }, 4000).unref();
}

for (const svc of services) {
  const child = spawn(svc.cmd, svc.args, {
    cwd: svc.cwd, env: { ...process.env, ...svc.env }, stdio: ['ignore', 'pipe', 'pipe'],
  });
  running.add(child);
  pipeLines(child.stdout, svc.tag, process.stdout);
  pipeLines(child.stderr, svc.tag, process.stderr);
  child.on('error', (err) => { console.error(`${svc.tag} failed to start: ${err.message}`); stopAll(1); });
  child.on('exit', (code, signal) => {
    running.delete(child);
    if (!stopping) {
      console.error(`${svc.tag} stopped (${signal || `exit code ${code}`}) - stopping the other service too.`);
      stopAll(code || 1);
    }
    if (running.size === 0) process.exit(exitCode);
  });
}

process.on('SIGINT', () => stopAll(0));
process.on('SIGTERM', () => stopAll(0));

console.log(`\nApp:      http://${host === '0.0.0.0' ? '127.0.0.1' : host}:${frontendPort}   (open this one)`);
console.log(`API docs: http://${host === '0.0.0.0' ? '127.0.0.1' : host}:${backendPort}/docs`);
console.log('Press Ctrl+C to stop both.\n');
