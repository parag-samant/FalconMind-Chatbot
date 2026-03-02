/**
 * FalconMind — Rate Limiter Middleware
 * Prevents API flooding on both standard chat and destructive action routes.
 */

'use strict';

const rateLimit = require('express-rate-limit');
const config = require('../config');

/**
 * Standard rate limiter for /api/chat
 * Default: 30 requests per 60 seconds per IP
 */
const rateLimiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.max,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        error: true,
        message: 'Too many requests. Please wait a moment before sending another message.',
    },
    handler: (req, res, next, options) => {
        res.status(429).json(options.message);
    },
});

/**
 * Stricter rate limiter for /api/confirm (destructive actions)
 * Default: 10 requests per 60 seconds per IP
 */
const destructiveRateLimiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.destructiveMax,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        error: true,
        message: 'Too many confirmation requests. Please wait before confirming another action.',
    },
    handler: (req, res, next, options) => {
        res.status(429).json(options.message);
    },
});

module.exports = { rateLimiter, destructiveRateLimiter };
