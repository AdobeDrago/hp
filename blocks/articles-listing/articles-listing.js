import { createOptimizedPicture } from '../../scripts/aem.js';

const DEFAULT_SOURCE = '/us-en/newsroom/query-index.json';
const BATCH = 9;

const MEDIA_TYPES = [
  { value: 'Press Release', label: 'Press Releases' },
  { value: 'Press Kit', label: 'Press Kits' },
  { value: 'Press Blog', label: 'Press Blog' },
];

// HP's fixed 46-topic taxonomy (slug -> label); articles store slugs in `topic`.
// Order matches the reference site's dropdown (most-used topics first, not
// alphabetical) rather than being resorted - so the two line up row-for-row.
const TOPICS = [
  ['print', 'Print'], ['community', 'Community'], ['megatrends', 'Megatrends'],
  ['healthcare', 'Healthcare'], ['urbanization', 'Urbanization'], ['mobility', 'Mobility'],
  ['legacy', 'Legacy'], ['gaming', 'Gaming'], ['manufacturing', 'Manufacturing'],
  ['security', 'Security'], ['entertainment', 'Entertainment'], ['virtual_reality', 'Virtual Reality'],
  ['diversity', 'Diversity'], ['reinvention', 'Reinvention'], ['hp_labs', 'HP Labs'],
  ['sustainability', 'Sustainability'], ['education', 'Education'], ['3d_printing', '3D Printing'],
  ['leadership', 'Leadership'], ['innovation', 'Innovation'], ['corporate', 'Corporate'],
  ['awards_recognition', 'Awards & Recognition'], ['financial', 'Financial'],
  ['graphic_arts', 'Graphic Arts'], ['science', 'Science'], ['health', 'Health'],
  ['sports', 'Sports'], ['work_life', 'Work-life'], ['home', 'Home'], ['printers', 'Printers'],
  ['personal_computers', 'Personal Computers'], ['events', 'Events'],
  ['tradeshows_events', 'Tradeshows + Events'], ['ces', 'CES'],
  ['desktop_computing', 'Desktop Computing'], ['blended_reality', 'Blended Reality'],
  ['mobile_computing', 'Mobile Computing'], ['consumer_printing', 'Consumer Printing'],
  ['enterprise_printing', 'Enterprise Printing'], ['graphics', 'Graphics'],
  ['small_business_printing', 'Small Business Printing'],
  ['technology_and_innovation', 'Technology and Innovation'], ['environment', 'Environment'],
  ['global_citizenship', 'Global Citizenship'], ['life_at_hp', 'Life at HP'],
  ['hybrid_work', 'Hybrid Work'],
].map(([value, label]) => ({ value, label }));

const LABELS = new Map([
  ...MEDIA_TYPES.map((m) => [m.value, m.label]),
  ...TOPICS.map((t) => [t.value, t.label]),
]);

// authors can pin this listing to one content type (e.g. a dedicated Press
// Releases page) by adding a line of text naming it, matched against either
// form so "Press Release" or "Press Releases" both work.
const MEDIA_TYPE_BY_TEXT = new Map(
  MEDIA_TYPES.flatMap((m) => [[m.value.toLowerCase(), m.value], [m.label.toLowerCase(), m.value]]),
);

const SORTS = [
  { id: 'az', label: 'A-Z' },
  { id: 'za', label: 'Z-A' },
  { id: 'newest', label: 'Newest - Oldest' },
  { id: 'oldest', label: 'Oldest - Newest' },
];

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
  // only real articles — excludes the landing page, this archive page, and any test pages
  return (json.data || []).filter((it) => it.title && it.title.trim()
    && /\/newsroom\/(press-releases|blogs|press-kits)\//.test(it.path));
}

function filterItems(items, state) {
  const kw = state.keyword.trim().toLowerCase();
  return items.filter((it) => {
    if (kw && !`${it.title} ${it.description || ''}`.toLowerCase().includes(kw)) return false;
    if (state.media.size && !state.media.has(it.type)) return false;
    if (state.topics.size) {
      const ts = (it.topic || '').split(',').map((s) => s.trim()).filter(Boolean);
      if (!ts.some((t) => state.topics.has(t))) return false;
    }
    return true;
  });
}

function sortItems(items, sort) {
  const a = [...items];
  if (sort === 'az') a.sort((x, y) => (x.title || '').localeCompare(y.title || ''));
  else if (sort === 'za') a.sort((x, y) => (y.title || '').localeCompare(x.title || ''));
  else if (sort === 'newest') a.sort((x, y) => itemDate(y) - itemDate(x));
  else if (sort === 'oldest') a.sort((x, y) => itemDate(x) - itemDate(y));
  return a;
}

