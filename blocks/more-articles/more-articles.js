import { createOptimizedPicture } from '../../scripts/aem.js';

const DEFAULT_SOURCE = '/us-en/newsroom/query-index.json';
const SKIP = 4; // the latest-news block already shows the first 4
const COUNT = 6;

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

async function loadItems(source) {
  const res = await fetch(source);
  if (!res.ok) return [];
  const json = await res.json();
  // only real articles — excludes the landing page, the archive page, and any test pages
  return (json.data || []).filter((it) => it.title && it.title.trim()
    && /\/newsroom\/(press-releases|blogs|press-kits)\//.test(it.path));
}

const DEFAULT_GTM_ID = 'newsroom_article_grid';

/** adds GTM link-click tracking attributes; value is the article slug */
function addGtm(anchor, path, gtmId) {
  const slug = path.split('/').pop().replace(/\.html$/, '');
  anchor.dataset.gtmId = gtmId;
  anchor.dataset.gtmValue = slug;
  anchor.dataset.gtmCategory = 'linkClick';
}

function card(it, gtmId) {
  const art = el('article', 'ma-card');

  const media = el('a', 'ma-card-media');
  media.href = it.path;
  addGtm(media, it.path, gtmId);
  media.setAttribute('aria-label', it.title);
  if (it.image) {
    media.append(createOptimizedPicture(it.image, it.title, false, [{ width: '750' }]));
  }

  const body = el('div', 'ma-card-body');

  const h = el('h3', 'ma-card-title');
  const ha = el('a', null, it.title);
  ha.href = it.path;
  addGtm(ha, it.path, gtmId);
  h.append(ha);
  body.append(h);

  const cta = el('a', 'ma-card-cta');
  cta.href = it.path;
  addGtm(cta, it.path, gtmId);
  cta.setAttribute('aria-label', `Read: ${it.title}`);
  const icon = el('span', 'ma-card-cta-icon');
  icon.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  cta.append(icon, el('span', 'ma-card-cta-label', 'Read'));
  body.append(cta);

  art.append(media, body);
  return art;
}

export default async function decorate(block) {
  // gtm id comes from the metadata attribute (data-gtm_id) on an ancestor, else the default
  const gtmId = block.closest('[data-gtm_id]')?.dataset.gtm_id || DEFAULT_GTM_ID;
  const link = block.querySelector('a[href]');
  const source = link ? link.getAttribute('href') : DEFAULT_SOURCE;
  block.textContent = '';

  const grid = el('div', 'ma-grid');
  block.append(grid);

  const items = await loadItems(source);
  const next = [...items]
    .sort((a, b) => itemDate(b) - itemDate(a))
    .slice(SKIP, SKIP + COUNT);

  next.forEach((it) => grid.append(card(it, gtmId)));
}
