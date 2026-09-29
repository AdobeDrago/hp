/*
 * Related-links handler.
 *
 * For a newsroom page request:
 *   1. fetch the page HTML from the EDS origin,
 *   2. canonicalize the URL to the hp.com ".html" form BrightEdge keys on,
 *   3. fetch the BrightEdge capsule (with default.json fallback),
 *   4. resolve links (page-specific -> page-group), and
 *   5. inject the related-links block just before </main>.
 *
 * Anything that fails (origin error, capsule error, no links) degrades to serving
 * the origin HTML unchanged — the page must never break because of related links.
 */

/// <reference types="@fastly/js-compute" />

import { CacheOverride } from 'fastly:cache-override';
import { cfg } from './lib/config.js';
import {
  canonicalizeUrl, getPageHash, resolveLinks, needsDefaultCapsule,
} from './lib/brightedge.js';
import { buildRelatedLinksBlock, injectBeforeMain } from './lib/html.js';

const FORWARD_HEADERS = ['User-Agent', 'X-Forwarded-Host', 'Accept-Language'];

function originHeaders(req) {
  const h = new Headers();
  for (const name of FORWARD_HEADERS) {
    const v = req.headers.get(name);
    if (v !== null) h.set(name, v);
  }
  h.set('Accept', 'text/html');
  return h;
}

async function fetchJson(url, backend) {
  const res = await fetch(url, { backend, cacheOverride: new CacheOverride('pass') });
  if (!res.ok) return null;
  try {
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Fetch and resolve the BrightEdge links for a canonical URL.
 * @param {string} canonical
 * @returns {Promise<{links:{url:string,text:string}[], source:string}>}
 */
async function getLinks(canonical) {
  const base = `${cfg('BE_API')}/${cfg('BE_ACCOUNT')}`;
  const hash = getPageHash(canonical);
  let capsule = await fetchJson(`${base}/${hash}`, 'brightedge');
  if (!capsule) return { links: [], source: 'error' };

  let result = resolveLinks(capsule, canonical);
  if (!result.links.length && needsDefaultCapsule(capsule)) {
    capsule = await fetchJson(`${base}/default.json`, 'brightedge');
    if (capsule) result = resolveLinks(capsule, canonical);
  }
  return result;
}

/**
 * @param {Request} req
 * @returns {Promise<Response>}
 */
export default async function relatedLinksHandler(req) {
  const url = new URL(req.url);
  const originUrl = `${cfg('EDS_ORIGIN')}${url.pathname}${url.search}`;

  // 1. origin page
  const originRes = await fetch(originUrl, {
    backend: 'eds_origin',
    headers: originHeaders(req),
    cacheOverride: new CacheOverride('pass'),
  });

  const contentType = originRes.headers.get('content-type') || '';
  if (!originRes.ok || !contentType.includes('text/html')) {
    return originRes; // pass through non-HTML / errors untouched
  }

  const html = await originRes.text();

  // 2-4. resolve links (never let this break the page)
  let snippet = '';
  try {
    const canonical = canonicalizeUrl(url.pathname, cfg('CANONICAL_HOST'));
    const { links } = await getLinks(canonical);
    snippet = buildRelatedLinksBlock(links);
  } catch {
    snippet = '';
  }

  // 5. inject
  const body = injectBeforeMain(html, snippet);
  const headers = new Headers(originRes.headers);
  headers.delete('content-length');
  headers.delete('content-encoding');
  return new Response(body, { status: originRes.status, headers });
}
