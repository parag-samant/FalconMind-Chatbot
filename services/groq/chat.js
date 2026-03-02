/**
 * FalconMind — Groq Chat Service
 *
 * Uses the Groq API (https://api.groq.com/openai/v1) which is fully
 * OpenAI-compatible, so the `openai` npm package is reused with a
 * custom base URL and Groq API key.
 *
 * Model: llama-3-groq-70b-8192-tool-use-preview — Groq's fine-tuned model
 * optimized for function/tool calling. Falls back gracefully to a text
 * response if a tool call fails (400 failed_generation).
 *
 * Implements the same interface as openai/chat.js:
 *   - chat(messages, enableTools)  → { type: 'text'|'tool_call', content?, toolCall? }
 *   - summarizeResult(...)         → string
 */

'use strict';

const OpenAI = require('openai');
const config = require('../../config');
const { getSystemPrompt } = require('../ai/systemPrompt');
const { getToolDefinitions } = require('../openai/functions');
const { buildSummarizationPrompt } = require('../../utils/summarizationPrompt');

const groqClient = new OpenAI({
    baseURL: config.groq.baseUrl,
    apiKey: config.groq.apiKey,
});


/**
 * Send a conversation to Groq and get a response.
 * Handles the Groq-specific "failed_generation" error (400) by automatically
 * retrying without tools, so the user gets a text response instead of a crash.
 *
 * @param {Array}   messages     OpenAI-format conversation history
 * @param {boolean} enableTools  Whether to attach CrowdStrike tool definitions
 * @returns {{ type: 'text'|'tool_call', content?, toolCall?, rawMessage? }}
 */
async function chat(messages, enableTools = true) {
    const systemMessage = {
        role: 'system',
        content: getSystemPrompt('compact'),
    };

    const trimmedMessages = trimHistory(messages, 6);

    const requestParams = {
        model: config.groq.model,
        max_tokens: config.groq.maxTokens,
        messages: [systemMessage, ...trimmedMessages],
    };

    // Compound models don't support custom tools — skip to avoid wasted 400→retry
    const isCompoundModel = config.groq.model.includes('compound');

    if (enableTools && !isCompoundModel) {
        requestParams.tools = getToolDefinitions();
        requestParams.tool_choice = 'auto';
    }

    let response;
    const MAX_RETRIES = 5;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
            response = await groqClient.chat.completions.create(requestParams);
            break; // success
        } catch (err) {
            // Fatal: bad API key
            if (err.status === 401) {
                throw new Error('Groq API authentication failed. Please check your GROQ_API_KEY in .env');
            }

            // Any 400 error (tool calling not supported, failed_generation, etc.)
            // Retry WITHOUT tools so the user gets a text answer instead of an error
            if (err.status === 400 && enableTools) {
                console.warn(`[Groq] Bad request (400): ${err.message}`);
                console.warn('[Groq] Retrying without tools...');
                delete requestParams.tools;
                delete requestParams.tool_choice;

                // Retry the no-tools request with rate limit handling
                const FALLBACK_RETRIES = 3;
                for (let fbAttempt = 0; fbAttempt <= FALLBACK_RETRIES; fbAttempt++) {
                    try {
                        response = await groqClient.chat.completions.create(requestParams);
                        break;
                    } catch (retryErr) {
                        if (retryErr.status === 429 && fbAttempt < FALLBACK_RETRIES) {
                            const waitMs = Math.min(3000 * Math.pow(2, fbAttempt), 12000);
                            console.log(`[Groq] Rate limited on fallback (attempt ${fbAttempt + 1}/${FALLBACK_RETRIES + 1}), waiting ${waitMs / 1000}s...`);
                            await new Promise((r) => setTimeout(r, waitMs));
                            continue;
                        }
                        throw new Error(`Groq API error: ${retryErr.message}`);
                    }
                }
                if (response) break;
            }

            // Retryable: rate limit (429), server errors (500, 503)
            const isRateLimit = err.status === 429;
            const isRetryable = isRateLimit || err.status >= 500;

            if (isRetryable && attempt < MAX_RETRIES) {
                // Use longer waits for rate limits since Groq has per-minute quotas
                const delayMs = isRateLimit
                    ? Math.min(5000 * (attempt + 1), 25000)  // 5s, 10s, 15s, 20s, 25s
                    : Math.min(2000 * Math.pow(2, attempt), 8000);
                console.log(`[Groq] ${isRateLimit ? 'Rate limited' : 'Server busy'} (attempt ${attempt + 1}/${MAX_RETRIES + 1}), retrying in ${delayMs / 1000}s...`);
                await new Promise((r) => setTimeout(r, delayMs));
                continue;
            }

            if (isRateLimit) {
                throw new Error('Groq rate limit reached after retries. Please wait a moment and try again.');
            }
            throw new Error(`Groq API error: ${err.message}`);
        }
    }

    const choice = response.choices?.[0];
    if (!choice) throw new Error('Groq returned an empty response');

    const message = choice.message;

    // ── Tool call response ───────────────────────────────────────────────────
    if (choice.finish_reason === 'tool_calls' && message.tool_calls?.length > 0) {
        const toolCall = message.tool_calls[0];
        let args = {};
        try { args = JSON.parse(toolCall.function.arguments); } catch { args = {}; }

        return {
            type: 'tool_call',
            toolCall: {
                id: toolCall.id,
                name: toolCall.function.name,
                args,
            },
            rawMessage: message,
        };
    }

    // ── Text response ────────────────────────────────────────────────────────
    return {
        type: 'text',
        content: message.content || '',
        rawMessage: message,
    };
}

/**
 * Generate a natural language summary of a CrowdStrike API result.
 */
async function summarizeResult(functionName, result, originalQuery) {
    const summaryMessages = [
        {
            role: 'user',
            content: buildSummarizationPrompt(functionName, result, originalQuery),
        },
    ];

    try {
        const response = await chat(summaryMessages, false);
        return response.content || '';
    } catch (err) {
        console.error(`[Groq] Summarization failed: ${err.message}`);
        return ''; // non-fatal
    }
}

/**
 * Trim conversation history to the most recent N messages.
 */
function trimHistory(messages, maxMessages) {
    if (messages.length <= maxMessages) return messages;
    return messages.slice(messages.length - maxMessages);
}

module.exports = { chat, summarizeResult };
