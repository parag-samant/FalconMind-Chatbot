/**
 * FalconMind — Identity Protection Service
 *
 * Routes identity-based detections through the unified Alerts v2 API
 * with type filter for identity alerts. Falls back gracefully if unavailable.
 */

'use strict';

const client = require('./client');

async function listIdentityDetections({ filter = '', limit = 20 } = {}) {
    try {
        // Use alerts v2 with product filter for identity
        const identityFilter = filter
            ? `${filter}+product:'identity-protection'`
            : "product:'identity-protection'";

        const idsResp = await client.get('/alerts/queries/alerts/v2', {
            params: { filter: identityFilter, limit, sort: 'last_updated_timestamp.desc' },
        });
        const ids = idsResp.data?.resources || [];

        if (ids.length === 0) {
            return { detections: [], total: 0, message: 'No identity-based detections found.' };
        }

        const detailsResp = await client.post('/alerts/entities/alerts/v2', { composite_ids: ids });
        return { detections: detailsResp.data?.resources || [], total: ids.length };
    } catch (err) {
        const errStatus = err.status || err.statusCode || err.response?.status;
        if (errStatus === 403 || errStatus === 400) {
            return {
                detections: [],
                total: 0,
                message: '⚠️ **Identity Protection alerts** are not available. The identity product filter may not be enabled for your tenant, or the identity-protection scope is missing from your API client.',
            };
        }
        throw err;
    }
}

module.exports = { listIdentityDetections };
