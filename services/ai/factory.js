/**
 * FalconMind — AI Provider Factory
 *
 * This factory allows the application to toggle between different AI providers
 * (Ollama, Groq, Google Gemini, OpenAI) based on a configuration flag.
 *
 * It ensures that the rest of the application (routes, etc.) doesn't need to
 * know which specific AI is being used.
 */

'use strict';

const config = require('../../config');
const gemini = require('../gemini/chat');
const openai = require('../openai/chat');
const groq = require('../groq/chat');
const ollama = require('../ollama/chat');

/**
 * Get the current AI provider based on environment configuration.
 * @returns {object} { chat, summarizeResult, providerName }
 */
function getProvider() {
    const provider = (config.aiProvider || 'ollama').toLowerCase();

    if (provider === 'ollama') {
        return {
            chat: ollama.chat,
            summarizeResult: ollama.summarizeResult,
            providerName: 'Ollama',
            model: config.ollama.model
        };
    }

    if (provider === 'groq') {
        return {
            chat: groq.chat,
            summarizeResult: groq.summarizeResult,
            providerName: 'Groq',
            model: config.groq.model
        };
    }

    if (provider === 'openai') {
        return {
            chat: openai.chat,
            summarizeResult: openai.summarizeResult,
            providerName: 'OpenAI',
            model: config.openai.model
        };
    }

    // Default to Gemini
    return {
        chat: gemini.chat,
        summarizeResult: gemini.summarizeResult,
        providerName: 'Gemini',
        model: config.gemini.model
    };
}

module.exports = { getProvider };
