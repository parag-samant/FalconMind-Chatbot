/**
 * FalconMind — Response Formatter (v2)
 *
 * Converts raw CrowdStrike API JSON into clean, Markdown-formatted
 * analyst-friendly summaries for display in the chat UI.
 *
 * Updated for Alerts v2 response schema and graceful error message passthrough.
 */

'use strict';

/**
 * Format alerts/detections from the Alerts v2 API.
 */
function formatDetections(result) {
    if (result.message && (!result.detections || result.detections.length === 0) &&
        (!result.results || result.results.length === 0)) {
        return `ℹ️ ${result.message}`;
    }

    const detections = result.detections || result.results || [];
    const total = result.total || detections.length;

    if (detections.length === 0) {
        return '✅ **No detections found** matching your criteria.';
    }

    const rows = detections.map((d) => {
        const severity = d.severity_name || d.max_severity_displayname || 'Unknown';
        const status = d.status || 'unknown';
        const host = d.hostname || d.device?.hostname || d.device?.device_id?.slice(0, 8) || 'N/A';
        const tactic = d.tactic || d.behaviors?.[0]?.tactic || 'N/A';
        const time = (d.last_updated_timestamp || d.created_timestamp || d.timestamp)
            ? new Date(d.last_updated_timestamp || d.created_timestamp || d.timestamp).toLocaleString()
            : 'N/A';
        const id = (d.composite_id || d.detection_id || d.id || '').slice(0, 20);

        return `| ${id}... | **${severity}** | ${status} | ${host} | ${tactic} | ${time} |`;
    });

    return [
        `**${total} alert(s) found** (showing ${detections.length}):`,
        '',
        '| Alert ID | Severity | Status | Host | Tactic | Updated |',
        '|---|---|---|---|---|---|',
        ...rows,
    ].join('\n');
}

/**
 * Format incidents.
 */
function formatIncidents(result) {
    const { incidents = [], total = 0 } = result;
    if (incidents.length === 0) return '✅ **No incidents found** matching your criteria.';

    const rows = incidents.map((inc) => {
        const name = inc.name || inc.incident_id?.slice(0, 20) || 'N/A';
        const status = inc.status || 'N/A';
        const severity = inc.severity_name || 'N/A';
        const hosts = (inc.hosts?.length || 0) + ' host(s)';
        const start = inc.start ? new Date(inc.start).toLocaleString() : 'N/A';
        return `| ${name} | **${severity}** | ${status} | ${hosts} | ${start} |`;
    });

    return [
        `**${total} incident(s) found** (showing ${incidents.length}):`,
        '', '| Name | Severity | Status | Hosts | Started |',
        '|---|---|---|---|---|', ...rows,
    ].join('\n');
}

/**
 * Format hosts.
 */
function formatHosts(result) {
    const { hosts = [], total = 0 } = result;
    if (hosts.length === 0) return '✅ **No hosts found** matching your criteria.';

    const rows = hosts.map((h) => {
        const hostname = h.hostname || 'N/A';
        const platform = h.platform_name || 'N/A';
        const os = h.os_version || 'N/A';
        const status = h.status || 'normal';
        const lastSeen = h.last_seen ? new Date(h.last_seen).toLocaleString() : 'N/A';
        const agentId = (h.device_id || '').slice(0, 12);
        return `| ${hostname} | ${platform} | ${os} | ${status} | ${lastSeen} | \`${agentId}...\` |`;
    });

    return [
        `**${total} host(s) found** (showing ${hosts.length}):`,
        '', '| Hostname | Platform | OS | Status | Last Seen | Agent ID |',
        '|---|---|---|---|---|---|', ...rows,
    ].join('\n');
}

/**
 * Format behaviors (TTPs).
 */
function formatBehaviors(result) {
    if (result.message && (!result.behaviors || result.behaviors.length === 0)) {
        return `ℹ️ ${result.message}`;
    }

    const { behaviors = [], total = 0 } = result;
    if (behaviors.length === 0) return '✅ **No matching behaviors found.**';

    const rows = behaviors.map((b) => {
        const tactic = b.tactic || 'N/A';
        const technique = b.technique || 'N/A';
        const host = b.device_id?.slice(0, 12) || 'N/A';
        const time = b.timestamp ? new Date(b.timestamp).toLocaleString() : 'N/A';
        return `| ${tactic} | ${technique} | \`${host}...\` | ${time} |`;
    });

    return [
        `**${total} behavior(s) found** (showing ${behaviors.length}):`,
        '', '| Tactic | Technique | Device | Time |',
        '|---|---|---|---|', ...rows,
    ].join('\n');
}

