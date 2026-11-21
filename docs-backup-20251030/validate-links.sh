#!/bin/bash

# Documentation Link Validation Script
# Validates internal links and references in the documentation

echo "🔍 Validating Documentation Links"
echo "=================================="

DOCS_DIR="."
ERRORS_FOUND=0
WARNINGS_FOUND=0

# Function to check if file exists
check_file_exists() {
    local file_path="$1"
    if [[ ! -f "$DOCS_DIR/$file_path" ]]; then
        echo "❌ ERROR: File not found: $file_path"
        ((ERRORS_FOUND++))
        return 1
    else
        echo "✅ OK: $file_path"
        return 0
    fi
}

# Function to validate links in a markdown file
validate_markdown_links() {
    local file="$1"
    local relative_path="${file#$DOCS_DIR/}"

    echo ""
    echo "📄 Checking links in: $relative_path"

    # Extract markdown links using grep and sed
    # This is a simple validation - for production use, consider using markdown-link-check
    grep -E '\[([^\]]*)\]\(([^)]+)\)' "$file" | while IFS= read -r line; do
        # Extract link target
        link_target=$(echo "$line" | sed -E 's/.*\]\(([^)]+)\).*/\1/' | sed 's/#.*//')

        # Skip external URLs and anchors
        if [[ "$link_target" =~ ^https?:// ]] || [[ "$link_target" =~ ^# ]]; then
            continue
        fi

        # Handle relative paths
        if [[ "$link_target" =~ ^\./ ]]; then
            link_target="${link_target#./}"
        fi

        # Check if file exists
        check_file_exists "$link_target"
    done
}

# Main validation process
echo "🚀 Starting documentation link validation..."

# Find all markdown files
find "$DOCS_DIR" -name "*.md" -type f | while read -r file; do
    # Skip certain files if needed
    if [[ "$file" == *"node_modules"* ]] || [[ "$file" == *".git"* ]]; then
        continue
    fi

    validate_markdown_links "$file"
done

# Summary
echo ""
echo "📊 Validation Summary"
echo "==================="
echo "❌ Errors found: $ERRORS_FOUND"
echo "⚠️ Warnings found: $WARNINGS_FOUND"

if [[ $ERRORS_FOUND -eq 0 ]]; then
    echo ""
    echo "🎉 All documentation links are valid!"
    echo ""
    echo "✅ What to do next:"
    echo "   - Review the enhanced documentation structure"
    echo "   - Test the new navigation in your browser"
    echo "   - Update any broken external links"
    echo "   - Consider adding more visual navigation aids"
else
    echo ""
    echo "🔧 Actions needed:"
    echo "   - Fix broken internal links"
    echo "   - Update file references"
    echo "   - Check for renamed or moved files"
    echo "   - Re-run validation after fixes"
fi

echo ""
echo "📝 Note: This script performs basic validation."
echo "   For comprehensive link checking, consider using:"
echo "   - markdown-link-check (npm package)"
echo "   - href checker tools"
echo "   - Documentation validation services"