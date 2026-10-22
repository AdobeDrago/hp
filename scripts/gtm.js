import { getMetadata } from './aem.js';

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

  const { title, target, ...attrs } = gtm;
  return { title: title || plainParts.join(' | '), target, gtm: attrs };
}

function decorateGtmLink(a) {
  const { title, target, gtm } = parseLinkTitle(a.getAttribute('title') || '');
  Object.entries(gtm).forEach(([key, value]) => a.setAttribute(`${GTM_ATTR_PREFIX}${key}`, value));
  if (title && title !== a.textContent.trim()) a.title = title;
  else a.removeAttribute('title');
  if (target) a.target = target;
  else if (!a.target && a.getAttribute('data-gtm-value')?.trim()) a.target = '_self';
}

export function decorateGtmLinks(element) {
  element.querySelectorAll('a').forEach(decorateGtmLink);
}

// HP's container builds e_pageView from window.pagePropertiesData
const PAGE_PROPERTIES = {
  siteType: 'site_type',
  siteSubType: 'site_sub_type',
  templateName: 'template',
  pageNameL5: 'page_level',
  pageNameL6: 'product_type',
  pageNameL7: 'family',
  pageNameL8: 'simple_title',
  meta_bu: 'bu',
  meta_segment: 'segment',
};

export function pushPageReady() {
  const properties = { errorPage: Boolean(window.isErrorPage) };
  Object.entries(PAGE_PROPERTIES).forEach(([key, metaName]) => {
    const value = getMetadata(metaName);
    if (value) properties[key] = value;
  });
  window.pagePropertiesData = properties;

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event: 'standards.pageReady' });
}
