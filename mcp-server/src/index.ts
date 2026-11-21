import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ErrorCode, ListToolsRequestSchema, McpError } from "@modelcontextprotocol/sdk/types.js";
import { exec } from "child_process";
import { promisify } from "util";
import { writeFile } from "fs/promises";

const execAsync = promisify(exec);

class MyServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: "apil-mcp-server",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
    this.setupRequestHandlers();
  }

  private setupToolHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: "code_search",
            description: "Search for code patterns in the project",
            inputSchema: {
              type: "object",
              properties: {
                query: {
                  type: "string",
                  description: "The regex pattern to search for in code files",
                },
                path: {
                  type: "string",
                  description: "The directory to search in, relative to workspace",
                  default: ".",
                },
                filePattern: {
                  type: "string",
                  description: "Glob pattern to filter files (e.g., '*.ts')",
                  default: "*",
                },
              },
              required: ["query"],
            },
          },
          {
            name: "doc_search",
            description: "Search for content in the docs/ directory",
            inputSchema: {
              type: "object",
              properties: {
                query: {
                  type: "string",
                  description: "The text to search for in documentation files",
                },
              },
              required: ["query"],
            },
          },
          {
            name: "run_tests",
            description: "Run tests in the project",
            inputSchema: {
              type: "object",
              properties: {
                testPattern: {
                  type: "string",
                  description: "Pattern to match test files (optional)",
                },
              },
            },
          },
          {
            name: "get_frontend_overview",
            description: "Provide summary of frontend structure and components",
            inputSchema: {
              type: "object",
              properties: {},
            },
          },
          {
            name: "search_frontend",
            description: "Search for patterns specifically in frontend code",
            inputSchema: {
              type: "object",
              properties: {
                query: {
                  type: "string",
                  description: "The regex pattern to search for in frontend files",
                },
                filePattern: {
                  type: "string",
                  description: "Glob pattern to filter files (e.g., '*.ts')",
                  default: "*",
                },
              },
              required: ["query"],
            },
          },
          {
            name: "read_frontend_file",
            description: "Read specific frontend files",
            inputSchema: {
              type: "object",
              properties: {
                path: {
                  type: "string",
                  description: "The path to the frontend file to read, relative to frontend directory",
                },
              },
              required: ["path"],
            },
          },
          {
            name: "create_file",
            description: "Creates a new file with specified content",
            inputSchema: {
              type: "object",
              properties: {
                file_path: {
                  type: "string",
                  description: "Path to the file to create, relative to workspace",
                },
                content: {
                  type: "string",
                  description: "Content to write to the file",
                },
              },
              required: ["file_path", "content"],
            },
          },
          {
            name: "run_build",
            description: "Runs npm build command",
            inputSchema: {
              type: "object",
              properties: {},
            },
          },
          {
            name: "analyze_code_quality",
            description: "Runs ESLint to analyze code quality",
            inputSchema: {
              type: "object",
              properties: {},
            },
          },
        ],
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case "code_search":
            return await this.handleCodeSearch(args);
          case "doc_search":
            return await this.handleDocSearch(args);
          case "run_tests":
            return await this.handleRunTests(args);
          case "get_frontend_overview":
            return await this.handleGetFrontendOverview(args);
          case "search_frontend":
            return await this.handleSearchFrontend(args);
          case "read_frontend_file":
            return await this.handleReadFrontendFile(args);
          case "create_file":
            return await this.handleCreateFile(args);
          case "run_build":
            return await this.handleRunBuild(args);
          case "analyze_code_quality":
            return await this.handleAnalyzeCodeQuality(args);
          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${name}`
            );
        }
      } catch (error) {
        throw new McpError(
          ErrorCode.InternalError,
          `Tool execution failed: ${(error as Error).message}`
        );
      }
    });
  }

  private setupRequestHandlers() {
    // Add any other request handlers if needed
  }

  private async handleCodeSearch(args: any) {
    const { query, path: searchPath = ".", filePattern = "*" } = args;

    try {
      const result = await execAsync(`grep -r -n --include="${filePattern}" "${query}" "${searchPath}"`, {
        cwd: "/home/7615890397_0/Dev/AITest"
      });

      return {
        content: [{ type: "text", text: result.stdout || "No matches found" }]
      };
    } catch (error: any) {
      return {
        content: [{ type: "text", text: `Search failed: ${error.message}` }],
        isError: true
      };
    }
  }

  private async handleDocSearch(args: any) {
    const { query } = args;

    try {
      const result = await execAsync(`grep -r -n "${query}" docs/`, {
        cwd: "/home/7615890397_0/Dev/AITest"
      });

      return {
        content: [{ type: "text", text: result.stdout || "No matches found in docs" }]
      };
    } catch (error: any) {
      return {
        content: [{ type: "text", text: `Doc search failed: ${error.message}` }],
        isError: true
      };
    }
  }

  private async handleRunTests(args: any) {
    const { testPattern } = args;

    try {
      let cmd = "cd backend && python -m pytest";
      if (testPattern) {
        cmd += ` -k "${testPattern}"`;
      }

      const result = await execAsync(cmd, { cwd: "/home/7615890397_0/Dev/AITest" });

      return {
        content: [{ type: "text", text: result.stdout || "Tests completed" }]
      };
    } catch (error: any) {
      return {
        content: [{ type: "text", text: `Test execution failed: ${error.message}\nStderr: ${error.stderr || ""}` }],
        isError: true
      };
    }
  }

  private async handleGetFrontendOverview(args: any) {
    try {
      // Get directory structure
      const dirResult = await execAsync("find frontend/ -type d -not -path '*/node_modules/*' -not -path '*/.git/*' | head -20", {
        cwd: "/home/7615890397_0/Dev/AITest"
      });

      // Get key files
      const fileResult = await execAsync("find frontend/ -name '*.js' -o -name '*.ts' -o -name '*.vue' -o -name '*.html' -o -name '*.css' -o -name '*.scss' -o -name 'package.json' | head -20", {
        cwd: "/home/7615890397_0/Dev/AITest"
      });

      const overview = `Frontend Structure Overview:

