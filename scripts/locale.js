import { getMetadata } from './aem.js';

/**
 * hp.com style locale ("us-en") for the page: search-locale metadata,
 * then the first path segment, then us-en.
 * Kept in its own side-effect-free module so blocks can import it without
 * re-running scripts.js.
 */
export default function getPageLocale() {
  const [segment] = window.location.pathname.split('/').filter(Boolean);
  return getMetadata('search-locale')
    || (/^[a-z]{2}-[a-z]{2}$/.test(segment) ? segment : 'us-en');
}
