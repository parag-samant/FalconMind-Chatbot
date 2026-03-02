/**
 * FalconMind — Shared Summarization Prompt Builder
 *
 * Centralizes the domain-specific summarization prompt used by all AI providers.
 * Previously duplicated across openai/chat.js, gemini/chat.js, and groq/chat.js.
 *
 * Categorizes CrowdStrike function results and provides analysis guidance
 * so the AI generates actionable, security-context-aware summaries.
 */

'use strict';

/**
 * Build a security-context-aware summarization prompt based on the function type.
 * @param {string} functionName   The CrowdStrike API function that was called
 * @param {object} result         Raw API response data
 * @param {string} originalQuery  The user's original natural language query
 * @returns {string}              Prompt text for the AI to summarize the results
 */
function buildSummarizationPrompt(functionName, result, originalQuery) {
    const resultJson = JSON.stringify(result, null, 2).slice(0, 4000);

    // Categorize the function to provide domain-specific analysis guidance
    const detectionFunctions = ['list_detections', 'get_detection_detail', 'list_incidents', 'get_incident_detail', 'list_identity_detections'];
    const huntingFunctions = ['hunt_by_hash', 'hunt_by_ioc', 'search_behaviors'];
    const intelFunctions = ['search_threat_actors', 'search_intel_reports', 'lookup_intel_indicator'];
    const hostFunctions = ['list_hosts', 'get_host_detail', 'get_sensor_health'];
    const vulnFunctions = ['list_vulnerabilities', 'search_by_cve', 'get_vulnerability_posture'];
    const iocFunctions = ['list_custom_iocs', 'create_ioc', 'delete_ioc'];

    let analysisGuidance = '';

    if (detectionFunctions.includes(functionName)) {
        analysisGuidance = `
ANALYSIS FOCUS — Detections/Incidents:
- Use severity emoji: 🔴 Critical, 🟠 High, 🟡 Medium, 🟢 Low
- Sort and highlight Critical/High items FIRST with urgency
- Note MITRE ATT&CK tactics/techniques if present
- Identify patterns: same host with multiple alerts, same tactic across hosts, time clustering
- ALWAYS suggest specific next steps:
  • For Critical/High: "I recommend getting full details and investigating the affected host"
  • "You can hunt for this IOC across your environment using hunt_by_hash or hunt_by_ioc"
  • "Check Falcon Intel for threat actor attribution on any hashes found"
  • If lateral movement detected: "I recommend scoping the environment for additional compromised hosts"`;
    } else if (huntingFunctions.includes(functionName)) {
        analysisGuidance = `
ANALYSIS FOCUS — Threat Hunting:
- If hits found: Clearly state the RISK LEVEL and blast radius (how many hosts, which segments)
- List affected hostnames and device IDs for easy follow-up
- Suggest immediate actions: "I recommend checking Falcon Intel for attribution" or "Consider creating a prevent IOC"
- If no hits: Reassure but suggest broadening the search (increase days, try alternate IOC formats)
- Cross-reference: "You may want to also check for related network IOCs or behaviors"`;
    } else if (intelFunctions.includes(functionName)) {
        analysisGuidance = `
ANALYSIS FOCUS — Threat Intelligence:
- Highlight the threat actor name, motivation, and known target industries
- List associated TTPs (MITRE ATT&CK) and known malware families
- If IOC intel found: state confidence level and whether it's actively used in campaigns
- Suggest hunting: "You should hunt for these IOCs across your environment" with specific function names
- If actor is nation-state or financially motivated: note risk implications`;
    } else if (hostFunctions.includes(functionName)) {
        analysisGuidance = `
ANALYSIS FOCUS — Host/Endpoint:
- Highlight containment status, last seen time, platform, and sensor version
- Flag stale hosts (not seen recently) or hosts with outdated sensor versions
- If host is contained: note it and ask if analyst wants to lift containment
- Suggest: "You can check for detections on this host" or "Run RTR for live investigation"`;
    } else if (vulnFunctions.includes(functionName)) {
        analysisGuidance = `
ANALYSIS FOCUS — Vulnerabilities:
- Lead with the severity breakdown: how many Critical vs High vs Medium vs Low
- Flag any CVEs that are known to be actively exploited
- Suggest remediation priority: Critical first, then High
- Recommend: "You can search for specific CVEs to find affected hosts"`;
    } else if (iocFunctions.includes(functionName)) {
        analysisGuidance = `
ANALYSIS FOCUS — IOC Management:
- Confirm the action taken (created, listed, or deleted)
- For new IOCs: state the action (detect/prevent) and scope (global, all platforms)
- Suggest: "You can verify this IOC is working by hunting for it across the environment"`;
    } else {
        analysisGuidance = `
ANALYSIS FOCUS — General:
- Summarize the key findings clearly
- Highlight anything unusual or requiring attention
- Suggest logical next steps the analyst can take`;
    }

    return `The user asked: "${originalQuery}"

I called the **${functionName}** function and got this result:
\`\`\`json
${resultJson}
\`\`\`

You are a senior security analyst interpreting CrowdStrike Falcon API results. Provide a concise, actionable Markdown summary following these rules:

1. Lead with the most important/critical findings
2. Use tables for structured data (3+ items)
3. Highlight severity with emoji indicators (🔴🟠🟡🟢)
4. End with 1-3 specific recommended next actions, naming the exact function/capability to use
5. Keep it concise — analysts need answers fast, not walls of text
${analysisGuidance}`;
}

module.exports = { buildSummarizationPrompt };
