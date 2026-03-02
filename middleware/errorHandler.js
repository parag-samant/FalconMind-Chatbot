/**
 * FalconMind — Global Error Handler Middleware
 * Converts all unhandled errors into user-friendly chat-safe JSON responses.
 * Prevents stack traces from ever reaching the browser.
 *
 * IMPORTANT: Gemini/AI errors are passed through with their specific messages
 * to give users actionable feedback (rate limit, model busy, etc.)
 */

'use strict';

const config = require('../config');

/**
 * Express error handler — must have 4 params (err, req, res, next)
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
    const status = err.status || err.statusCode || 500;

    // Log the full error server-side
    console.error(`[FalconMind Error] ${err.message}`, {
        status,
        path: req.path,
        method: req.method,
        stack: config.nodeEnv === 'development' ? err.stack : undefined,
    });

    // ── AI errors (Gemini/OpenAI) — pass through the specific message ──────────────
    // These errors have meaningful messages that users need to see
    const isAiError = err.message && (
        err.message.includes('Gemini') ||
        err.message.includes('OpenAI') ||
        err.message.includes('rate limit') ||
        err.message.includes('overloaded') ||
        err.message.includes('AI model') ||
        err.message.includes('API key is invalid') ||
        err.message.includes('authentication failed')
    );

    if (isAiError) {
        return res.status(status).json({
            error: true,
            message: `⚠️ ${err.message}`,
        });
    }

    // ── CrowdStrike / generic errors — map to friendly messages ────────────
    let userMessage = 'An unexpected error occurred. Please try again.';

    if (status === 401) {
        userMessage = 'Authentication failed. The CrowdStrike API credentials may be invalid or expired.';
    } else if (status === 403) {
        userMessage = 'Access denied. Your CrowdStrike API client may not have the required permissions for this operation.';
    } else if (status === 404) {
        userMessage = 'The requested resource was not found in the CrowdStrike platform.';
    } else if (status === 429) {
        userMessage = 'Rate limit exceeded. Please wait a moment before trying again.';
    } else if (status >= 500) {
        userMessage = 'A server error occurred. Please try again in a moment.';
    }

    // If this is an API route, return JSON
    if (req.path.startsWith('/api/')) {
        return res.status(status).json({
            error: true,
            message: userMessage,
        });
    }

    res.status(status).json({ error: true, message: userMessage });
}

module.exports = errorHandler;
