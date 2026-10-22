// add delayed functionality here
import { getMetadata } from './aem.js';

// OneTrust group for "Performance & Analytics Cookies" on hp.com
const ANALYTICS_GROUP = '2';
// no OneTrust on local and EDS preview hosts, so every group counts as accepted there
const DEV_HOSTS = /^localhost$|\.aem\.(page|live)$/;

const loadedGtmIds = new Set();

function loadGtm(id) {
  if (loadedGtmIds.has(id) || window.google_tag_manager?.[id]) return;
  loadedGtmIds.add(id);

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' });

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(id)}`;
  document.head.append(script);
}

function isGroupAccepted(group) {
  if (DEV_HOSTS.test(window.location.hostname)) return true;
  return (window.OnetrustActiveGroups || '').split(',').includes(group);
}

// HP's tags push pb.onOptInGroups with a callback that loads a child container.
// "2:1,3:1" means groups 2 and 3 accepted, "2:0" means group 2 declined.
function runOptInCallback(entry) {
  if (entry?.event !== 'pb.onOptInGroups' || entry.processed) return;
  const allowed = String(entry.groups).split(',').every((rule) => {
    const [group, state] = rule.trim().split(':');
    return isGroupAccepted(group) === (state !== '0');
  });
  if (!allowed) return;

  entry.processed = true;
  try {
    entry.callback?.();
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('pb.onOptInGroups callback failed', error);
  }
}

let optInListening = false;

function handleOptIns() {
  const { dataLayer } = window;
  dataLayer.forEach(runOptInCallback);
  if (!optInListening) {
    optInListening = true;
    const push = dataLayer.push.bind(dataLayer);
    dataLayer.push = (...entries) => {
      const result = push(...entries);
      entries.forEach(runOptInCallback);
      return result;
    };
  }
  // HP's trigger groups wait for this, OneTrust sends it on hp.com
  dataLayer.push({ event: 'gtm_consent_update' });
}

function loadGtmWithConsent(ids) {
  if (!ids.length) return;
  const start = () => {
    ids.forEach(loadGtm);
    handleOptIns();
  };
  if (isGroupAccepted(ANALYTICS_GROUP)) {
    start();
    return;
  }

  // OneTrust calls OptanonWrapper when it loads and whenever consent changes
  const previousWrapper = window.OptanonWrapper;
  window.OptanonWrapper = () => {
    if (typeof previousWrapper === 'function') previousWrapper();
    if (isGroupAccepted(ANALYTICS_GROUP)) start();
  };
}

// gtm-id can list several containers: "GTM-AAA, GTM-BBB"
const gtmIds = getMetadata('gtm-id').split(',').map((id) => id.trim()).filter(Boolean);
loadGtmWithConsent([...new Set(gtmIds)]);
