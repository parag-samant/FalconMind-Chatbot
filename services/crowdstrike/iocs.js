/**
 * FalconMind — Custom IOC Management Service
 *
 * Covers:
 *   - GET    /iocs/queries/indicators/v1   — list/search IOC IDs
 *   - POST   /iocs/entities/indicators/v1 — create or update IOCs
 *   - DELETE /iocs/entities/indicators/v1 — delete IOCs
 *   - GET    /iocs/entities/indicators/v1 — get IOC details
 */

'use strict';

const client = require('./client');

/**
 * List custom IOCs with optional filter.
 * @param {object} opts
 * @param {string} [opts.filter]   FQL filter (e.g., "type:'sha256'")
 * @param {number} [opts.limit]
 */
async function listIOCs({ filter = '', limit = 20 } = {}) {
    const params = { limit };
    if (filter) params.filter = filter;

    const idsResp = await client.get('/iocs/queries/indicators/v1', { params });
    const ids = idsResp.data?.resources || [];

    if (ids.length === 0) return { iocs: [], total: 0 };

    const detailsResp = await client.get('/iocs/entities/indicators/v1', {
        params: { ids },
    });
    const iocs = detailsResp.data?.resources || [];

    return { iocs, total: ids.length };
}

/**
 * Create a new custom IOC.
 * @param {object} opts
 * @param {string} opts.type         'sha256' | 'md5' | 'domain' | 'ipv4' | 'ipv6'
 * @param {string} opts.value        The IOC value
 * @param {string} opts.action       'detect' | 'prevent' | 'no_action'
 * @param {string} [opts.severity]   'critical' | 'high' | 'medium' | 'low'
 * @param {string} [opts.description]
 * @param {string} [opts.comment]
 * @param {number} [opts.expiration] Days until expiration
 */
async function createIOC({ type, value, action, severity = 'medium', description = '', comment = '', expiration }) {
    const ioc = {
        type,
        value,
        action,
        severity,
        description,
        comment,
        applied_globally: true,
        platforms: ['windows', 'mac', 'linux'],
    };

    if (expiration) {
        const expirationDate = new Date();
        expirationDate.setDate(expirationDate.getDate() + expiration);
        ioc.expiration = expirationDate.toISOString();
    }

    const resp = await client.post('/iocs/entities/indicators/v1', {
        indicators: [ioc],
    });

    return resp.data?.resources || [];
}

/**
 * Delete one or more IOCs by their IDs.
 * @param {string[]} ids   IOC IDs to delete
 */
async function deleteIOCs(ids) {
    const resp = await client.delete('/iocs/entities/indicators/v1', {
        params: { ids },
    });
    return resp.data;
}

module.exports = {
    listIOCs,
    createIOC,
    deleteIOCs,
};
