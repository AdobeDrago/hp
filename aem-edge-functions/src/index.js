/*
 * Edge function entry point.
 *
 * Routing:
 *   - /us-en/newsroom[/...] page requests  -> relatedLinksHandler (inject links)
 *   - /blocks/related-links/related-links.{js,css} -> serve the in-development block
 *     from this project (DEMO CONVENIENCE so the styled block loads locally without
 *     first pushing blocks/related-links to a branch; in production these come from
 *     the EDS code bus and this route is harmless/removable)
 *   - everything else -> transparent proxy to the EDS origin
 *
 * Assets are copied into ./assets by the "prebuild" npm script (source of truth is
 * the repo-root blocks/related-links/).
 */

/// <reference types="@fastly/js-compute" />

import { includeBytes } from 'fastly:experimental';
import { CacheOverride } from 'fastly:cache-override';
import { cfg } from './lib/config.js';
import relatedLinksHandler from './related-links.js';

const BLOCK_JS = includeBytes('./assets/related-links/related-links.js');
const BLOCK_CSS = includeBytes('./assets/related-links/related-links.css');

function assetResponse(bytes, contentType) {
  return new Response(bytes, {
    status: 200,
    headers: { 'content-type': contentType, 'cache-control': 'no-store' },
  });
}

function isNewsroomPage(pathname) {
  const prefix = cfg('NEWSROOM_PREFIX');
  const inNewsroom = pathname === prefix
    || pathname === `${prefix}.html`
    || pathname.startsWith(`${prefix}/`);
  if (!inNewsroom) return false;
  // EDS pages are extensionless (or .html); anything with another extension
  // (.json, .js, .png, ...) is an asset and should pass through.
  return !/\.[a-z0-9]+$/i.test(pathname) || pathname.endsWith('.html');
}

async function handleRequest(event) {
  const req = event.request;
  const url = new URL(req.url);
  const p = url.pathname;

  try {
    if (p === '/blocks/related-links/related-links.js') {
      return assetResponse(BLOCK_JS, 'text/javascript; charset=utf-8');
    }
    if (p === '/blocks/related-links/related-links.css') {
      return assetResponse(BLOCK_CSS, 'text/css; charset=utf-8');
    }
    if (isNewsroomPage(p) && req.method === 'GET') {
      return await relatedLinksHandler(req);
    }
    // transparent proxy for all other assets/pages so the site works end-to-end
    return await fetch(`${cfg('EDS_ORIGIN')}${p}${url.search}`, {
      backend: 'eds_origin',
      cacheOverride: new CacheOverride('pass'),
    });
  } catch (err) {
    return new Response(`Edge error: ${err.message}`, { status: 502 });
  }
}

addEventListener('fetch', (event) => event.respondWith(handleRequest(event)));