/**
 * Format vulnerability posture.
 */
function formatVulnerabilityPosture(result) {
    const { critical = 0, high = 0, medium = 0, low = 0 } = result;
    const total = critical + high + medium + low;

    return [
        '## 🛡️ Vulnerability Posture Summary', '',
        '| Severity | Count |', '|---|---|',
        `| 🔴 **Critical** | ${critical} |`,
        `| 🟠 **High** | ${high} |`,
        `| 🟡 **Medium** | ${medium} |`,
        `| 🟢 **Low** | ${low} |`,
        `| **Total Open** | **${total}** |`, '',
        critical > 0
            ? `⚠️ **${critical} critical vulnerabilities** require immediate attention.`
            : '✅ No critical vulnerabilities detected.',
    ].join('\n');
}

/**
 * Format vulnerabilities.
 */
function formatVulnerabilities(result) {
    const { vulnerabilities = [], total = 0 } = result;
    if (vulnerabilities.length === 0) return '✅ **No vulnerabilities found** matching your criteria.';

    const rows = vulnerabilities.map((v) => {
        const cveId = v.cve?.id || 'N/A';
        const severity = v.cve?.severity || 'N/A';
        const host = v.host_info?.hostname || v.aid?.slice(0, 8) || 'N/A';
        const status = v.status || 'open';
        const cvss = v.cve?.base_score || 'N/A';
        return `| ${cveId} | **${severity}** | ${cvss} | ${host} | ${status} |`;
    });

    return [
        `**${total} vulnerability/ies found** (showing ${vulnerabilities.length}):`,
        '', '| CVE ID | Severity | CVSS | Host | Status |',
        '|---|---|---|---|---|', ...rows,
    ].join('\n');
}

/**
 * Format IOCs.
 */
function formatIOCs(result) {
    const { iocs = [], total = 0 } = result;
    if (iocs.length === 0) return '✅ **No custom IOCs found** matching your criteria.';

    const rows = iocs.map((ioc) => {
        const type = ioc.type || 'N/A';
        const value = (ioc.value || '').slice(0, 40);
        const action = ioc.action || 'N/A';
        const severity = ioc.severity || 'N/A';
        const created = ioc.created_on ? new Date(ioc.created_on).toLocaleDateString() : 'N/A';
        return `| \`${value}\` | ${type} | **${action}** | ${severity} | ${created} |`;
    });

    return [
        `**${total} custom IOC(s) found** (showing ${iocs.length}):`,
        '', '| Value | Type | Action | Severity | Created |',
        '|---|---|---|---|---|', ...rows,
    ].join('\n');
}

/**
 * Format sensor health.
 */
function formatSensorHealth(result) {
    const { totalHosts = 0, containedHosts = 0 } = result;
    const coverage = totalHosts > 0 ? ((totalHosts - containedHosts) / totalHosts * 100).toFixed(1) : 0;

    return [
        '## 🔬 Sensor Health Summary', '',
        '| Metric | Value |', '|---|---|',
        `| **Total Managed Hosts** | ${totalHosts} |`,
        `| **Currently Contained** | ${containedHosts} |`,
        `| **Active Coverage** | ${coverage}% |`,
    ].join('\n');
}

/**
 * Format RTR result.
 */
function formatRTRResult(result) {
    if (!result.complete) {
        return `⏱️ **RTR Command Timed Out**\n\n${result.stderr || 'No output received.'}`;
    }
    const lines = [];
    if (result.stdout) { lines.push('**Command Output:**', '```', result.stdout.slice(0, 3000), '```'); }
    if (result.stderr) { lines.push('**⚠️ Errors:**', '```', result.stderr, '```'); }
    return lines.length === 0 ? '✅ **Command executed successfully.** No output.' : lines.join('\n');
}

/**
 * Generic fallback formatter.
 */
function formatGeneric(result, maxLength = 3000) {
    const json = JSON.stringify(result, null, 2);
    const truncated = json.slice(0, maxLength);
    return ['```json', truncated, json.length > maxLength ? '... (truncated)' : '', '```'].filter(Boolean).join('\n');
}

/**
 * Format a single detection/alert detail.
 */
