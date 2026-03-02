/**
 * FalconMind — Ollama Chat Service (Local AI)
 *
 * Connects to a local Ollama instance (typically in Docker) via its
 * OpenAI-compatible API endpoint. No rate limits, no API keys needed,
 * runs entirely on the local machine.
 *
 * Supports tool calling for models that handle it (hermes3, qwen2.5-coder,
 * cloud models like deepseek-v3.1, qwen3-coder, etc.).
 *
 * If a model fails with tool calling (400 error), automatically retries
 * without tools so the response is still useful.
 */

'use strict';

const OpenAI = require('openai');
const config = require('../../config');
const { getSystemPrompt } = require('../ai/systemPrompt');
const { getToolDefinitions } = require('../openai/functions');
const { buildSummarizationPrompt } = require('../../utils/summarizationPrompt');

// Global model override (set via /api/models/switch)
let modelOverride = null;

function setModelOverride(model) {
    modelOverride = model;
}

function getActiveModel() {
    return modelOverride || config.ollama.model;
}

function createClient() {
    return new OpenAI({
        baseURL: config.ollama.baseUrl,
        apiKey: 'ollama',
    });
}


/**
 * Send a conversation to Ollama and get a response.
 */
async function chat(messages, enableTools = true) {
    const client = createClient();
    const activeModel = getActiveModel();

    const systemMessage = {
        role: 'system',
        content: getSystemPrompt('compact'),
    };

    const trimmedMessages = trimHistory(messages, 10);

    const requestParams = {
        model: activeModel,
        messages: [systemMessage, ...trimmedMessages],
    };

    // Add tools if enabled
    if (enableTools) {
        requestParams.tools = getToolDefinitions();
        requestParams.tool_choice = 'auto';
    }

    let response;
    let usedTools = enableTools;

    try {
        response = await client.chat.completions.create(requestParams);
    } catch (err) {
        // Connection refused — Ollama not running
        if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
            throw new Error(
                `Cannot connect to Ollama at ${config.ollama.baseUrl}. ` +
                `Make sure Ollama is running (docker ps | grep ollama).`
            );
        }

        // Model not found
        if (err.status === 404 || err.message?.includes('not found')) {
            throw new Error(
                `Model "${activeModel}" not found in Ollama. ` +
                `Pull it with: docker exec ollama-security ollama pull ${activeModel}`
            );
        }

        // Tool calling not supported by this model — retry without tools
        if (enableTools && (err.status === 400 || err.message?.includes('does not support tools'))) {
            console.log(`[Ollama] Model ${activeModel} failed with tools, retrying without...`);
            usedTools = false;
            delete requestParams.tools;
            delete requestParams.tool_choice;

            try {
                response = await client.chat.completions.create(requestParams);
            } catch (retryErr) {
                throw new Error(`Ollama error: ${retryErr.message}`);
            }
        } else {
            throw new Error(`Ollama error: ${err.message}`);
        }
    }

    const choice = response.choices?.[0];
    if (!choice) throw new Error('Ollama returned an empty response');

    const message = choice.message;

    // ── Tool call response ───────────────────────────────────────
    // Check for tool calls — Ollama may use 'tool_calls' or 'stop' as finish_reason
    if (message.tool_calls && message.tool_calls.length > 0) {
        const toolCall = message.tool_calls[0];
        let args = {};
        try {
            args = typeof toolCall.function.arguments === 'string'
                ? JSON.parse(toolCall.function.arguments)
                : toolCall.function.arguments || {};
        } catch {
            args = {};
        }

        console.log(`[Ollama] Tool call: ${toolCall.function.name}(${JSON.stringify(args)})`);

        return {
            type: 'tool_call',
            toolCall: {
                id: toolCall.id || `ollama_${Date.now()}`,
                name: toolCall.function.name,
                args,
            },
            rawMessage: message,
        };
    }

    // ── Text response ────────────────────────────────────────────
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
        console.error(`[Ollama] Summarization failed: ${err.message}`);
        return '';
    }
}

/**
 * Trim conversation history to the most recent N messages.
 */
function trimHistory(messages, maxMessages) {
    if (messages.length <= maxMessages) return messages;
    return messages.slice(messages.length - maxMessages);
}

module.exports = { chat, summarizeResult, setModelOverride, getActiveModel };
