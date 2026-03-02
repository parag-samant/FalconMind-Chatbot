/**
 * FalconMind — Markdown Renderer
 *
 * Configures Marked.js and provides a safe rendering function.
 * Uses DOMPurify to sanitize output and prevent XSS.
 */

// Configure marked with security settings
marked.setOptions({
    breaks: true,
    gfm: true,
});

/**
 * Render a Markdown string to sanitized HTML.
 * @param {string} text  Raw Markdown string
 * @returns {string}     Safe HTML string
 */
function renderMarkdown(text) {
    if (!text) return '';
    try {
        const rawHtml = marked.parse(text);
        return DOMPurify.sanitize(rawHtml, {
            ALLOWED_TAGS: [
                'p', 'br', 'strong', 'em', 'b', 'i', 'u', 's',
                'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
                'ul', 'ol', 'li',
                'table', 'thead', 'tbody', 'tr', 'th', 'td',
                'pre', 'code', 'blockquote',
                'a', 'hr', 'span', 'div',
            ],
            ALLOWED_ATTR: ['href', 'title', 'target', 'rel', 'class'],
            FORCE_BODY: false,
        });
    } catch (err) {
        // Fallback: render as plain text
        return document.createTextNode(text).textContent;
    }
}
