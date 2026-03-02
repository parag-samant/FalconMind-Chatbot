/**
 * FalconMind — CrowdStrike Base HTTP Client
 *
 * An Axios instance pre-configured with the CrowdStrike base URL.
 * Uses a request interceptor to inject a fresh Bearer token on every request.
 * Uses a response interceptor to normalize errors into a standard format.
 */

'use strict';

const axios = require('axios');
const config = require('../../config');
const { getValidToken } = require('./auth');

const csClient = axios.create({
    baseURL: config.crowdstrike.baseUrl,
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
    // CrowdStrike expects repeated params like ids=a&ids=b, NOT ids[0]=a&ids[1]=b
    paramsSerializer: {
        serialize: (params) => {
            const parts = [];
            for (const [key, value] of Object.entries(params)) {
                if (Array.isArray(value)) {
                    for (const v of value) {
                        parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(v)}`);
                    }
                } else if (value !== undefined && value !== null) {
                    parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
                }
            }
            return parts.join('&');
        },
    },
});

// ── Request Interceptor — inject Bearer token automatically ─────────────────
csClient.interceptors.request.use(
    async (axiosConfig) => {
        try {
            const token = await getValidToken();
            axiosConfig.headers['Authorization'] = `Bearer ${token}`;
        } catch (err) {
            // Let the error propagate — will be caught by the caller
            return Promise.reject(err);
        }
        return axiosConfig;
    },
    (error) => Promise.reject(error)
);

// ── Response Interceptor — normalize API errors ─────────────────────────────
csClient.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response) {
            const { status, data } = error.response;

            // Extract CrowdStrike error details
            const csErrors = data?.errors;
            const firstError = Array.isArray(csErrors) && csErrors.length > 0
                ? csErrors[0]
                : null;

            const message = firstError?.message || data?.message || `HTTP ${status} error`;
            const code = firstError?.code || status;

            const normalizedError = new Error(message);
            normalizedError.status = status;
            normalizedError.statusCode = status;
            normalizedError.csCode = code;
            normalizedError.csErrors = csErrors;
            normalizedError.originalResponse = data;

            return Promise.reject(normalizedError);
        }

        // Network or timeout error
        if (error.code === 'ECONNABORTED') {
            return Promise.reject(new Error('CrowdStrike API request timed out. Please try again.'));
        }

        return Promise.reject(error);
    }
);

module.exports = csClient;
