const fs = require('fs');
const path = require('path');

// --- Standardized Path Resolution ---
// If ARTILLERY_REPORT_DIR is set in entrypoint.sh, use it. 
// Otherwise, fallback to a local 'reports' folder.

const RESULTS_DIR = process.env.ARTILLERY_REPORT_DIR
  ? path.resolve(process.cwd(), process.env.ARTILLERY_REPORT_DIR)
  : path.join(process.cwd(), 'reports');

// Ensure the directory exists so appendFileSync doesn't crash
if (!fs.existsSync(RESULTS_DIR)) {
    fs.mkdirSync(RESULTS_DIR, { recursive: true });
}

const errorLogFile = path.join(RESULTS_DIR, 'error.log');


/**
 * Logs HTTP errors to a plain text file.
 * This approach avoids JSON parsing issues and is safe for parallel workers.
 *
 * @param {Object} request - Artillery request object
 * @param {Object} response - Artillery response object
 * @param {Object} context - Artillery context
 * @param {Object} ee - Artillery event emitter
 * @param {Function} next - Callback to continue execution
 */
function logError(request, response, context, ee, next) {
    if (response.statusCode >= 400) {
        const logLine = [
            new Date().toISOString(),
            request.method,
            request.url,
            response.statusCode,
            typeof response.body === 'object'
                ? JSON.stringify(response.body)
                : response.body
        ].join(' | ') + '\n';

        // Append-only write (safe under load & parallel workers)
        fs.appendFileSync(errorLogFile, logLine, 'utf8');
    }

    return next();
}


// Random GET query generator
function randomGet(userContext, events, done) {
    const names = ['Alice', 'Bob', 'Charlie', 'Diana'];
    const addresses = ['NYC', 'LA', 'Chicago', 'Boston'];

    userContext.vars.name = names[Math.floor(Math.random() * names.length)];
    userContext.vars.address = addresses[Math.floor(Math.random() * addresses.length)];

    return done();
}

// Random POST body generator
function randomPost(userContext, events, done) {
    const names = ['Alice', 'Bob', 'Charlie', 'Diana'];
    const addresses = ['NYC', 'LA', 'Chicago', 'Boston'];

    userContext.vars.postData = {
        name: names[Math.floor(Math.random() * names.length)],
        address: addresses[Math.floor(Math.random() * addresses.length)]
    };

    return done();
}

module.exports = {
    randomGet,
    randomPost,
    logError
};

