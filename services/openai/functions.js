/**
 * FalconMind — OpenAI Function Definitions
 *
 * Defines all CrowdStrike operations as OpenAI function calling tools.
 * OpenAI uses these definitions to extract structured intent from natural language.
 *
 * DESTRUCTIVE operations are marked with `is_destructive: true` in their
 * descriptions — the backend checks this flag to require user confirmation.
 */

'use strict';

const FUNCTIONS = [
    // ── Detections & Incidents ───────────────────────────────────────────────

    {
        name: 'list_detections',
        description: 'List and filter CrowdStrike alerts/detections. Use when analyst asks about alerts, detections, threats, events, or open issues. Can filter by severity, status, host, tactic, or time range. IMPORTANT: If the user asks for ALL detections, recent alerts, or detections in the last N days — call this function WITHOUT a filter (leave filter empty) to get the most recent results. Only use a filter when the user explicitly wants a specific severity, status, or hostname.',
        parameters: {
            type: 'object',
            properties: {
                filter: {
                    type: 'string',
                    description: 'FQL filter string. Leave EMPTY to get all recent detections (sorted by last_updated_timestamp). Valid fields: status (new/in_progress/true_positive/false_positive/closed), severity_name (Critical/High/Medium/Low/Informational), hostname, tactic, technique, product, type. Use + for AND, comma for OR. Examples: "severity_name:\'Critical\'" or "status:\'new\'+severity_name:\'High\'" or "(severity_name:\'Critical\',severity_name:\'High\')" or "hostname:\'WORKSTATION01\'". For time filters use last_updated_timestamp with ISO 8601: "last_updated_timestamp:>=\'2026-02-25T00:00:00Z\'". NEVER use relative time like "now-1d" — always compute the ISO 8601 date from the current date.',
                },
                limit: {
                    type: 'integer',
                    description: 'Maximum number of detections to return. Default 20. Use higher values (50-100) when user asks for "all" or comprehensive results.',
                    default: 20,
                },
            },
        },
    },

    {
        name: 'get_detection_detail',
        description: 'Get full details of a specific detection by its ID, including host info, process tree, tactics, and timeline.',
        parameters: {
            type: 'object',
            required: ['detection_id'],
            properties: {
                detection_id: {
                    type: 'string',
                    description: 'The CrowdStrike detection ID (starts with ldt:)',
                },
            },
        },
    },

    {
        name: 'update_detection_status',
        description: '[DESTRUCTIVE] Update the status of a detection. Use when analyst wants to close, resolve, mark as false positive, or assign a detection. REQUIRES USER CONFIRMATION.',
        parameters: {
            type: 'object',
            required: ['detection_ids', 'status'],
            properties: {
                detection_ids: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Array of detection IDs to update',
                },
                status: {
                    type: 'string',
                    enum: ['new', 'in_progress', 'true_positive', 'false_positive', 'ignored'],
                    description: 'New status to set',
                },
                assign_to: {
                    type: 'string',
                    description: 'Username to assign the detection to (optional)',
                },
                comment: {
                    type: 'string',
                    description: 'Comment to add when updating (optional)',
                },
            },
        },
    },

    {
        name: 'list_incidents',
        description: 'List active or historical incidents in the CrowdStrike environment. Use when analyst asks about incidents, breaches, or security events. Call WITHOUT filter to get all recent incidents.',
        parameters: {
            type: 'object',
            properties: {
                filter: {
                    type: 'string',
                    description: 'FQL filter. Leave EMPTY for all recent incidents. Valid fields: status (New/In Progress/Closed/Reopened), fine_score (1-100), start, end, host_ids. Examples: "fine_score:>=75" or "status:\'New\'". For time: "start:>=\'2026-02-25T00:00:00Z\'". NEVER use "now-1d" — always compute the ISO 8601 date.',
                },
                limit: {
                    type: 'integer',
                    default: 20,
                },
            },
        },
    },

    {
        name: 'get_incident_detail',
        description: 'Get full details of a specific incident including affected hosts, timelines, tactics, and behaviors.',
        parameters: {
            type: 'object',
            required: ['incident_id'],
            properties: {
                incident_id: {
                    type: 'string',
                    description: 'Incident ID (starts with inc:)',
                },
            },
        },
    },

    // ── Threat Hunting ──────────────────────────────────────────────────────

    {
        name: 'hunt_by_hash',
        description: 'Hunt for a specific file hash (MD5 or SHA256) across all hosts in the environment. Use when analyst wants to know if a hash was executed anywhere.',
        parameters: {
            type: 'object',
            required: ['hash'],
            properties: {
                hash: {
                    type: 'string',
                    description: 'MD5 or SHA256 hash value to hunt for',
                },
                days: {
                    type: 'integer',
                    description: 'Number of days to look back. Default 7.',
                    default: 7,
                },
            },
        },
    },

    {
        name: 'hunt_by_ioc',
        description: 'Hunt for a specific IP address or domain across the environment. Use for network IOC-based threat hunting.',
        parameters: {
            type: 'object',
            required: ['ioc'],
            properties: {
                ioc: {
                    type: 'string',
                    description: 'IP address or domain to hunt for',
                },
                days: {
                    type: 'integer',
                    default: 7,
                },
            },
        },
    },

    {
        name: 'search_behaviors',
        description: 'Search for observed attack behaviors (TTPs) across incidents. WARNING: This endpoint has very limited filter support — ONLY timestamp works reliably. For host-specific TTP searches, use list_detections with hostname and tactic filters instead. Call this WITHOUT a filter to get all recent behaviors, or with just a timestamp filter.',
        parameters: {
            type: 'object',
            properties: {
                filter: {
                    type: 'string',
                    description: 'FQL filter. ONLY timestamp is reliably supported. Example: "timestamp:>=\'2026-02-20T00:00:00Z\'". Do NOT use device_id, tactic, technique, or process_name — those fields cause errors. For host-specific or tactic-based searches, use list_detections instead.',
                },
                limit: { type: 'integer', default: 20 },
            },
        },
    },

    // ── Threat Intelligence ─────────────────────────────────────────────────

    {
        name: 'search_threat_actors',
        description: 'Search for threat actor profiles in Falcon Intel. Use when analyst asks about APT groups, threat actors, nation-state actors, or specific adversary names.',
        parameters: {
            type: 'object',
            properties: {
                query: {
                    type: 'string',
                    description: 'Actor name, alias, target industry, or keyword (e.g., "COZY BEAR", "financial sector", "ransomware")',
                },
                limit: { type: 'integer', default: 5 },
            },
        },
    },

    {
        name: 'search_intel_reports',
        description: 'Search CrowdStrike threat intelligence reports. Use when analyst wants to find reports about malware families, campaigns, or actors.',
        parameters: {
            type: 'object',
            properties: {
                query: {
                    type: 'string',
                    description: 'Keyword, malware family, actor, or campaign name',
                },
                limit: { type: 'integer', default: 5 },
            },
        },
    },

    {
        name: 'lookup_intel_indicator',
        description: 'Look up an IOC (hash, IP, domain, URL) in the Falcon Intel database to get context about campaigns and actors associated with it.',
        parameters: {
            type: 'object',
            required: ['indicator'],
            properties: {
                indicator: {
                    type: 'string',
                    description: 'The IOC value: hash, IP address, domain, or URL',
                },
            },
        },
    },

    // ── Host & Device Management ────────────────────────────────────────────

    {
        name: 'list_hosts',
        description: 'List managed hosts/endpoints in the CrowdStrike environment. Use when analyst asks about devices, machines, endpoints, computers, sensor health, or wants to search for a specific hostname or IP.',
        parameters: {
            type: 'object',
            properties: {
                filter: {
                    type: 'string',
                    description: 'FQL filter using valid host fields: hostname, platform_name (Windows/Mac/Linux), os_version, status (normal/contained/containment_pending), last_seen, local_ip, device_id, tags. Examples: "platform_name:\'Windows\'" or "hostname:\'WS-FINANCE\'". Also use list_hosts to check software activity — look for host names mentioned by the analyst.',
                },
                limit: { type: 'integer', default: 20 },
            },
        },
    },

    {
        name: 'get_host_detail',
        description: 'Get detailed information about a specific host: OS, agent version, last seen time, IP, containment status.',
        parameters: {
            type: 'object',
            required: ['host_id'],
            properties: {
                host_id: {
                    type: 'string',
                    description: 'Device/Agent ID (AID) of the host',
                },
            },
        },
    },

    {
        name: 'contain_host',
        description: '[DESTRUCTIVE] Network contain (isolate) a host from the environment. REQUIRES USER CONFIRMATION. Use only when analyst explicitly requests containment.',
        parameters: {
            type: 'object',
            required: ['device_id'],
            properties: {
                device_id: {
                    type: 'string',
                    description: 'Agent ID of the host to contain',
                },
            },
        },
    },

    {
        name: 'lift_containment',
        description: '[DESTRUCTIVE] Lift network containment on a host, restoring its network access. REQUIRES USER CONFIRMATION.',
        parameters: {
            type: 'object',
            required: ['device_id'],
            properties: {
                device_id: {
                    type: 'string',
                    description: 'Agent ID of the host to lift containment on',
                },
            },
        },
    },

    {
        name: 'get_sensor_health',
        description: 'Check sensor health and coverage — total host count, contained hosts, and coverage gaps.',
        parameters: {
            type: 'object',
            properties: {},
        },
    },

    // ── Vulnerability Management ────────────────────────────────────────────

    {
        name: 'list_vulnerabilities',
        description: 'List open vulnerabilities (CVEs) using Falcon Spotlight. NOTE: This requires the Spotlight Vulnerabilities scope — if unavailable, the response will explain how to enable it.',
        parameters: {
            type: 'object',
            properties: {
                filter: {
                    type: 'string',
                    description: 'FQL filter. Valid fields: cve.severity (CRITICAL/HIGH/MEDIUM/LOW), cve.id (CVE-YYYY-NNNNN), status, host_info.hostname. Example: "cve.severity:\'CRITICAL\'"',
                },
                limit: { type: 'integer', default: 20 },
            },
        },
    },

    {
        name: 'search_by_cve',
        description: 'Search for all hosts affected by a specific CVE ID. Use when analyst wants to know which hosts are vulnerable to a specific CVE.',
        parameters: {
            type: 'object',
            required: ['cve_id'],
            properties: {
                cve_id: {
                    type: 'string',
                    description: 'CVE identifier (e.g., "CVE-2024-1234")',
                },
            },
        },
    },

    {
        name: 'get_vulnerability_posture',
        description: 'Get an overall summary of the organization\'s vulnerability posture — counts by severity (Critical, High, Medium, Low).',
        parameters: {
            type: 'object',
            properties: {},
        },
    },

    // ── Real-Time Response ──────────────────────────────────────────────────

    {
        name: 'rtr_run_command',
        description: '[DESTRUCTIVE] Run a read-only RTR command on a live host (ls, ps, netstat, reg query). Initiates an RTR session and executes the command. REQUIRES USER CONFIRMATION.',
        parameters: {
            type: 'object',
            required: ['device_id', 'base_command', 'command_string'],
            properties: {
                device_id: {
                    type: 'string',
                    description: 'Agent ID of the target host',
                },
                base_command: {
                    type: 'string',
                    enum: ['ls', 'ps', 'netstat', 'reg query', 'ifconfig', 'ipconfig', 'cat', 'env'],
                    description: 'The base command to execute',
                },
                command_string: {
                    type: 'string',
                    description: 'Full command string including arguments (e.g., "ls C:\\\\")',
                },
            },
        },
    },

    // ── Custom IOC Management ───────────────────────────────────────────────

    {
        name: 'list_custom_iocs',
        description: 'List custom IOCs (hashes, IPs, domains) managed in the CrowdStrike IOC Manager.',
        parameters: {
            type: 'object',
            properties: {
                filter: {
                    type: 'string',
                    description: 'FQL filter (e.g., "type:\'sha256\'" or "action:\'prevent\'")',
                },
                limit: { type: 'integer', default: 20 },
            },
        },
    },

    {
        name: 'create_ioc',
        description: '[DESTRUCTIVE] Create a new custom IOC in the CrowdStrike environment. REQUIRES USER CONFIRMATION.',
        parameters: {
            type: 'object',
            required: ['type', 'value', 'action'],
            properties: {
                type: {
                    type: 'string',
                    enum: ['sha256', 'md5', 'domain', 'ipv4', 'ipv6'],
                    description: 'IOC type',
                },
                value: {
                    type: 'string',
                    description: 'The IOC value (hash, domain, or IP)',
                },
                action: {
                    type: 'string',
                    enum: ['detect', 'prevent', 'no_action'],
                    description: 'Action to take when IOC is matched',
                },
                severity: {
                    type: 'string',
                    enum: ['critical', 'high', 'medium', 'low'],
                    default: 'medium',
                },
                description: {
                    type: 'string',
                    description: 'Description/context for this IOC',
                },
            },
        },
    },

    {
        name: 'delete_ioc',
        description: '[DESTRUCTIVE] Delete one or more custom IOCs from the environment. REQUIRES USER CONFIRMATION.',
        parameters: {
            type: 'object',
            required: ['ioc_ids'],
            properties: {
                ioc_ids: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Array of IOC IDs to delete',
                },
            },
        },
    },

    // ── Identity Protection ─────────────────────────────────────────────────

    {
        name: 'list_identity_detections',
        description: 'List identity-based detections — risky logins, credential abuse, lateral movement via identity. Use when analyst asks about identity threats or compromised accounts.',
        parameters: {
            type: 'object',
            properties: {
                filter: { type: 'string' },
                limit: { type: 'integer', default: 20 },
            },
        },
    },

    // ── Firewall Management ─────────────────────────────────────────────────

    {
        name: 'list_firewall_policies',
        description: 'List active CrowdStrike firewall management policies and rules.',
        parameters: {
            type: 'object',
            properties: {
                limit: { type: 'integer', default: 20 },
            },
        },
    },

    {
        name: 'list_firewall_events',
        description: 'Search and list firewall events. Use to investigate blocked/allowed connections by IP, port, or protocol.',
        parameters: {
            type: 'object',
            properties: {
                filter: {
                    type: 'string',
                    description: 'FQL filter (e.g., "local_address:\'10.0.0.1\'" or "network_profile:\'Public\'")',
                },
                limit: { type: 'integer', default: 20 },
            },
        },
    },

    // ── Exposure Management / Discover ──────────────────────────────────────

    {
        name: 'list_discovered_hosts',
        description: 'List discovered assets — both managed and unmanaged/shadow IT devices found in the environment.',
        parameters: {
            type: 'object',
            properties: {
                filter: { type: 'string' },
                limit: { type: 'integer', default: 20 },
            },
        },
    },

    {
        name: 'list_unmanaged_assets',
        description: 'List unmanaged (shadow IT) assets discovered in the environment — devices not covered by Falcon.',
        parameters: {
            type: 'object',
            properties: {
                limit: { type: 'integer', default: 20 },
            },
        },
    },

    // ── Digital Risk & Recon ────────────────────────────────────────────────

    {
        name: 'list_recon_alerts',
        description: 'List Falcon Recon digital risk alerts — leaked credentials, brand mentions, dark web hits, external exposure alerts.',
        parameters: {
            type: 'object',
            properties: {
                filter: { type: 'string' },
                limit: { type: 'integer', default: 20 },
            },
        },
    },

    {
        name: 'list_monitoring_rules',
        description: 'List active Falcon Recon monitoring rules for brand protection and digital risk monitoring.',
        parameters: {
            type: 'object',
            properties: {
                limit: { type: 'integer', default: 20 },
            },
        },
    },

    // ── SIEM / LogScale ─────────────────────────────────────────────────────

    {
        name: 'run_log_query',
        description: 'Run a query against Falcon LogScale (Next-Gen SIEM). Use when analyst asks about log data, event streams, authentication events, or wants to investigate raw log data.',
        parameters: {
            type: 'object',
            required: ['query_string'],
            properties: {
                query_string: {
                    type: 'string',
                    description: 'LogScale Query Language (LQL) query string',
                },
                hours_back: {
                    type: 'integer',
                    description: 'Number of hours to look back. Default 24.',
                    default: 24,
                },
                limit: { type: 'integer', default: 100 },
            },
        },
    },

    // ── SOAR / Fusion Workflows ─────────────────────────────────────────────

    {
        name: 'list_workflows',
        description: 'List available Fusion SOAR automation workflows.',
        parameters: {
            type: 'object',
            properties: {
                limit: { type: 'integer', default: 20 },
            },
        },
    },

    {
        name: 'trigger_workflow',
        description: '[DESTRUCTIVE] Trigger a Falcon Fusion SOAR workflow execution. REQUIRES USER CONFIRMATION.',
        parameters: {
            type: 'object',
            required: ['workflow_id'],
            properties: {
                workflow_id: {
                    type: 'string',
                    description: 'The workflow definition ID to trigger',
                },
                payload: {
                    type: 'object',
                    description: 'Optional payload to pass to the workflow',
                },
            },
        },
    },
];

/**
 * Returns function definitions formatted for the OpenAI API (tools format).
 */
function getToolDefinitions() {
    return FUNCTIONS.map((fn) => ({
        type: 'function',
        function: {
            name: fn.name,
            description: fn.description,
            parameters: fn.parameters,
        },
    }));
}

/**
 * Set of function names that require user confirmation before execution.
 */
const DESTRUCTIVE_FUNCTIONS = new Set(
    FUNCTIONS
        .filter((fn) => fn.description.includes('[DESTRUCTIVE]'))
        .map((fn) => fn.name)
);

module.exports = { FUNCTIONS, getToolDefinitions, DESTRUCTIVE_FUNCTIONS };
