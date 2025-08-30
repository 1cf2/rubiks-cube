#!/bin/bash

# Documentation Review Helper Script
# This script assists with documentation reviews and maintenance tasks

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DOCS_DIR="docs"
PACKAGES_DIR="packages"
REVIEW_LOG="doc-review.log"
SLACK_WEBHOOK_URL=${SLACK_WEBHOOK_URL:-""}

# Helper functions
log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
}

info() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')] INFO: $1${NC}"
}

send_slack_notification() {
    local message="$1"
    local channel="${2:-#documentation}"
    
    if [ -n "$SLACK_WEBHOOK_URL" ]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"channel\":\"$channel\",\"text\":\"📚 Doc Review: $message\"}" \
            "$SLACK_WEBHOOK_URL" 2>/dev/null || warn "Failed to send Slack notification"
    fi
}

# Main functions
show_help() {
    echo "Documentation Review Helper"
    echo ""
    echo "Usage: $0 [command] [options]"
    echo ""
    echo "Commands:"
    echo "  health-check     - Run comprehensive documentation health check"
    echo "  outdated         - Find documentation files older than specified days"
    echo "  coverage         - Check documentation coverage for packages"
    echo "  links            - Validate all links in documentation"
    echo "  review-prep      - Prepare files for review (create review templates)"
    echo "  assign-reviews   - Help assign documentation reviews"
    echo "  metrics          - Generate documentation metrics"
    echo "  watch           - Watch for changes that require doc updates"
    echo ""
    echo "Options:"
    echo "  -d, --days       - Number of days for outdated check (default: 60)"
    echo "  -o, --output     - Output format: text|json|markdown (default: text)"
    echo "  -s, --slack      - Send notifications to Slack"
    echo "  -v, --verbose    - Verbose output"
    echo "  -h, --help       - Show this help"
}

check_dependencies() {
    local deps=("git" "find" "grep" "curl")
    local missing=()
    
    for dep in "${deps[@]}"; do
        if ! command -v "$dep" &> /dev/null; then
            missing+=("$dep")
        fi
    done
    
    if [ ${#missing[@]} -ne 0 ]; then
        error "Missing required dependencies: ${missing[*]}"
        exit 1
    fi
}

health_check() {
    local output_format="${1:-text}"
    local verbose="${2:-false}"
    
    log "Starting comprehensive documentation health check..."
    
    local report_file="doc-health-report-$(date +%Y%m%d-%H%M%S)"
    
    if [ "$output_format" == "json" ]; then
        report_file="${report_file}.json"
        echo "{" > "$report_file"
        echo "  \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"," >> "$report_file"
        echo "  \"checks\": {" >> "$report_file"
    elif [ "$output_format" == "markdown" ]; then
        report_file="${report_file}.md"
        echo "# Documentation Health Report" > "$report_file"
        echo "Generated: $(date)" >> "$report_file"
        echo "" >> "$report_file"
    else
        report_file="${report_file}.txt"
        echo "Documentation Health Check Report" > "$report_file"
        echo "Generated: $(date)" >> "$report_file"
        echo "========================================" >> "$report_file"
    fi
    
    # Check for outdated files
    info "Checking for outdated documentation..."
    local outdated_count=$(find_outdated_docs 60 | wc -l)
    
    # Check documentation coverage
    info "Checking documentation coverage..."
    local coverage_result=$(check_coverage)
    
    # Validate links (if markdown-link-check is available)
    info "Validating links..."
    local broken_links=0
    if command -v markdown-link-check &> /dev/null; then
        broken_links=$(validate_links | grep -c "ERROR" || echo "0")
    else
        warn "markdown-link-check not found, skipping link validation"
    fi
    
    # Check for missing essential files
    info "Checking for essential documentation files..."
    local essential_files=("README.md" "CLAUDE.md" "docs/LOCAL_DEVELOPMENT.md" "docs/DOCUMENT_GOVERNANCE.md")
    local missing_essential=0
    for file in "${essential_files[@]}"; do
        if [ ! -f "$file" ]; then
            ((missing_essential++))
            warn "Missing essential file: $file"
        fi
    done
    
    # Generate summary
    local health_score=100
    ((health_score -= outdated_count * 5))
    ((health_score -= broken_links * 10))
    ((health_score -= missing_essential * 15))
    [ $health_score -lt 0 ] && health_score=0
    
    # Output results based on format
    if [ "$output_format" == "json" ]; then
        cat >> "$report_file" << EOF
    "outdated_files": $outdated_count,
    "broken_links": $broken_links,
    "missing_essential": $missing_essential,
    "health_score": $health_score,
    "status": "$([ $health_score -ge 80 ] && echo "good" || ([ $health_score -ge 60 ] && echo "warning" || echo "critical"))"
  }
}
EOF
    elif [ "$output_format" == "markdown" ]; then
        cat >> "$report_file" << EOF

## Summary

- **Health Score**: $health_score/100
- **Status**: $([ $health_score -ge 80 ] && echo "🟢 Good" || ([ $health_score -ge 60 ] && echo "🟡 Needs Attention" || echo "🔴 Critical"))
- **Outdated Files**: $outdated_count
- **Broken Links**: $broken_links
- **Missing Essential Files**: $missing_essential

## Recommendations

$([ $outdated_count -gt 0 ] && echo "- Review and update $outdated_count outdated documentation files")
$([ $broken_links -gt 0 ] && echo "- Fix $broken_links broken links")
$([ $missing_essential -gt 0 ] && echo "- Create $missing_essential missing essential documentation files")
EOF
    else
        cat >> "$report_file" << EOF

SUMMARY:
- Health Score: $health_score/100
- Status: $([ $health_score -ge 80 ] && echo "Good" || ([ $health_score -ge 60 ] && echo "Needs Attention" || echo "Critical"))
- Outdated Files: $outdated_count
- Broken Links: $broken_links
- Missing Essential Files: $missing_essential
EOF
    fi
    
    log "Health check complete. Report saved to: $report_file"
    
    # Send Slack notification if requested
    if [ "$SLACK_NOTIFICATION" == "true" ]; then
        local status_emoji=$([ $health_score -ge 80 ] && echo "✅" || ([ $health_score -ge 60 ] && echo "⚠️" || echo "❌"))
        send_slack_notification "${status_emoji} Documentation health score: $health_score/100. Report: $report_file"
    fi
    
    return 0
}

