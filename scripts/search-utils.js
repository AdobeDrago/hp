import { getMetadata } from './aem.js';

const CURRENCIES = {
  us: 'USD',
  ca: 'CAD',
  uk: 'GBP',
  in: 'INR',
  au: 'AUD',
  jp: 'JPY',
  de: 'EUR',
  fr: 'EUR',
  es: 'EUR',
  it: 'EUR',
  nl: 'EUR',
};

/**
 * Works out the hp.com style locale ("us-en") for search. Uses the
 * search-locale metadata, then the first path segment, then us-en.
 */
export function getSearchLocale() {
  const [segment] = window.location.pathname.split('/').filter(Boolean);
  const locale = getMetadata('search-locale')
    || (/^[a-z]{2}-[a-z]{2}$/.test(segment) ? segment : 'us-en');
  const [country, language] = locale.split('-');
  return {
    locale,
    country,
    language,
    currency: CURRENCIES[country] || 'USD',
  };
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

// hawksearch wraps every field in an array
export function getField(doc, name) {
  return doc?.[name]?.[0] || '';
}

export function formatPrice(value) {
  const price = parseFloat(value);
  if (Number.isNaN(price)) return '';
  const { country, language, currency } = getSearchLocale();
  return price.toLocaleString(`${language}-${country.toUpperCase()}`, { style: 'currency', currency });
}
