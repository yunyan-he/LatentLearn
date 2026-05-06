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

# 3. Install dependencies
echo "📦 Installing npm dependencies..."
npm install

# 4. Start the server
echo "----------------------------------------"
echo "💻 Starting Next.js dev server..."
echo "Open your browser to http://localhost:3000"
echo "----------------------------------------"
npm run dev
