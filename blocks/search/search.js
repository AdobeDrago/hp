import { fetchPlaceholders, getMetadata, readBlockConfig } from '../../scripts/aem.js';
import {
  createElement, createImage, getField, formatPrice, getSearchLocale,
} from '../../scripts/search-utils.js';

const SEARCH_API = 'https://hp.searchapi-na.hawksearch.com/api/v2/search';
const SUPPORT_API = 'https://css.api.hp.com/knowledge/v2/typeahead/search';
const DEFAULT_CLIENT_GUID = 'bdeebee3d2b74c8ea58522bb1db61f8e';
const SUPPORT_URL = 'https://support.hp.com';

const TABS = [
  { type: 'product', label: 'Shop', placeholder: 'searchShop' },
  { type: 'content', label: 'Explore', placeholder: 'searchExplore' },
  { type: 'support', label: 'Support', placeholder: 'searchSupport' },
];

const SORT_OPTIONS = [
  { value: 'score', label: 'Best match' },
  { value: 'priceasc', label: 'Price: low to high' },
  { value: 'pricedsc', label: 'Price: high to low' },
  { value: 'new', label: 'Newest' },
  { value: 'rating', label: 'Top rated' },
];

async function fetchResults(clientGuid, {
  keyword, type, page, perPage, sortBy,
}, signal) {
  const resp = await fetch(SEARCH_API, {
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
      MaxPerPage: perPage,
      SortBy: sortBy,
    }),
  });
  if (!resp.ok) throw new Error(`search failed: ${resp.status}`);
  return resp.json();
}

async function fetchSupport(apiKey, keyword, signal) {
  if (!apiKey) return [];
  const params = new URLSearchParams({
    q: keyword,
    resultLimit: 24,
    languageCode: getSearchLocale().language,
    store: 'tmsstore',
    printFields: 'productid,productname,seofriendlyname',
    filters: 'class:(pm_series_value OR pm_name_value OR pm_number_value)',
    excludeDescendants: true,
  });
  const resp = await fetch(`${SUPPORT_API}?${params}`, {
    signal,
    headers: { 'x-api-key': apiKey },
  });
  // returns an empty 200 when the key is missing or wrong
  const text = await resp.text();
  return text ? JSON.parse(text).results || [] : [];
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
  const { locale } = getSearchLocale();
  link.href = `${SUPPORT_URL}/${locale}/product/${product.seofriendlyname}/${product.productid}`;
  return link;
}

