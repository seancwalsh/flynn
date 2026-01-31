#!/bin/bash

# Script to help identify and add missing service files to Xcode project
# This script opens Xcode and provides instructions

set -e

PROJECT_DIR="/Users/seanwalsh/code/projects/flynn-app/aac-ios"
PROJECT_FILE="$PROJECT_DIR/FlynnAAC.xcodeproj"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔧 Add Missing Service Files to Xcode Project"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# List missing files
echo "📋 Missing Service Files:"
echo ""
echo "  Services/"
echo "    • HapticManager.swift"
echo "    • ErrorNotificationService.swift"
echo "    • ImagePreloadService.swift"
echo "    • UsageLogManager.swift"
echo "    • DeviceManager.swift"
echo "    • SessionManager.swift"
echo ""
echo "  Services/API/"
echo "    • AuthService.swift"
echo "    • SyncService.swift"
echo "    • PushNotificationService.swift"
echo ""
echo "  Views/Auth/"
echo "    • AuthContainerView.swift"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📖 Manual Steps in Xcode:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1. The project will open in Xcode momentarily"
echo "2. In the Project Navigator (left sidebar):"
echo "   - Find each file listed above"
echo "   - Click on the file"
echo "3. In the File Inspector (right sidebar):"
echo "   - Look for 'Target Membership' section"
echo "   - Check the box next to 'FlynnAAC'"
echo "4. Repeat for all files listed above"
echo "5. Build the project (⌘B)"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
read -p "Press Enter to open Xcode..."

# Open Xcode
open "$PROJECT_FILE"

echo ""
echo "✅ Xcode is opening..."
echo ""
echo "After adding files to target, you can test with:"
echo "  cd $PROJECT_DIR"
echo "  xcodebuild -scheme FlynnAAC -sdk iphonesimulator build"
echo ""
