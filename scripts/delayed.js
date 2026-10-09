import { getMetadata } from './aem.js';

/**
 * Loads the Google Tag Manager container.
 * The container ID comes from the "gtm-id" page metadata.
 * @param {string} id GTM container ID, e.g. GTM-XXXXXXX
 */
function loadGtm(id) {
  if (!id || window.google_tag_manager?.[id]) return;

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' });

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(id)}`;
  document.head.append(script);
}

loadGtm(getMetadata('gtm-id'));
