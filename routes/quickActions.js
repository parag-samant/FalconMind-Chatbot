/**
 * FalconMind — Quick Actions Route
 *
 * GET /api/quick-actions
 * Returns predefined quick action buttons for the UI.
 * These allow new users to get started without knowing any commands.
 */

'use strict';

const express = require('express');
const router = express.Router();

const QUICK_ACTIONS = [
    {
        id: 'list-open-detections',
        label: '🚨 Open Detections',
        description: 'List all new and in-progress detections',
        message: 'Show me all open detections from the last 24 hours, sorted by severity',
        category: 'detections',
    },
    {
        id: 'active-incidents',
        label: '🔥 Active Incidents',
        description: 'View all active security incidents',
        message: 'List all active incidents currently in progress',
        category: 'detections',
    },
    {
        id: 'critical-vulnerabilities',
        label: '⚠️ Critical CVEs',
        description: 'Check for critical vulnerabilities',
        message: 'Show me all critical severity vulnerabilities in the environment',
        category: 'vulnerabilities',
    },
    {
        id: 'vulnerability-posture',
        label: '📊 Vuln Posture',
        description: 'Get vulnerability posture overview',
        message: 'Give me an overall summary of our vulnerability posture by severity',
        category: 'vulnerabilities',
    },
    {
        id: 'sensor-health',
        label: '💚 Sensor Health',
        description: 'Check Falcon sensor coverage',
        message: 'Check our current sensor health and host coverage',
        category: 'hosts',
    },
    {
        id: 'contained-hosts',
        label: '🔒 Contained Hosts',
        description: 'List network contained hosts',
        message: 'Show me all hosts that are currently network contained',
        category: 'hosts',
    },
    {
        id: 'high-detections',
        label: '🔴 High Detections',
        description: 'Show high severity detections',
        message: 'List all high and critical severity detections that are still new or in progress',
        category: 'detections',
    },
    {
        id: 'identity-risks',
        label: '👤 Identity Risks',
        description: 'Check for identity-based detections',
        message: 'Show me the latest identity protection detections — risky logins or compromised accounts',
        category: 'identity',
    },
    {
        id: 'recon-alerts',
        label: '🌐 Recon Alerts',
        description: 'Check digital risk monitoring alerts',
        message: 'Show me the latest Falcon Recon alerts — leaked credentials or brand exposure',
        category: 'recon',
    },
    {
        id: 'custom-iocs',
        label: '🎯 Custom IOCs',
        description: 'List active custom IOCs',
        message: 'List all active custom IOCs (hashes, IPs, domains) configured in the environment',
        category: 'iocs',
    },
];

router.get('/', (req, res) => {
    res.json({ quickActions: QUICK_ACTIONS });
});

module.exports = router;
