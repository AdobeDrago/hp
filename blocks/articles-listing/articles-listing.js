import { createOptimizedPicture } from '../../scripts/aem.js';

const DEFAULT_SOURCE = '/us-en/newsroom/query-index.json';
const BATCH = 9;

const VIEW_ALL = '__all';

const MEDIA_TYPES = [
  { value: 'Press Release', label: 'Press Releases' },
  { value: 'Press Kit', label: 'Press Kits' },
  { value: 'Press Blog', label: 'Press Blogs' },
];

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
].map(([value, label]) => ({ value, label }))
  .sort((a, b) => a.label.localeCompare(b.label));

const LABELS = new Map([
  ...MEDIA_TYPES.map((m) => [m.value, m.label]),
  ...TOPICS.map((t) => [t.value, t.label]),
]);

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

const DEFAULT_GTM_ID = 'archive_link_placement';

/** adds GTM link-click tracking attributes; value is the article slug */
function addGtm(anchor, path, gtmId) {
  const slug = path.split('/').pop().replace(/\.html$/, '');
  anchor.dataset.gtmId = gtmId;
  anchor.dataset.gtmValue = slug;
  anchor.dataset.gtmCategory = 'linkClick';
}

function card(it, level, gtmId) {
  const art = el('article', 'al-card');
  const media = el('div', 'al-card-media');
  if (it.image) media.append(createOptimizedPicture(it.image, it.title, false, [{ width: '750' }]));
  const body = el('div', 'al-card-body');
  const h = el(`h${level}`, 'al-card-title');
  h.append(el('span', 'al-card-title-text', it.title));
  body.append(h);
  const desc = (it.description || '').trim();
  if (desc && desc.toLowerCase() !== 'null') body.append(el('p', 'al-card-desc', desc));
  const cta = el('a', 'al-card-cta', 'Read');
  cta.append(el('span', 'al-sr-only', `: ${it.title}`));
  cta.href = it.path;
  addGtm(cta, it.path, gtmId);
  body.append(cta);
  art.append(media, body);
  return art;
}

