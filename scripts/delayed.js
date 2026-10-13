// add delayed functionality here
import {
  buildBlock, decorateBlock, getMetadata, loadBlock,
} from './aem.js';

const BE_CAPSULE = 'https://api.brightedge.com/api/ixf/1.0.0/get_capsule/f00000000019918';

async function loadRelatedLinksFallback() {
  const main = document.querySelector('main');
  if (!main || main.querySelector('.related-links')) return;
  if (!window.location.pathname.startsWith('/us-en/newsroom')) return;

  // eslint-disable-next-line import/no-relative-packages
  const be = await import('../aem-edge-functions/src/lib/brightedge.js');
  const canonical = be.canonicalizeUrl(window.location.pathname, 'www.hp.com');
  const getCapsule = async (name) => {
    try {
      const res = await fetch(`${BE_CAPSULE}/${name}`);
      return res.ok ? await res.json() : null;
    } catch {
      return null;
    }
  };

  let capsule = await getCapsule(be.getPageHash(canonical));
  if (!capsule) return;
  let { links } = be.resolveLinks(capsule, canonical);
  if (!links.length && be.needsDefaultCapsule(capsule)) {
    capsule = await getCapsule('default.json');
    if (capsule) ({ links } = be.resolveLinks(capsule, canonical));
  }
  if (!links.length || main.querySelector('.related-links')) return;

  const rows = links.map(({ url, text }) => {
    const a = document.createElement('a');
    a.href = url;
    a.textContent = text;
    return [a];
  });
  const section = document.createElement('div');
  section.className = 'section';
  const wrapper = document.createElement('div');
  const block = buildBlock('related-links', rows);
  wrapper.append(block);
  section.append(wrapper);
  main.append(section);
  decorateBlock(block);
  await loadBlock(block);
  section.dataset.sectionStatus = 'loaded';
}

loadRelatedLinksFallback().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('failed to load related links', error);
});

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
