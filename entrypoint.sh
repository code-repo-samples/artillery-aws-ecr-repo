#!/bin/bash

# ------------------------------
# 1. Set working directory
# ------------------------------
cd /artillery || exit 1

echo "--- DEBUG: ENVIRONMENT ---"
echo "Current Dir: $(pwd)"
echo "APP_PATH: $APP_PATH"
echo "SCRIPT_NAME: $SCRIPT_NAME"
echo "BUNDLE_ID: $BUNDLE_ID"

# ------------------------------
# 2. Download and extract bundle
# ------------------------------
echo "--- DEBUG: FETCHING BUNDLE ---"
aws s3 cp "s3://${S3_BUCKET}/bundles/${BUNDLE_ID}.tar.gz" test_bundle.tar.gz
tar -xzf test_bundle.tar.gz

# ------------------------------
# 3. Pre-test folder listing
# ------------------------------
echo "--- DEBUG: FILE STRUCTURE BEFORE TEST ---"
find . -type f \( \
  -iname "*.json" -o \
  -iname "*.jsonl" -o \
  -iname "*.log" -o \
  -iname "*.csv" -o \
  -iname "*.html" -o \
  -iname "*.yml" \
\) -exec ls -lh {} \; | sort

# ------------------------------
# 4. Create reports directory & export ENV
# ------------------------------
mkdir -p "reports/${BUNDLE_ID}"
export ARTILLERY_REPORT_DIR="reports/${BUNDLE_ID}"
echo "--- DEBUG: ARTILLERY_REPORT_DIR ---"
echo "$ARTILLERY_REPORT_DIR"

# ------------------------------
# 5. Run Artillery (ignore exit code to continue script)
# ------------------------------
echo "--- EXECUTION: STARTING TEST ---"
artillery run \
  --output "reports/${BUNDLE_ID}/report.json" \
  "${APP_PATH}/scripts/${SCRIPT_NAME}.yml" || true

# ------------------------------
# 6. Generate HTML report (if JSON exists)
# ------------------------------
if [ -f "reports/${BUNDLE_ID}/report.json" ]; then
  artillery report "reports/${BUNDLE_ID}/report.json" \
    --output "reports/${BUNDLE_ID}/report.html"
else
  echo "⚠️ report.json not found, skipping HTML generation"
fi

# ------------------------------
# 7. Post-test folder listing (filtered for relevant files)
# ------------------------------
echo "--- DEBUG: FILE STRUCTURE AFTER TEST ---"
find . -type f \( \
  -iname "*.json" -o \
  -iname "*.jsonl" -o \
  -iname "*.log" -o \
  -iname "*.csv" -o \
  -iname "*.html" -o \
  -iname "*.yml" \
\) -exec ls -lh {} \; | sort

# ------------------------------
# 8. Upload artifacts to S3
# ------------------------------
echo "--- DEBUG: FILES TO UPLOAD ---"
ls -lh "reports/${BUNDLE_ID}/"

echo "--- FINISHING: UPLOADING ARTIFACTS ---"
aws s3 cp "reports/${BUNDLE_ID}/" \
  "s3://${S3_BUCKET}/reports/${BUNDLE_ID}/" --recursive
