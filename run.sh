#!/bin/bash

set -e  # Exit on any error

# FIXME: Ensure proper directory navigation for backend and frontend server commands

# Function to cleanup processes on exit
cleanup() {
    echo ""
    echo "Stopping servers..."
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null || true
    fi
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null || true
    fi
    exit 0
}

# Set trap to cleanup on script exit
trap cleanup SIGINT SIGTERM

# Set default ports if not provided
BACKEND_PORT=${BACKEND_PORT:-8000}
FRONTEND_PORT=${FRONTEND_PORT:-5173}

echo "🚀 Starting Student Profiles PWA..."
echo "=========================================="

# Check if dependencies are installed
echo "📦 Checking dependencies..."

# Check backend dependencies
if [ ! -f "backend/requirements.txt" ]; then
    echo "❌ Backend requirements.txt not found!"
    exit 1
fi

# Check if Python dependencies are installed
cd backend
python -c "import fastapi, sqlalchemy" 2>/dev/null || {
    echo "📦 Installing backend dependencies..."
    pip install -r requirements.txt
}
cd ..

# Check frontend dependencies
if [ -d "frontend" ] && [ -f "frontend/package.json" ]; then
    cd frontend
    if [ ! -d "node_modules" ]; then
        echo "📦 Installing frontend dependencies..."
        npm install
    fi
    cd ..
fi


# Start the backend server in the background
echo "🔧 Starting backend server on port $BACKEND_PORT..."
cd backend
uvicorn src.main:app --reload --host 0.0.0.0 --port $BACKEND_PORT &
BACKEND_PID=$!
cd ..

# Start the frontend server
echo "🌐 Starting frontend server on port $FRONTEND_PORT..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "✅ Servers started successfully!"
echo "=========================================="
echo "📊 Backend API:     http://127.0.0.1:$BACKEND_PORT"
echo "🎨 Frontend PWA:    http://127.0.0.1:$FRONTEND_PORT"
echo "📚 API Docs:        http://127.0.0.1:$BACKEND_PORT/docs"
echo "=========================================="
echo "=========================================="
echo "💡 Press Ctrl+C to stop all servers"
echo ""

# Wait for the servers
wait $BACKEND_PID $FRONTEND_PID