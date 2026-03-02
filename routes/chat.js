/**
 * FalconMind — Chat Route
 *
 * POST /api/chat
 * The main endpoint that orchestrates the full AI → CrowdStrike API → response pipeline.
 *
 * Flow:
 *   1. Receive user message
 *   2. Append to session conversation history
 *   3. Send to AI provider (Groq/OpenAI/Gemini) with function definitions
 *   4. If tool call: check if destructive → require confirmation, otherwise execute
 *   5. If text: return directly
 *   6. Format and return response to browser
 */

'use strict';

const express = require('express');
const router = express.Router();
const { getProvider } = require('../services/ai/factory');
const { routeIntent } = require('../utils/intentRouter');
const { format } = require('../utils/responseFormatter');
const { storePending } = require('../utils/confirmationStore');

// Canonical source for destructive functions list
const { DESTRUCTIVE_FUNCTIONS } = require('../services/openai/functions');

// Maximum number of messages to keep in session history
const MAX_HISTORY_LENGTH = 50;

router.post('/', async (req, res, next) => {
    try {
        const { message } = req.body;

        // Dynamic provider selection based on any session/config changes 
        const { chat, summarizeResult, providerName } = getProvider();

        if (!message || typeof message !== 'string' || message.trim().length === 0) {
            return res.status(400).json({ error: true, message: 'Message cannot be empty.' });
        }

        if (message.length > 2000) {
            return res.status(400).json({ error: true, message: 'Message too long. Please keep messages under 2000 characters.' });
        }

        // Initialize conversation history in session
        if (!req.session.history) {
            req.session.history = [];
        }

        // Append user message to history
        req.session.history.push({
            role: 'user',
            content: message.trim(),
        });

        // Cap history to prevent unbounded memory growth
        if (req.session.history.length > MAX_HISTORY_LENGTH) {
            req.session.history = req.session.history.slice(req.session.history.length - MAX_HISTORY_LENGTH);
        }

        // Get AI response (with function calling enabled)
        const aiResponse = await chat(req.session.history);

        // Case 1: AI made a tool/function call
        if (aiResponse.type === 'tool_call') {
            const { name: functionName, args } = aiResponse.toolCall;

            // Check if this is a destructive action requiring confirmation
            if (DESTRUCTIVE_FUNCTIONS.has(functionName)) {
                const humanDesc = buildHumanDescription(functionName, args);
                const confirmationId = storePending({
                    functionName,
                    args,
                    humanDescription: humanDesc,
                });

                // Append AI message to history (so AI knows what it tried to do)
                req.session.history.push({
                    role: 'assistant',
                    content: `I want to ${humanDesc}, but this requires your explicit confirmation.`,
                });

                return res.json({
                    type: 'confirmation_required',
                    message: `⚠️ **Confirmation Required**\n\nI'm about to: **${humanDesc}**\n\nThis action cannot be undone. Do you want to proceed?`,
                    confirmationId,
                    functionName,
                });
            }

            // Non-destructive: execute immediately
            let apiResult;
            let formattedResult;

            try {
                apiResult = await routeIntent(functionName, args);
                formattedResult = format(functionName, apiResult);
            } catch (apiErr) {
                // API errors become friendly chat responses, not HTTP errors
                const errorMessage = `❌ **API Error:** ${apiErr.message}`;

                req.session.history.push({
                    role: 'assistant',
                    content: errorMessage,
                });

                return res.json({
                    type: 'assistant',
                    message: errorMessage,
                });
            }

            // Get AI to summarize/interpret the results
            let aiSummary = '';
            try {
                aiSummary = await summarizeResult(functionName, apiResult, message);
            } catch {
                aiSummary = ''; // Skip summary if it fails
            }

            const fullResponse = aiSummary
                ? `${formattedResult}\n\n---\n\n**🤖 FalconMind Analysis:**\n${aiSummary}`
                : formattedResult;

            // Append combined response to history
            req.session.history.push({
                role: 'assistant',
                content: fullResponse,
            });

            return res.json({
                type: 'assistant',
                message: fullResponse,
                functionCalled: functionName,
            });
        }

        // Case 2: AI returned a direct text response
        req.session.history.push({
            role: 'assistant',
            content: aiResponse.content,
        });

        return res.json({
            type: 'assistant',
            message: aiResponse.content,
        });
    } catch (err) {
        next(err);
    }
});

/**
 * DELETE /api/chat/history — Clear conversation history (used by New Chat).
 */
router.delete('/history', (req, res) => {
    if (req.session) {
        req.session.history = [];
    }
    res.json({ success: true, message: 'Conversation history cleared.' });
});

/**
 * Build a human-readable description of a destructive action.
 */
function buildHumanDescription(functionName, args) {
    switch (functionName) {
        case 'contain_host':
            return `network contain host with ID \`${args.device_id}\``;
        case 'lift_containment':
            return `lift network containment on host \`${args.device_id}\``;
        case 'delete_ioc':
            return `delete ${args.ioc_ids.length} custom IOC(s): ${args.ioc_ids.join(', ')}`;
        case 'create_ioc':
            return `create a new ${args.action} IOC for \`${args.value}\` (type: ${args.type})`;
        case 'update_detection_status':
            return `update ${args.detection_ids.length} detection(s) to status "${args.status}"`;
        case 'rtr_run_command':
            return `execute RTR command \`${args.command_string}\` on host \`${args.device_id}\``;
        case 'trigger_workflow':
            return `trigger SOAR workflow \`${args.workflow_id}\``;
        default:
            return `execute "${functionName}" with the provided parameters`;
    }
}

module.exports = router;
