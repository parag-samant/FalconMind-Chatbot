/**
 * FalconMind — Firewall Management Service
 *
 * NOTE: These endpoints require specific scopes and may not be available on all tenants.
 * All calls are wrapped with graceful error handling.
 */

'use strict';

const client = require('./client');

const SCOPE_ERROR_MSG = '⚠️ **Falcon Firewall Management** is not available with your current API credentials. Add the **"Firewall Management: Read"** scope to your CrowdStrike API client.';

async function listFirewallPolicies({ limit = 20 } = {}) {
    try {
        const resp = await client.get('/policy/queries/firewall/v1', {
            params: { limit },
        });
        const ids = resp.data?.resources || [];

        if (ids.length === 0) return { policies: [], total: 0 };

        const detailsResp = await client.get('/policy/entities/firewall/v1', {
            params: { ids },
        });
        return { policies: detailsResp.data?.resources || [], total: ids.length };
    } catch (err) {
        const errStatus = err.status || err.statusCode || err.response?.status;
        if (errStatus === 403 || errStatus === 404) {
            return { policies: [], total: 0, message: SCOPE_ERROR_MSG };
        }
        throw err;
    }
}

async function listFirewallEvents({ filter = '', limit = 20 } = {}) {
    try {
        const params = { limit };
        if (filter) params.filter = filter;

        const resp = await client.get('/fwmgr/queries/events/v1', { params });
        const ids = resp.data?.resources || [];

        if (ids.length === 0) return { events: [], total: 0 };

        const detailsResp = await client.get('/fwmgr/entities/events/v1', {
            params: { ids },
        });
        return { events: detailsResp.data?.resources || [], total: ids.length };
    } catch (err) {
        const errStatus = err.status || err.statusCode || err.response?.status;
        if (errStatus === 403 || errStatus === 404) {
            return { events: [], total: 0, message: SCOPE_ERROR_MSG };
        }
        throw err;
    }
}

module.exports = { listFirewallPolicies, listFirewallEvents };