/** checkbox list for a facet group */
function checkList(group, options) {
  const list = el('div', 'al-checklist');
  const opts = group === 'media'
    ? [{ value: VIEW_ALL, label: 'View All' }, ...options]
    : options;
  opts.forEach((o) => {
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
  btn.setAttribute('aria-expanded', 'false');
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
  btn.setAttribute('aria-expanded', 'false');
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

function collapsible(title, body, open = false) {
  const root = el('div', 'al-collapse');
  const btn = el('button', `al-collapse-btn${open ? ' open' : ''}`, title);
  btn.type = 'button';
  btn.setAttribute('aria-expanded', String(open));
  const wrap = el('div', 'al-collapse-body');
  wrap.hidden = !open;
  wrap.append(body);
  root.append(btn, wrap);
  return root;
}

/** radio list for the mobile sheet's Media Type (single choice, View All first) */
function mediaRadios() {
  const radios = el('div', 'al-radios');
  [{ value: VIEW_ALL, label: 'View All' }, ...MEDIA_TYPES].forEach((o) => {
    const label = el('label', 'al-radio-item');
    const input = el('input', 'al-media-radio');
    input.type = 'radio';
    input.name = 'al-media';
    input.value = o.value;
    label.append(input, el('span', null, o.label));
    radios.append(label);
  });
  return radios;
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

  // SORT folds open/closed like the filters below it, open to start (hp.com)
  const radios = el('div', 'al-radios');
  SORTS.forEach((s) => {
    const label = el('label', 'al-radio-item');
    const input = el('input', 'al-sort-radio');
    input.type = 'radio';
    input.name = 'al-sort';
    input.value = s.id;
    label.append(input, el('span', null, s.label));
    radios.append(label);
  });
  const sortWrap = collapsible('SORT', radios, true);
  sortWrap.classList.add('al-modal-sort');

  const view = el('button', 'al-modal-view', 'View items');
  view.type = 'button';

  sheet.append(
    head,
    kw,
    sortWrap,
    ...(pinnedType ? [] : [collapsible('Media Type', mediaRadios())]),
    collapsible('Topics', checkList('topics', TOPICS)),
    view,
  );
  root.append(sheet);
  return root;
}

export default async function decorate(block) {
  // gtm id comes from the metadata attribute (data-gtm_id) on an ancestor, else the default
  const gtmHolder = block.closest('[data-gtm_id]');
  const gtmId = gtmHolder?.dataset.gtm_id || DEFAULT_GTM_ID;
  gtmHolder?.removeAttribute('data-gtm_id'); // keep the metadata attribute off the wrapper div
  const link = block.querySelector('a[href]');
  const source = link ? link.getAttribute('href') : DEFAULT_SOURCE;

  const pinnedType = [...block.querySelectorAll('p, div, li')]
    .filter((n) => !n.querySelector('p, div, li'))
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
  const empty = el('p', 'al-empty', 'No results found.');
  empty.setAttribute('role', 'status');
  empty.hidden = true;
  block.append(toolbar, chips, grid, empty, loadMore, sheet);

  const section = block.closest('.section');
  let heading = [...(section?.querySelectorAll('h1, h2') || [])]
    .filter((h) => !block.contains(h)
      && h.compareDocumentPosition(block) === Node.DOCUMENT_POSITION_FOLLOWING)
    .pop();
  if (pinnedType && !heading) {
    heading = el(document.querySelector('main h1') ? 'h2' : 'h1', 'al-title', LABELS.get(pinnedType));
    block.prepend(heading);
  }
  const cardLevel = heading ? Number(heading.tagName[1]) + 1 : 3;

  const items = await loadItems(source);

  function closePanels() {
    block.querySelectorAll('.al-facet-panel, .al-sort-panel').forEach((p) => { p.hidden = true; });
    block.querySelectorAll('.al-facet-btn, .al-sort-btn').forEach((b) => {
      b.classList.remove('open');
      b.setAttribute('aria-expanded', 'false');
    });
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
      c.checked = c.value === VIEW_ALL
        ? state.media.size === 0
        : state[c.dataset.group].has(c.value);
    });
    block.querySelectorAll('input.al-keyword, .al-keyword').forEach((k) => {
      if (k.value !== state.keyword) k.value = state.keyword;
    });
    block.querySelectorAll('input.al-sort-radio').forEach((r) => {
      r.checked = r.value === state.sort;
    });
    block.querySelectorAll('input.al-media-radio').forEach((r) => {
      r.checked = r.value === VIEW_ALL ? state.media.size === 0 : state.media.has(r.value);
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
    results.slice(0, state.shown).forEach((it) => grid.append(card(it, cardLevel, gtmId)));
    loadMore.hidden = state.shown >= results.length;
    grid.hidden = !results.length;
    empty.hidden = results.length > 0;
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
      if (t.dataset.group === 'media') {
        state.media.clear();
        if (t.value !== VIEW_ALL && t.checked) state.media.add(t.value);
      } else {
        const set = state[t.dataset.group];
        if (t.checked) set.add(t.value); else set.delete(t.value);
      }
      apply();
    } else if (t.classList.contains('al-media-radio')) {
      state.media.clear();
      if (t.value !== VIEW_ALL) state.media.add(t.value);
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
      facetBtn.setAttribute('aria-expanded', String(willOpen));
      return;
    }
    if (sortBtn) {
      const panel = sortBtn.nextElementSibling;
      const willOpen = panel.hidden;
      closePanels();
      panel.hidden = !willOpen;
      sortBtn.classList.toggle('open', willOpen);
      sortBtn.setAttribute('aria-expanded', String(willOpen));
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
      collapseBtn.setAttribute('aria-expanded', String(!body.hidden));
    }
  });

  document.addEventListener('click', (e) => {
    if (!block.contains(e.target) || !e.target.closest('.al-facet, .al-sort')) closePanels();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const openBtn = block.querySelector('.al-facet-btn.open, .al-sort-btn.open');
    if (!openBtn) return;
    closePanels();
    openBtn.focus();
  });

  apply();
}
