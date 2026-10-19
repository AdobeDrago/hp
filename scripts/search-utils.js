import { getMetadata } from './aem.js';
import getPageLocale from './locale.js';

export const HAWK_AUTOCOMPLETE_API = 'https://hp.searchapi-na.hawksearch.com/api/v2/autocomplete';
export const HAWK_SEARCH_API = 'https://hp.searchapi-na.hawksearch.com/api/v2/search';
const DEFAULT_CLIENT_GUID = 'bdeebee3d2b74c8ea58522bb1db61f8e';

const SUPPORT_SITE = 'https://support.hp.com';

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
    currency: getMetadata('search-currency') || 'USD',
  };
}

/** hawksearch client guid; search-client-guid metadata, else HP's default */
export function getClientGuid() {
  return getMetadata('search-client-guid') || DEFAULT_CLIENT_GUID;
}

/** search results page; search-results-page metadata, else /<locale>/newsroom/search */
export function getResultsPage() {
  return getMetadata('search-results-page') || `/${getSearchLocale().locale}/newsroom/search`;
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
  const endpoint = getMetadata('support-search-url') || '/api/support-search';
  const params = new URLSearchParams({ q: keyword, limit, lang: getSearchLocale().language });
  const resp = await fetch(`${endpoint}?${params}`, { signal });
  // the proxy only runs on the CDN domain; a 404 elsewhere just means no support results
  if (!resp.ok) return [];
  try {
    return (await resp.json()).results || [];
  } catch {
    return [];
  }
}
