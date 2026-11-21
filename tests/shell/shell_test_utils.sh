#!/bin/bash

# Shell Script Testing Utilities and Helpers
# Collection of utility functions for shell script testing

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# Utility variables
UTILS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$UTILS_DIR/../.." && pwd)"

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_header() {
    echo -e "${PURPLE}🔧 $1${NC}"
}

print_debug() {
    echo -e "${CYAN}🔍 $1${NC}"
}

# Script analysis utilities
analyze_script() {
    local script="$1"
    local analysis_file="${2:-}"

    print_header "Analyzing script: $(basename "$script")"

    if [ ! -f "$script" ]; then
        print_error "Script file not found: $script"
        return 1
    fi

    local analysis_result=""

    # Basic file information
    analysis_result+="File: $(basename "$script")\n"
    analysis_result+="Path: $(realpath "$script")\n"
    analysis_result+="Size: $(stat -f%z "$script" 2>/dev/null || stat -c%s "$script") bytes\n"
    analysis_result+="Permissions: $(stat -f%Lp "$script" 2>/dev/null || stat -c%a "$script")\n"
    analysis_result+="Modified: $(stat -f%Sm -t "%Y-%m-%d %H:%M:%S" "$script" 2>/dev/null || stat -c%y "$script")\n"
    analysis_result+="\n"

    # Shebang analysis
    local shebang=$(head -n 1 "$script")
    analysis_result+="Shebang: $shebang\n"

    if [[ "$shebang" == "#!/bin/bash" ]]; then
        analysis_result+="Shell: Bash (good for compatibility)\n"
    elif [[ "$shebang" == "#!/bin/sh" ]]; then
        analysis_result+="Shell: POSIX shell (maximum portability)\n"
    else
        analysis_result+="Shell: Custom/Other shell\n"
    fi
    analysis_result+="\n"

    # Error handling analysis
    if grep -q "set -e" "$script"; then
        analysis_result+="Error Handling: 'set -e' found (exit on error)\n"
    else
        analysis_result+="Error Handling: No 'set -e' found (may not exit on error)\n"
    fi

    if grep -q "set -u" "$script"; then
        analysis_result+="Variable Handling: 'set -u' found (exit on undefined variables)\n"
    else
        analysis_result+="Variable Handling: No 'set -u' found\n"
    fi

    if grep -q "set -o pipefail" "$script"; then
        analysis_result+="Pipe Handling: 'set -o pipefail' found (exit on pipe failure)\n"
    else
        analysis_result+="Pipe Handling: No 'set -o pipefail' found\n"
    fi
    analysis_result+="\n"

    # Function analysis
    local function_count=$(grep -c "^[[:space:]]*function " "$script" || echo "0")
    analysis_result+="Functions: $function_count functions defined\n"

    # Line count
    local line_count=$(wc -l < "$script")
    analysis_result+="Lines: $line_count total lines\n"

    # Comment analysis
    local comment_lines=$(grep -c "^[[:space:]]*#" "$script")
    local comment_ratio=$((comment_lines * 100 / line_count))
    analysis_result+="Comments: $comment_lines lines ($comment_ratio%)\n"
    analysis_result+="\n"

    # Common issues check
    analysis_result+="Common Issues:\n"

    if grep -q "\\\$[0-9]" "$script"; then
        analysis_result+="  ⚠️  Found numbered variables (not quoted)\n"
    fi

    if grep -q '"\${' "$script"; then
        analysis_result+="  ⚠️  Found unquoted variables\n"
    fi

    if grep -q "cd \$" "$script"; then
        analysis_result+="  ⚠️  Found unquoted cd command\n"
    fi

    if grep -q 'echo ".*\$' "$script"; then
        analysis_result+="  ⚠️  Found variables in echo without braces\n"
    fi

    if grep -q "rm -rf" "$script"; then
        analysis_result+="  ⚠️  Found 'rm -rf' (dangerous operation)\n"
    fi

    # Syntax check
    if bash -n "$script" 2>/dev/null; then
        analysis_result+="\nSyntax: ✅ Valid\n"
    else
        analysis_result+="\nSyntax: ❌ Invalid\n"
    fi

    # Output result
    if [ -n "$analysis_file" ]; then
        echo -e "$analysis_result" > "$analysis_file"
        print_status "Analysis saved to: $analysis_file"
    else
        echo -e "$analysis_result"
    fi

    return 0
}

