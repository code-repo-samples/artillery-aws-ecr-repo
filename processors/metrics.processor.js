/**
 * ============================================================
 * METRICS & LOGGING PROCESSOR (Local + Fargate/S3, real-time flush)
 * ============================================================
 * Features:
 *  - Writes metrics and IDs to local disk
 *  - Flushes updates to S3 after every metric/ID
 *  - Logs file paths and metrics to CloudWatch
 */

const fs = require('fs');
const path = require('path');
const AWS = require('aws-sdk');

// Detect Fargate environment
const isFargate = !!process.env.AWS_EXECUTION_ENV;
const S3_BUCKET = process.env.METRICS_BUCKET || 'artilleryio-test-data-983610474809';

// Project root
const PROJECT_ROOT = path.resolve(__dirname, '..');

// Writable results directory
const RESULTS_DIR = isFargate ? '/tmp/artillery_results' : path.join(PROJECT_ROOT, '_results');
if (!fs.existsSync(RESULTS_DIR)) fs.mkdirSync(RESULTS_DIR, { recursive: true });

console.log(`📁 Results directory: ${RESULTS_DIR}`);

const METRICS_FILE = path.join(RESULTS_DIR, 'artillery-metrics.jsonl');
const IDS_FILE = path.join(RESULTS_DIR, 'created_products.txt');

console.log(`📝 Metrics file path: ${METRICS_FILE}`);
console.log(`📝 IDs file path: ${IDS_FILE}`);

// Write streams
const metricsStream = fs.createWriteStream(METRICS_FILE, { flags: 'a' });
const idsStream = fs.createWriteStream(IDS_FILE, { flags: 'a' });

// Initialize S3 client
const s3 = isFargate ? new AWS.S3({ region: 'us-east-1' }) : null;

// Flush a stream to S3
async function flushToS3(localPath, key) {
  if (!isFargate) return;
  try {
    const data = fs.readFileSync(localPath);
    await s3.putObject({ Bucket: S3_BUCKET, Key: key, Body: data }).promise();
    console.log(`✅ Flushed ${key} to S3`);
  } catch (err) {
    console.error(`❌ Failed S3 flush for ${key}:`, err);
  }
}

// Helper to write metrics and flush immediately
async function writeMetric(metric) {
  metricsStream.write(JSON.stringify(metric) + '\n');
  console.log('📈 Metric recorded:', metric);
  await flushToS3(METRICS_FILE, 'artillery-metrics.jsonl');
}

// Helper to write product ID and flush
async function writeProductId(id) {
  idsStream.write(`${id}\n`);
  console.log('📝 Logged productId:', id);
  await flushToS3(IDS_FILE, 'created_products.txt');
}

// Graceful shutdown
async function shutdown() {
  try {
    metricsStream.end();
    idsStream.end();
    console.log('🛑 Processor shutdown complete.');
  } finally {
    process.exit();
  }
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

/**
 * ------------------------------------------------------------
 * SCENARIO METRICS
 * ------------------------------------------------------------
 */
function scenarioStart(userContext, events, done) {
  const metric = { ts: Date.now(), type: 'vuser_start', scenario: userContext.scenario?.name || 'UNKNOWN' };
  writeMetric(metric).finally(done);
}

function scenarioEnd(userContext, events, done) {
  const metric = { ts: Date.now(), type: 'vuser_end', scenario: userContext.scenario?.name || 'UNKNOWN' };
  writeMetric(metric).finally(done);
}

/**
 * ------------------------------------------------------------
 * REQUEST METRICS
 * ------------------------------------------------------------
 */
function captureMetrics(requestParams, response, userContext, ee, next) {
  const latency = response?.timings?.phases?.total;
  if (typeof latency === 'number') {
    const metric = {
      ts: Date.now(),
      type: 'request',
      name: requestParams.name || 'UNNAMED',
      method: requestParams.method,
      statusCode: response.statusCode,
      latencyMs: latency
    };
    writeMetric(metric).finally(next);
  } else {
    next();
  }
}

/**
 * ------------------------------------------------------------
 * PRODUCT ID LOGGING
 * ------------------------------------------------------------
 */
function logProductId(requestParams, response, userContext, ee, next) {
  if (response.statusCode === 201 && userContext.vars.productId) {
    writeProductId(userContext.vars.productId).finally(next);
  } else {
    next();
  }
}

/**
 * ------------------------------------------------------------
 * ERROR LOGGING / THRESHOLD
 * ------------------------------------------------------------
 */
let globalErrorCount = 0;
const ERROR_THRESHOLD = 50000;
let shuttingDown = false;

function logResponse(requestParams, response, userContext, ee, next) {
  if (response.statusCode >= 400) {
    globalErrorCount++;
    console.log(`⚠️ Error #${globalErrorCount}: ${response.statusCode}`);
    if (!shuttingDown && globalErrorCount >= ERROR_THRESHOLD) {
      shuttingDown = true;
      console.log(`🚨 Error threshold reached, shutting down...`);
      setTimeout(() => process.kill(process.pid, 'SIGTERM'), 50);
    }
  }
  next();
}

module.exports = {
  scenarioStart,
  scenarioEnd,
  captureMetrics,
  logProductId,
  logResponse
};
