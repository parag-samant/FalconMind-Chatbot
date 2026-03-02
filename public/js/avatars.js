/**
 * FalconMind — Shared SVG Avatars
 *
 * Extracted from inline duplication across app.js (4+ instances) and index.html.
 * Import these constants to ensure consistency and reduce code bloat.
 */

'use strict';

// Falcon shield icon (used for assistant messages)
const FALCON_AVATAR = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 2L3 7v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z" fill="rgba(232,0,28,0.2)" stroke="#E8001C" stroke-width="1.5" stroke-linejoin="round"/><path d="M12 6.5L8 10l1.5 1.5L12 9l2.5 2.5L16 10l-4-3.5z" fill="#E8001C"/></svg>`;

// User icon (used for user messages)
const USER_AVATAR = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="4" fill="currentColor"/><path d="M4 20c0-4 4-7 8-7s8 3 8 7" fill="currentColor"/></svg>`;

// Make available globally for inline scripts
if (typeof window !== 'undefined') {
    window.FALCON_AVATAR = FALCON_AVATAR;
    window.USER_AVATAR = USER_AVATAR;
}
