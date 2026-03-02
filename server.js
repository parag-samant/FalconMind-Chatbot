/**
 * FalconMind — Express Application Entry Point
 * Bootstraps all middleware, routes, and starts the HTTP server.
 */

'use strict';

const express = require('express');
const path = require('path');
const cors = require('cors');
const config = require('./config');
const sessionMiddleware = require('./middleware/session');
const { requestLogger } = require('./middleware/requestLogger');
const { rateLimiter, destructiveRateLimiter } = require('./middleware/rateLimiter');
const errorHandler = require('./middleware/errorHandler');

// Route handlers
const chatRoute = require('./routes/chat');
const statusRoute = require('./routes/status');
const confirmRoute = require('./routes/confirm');
const quickActionsRoute = require('./routes/quickActions');
const modelsRoute = require('./routes/models');

const app = express();

// ── Trust proxy (for rate limiting behind reverse proxy in production) ──────
if (config.nodeEnv === 'production') {
    app.set('trust proxy', 1);
}

// ── Core Middleware ──────────────────────────────────────────────────────────
app.use(cors({
    origin: config.nodeEnv === 'production' ? false : true, // Allow all in dev, same-origin in prod
    credentials: true,
}));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: false }));

// HTTP request logging
app.use(requestLogger);

// Session management
app.use(sessionMiddleware);

// ── Static Files (Frontend) ──────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));

// ── API Routes ───────────────────────────────────────────────────────────────
// Chat route — standard rate limiting
app.use('/api/chat', rateLimiter, chatRoute);

// Status / health route — no rate limit (lightweight polling)
app.use('/api/status', statusRoute);

// Quick actions definitions — static, no rate limit
app.use('/api/quick-actions', quickActionsRoute);

// Confirm route — stricter rate limiting for destructive actions
app.use('/api/confirm', destructiveRateLimiter, confirmRoute);

// Models route — list and switch AI models
app.use('/api/models', modelsRoute);

// ── SPA Fallback — serve index.html for any non-API route ───────────────────
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── Global Error Handler (must be last) ─────────────────────────────────────
app.use(errorHandler);

// ── Start Server ─────────────────────────────────────────────────────────────
const PORT = config.port;
app.listen(PORT, () => {
    console.log(`\n╔══════════════════════════════════════════╗`);
    console.log(`║         FalconMind AI Assistant          ║`);
    console.log(`╠══════════════════════════════════════════╣`);
    console.log(`║  Server running on http://localhost:${PORT}  ║`);
    console.log(`║  Environment: ${config.nodeEnv.padEnd(27)}║`);
    console.log(`║  CS Base URL: ${config.crowdstrike.baseUrl.replace('https://', '').padEnd(27)}║`);
    console.log(`╚══════════════════════════════════════════╝\n`);
});

module.exports = app;
