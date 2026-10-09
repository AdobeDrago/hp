/* eslint-disable */
/* global WebImporter */

/**
 * Transformer: HP site-wide cleanup.
 * All selectors verified in migration-work/cleaned.html.
 *
 * Ordering notes:
 * - Parser and section selectors use positional `div.backgroundContainer:nth-of-type(N)`
 *   (counted among div siblings of #body > div.root > div.aem-Grid) and
 *   `div.spacing:has(#benefits) + div.backgroundContainer`. Any removal of a
 *   top-level grid <div> (div.spacing, div.modal) is therefore deferred to
 *   afterTransform so those selectors still resolve while parsers run.
 * - div.modal (#video-1) holds the mp4 the media-feature "Watch Video" CTA
 *   references, so it must also survive until parsers have run.
 * - Section ids carried by div.spacing (#benefits, #portfolio) are restored by
 *   hp-sections.js from tools/importer/section-anchors.json, not from the DOM.
 */
const TransformHook = { beforeTransform: 'beforeTransform', afterTransform: 'afterTransform' };

export default function transform(hookName, element, payload) {
  if (hookName === TransformHook.beforeTransform) {
    // OneTrust cookie banner + preference center: <div id="onetrust-consent-sdk">
    // Floating "Not another chatbot" / Join the waitlist widget: <hp-experience-ai>
    // Body-level iframe lightbox shell: <c-hp-modal class="c-hp-modal c-hp-modal--iframe ...">
    // Digitnav overlay + translations map: <div class="digitnav__overlay">, <div id="hp-translations-map">
    // Anchor-nav mobile helper (duplicate label text): <div class="c-hp-anchor-nav__mode-helper subtitle-large">
    // Anchor-nav pin helper: <div class="cx-pinnable-helper">
    WebImporter.DOMUtils.remove(element, [
      '#onetrust-consent-sdk',
      'hp-experience-ai',
      'c-hp-modal.c-hp-modal--iframe',
      '.digitnav__overlay',
      '#hp-translations-map',
      '.c-hp-anchor-nav__mode-helper',
      '.cx-pinnable-helper',
    ]);
  }

  if (hookName === TransformHook.afterTransform) {
    // Global header: <section> (1st child of #content) wrapping skip links
    // (ul.digitnav-a11y-nav) and <digitnav-header id="header">.
    // Global footer: <section> wrapping <digitnav-footer id="footer">.
    WebImporter.DOMUtils.remove(element, [
      '#content > section:nth-child(1)',
      'ul.digitnav-a11y-nav',
      '#header',
      '#content > section:has(#footer)',
      '#footer',
    ]);

    // Hidden video lightbox grid child: <div class="modal aem-GridColumn ..."><c-hp-modal id="video-1">
    WebImporter.DOMUtils.remove(element, ['div.modal.aem-GridColumn', '#video-1']);

    // Empty spacing containers: <div class="spacing aem-GridColumn"><div class="c-hp-spacing" [id]></div></div>
    // Only drop them when they carry no authorable content.
    element.querySelectorAll('div.spacing').forEach((el) => {
      if (!el.textContent.trim() && !el.querySelector('img, picture, video, iframe, table')) {
        el.remove();
      }
    });

    // Non-content elements: scripts/styles/noscript, preload <link>s inside #body,
    // OneTrust text-resize iframe, inline SVG sprite <img src="data:image/svg+xml..."> at body level.
    WebImporter.DOMUtils.remove(element, ['script', 'style', 'noscript', 'link', 'iframe.ot-text-resize']);
    element.querySelectorAll('img[src^="data:image/svg+xml"]').forEach((img) => {
      if (!img.closest('table')) img.remove();
    });

    // Third-party tracking pixels injected at body level on the live page
    // (adsrvr, terminus, analytics.twitter.com, t.co, bat.bing.com, ...), plus
    // tracking iframes (e.g. "TTD Universal Pixel" on insight.adsrvr.org).
    // All authorable imagery is inside block tables and hosted on hp.com.
    element.querySelectorAll('iframe').forEach((frame) => {
      if (frame.closest('table')) return;
      let host = '';
      try { host = new URL(frame.getAttribute('src') || '', 'https://www.hp.com').hostname; } catch (e) { /* keep */ }
      if (!/(^|\.)hp\.com$/.test(host)) frame.remove();
    });
    element.querySelectorAll('img').forEach((img) => {
      if (img.closest('table')) return;
      let host = '';
      try { host = new URL(img.getAttribute('src') || '', 'https://www.hp.com').hostname; } catch (e) { /* keep */ }
      if (host && !/(^|\.)hp\.com$/.test(host)) {
        const parent = img.parentElement;
        img.remove();
        if (parent && parent.tagName === 'PICTURE' && !parent.querySelector('img')) parent.remove();
      }
    });
    // Drop wrappers left empty by the pixel removal.
    element.querySelectorAll('p, div').forEach((el) => {
      if (!el.closest('table') && !el.textContent.trim() && !el.querySelector('img, picture, video, iframe, table, hr')) {
        el.remove();
      }
    });
  }
}
