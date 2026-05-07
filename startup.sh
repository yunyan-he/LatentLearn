#!/usr/bin/env bash

# Exit immediately if a command exits with a non-zero status
set -e

echo "🚀 Starting LatentLearn Development Server..."

echo "----------------------------------------"

# 1. Check Node.js installation
if ! command -v npm &> /dev/null; then
    echo "❌ Error: 'npm' is not installed or not in your PATH."
    echo "Please install Node.js (https://nodejs.org/) to run this project."
    exit 1
fi

# 2. Check for environment configuration
if [ ! -f .env.local ]; then
    echo "⚠️ Configuration file '.env.local' not found."
    echo "Copying from '.env.local.example'..."
    cp .env.local.example .env.local
    echo "⚠️ IMPORTANT: Please open '.env.local' and fill in your LLM_API_KEY and provider settings."
    echo "After filling in the API keys, run this script again."
    exit 1
else
    echo "✅ Configuration '.env.local' found."
fi

# 3. Install npm dependencies
echo "📦 Installing npm dependencies..."
npm install

# 4. Start the LangGraph Agent backend (if agent/ directory exists)
AGENT_PID=""
if [ -d "agent" ]; then
    echo "----------------------------------------"
    echo "🤖 Found agent/ directory — starting LangGraph backend..."

    # Check for .env.agent
    if [ ! -f "agent/.env.agent" ]; then
        echo "⚠️  agent/.env.agent not found."
        echo "   Copying from agent/.env.agent.example..."
        cp agent/.env.agent.example agent/.env.agent
        echo "   IMPORTANT: Fill in AGENT_LLM_API_KEY in agent/.env.agent then restart."
    fi

    # Create virtualenv if not present
    if [ ! -d "agent/.venv" ]; then
        echo "🐍 Creating Python virtual environment..."
        python3 -m venv agent/.venv
    fi

    # Install Python dependencies
    echo "📦 Installing Python dependencies..."
    agent/.venv/bin/pip install -q -r agent/requirements.txt

    # Launch FastAPI with uvicorn (background)
    AGENT_PORT="${AGENT_PORT:-8100}"
    echo "🔥 Launching FastAPI agent on http://127.0.0.1:${AGENT_PORT}"
    PYTHONPATH="$(pwd)" agent/.venv/bin/uvicorn agent.main:app \
        --host 127.0.0.1 \
        --port "${AGENT_PORT}" \
        --reload \
        --reload-dir agent \
        &
    AGENT_PID=$!
    echo "   Agent PID: ${AGENT_PID}"
fi

# 5. Start the Next.js dev server
echo "----------------------------------------"
echo "💻 Starting Next.js dev server..."
echo "   Frontend: http://localhost:3000"
if [ -n "$AGENT_PID" ]; then
    echo "   Agent:    http://127.0.0.1:${AGENT_PORT:-8100}"
fi
echo "----------------------------------------"

# Trap SIGINT/SIGTERM to clean up background processes
cleanup() {
    echo ""
    echo "🛑 Shutting down..."
    if [ -n "$AGENT_PID" ]; then
        kill "$AGENT_PID" 2>/dev/null || true
    fi
}
trap cleanup EXIT INT TERM

npm run dev