Directories:
${dirResult.stdout || "No directories found"}

Key Files:
${fileResult.stdout || "No key files found"}`;

      return {
        content: [{ type: "text", text: overview }]
      };
    } catch (error: any) {
      return {
        content: [{ type: "text", text: `Failed to get frontend overview: ${error.message}` }],
        isError: true
      };
    }
  }

  private async handleSearchFrontend(args: any) {
    const { query, filePattern = "*" } = args;

    try {
      const result = await execAsync(`grep -r -n --include="${filePattern}" "${query}" "frontend/"`, {
        cwd: "/home/7615890397_0/Dev/AITest"
      });

      return {
        content: [{ type: "text", text: result.stdout || "No matches found in frontend" }]
      };
    } catch (error: any) {
      return {
        content: [{ type: "text", text: `Frontend search failed: ${error.message}` }],
        isError: true
      };
    }
  }

  private async handleReadFrontendFile(args: any) {
    const { path } = args;

    try {
      const result = await execAsync(`cat "frontend/${path}"`, {
        cwd: "/home/7615890397_0/Dev/AITest"
      });

      return {
        content: [{ type: "text", text: result.stdout }]
      };
    } catch (error: any) {
      return {
        content: [{ type: "text", text: `Failed to read frontend file: ${error.message}` }],
        isError: true
      };
    }
  }

  private async handleCreateFile(args: any) {
    const { file_path, content } = args;

    try {
      await writeFile(file_path, content, { encoding: 'utf8' });
      return {
        content: [{ type: "text", text: `File created successfully: ${file_path}` }]
      };
    } catch (error: any) {
      return {
        content: [{ type: "text", text: `Failed to create file: ${error.message}` }],
        isError: true
      };
    }
  }

  private async handleRunBuild(args: any) {
    try {
      const result = await execAsync("npm run build", { cwd: "/home/7615890397_0/Dev/AITest" });
      return {
        content: [{ type: "text", text: result.stdout || "Build completed successfully" }]
      };
    } catch (error: any) {
      return {
        content: [{ type: "text", text: `Build failed: ${error.message}\nStderr: ${error.stderr || ""}` }],
        isError: true
      };
    }
  }

  private async handleAnalyzeCodeQuality(args: any) {
    try {
      const result = await execAsync("npx eslint .", { cwd: "/home/7615890397_0/Dev/AITest" });
      return {
        content: [{ type: "text", text: result.stdout || "Code quality analysis completed with no issues" }]
      };
    } catch (error: any) {
      return {
        content: [{ type: "text", text: `Code quality analysis failed: ${error.message}\nStderr: ${error.stderr || ""}` }],
        isError: true
      };
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("MCP server running on stdio");
  }
}

// Start the server
const server = new MyServer();
server.run().catch(console.error);