/**
 * FalconMind — Status Route
 *
 * GET /api/status
 * Returns CrowdStrike connection health, token validity, and app info.
 */

'use strict';

const express = require('express');
const router = express.Router();
const { getTokenStatus } = require('../services/crowdstrike/auth');
const config = require('../config');
const { getProvider } = require('../services/ai/factory');

router.get('/', async (req, res) => {
    try {
        const tokenStatus = getTokenStatus();

        // If no token yet, try a lightweight connection test
        let csStatus = tokenStatus;
        if (!tokenStatus.authenticated) {
            try {
                const { getValidToken } = require('../services/crowdstrike/auth');
                await getValidToken();
                csStatus = getTokenStatus();
            } catch (err) {
                csStatus = { authenticated: false, error: err.message };
            }
        }

        const aiProvider = getProvider();

        res.json({
            status: 'ok',
            app: 'FalconMind',
            version: '1.0.0',
            environment: config.nodeEnv,
            crowdstrike: {
                baseUrl: config.crowdstrike.baseUrl,
                authenticated: csStatus.authenticated,
                tokenExpiresIn: csStatus.expiresIn,
                error: csStatus.error || undefined,
            },
            ai: {
                provider: aiProvider.providerName,
                model: aiProvider.model,
            },
            timestamp: new Date().toISOString(),
        });
    } catch (err) {
        res.json({
            status: 'degraded',
            crowdstrike: { authenticated: false, error: err.message },
            timestamp: new Date().toISOString(),
        });
    }
});

module.exports = router;
