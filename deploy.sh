#!/bin/bash

# LoopKit JavaScript SDK Deployment Script
# Deploys built SDK files to S3 bucket for CDN distribution
# Run with: ./deploy.sh

set -e

# Load environment variables from .env file if it exists
if [ -f .env ]; then
  echo "📋 Loading configuration from .env file..."
  export $(grep -v '^#' .env | xargs)
fi

# Configuration with defaults
BUCKET_NAME="${S3_BUCKET:-loopkit-js-cdn}"
SDK_PATH="${SDK_PATH:-javascript}"  # Organize by SDK type (configurable)
DIST_DIR="dist"
CLOUDFRONT_DISTRIBUTION_ID="${CLOUDFRONT_DISTRIBUTION_ID:-}"
UPLOAD_ALL_BUILDS="${UPLOAD_ALL_BUILDS:-false}"

# Get version from package.json
VERSION=$(node -p "require('./package.json').version")

echo "🚀 Deploying LoopKit JavaScript SDK v$VERSION to CDN..."
echo "Source: $DIST_DIR"
echo "Destination: s3://$BUCKET_NAME/$SDK_PATH/"

# Build the project first
echo "📦 Building project..."
npm run build

# Upload the main minified file (latest version only)
echo "⬆️  Uploading files to S3..."

# Latest version - this is the only version we keep on CDN
aws s3 cp "$DIST_DIR/loopkit.min.js" "s3://$BUCKET_NAME/$SDK_PATH/loopkit.min.js" \
  --content-type "application/javascript" \
  --cache-control "public, max-age=300" \
  --metadata "version=$VERSION,build-date=$(date -u +%Y-%m-%dT%H:%M:%SZ)"

# Optional: Upload other build files for current version
if [ "$UPLOAD_ALL_BUILDS" = "true" ]; then
  echo "📦 Uploading additional build files..."
  
  # Upload other dist files (ESM, CJS, TypeScript definitions)
  aws s3 cp "$DIST_DIR/loopkit.js" "s3://$BUCKET_NAME/$SDK_PATH/loopkit.js" \
    --content-type "application/javascript" \
    --cache-control "public, max-age=300" \
    --metadata "version=$VERSION,build-date=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
    
  aws s3 cp "$DIST_DIR/loopkit.esm.js" "s3://$BUCKET_NAME/$SDK_PATH/loopkit.esm.js" \
    --content-type "application/javascript" \
    --cache-control "public, max-age=300" \
    --metadata "version=$VERSION,build-date=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
    
  aws s3 cp "$DIST_DIR/loopkit.cjs.js" "s3://$BUCKET_NAME/$SDK_PATH/loopkit.cjs.js" \
    --content-type "application/javascript" \
    --cache-control "public, max-age=300" \
    --metadata "version=$VERSION,build-date=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
    
  if [ -f "$DIST_DIR/index.d.ts" ]; then
    aws s3 cp "$DIST_DIR/index.d.ts" "s3://$BUCKET_NAME/$SDK_PATH/index.d.ts" \
      --content-type "text/plain" \
      --cache-control "public, max-age=300" \
      --metadata "version=$VERSION,build-date=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  fi
fi

# Invalidate CloudFront cache if distribution ID is provided
if [ -n "$CLOUDFRONT_DISTRIBUTION_ID" ]; then
  echo "🔄 Invalidating CloudFront cache..."
  aws cloudfront create-invalidation \
    --distribution-id "$CLOUDFRONT_DISTRIBUTION_ID" \
    --paths "/$SDK_PATH/*"
fi

echo ""
echo "🎉 Deployment complete!"
echo ""
echo "📖 CDN URL:"
echo "   https://$BUCKET_NAME.s3.amazonaws.com/$SDK_PATH/loopkit.min.js"
echo ""
echo "📝 Usage example:"
echo "   <script src=\"https://$BUCKET_NAME.s3.amazonaws.com/$SDK_PATH/loopkit.min.js\"></script>"
echo "   <script>"
echo "     // Auto capture features enabled by default (page views, clicks, errors)"
echo "     LoopKit.init('your-api-key');"
echo "     "
echo "     // Manual tracking still works"
echo "     LoopKit.track('custom_event', { property: 'value' });"
echo "   </script>"
echo ""

# If using CloudFront, show the CloudFront URL
if [ -n "$CLOUDFRONT_DISTRIBUTION_ID" ]; then
  CLOUDFRONT_DOMAIN=$(aws cloudfront get-distribution --id "$CLOUDFRONT_DISTRIBUTION_ID" --query 'Distribution.DomainName' --output text 2>/dev/null || echo "your-cloudfront-domain.cloudfront.net")
  echo "🌐 CloudFront URL: https://$CLOUDFRONT_DOMAIN/$SDK_PATH/loopkit.min.js"
fi

echo ""
echo "💡 For specific versions, rebuild from git tags:"
echo "   git checkout v$VERSION && npm run deploy:cdn" 