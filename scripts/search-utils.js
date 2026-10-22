import { getMetadata, fetchPlaceholders } from './aem.js';
import getPageLocale from './locale.js';

export const HAWK_AUTOCOMPLETE_API = 'https://hp.searchapi-na.hawksearch.com/api/v2/autocomplete';
export const HAWK_SEARCH_API = 'https://hp.searchapi-na.hawksearch.com/api/v2/search';

const SUPPORT_SITE = 'https://support.hp.com';
const HP_SITE = 'https://www.hp.com';

// origin serving this code; differs from the page origin when embedded on another site
const CODE_ORIGIN = new URL(import.meta.url).origin;
export const isEmbedded = CODE_ORIGIN !== window.location.origin;

// metadata of this site's own pages, for when the header is embedded and the host page has none
const siteMeta = {};
let siteMetaLoaded;

export function loadSiteMetadata() {
  if (!isEmbedded) return Promise.resolve();
  if (!siteMetaLoaded) {
    siteMetaLoaded = fetch(`${CODE_ORIGIN}/nav`)
      .then((resp) => (resp.ok ? resp.text() : ''))
      .then((html) => {
        new DOMParser().parseFromString(html, 'text/html')
          .querySelectorAll('meta[name^="search-"], meta[name="support-search-url"]')
          .forEach((meta) => { siteMeta[meta.name] = meta.content; });
      })
      .catch(() => {});
  }
  return siteMetaLoaded;
}

/** page metadata, else this site's metadata (embedded; call loadSiteMetadata first) */
export function getSearchConfig(name) {
  return getMetadata(name) || siteMeta[name];
}

/** placeholders.json of this site; embedded, the host's own /placeholders.json is the wrong one */
export function loadPlaceholders() {
  return fetchPlaceholders(isEmbedded ? CODE_ORIGIN : 'default');
}

/**
 * Works out the hp.com style locale ("us-en") for search. Uses the
 * search-locale metadata, then the first path segment, then us-en.
 */
export function getSearchLocale() {
  const locale = getPageLocale();
  const [country, language] = locale.split('-');
  return {
    locale,
    country,
    language,
    // prices come from the US HawkSearch store, so they're USD unless HP gives us another store
    currency: getSearchConfig('search-currency') || 'USD',
  };
}

/** hawksearch client guid, from the search-client-guid metadata */
export function getClientGuid() {
  return getSearchConfig('search-client-guid');
}

export function createElement(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text) el.textContent = text;
  return el;
}

export function createImage(src) {
  const img = document.createElement('img');
  img.src = src;
  img.alt = '';
  img.loading = 'lazy';
  return img;
}

// hawksearch sends some values url-encoded; a stray % would make decodeURIComponent throw
export function safeDecode(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function supportProductUrl(product) {
  const { locale } = getSearchLocale();
  return `${SUPPORT_SITE}/${locale}/product/${product.seofriendlyname}/${product.productid}`;
}

/** hp.com site search for a keyword; the content tab adds type=content */
export function hpSearchUrl(keyword, type) {
  const { locale } = getSearchLocale();
  const suffix = type && type !== 'product' ? `&type=${type}` : '';
  return `${HP_SITE}/${locale}/shop/sitesearch?keyword=${encodeURIComponent(keyword)}${suffix}`;
}

export function supportSearchUrl(keyword) {
  const { locale } = getSearchLocale();
  return `${SUPPORT_SITE}/${locale}/search?q=${encodeURIComponent(keyword)}`;
}

// hawksearch wraps every field in an array
export function getField(doc, name) {
  return doc?.[name]?.[0] || '';
}

// built once per page; a bad search-currency value falls back to USD instead of throwing
let priceFormat;
function getPriceFormat() {
  if (!priceFormat) {
    const { country, language, currency } = getSearchLocale();
    const locale = `${language}-${country.toUpperCase()}`;
    try {
      priceFormat = new Intl.NumberFormat(locale, { style: 'currency', currency });
    } catch {
      priceFormat = new Intl.NumberFormat(locale, { style: 'currency', currency: 'USD' });
    }
  }
  return priceFormat;
}

export function formatPrice(value) {
  const price = parseFloat(value);
  if (Number.isNaN(price)) return '';
  return getPriceFormat().format(price);
}

/**
 * Support catalog matches. Goes through our edge proxy, which adds the HP support
 * API key server-side, so the key never reaches the browser.
 */
export async function fetchSupport(keyword, limit, signal) {
  const configured = getSearchConfig('support-search-url');
  try {
    if (!configured) {
      // no support endpoint configured; serve canned matches from tools/mock-data
      const resp = await fetch(`${CODE_ORIGIN}/tools/mock-data/support-search.json`, { signal });
      if (!resp.ok) return [];
      const mock = await resp.json();
      const key = Object.keys(mock).find((k) => keyword.toLowerCase().includes(k));
      return key ? mock[key].results.slice(0, limit) : [];
    }
    const params = new URLSearchParams({ q: keyword, limit, lang: getSearchLocale().language });
    const resp = await fetch(`${configured}?${params}`, { signal });
    // the proxy only runs on the CDN domain; a 404 elsewhere just means no support results
    if (!resp.ok) return [];
    return (await resp.json()).results || [];
  } catch (e) {
    if (e.name === 'AbortError') throw e;
    return [];
  }
}
