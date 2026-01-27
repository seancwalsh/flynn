#!/bin/bash
#
# ElevenLabs Audio Generator Wrapper
# Generates MP3 audio files for all symbols using ElevenLabs API
#
# Usage:
#   ./Scripts/generate_audio.sh                  # Generate all missing audio
#   ./Scripts/generate_audio.sh --force          # Regenerate all audio
#   ./Scripts/generate_audio.sh --symbol want   # Generate specific symbol
#   ./Scripts/generate_audio.sh --language en   # Generate specific language
#
# Environment:
#   ELEVENLABS_API_KEY - Required (or set in .env file)
#

set -e

# Change to project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

# Load .env file if exists (for local development)
if [ -f .env ]; then
    echo "Loading API key from .env file..."
    export $(grep -v '^#' .env | grep ELEVENLABS_API_KEY | xargs)
fi

# Check for API key
if [ -z "$ELEVENLABS_API_KEY" ]; then
    echo "Error: ELEVENLABS_API_KEY not set"
    echo ""
    echo "Set the API key:"
    echo "  export ELEVENLABS_API_KEY='your_key_here'"
    echo ""
    echo "Or add to .env file:"
    echo "  ELEVENLABS_API_KEY=your_key_here"
    exit 1
fi

echo "ElevenLabs Audio Generator"
echo "=========================="
echo ""
echo "Project root: $PROJECT_ROOT"
echo "API key: ${ELEVENLABS_API_KEY:0:10}..."
echo ""

# Make the Swift script executable
chmod +x "$SCRIPT_DIR/generate_audio.swift"

# Run the Swift script with all arguments passed through
swift "$SCRIPT_DIR/generate_audio.swift" "$@"

echo ""
echo "Audio files are in: FlynnAAC/FlynnAAC/Resources/Audio/"
echo ""
echo "Next steps:"
echo "  1. Add the Audio folder to Xcode project"
echo "  2. Ensure files are in 'Copy Bundle Resources' build phase"
echo "  3. Build and run the app"
