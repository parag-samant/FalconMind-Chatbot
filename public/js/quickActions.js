/**
 * FalconMind — Quick Actions Module
 *
 * Fetches quick action definitions from /api/quick-actions and renders
 * them as clickable buttons in the sidebar.
 */

(function () {
    async function loadQuickActions() {
        const container = document.getElementById('quickActionsList');
        if (!container) return;

        try {
            const resp = await fetch('/api/quick-actions');
            const data = await resp.json();
            const actions = data.quickActions || [];

            container.innerHTML = '';

            actions.forEach((action) => {
                const btn = document.createElement('button');
                btn.className = 'quick-action-btn';
                btn.id = `qa-${action.id}`;
                btn.title = action.description;
                btn.innerHTML = `<span>${action.label}</span>`;
                btn.addEventListener('click', () => {
                    sendQuickMessage(action.message);
                    // Close sidebar on mobile after clicking
                    if (window.innerWidth <= 768) {
                        document.getElementById('sidebar')?.classList.remove('mobile-open');
                    }
                });
                container.appendChild(btn);
            });
        } catch {
            container.innerHTML = '<div class="loading-actions">Failed to load</div>';
        }
    }

    document.addEventListener('DOMContentLoaded', loadQuickActions);
})();