# Script comparison utility
compare_scripts() {
    local script1="$1"
    local script2="$2"
    local output_file="${3:-}"

    print_header "Comparing scripts: $(basename "$script1") vs $(basename "$script2")"

    if [ ! -f "$script1" ] || [ ! -f "$script2" ]; then
        print_error "Both script files must exist for comparison"
        return 1
    fi

    local comparison_result=""

    # Basic comparison
    comparison_result+="Script Comparison Report\n"
    comparison_result+="========================\n\n"

    comparison_result+="Script 1: $(basename "$script1")\n"
    comparison_result+="  Size: $(stat -f%z "$script1" 2>/dev/null || stat -c%s "$script1") bytes\n"
    comparison_result+="  Lines: $(wc -l < "$script1")\n"
    comparison_result+="  Modified: $(stat -f%Sm -t "%Y-%m-%d %H:%M:%S" "$script1" 2>/dev/null || stat -c%y "$script1")\n\n"

    comparison_result+="Script 2: $(basename "$script2")\n"
    comparison_result+="  Size: $(stat -f%z "$script2" 2>/dev/null || stat -c%s "$script2") bytes\n"
    comparison_result+="  Lines: $(wc -l < "$script2")\n"
    comparison_result+="  Modified: $(stat -f%Sm -t "%Y-%m-%d %H:%M:%S" "$script2" 2>/dev/null || stat -c%y "$script2")\n\n"

    # Line difference
    local line_diff=$(( $(wc -l < "$script1") - $(wc -l < "$script2") ))
    comparison_result+="Line Difference: $line_diff lines\n\n"

    # Common functions
    local funcs1=$(grep "^[[:space:]]*function " "$script1" | sed 's/^[[:space:]]*function //' | sed 's/(.*$//')
    local funcs2=$(grep "^[[:space:]]*function " "$script2" | sed 's/^[[:space:]]*function //' | sed 's/(.*$//')

    comparison_result+="Common Functions:\n"
    while IFS= read -r func; do
        if echo "$funcs2" | grep -q "^$func$"; then
            comparison_result+="  ✅ $func (in both scripts)\n"
        else
            comparison_result+="  ➡️  $func (only in script 1)\n"
        fi
    done <<< "$funcs1"

    while IFS= read -r func; do
        if ! echo "$funcs1" | grep -q "^$func$"; then
            comparison_result+="  ➡️  $func (only in script 2)\n"
        fi
    done <<< "$funcs2"

    # Output result
    if [ -n "$output_file" ]; then
        echo -e "$comparison_result" > "$output_file"
        print_status "Comparison saved to: $output_file"
    else
        echo -e "$comparison_result"
    fi

    return 0
}

