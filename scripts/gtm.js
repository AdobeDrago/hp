const GTM_ATTR_PREFIX = 'data-gtm-';
const GTM_CLICK_EVENT = 'link_click';
const GTM_KEY_PATTERN = /^[a-z][a-z0-9_-]*$/;

function parseLinkTitle(rawTitle = '') {
  const gtm = {};
  const plainParts = [];

  rawTitle.split('|').forEach((part) => {
    const [key, ...rest] = part.split('=');
    const name = key.trim().toLowerCase();
    const value = rest.join('=').trim();

    if (rest.length && GTM_KEY_PATTERN.test(name)) {
      if (value) gtm[name] = value;
    } else if (part.trim()) {
      plainParts.push(part.trim());
    }
  });

  const { title, ...attrs } = gtm;
  return { title: title || plainParts.join(' | '), gtm: attrs };
}

function decorateGtmLink(a) {
  const { title, gtm } = parseLinkTitle(a.getAttribute('title') || '');
  Object.entries(gtm).forEach(([key, value]) => a.setAttribute(`${GTM_ATTR_PREFIX}${key}`, value));
  if (title) a.title = title;
  else a.removeAttribute('title');
}

export function decorateGtmLinks(element) {
  element.querySelectorAll('a').forEach(decorateGtmLink);
}

function pushLinkClick(a) {
  const payload = { event: GTM_CLICK_EVENT };
  a.getAttributeNames()
    .filter((name) => name.startsWith(GTM_ATTR_PREFIX))
    .forEach((name) => {
      payload[`link_${name.slice(GTM_ATTR_PREFIX.length)}`] = a.getAttribute(name);
    });
  payload.link_url = a.href;
  payload.link_text = a.textContent.trim();

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(payload);
}

export function initLinkTracking() {
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a');
    if (a?.getAttributeNames().some((name) => name.startsWith(GTM_ATTR_PREFIX))) {
      pushLinkClick(a);
    }
  }, true);
}
