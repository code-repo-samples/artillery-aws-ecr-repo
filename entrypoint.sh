#!/bin/bash
set -e
# 1. Download the script bundle from S3
aws s3 cp s3://${S3_BUCKET}/bundles/${BUNDLE_ID}.tar.gz test_bundle.tar.gz
# 2. Extract scripts
tar -xzf test_bundle.tar.gz
# 3. Execute Artillery
artillery run --output /artillery/reports/report.json "${APP_PATH}/scripts/${SCRIPT_NAME}.yml"
# 4. Upload result
aws s3 cp /artillery/reports/report.json s3://${S3_BUCKET}/reports/${BUNDLE_ID}.json
