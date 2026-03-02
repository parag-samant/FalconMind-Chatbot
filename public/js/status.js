/**
 * FalconMind — Connection Status Module
 *
 * Polls /api/status every 30 seconds and updates the status indicator in the sidebar.
 */

(function () {
    const POLL_INTERVAL = 30000; // 30 seconds
    let pollTimer = null;

    async function checkStatus() {
        try {
            const resp = await fetch('/api/status');
            const data = await resp.json();

            const dot = document.getElementById('statusDot');
            const label = document.getElementById('statusLabel');
            const detail = document.getElementById('statusDetail');
            const modelBadge = document.getElementById('modelBadge');

            if (data.crowdstrike?.authenticated) {
                dot.className = 'status-dot connected';
                label.textContent = 'Connected';
                const exp = data.crowdstrike.tokenExpiresIn;
                detail.textContent = exp ? `Token expires in ${Math.floor(exp / 60)}m` : data.crowdstrike.baseUrl;
            } else {
                dot.className = 'status-dot error';
                label.textContent = 'Not Connected';
                detail.textContent = data.crowdstrike?.error ? data.crowdstrike.error.slice(0, 60) : 'Check credentials';
            }

            if (data.ai?.provider) {
                const modelNameEl = document.getElementById('modelName');
                if (modelNameEl) {
                    // Show short model name from the active model
                    const shortName = (data.ai.model || data.ai.provider).split('/').pop().split(':')[0];
                    modelNameEl.textContent = shortName;
                }
            }
        } catch {
            const dot = document.getElementById('statusDot');
            const label = document.getElementById('statusLabel');
            if (dot) dot.className = 'status-dot error';
            if (label) label.textContent = 'Server Error';
        }
    }

    // Initial check on load
    document.addEventListener('DOMContentLoaded', () => {
        checkStatus();
        pollTimer = setInterval(checkStatus, POLL_INTERVAL);
    });

    // Expose for manual refresh
    window.refreshStatus = checkStatus;
})();