export default async function decorate(block) {
  const config = readBlockConfig(block);
  const clientGuid = config['client-guid'] || getMetadata('search-client-guid') || DEFAULT_CLIENT_GUID;
  const supportApiKey = config['support-api-key'] || getMetadata('support-api-key');
  const perPage = parseInt(config['results-per-page'], 10) || 24;
  const placeholders = await fetchPlaceholders();
  const label = (key, fallback) => placeholders[key] || fallback;

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
    <ul class="search-results" id="search-results" role="tabpanel"></ul>
    <nav class="search-pagination"></nav>
  `;

  const form = block.querySelector('.search-box');
  const input = form.querySelector('input');
  const tabList = block.querySelector('.search-tabs');
  const summary = block.querySelector('.search-summary');
  const sortLabel = block.querySelector('.search-sort-label');
  const sortSelect = block.querySelector('.search-sort');
  const results = block.querySelector('.search-results');
  const pagination = block.querySelector('.search-pagination');

  input.placeholder = label('searchPlaceholder', 'What are you looking for?');
  input.setAttribute('aria-label', input.placeholder);
  form.querySelector('.search-submit').textContent = label('searchButton', 'Search');
  sortLabel.querySelector('span').textContent = label('searchSortBy', 'Sort by');
  pagination.setAttribute('aria-label', label('searchPages', 'Search results pages'));
  SORT_OPTIONS.forEach((option) => sortSelect.add(new Option(option.label, option.value)));

  const params = new URLSearchParams(window.location.search);
  const state = {
    keyword: (params.get('q') || '').trim(),
    type: TABS.some((tab) => tab.type === params.get('type')) ? params.get('type') : 'product',
    page: parseInt(params.get('page'), 10) || 1,
    sortBy: 'score',
  };
  let controller;

  TABS.forEach((tab) => {
    const button = createElement('button', 'search-tab', label(tab.placeholder, tab.label));
    button.type = 'button';
    button.id = `search-tab-${tab.type}`;
    button.dataset.type = tab.type;
    button.setAttribute('role', 'tab');
    button.setAttribute('aria-controls', results.id);
    tabList.append(button);
  });

  function updateUrl() {
    const url = new URL(window.location.href);
    url.searchParams.set('q', state.keyword);
    url.searchParams.set('type', state.type);
    if (state.page > 1) url.searchParams.set('page', state.page);
    else url.searchParams.delete('page');
    window.history.replaceState({}, '', url);
  }

  function updateTabs() {
    tabList.querySelectorAll('.search-tab').forEach((button) => {
      const selected = button.dataset.type === state.type;
      button.setAttribute('aria-selected', selected);
      button.tabIndex = selected ? 0 : -1;
    });
    results.setAttribute('aria-labelledby', `search-tab-${state.type}`);
    sortLabel.hidden = state.type !== 'product';
  }

  function renderPagination(totalPages, goToPage) {
    pagination.textContent = '';
    if (totalPages < 2) return;

    const first = Math.max(1, state.page - 2);
    const last = Math.min(totalPages, first + 4);
    const addButton = (text, page, disabled) => {
      const button = createElement('button', '', text);
      button.type = 'button';
      button.disabled = disabled;
      if (text === String(state.page)) button.setAttribute('aria-current', 'page');
      button.addEventListener('click', () => goToPage(page));
      pagination.append(button);
    };

    addButton(label('searchPrevious', 'Prev'), state.page - 1, state.page === 1);
    for (let page = first; page <= last; page += 1) addButton(String(page), page, false);
    addButton(label('searchNext', 'Next'), state.page + 1, state.page === totalPages);
  }

  function showNoResults() {
    summary.textContent = `${label('searchNoResults', 'No results found for')} "${state.keyword}"`;
    if (state.type === 'support') {
      const link = createElement('a', '', label('searchSupportLink', 'Search HP Support'));
      link.href = `${SUPPORT_URL}/${getSearchLocale().locale}/search?q=${encodeURIComponent(state.keyword)}`;
      summary.append('. ', link);
    }
  }

  async function runSearch(scroll = false) {
    updateTabs();
    if (!state.keyword) {
      summary.textContent = label('searchEnterTerm', 'Enter a search term to see results.');
      return;
    }

    if (controller) controller.abort();
    controller = new AbortController();
    const { signal } = controller;
    block.classList.add('is-loading');
    updateUrl();

    try {
      let cards;
      let total;
      let totalPages = 0;

      if (state.type === 'support') {
        const products = await fetchSupport(supportApiKey, state.keyword, signal);
        cards = products.map(buildSupportCard);
        total = products.length;
      } else {
        const data = await fetchResults(clientGuid, { ...state, perPage }, signal);
        const buildCard = state.type === 'product' ? buildProductCard : buildContentCard;
        cards = (data.Results || []).map((result) => buildCard(result.Document));
        total = data.Pagination?.NofResults || 0;
        totalPages = data.Pagination?.NofPages || 0;
      }

      results.replaceChildren(...cards.map((card) => {
        const li = createElement('li');
        li.append(card);
        return li;
      }));

      if (total) {
        const resultsFor = label('searchResultsFor', 'results for');
        summary.textContent = `${total.toLocaleString()} ${resultsFor} "${state.keyword}"`;
      } else {
        showNoResults();
      }

      renderPagination(totalPages, (page) => {
        state.page = page;
        runSearch(true);
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
    runSearch();
  });

  function selectTab(tab) {
    if (tab.dataset.type === state.type) return;
    state.type = tab.dataset.type;
    state.page = 1;
    runSearch();
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
    selectTab(next);
  });

  sortSelect.addEventListener('change', () => {
    state.sortBy = sortSelect.value;
    state.page = 1;
    runSearch();
  });

  input.value = state.keyword;
  runSearch();
}
