const fs = require('fs');
const path = require('path');

const errorLogFile = path.join('reports', 'error_log.json');

// Ensure reports folder exists
if (!fs.existsSync('reports')) {
    fs.mkdirSync('reports');
}


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
        fs.appendFileSync(
            path.join('reports', 'error.log'),
            logLine,
            'utf8'
        );
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
