/**
 * FalconMind — Main Application
 *
 * Handles:
 *   - Chat message sending and receiving
 *   - Message rendering (user + assistant + confirmation)
 *   - Streaming typewriter effect for AI responses
 *   - Session state management
 *   - Confirmation dialog flow
 *   - Auto-resize textarea
 *   - Sidebar toggle
 */

'use strict';

// ── App State ──────────────────────────────────────────────────────────────
const state = {
    isLoading: false,
    pendingConfirmationId: null,
    messageCount: 0,
};

// ── DOM References ────────────────────────────────────────────────────────
const chatInput = document.getElementById('chatInput');
const sendButton = document.getElementById('sendButton');
const messagesContainer = document.getElementById('messagesContainer');
const welcomeScreen = document.getElementById('welcomeScreen');
const chatArea = document.getElementById('chatArea');
const charCount = document.getElementById('charCount');
const confirmModal = document.getElementById('confirmModal');
const modalBody = document.getElementById('modalBody');

// ── Auto-resize Textarea ──────────────────────────────────────────────────
chatInput.addEventListener('input', () => {
    chatInput.style.height = 'auto';
    chatInput.style.height = Math.min(chatInput.scrollHeight, 160) + 'px';

    const len = chatInput.value.length;
    charCount.textContent = `${len} / 2000`;
    charCount.style.color = len > 1800 ? '#f59e0b' : '';
});

// ── Keyboard Shortcuts ────────────────────────────────────────────────────
chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (!state.isLoading) sendMessage();
    }
});

// ── Send Message ──────────────────────────────────────────────────────────
async function sendMessage() {
    const text = chatInput.value.trim();
    if (!text || state.isLoading) return;

    // Clear input
    chatInput.value = '';
    chatInput.style.height = 'auto';
    charCount.textContent = '0 / 2000';

    await submitMessage(text);
}

/**
 * Send a quick message (from welcome cards or quick action buttons).
 * Exposed globally for inline onclick handlers.
 */
window.sendQuickMessage = async function (message) {
    if (state.isLoading) return;
    await submitMessage(message);
};

/**
 * Core message submission pipeline.
 * @param {string} text  The message to send
 */
async function submitMessage(text) {
    // Hide welcome screen if visible
    if (welcomeScreen && welcomeScreen.style.display !== 'none') {
        welcomeScreen.style.display = 'none';
    }

    // Render user message
    appendMessage('user', text);

    // Show loading indicator
    const loadingId = appendLoadingMessage();
    setLoading(true);

    try {
        const resp = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: text }),
        });

        const data = await resp.json();
        removeMessage(loadingId);

        if (data.error) {
            appendMessage('assistant', `❌ **Error:** ${data.message}`, null, true);
            return;
        }

        if (data.type === 'confirmation_required') {
            // Show inline confirmation in chat + modal
            state.pendingConfirmationId = data.confirmationId;
            appendConfirmationMessage(data.message, data.confirmationId, data.functionName);
        } else {
            // Stream the response with typewriter effect
            await appendStreamedMessage(data.message, data.functionCalled);
        }
    } catch (err) {
        removeMessage(loadingId);
        appendMessage('assistant', '❌ **Connection Error:** Unable to reach the FalconMind server. Please refresh and try again.', null, true);
    } finally {
        setLoading(false);
    }
}

// ── Streaming Typewriter Effect ───────────────────────────────────────────
/**
 * Streams an assistant message character-by-character with markdown
 * re-rendering at intervals for a professional streaming feel.
 */
async function appendStreamedMessage(content, functionTag = null) {
    const id = `msg-${++msgIdCounter}`;
    const div = document.createElement('div');
    div.className = 'message assistant';
    div.id = id;

    const falconAvatarSvg = window.FALCON_AVATAR;

    const tagHtml = functionTag
        ? `<span class="function-tag" title="API function called">${functionTag}</span>`
        : '';

    div.innerHTML = `
    <div class="message-avatar">${falconAvatarSvg}</div>
    <div class="message-content-wrapper">
      <div class="message-meta">
        <span class="message-sender">FalconMind</span>
        ${tagHtml}
      </div>
      <div class="message-bubble"><span class="streaming-cursor"></span></div>
    </div>
  `;

    messagesContainer.appendChild(div);
    scrollToBottom();
    state.messageCount++;

    const bubble = div.querySelector('.message-bubble');

    // Stream character-by-character
    const chars = content.split('');
    let displayed = '';
    const chunkSize = 3; // characters per tick for speed
    const delay = 15; // ms between ticks

    for (let i = 0; i < chars.length; i += chunkSize) {
        displayed += chars.slice(i, i + chunkSize).join('');
        bubble.innerHTML = renderMarkdown(displayed) + '<span class="streaming-cursor"></span>';
        scrollToBottom();
        await sleep(delay);
    }

    // Final render — remove cursor
    bubble.innerHTML = renderMarkdown(content);
    scrollToBottom();

    return id;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ── Confirmation Flow ─────────────────────────────────────────────────────
/**
 * Appends a confirmation prompt message to the chat.
 */
function appendConfirmationMessage(message, confirmationId, functionName) {
    const div = document.createElement('div');
    div.className = 'message assistant';
    div.id = `msg-confirm-${confirmationId}`;

    const falconAvatarSvg = window.FALCON_AVATAR;

    div.innerHTML = `
    <div class="message-avatar">${falconAvatarSvg}</div>
    <div class="message-content-wrapper">
      <div class="message-meta">
        <span class="message-sender">FalconMind</span>
      </div>
      <div class="message-bubble confirmation-banner">
        <div>${renderMarkdown(message)}</div>
        <div class="confirmation-actions">
          <button class="btn-approve" onclick="handleInlineConfirmation('${confirmationId}', true)">
            ✅ Yes, Proceed
          </button>
          <button class="btn-deny" onclick="handleInlineConfirmation('${confirmationId}', false)">
            ✕ Cancel
          </button>
        </div>
      </div>
    </div>
  `;

    messagesContainer.appendChild(div);
    scrollToBottom();
}

/**
 * Handle inline confirmation button clicks.
 */
window.handleInlineConfirmation = async function (confirmationId, approved) {
    // Disable buttons to prevent double-click
    const msgEl = document.getElementById(`msg-confirm-${confirmationId}`);
    if (msgEl) {
        msgEl.querySelectorAll('button').forEach((b) => (b.disabled = true));
    }

    const loadingId = appendLoadingMessage();
    setLoading(true);

    try {
        const resp = await fetch('/api/confirm', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ confirmationId, approved }),
        });

        const data = await resp.json();
        removeMessage(loadingId);

        // Remove the confirmation message
        if (msgEl) msgEl.remove();

        await appendStreamedMessage(data.message, data.functionCalled);
    } catch {
        removeMessage(loadingId);
        appendMessage('assistant', '❌ **Error:** Failed to process confirmation.', null, true);
    } finally {
        setLoading(false);
        state.pendingConfirmationId = null;
    }
};

