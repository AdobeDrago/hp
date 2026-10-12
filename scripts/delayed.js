import { getMetadata } from './aem.js';

// OneTrust category that covers analytics (Performance cookies)
const ANALYTICS_CONSENT_GROUP = 'C0002';

function loadGtm(id) {
  if (!id || window.google_tag_manager?.[id]) return;

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' });

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(id)}`;
  document.head.append(script);
}

function hasAnalyticsConsent() {
  return (window.OnetrustActiveGroups || '').split(',').includes(ANALYTICS_CONSENT_GROUP);
}

// OneTrust calls OptanonWrapper when it loads and every time consent changes
function loadGtmWithConsent(id) {
  if (hasAnalyticsConsent()) {
    loadGtm(id);
    return;
  }

  const previousWrapper = window.OptanonWrapper;
  window.OptanonWrapper = () => {
    if (typeof previousWrapper === 'function') previousWrapper();
    if (hasAnalyticsConsent()) loadGtm(id);
  };
}

loadGtmWithConsent(getMetadata('gtm-id'));
