/*
 * HTML helpers — escaping and injecting the related-links block into page HTML.
 * Pure string logic, no runtime dependencies.
 */

/**
 * Escape a string for safe insertion into HTML text or a double-quoted attribute.
 * @param {string} s
 * @returns {string}
 */
export function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Build the EDS `related-links` block markup (a section containing the block; each
 * link is one row/cell). Authors never place this block — the edge function injects
 * it — so the DOM mirrors how EDS serves an authored block, and blocks/related-links
 * decorates it client-side (drawer + analytics).
 *
 * @param {{url:string,text:string}[]} links
 * @returns {string} HTML, or '' when there are no links
 */
export function buildRelatedLinksBlock(links) {
  if (!links || !links.length) return '';
  const rows = links
    .map(
      (l) => `<div><div><a href="${escapeHtml(l.url)}">${escapeHtml(l.text)}</a></div></div>`,
    )
    .join('');
  return `<div class="section related-links-container"><div class="related-links">${rows}</div></div>`;
}

/**
 * Inject a snippet immediately before the closing </main> tag (i.e. at the end of
 * the main content, above the footer). If there is no </main>, returns the HTML
 * unchanged (fail-safe: never corrupt the page).
 *
 * @param {string} html
 * @param {string} snippet
 * @returns {string}
 */
export function injectBeforeMain(html, snippet) {
  if (!snippet) return html;
  const idx = html.lastIndexOf('</main>');
  if (idx === -1) return html;
  return html.slice(0, idx) + snippet + html.slice(idx);
}
