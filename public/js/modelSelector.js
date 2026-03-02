/**
 * FalconMind — Model Selector Module
 *
 * Provides a dropdown to switch between available Ollama models.
 * Fetches model list from /api/models and switches via /api/models/switch.
 */

(function () {
    let isOpen = false;
    let modelsCache = null;

    /** Toggle the dropdown visibility (only for switchable providers) */
    window.toggleModelDropdown = function () {
        const dropdown = document.getElementById('modelDropdown');
        if (!dropdown || dropdown.dataset.switchable === 'false') return;

        isOpen = !isOpen;
        dropdown.classList.toggle('open', isOpen);

        if (isOpen) {
            loadModels();
        }
    };

    /** Close dropdown when clicking outside */
    document.addEventListener('click', (e) => {
        const selector = document.getElementById('modelSelector');
        if (selector && !selector.contains(e.target)) {
            const dropdown = document.getElementById('modelDropdown');
            if (dropdown) {
                dropdown.classList.remove('open');
                isOpen = false;
            }
        }
    });

    /** Fetch and render available models */
    async function loadModels() {
        const list = document.getElementById('modelList');
        if (!list) return;

        list.innerHTML = '<div class="model-loading">Loading models...</div>';

        try {
            const resp = await fetch('/api/models');
            const data = await resp.json();

            if (data.error) {
                list.innerHTML = `<div class="model-error">${data.message}</div>`;
                return;
            }

            modelsCache = data;
            renderModels(data);
        } catch (err) {
            list.innerHTML = '<div class="model-error">Failed to connect to Ollama</div>';
        }
    }

    /** Render the model list */
    function renderModels(data) {
        const list = document.getElementById('modelList');
        if (!list || !data.models) return;

        // Separate cloud and local models
        const cloudModels = data.models.filter(m => m.isCloud);
        const localModels = data.models.filter(m => !m.isCloud);

        let html = '';

        if (localModels.length > 0) {
            html += '<div class="model-group-label">Local Models</div>';
            localModels.forEach(m => {
                html += buildModelItem(m, data.activeModel);
            });
        }

        if (cloudModels.length > 0) {
            html += '<div class="model-group-label">Cloud Models</div>';
            cloudModels.forEach(m => {
                html += buildModelItem(m, data.activeModel);
            });
        }

        list.innerHTML = html;

        // Attach click handlers
        list.querySelectorAll('.model-item').forEach(item => {
            item.addEventListener('click', () => {
                const modelName = item.dataset.model;
                switchModel(modelName);
            });
        });
    }

    /** Build HTML for a single model item */
    function buildModelItem(model, activeModel) {
        const isActive = model.name === activeModel;
        const shortName = model.name.split(':')[0];
        const tag = model.name.includes(':') ? model.name.split(':').pop() : '';

        return `
            <div class="model-item ${isActive ? 'active' : ''}" data-model="${model.name}">
                <div class="model-item-info">
                    <span class="model-item-name">${shortName}</span>
                    ${tag ? `<span class="model-item-tag">${tag}</span>` : ''}
                </div>
                <div class="model-item-meta">
                    <span class="model-item-size">${model.sizeHuman || ''}</span>
                    <span class="model-item-params">${model.parameterSize || ''}</span>
                </div>
                ${isActive ? '<span class="model-item-active">✓</span>' : ''}
            </div>
        `;
    }

    /** Switch to a different model */
    async function switchModel(modelName) {
        const nameEl = document.getElementById('modelName');
        if (nameEl) {
            nameEl.textContent = 'Switching...';
        }

        // Close dropdown
        const dropdown = document.getElementById('modelDropdown');
        if (dropdown) {
            dropdown.classList.remove('open');
            isOpen = false;
        }

        try {
            const resp = await fetch('/api/models/switch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ model: modelName }),
            });

            const data = await resp.json();

            if (data.success) {
                // Update badge text
                const shortName = modelName.split('/').pop().split(':')[0];
                if (nameEl) nameEl.textContent = shortName;

                // Clear chat on model switch
                if (typeof newChat === 'function') {
                    newChat();
                }

                // Show a brief notification
                showModelNotification(`Switched to ${shortName}`);
            } else {
                if (nameEl) nameEl.textContent = 'Error';
            }
        } catch (err) {
            if (nameEl) nameEl.textContent = 'Error';
        }
    }

    /** Show a brief toast notification */
    function showModelNotification(msg) {
        const existing = document.querySelector('.model-toast');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.className = 'model-toast';
        toast.textContent = msg;
        document.body.appendChild(toast);

        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 2000);
    }

    /** Initialize — fetch models on load to set the badge */
    document.addEventListener('DOMContentLoaded', async () => {
        try {
            const resp = await fetch('/api/models');
            const data = await resp.json();
            const nameEl = document.getElementById('modelName');
            const dropdown = document.getElementById('modelDropdown');
            const badge = document.getElementById('modelBadge');

            if (data.activeModel && nameEl) {
                const shortName = data.activeModel.split('/').pop().split(':')[0];
                nameEl.textContent = shortName;
            }

            // Disable dropdown for non-switchable providers
            if (data.switchable === false) {
                if (dropdown) dropdown.dataset.switchable = 'false';
                if (badge) {
                    const arrow = badge.querySelector('.dropdown-arrow');
                    if (arrow) arrow.style.display = 'none';
                    badge.title = `AI Provider: ${data.provider}`;
                    badge.style.cursor = 'default';
                }
            }
        } catch {
            // Silent fail — status.js will set a fallback
        }
    });
})();
