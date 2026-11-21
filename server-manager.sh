#!/bin/bash

# Server Management Script for Frontend and Backend
# Usage: ./server-manager.sh [start|stop|restart|status] [frontend|backend|both]

FRONTEND_DIR="frontend"
BACKEND_DIR="backend"
FRONTEND_PORT=8080
BACKEND_PORT=8000

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0  # Port is in use
    else
        return 1  # Port is free
    fi
}

start_frontend() {
    log "Starting frontend server on port $FRONTEND_PORT..."
    
    if check_port $FRONTEND_PORT; then
        warning "Port $FRONTEND_PORT is already in use"
        return 1
    fi
    
    cd $FRONTEND_DIR || { error "Frontend directory not found"; return 1; }
    
    # Kill any existing frontend processes
    pkill -f "python.*http.server.*$FRONTEND_PORT" 2>/dev/null || true
    
    nohup python3 -m http.server $FRONTEND_PORT > ../frontend.log 2>&1 &
    local pid=$!
    
    sleep 2
    if check_port $FRONTEND_PORT; then
        success "Frontend server started (PID: $pid)"
        echo $pid > ../frontend.pid
        return 0
    else
        error "Failed to start frontend server"
        return 1
    fi
}

start_backend() {
    log "Starting backend server on port $BACKEND_PORT..."
    
    if check_port $BACKEND_PORT; then
        warning "Port $BACKEND_PORT is already in use"
        return 1
    fi
    
    cd $BACKEND_DIR || { error "Backend directory not found"; return 1; }
    
    # Kill any existing backend processes
    pkill -f "run_server.py" 2>/dev/null || true
    
    nohup python run_server.py --dev > ../backend.log 2>&1 &
    local pid=$!
    
    sleep 3
    if check_port $BACKEND_PORT; then
        success "Backend server started (PID: $pid)"
        echo $pid > ../backend.pid
        return 0
    else
        error "Failed to start backend server"
        return 1
    fi
}

stop_frontend() {
    log "Stopping frontend server..."
    
    if [ -f frontend.pid ]; then
        local pid=$(cat frontend.pid)
        if kill $pid 2>/dev/null; then
            success "Frontend server stopped (PID: $pid)"
            rm frontend.pid
        else
            warning "Could not kill frontend process $pid"
        fi
    else
        warning "No frontend PID file found"
    fi
    
    # Kill any remaining frontend processes
    pkill -f "python.*http.server.*$FRONTEND_PORT" 2>/dev/null || true
}

stop_backend() {
    log "Stopping backend server..."
    
    if [ -f backend.pid ]; then
        local pid=$(cat backend.pid)
        if kill $pid 2>/dev/null; then
            success "Backend server stopped (PID: $pid)"
            rm backend.pid
        else
            warning "Could not kill backend process $pid"
        fi
    else
        warning "No backend PID file found"
    fi
    
    # Kill any remaining backend processes
    pkill -f "run_server.py" 2>/dev/null || true
}

status() {
    echo "🔍 SERVER STATUS CHECK"
    echo "======================"
    
    # Check frontend
    if check_port $FRONTEND_PORT; then
        echo -e "Frontend (Port $FRONTEND_PORT): ${GREEN}✅ Running${NC}"
    else
        echo -e "Frontend (Port $FRONTEND_PORT): ${RED}❌ Not Running${NC}"
    fi
    
    # Check backend
    if check_port $BACKEND_PORT; then
        echo -e "Backend (Port $BACKEND_PORT):  ${GREEN}✅ Running${NC}"
    else
        echo -e "Backend (Port $BACKEND_PORT):  ${RED}❌ Not Running${NC}"
    fi
    
    echo ""
    echo "📋 Process Details:"
    echo "Frontend processes:"
    ps aux | grep "http.server.*$FRONTEND_PORT" | grep -v grep || echo "  No frontend processes"
    
    echo "Backend processes:"
    ps aux | grep "run_server.py" | grep -v grep || echo "  No backend processes"
}

case "${1:-help}" in
    "start")
        case "${2:-both}" in
            "frontend")
                start_frontend
                ;;
            "backend")
                start_backend
                ;;
            "both")
                start_frontend && start_backend
                ;;
            *)
                echo "Usage: $0 start [frontend|backend|both]"
                exit 1
                ;;
        esac
        ;;
    "stop")
        case "${2:-both}" in
            "frontend")
                stop_frontend
                ;;
            "backend")
                stop_backend
                ;;
            "both")
                stop_frontend && stop_backend
                ;;
            *)
                echo "Usage: $0 stop [frontend|backend|both]"
                exit 1
                ;;
        esac
        ;;
    "restart")
        case "${2:-both}" in
            "frontend")
                stop_frontend && start_frontend
                ;;
            "backend")
                stop_backend && start_backend
                ;;
            "both")
                stop_frontend && stop_backend && start_frontend && start_backend
                ;;
            *)
                echo "Usage: $0 restart [frontend|backend|both]"
                exit 1
                ;;
        esac
        ;;
    "status")
        status
        ;;
    "help"|*)
        echo "🚀 Server Management Script"
        echo "=========================="
        echo ""
        echo "Usage: $0 [command] [target]"
        echo ""
        echo "Commands:"
        echo "  start [frontend|backend|both]  - Start servers"
        echo "  stop [frontend|backend|both]   - Stop servers"
        echo "  restart [frontend|backend|both] - Restart servers"
        echo "  status                         - Show server status"
        echo ""
        echo "Examples:"
        echo "  $0 start both      # Start both servers"
        echo "  $0 stop frontend   # Stop frontend only"
        echo "  $0 restart backend # Restart backend only"
        echo "  $0 status          # Check server status"
        echo ""
        echo "Log files:"
        echo "  frontend.log - Frontend server logs"
        echo "  backend.log  - Backend server logs"
        ;;
esac
