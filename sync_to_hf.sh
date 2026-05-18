#!/bin/bash
set -e

# ==============================================================================
# LatentLearn - Hugging Face Space One-Click Sync & Deployment Script
# ==============================================================================
# This script automates:
#   1. Clones your HF Space repository to a temporary directory.
#   2. Syncs your local `agent/` updates into the HF Space directory.
#   3. Automatically flattens the `agent` structure so that the Dockerfile
#      and code files reside at the root of the HF Space (HF requirement).
#   4. Commits and pushes the updates directly to Hugging Face.
#   5. Automatically cleans up the temporary files.
# ==============================================================================

# Configure your Hugging Face username and space name
HF_USERNAME="howcloudy"
HF_SPACE_NAME="latentlearn-agent"
HF_REPO_URL="https://huggingface.co/spaces/${HF_USERNAME}/${HF_SPACE_NAME}"

echo "🚀 Starting sync to Hugging Face Space: ${HF_USERNAME}/${HF_SPACE_NAME}..."

# 1. Create a clean temporary directory in the workspace
TEMP_DIR="./.hf_sync_temp"
rm -rf "$TEMP_DIR"
mkdir -p "$TEMP_DIR"

echo "📦 Cloning Hugging Face Space repository..."
# Clone the repository
git clone "$HF_REPO_URL" "$TEMP_DIR"

# 2. Copy the contents of the local agent/ directory into the cloned repo
echo "🔄 Copying latest agent updates (excluding virtual environments and secrets)..."
# Bash asterisk '*' automatically excludes hidden files like '.venv' and '.env.agent'
cp -R agent/* "$TEMP_DIR/"

# 3. Git add, commit, and push in the cloned repository
cd "$TEMP_DIR"

# Check if there are changes to commit
if [ -z "$(git status --porcelain)" ]; then
    echo "✅ No changes detected. Hugging Face Space is already up to date!"
    cd ..
    rm -rf "$TEMP_DIR"
    exit 0
fi

echo "💾 Committing changes..."
git add .
git commit -m "deploy: sync agent updates to Hugging Face Space"

echo "⬆️ Pushing updates to Hugging Face..."
echo "⚠️ Note: If prompted, enter your Hugging Face Username and your HF Access Token (as password)."
git push

cd ..

# 4. Clean up temporary directory
echo "🧹 Cleaning up temporary files..."
rm -rf "$TEMP_DIR"

echo "🎉 Successfully pushed updates! Hugging Face is now building and deploying your changes."
echo "🔗 Monitor your space build logs here: https://huggingface.co/spaces/${HF_USERNAME}/${HF_SPACE_NAME}"
