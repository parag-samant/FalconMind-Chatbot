/**
 * FalconMind — Host & Device Management Service
 *
 * Covers:
 *   - GET  /devices/queries/devices/v1              — query host AIDs
 *   - GET  /devices/entities/devices/v2             — get device details
 *   - POST /devices/entities/devices-actions/v2     — contain, lift, hide hosts
 *   - GET  /devices/queries/devices-scroll/v1       — paginated host query
 */

'use strict';

const client = require('./client');

/**
 * List hosts with optional FQL filter.
 * @param {object} opts
 * @param {string} [opts.filter]    FQL filter (e.g., "platform_name:'Windows'")
 * @param {number} [opts.limit]     Max results (default 20)
 * @param {string} [opts.sort]      Sort field
 */
async function listHosts({ filter = '', limit = 20, sort = 'last_seen|desc' } = {}) {
    const params = { limit, sort };
    if (filter) params.filter = filter;

    const idsResp = await client.get('/devices/queries/devices/v1', { params });
    const ids = idsResp.data?.resources || [];

    if (ids.length === 0) {
        return { hosts: [], total: 0 };
    }

    const detailsResp = await client.get('/devices/entities/devices/v2', {
        params: { ids },
    });
    const hosts = detailsResp.data?.resources || [];

    return { hosts, total: ids.length };
}

/**
 * Get detailed info for a specific host by its Agent ID (AID) or hostname.
 * @param {string} hostId   Agent ID (AID)
 */
async function getHostById(hostId) {
    const resp = await client.get('/devices/entities/devices/v2', {
        params: { ids: [hostId] },
    });
    const hosts = resp.data?.resources || [];
    return hosts[0] || null;
}

/**
 * Perform an action on one or more hosts.
 * @param {string[]} deviceIds   Array of Agent IDs
 * @param {string}   action      'contain' | 'lift_containment' | 'hide_host' | 'unhide_host'
 */
async function performHostAction({ deviceIds, action }) {
    const resp = await client.post(`/devices/entities/devices-actions/v2?action_name=${action}`, {
        ids: deviceIds,
    });
    return resp.data;
}

/**
 * Network contain a host (isolate from network).
 * @param {string} deviceId
 */
async function containHost(deviceId) {
    return performHostAction({ deviceIds: [deviceId], action: 'contain' });
}

/**
 * Lift network containment on a host.
 * @param {string} deviceId
 */
async function liftContainment(deviceId) {
    return performHostAction({ deviceIds: [deviceId], action: 'lift_containment' });
}

/**
 * Hide a host from the Falcon console.
 * @param {string} deviceId
 */
async function hideHost(deviceId) {
    return performHostAction({ deviceIds: [deviceId], action: 'hide_host' });
}

/**
 * Unhide a host.
 * @param {string} deviceId
 */
async function unhideHost(deviceId) {
    return performHostAction({ deviceIds: [deviceId], action: 'unhide_host' });
}

/**
 * Get sensor health / coverage summary.
 * Returns count of hosts by status.
 */
async function getSensorHealth() {
    // Get all host IDs sorted
    const resp = await client.get('/devices/queries/devices/v1', {
        params: { limit: 1, filter: '' },
    });
    const totalHosts = resp.data?.meta?.pagination?.total || 0;

    // Get contained hosts
    const containedResp = await client.get('/devices/queries/devices/v1', {
        params: { limit: 1, filter: "status:'containment_pending',status:'contained'" },
    });
    const containedCount = containedResp.data?.meta?.pagination?.total || 0;

    return { totalHosts, containedHosts: containedCount };
}

module.exports = {
    listHosts,
    getHostById,
    containHost,
    liftContainment,
    hideHost,
    unhideHost,
    getSensorHealth,
    performHostAction,
};
