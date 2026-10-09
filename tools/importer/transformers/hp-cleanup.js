/* eslint-disable */
/* global WebImporter */

const TransformHook = { beforeTransform: 'beforeTransform', afterTransform: 'afterTransform' };

export default function transform(hookName, element, payload) {
  if (hookName === TransformHook.beforeTransform) {
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
    WebImporter.DOMUtils.remove(element, [
      '#content > section:nth-child(1)',
      'ul.digitnav-a11y-nav',
      '#header',
      '#content > section:has(#footer)',
      '#footer',
    ]);

    WebImporter.DOMUtils.remove(element, ['div.modal.aem-GridColumn', '#video-1']);

    element.querySelectorAll('div.spacing').forEach((el) => {
      if (!el.textContent.trim() && !el.querySelector('img, picture, video, iframe, table')) {
        el.remove();
      }
    });

    WebImporter.DOMUtils.remove(element, ['script', 'style', 'noscript', 'link', 'iframe.ot-text-resize']);
    element.querySelectorAll('img[src^="data:image/svg+xml"]').forEach((img) => {
      if (!img.closest('table')) img.remove();
    });

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
    element.querySelectorAll('p, div').forEach((el) => {
      if (!el.closest('table') && !el.textContent.trim() && !el.querySelector('img, picture, video, iframe, table, hr')) {
        el.remove();
      }
    });
  }
}
