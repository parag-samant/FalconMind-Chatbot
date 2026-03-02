/**
 * FalconMind — Threat Hunting Service (v2)
 *
 * Rewritten to use working endpoints:
 *   - GET  /alerts/queries/alerts/v2           — hunt via unified alerts
 *   - POST /alerts/entities/alerts/v2          — alert details
 *   - GET  /incidents/queries/behaviors/v1     — behavior/TTP search
 *   - POST /incidents/entities/behaviors/GET/v1 — behavior details
 *
 * The old /processes/queries/processes/v1 endpoint is NOT available.
 * Hash and IOC hunts now go through the alerts v2 API with proper FQL filters.
 */

'use strict';

const client = require('./client');

/**
 * Hunt for a specific hash across all hosts via alerts.
 * Searches both SHA256 and MD5 fields in the unified alerts view.
 * @param {string} hash   MD5 or SHA256 hash
 * @param {number} [days] Days to look back (default 7)
 */
async function huntByHash({ hash, days = 7 } = {}) {
    const since = new Date(Date.now() - days * 86400000).toISOString().split('.')[0] + 'Z';

    // Try SHA256 first, then MD5
    const filters = [];
    if (hash.length === 64) {
        filters.push(`behaviors.sha256:'${hash}'`);
    } else if (hash.length === 32) {
        filters.push(`behaviors.md5:'${hash}'`);
    } else {
        // Unknown hash length — try both
        filters.push(`behaviors.sha256:'${hash}',behaviors.md5:'${hash}'`);
    }

    const filter = `(${filters.join(',')})+last_updated_timestamp:>='${since}'`;

    try {
        const idsResp = await client.get('/alerts/queries/alerts/v2', {
            params: { filter, limit: 50, sort: 'last_updated_timestamp.desc' },
        });
        const ids = idsResp.data?.resources || [];

        if (ids.length === 0) {
            return { results: [], total: 0, message: `No alerts found containing hash \`${hash}\` in the last ${days} day(s).` };
        }

        const detailsResp = await client.post('/alerts/entities/alerts/v2', { composite_ids: ids });
        const results = detailsResp.data?.resources || [];

        return { results, total: ids.length };
    } catch (err) {
        // If the filter syntax isn't supported, fall back to a simpler search
        if (err.response?.status === 400) {
            return { results: [], total: 0, message: `Hash hunt filter not supported by this API version. Hash: \`${hash}\`` };
        }
        throw err;
    }
}

/**
 * Hunt for a specific IP or domain across the environment.
 * Uses the `q` free-text search parameter to find the IOC across all alert fields,
 * combined with a time-scoped FQL filter.
 * @param {string} ioc    IP address or domain
 * @param {number} [days] Days to look back
 */
async function huntByIOC({ ioc, days = 7 } = {}) {
    const since = new Date(Date.now() - days * 86400000).toISOString().split('.')[0] + 'Z';

    const isIP = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(ioc);

    // Time-scoped filter
    const filter = `last_updated_timestamp>='${since}'`;

    try {
        // Use `q` parameter for free-text IOC search across all alert fields
        const idsResp = await client.get('/alerts/queries/alerts/v2', {
            params: {
                filter,
                q: ioc,
                limit: 50,
                sort: 'last_updated_timestamp.desc',
            },
        });
        const ids = idsResp.data?.resources || [];

        if (ids.length === 0) {
            return {
                results: [],
                total: 0,
                message: `No alerts found containing ${isIP ? 'IP' : 'domain'} \`${ioc}\` in the last ${days} day(s). This may mean the IOC hasn't triggered any Falcon detections. Consider using **lookup_intel_indicator** to check threat intelligence for this IOC.`,
            };
        }

        const detailsResp = await client.post('/alerts/entities/alerts/v2', { composite_ids: ids });
        const results = detailsResp.data?.resources || [];

        // Post-filter: verify the IOC actually appears in the alert details
        const matched = results.filter((r) => {
            const json = JSON.stringify(r).toLowerCase();
            return json.includes(ioc.toLowerCase());
        });

        if (matched.length > 0) {
            return { results: matched, total: matched.length };
        }

        return {
            results: results.slice(0, 10),
            total: ids.length,
            message: `Found ${ids.length} recent alerts but none directly containing \`${ioc}\` in their details. Showing the most recent alerts for manual review. Consider using **lookup_intel_indicator** for intel context on this ${isIP ? 'IP' : 'domain'}.`,
        };
    } catch (err) {
        if (err.status === 400 || err.response?.status === 400) {
            return {
                results: [],
                total: 0,
                message: `IOC search not supported by this API version. ${isIP ? 'IP' : 'Domain'}: \`${ioc}\`. Try using **lookup_intel_indicator** instead.`,
            };
        }
        throw err;
    }
}

