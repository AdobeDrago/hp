import { createOptimizedPicture } from '../../scripts/aem.js';

const DEFAULT_SOURCE = '/us-en/newsroom/query-index.json';
const PRESS_KITS_RE = /\/newsroom\/press-kits\//;
const COUNT = 4;

/** created-date (ISO string) or lastModified (epoch seconds) -> epoch ms */
function toEpoch(v) {
  if (v == null || v === '') return 0;
  const s = String(v);
  if (/^\d+$/.test(s)) {
    const n = Number(s);
    return n < 1e12 ? n * 1000 : n;
  }
  const t = Date.parse(s);
  return Number.isNaN(t) ? 0 : t;
}

const itemDate = (it) => toEpoch(it['created-date'] || it.lastModified);

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

/** a query-index link (source), vs a link to an individual article page */
function isIndexLink(href) {
  return /query-index|\.json(\?|#|$)/i.test(href);
}

/** normalize any href to a site-relative pathname for matching against the index */
function pathOf(href) {
  try {
    return new URL(href, window.location.origin).pathname.replace(/\.html$/, '');
  } catch {
    return href;
  }
}

async function loadIndex(source) {
  const res = await fetch(source);
  if (!res.ok) return [];
  const json = await res.json();
  return json.data || [];
}

function card(it) {
  const a = el('a', 'pkl-card');
  a.href = it.path;

  const media = el('span', 'pkl-card-media');
  if (it.image) {
    media.append(createOptimizedPicture(it.image, it.title, false, [{ width: '600' }]));
  }

  const title = el('span', 'pkl-card-title', it.title);
  a.append(media, title);
  return a;
}

function arrow(dir) {
  const d = dir === 'prev' ? 'M19 12H5M11 6l-6 6 6 6' : 'M5 12h14M13 6l6 6-6 6';
  const btn = el('button', `pkl-nav-btn pkl-${dir}`);
  btn.type = 'button';
  btn.setAttribute('aria-label', dir === 'prev' ? 'Previous' : 'Next');
  btn.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="${d}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  return btn;
}

/**
 * Resolve which articles to render. Two authoring modes:
 *  1. a single query-index.json link  -> the 4 most recent press-kit articles
 *  2. individual article-page links    -> exactly those articles, in order
 * Metadata (title/image) always comes from the query-index.
 */
async function resolveItems(links) {
  const indexLink = links.find((l) => isIndexLink(l.getAttribute('href')));

  if (indexLink || links.length === 0) {
    const source = indexLink ? indexLink.getAttribute('href') : DEFAULT_SOURCE;
    const data = await loadIndex(source);
    return data
      .filter((it) => it.title && it.title.trim() && PRESS_KITS_RE.test(it.path))
      .sort((a, b) => itemDate(b) - itemDate(a))
      .slice(0, COUNT);
  }

  const data = await loadIndex(DEFAULT_SOURCE);
  const byPath = new Map(data.map((it) => [it.path, it]));
  return links
    .map((l) => byPath.get(pathOf(l.getAttribute('href'))))
    .filter(Boolean);
}

export default async function decorate(block) {
  const links = [...block.querySelectorAll('a[href]')];
  block.textContent = '';

  const nav = el('div', 'pkl-nav');
  const prev = arrow('prev');
  const next = arrow('next');
  nav.append(prev, next);

  const track = el('div', 'pkl-track');
  block.append(nav, track);

  const items = await resolveItems(links);
  items.forEach((it) => track.append(card(it)));

  // ===== carousel (only functional when the track overflows, i.e. mobile) =====
  const scrollByCard = (dir) => {
    const first = track.querySelector('.pkl-card');
    const styles = getComputedStyle(track);
    const gap = parseFloat(styles.columnGap || styles.gap) || 0;
    const step = first ? first.getBoundingClientRect().width + gap : track.clientWidth;
    track.scrollBy({ left: dir * step, behavior: 'smooth' });
  };

  const updateNav = () => {
    const max = track.scrollWidth - track.clientWidth - 1;
    const overflows = max > 0;
    nav.hidden = !overflows;
    prev.disabled = track.scrollLeft <= 0;
    next.disabled = track.scrollLeft >= max;
  };

  prev.addEventListener('click', () => scrollByCard(-1));
  next.addEventListener('click', () => scrollByCard(1));
  track.addEventListener('scroll', updateNav, { passive: true });
  // ResizeObserver fires once on first layout and again on every viewport change,
  // so the arrows appear/hide correctly without depending on decorate-time metrics.
  new ResizeObserver(updateNav).observe(track);
}
