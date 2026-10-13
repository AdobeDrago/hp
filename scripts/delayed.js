import { getMetadata } from './aem.js';

// OneTrust category that covers analytics (HP: "Performance & Analytics Cookies")
const ANALYTICS_CONSENT_GROUP = '2';
const DEV_HOSTS = /^localhost$|\.aem\.(page|live)$/;

let gtmLoaded = false;

function loadGtm(id) {
  if (!id || gtmLoaded || window.google_tag_manager?.[id]) return;
  gtmLoaded = true;

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' });

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(id)}`;
  document.head.append(script);
}

function hasAnalyticsConsent() {
  // OneTrust is not loaded on local dev or EDS preview/live hosts, so treat them as consented
  if (DEV_HOSTS.test(window.location.hostname)) return true;
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
