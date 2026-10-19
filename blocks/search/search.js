import { fetchPlaceholders, readBlockConfig } from '../../scripts/aem.js';
import {
  HAWK_SEARCH_API, createElement, createImage, getField, formatPrice,
  fetchSupport, getClientGuid, supportProductUrl, supportSearchUrl,
} from '../../scripts/search-utils.js';

const SUPPORT_LIMIT = 24;

// gives each search block on a page its own ids
let blockCount = 0;

const TABS = [
  { type: 'product', label: 'Shop', placeholder: 'searchShop' },
  { type: 'content', label: 'Explore', placeholder: 'searchExplore' },
  { type: 'support', label: 'Support', placeholder: 'searchSupport' },
];

const SORT_OPTIONS = [
  { value: 'score', label: 'Best match', placeholder: 'searchSortBest' },
  { value: 'priceasc', label: 'Price: low to high', placeholder: 'searchSortPriceAsc' },
  { value: 'pricedsc', label: 'Price: high to low', placeholder: 'searchSortPriceDesc' },
  { value: 'new', label: 'Newest', placeholder: 'searchSortNewest' },
  { value: 'rating', label: 'Top rated', placeholder: 'searchSortRating' },
];

async function fetchResults(clientGuid, {
  keyword, type, page, sortBy,
}, signal) {
  const resp = await fetch(HAWK_SEARCH_API, {
    method: 'POST',
    signal,
    headers: {
      'Content-Type': 'application/json',
      'X-HawkSearch-ClientGuid': clientGuid,
    },
    body: JSON.stringify({
      Keyword: keyword,
      Query: `type:${type}`,
      PageNo: page,
      // the sort options are product sorts; other tabs always use relevance
      SortBy: type === 'product' ? sortBy : 'score',
    }),
  });
  if (!resp.ok) throw new Error(`search failed: ${resp.status}`);
  return resp.json();
}

function buildProductCard(doc) {
  const link = createElement('a', 'search-card search-product');
  link.href = getField(doc, 'pdp_url') || '#';

  const image = getField(doc, 'previewimage') || getField(doc, 'thumbnailimage');
  if (image) {
    const media = createElement('div', 'search-card-image');
    media.append(createImage(image));
    link.append(media);
  }

  link.append(createElement('h3', 'search-card-title', getField(doc, 'prodname') || getField(doc, 'product_name')));

  const specs = (doc.overview || []).slice(0, 4);
  if (specs.length) {
    const list = createElement('ul', 'search-card-specs');
    specs.forEach((spec) => list.append(createElement('li', '', spec)));
    link.append(list);
  }

  const salePrice = formatPrice(getField(doc, 'sale_price'));
  const listPrice = formatPrice(getField(doc, 'list_price'));
  if (salePrice) {
    const price = createElement('p', 'search-card-price', salePrice);
    if (listPrice && listPrice !== salePrice) {
      price.append(' ', createElement('s', '', listPrice));
    }
    link.append(price);
  }
  return link;
}

function buildContentCard(doc) {
  const link = createElement('a', 'search-card search-content');
  link.href = getField(doc, 'pdp_url') || '#';

  const image = getField(doc, 'thumbnailimage');
  if (image) {
    const media = createElement('div', 'search-card-image');
    media.append(createImage(image));
    link.append(media);
  }
  link.append(
    createElement('h3', 'search-card-title', getField(doc, 'product_name')),
    createElement('p', 'search-card-text', getField(doc, 'description')),
  );
  return link;
}

function buildSupportCard(product) {
  const link = createElement('a', 'search-card search-support', product.productname);
  link.href = supportProductUrl(product);
  return link;
}

