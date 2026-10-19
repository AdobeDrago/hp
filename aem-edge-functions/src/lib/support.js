/*
 * Request checks for the support-search proxy. Kept free of Fastly imports so the
 * mocha tests can run them in plain Node.
 */

const MAX_QUERY_LENGTH = 100;
const MAX_LIMIT = 24;

/**
 * Validates the browser's query string and builds the upstream query string.
 * @param {URLSearchParams} params incoming ?q=&limit=&lang=
 * @returns {URLSearchParams|null} upstream params, or null when the request is invalid
 */
export function buildSupportParams(params) {
  const q = (params.get('q') || '').trim();
  if (!q || q.length > MAX_QUERY_LENGTH) return null;

  const limit = Math.min(Math.max(parseInt(params.get('limit'), 10) || 3, 1), MAX_LIMIT);
  const lang = /^[a-z]{2}$/.test(params.get('lang')) ? params.get('lang') : 'en';

  return new URLSearchParams({
    q,
    resultLimit: limit,
    languageCode: lang,
    store: 'tmsstore',
    printFields: 'productid,productname,seofriendlyname',
    filters: 'class:(pm_series_value OR pm_name_value OR pm_number_value)',
    excludeDescendants: true,
  });
}

/**
 * Keeps only the fields the site uses, so nothing else from the upstream leaks through.
 * @param {string} text upstream body (may be empty when the key is wrong)
 * @returns {{results: Array<{productid: string, productname: string, seofriendlyname: string}>}}
 */
export function pickSupportResults(text) {
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = {};
  }
  const results = (data.results || []).map((r) => ({
    productid: r.productid,
    productname: r.productname,
    seofriendlyname: r.seofriendlyname,
  }));
  return { results };
}
