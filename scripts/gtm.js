const GTM_ATTR_PREFIX = 'data-gtm-';
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

// eslint-disable-next-line import/prefer-default-export
export function decorateGtmLinks(element) {
  element.querySelectorAll('a').forEach(decorateGtmLink);
}
