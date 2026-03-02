/**
 * FalconMind — Models Route
 *
 * Provider-aware model listing:
 *   - Ollama: Lists local + cloud models from the Docker container
 *   - Other providers: Returns the configured model info only (no switching)
 *
 * GET  /api/models         → List available models for the active provider
 * POST /api/models/switch   → Switch the active model (Ollama only)
 */

'use strict';

const express = require('express');
const router = express.Router();
const config = require('../config');
const { getProvider } = require('../services/ai/factory');

/**
 * GET /api/models — list available models for the active provider.
 */
router.get('/', async (req, res) => {
    const { providerName, model } = getProvider();

    // Non-Ollama providers: return current provider/model info
    if (providerName !== 'Ollama') {
        return res.json({
            activeModel: model,
            provider: providerName,
            models: [{
                name: model,
                sizeHuman: 'Cloud',
                parameterSize: '',
                family: providerName,
                isCloud: true,
            }],
            switchable: false,
        });
    }

    // Ollama: list all local models from the Docker container
    try {
        const ollamaApiBase = config.ollama.baseUrl.replace('/v1', '');
        const response = await fetch(`${ollamaApiBase}/api/tags`);

        if (!response.ok) {
            throw new Error(`Ollama returned ${response.status}`);
        }

        const data = await response.json();
        const models = (data.models || []).map(m => ({
            name: m.name,
            size: m.size,
            sizeHuman: formatSize(m.size),
            parameterSize: m.details?.parameter_size || '?',
            family: m.details?.family || '',
            isCloud: m.name.includes('-cloud') || m.size === 0,
        }));

        const { getActiveModel } = require('../services/ollama/chat');

        res.json({
            activeModel: getActiveModel(),
            provider: 'Ollama',
            models,
            switchable: true,
        });
    } catch (err) {
        res.status(500).json({
            error: true,
            message: `Failed to list Ollama models: ${err.message}`,
            models: [],
        });
    }
});

/**
 * POST /api/models/switch — switch the active model (Ollama only).
 */
router.post('/switch', (req, res) => {
    const { providerName } = getProvider();

    if (providerName !== 'Ollama') {
        return res.status(400).json({
            error: true,
            message: `Model switching is only available for Ollama. Current provider: ${providerName}.`,
        });
    }

    const { model } = req.body;

    if (!model || typeof model !== 'string') {
        return res.status(400).json({ error: true, message: 'Model name is required.' });
    }

    const { setModelOverride, getActiveModel } = require('../services/ollama/chat');
    setModelOverride(model);

    // Clear conversation history on model switch
    if (req.session) {
        req.session.history = [];
    }

    console.log(`[Models] Switched to: ${model}`);

    res.json({
        success: true,
        activeModel: getActiveModel(),
        message: `Switched to ${model}. Chat history cleared.`,
    });
});

function formatSize(bytes) {
    if (!bytes || bytes === 0) return 'Cloud';
    const gb = bytes / (1024 ** 3);
    if (gb >= 1) return `${gb.toFixed(1)} GB`;
    const mb = bytes / (1024 ** 2);
    return `${mb.toFixed(0)} MB`;
}

module.exports = router;