# Script complexity analyzer
analyze_script_complexity() {
    local script="$1"
    local output_file="${2:-}"

    print_header "Analyzing script complexity: $(basename "$script")"

    if [ ! -f "$script" ]; then
        print_error "Script file not found: $script"
        return 1
    fi

    local complexity_result=""
    local total_lines=$(wc -l < "$script")
    local code_lines=$(grep -v "^[[:space:]]*#" "$script" | grep -v "^[[:space:]]*$" | wc -l)
    local comment_lines=$(grep -c "^[[:space:]]*#" "$script")
    local blank_lines=$((total_lines - code_lines - comment_lines))

    complexity_result+="Complexity Analysis Report\n"
    complexity_result+="==========================\n\n"

    complexity_result+="Lines Summary:\n"
    complexity_result+="  Total lines: $total_lines\n"
    complexity_result+="  Code lines: $code_lines\n"
    complexity_result+="  Comment lines: $comment_lines\n"
    complexity_result+="  Blank lines: $blank_lines\n\n"

    # Cyclomatic complexity (rough estimate)
    local if_count=$(grep -c "^[[:space:]]*if " "$script")
    local elif_count=$(grep -c "^[[:space:]]*elif " "$script")
    local case_count=$(grep -c "^[[:space:]]*case " "$script")
    local for_count=$(grep -c "^[[:space:]]*for " "$script")
    local while_count=$(grep -c "^[[:space:]]*while " "$script")
    local function_count=$(grep -c "^[[:space:]]*function " "$script")

    local complexity_score=$((if_count + elif_count + case_count + for_count + while_count + function_count))

    complexity_result+="Complexity Metrics:\n"
    complexity_result+="  If statements: $if_count\n"
    complexity_result+="  Case statements: $case_count\n"
    complexity_result+="  Loops: $((for_count + while_count))\n"
    complexity_result+="  Functions: $function_count\n"
    complexity_result+="  Complexity score: $complexity_score\n\n"

    # Complexity rating
    if [ $complexity_score -lt 5 ]; then
        complexity_result+="Complexity Rating: 🟢 Simple\n"
    elif [ $complexity_score -lt 15 ]; then
        complexity_result+="Complexity Rating: 🟡 Moderate\n"
    elif [ $complexity_score -lt 25 ]; then
        complexity_result+="Complexity Rating: 🟠 Complex\n"
    else
        complexity_result+="Complexity Rating: 🔴 Very Complex\n"
    fi

    # Maintainability index (rough estimate)
    local maintainability=$(( (100 - $complexity_score) * $total_lines / 100 ))
    complexity_result+="Maintainability Index: $maintainability\n"

    # Output result
    if [ -n "$output_file" ]; then
        echo -e "$complexity_result" > "$output_file"
        print_status "Complexity analysis saved to: $output_file"
    else
        echo -e "$complexity_result"
    fi

    return 0
}

# Script performance profiler
profile_script() {
    local script="$1"
    local iterations="${2:-10}"
    local output_file="${3:-}"

    print_header "Profiling script: $(basename "$script")"

    if [ ! -f "$script" ]; then
        print_error "Script file not found: $script"
        return 1
    fi

    local profile_result=""

    # Run script multiple times and collect timing data
    profile_result+="Performance Profile Report\n"
    profile_result+="==========================\n\n"

    profile_result+="Test Configuration:\n"
    profile_result+="  Iterations: $iterations\n"
    profile_result+="  Script: $(basename "$script")\n\n"

    local times=()
    local min_time=999999
    local max_time=0
    local total_time=0

    for ((i=1; i<=iterations; i++)); do
        local start_time=$(date +%s%N)
        if bash "$script" >/dev/null 2>&1; then
            local end_time=$(date +%s%N)
            local duration=$(( (end_time - start_time) / 1000000 )) # Convert to milliseconds
            times+=($duration)
            total_time=$((total_time + duration))
            min_time=$((duration < min_time ? duration : min_time))
            max_time=$((duration > max_time ? duration : max_time))
        else
            print_error "Script failed on iteration $i"
            return 1
        fi
    done

    local avg_time=$((total_time / iterations))

    profile_result+="Results:\n"
    profile_result+="  Average time: ${avg_time}ms\n"
    profile_result+="  Minimum time: ${min_time}ms\n"
    profile_result+="  Maximum time: ${max_time}ms\n"
    profile_result+="  Total time: $((total_time / 1000))s\n\n"

    # Performance rating
    if [ $avg_time -lt 100 ]; then
        profile_result+="Performance Rating: 🟢 Excellent\n"
    elif [ $avg_time -lt 500 ]; then
        profile_result+="Performance Rating: 🟡 Good\n"
    elif [ $avg_time -lt 1000 ]; then
        profile_result+="Performance Rating: 🟠 Fair\n"
    else
        profile_result+="Performance Rating: 🔴 Poor\n"
    fi

    # Output result
    if [ -n "$output_file" ]; then
        echo -e "$profile_result" > "$output_file"
        print_status "Performance profile saved to: $output_file"
    else
        echo -e "$profile_result"
    fi

    return 0
}