function formatDetectionDetail(result) {
    if (!result) return '⚠️ No detection details found.';

    const d = result;
    const severity = d.severity_name || d.max_severity_displayname || 'Unknown';
    const status = d.status || 'unknown';
    const host = d.hostname || d.device?.hostname || 'N/A';
    const tactic = d.tactic || d.behaviors?.[0]?.tactic || 'N/A';
    const technique = d.technique || d.behaviors?.[0]?.technique || 'N/A';
    const time = (d.last_updated_timestamp || d.created_timestamp)
        ? new Date(d.last_updated_timestamp || d.created_timestamp).toLocaleString()
        : 'N/A';
    const id = d.composite_id || d.detection_id || d.id || 'N/A';
    const description = d.description || d.behaviors?.[0]?.description || 'No description available';

    return [
        `## 🛡️ Detection Detail`,
        '',
        '| Field | Value |',
        '|---|---|',
        `| **Alert ID** | \`${id}\` |`,
        `| **Severity** | **${severity}** |`,
        `| **Status** | ${status} |`,
        `| **Hostname** | ${host} |`,
        `| **Tactic** | ${tactic} |`,
        `| **Technique** | ${technique} |`,
        `| **Last Updated** | ${time} |`,
        '',
        `**Description:** ${description}`,
    ].join('\n');
}

/**
 * Format a single host detail.
 */
function formatHostDetail(result) {
    if (!result) return '⚠️ No host details found.';

    const h = result;
    const hostname = h.hostname || 'N/A';
    const platform = h.platform_name || 'N/A';
    const os = h.os_version || 'N/A';
    const status = h.status || 'normal';
    const lastSeen = h.last_seen ? new Date(h.last_seen).toLocaleString() : 'N/A';
    const localIp = h.local_ip || 'N/A';
    const externalIp = h.external_ip || 'N/A';
    const agentVersion = h.agent_version || 'N/A';
    const deviceId = h.device_id || 'N/A';
    const macAddress = h.mac_address || 'N/A';
    const domain = h.machine_domain || 'N/A';

    return [
        `## 💻 Host Detail: ${hostname}`,
        '',
        '| Field | Value |',
        '|---|---|',
        `| **Hostname** | ${hostname} |`,
        `| **Platform** | ${platform} |`,
        `| **OS** | ${os} |`,
        `| **Status** | ${status} |`,
        `| **Last Seen** | ${lastSeen} |`,
        `| **Local IP** | \`${localIp}\` |`,
        `| **External IP** | \`${externalIp}\` |`,
        `| **MAC** | \`${macAddress}\` |`,
        `| **Agent Version** | ${agentVersion} |`,
        `| **Domain** | ${domain} |`,
        `| **Device ID** | \`${deviceId}\` |`,
    ].join('\n');
}

/**
 * Main dispatch — checks for graceful error passthrough first.
 */
function format(functionName, result) {
    if (!result) return '⚠️ No data returned from the API.';

    // Graceful error passthrough
    if (result.error && result.message) return result.message;

    // Message-only passthrough (no data keys present)
    if (result.message && !result.detections && !result.results && !result.incidents &&
        !result.hosts && !result.behaviors && !result.vulnerabilities && !result.iocs &&
        !result.workflows && !result.alerts && !result.rules) {
        return `ℹ️ ${result.message}`;
    }

    try {
        switch (functionName) {
            case 'list_detections':
            case 'hunt_by_hash':
            case 'hunt_by_ioc':
                return formatDetections(result);
            case 'get_detection_detail':
                return formatDetectionDetail(result);
            case 'list_incidents':
            case 'get_incident_detail':
                return formatIncidents(result);
            case 'list_hosts':
                return formatHosts(result);
            case 'get_host_detail':
                return formatHostDetail(result);
            case 'search_behaviors':
                return formatBehaviors(result);
            case 'get_vulnerability_posture':
                return formatVulnerabilityPosture(result);
            case 'list_vulnerabilities':
            case 'search_by_cve':
                return formatVulnerabilities(result);
            case 'list_custom_iocs':
                return formatIOCs(result);
            case 'get_sensor_health':
                return formatSensorHealth(result);
            case 'rtr_run_command':
                return formatRTRResult(result);
            default:
                return formatGeneric(result);
        }
    } catch (err) {
        console.error('[Formatter] Error formatting result:', err.message);
        return formatGeneric(result);
    }
}

module.exports = { format };