function card(it) {
  const art = el('article', 'al-card');
  const media = el('a', 'al-card-media');
  media.href = it.path;
  if (it.image) media.append(createOptimizedPicture(it.image, it.title, false, [{ width: '750' }]));
  const body = el('div', 'al-card-body');
  const h = el('h3', 'al-card-title');
  const ha = el('a', null, it.title);
  ha.href = it.path;
  h.append(ha);
  body.append(h);
  const desc = (it.description || '').trim();
  if (desc && desc.toLowerCase() !== 'null') body.append(el('p', 'al-card-desc', desc));
  const cta = el('a', 'al-card-cta', 'Read');
  cta.href = it.path;
  body.append(cta);
  art.append(media, body);
  return art;
}

/** checkbox list for a facet group */
function checkList(group, options) {
  const list = el('div', 'al-checklist');
  options.forEach((o) => {
    const label = el('label', 'al-check-item');
    const input = el('input', 'al-check');
    input.type = 'checkbox';
    input.value = o.value;
    input.dataset.group = group;
    label.append(input, el('span', null, o.label));
    list.append(label);
  });
  return list;
}

function facetDropdown(title, group, options) {
  const root = el('div', `al-facet al-facet-${group}`);
  const btn = el('button', 'al-facet-btn', title);
  btn.type = 'button';
  btn.dataset.facet = group;
  const panel = el('div', 'al-facet-panel');
  panel.hidden = true;
  panel.append(checkList(group, options));
  root.append(btn, panel);
  return root;
}

function sortDropdown() {
  const root = el('div', 'al-sort');
  const btn = el('button', 'al-sort-btn', 'SORT');
  btn.type = 'button';
  const panel = el('div', 'al-sort-panel');
  panel.hidden = true;
  SORTS.forEach((s) => {
    const o = el('button', 'al-sort-option', s.label);
    o.type = 'button';
    o.dataset.sort = s.id;
    panel.append(o);
  });
  root.append(btn, panel);
  return root;
}

function collapsible(title, body) {
  const root = el('div', 'al-collapse');
  const btn = el('button', 'al-collapse-btn', title);
  btn.type = 'button';
  const wrap = el('div', 'al-collapse-body');
  wrap.hidden = true;
  wrap.append(body);
  root.append(btn, wrap);
  return root;
}

function modal(pinnedType) {
  const root = el('div', 'al-modal');
  root.hidden = true;
  const sheet = el('div', 'al-modal-sheet');

  const head = el('div', 'al-modal-head');
  const clear = el('button', 'al-clear al-modal-clear', 'Clear all filters');
  clear.type = 'button';
  const close = el('button', 'al-modal-close', '✕');
  close.type = 'button';
  head.append(clear, close);

  const kw = el('input', 'al-keyword');
  kw.type = 'search';
  kw.placeholder = 'Filter by keyword';

  const sortWrap = el('div', 'al-modal-sort');
  sortWrap.append(el('div', 'al-modal-sort-title', 'SORT'));
  SORTS.forEach((s) => {
    const label = el('label', 'al-radio-item');
    const input = el('input', 'al-sort-radio');
    input.type = 'radio';
    input.name = 'al-sort';
    input.value = s.id;
    label.append(input, el('span', null, s.label));
    sortWrap.append(label);
  });

  const view = el('button', 'al-modal-view', 'View items');
  view.type = 'button';

  sheet.append(
    head,
    kw,
    sortWrap,
    ...(pinnedType ? [] : [collapsible('Media Type', checkList('media', MEDIA_TYPES))]),
    collapsible('Topics', checkList('topics', TOPICS)),
    view,
  );
  root.append(sheet);
  return root;
}