# Script testing helpers
create_test_script() {
    local script_name="$1"
    local output_dir="${2:-$UTILS_DIR}"

    if [ -z "$script_name" ]; then
        print_error "Script name is required"
        return 1
    fi

    local test_script="$output_dir/test_${script_name}"

    cat > "$test_script" << EOF
#!/bin/bash

# Test script for $script_name
# Generated by shell_test_utils.sh

source "\$(dirname "\${BASH_SOURCE[0]}")/shell_test_framework.sh"

test_${script_name}_basic() {
    print_header "Testing $script_name basic functionality"

    # Test 1: Check if script exists
    assert_file_exists "$PROJECT_ROOT/$script_name" "Script file exists"

    # Test 2: Check if script is executable
    if [ -x "$PROJECT_ROOT/$script_name" ]; then
        print_status "Script is executable"
    else
        print_warning "Script is not executable"
        chmod +x "$PROJECT_ROOT/$script_name"
        print_status "Made script executable"
    fi

    # Test 3: Check script syntax
    assert_exit_code 0 "bash -n '$PROJECT_ROOT/$script_name'" "Script has valid syntax"

    print_status "$script_name basic tests completed"
}

test_${script_name}_content() {
    print_header "Testing $script_name content"

    local script_content=\$(cat "$PROJECT_ROOT/$script_name")

    # Check for shebang
    assert_contains "#!" "\$script_content" "Script has shebang"

    # Check for error handling
    if echo "\$script_content" | grep -q "set -e"; then
        print_status "Script has error handling"
    else
        print_warning "Script may not have proper error handling"
    fi

    print_status "$script_name content tests completed"
}

# Run the tests
init_test_framework
run_test "$script_name Basic Tests" test_${script_name}_basic
run_test "$script_name Content Tests" test_${script_name}_content

# Print summary
print_test_summary
EOF

    chmod +x "$test_script"
    print_status "Test script created: $test_script"

    return 0
}

# Script validation helpers
validate_all_scripts() {
    local script_dir="${1:-$PROJECT_ROOT}"
    local output_file="${2:-}"

    print_header "Validating all scripts in: $script_dir"

    local validation_result=""
    local total_scripts=0
    local valid_scripts=0
    local invalid_scripts=0

    validation_result+="Script Validation Report\n"
    validation_result+="=======================\n\n"

    while IFS= read -r -d '' script; do
        ((total_scripts++))

        validation_result+="Script: \$(basename "$script")\n"
        validation_result+="  Path: $script\n"

        if bash -n "$script" 2>/dev/null; then
            validation_result+="  Status: ✅ Valid\n"
            ((valid_scripts++))
        else
            validation_result+="  Status: ❌ Invalid\n"
            ((invalid_scripts++))
        fi

        # Check permissions
        if [ -x "$script" ]; then
            validation_result+="  Permissions: ✅ Executable\n"
        else
            validation_result+="  Permissions: ⚠️  Not executable\n"
        fi

        validation_result+="\n"

    done < <(find "$script_dir" -name "*.sh" -type f -print0)

    validation_result+="\nSummary:\n"
    validation_result+="  Total scripts: $total_scripts\n"
    validation_result+="  Valid scripts: $valid_scripts\n"
    validation_result+="  Invalid scripts: $invalid_scripts\n"

    if [ -n "$output_file" ]; then
        echo -e "$validation_result" > "$output_file"
        print_status "Validation report saved to: $output_file"
    else
        echo -e "$validation_result"
    fi

    if [ $invalid_scripts -eq 0 ]; then
        print_status "All scripts are valid!"
        return 0
    else
        print_error "$invalid_scripts script(s) have issues"
        return 1
    fi
}

# Export all functions
export -f print_status print_error print_warning print_info print_header print_debug
export -f analyze_script compare_scripts analyze_script_complexity profile_script
export -f create_test_script validate_all_scripts

# If run directly, show help
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    print_header "Shell Script Testing Utilities"
    echo ""
    echo "Available utilities:"
    echo "  analyze_script <script> [output_file]           - Analyze script structure and content"
    echo "  compare_scripts <script1> <script2> [output_file] - Compare two scripts"
    echo "  analyze_script_complexity <script> [output_file]  - Analyze script complexity"
    echo "  profile_script <script> [iterations] [output_file] - Profile script performance"
    echo "  create_test_script <script_name> [output_dir]   - Create test script template"
    echo "  validate_all_scripts [directory] [output_file]  - Validate all scripts in directory"
    echo ""
    echo "Examples:"
    echo "  ./shell_test_utils.sh analyze_script build.sh"
    echo "  ./shell_test_utils.sh validate_all_scripts . validation_report.txt"
    echo "  ./shell_test_utils.sh create_test_script my_script.sh"
fi