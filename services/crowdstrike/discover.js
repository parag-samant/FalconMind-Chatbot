/**
 * FalconMind — Discover / Exposure Management Service
 *
 * NOTE: Requires 'Discover: Read' scope. Returns friendly error if unavailable.
 */

'use strict';

const client = require('./client');

const SCOPE_ERROR_MSG = '⚠️ **Falcon Discover (Exposure Management)** is not available with your current API credentials. Add the **"Discover: Read"** scope to your CrowdStrike API client.';

async function listDiscoveredHosts({ filter = '', limit = 20 } = {}) {
    try {
        const params = { limit };
        if (filter) params.filter = filter;

        const resp = await client.get('/discover/queries/hosts/v1', { params });
        const ids = resp.data?.resources || [];

        if (ids.length === 0) return { hosts: [], total: 0 };

        const detailsResp = await client.get('/discover/entities/hosts/v1', { params: { ids } });
        return { hosts: detailsResp.data?.resources || [], total: ids.length };
    } catch (err) {
        const errStatus = err.status || err.statusCode || err.response?.status;
        if (errStatus === 403 || errStatus === 401) {
            return { hosts: [], total: 0, message: SCOPE_ERROR_MSG };
        }
        throw err;
    }
}

async function listUnmanagedAssets(limit = 20) {
    return listDiscoveredHosts({ filter: "entity_type:'unmanaged'", limit });
}

async function listDiscoveredApplications({ filter = '', limit = 20 } = {}) {
    try {
        const params = { limit };
        if (filter) params.filter = filter;

        const resp = await client.get('/discover/queries/applications/v1', { params });
        const ids = resp.data?.resources || [];

        if (ids.length === 0) return { applications: [], total: 0 };

        const detailsResp = await client.get('/discover/entities/applications/v1', { params: { ids } });
        return { applications: detailsResp.data?.resources || [], total: ids.length };
    } catch (err) {
        const errStatus = err.status || err.statusCode || err.response?.status;
        if (errStatus === 403 || errStatus === 401) {
            return { applications: [], total: 0, message: SCOPE_ERROR_MSG };
        }
        throw err;
    }
}

module.exports = { listDiscoveredHosts, listUnmanagedAssets, listDiscoveredApplications };
