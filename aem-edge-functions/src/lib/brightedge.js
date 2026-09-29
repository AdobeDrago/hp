/*
 * BrightEdge IXF resolution — pure logic, no runtime (Fastly) dependencies.
 *
 * Reproduces how HP's BrightEdge IXF Java AEM SDK resolves the "Related links"
 * for a page, so we can render them server-side at the edge without BrightEdge
 * source access. Verified against the live api.brightedge.com capsule.
 *
 * Resolution has three tiers (see resolveLinks):
 *   1. page-specific  -> capsule.nodes[body_1] (used by the newsroom listing pages)
 *   2. page-group     -> match URL against capsule.config.page_groups[] rules,
 *                        then read capsule.page_group_nodes[groupName] (used by
 *                        article/deep pages, e.g. "AI and Omnibook")
 *   3. account default-> if capsule.account_id === 0, caller fetches default.json
 */

/**
 * Canonicalize an incoming (EDS) URL to the production hp.com URL that BrightEdge
 * keys on. EDS serves extensionless paths (/us-en/newsroom); BrightEdge hashes and
 * matches the live ".html" URLs (https://www.hp.com/us-en/newsroom.html). So we
 * force the canonical host and re-add the ".html" extension.
 *
 * @param {string} pathname e.g. "/us-en/newsroom" or "/us-en/newsroom/blogs/2026/foo"
 * @param {string} canonicalHost e.g. "www.hp.com"
 * @returns {string} e.g. "https://www.hp.com/us-en/newsroom.html"
 */
export function canonicalizeUrl(pathname, canonicalHost) {
  let path = pathname || '/';
  // strip a trailing slash (but keep root "/")
  if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1);
  // add .html unless the path already has an extension
  if (!/\.[a-z0-9]+$/i.test(path)) path += '.html';
  return `https://${canonicalHost}${path}`;
}

/**
 * BrightEdge page hash — a faithful port of IXFSDKUtils.getPageHash (PHP/Java SDK):
 * Java's 32-bit String.hashCode(); if the result is negative, return "0" + abs(hash),
 * otherwise the number as a string.
 *
 * @param {string} url normalized/canonical URL
 * @returns {string}
 */
export function getPageHash(url) {
  let hash = 0;
  for (let i = 0; i < url.length; i += 1) {
    hash = (Math.imul(hash, 31) + url.charCodeAt(i)) | 0; // signed 32-bit
  }
  return hash < 0 ? `0${-hash}` : String(hash);
}

/**
 * Decode the small set of HTML entities BrightEdge emits in link text.
 * @param {string} s
 * @returns {string}
 */
export function decodeEntities(s) {
  if (!s) return '';
  return s
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&#43;/g, '+')
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

/**
 * Parse a link-block node's `content` (a JSON string) into normalized links.
 * @param {string} content
 * @returns {{url:string,text:string}[]}
 */
function parseLinkNode(content) {
  if (!content) return [];
  let data;
  try {
    data = JSON.parse(content);
  } catch {
    return [];
  }
  const links = Array.isArray(data.links) ? data.links : [];
  return links
    .filter((l) => l && typeof l.url === 'string' && l.url.startsWith('https://'))
    .map((l) => ({ url: l.url, text: decodeEntities(l.h1 || '') }))
    .filter((l) => l.text);
}

/**
 * Find the first body_1 link-block node in a nodes array.
 * @param {any[]} nodes
 * @returns {string|null} the node content, or null
 */
function bodyContent(nodes) {
  if (!Array.isArray(nodes)) return null;
  const node = nodes.find(
    (n) => n.feature_group === 'body_1' && n.publishing_engine === 'link-block',
  );
  return node && node.content ? node.content : null;
}

/**
 * Derive the matching page group for a URL — a port of PageGroupEngine
 * (deriveCurrentPageGroup): iterate groups by ascending priority; for each, if any
 * exclude_rules regex matches, skip; else if any include_rules regex matches, that
 * group wins (first match). Regexes are case-insensitive; a bad regex is skipped.
 *
 * @param {any[]} pageGroups capsule.config.page_groups
 * @param {string} url canonical URL
 * @returns {string|null} winning group name
 */
export function derivePageGroup(pageGroups, url) {
  if (!Array.isArray(pageGroups)) return null;
  const groups = [...pageGroups].sort((a, b) => (a.priority || 0) - (b.priority || 0));
  const test = (rules) => (rules || []).some((r) => {
    try {
      return new RegExp(r, 'i').test(url);
    } catch {
      return false;
    }
  });
  for (const g of groups) {
    if (test(g.exclude_rules)) continue; // eslint-disable-line no-continue
    if (test(g.include_rules)) return g.name;
  }
  return null;
}

/**
 * Resolve links from a capsule for a canonical URL, tiers 1 and 2.
 * (Tier 3, default.json, is handled by the caller since it needs another fetch.)
 *
 * @param {object} capsule parsed capsule JSON
 * @param {string} url canonical URL
 * @returns {{links:{url:string,text:string}[], source:string}}
 */
export function resolveLinks(capsule, url) {
  if (!capsule || typeof capsule !== 'object') return { links: [], source: 'none' };

  // Tier 1: page-specific override
  const specific = parseLinkNode(bodyContent(capsule.nodes));
  if (specific.length) return { links: specific, source: 'page-specific' };

  // Tier 2: page-group match
  const groupName = derivePageGroup(capsule.config && capsule.config.page_groups, url);
  if (groupName && capsule.page_group_nodes && capsule.page_group_nodes[groupName]) {
    const groupLinks = parseLinkNode(bodyContent(capsule.page_group_nodes[groupName]));
    if (groupLinks.length) return { links: groupLinks, source: `page-group:${groupName}` };
  }

  return { links: [], source: 'empty' };
}

/**
 * Whether the caller should fall back to the account default capsule (default.json).
 * @param {object} capsule
 * @returns {boolean}
 */
export function needsDefaultCapsule(capsule) {
  return !!capsule && (capsule.account_id === 0 || capsule.account_id === '0');
}