/**
 * Search behaviors (TTPs) observed in incidents.
 *
 * The /incidents/queries/behaviors/v1 endpoint has very limited FQL support —
 * only `timestamp` is reliably accepted. Fields like device_id, tactic, and
 * technique cause 400 errors.
 *
 * Strategy: Try the behaviors endpoint first. On 400, fall back to the alerts
 * v2 API which supports the full range of FQL fields including hostname,
 * tactic, technique, etc.
 */
async function searchBehaviors({ filter = '', limit = 20 } = {}) {
    const { sanitizeFqlFilter } = require('../../utils/fqlSanitizer');
    const sanitizedFilter = sanitizeFqlFilter(filter);

    console.log('[searchBehaviors] filter:', JSON.stringify(filter), '→ sanitized:', JSON.stringify(sanitizedFilter));

    // ── Attempt 1: Try the behaviors endpoint ───────────────────────────
    try {
        const params = { limit };
        if (sanitizedFilter) params.filter = sanitizedFilter;

        const idsResp = await client.get('/incidents/queries/behaviors/v1', { params });
        const ids = idsResp.data?.resources || [];

        if (ids.length === 0) {
            // Behaviors endpoint returned nothing — fall through to alerts
            throw { fallbackToAlerts: true };
        }

        const detailsResp = await client.post('/incidents/entities/behaviors/GET/v1', { ids });
        const behaviors = detailsResp.data?.resources || [];

        return { behaviors, total: ids.length };
    } catch (err) {
        // ── Attempt 2: Fall back to alerts v2 API ───────────────────────
        // This handles both 400 errors (invalid filter) and empty results
        const shouldFallback =
            err.fallbackToAlerts ||
            err.status === 400 ||
            err.statusCode === 400 ||
            err.response?.status === 400;

        if (shouldFallback) {
            console.log('[searchBehaviors] Falling back to alerts v2 API');

            try {
                // Translate behavior filter fields → alert filter fields
                let alertFilter = sanitizedFilter || '';
                // device_id → hostname (remove device_id since alerts use hostname)
                alertFilter = alertFilter.replace(/device_id:'[^']*'/g, '');
                // Clean up dangling + operators
                alertFilter = alertFilter.replace(/^\+|\+$/g, '').replace(/\+\+/g, '+');

                const alertParams = { limit, sort: 'last_updated_timestamp.desc' };
                if (alertFilter) alertParams.filter = alertFilter;

                const idsResp = await client.get('/alerts/queries/alerts/v2', { params: alertParams });
                const ids = idsResp.data?.resources || [];

                if (ids.length === 0) {
                    return {
                        behaviors: [],
                        total: 0,
                        message: filter
                            ? `No behaviors or alerts found matching filter: \`${filter}\`. The behaviors API has very limited filter support. Try using **list_detections** instead to search by hostname, tactic, or technique.`
                            : 'No behaviors found. Try using **list_detections** to search for detections by hostname or tactic.',
                    };
                }

                const detailsResp = await client.post('/alerts/entities/alerts/v2', { composite_ids: ids });
                const alerts = detailsResp.data?.resources || [];

                return {
                    behaviors: alerts,
                    total: ids.length,
                    message: `Note: Behavior search returned results from the alerts API instead (the behaviors endpoint has limited filter support). Showing ${alerts.length} alerts.`,
                };
            } catch (alertErr) {
                return {
                    behaviors: [],
                    total: 0,
                    message: `Behavior search failed. The behaviors API does not support filters like device_id, tactic, or technique. Use **list_detections** instead with hostname or tactic filters.`,
                };
            }
        }
        throw err;
    }
}

module.exports = {
    huntByHash,
    huntByIOC,
    searchBehaviors,
};