// Legacy modal handler (fallback)
window.handleConfirmation = function (approved) {
    if (!state.pendingConfirmationId) return;
    handleInlineConfirmation(state.pendingConfirmationId, approved);
    confirmModal.style.display = 'none';
};

// ── Message Rendering ─────────────────────────────────────────────────────
let msgIdCounter = 0;

/**
 * Append a user or assistant message to the chat (non-streamed).
 */
function appendMessage(role, content, functionTag = null, isError = false) {
    const id = `msg-${++msgIdCounter}`;
    const div = document.createElement('div');
    div.className = `message ${role}${isError ? ' error-message' : ''}`;
    div.id = id;

    let avatarHtml;
    if (role === 'user') {
        avatarHtml = window.USER_AVATAR;
    } else {
        avatarHtml = window.FALCON_AVATAR;
    }

    const tagHtml = functionTag
        ? `<span class="function-tag" title="API function called">${functionTag}</span>`
        : '';

    div.innerHTML = `
    <div class="message-avatar">${avatarHtml}</div>
    <div class="message-content-wrapper">
      <div class="message-meta">
        <span class="message-sender">${role === 'user' ? 'You' : 'FalconMind'}</span>
        ${tagHtml}
      </div>
      <div class="message-bubble">
        ${role === 'assistant' ? renderMarkdown(content) : escapeHtml(content)}
      </div>
    </div>
  `;

    messagesContainer.appendChild(div);
    scrollToBottom();
    state.messageCount++;

    return id;
}

/**
 * Append a loading/typing indicator message.
 */
function appendLoadingMessage() {
    const id = `msg-loading-${Date.now()}`;
    const div = document.createElement('div');
    div.className = 'message assistant loading';
    div.id = id;

    const falconAvatarSvg = window.FALCON_AVATAR;

    div.innerHTML = `
    <div class="message-avatar">${falconAvatarSvg}</div>
    <div class="message-content-wrapper">
      <div class="message-meta">
        <span class="message-sender">FalconMind</span>
      </div>
      <div class="message-bubble">
        <div class="typing-dots">
          <span></span><span></span><span></span>
        </div>
      </div>
    </div>
  `;

    messagesContainer.appendChild(div);
    scrollToBottom();
    return id;
}

/**
 * Remove a message by ID (used to replace loading indicator).
 */
function removeMessage(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
}

// ── Utility Functions ─────────────────────────────────────────────────────
function setLoading(loading) {
    state.isLoading = loading;
    sendButton.disabled = loading;
    chatInput.disabled = loading;
    chatInput.placeholder = loading
        ? 'FalconMind is thinking...'
        : 'Ask anything about your CrowdStrike Falcon environment...';
}

function scrollToBottom() {
    chatArea.scrollTop = chatArea.scrollHeight;
}

function getTimeString() {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
}

// ── New Chat ──────────────────────────────────────────────────────────────
window.newChat = function () {
    // Clear messages
    messagesContainer.innerHTML = '';
    state.messageCount = 0;
    state.pendingConfirmationId = null;

    // Clear server-side conversation history
    fetch('/api/chat/history', { method: 'DELETE' }).catch(() => { });

    // Show welcome screen
    if (welcomeScreen) welcomeScreen.style.display = '';

    // Focus input
    chatInput.focus();
};

// ── Sidebar Toggle ────────────────────────────────────────────────────────
window.toggleSidebar = function () {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;

    if (window.innerWidth <= 768) {
        sidebar.classList.toggle('mobile-open');
    } else {
        sidebar.classList.toggle('collapsed');
    }
};

// ── Init ──────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    chatInput.focus();
});
