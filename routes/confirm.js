/**
 * FalconMind — Confirm Route
 *
 * POST /api/confirm
 * Handles user confirmation or denial of pending destructive actions.
 *
 * Body: { confirmationId: string, approved: boolean }
 */

'use strict';

const express = require('express');
const router = express.Router();
const { consumePending, discardPending } = require('../utils/confirmationStore');
const { routeIntent } = require('../utils/intentRouter');
const { format } = require('../utils/responseFormatter');
const { getProvider } = require('../services/ai/factory');

router.post('/', async (req, res, next) => {
    try {
        const { confirmationId, approved } = req.body;

        if (!confirmationId) {
            return res.status(400).json({
                error: true,
                message: 'confirmationId is required.',
            });
        }

        // Handle denial
        if (!approved) {
            discardPending(confirmationId);
            return res.json({
                type: 'assistant',
                message: '✅ **Action cancelled.** No changes were made.',
            });
        }

        // Retrieve and consume the pending action
        const pending = consumePending(confirmationId);

        if (!pending) {
            return res.json({
                type: 'assistant',
                message: '⏱️ **This confirmation has expired** or was already processed. Please start the action again.',
            });
        }

        // Execute the confirmed action
        let apiResult;
        try {
            apiResult = await routeIntent(pending.functionName, pending.args);
        } catch (err) {
            return res.json({
                type: 'assistant',
                message: `❌ **Action Failed:** ${err.message}`,
            });
        }

        const formattedResult = format(pending.functionName, apiResult);

        // Add confirmation context
        const fullResponse = [
            `✅ **Confirmed and executed:** ${pending.humanDescription}`,
            '',
            formattedResult,
        ].join('\n');

        // Append to session history if available
        if (req.session) {
            if (!req.session.history) req.session.history = [];
            req.session.history.push({
                role: 'assistant',
                content: fullResponse,
            });
        }

        return res.json({
            type: 'assistant',
            message: fullResponse,
            functionCalled: pending.functionName,
        });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
