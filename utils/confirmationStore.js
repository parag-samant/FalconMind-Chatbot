/**
 * FalconMind — Confirmation Store
 *
 * An in-memory store for pending destructive actions that require user confirmation.
 * Each pending action has a TTL after which it is automatically discarded.
 * Actions are stored by a UUID confirmation ID that is sent to the browser.
 */

'use strict';

const { v4: uuidv4 } = require('uuid');
const config = require('../config');

// Map of confirmationId -> { action, args, createdAt, functionName, humanDescription }
const pendingConfirmations = new Map();

// Run cleanup every 60 seconds
setInterval(() => {
    const now = Date.now();
    for (const [id, entry] of pendingConfirmations.entries()) {
        if (now - entry.createdAt > config.confirmationTtlMs) {
            pendingConfirmations.delete(id);
        }
    }
}, 60000);

/**
 * Store a pending destructive action awaiting user confirmation.
 * @param {object} opts
 * @param {string} opts.functionName   The function to call if confirmed
 * @param {object} opts.args           Function arguments
 * @param {string} opts.humanDescription  Plain English description of what will happen
 * @returns {string}  The confirmation ID to send to the browser
 */
function storePending({ functionName, args, humanDescription }) {
    const confirmationId = uuidv4();

    pendingConfirmations.set(confirmationId, {
        functionName,
        args,
        humanDescription,
        createdAt: Date.now(),
    });

    return confirmationId;
}

/**
 * Retrieve and remove a pending confirmation by ID.
 * Returns null if not found or expired.
 * @param {string} confirmationId
 * @returns {object|null}
 */
function consumePending(confirmationId) {
    const entry = pendingConfirmations.get(confirmationId);
    if (!entry) return null;

    // Check TTL
    if (Date.now() - entry.createdAt > config.confirmationTtlMs) {
        pendingConfirmations.delete(confirmationId);
        return null;
    }

    pendingConfirmations.delete(confirmationId);
    return entry;
}

/**
 * Discard a pending confirmation (user declined).
 * @param {string} confirmationId
 */
function discardPending(confirmationId) {
    pendingConfirmations.delete(confirmationId);
}

module.exports = { storePending, consumePending, discardPending };
