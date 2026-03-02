/**
 * FalconMind — Falcon Intel (Threat Intelligence) Service
 *
 * Covers:
 *   - GET  /intel/queries/actors/v1          — search threat actor profiles
 *   - GET  /intel/entities/actors/v1         — get actor details
 *   - GET  /intel/queries/reports/v1         — search intelligence reports
 *   - GET  /intel/entities/reports/v1        — get report details
 *   - GET  /intel/queries/indicators/v1      — search IOCs in intel
 *   - GET  /intel/entities/indicators/v1     — get IOC details from intel DB
 */

'use strict';

const client = require('./client');

/**
 * Search for threat actor profiles.
 * @param {object} opts
 * @param {string} [opts.query]        Free-text search
 * @param {string} [opts.filter]       FQL filter
 * @param {number} [opts.limit]
 */
async function searchActors({ query = '', filter = '', limit = 10 } = {}) {
    const params = { limit };
    if (query) params.q = query;
    if (filter) params.filter = filter;

    const idsResp = await client.get('/intel/queries/actors/v1', { params });
    const ids = idsResp.data?.resources || [];

    if (ids.length === 0) return { actors: [] };

    const detailsResp = await client.get('/intel/entities/actors/v1', {
        params: { ids, fields: '__full__' },
    });
    const actors = detailsResp.data?.resources || [];

    return { actors };
}

/**
 * Search intelligence reports.
 * @param {object} opts
 * @param {string} [opts.query]    Free-text search
 * @param {string} [opts.filter]   FQL filter
 * @param {number} [opts.limit]
 */
async function searchReports({ query = '', filter = '', limit = 10 } = {}) {
    const params = { limit };
    if (query) params.q = query;
    if (filter) params.filter = filter;

    const idsResp = await client.get('/intel/queries/reports/v1', { params });
    const ids = idsResp.data?.resources || [];

    if (ids.length === 0) return { reports: [] };

    const detailsResp = await client.get('/intel/entities/reports/v1', {
        params: { ids, fields: '__full__' },
    });
    const reports = detailsResp.data?.resources || [];

    return { reports };
}

/**
 * Look up indicators (hashes, IPs, domains) in the Falcon intel database.
 * @param {object} opts
 * @param {string} [opts.query]    Hash, IP, domain, or keyword
 * @param {string} [opts.filter]   FQL filter (e.g., "type:'hash'")
 * @param {number} [opts.limit]
 */
async function searchIntelIndicators({ query = '', filter = '', limit = 10 } = {}) {
    const params = { limit };
    if (query) params.q = query;
    if (filter) params.filter = filter;

    const idsResp = await client.get('/intel/queries/indicators/v1', { params });
    const ids = idsResp.data?.resources || [];

    if (ids.length === 0) return { indicators: [] };

    const detailsResp = await client.get('/intel/entities/indicators/v1', {
        params: { ids },
    });
    const indicators = detailsResp.data?.resources || [];

    return { indicators };
}

module.exports = {
    searchActors,
    searchReports,
    searchIntelIndicators,
};
