/**
 * FalconMind — Next-Gen SIEM / Falcon LogScale Service
 *
 * Covers:
 *   - POST /loggingserver/api/v1/dataspaces/-/query-jobs   — submit a log query
 *   - GET  /loggingserver/api/v1/dataspaces/-/query-jobs/{id} — poll job results
 *
 * Translates natural language parameters into LogScale Query Language (LQL)
 * via collaboration with fqlBuilder utility.
 */

'use strict';

const client = require('./client');

/**
 * Execute a LogScale query and return results.
 * @param {object} opts
 * @param {string} opts.queryString    LogScale query string (LQL)
 * @param {number} [opts.startTime]    Start of time range (ms since epoch)
 * @param {number} [opts.endTime]      End of time range (ms since epoch)
 * @param {number} [opts.limit]        Max events to return (default 100)
 */
async function runLogQuery({ queryString, startTime, endTime, limit = 100 }) {
    const now = Date.now();
    const body = {
        query: queryString,
        start: startTime || now - 24 * 60 * 60 * 1000, // last 24h by default
        end: endTime || now,
        limit,
    };

    try {
        const resp = await client.post('/loggingserver/api/v1/dataspaces/-/query-jobs', body);
        const jobId = resp.data?.id;

        if (!jobId) {
            return {
                error: false,
                results: [],
                message: 'Query submitted but no job ID returned. LogScale may not be configured.',
            };
        }

        // Poll for results
        return await pollQueryJob(jobId);
    } catch (err) {
        // LogScale may not be available in all environments
        if (err.status === 404 || err.status === 403) {
            return {
                error: true,
                results: [],
                message: 'Next-Gen SIEM (LogScale) is not available or your API client lacks the required permissions.',
            };
        }
        throw err;
    }
}

/**
 * Poll a LogScale query job for results.
 * @param {string} jobId
 */
async function pollQueryJob(jobId) {
    const maxRetries = 10;
    const delay = 2000;

    for (let i = 0; i < maxRetries; i++) {
        await sleep(delay);

        const resp = await client.get(
            `/loggingserver/api/v1/dataspaces/-/query-jobs/${jobId}`
        );

        const job = resp.data;
        if (job?.done || job?.status === 'completed') {
            return {
                error: false,
                results: job?.events || job?.results || [],
                metaData: job?.metaData || {},
            };
        }
    }

    return {
        error: false,
        results: [],
        message: 'Log query timed out. Try narrowing the time range.',
    };
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = {
    runLogQuery,
};
