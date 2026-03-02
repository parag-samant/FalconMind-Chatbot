/**
 * FalconMind — SOAR / Fusion Workflows Service
 *
 * NOTE: Requires 'Workflows: Read+Write' scope. Returns friendly error if unavailable.
 */

'use strict';

const client = require('./client');

const SCOPE_ERROR_MSG = '⚠️ **Falcon Fusion Workflows** are not available with your current API credentials. Add the **"Workflows: Read + Write"** scope to your CrowdStrike API client.';

async function listWorkflows({ limit = 20 } = {}) {
    try {
        const resp = await client.get('/workflows/combined/definitions/v1', {
            params: { limit },
        });
        return { workflows: resp.data?.resources || [], total: resp.data?.meta?.pagination?.total || 0 };
    } catch (err) {
        const errStatus = err.status || err.statusCode || err.response?.status;
        if (errStatus === 403 || errStatus === 404 || err.response?.status === 401) {
            return { workflows: [], total: 0, message: SCOPE_ERROR_MSG };
        }
        throw err;
    }
}

async function triggerWorkflow({ workflowId, payload = {} } = {}) {
    try {
        const resp = await client.post(`/workflows/entities/execute/v1`, {
            definition_id: workflowId,
            ...payload,
        });
        return resp.data;
    } catch (err) {
        const errStatus = err.status || err.statusCode || err.response?.status;
        if (errStatus === 403 || errStatus === 404 || err.response?.status === 401) {
            return { error: true, message: SCOPE_ERROR_MSG };
        }
        throw err;
    }
}

module.exports = { listWorkflows, triggerWorkflow };
