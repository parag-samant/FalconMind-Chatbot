/**
 * FalconMind — Intent Router
 *
 * Maps OpenAI function call names to the correct CrowdStrike service module methods.
 * This is the central dispatch table for all AI-initiated API calls.
 */

'use strict';

const detections = require('../services/crowdstrike/detections');
const hosts = require('../services/crowdstrike/hosts');
const intel = require('../services/crowdstrike/intel');
const spotlight = require('../services/crowdstrike/spotlight');
const rtr = require('../services/crowdstrike/rtr');
const iocs = require('../services/crowdstrike/iocs');
const identity = require('../services/crowdstrike/identity');
const firewall = require('../services/crowdstrike/firewall');
const discover = require('../services/crowdstrike/discover');
const recon = require('../services/crowdstrike/recon');
const siem = require('../services/crowdstrike/siem');
const soar = require('../services/crowdstrike/soar');
const threatHunting = require('../services/crowdstrike/threatHunting');

/**
 * Route a function call to the correct service method.
 * @param {string} functionName   The OpenAI function name
 * @param {object} args           Parsed function arguments
 * @returns {Promise<object>}     The API result
 */
async function routeIntent(functionName, args) {
    switch (functionName) {
        // ── Detections & Incidents ──────────────────────────────────────────
        case 'list_detections':
            console.log('[DEBUG routeIntent] list_detections args:', JSON.stringify(args));
            return detections.listDetections({
                filter: args.filter,
                limit: args.limit,
            });

        case 'get_detection_detail':
            return detections.getDetectionById(args.detection_id);

        case 'update_detection_status':
            return detections.updateDetectionStatus({
                ids: args.detection_ids,
                status: args.status,
                assignTo: args.assign_to,
                comment: args.comment,
            });

        case 'list_incidents':
            return detections.listIncidents({
                filter: args.filter,
                limit: args.limit,
            });

        case 'get_incident_detail':
            return detections.getIncidentById(args.incident_id);

        // ── Threat Hunting ──────────────────────────────────────────────────
        case 'hunt_by_hash':
            return threatHunting.huntByHash({
                hash: args.hash,
                days: args.days,
            });

        case 'hunt_by_ioc':
            return threatHunting.huntByIOC({
                ioc: args.ioc,
                days: args.days,
            });

        case 'search_behaviors':
            return threatHunting.searchBehaviors({
                filter: args.filter,
                limit: args.limit,
            });

        // ── Threat Intelligence ─────────────────────────────────────────────
        case 'search_threat_actors':
            return intel.searchActors({
                query: args.query,
                limit: args.limit,
            });

        case 'search_intel_reports':
            return intel.searchReports({
                query: args.query,
                limit: args.limit,
            });

        case 'lookup_intel_indicator':
            return intel.searchIntelIndicators({
                query: args.indicator,
                limit: 5,
            });

        // ── Host Management ─────────────────────────────────────────────────
        case 'list_hosts':
            return hosts.listHosts({
                filter: args.filter,
                limit: args.limit,
            });

        case 'get_host_detail':
            return hosts.getHostById(args.host_id);

        case 'contain_host':
            return hosts.containHost(args.device_id);

        case 'lift_containment':
            return hosts.liftContainment(args.device_id);

        case 'get_sensor_health':
            return hosts.getSensorHealth();

        // ── Vulnerabilities ─────────────────────────────────────────────────
        case 'list_vulnerabilities':
            return spotlight.listVulnerabilities({
                filter: args.filter,
                limit: args.limit,
            });

        case 'search_by_cve':
            return spotlight.searchByCVE(args.cve_id);

        case 'get_vulnerability_posture':
            return spotlight.getVulnerabilityPosture();

        // ── Real-Time Response ──────────────────────────────────────────────
        case 'rtr_run_command': {
            const session = await rtr.initSession(args.device_id);
            const result = await rtr.runCommand({
                sessionId: session.session_id,
                baseCommand: args.base_command,
                commandString: args.command_string,
            });
            await rtr.closeSession(session.session_id).catch(() => { }); // Best-effort close
            return result;
        }

        // ── Custom IOCs ─────────────────────────────────────────────────────
        case 'list_custom_iocs':
            return iocs.listIOCs({
                filter: args.filter,
                limit: args.limit,
            });

        case 'create_ioc':
            return iocs.createIOC({
                type: args.type,
                value: args.value,
                action: args.action,
                severity: args.severity,
                description: args.description,
            });

        case 'delete_ioc':
            return iocs.deleteIOCs(args.ioc_ids);

        // ── Identity Protection ─────────────────────────────────────────────
        case 'list_identity_detections':
            return identity.listIdentityDetections({
                filter: args.filter,
                limit: args.limit,
            });

        // ── Firewall ────────────────────────────────────────────────────────
        case 'list_firewall_policies':
            return firewall.listFirewallPolicies({
                limit: args.limit,
            });

        case 'list_firewall_events':
            return firewall.listFirewallEvents({
                filter: args.filter,
                limit: args.limit,
            });

        // ── Discover / EASM ─────────────────────────────────────────────────
        case 'list_discovered_hosts':
            return discover.listDiscoveredHosts({
                filter: args.filter,
                limit: args.limit,
            });

        case 'list_unmanaged_assets':
            return discover.listUnmanagedAssets(args.limit);

        // ── Recon ───────────────────────────────────────────────────────────
        case 'list_recon_alerts':
            return recon.listReconAlerts({
                filter: args.filter,
                limit: args.limit,
            });

        case 'list_monitoring_rules':
            return recon.listMonitoringRules({
                limit: args.limit,
            });

        // ── SIEM ────────────────────────────────────────────────────────────
        case 'run_log_query': {
            const now = Date.now();
            const hoursBack = args.hours_back || 24;
            return siem.runLogQuery({
                queryString: args.query_string,
                startTime: now - hoursBack * 3600000,
                endTime: now,
                limit: args.limit,
            });
        }

        // ── SOAR ────────────────────────────────────────────────────────────
        case 'list_workflows':
            return soar.listWorkflows({ limit: args.limit });

        case 'trigger_workflow':
            return soar.triggerWorkflow({
                workflowId: args.workflow_id,
                payload: args.payload,
            });

        default:
            throw new Error(`Unknown function: "${functionName}". This function is not implemented.`);
    }
}

module.exports = { routeIntent };
