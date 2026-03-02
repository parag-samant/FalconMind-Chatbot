/**
 * FalconMind — CrowdStrike OAuth2 Token Manager
 *
 * Handles token acquisition, in-memory caching, and automatic refresh.
 * This is the core of transparent authentication for all CrowdStrike API calls.
 *
 * Flow:
 *   1. First call to getValidToken() acquires a new token via POST /oauth2/token
 *   2. Token is cached in memory with its expiry time
 *   3. Subsequent calls check if token is still valid (with 60s buffer)
 *   4. If expired, a new token is acquired automatically
 *   5. The token is NEVER sent to the browser or logged
 */

'use strict';

const axios = require('axios');
const config = require('../../config');

// In-memory token cache — lives only for the duration of the process
let tokenCache = {
    accessToken: null,
    expiresAt: 0, // Unix timestamp in ms
};

/**
 * Checks if the cached token is still valid with a 60-second safety buffer.
 * @returns {boolean}
 */
function isTokenValid() {
    return tokenCache.accessToken !== null && Date.now() < tokenCache.expiresAt - 60000;
}

/**
 * Fetches a fresh OAuth2 token from CrowdStrike using client credentials.
 * @returns {Promise<string>} The access token
 * @throws {Error} If token acquisition fails
 */
async function refreshToken() {
    const url = `${config.crowdstrike.baseUrl}/oauth2/token`;

    try {
        const response = await axios.post(url, null, {
            params: {
                client_id: config.crowdstrike.clientId,
                client_secret: config.crowdstrike.clientSecret,
            },
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
        });

        const { access_token, expires_in } = response.data;

        if (!access_token) {
            throw new Error('CrowdStrike returned an empty access token');
        }

        tokenCache = {
            accessToken: access_token,
            expiresAt: Date.now() + expires_in * 1000,
        };

        console.log(`[Auth] CrowdStrike token refreshed. Valid for ${expires_in}s.`);
        return tokenCache.accessToken;
    } catch (err) {
        const status = err.response?.status;
        const detail = err.response?.data?.errors?.[0]?.message || err.message;

        if (status === 401) {
            throw new Error(`CrowdStrike authentication failed: Invalid Client ID or Client Secret. ${detail}`);
        }
        throw new Error(`Failed to obtain CrowdStrike access token: ${detail || err.message}`);
    }
}

/**
 * Returns a valid access token, refreshing if necessary.
 * This is the main function used by the API client.
 * @returns {Promise<string>} A fresh access token
 */
async function getValidToken() {
    if (!isTokenValid()) {
        return await refreshToken();
    }
    return tokenCache.accessToken;
}

/**
 * Returns the token status for health-check endpoints.
 * @returns {{ authenticated: boolean, expiresIn: number|null }}
 */
function getTokenStatus() {
    if (!isTokenValid()) {
        return { authenticated: false, expiresIn: null };
    }
    const expiresIn = Math.floor((tokenCache.expiresAt - Date.now()) / 1000);
    return { authenticated: true, expiresIn };
}

/**
 * Invalidates the token cache (useful for testing or forced re-auth).
 */
function invalidateToken() {
    tokenCache = { accessToken: null, expiresAt: 0 };
}

module.exports = { getValidToken, getTokenStatus, invalidateToken };