export default async function decorate(block) {
  const config = readBlockConfig(block);
  const clientGuid = config['client-guid'] || getClientGuid();
  const placeholders = await fetchPlaceholders();
  const label = (key, fallback) => placeholders[key] || fallback;

  blockCount += 1;
  const id = `search-${blockCount}`;
  // q/type/page/sort are page-wide, so only the first search block reads and writes them
  const syncUrl = blockCount === 1;

  block.innerHTML = `
    <form class="search-box" role="search">
      <input type="search" name="q" autocomplete="off">
      <button type="submit" class="search-submit"></button>
    </form>
    <div class="search-tabs" role="tablist"></div>
    <div class="search-toolbar">
      <p class="search-summary" aria-live="polite"></p>
      <label class="search-sort-label"><span></span> <select class="search-sort"></select></label>
    </div>
    <div class="search-panel" id="${id}-panel" role="tabpanel">
      <ul class="search-results"></ul>
    </div>
    <nav class="search-pagination"></nav>
  `;

  const form = block.querySelector('.search-box');
  const input = form.querySelector('input');
  const tabList = block.querySelector('.search-tabs');
  const summary = block.querySelector('.search-summary');
  const sortLabel = block.querySelector('.search-sort-label');
  const sortSelect = block.querySelector('.search-sort');
  const tabPanel = block.querySelector('.search-panel');
  const results = block.querySelector('.search-results');
  const pagination = block.querySelector('.search-pagination');

  form.setAttribute('aria-label', label('searchResultsFormLabel', 'Search results'));
  input.placeholder = label('searchPlaceholder', 'What are you looking for?');
  input.setAttribute('aria-label', input.placeholder);
  form.querySelector('.search-submit').textContent = label('searchButton', 'Search');
  sortLabel.querySelector('span').textContent = label('searchSortBy', 'Sort by');
  pagination.setAttribute('aria-label', label('searchPages', 'Search results pages'));
  SORT_OPTIONS.forEach((option) => {
    sortSelect.add(new Option(label(option.placeholder, option.label), option.value));
  });

  // the url is the source of truth, so links, reloads and back/forward all restore a search
  function readStateFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const sort = params.get('sort');
    return {
      keyword: (params.get('q') || '').trim(),
      type: TABS.some((tab) => tab.type === params.get('type')) ? params.get('type') : 'product',
      page: Math.max(parseInt(params.get('page'), 10) || 1, 1),
      sortBy: SORT_OPTIONS.some((option) => option.value === sort) ? sort : 'score',
    };
  }
  const state = syncUrl ? readStateFromUrl() : {
    keyword: '', type: 'product', page: 1, sortBy: 'score',
  };
  let controller;

  TABS.forEach((tab) => {
    const button = createElement('button', 'search-tab', label(tab.placeholder, tab.label));
    button.type = 'button';
    button.id = `${id}-tab-${tab.type}`;
    button.dataset.type = tab.type;
    button.setAttribute('role', 'tab');
    button.setAttribute('aria-controls', tabPanel.id);
    tabList.append(button);
  });

  // user actions add a history entry; corrections (first load, page clamp) replace it
  function updateUrl(addHistory) {
    if (!syncUrl) return;
    const url = new URL(window.location.href);
    url.searchParams.set('q', state.keyword);
    url.searchParams.set('type', state.type);
    if (state.page > 1) url.searchParams.set('page', state.page);
    else url.searchParams.delete('page');
    if (state.sortBy !== 'score') url.searchParams.set('sort', state.sortBy);
    else url.searchParams.delete('sort');
    if (url.href === window.location.href) return;
    if (addHistory) window.history.pushState(null, '', url);
    else window.history.replaceState(window.history.state, '', url);
  }

  function updateTabs() {
    tabList.querySelectorAll('.search-tab').forEach((button) => {
      const selected = button.dataset.type === state.type;
      button.setAttribute('aria-selected', selected);
      button.tabIndex = selected ? 0 : -1;
    });
    tabPanel.setAttribute('aria-labelledby', `${id}-tab-${state.type}`);
    sortLabel.hidden = state.type !== 'product';
  }

  function renderPagination(totalPages, goToPage) {
    pagination.textContent = '';
    if (totalPages < 2) return;

    // keep five page buttons, even near the start or end
    const first = Math.max(1, Math.min(state.page - 2, totalPages - 4));
    const last = Math.min(totalPages, first + 4);
    const addButton = (text, page, disabled, isPageNumber = false) => {
      const button = createElement('button', '', text);
      button.type = 'button';
      button.disabled = disabled;
      if (isPageNumber && page === state.page) button.setAttribute('aria-current', 'page');
      button.addEventListener('click', () => goToPage(page));
      pagination.append(button);
    };

    addButton(label('searchPrevious', 'Prev'), state.page - 1, state.page === 1);
    for (let page = first; page <= last; page += 1) addButton(String(page), page, false, true);
    addButton(label('searchNext', 'Next'), state.page + 1, state.page === totalPages);
  }

  function showNoResults() {
    summary.textContent = `${label('searchNoResults', 'No results found for')} "${state.keyword}"`;
    if (state.type === 'support') {
      const link = createElement('a', '', label('searchSupportLink', 'Search HP Support'));
      link.href = supportSearchUrl(state.keyword);
      summary.append('. ', link);
    }
  }

  async function runSearch(scroll = false, addHistory = false) {
    updateTabs();
    if (!state.keyword) {
      if (controller) controller.abort();
      // drop the old ?q= too, or a reload would bring the previous results back
      if (syncUrl) {
        const url = new URL(window.location.href);
        ['q', 'page', 'sort'].forEach((param) => url.searchParams.delete(param));
        window.history.replaceState(window.history.state, '', url);
      }
      block.classList.remove('is-loading');
      results.textContent = '';
      pagination.textContent = '';
      summary.textContent = label('searchEnterTerm', 'Enter a search term to see results.');
      return;
    }

    if (controller) controller.abort();
    controller = new AbortController();
    const { signal } = controller;
    block.classList.add('is-loading');
    updateUrl(addHistory);

    try {
      let cards;
      let total;
      let totalPages = 0;

      if (state.type === 'support') {
        const products = await fetchSupport(state.keyword, SUPPORT_LIMIT, signal);
        cards = products.map(buildSupportCard);
        total = products.length;
      } else {
        const data = await fetchResults(clientGuid, state, signal);
        const buildCard = state.type === 'product' ? buildProductCard : buildContentCard;
        cards = (data.Results || []).map((result) => buildCard(result.Document));
        total = data.Pagination?.NofResults || 0;
        totalPages = data.Pagination?.NofPages || 0;
        // a ?page= past the end (old link, fewer results now) goes to the last page instead
        if (totalPages && state.page > totalPages) {
          state.page = totalPages;
          runSearch(scroll);
          return;
        }
      }

      results.replaceChildren(...cards.map((card) => {
        const li = createElement('li');
        li.append(card);
        return li;
      }));

      if (state.type === 'support' && total >= SUPPORT_LIMIT) {
        // the support api only returns its top matches, so don't present them as the full count
        const topFor = label('searchTopSupportFor', 'Top support matches for');
        summary.textContent = `${topFor} "${state.keyword}"`;
        const more = createElement('a', '', label('searchSupportLink', 'Search HP Support'));
        more.href = supportSearchUrl(state.keyword);
        summary.append('. ', more);
      } else if (total) {
        const resultsFor = label('searchResultsFor', 'results for');
        summary.textContent = `${total.toLocaleString()} ${resultsFor} "${state.keyword}"`;
      } else {
        showNoResults();
      }

      renderPagination(totalPages, (page) => {
        state.page = page;
        runSearch(true, true);
      });
      if (scroll) block.scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
      if (error.name === 'AbortError') return;
      results.textContent = '';
      pagination.textContent = '';
      summary.textContent = label('searchError', 'Search is unavailable right now. Please try again later.');
    }

    block.classList.remove('is-loading');
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    state.keyword = input.value.trim();
    state.page = 1;
    runSearch(false, true);
  });

  function selectTab(tab, addHistory = true) {
    if (tab.dataset.type === state.type) return;
    state.type = tab.dataset.type;
    state.page = 1;
    runSearch(false, addHistory);
  }

  tabList.addEventListener('click', (e) => {
    const tab = e.target.closest('.search-tab');
    if (tab) selectTab(tab);
  });

  // arrow keys move between tabs, as in the ARIA tabs pattern
  tabList.addEventListener('keydown', (e) => {
    const tabs = [...tabList.querySelectorAll('.search-tab')];
    const index = tabs.indexOf(document.activeElement);
    if (index === -1) return;
    const next = {
      ArrowRight: tabs[(index + 1) % tabs.length],
      ArrowLeft: tabs[(index - 1 + tabs.length) % tabs.length],
      Home: tabs[0],
      End: tabs[tabs.length - 1],
    }[e.key];
    if (!next) return;
    e.preventDefault();
    next.focus();
    // arrowing across tabs shouldn't leave a back-button step for each one
    selectTab(next, false);
  });

  sortSelect.addEventListener('change', () => {
    state.sortBy = sortSelect.value;
    state.page = 1;
    runSearch(false, true);
  });

  if (syncUrl) {
    window.addEventListener('popstate', () => {
      Object.assign(state, readStateFromUrl());
      input.value = state.keyword;
      sortSelect.value = state.sortBy;
      runSearch();
    });
  }

  input.value = state.keyword;
  sortSelect.value = state.sortBy;
  runSearch();
}
