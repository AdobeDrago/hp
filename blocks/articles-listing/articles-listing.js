import { createOptimizedPicture } from '../../scripts/aem.js';

const DEFAULT_SOURCE = '/us-en/newsroom/query-index.json';
const BATCH = 9;

const MEDIA_TYPES = [
  { value: 'Press Release', label: 'Press Releases' },
  { value: 'Press Kit', label: 'Press Kits' },
  { value: 'Press Blog', label: 'Press Blog' },
];

// HP's fixed 46-topic taxonomy (slug -> label); articles store slugs in `topic`.
const TOPICS = [
  ['3d_printing', '3D Printing'], ['awards_recognition', 'Awards & Recognition'],
  ['blended_reality', 'Blended Reality'], ['ces', 'CES'], ['community', 'Community'],
  ['consumer_printing', 'Consumer Printing'], ['corporate', 'Corporate'],
  ['desktop_computing', 'Desktop Computing'], ['diversity', 'Diversity'],
  ['education', 'Education'], ['enterprise_printing', 'Enterprise Printing'],
  ['entertainment', 'Entertainment'], ['environment', 'Environment'], ['events', 'Events'],
  ['financial', 'Financial'], ['gaming', 'Gaming'], ['global_citizenship', 'Global Citizenship'],
  ['graphic_arts', 'Graphic Arts'], ['graphics', 'Graphics'], ['health', 'Health'],
  ['healthcare', 'Healthcare'], ['home', 'Home'], ['hp_labs', 'HP Labs'],
  ['hybrid_work', 'Hybrid Work'], ['innovation', 'Innovation'], ['leadership', 'Leadership'],
  ['legacy', 'Legacy'], ['life_at_hp', 'Life at HP'], ['manufacturing', 'Manufacturing'],
  ['megatrends', 'Megatrends'], ['mobile_computing', 'Mobile Computing'], ['mobility', 'Mobility'],
  ['personal_computers', 'Personal Computers'], ['print', 'Print'], ['printers', 'Printers'],
  ['reinvention', 'Reinvention'], ['science', 'Science'], ['security', 'Security'],
  ['small_business_printing', 'Small Business Printing'], ['sports', 'Sports'],
  ['sustainability', 'Sustainability'], ['technology_and_innovation', 'Technology and Innovation'],
  ['tradeshows_events', 'Tradeshows + Events'], ['urbanization', 'Urbanization'],
  ['virtual_reality', 'Virtual Reality'], ['work_life', 'Work-life'],
].map(([value, label]) => ({ value, label }));

const LABELS = new Map([
  ...MEDIA_TYPES.map((m) => [m.value, m.label]),
  ...TOPICS.map((t) => [t.value, t.label]),
]);

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
  const root = el('div', 'al-facet');
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

function modal() {
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
    collapsible('Media Type', checkList('media', MEDIA_TYPES)),
    collapsible('Topics', checkList('topics', TOPICS)),
    view,
  );
  root.append(sheet);
  return root;
}

export default async function decorate(block) {
  const link = block.querySelector('a[href]');
  const source = link ? link.getAttribute('href') : DEFAULT_SOURCE;
  block.textContent = '';

  const state = {
    keyword: '', media: new Set(), topics: new Set(), sort: 'newest', shown: BATCH,
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
    facetDropdown('Media Type', 'media', MEDIA_TYPES),
    facetDropdown('Topics', 'topics', TOPICS),
    count,
    sortDropdown(),
  );

  const chips = el('div', 'al-chips');
  const grid = el('div', 'al-grid');
  const loadMore = el('button', 'al-loadmore', 'Load More');
  loadMore.type = 'button';
  const sheet = modal();
  block.append(toolbar, chips, grid, loadMore, sheet);

  const items = await loadItems(source);

  function closePanels() {
    block.querySelectorAll('.al-facet-panel, .al-sort-panel').forEach((p) => { p.hidden = true; });
    block.querySelectorAll('.al-facet-btn, .al-sort-btn').forEach((b) => b.classList.remove('open'));
  }

  function renderChips() {
    chips.textContent = '';
    const active = [...[...state.media].map((v) => ['media', v]),
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
      state.media.clear(); state.topics.clear();
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
