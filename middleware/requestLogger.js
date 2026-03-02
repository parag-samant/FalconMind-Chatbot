/**
 * FalconMind — Request Logger Middleware
 * Morgan-based HTTP logging that strips sensitive headers before writing.
 */

'use strict';

const morgan = require('morgan');
const config = require('../config');

// Custom Morgan token that masks Authorization headers
morgan.token('safe-headers', (req) => {
    const headers = { ...req.headers };
    // Strip any sensitive headers from logs
    delete headers['authorization'];
    delete headers['cookie'];
    delete headers['x-api-key'];
    return JSON.stringify(headers);
});

const requestLogger = morgan(config.logging.format, {
    skip: (req) => {
        // Skip logging for static assets in production to reduce noise
        if (config.nodeEnv === 'production') {
            return req.url.startsWith('/css') || req.url.startsWith('/js');
        }
        return false;
    },
});

module.exports = { requestLogger };
