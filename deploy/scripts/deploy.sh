#!/bin/bash

# Automated deployment script with rollback capability
# Usage: ./deploy.sh <environment> <version> [--rollback]

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
REGISTRY="ghcr.io"
REPO_NAME="${GITHUB_REPOSITORY:-rubiks-cube}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Usage function
usage() {
    cat << EOF
Usage: $0 <environment> <version> [options]

Arguments:
  environment    Target environment (staging|production)
  version        Image version/tag to deploy

Options:
  --rollback     Rollback to previous version
  --dry-run      Show what would be deployed without executing
  --help         Show this help message

Examples:
  $0 staging v1.2.3
  $0 production latest
  $0 production --rollback
EOF
}

# Parse arguments
ENVIRONMENT=""
VERSION=""
ROLLBACK=false
DRY_RUN=false

while [[ $# -gt 0 ]]; do
    case $1 in
        staging|production)
            ENVIRONMENT="$1"
            shift
            ;;
        --rollback)
            ROLLBACK=true
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --help)
            usage
            exit 0
            ;;
        -*)
            log_error "Unknown option: $1"
            usage
            exit 1
            ;;
        *)
            if [[ -z "$VERSION" && "$ROLLBACK" == false ]]; then
                VERSION="$1"
            else
                log_error "Unexpected argument: $1"
                usage
                exit 1
            fi
            shift
            ;;
    esac
done

# Validate arguments
if [[ -z "$ENVIRONMENT" ]]; then
    log_error "Environment is required"
    usage
    exit 1
fi

if [[ "$ROLLBACK" == false && -z "$VERSION" ]]; then
    log_error "Version is required when not rolling back"
    usage
    exit 1
fi

# Set namespace based on environment
case $ENVIRONMENT in
    staging)
        NAMESPACE="rubiks-staging"
        KUBECONFIG_VAR="KUBECONFIG_STAGING"
        ;;
    production)
        NAMESPACE="default"
        KUBECONFIG_VAR="KUBECONFIG_PRODUCTION"
        ;;
    *)
        log_error "Invalid environment: $ENVIRONMENT"
        exit 1
        ;;
esac

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if kubectl is installed
    if ! command -v kubectl &> /dev/null; then
        log_error "kubectl is not installed"
        exit 1
    fi
    
    # Check if helm is installed (if using Helm)
    if ! command -v helm &> /dev/null; then
        log_warning "helm is not installed, using kubectl only"
    fi
    
    # Check kubeconfig
    if [[ -n "${!KUBECONFIG_VAR:-}" ]]; then
        export KUBECONFIG="${!KUBECONFIG_VAR}"
    fi
    
    # Test kubectl connectivity
    if ! kubectl cluster-info &> /dev/null; then
        log_error "Cannot connect to Kubernetes cluster"
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

# Get current deployment version
get_current_version() {
    local deployment_name="rubiks-frontend"
    if [[ "$ENVIRONMENT" == "staging" ]]; then
        deployment_name="rubiks-frontend-staging"
    fi
    
    kubectl get deployment "$deployment_name" -n "$NAMESPACE" \
        -o jsonpath='{.spec.template.spec.containers[0].image}' 2>/dev/null \
        | sed 's/.*://' || echo "unknown"
}

# Store current version for rollback
store_rollback_info() {
    local current_version="$1"
    local rollback_file="/tmp/rubiks-rollback-${ENVIRONMENT}.json"
    
    cat > "$rollback_file" << EOF
{
    "environment": "$ENVIRONMENT",
    "previous_version": "$current_version",
    "deployment_time": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
    "deployed_by": "${USER:-unknown}"
}
EOF
    
    log_info "Rollback info stored in $rollback_file"
}

# Get rollback version
get_rollback_version() {
    local rollback_file="/tmp/rubiks-rollback-${ENVIRONMENT}.json"
    
    if [[ ! -f "$rollback_file" ]]; then
        log_error "No rollback information found for $ENVIRONMENT"
        exit 1
    fi
    
    cat "$rollback_file" | grep -o '"previous_version": "[^"]*"' | cut -d'"' -f4
}

# Health check function
health_check() {
    local max_attempts=30
    local attempt=1
    
    log_info "Running health checks..."
    
    while [[ $attempt -le $max_attempts ]]; do
        local frontend_ready=$(kubectl get deployment rubiks-frontend${ENVIRONMENT:+-${ENVIRONMENT}} -n "$NAMESPACE" \
            -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo "0")
        local backend_ready=$(kubectl get deployment rubiks-backend${ENVIRONMENT:+-${ENVIRONMENT}} -n "$NAMESPACE" \
            -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo "0")
        
        if [[ "$frontend_ready" -gt 0 && "$backend_ready" -gt 0 ]]; then
            log_success "Health check passed - all services are ready"
            return 0
        fi
        
        log_info "Attempt $attempt/$max_attempts - Waiting for services to be ready..."
        sleep 10
        ((attempt++))
    done
    
    log_error "Health check failed - services did not become ready in time"
    return 1
}

# Smoke tests
run_smoke_tests() {
    log_info "Running smoke tests..."
    
    # Get service URLs
    local frontend_url=""
    local backend_url=""
    
    if [[ "$ENVIRONMENT" == "staging" ]]; then
        frontend_url="https://staging.rubikscube.app"
        backend_url="https://api-staging.rubikscube.app"
    else
        frontend_url="https://rubikscube.app"
        backend_url="https://api.rubikscube.app"
    fi
    
    # Test frontend
    if curl -f -s "$frontend_url/health" > /dev/null; then
        log_success "Frontend smoke test passed"
    else
        log_error "Frontend smoke test failed"
        return 1
    fi
    
    # Test backend
    if curl -f -s "$backend_url/health" > /dev/null; then
        log_success "Backend smoke test passed"
    else
        log_error "Backend smoke test failed"
        return 1
    fi
    
    log_success "All smoke tests passed"
}

