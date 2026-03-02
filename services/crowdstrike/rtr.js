/**
 * FalconMind — Real-Time Response (RTR) Service
 *
 * Covers:
 *   - POST /real-time-response/entities/sessions/v1              — init session
 *   - DELETE /real-time-response/entities/sessions/v1            — close session
 *   - POST /real-time-response/entities/command/v1               — run read-only command
 *   - POST /real-time-response/entities/admin-command/v1         — run admin command
 *   - GET  /real-time-response/entities/command/v1               — get command status
 *
 * SECURITY: All RTR execute operations require explicit user confirmation
 *           before being called. This is enforced at the route level.
 */

'use strict';

const client = require('./client');

/**
 * Initialize an RTR session with a host.
 * @param {string} deviceId   Agent ID of the target host
 * @returns {object}  Session object containing session_id
 */
async function initSession(deviceId) {
    const resp = await client.post('/real-time-response/entities/sessions/v1', {
        device_id: deviceId,
        origin: 'FalconMind',
        queue_offline: false,
    });

    const session = resp.data?.resources?.[0];
    if (!session) {
        throw new Error('Failed to initialize RTR session — no session returned by API');
    }
    return session;
}

/**
 * Close an RTR session.
 * @param {string} sessionId
 */
async function closeSession(sessionId) {
    await client.delete('/real-time-response/entities/sessions/v1', {
        params: { session_id: sessionId },
    });
    return { closed: true, sessionId };
}

/**
 * Run a read-only RTR command (ls, ps, netstat, reg query, etc.)
 * Does NOT require admin privileges.
 * @param {string} sessionId
 * @param {string} baseCommand    e.g., 'ls', 'ps', 'netstat', 'reg query'
 * @param {string} commandString  Full command including arguments e.g., 'ls C:\\'
 */
async function runCommand({ sessionId, baseCommand, commandString }) {
    const resp = await client.post('/real-time-response/entities/command/v1', {
        session_id: sessionId,
        base_command: baseCommand,
        command_string: commandString,
    });

    const cloudRequestId = resp.data?.resources?.[0]?.cloud_request_id;
    if (!cloudRequestId) {
        throw new Error('RTR command submission did not return a cloud_request_id');
    }

    // Poll for result (simple polling with 3 retries)
    return pollCommandResult(cloudRequestId, sessionId, 'command');
}

/**
 * Run an admin RTR command (run, runscript, put, etc.)
 * Requires rtr-admin:write scope.
 * @param {string} sessionId
 * @param {string} baseCommand
 * @param {string} commandString
 */
async function runAdminCommand({ sessionId, baseCommand, commandString }) {
    const resp = await client.post('/real-time-response/entities/admin-command/v1', {
        session_id: sessionId,
        base_command: baseCommand,
        command_string: commandString,
    });

    const cloudRequestId = resp.data?.resources?.[0]?.cloud_request_id;
    if (!cloudRequestId) {
        throw new Error('RTR admin command submission did not return a cloud_request_id');
    }

    return pollCommandResult(cloudRequestId, sessionId, 'admin-command');
}

/**
 * Poll for RTR command result with retries.
 * @param {string} cloudRequestId
 * @param {string} sessionId
 * @param {string} commandType   'command' or 'admin-command'
 */
async function pollCommandResult(cloudRequestId, sessionId, commandType = 'command') {
    const endpoint = `/real-time-response/entities/${commandType}/v1`;
    const maxRetries = 6;
    const delay = 3000; // 3 seconds between polls

    for (let i = 0; i < maxRetries; i++) {
        await sleep(delay);

        const resp = await client.get(endpoint, {
            params: { cloud_request_id: cloudRequestId, sequence_id: 0 },
        });

        const result = resp.data?.resources?.[0];
        if (result) {
            if (result.complete) {
                return {
                    complete: true,
                    stdout: result.stdout || '',
                    stderr: result.stderr || '',
                    errors: result.errors || [],
                    cloudRequestId,
                };
            }
        }
    }

    return {
        complete: false,
        stdout: '',
        stderr: 'Command timed out waiting for result.',
        cloudRequestId,
    };
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = {
    initSession,
    closeSession,
    runCommand,
    runAdminCommand,
};
