#!/bin/bash

# F1 Fan Zone - GitHub Push Script
# This script helps you push your code to GitHub

echo "🏎️  F1 Fan Zone - GitHub Push Helper"
echo "======================================"
echo ""

# Check if remote already exists
if git remote get-url origin &> /dev/null; then
    echo "✅ Remote 'origin' already configured"
    REMOTE_URL=$(git remote get-url origin)
    echo "   URL: $REMOTE_URL"
else
    echo "⚠️  No remote configured yet"
    echo ""
    echo "Please create a repository on GitHub first:"
    echo "👉 https://github.com/new"
    echo ""
    echo "Repository name: f1-fan-zone"
    echo "Description: Interactive Formula 1 website with live standings, quiz, and more"
    echo ""
    read -p "Have you created the repository? (y/n) " -n 1 -r
    echo ""
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo ""
        echo "Enter your GitHub username (default: RRRG3):"
        read -r USERNAME
        USERNAME=${USERNAME:-RRRG3}
        
        REPO_URL="https://github.com/$USERNAME/f1-fan-zone.git"
        echo ""
        echo "Adding remote: $REPO_URL"
        git remote add origin "$REPO_URL"
        echo "✅ Remote added successfully!"
    else
        echo "Please create the repository first, then run this script again."
        exit 1
    fi
fi

echo ""
echo "📦 Checking git status..."
git status --short

echo ""
echo "🚀 Pushing to GitHub..."
git branch -M main
git push -u origin main

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Successfully pushed to GitHub!"
    echo ""
    echo "🌐 Your repository: https://github.com/RRRG3/f1-fan-zone"
    echo ""
    echo "💡 To enable GitHub Pages:"
    echo "   1. Go to repository Settings"
    echo "   2. Click 'Pages' in the sidebar"
    echo "   3. Select 'main' branch as source"
    echo "   4. Your site will be live at: https://RRRG3.github.io/f1-fan-zone"
else
    echo ""
    echo "❌ Push failed. Please check the error message above."
    echo ""
    echo "Common issues:"
    echo "  - Repository doesn't exist on GitHub"
    echo "  - Authentication required (use personal access token)"
    echo "  - Wrong repository URL"
fi
