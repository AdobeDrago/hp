const GTM_ATTR_PREFIX = 'data-gtm-';
const GTM_CLICK_EVENT = 'e_linkClick';
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
  if (title && title !== a.textContent.trim()) a.title = title;
  else a.removeAttribute('title');
}

export function decorateGtmLinks(element) {
  element.querySelectorAll('a').forEach(decorateGtmLink);
}

// Same event and fields as HP's e_linkClick tag:
// data-gtm-id -> linkPlacement, data-gtm-value -> linkID
function pushLinkClick(el) {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event: GTM_CLICK_EVENT,
    pushSource: 'standards',
    linkPlacement: el.getAttribute('data-gtm-id')?.trim(),
    linkID: el.getAttribute('data-gtm-value')?.trim(),
  });
}

export function initLinkTracking() {
  // capture phase, so the push happens even if another handler stops propagation
  document.addEventListener('click', (e) => {
    const el = e.target.closest?.('[data-gtm-category]');
    if (el) pushLinkClick(el);
  }, true);
}
