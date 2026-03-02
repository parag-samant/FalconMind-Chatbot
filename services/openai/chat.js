/**
 * FalconMind — OpenAI Chat Service
 *
 * Wraps the OpenAI Chat Completions API with:
 *   - System prompt injection
 *   - Function/tool calling support
 *   - Conversation history management
 *   - Token-efficient message trimming
 */

'use strict';

const OpenAI = require('openai');
const config = require('../../config');
const { getSystemPrompt } = require('../ai/systemPrompt');
const { getToolDefinitions } = require('./functions');
const { buildSummarizationPrompt } = require('../../utils/summarizationPrompt');

const openai = new OpenAI({
    apiKey: config.openai.apiKey,
});


/**
 * Send a conversation to OpenAI and get a response.
 * Includes exponential backoff for rate limits.
 */
async function chat(messages, enableTools = true) {
    const systemMessage = {
        role: 'system',
        content: getSystemPrompt('full'),
    };

    const trimmedMessages = trimHistory(messages, 20);

    const requestParams = {
        model: config.openai.model,
        max_tokens: config.openai.maxTokens,
        messages: [systemMessage, ...trimmedMessages],
    };

    if (enableTools) {
        requestParams.tools = getToolDefinitions();
        requestParams.tool_choice = 'auto';
    }

    let response;
    const MAX_RETRIES = 2; // up to 3 total attempts
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
            response = await openai.chat.completions.create(requestParams);
            break; // Success
        } catch (err) {
            // Fatal: auth failed
            if (err.status === 401) {
                throw new Error('OpenAI authentication failed. Please check your OPENAI_API_KEY.');
            }

            // Retryable: rate limit (429), server errors (500, 503)
            const isRateLimit = err.status === 429;
            const isRetryable = isRateLimit || err.status >= 500;

            if (isRetryable && attempt < MAX_RETRIES) {
                const delayMs = Math.min(2000 * Math.pow(2, attempt), 8000);
                console.log(`[OpenAI] ${isRateLimit ? 'Rate limited' : 'Server busy'} (attempt ${attempt + 1}/${MAX_RETRIES + 1}), retrying in ${delayMs / 1000}s...`);
                await new Promise((r) => setTimeout(r, delayMs));
                continue;
            }

            if (isRateLimit) {
                throw new Error('OpenAI rate limit reached after retries. Try upgrading your OpenAI plan or wait 60s.');
            }
            throw new Error(`OpenAI API error: ${err.message}`);
        }
    }

    const choice = response.choices?.[0];
    if (!choice) throw new Error('OpenAI returned an empty response');

    const message = choice.message;

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

    return {
        type: 'text',
        content: message.content || '',
        rawMessage: message,
    };
}

/**
 * Generate a natural language summary of an API result.
 */
async function summarizeResult(functionName, result, originalQuery) {
    const summaryPrompt = [
        {
            role: 'user',
            content: buildSummarizationPrompt(functionName, result, originalQuery),
        },
    ];

    try {
        const response = await chat(summaryPrompt, false);
        return response.content || 'Unable to generate summary.';
    } catch (err) {
        console.error(`[OpenAI] Summarization failed: ${err.message}`);
        return ''; // Skip summary if it fails
    }
}

function trimHistory(messages, maxMessages) {
    if (messages.length <= maxMessages) return messages;
    return messages.slice(messages.length - maxMessages);
}

module.exports = { chat, summarizeResult };
