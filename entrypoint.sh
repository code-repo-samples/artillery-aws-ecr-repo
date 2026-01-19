#!/bin/bash
set -e

# Ensure we are in the root
cd /artillery

echo "--- DEBUG: ENVIRONMENT ---"
echo "Current Dir: $(pwd)"
echo "APP_PATH: $APP_PATH"
echo "SCRIPT_NAME: $SCRIPT_NAME"
echo "BUNDLE_ID: $BUNDLE_ID"

# 1. Download and Extract
echo "--- DEBUG: FETCHING BUNDLE ---"
aws s3 cp s3://${S3_BUCKET}/bundles/${BUNDLE_ID}.tar.gz test_bundle.tar.gz
tar -xzf test_bundle.tar.gz

# 2. File Listing for Verification
echo "--- DEBUG: FILE STRUCTURE ---"
ls -R

# 3. Create a local reports directory for this specific run
mkdir -p "reports/${BUNDLE_ID}"

# 4. Execute Artillery
# Output is saved into the folder named after the BUNDLE_ID
echo "--- EXECUTION: STARTING TEST ---"
artillery run \
  --output "reports/${BUNDLE_ID}/report.json" \
  "${APP_PATH}/scripts/${SCRIPT_NAME}.yml"

# 5. Upload everything in the reports folder to S3
# This uploads the entire folder: s3://bucket/reports/RUN_ID/report.json
echo "--- FINISHING: UPLOADING ARTIFACTS ---"
aws s3 cp "reports/${BUNDLE_ID}/" "s3://${S3_BUCKET}/reports/${BUNDLE_ID}/" --recursive
