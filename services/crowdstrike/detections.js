/**
 * FalconMind — Detections & Alerts Service (v2)
 *
 * Migrated from decommissioned /detects/ to the current Alerts v2 API:
 *   - GET  /alerts/queries/alerts/v2      — query alert composite IDs
 *   - POST /alerts/entities/alerts/v2     — get full alert details
 *   - GET  /incidents/queries/incidents/v1  — query incident IDs
 *   - POST /incidents/entities/incidents/GET/v1 — incident details
 */

'use strict';

const client = require('./client');
const { sanitizeFqlFilter } = require('../../utils/fqlSanitizer');

/**
 * List alerts (detections) using the Alerts v2 API.
 * @param {object} opts
 * @param {string} [opts.filter]  FQL filter (e.g., "status:'new'+severity_name:'High'")
 * @param {number} [opts.limit]   Max results (default 20)
 * @param {string} [opts.sort]    Sort field (e.g., 'last_updated_timestamp.desc')
 */
async function listDetections({ filter = '', limit = 20, sort = 'last_updated_timestamp.desc' } = {}) {
    const sanitizedFilter = sanitizeFqlFilter(filter);
    const params = { limit, sort };
    if (sanitizedFilter) params.filter = sanitizedFilter;

    console.log('[listDetections] filter:', JSON.stringify(filter), '→ sanitized:', JSON.stringify(sanitizedFilter));

    try {
        const idsResp = await client.get('/alerts/queries/alerts/v2', { params });
        const ids = idsResp.data?.resources || [];

        console.log('[listDetections] IDs:', ids.length, 'Total:', idsResp.data?.meta?.pagination?.total);

        if (ids.length === 0) {
            return {
                detections: [],
                total: idsResp.data?.meta?.pagination?.total || 0,
                message: filter
                    ? `No detections found matching filter: \`${filter}\`. Try broadening your search — remove the time or status constraint, or call list_detections without any filter to see all recent alerts.`
                    : 'No detections found in the environment.',
            };
        }

        // Fetch full details
        const detailsResp = await client.post('/alerts/entities/alerts/v2', {
            composite_ids: ids,
        });
        const detections = detailsResp.data?.resources || [];

        return {
            detections,
            total: idsResp.data?.meta?.pagination?.total || ids.length,
        };
    } catch (err) {
        // If the filter caused a 400 error, retry without the filter
        if ((err.status === 400 || err.statusCode === 400) && sanitizedFilter) {
            console.warn('[listDetections] Filter caused 400, retrying unfiltered:', err.message);
            const fallbackResp = await client.get('/alerts/queries/alerts/v2', {
                params: { limit, sort },
            });
            const fallbackIds = fallbackResp.data?.resources || [];

            if (fallbackIds.length === 0) {
                return { detections: [], total: 0, message: 'No detections found in the environment.' };
            }

            const detailsResp = await client.post('/alerts/entities/alerts/v2', {
                composite_ids: fallbackIds,
            });

            return {
                detections: detailsResp.data?.resources || [],
                total: fallbackResp.data?.meta?.pagination?.total || fallbackIds.length,
                message: `Note: The original filter "${filter}" was invalid. Showing the ${fallbackIds.length} most recent detections instead.`,
            };
        }
        throw err;
    }
}

/**
 * Get full details for a specific alert by composite ID.
 * @param {string} detectionId  Alert composite ID
 */
async function getDetectionById(detectionId) {
    const resp = await client.post('/alerts/entities/alerts/v2', {
        composite_ids: [detectionId],
    });
    const alerts = resp.data?.resources || [];
    return alerts[0] || null;
}

/**
 * Update the status of detections/alerts.
 * Uses the alerts v3 action endpoint.
 * @param {string[]} ids      Alert composite IDs
 * @param {string}   status   'new', 'in_progress', 'true_positive', 'false_positive', 'ignored'
 * @param {string}   [assignTo]
 * @param {string}   [comment]
 */
async function updateDetectionStatus({ ids, status, assignTo, comment } = {}) {
    const actionParams = [];
    if (status) actionParams.push({ name: 'update_status', value: status });
    if (assignTo) actionParams.push({ name: 'assign_to_uid', value: assignTo });
    if (comment) actionParams.push({ name: 'append_comment', value: comment });

    const resp = await client.post('/alerts/entities/alerts/v3', {
        action_parameters: actionParams,
        composite_ids: ids,
    });
    return resp.data;
}

/**
 * List incidents with optional FQL filter.
 */
async function listIncidents({ filter = '', limit = 20 } = {}) {
    const sanitizedFilter = sanitizeFqlFilter(filter);
    const params = { limit, sort: 'start.desc' };
    if (sanitizedFilter) params.filter = sanitizedFilter;

    console.log('[listIncidents] filter:', JSON.stringify(filter), '→ sanitized:', JSON.stringify(sanitizedFilter));

    try {
        const idsResp = await client.get('/incidents/queries/incidents/v1', { params });
        const ids = idsResp.data?.resources || [];

        if (ids.length === 0) {
            return {
                incidents: [],
                total: 0,
                message: filter
                    ? `No incidents found matching filter: \`${filter}\`. Try removing the filter to see all recent incidents.`
                    : 'No incidents found in the environment.',
            };
        }

        const detailsResp = await client.post('/incidents/entities/incidents/GET/v1', { ids });
        const incidents = detailsResp.data?.resources || [];

        return { incidents, total: ids.length };
    } catch (err) {
        if ((err.status === 400 || err.statusCode === 400) && sanitizedFilter) {
            console.warn('[listIncidents] Filter caused 400, retrying unfiltered:', err.message);
            const fallbackResp = await client.get('/incidents/queries/incidents/v1', {
                params: { limit, sort: 'start.desc' },
            });
            const fallbackIds = fallbackResp.data?.resources || [];
            if (fallbackIds.length === 0) return { incidents: [], total: 0 };
            const detailsResp = await client.post('/incidents/entities/incidents/GET/v1', { ids: fallbackIds });
            return {
                incidents: detailsResp.data?.resources || [],
                total: fallbackIds.length,
                message: `Note: The original filter "${filter}" was invalid. Showing recent incidents instead.`,
            };
        }
        throw err;
    }
}

/**
 * Get detailed information for a specific incident.
 */
async function getIncidentById(incidentId) {
    const resp = await client.post('/incidents/entities/incidents/GET/v1', {
        ids: [incidentId],
    });
    const incidents = resp.data?.resources || [];
    return incidents[0] || null;
}

/**
 * Perform an action on incidents.
 */
async function updateIncident({ ids, status, assignTo, comment } = {}) {
    const actionParams = [];
    if (status !== undefined) actionParams.push({ name: 'update_status', value: String(status) });
    if (assignTo) actionParams.push({ name: 'assigned_to_uuid', value: assignTo });
    if (comment) actionParams.push({ name: 'add_comment', value: comment });

    const resp = await client.post('/incidents/entities/incidents/v1', {
        action_parameters: actionParams,
        ids,
    });
    return resp.data;
}

module.exports = {
    listDetections,
    getDetectionById,
    updateDetectionStatus,
    listIncidents,
    getIncidentById,
    updateIncident,
};
