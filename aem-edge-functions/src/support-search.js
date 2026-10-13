/*
 * Proxy for the HP support catalog typeahead (css.api.hp.com).
 *
 * The upstream needs an x-api-key. Calling it from the browser would expose the key,
 * so the site calls GET /api/support-search?q=&limit=&lang= and this function adds
 * the key from the SUPPORT_API_KEY config value (a Cloud Manager secret).
 */

/// <reference types="@fastly/js-compute" />

import { cfg } from './lib/config.js';
import { buildSupportParams, pickSupportResults } from './lib/support.js';

function json(body, status, cacheSeconds = 0) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': cacheSeconds ? `public, max-age=${cacheSeconds}` : 'no-store',
    },
  });
}

export default async function supportSearchHandler(req) {
  if (req.method !== 'GET') return json({ error: 'method not allowed' }, 405);

  const params = buildSupportParams(new URL(req.url).searchParams);
  if (!params) return json({ results: [] }, 400);

  const apiKey = cfg('SUPPORT_API_KEY');
  // no key configured yet: answer like "no matches" so the site just hides Support
  if (!apiKey) return json({ results: [] }, 200);

  try {
    const resp = await fetch(`${cfg('SUPPORT_API')}?${params}`, {
      backend: 'hp_support',
      headers: { accept: 'application/json', 'x-api-key': apiKey },
    });
    if (!resp.ok) return json({ results: [] }, 200);
    return json(pickSupportResults(await resp.text()), 200, 300);
  } catch {
    return json({ results: [] }, 200);
  }
}
