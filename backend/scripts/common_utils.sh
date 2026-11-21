 #!/bin/bash

 # Common utilities for build and deployment scripts
 # Provides context detection, validation, and debugging functions

 # Colors for output (ensure these are defined)
 RED='\033[0;31m'
 GREEN='\033[0;32m'
 YELLOW='\033[1;33m'
 BLUE='\033[0;34m'
 NC='\033[0m' # No Color

 print_status() {
     echo -e "${GREEN}✅ $1${NC}"
 }

 print_warning() {
     echo -e "${YELLOW}⚠️  $1${NC}"
 }

 print_error() {
     echo -e "${RED}❌ $1${NC}"
 }

 print_info() {
     echo -e "${BLUE}ℹ️  $1${NC}"
 }

 print_debug() {
     echo -e "${BLUE}🔍 $1${NC}"
 }

 # Detect execution context
 get_execution_context() {
     # Detect the execution environment
     if [[ -n "$CI" ]] || [[ -n "$GITHUB_ACTIONS" ]] || [[ -n "$GITLAB_CI" ]]; then
         echo "CI/CD"
     elif [[ -n "$DOCKER_CONTAINER" ]] || [[ -f "/.dockerenv" ]]; then
         echo "Docker"
     else
         echo "Local"
     fi
 }

 # Validate that required commands are available
 validate_dependencies() {
     local missing_deps=()

     for cmd in "$@"; do
         if ! command -v "$cmd" &> /dev/null; then
             missing_deps+=("$cmd")
         fi
     done

     if [[ ${#missing_deps[@]} -gt 0 ]]; then
         print_error "Missing required dependencies:"
         for dep in "${missing_deps[@]}"; do
             echo -e "  ${RED}❌ $dep${NC}"
         done
         return 1
     fi

     print_status "All dependencies are available"
     return 0
 }

 # Validate file exists and is readable
 validate_file() {
     local file="$1"
     local description="${2:-file}"

     if [[ ! -f "$file" ]]; then
         print_error "$description not found: $file"
         return 1
     fi

     if [[ ! -r "$file" ]]; then
         print_error "$description not readable: $file"
         return 1
     fi

     print_debug "$description validated: $file"
     return 0
 }

 # Validate directory exists and is accessible
 validate_directory() {
     local dir="$1"
     local description="${2:-directory}"

     if [[ ! -d "$dir" ]]; then
         print_error "$description not found: $dir"
         return 1
     fi

     if [[ ! -x "$dir" ]]; then
         print_error "$description not accessible: $dir"
         return 1
     fi

     print_debug "$description validated: $dir"
     return 0
 }

 # Create a temporary script for Python code execution
 create_temp_python_script() {
     local python_code="$1"
     local temp_file="$2"

     echo "$python_code" > "$temp_file"
     chmod +x "$temp_file"
 }

 # Cleanup temporary files
 cleanup_temp_files() {
     for file in "$@"; do
         if [[ -f "$file" ]]; then
             rm -f "$file"
             print_debug "Cleaned up temporary file: $file"
         fi
     done
 }

 # Display context information for troubleshooting
 display_context_info() {
     local script_name="$1"
     local script_dir="$2"
     local project_root="$3"

     echo ""
     print_debug "=== $script_name Context Information ==="
     print_debug "Execution context: $(get_execution_context)"
     print_debug "Script directory: $script_dir"
     print_debug "Project root: $project_root"
     print_debug "Working directory: $(pwd)"
     print_debug "User: $(whoami)"
     print_debug "Date: $(date)"
     echo ""
 }

 # Enhanced error handling with context
 handle_error() {
     local error_msg="$1"
     local exit_code="${2:-1}"

     print_error "$error_msg"
     print_debug "Error occurred in execution context: $(get_execution_context)"
     print_debug "Working directory: $(pwd)"

     exit "$exit_code"
 }

 # Validate network connectivity (for CI/CD environments)
 validate_network() {
     local target="${1:-8.8.8.8}"

     if ping -c 1 "$target" &> /dev/null; then
         print_debug "Network connectivity validated"
         return 0
     else
         print_warning "Network connectivity issue - some operations may fail"
         return 1
     fi
 }
