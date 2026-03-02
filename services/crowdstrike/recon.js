/**
 * FalconMind — Recon / Digital Risk Service
 *
 * NOTE: Requires 'Recon: Read' scope. Returns friendly error if unavailable.
 */

'use strict';

const client = require('./client');

const SCOPE_ERROR_MSG = '⚠️ **Falcon Recon (Digital Risk Monitoring)** is not available with your current API credentials. Add the **"Recon: Read"** scope to your CrowdStrike API client.';

async function listReconAlerts({ filter = '', limit = 20 } = {}) {
    try {
        const params = { limit };
        if (filter) params.filter = filter;

        const resp = await client.get('/recon/queries/notifications/v1', { params });
        const ids = resp.data?.resources || [];

        if (ids.length === 0) return { alerts: [], total: 0 };

        const detailsResp = await client.get('/recon/entities/notifications/v1', { params: { ids } });
        return { alerts: detailsResp.data?.resources || [], total: ids.length };
    } catch (err) {
        const errStatus = err.status || err.statusCode || err.response?.status;
        if (errStatus === 403 || errStatus === 401) {
            return { alerts: [], total: 0, message: SCOPE_ERROR_MSG };
        }
        throw err;
    }
}

async function listMonitoringRules({ limit = 20 } = {}) {
    try {
        const resp = await client.get('/recon/queries/rules/v1', { params: { limit } });
        const ids = resp.data?.resources || [];

        if (ids.length === 0) return { rules: [], total: 0 };

        const detailsResp = await client.get('/recon/entities/rules/v1', { params: { ids } });
        return { rules: detailsResp.data?.resources || [], total: ids.length };
    } catch (err) {
        const errStatus = err.status || err.statusCode || err.response?.status;
        if (errStatus === 403 || errStatus === 401) {
            return { rules: [], total: 0, message: SCOPE_ERROR_MSG };
        }
        throw err;
    }
}

module.exports = { listReconAlerts, listMonitoringRules };
