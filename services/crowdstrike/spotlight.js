/**
 * FalconMind — Spotlight / Vulnerability Management Service
 *
 * NOTE: These endpoints require the 'Spotlight Vulnerabilities: Read' OAuth2 scope.
 * If the scope is not granted, all functions return a friendly message instead of crashing.
 */

'use strict';

const client = require('./client');

const SCOPE_ERROR_MSG = '⚠️ **Spotlight Vulnerabilities** is not available with your current API credentials. To enable this module, add the **"Spotlight Vulnerabilities: Read"** scope to your CrowdStrike API client at: Falcon Console → Support → API Clients and Keys.';

/**
 * Wraps a Spotlight API call with scope-denied error handling.
 */
async function safeCall(fn) {
    try {
        return await fn();
    } catch (err) {
        const status = err.status || err.statusCode || err.response?.status;
        if (status === 403 || status === 401) {
            return { error: true, message: SCOPE_ERROR_MSG };
        }
        throw err;
    }
}

async function listVulnerabilities({ filter = '', limit = 20 } = {}) {
    return safeCall(async () => {
        const defaultFilter = filter || "status:!'closed'";
        const resp = await client.get('/spotlight/combined/vulnerabilities/v1', {
            params: { filter: defaultFilter, limit },
        });
        return { vulnerabilities: resp.data?.resources || [], total: resp.data?.meta?.pagination?.total || 0 };
    });
}

async function searchByCVE(cveId) {
    return safeCall(async () => {
        const resp = await client.get('/spotlight/combined/vulnerabilities/v1', {
            params: { filter: `cve.id:'${cveId}'`, limit: 50 },
        });
        return { vulnerabilities: resp.data?.resources || [], total: resp.data?.meta?.pagination?.total || 0 };
    });
}

async function getVulnerabilityPosture() {
    return safeCall(async () => {
        const severities = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
        const counts = {};
        for (const sev of severities) {
            const resp = await client.get('/spotlight/combined/vulnerabilities/v1', {
                params: { filter: `cve.severity:'${sev}'+status:!'closed'`, limit: 1 },
            });
            counts[sev.toLowerCase()] = resp.data?.meta?.pagination?.total || 0;
        }
        return counts;
    });
}

module.exports = { listVulnerabilities, searchByCVE, getVulnerabilityPosture };