find_outdated_docs() {
    local days="${1:-60}"
    local output_format="${2:-text}"
    
    info "Finding documentation files older than $days days..."
    
    local outdated_files=()
    while IFS= read -r -d '' file; do
        if [ -f "$file" ]; then
            local last_modified=$(git log -1 --format="%ct" -- "$file" 2>/dev/null || stat -f %m "$file" 2>/dev/null || echo "0")
            local current_time=$(date +%s)
            local age_days=$(( (current_time - last_modified) / 86400 ))
            
            if [ $age_days -gt $days ]; then
                outdated_files+=("$file:$age_days")
            fi
        fi
    done < <(find "$DOCS_DIR" "$PACKAGES_DIR"/*/docs/ -name "*.md" -print0 2>/dev/null)
    
    if [ ${#outdated_files[@]} -eq 0 ]; then
        log "No outdated documentation files found!"
        return 0
    fi
    
    if [ "$output_format" == "json" ]; then
        echo "{"
        echo "  \"outdated_files\": ["
        for i in "${!outdated_files[@]}"; do
            local file_info=(${outdated_files[$i]//:/ })
            local file="${file_info[0]}"
            local age="${file_info[1]}"
            echo "    {\"file\": \"$file\", \"age_days\": $age}$([ $i -lt $((${#outdated_files[@]} - 1)) ] && echo ",")"
        done
        echo "  ]"
        echo "}"
    else
        warn "Found ${#outdated_files[@]} outdated documentation files:"
        for file_info in "${outdated_files[@]}"; do
            local file_age=(${file_info//:/ })
            echo "  - ${file_age[0]} (${file_age[1]} days old)"
        done
    fi
    
    return ${#outdated_files[@]}
}

check_coverage() {
    info "Checking documentation coverage for packages..."
    
    local total_packages=0
    local documented_packages=0
    local missing_docs=()
    
    if [ -d "$PACKAGES_DIR" ]; then
        for package_dir in "$PACKAGES_DIR"/*/; do
            if [ -d "$package_dir" ]; then
                ((total_packages++))
                local package_name=$(basename "$package_dir")
                
                if [ -d "$package_dir/docs/" ] || [ -f "$package_dir/README.md" ]; then
                    ((documented_packages++))
                else
                    missing_docs+=("$package_name")
                fi
            fi
        done
    fi
    
    local coverage_percentage=0
    if [ $total_packages -gt 0 ]; then
        coverage_percentage=$(( (documented_packages * 100) / total_packages ))
    fi
    
    if [ ${#missing_docs[@]} -eq 0 ]; then
        log "Documentation coverage: $coverage_percentage% ($documented_packages/$total_packages packages)"
    else
        warn "Documentation coverage: $coverage_percentage% ($documented_packages/$total_packages packages)"
        warn "Packages missing documentation:"
        for package in "${missing_docs[@]}"; do
            echo "  - $package"
        done
    fi
    
    return ${#missing_docs[@]}
}

validate_links() {
    if ! command -v markdown-link-check &> /dev/null; then
        warn "markdown-link-check not found. Install with: npm install -g markdown-link-check"
        return 1
    fi
    
    info "Validating links in documentation..."
    
    # Create config for link checker
    local config_file=$(mktemp)
    cat > "$config_file" << 'EOF'
{
  "ignorePatterns": [
    {
      "pattern": "^http://localhost"
    },
    {
      "pattern": "^https://localhost"
    }
  ],
  "timeout": "10s",
  "retryOn429": true,
  "retryCount": 2
}
EOF
    
    local broken_count=0
    while IFS= read -r -d '' file; do
        if [ -f "$file" ]; then
            if ! markdown-link-check "$file" -c "$config_file" -q; then
                ((broken_count++))
            fi
        fi
    done < <(find . -name "*.md" -not -path "./node_modules/*" -print0 2>/dev/null)
    
    rm -f "$config_file"
    
    if [ $broken_count -eq 0 ]; then
        log "All links are valid!"
    else
        warn "Found broken links in $broken_count files"
    fi
    
    return $broken_count
}

prepare_review() {
    local review_type="${1:-comprehensive}"
    local reviewer="${2:-$(git config user.name || echo "Unknown")}"
    
    log "Preparing documentation review templates..."
    
    local timestamp=$(date +"%Y-%m-%d")
    local review_dir="reviews/$timestamp-$review_type"
    
    mkdir -p "$review_dir"
    
    if [ "$review_type" == "technical" ]; then
        cat > "$review_dir/technical-review-checklist.md" << EOF
# Technical Documentation Review

**Document**: [Document Name]
**Reviewer**: $reviewer
**Date**: $timestamp
**Trigger**: [What triggered this review]

## Review Checklist

### Accuracy
- [ ] Code examples are current and functional
- [ ] API documentation matches implementation
- [ ] Architecture diagrams reflect current state
- [ ] Configuration examples are valid

### Completeness
- [ ] All new features are documented
- [ ] Breaking changes are noted
- [ ] Migration guides are provided (if applicable)
- [ ] Dependencies are up to date

### Clarity
- [ ] Instructions are clear and actionable
- [ ] Examples are relevant and helpful
- [ ] Terminology is consistent
- [ ] Prerequisites are clearly stated

## Findings

### Issues Identified
1. [Issue 1 - Priority/Category]

### Recommendations
1. [Recommendation 1]

### Action Items
- [ ] [Action 1 - Assignee - Due Date]

**Review Status**: [Approved/Needs Updates/Major Revision Required]
EOF
    else
        # Comprehensive review template
        cat > "$review_dir/comprehensive-review-checklist.md" << EOF
# Comprehensive Documentation Review

**Quarter**: [Q1/Q2/Q3/Q4 $(date +%Y)]
**Reviewer**: $reviewer
**Date**: $timestamp

## Documentation Inventory

### Core Documentation
- [ ] README.md - Status: [Good/Needs Update/Outdated]
- [ ] CLAUDE.md - Status: [Good/Needs Update/Outdated]
- [ ] docs/LOCAL_DEVELOPMENT.md - Status: [Good/Needs Update/Outdated]
- [ ] docs/PERFORMANCE_OPTIMIZATION.md - Status: [Good/Needs Update/Outdated]

### Package-Specific Documentation
$(for package in "$PACKAGES_DIR"/*/; do
    if [ -d "$package" ]; then
        package_name=$(basename "$package")
        echo "- [ ] $package_name/docs/ - Status: [Good/Needs Update/Outdated]"
    fi
done)

## Review Findings

### High Priority Issues
1. [Issue 1 - Impact - Assigned To]

### Recommendations for Next Quarter
1. [Strategic Recommendation 1]

## Action Plan

### Immediate Actions (This Sprint)
- [ ] [Action 1 - Owner - Due Date]

**Overall Health**: [Green/Yellow/Red]
EOF
    fi
    
    log "Review templates created in $review_dir/"
    log "Please complete the review and commit the results"
}

generate_metrics() {
    local output_format="${1:-text}"
    
    info "Generating documentation metrics..."
    
    local metrics_file="doc-metrics-$(date +%Y%m%d-%H%M%S)"
    
    # Calculate various metrics
    local total_docs=$(find "$DOCS_DIR" "$PACKAGES_DIR"/*/docs/ -name "*.md" 2>/dev/null | wc -l)
    local total_words=0
    local avg_age=0
    local last_update=""
    
    if [ $total_docs -gt 0 ]; then
        # Word count
        total_words=$(find "$DOCS_DIR" "$PACKAGES_DIR"/*/docs/ -name "*.md" -exec wc -w {} + 2>/dev/null | tail -1 | awk '{print $1}')
        
        # Most recent update
        last_update=$(find "$DOCS_DIR" "$PACKAGES_DIR"/*/docs/ -name "*.md" -exec stat -f %m {} \; 2>/dev/null | sort -nr | head -1 | xargs date -r)
    fi
    
    if [ "$output_format" == "json" ]; then
        metrics_file="${metrics_file}.json"
        cat > "$metrics_file" << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "total_documents": $total_docs,
  "total_words": $total_words,
  "last_update": "$last_update",
  "average_words_per_doc": $([ $total_docs -gt 0 ] && echo $((total_words / total_docs)) || echo 0)
}
EOF
    else
        metrics_file="${metrics_file}.txt"
        cat > "$metrics_file" << EOF
Documentation Metrics Report
Generated: $(date)
============================

Total Documents: $total_docs
Total Words: $total_words
Average Words per Document: $([ $total_docs -gt 0 ] && echo $((total_words / total_docs)) || echo 0)
Last Update: $last_update
EOF
    fi
    
    log "Metrics report saved to: $metrics_file"
}

watch_for_changes() {
    info "Watching for changes that require documentation updates..."
    info "Press Ctrl+C to stop watching"
    
    local watch_paths=("$PACKAGES_DIR/*/src" "$PACKAGES_DIR/*/package.json" "README.md" "CLAUDE.md")
    
    if command -v fswatch &> /dev/null; then
        fswatch -o "${watch_paths[@]}" | while read num; do
            warn "Changes detected that may require documentation updates!"
            send_slack_notification "File changes detected - consider updating documentation"
        done
    elif command -v inotifywait &> /dev/null; then
        inotifywait -m -r -e modify,create,delete "${watch_paths[@]}" 2>/dev/null | while read path action file; do
            warn "Change detected: $action on $path$file"
            send_slack_notification "File changes detected - consider updating documentation"
        done
    else
        warn "No file watching utility found (fswatch or inotifywait). Falling back to polling..."
        local last_check=$(date +%s)
        while true; do
            sleep 30
            local current_time=$(date +%s)
            local changes=$(find "${watch_paths[@]}" -newer <(date -r $last_check) 2>/dev/null | wc -l)
            if [ $changes -gt 0 ]; then
                warn "Changes detected in last 30 seconds that may require documentation updates!"
                send_slack_notification "File changes detected - consider updating documentation"
            fi
            last_check=$current_time
        done
    fi
}

# Parse command line arguments
COMMAND=""
DAYS=60
OUTPUT_FORMAT="text"
SLACK_NOTIFICATION=false
VERBOSE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -d|--days)
            DAYS="$2"
            shift 2
            ;;
        -o|--output)
            OUTPUT_FORMAT="$2"
            shift 2
            ;;
        -s|--slack)
            SLACK_NOTIFICATION=true
            shift
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        health-check|outdated|coverage|links|review-prep|assign-reviews|metrics|watch)
            COMMAND="$1"
            shift
            ;;
        *)
            error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Check dependencies
check_dependencies

# Execute command
case $COMMAND in
    health-check)
        health_check "$OUTPUT_FORMAT" "$VERBOSE"
        ;;
    outdated)
        find_outdated_docs "$DAYS" "$OUTPUT_FORMAT"
        ;;
    coverage)
        check_coverage
        ;;
    links)
        validate_links
        ;;
    review-prep)
        prepare_review "comprehensive"
        ;;
    metrics)
        generate_metrics "$OUTPUT_FORMAT"
        ;;
    watch)
        watch_for_changes
        ;;
    *)
        if [ -z "$COMMAND" ]; then
            show_help
        else
            error "Unknown command: $COMMAND"
            show_help
            exit 1
        fi
        ;;
esac