export default async function decorate(block) {
  const link = block.querySelector('a[href]');
  const source = link ? link.getAttribute('href') : DEFAULT_SOURCE;

  // an optional authored line (e.g. "Press Releases") pins the listing to
  // that one content type instead of the full newsroom archive, for a page
  // dedicated to a single type.
  const pinnedType = [...block.querySelectorAll('p, div, li')]
    .map((n) => MEDIA_TYPE_BY_TEXT.get(n.textContent.trim().toLowerCase()))
    .find(Boolean);

  block.textContent = '';
  if (pinnedType) block.classList.add('al-type-pinned');

  const state = {
    keyword: '',
    media: new Set(pinnedType ? [pinnedType] : []),
    topics: new Set(),
    sort: 'newest',
    shown: BATCH,
  };

  const toolbar = el('div', 'al-toolbar');
  const mobileTrigger = el('button', 'al-mobile-trigger', 'Sort and Filter');
  mobileTrigger.type = 'button';
  const keyword = el('input', 'al-keyword');
  keyword.type = 'search';
  keyword.placeholder = 'Filter by keyword';
  const count = el('span', 'al-count', '0 Items');
  toolbar.append(
    mobileTrigger,
    keyword,
    ...(pinnedType ? [] : [facetDropdown('Media Type', 'media', MEDIA_TYPES)]),
    facetDropdown('Topics', 'topics', TOPICS),
    count,
    sortDropdown(),
  );

  const chips = el('div', 'al-chips');
  const grid = el('div', 'al-grid');
  const loadMore = el('button', 'al-loadmore', 'Load More');
  loadMore.type = 'button';
  const sheet = modal(pinnedType);
  block.append(toolbar, chips, grid, loadMore, sheet);

  // a pinned listing page titles itself (e.g. "Press Releases") unless the
  // author already placed a heading in the section; it becomes the page h1
  // when the page has none.
  const section = block.closest('.section');
  if (pinnedType && !section?.querySelector('h1, h2')) {
    const title = el(document.querySelector('main h1') ? 'h2' : 'h1', 'al-title', LABELS.get(pinnedType));
    block.prepend(title);
  }

  const items = await loadItems(source);

  function closePanels() {
    block.querySelectorAll('.al-facet-panel, .al-sort-panel').forEach((p) => { p.hidden = true; });
    block.querySelectorAll('.al-facet-btn, .al-sort-btn').forEach((b) => b.classList.remove('open'));
  }

  function renderChips() {
    chips.textContent = '';
    const active = [...[...state.media].filter((v) => v !== pinnedType).map((v) => ['media', v]),
      ...[...state.topics].map((v) => ['topics', v])];
    active.forEach(([group, value]) => {
      const chip = el('span', 'al-chip');
      chip.append(el('span', 'al-chip-x', '✕'));
      chip.append(el('span', null, LABELS.get(value) || value));
      chip.querySelector('.al-chip-x').dataset.group = group;
      chip.querySelector('.al-chip-x').dataset.value = value;
      chips.append(chip);
    });
    if (active.length) {
      const clr = el('button', 'al-clear', 'Clear all');
      clr.type = 'button';
      chips.append(clr);
    }
  }

  function syncControls() {
    block.querySelectorAll('input.al-check').forEach((c) => {
      c.checked = state[c.dataset.group].has(c.value);
    });
    block.querySelectorAll('input.al-keyword, .al-keyword').forEach((k) => {
      if (k.value !== state.keyword) k.value = state.keyword;
    });
    block.querySelectorAll('input.al-sort-radio').forEach((r) => {
      r.checked = r.value === state.sort;
    });
    block.querySelectorAll('.al-sort-option').forEach((o) => {
      o.classList.toggle('active', o.dataset.sort === state.sort);
    });
  }

  function apply(resetPage = true) {
    if (resetPage) state.shown = BATCH;
    const results = sortItems(filterItems(items, state), state.sort);
    count.textContent = `${results.length} Items`;
    grid.textContent = '';
    results.slice(0, state.shown).forEach((it) => grid.append(card(it)));
    loadMore.hidden = state.shown >= results.length;
    renderChips();
    syncControls();
  }

  block.addEventListener('input', (e) => {
    if (e.target.classList.contains('al-keyword')) {
      state.keyword = e.target.value;
      apply();
    }
  });

  block.addEventListener('change', (e) => {
    const t = e.target;
    if (t.classList.contains('al-check')) {
      const set = state[t.dataset.group];
      if (t.checked) set.add(t.value); else set.delete(t.value);
      apply();
    } else if (t.classList.contains('al-sort-radio')) {
      state.sort = t.value;
      apply();
    }
  });

  block.addEventListener('click', (e) => {
    const t = e.target;
    const facetBtn = t.closest('.al-facet-btn');
    const sortBtn = t.closest('.al-sort-btn');
    if (facetBtn) {
      const panel = facetBtn.nextElementSibling;
      const willOpen = panel.hidden;
      closePanels();
      panel.hidden = !willOpen;
      facetBtn.classList.toggle('open', willOpen);
      return;
    }
    if (sortBtn) {
      const panel = sortBtn.nextElementSibling;
      const willOpen = panel.hidden;
      closePanels();
      panel.hidden = !willOpen;
      sortBtn.classList.toggle('open', willOpen);
      return;
    }
    const sortOption = t.closest('.al-sort-option');
    if (sortOption) { state.sort = sortOption.dataset.sort; closePanels(); apply(); return; }
    if (t.closest('.al-chip-x')) {
      const x = t.closest('.al-chip-x');
      state[x.dataset.group].delete(x.dataset.value);
      apply();
      return;
    }
    if (t.closest('.al-clear')) {
      state.media = new Set(pinnedType ? [pinnedType] : []);
      state.topics.clear();
      apply();
      return;
    }
    if (t.closest('.al-loadmore')) { state.shown += BATCH; apply(false); return; }
    if (t.closest('.al-mobile-trigger')) { sheet.hidden = false; document.body.style.overflow = 'hidden'; return; }
    if (t.closest('.al-modal-close') || t.closest('.al-modal-view')) {
      sheet.hidden = true; document.body.style.overflow = ''; return;
    }
    const collapseBtn = t.closest('.al-collapse-btn');
    if (collapseBtn) {
      const body = collapseBtn.nextElementSibling;
      body.hidden = !body.hidden;
      collapseBtn.classList.toggle('open', !body.hidden);
      return;
    }
    if (!t.closest('.al-facet') && !t.closest('.al-sort')) closePanels();
  });

  apply();
}
