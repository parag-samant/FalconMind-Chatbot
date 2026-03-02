/**
 * FalconMind — Configuration Module
 * Reads, validates, and exports all environment variables.
 * The app will refuse to start if required variables are missing.
 */

'use strict';

require('dotenv').config();

/**
 * Validates that a required environment variable is set.
 * @param {string} name - Variable name
 * @param {string} fallback - Optional default value
 */
function require_env(name, fallback) {
    const val = process.env[name];
    if (!val && fallback === undefined) {
        console.error(`[FalconMind] FATAL: Required environment variable "${name}" is not set.`);
        console.error(`[FalconMind] Please copy .env.example to .env and fill in all values.`);
        process.exit(1);
    }
    return val || fallback;
}

const config = Object.freeze({
    nodeEnv: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '3000', 10),
    aiProvider: process.env.AI_PROVIDER || 'groq',

    gemini: {
        apiKey: process.env.GEMINI_API_KEY || '', // Not strictly required if using Groq
        model: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
        maxTokens: parseInt(process.env.GEMINI_MAX_TOKENS || '2048', 10),
    },

    groq: {
        apiKey: process.env.GROQ_API_KEY || '',
        model: process.env.GROQ_MODEL || 'groq/compound-mini',
        maxTokens: parseInt(process.env.GROQ_MAX_TOKENS || '8192', 10),
        baseUrl: process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1',
    },

    ollama: {
        model: process.env.OLLAMA_MODEL || 'hermes3:latest',
        baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11435/v1',
        enableTools: process.env.OLLAMA_ENABLE_TOOLS === 'true',
    },

    openai: {
        apiKey: process.env.OPENAI_API_KEY || '', // Not strictly required if using Groq
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '2048', 10),
    },

    crowdstrike: {
        clientId: require_env('CS_CLIENT_ID'),
        clientSecret: require_env('CS_CLIENT_SECRET'),
        baseUrl: (process.env.CS_BASE_URL || 'https://api.crowdstrike.com').replace(/\/$/, ''),
    },

    session: {
        secret: require_env('SESSION_SECRET'),
        maxAge: parseInt(process.env.SESSION_MAX_AGE || '86400000', 10),
    },

    rateLimit: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
        max: parseInt(process.env.RATE_LIMIT_MAX || '30', 10),
        destructiveMax: parseInt(process.env.RATE_LIMIT_DESTRUCTIVE_MAX || '10', 10),
    },

    logging: {
        level: process.env.LOG_LEVEL || 'info',
        format: process.env.LOG_FORMAT || (process.env.NODE_ENV === 'production' ? 'combined' : 'dev'),
    },

    confirmationTtlMs: parseInt(process.env.CONFIRMATION_TTL_MS || '300000', 10),
});

module.exports = config;