# Deploy function
deploy() {
    local version="$1"
    local current_version
    
    log_info "Starting deployment to $ENVIRONMENT environment..."
    log_info "Version: $version"
    
    # Get current version for rollback
    current_version=$(get_current_version)
    log_info "Current version: $current_version"
    
    # Store rollback information
    store_rollback_info "$current_version"
    
    if [[ "$DRY_RUN" == true ]]; then
        log_info "DRY RUN - Would deploy the following:"
        log_info "  Frontend: $REGISTRY/$REPO_NAME-frontend:$version"
        log_info "  Backend: $REGISTRY/$REPO_NAME-backend:$version"
        log_info "  Namespace: $NAMESPACE"
        return 0
    fi
    
    # Update image tags in deployment manifests
    log_info "Updating deployment manifests..."
    
    # Update frontend deployment
    kubectl set image deployment/rubiks-frontend${ENVIRONMENT:+-${ENVIRONMENT}} \
        frontend="$REGISTRY/$REPO_NAME-frontend:$version" \
        -n "$NAMESPACE"
    
    # Update backend deployment
    kubectl set image deployment/rubiks-backend${ENVIRONMENT:+-${ENVIRONMENT}} \
        backend="$REGISTRY/$REPO_NAME-backend:$version" \
        -n "$NAMESPACE"
    
    # Wait for rollout to complete
    log_info "Waiting for rollout to complete..."
    kubectl rollout status deployment/rubiks-frontend${ENVIRONMENT:+-${ENVIRONMENT}} -n "$NAMESPACE" --timeout=300s
    kubectl rollout status deployment/rubiks-backend${ENVIRONMENT:+-${ENVIRONMENT}} -n "$NAMESPACE" --timeout=300s
    
    # Run health checks
    if ! health_check; then
        log_error "Health check failed, initiating automatic rollback..."
        rollback_deployment
        exit 1
    fi
    
    # Run smoke tests
    if ! run_smoke_tests; then
        log_error "Smoke tests failed, initiating automatic rollback..."
        rollback_deployment
        exit 1
    fi
    
    log_success "Deployment completed successfully!"
    log_info "Deployed version: $version"
}

# Rollback function
rollback_deployment() {
    local rollback_version
    
    if [[ "$ROLLBACK" == true ]]; then
        rollback_version=$(get_rollback_version)
        log_info "Rolling back to version: $rollback_version"
    else
        # Automatic rollback - use kubectl rollout undo
        log_info "Performing automatic rollback..."
        kubectl rollout undo deployment/rubiks-frontend${ENVIRONMENT:+-${ENVIRONMENT}} -n "$NAMESPACE"
        kubectl rollout undo deployment/rubiks-backend${ENVIRONMENT:+-${ENVIRONMENT}} -n "$NAMESPACE"
        
        # Wait for rollback to complete
        kubectl rollout status deployment/rubiks-frontend${ENVIRONMENT:+-${ENVIRONMENT}} -n "$NAMESPACE" --timeout=300s
        kubectl rollout status deployment/rubiks-backend${ENVIRONMENT:+-${ENVIRONMENT}} -n "$NAMESPACE" --timeout=300s
        
        log_success "Automatic rollback completed"
        return 0
    fi
    
    if [[ "$DRY_RUN" == true ]]; then
        log_info "DRY RUN - Would rollback to version: $rollback_version"
        return 0
    fi
    
    # Manual rollback to specific version
    kubectl set image deployment/rubiks-frontend${ENVIRONMENT:+-${ENVIRONMENT}} \
        frontend="$REGISTRY/$REPO_NAME-frontend:$rollback_version" \
        -n "$NAMESPACE"
    
    kubectl set image deployment/rubiks-backend${ENVIRONMENT:+-${ENVIRONMENT}} \
        backend="$REGISTRY/$REPO_NAME-backend:$rollback_version" \
        -n "$NAMESPACE"
    
    # Wait for rollback to complete
    kubectl rollout status deployment/rubiks-frontend${ENVIRONMENT:+-${ENVIRONMENT}} -n "$NAMESPACE" --timeout=300s
    kubectl rollout status deployment/rubiks-backend${ENVIRONMENT:+-${ENVIRONMENT}} -n "$NAMESPACE" --timeout=300s
    
    # Verify rollback
    if ! health_check; then
        log_error "Rollback health check failed!"
        exit 1
    fi
    
    log_success "Rollback completed successfully!"
    log_info "Rolled back to version: $rollback_version"
}

# Main execution
main() {
    check_prerequisites
    
    if [[ "$ROLLBACK" == true ]]; then
        rollback_deployment
    else
        deploy "$VERSION"
    fi
    
    # Send notification (if configured)
    if [[ -n "${SLACK_WEBHOOK:-}" ]]; then
        local message="🚀 Deployment completed successfully!"
        if [[ "$ROLLBACK" == true ]]; then
            message="⏪ Rollback completed successfully!"
        fi
        
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"$message Environment: $ENVIRONMENT\"}" \
            "$SLACK_WEBHOOK" || log_warning "Failed to send Slack notification"
    fi
}

# Execute main function
main "$@"