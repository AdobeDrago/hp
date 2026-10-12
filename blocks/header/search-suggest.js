import { fetchPlaceholders, getMetadata, loadCSS } from '../../scripts/aem.js';
import {
  createElement, createImage, getField, formatPrice, getSearchLocale,
} from '../../scripts/search-utils.js';

const AUTOCOMPLETE_API = 'https://hp.searchapi-na.hawksearch.com/api/v2/autocomplete';
const SUPPORT_API = 'https://css.api.hp.com/knowledge/v2/typeahead/search';
const DEFAULT_CLIENT_GUID = 'bdeebee3d2b74c8ea58522bb1db61f8e';
const DEFAULT_RESULTS_PAGE = '/search';
const SUPPORT_URL = 'https://support.hp.com';

const MIN_CHARS = 2;

function pushSearchEvent(event, term) {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event, search_term: term });
}

// autocomplete items keep their fields under Results.Document
function itemField(item, name) {
  return getField(item.Results?.Document, name);
}

// "omen <b>laptop</b>" -> text + <strong>, no innerHTML
function buildSuggestionLabel(value) {
  const fragment = document.createDocumentFragment();
  value.split(/(<b>.*?<\/b>)/).filter(Boolean).forEach((part) => {
    if (part.startsWith('<b>')) {
      fragment.append(createElement('strong', '', part.replace(/<\/?b>/g, '')));
    } else {
      fragment.append(part);
    }
  });
  return fragment;
}

async function fetchSuggestions(clientGuid, keyword, signal) {
  const resp = await fetch(AUTOCOMPLETE_API, {
    method: 'POST',
    signal,
    headers: {
      'Content-Type': 'application/json',
      'X-HawkSearch-ClientGuid': clientGuid,
    },
    body: JSON.stringify({
      Keyword: keyword,
      FieldOverride: ['product_name', 'pdp_url', 'sale_price', 'list_price', 'thumbnailimage', 'description'],
    }),
  });
  if (!resp.ok) throw new Error(`autocomplete failed: ${resp.status}`);
  return resp.json();
}

async function fetchSupport(apiKey, keyword, signal) {
  if (!apiKey) return [];
  const params = new URLSearchParams({
    q: keyword,
    resultLimit: 3,
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

function buildSection(title, count, seeAllUrl, seeAllLabel) {
  const section = createElement('section', 'nav-search-section');
  const heading = createElement('h3', '', title);
  if (count) heading.append(createElement('span', '', `(${count})`));
  const seeAll = createElement('a', '', seeAllLabel);
  seeAll.href = seeAllUrl;
  heading.append(seeAll);

  const list = createElement('ul');
  section.append(heading, list);
  return { section, list };
}

function buildProductCard(product) {
  const link = createElement('a', 'nav-search-card nav-search-product');
  link.href = itemField(product, 'pdp_url') || product.Url;

  const body = createElement('div');
  body.append(createElement('p', 'nav-search-card-title', itemField(product, 'product_name') || product.ProductName));

  const salePrice = formatPrice(itemField(product, 'sale_price'));
  const listPrice = formatPrice(itemField(product, 'list_price'));
  if (listPrice && listPrice !== salePrice) {
    const msrp = createElement('p', 'nav-search-msrp', 'MSRP ');
    msrp.append(createElement('s', '', listPrice));
    body.append(msrp);
  }
  if (salePrice) body.append(createElement('p', 'nav-search-price', salePrice));

  link.append(createImage(itemField(product, 'thumbnailimage') || product.Thumb?.Url), body);
  return link;
}

function buildContentCard(item) {
  const link = createElement('a', 'nav-search-card nav-search-content');
  link.href = itemField(item, 'pdp_url') || item.Url;

  const body = createElement('div');
  body.append(
    createElement('p', 'nav-search-card-title', itemField(item, 'product_name') || item.Value),
    createElement('p', 'nav-search-card-text', itemField(item, 'description')),
  );

  link.append(createImage(itemField(item, 'thumbnailimage') || item.Thumb?.Url), body);
  return link;
}

function buildSupportCard(product) {
  const link = createElement('a', 'nav-search-card nav-search-support', product.productname);
  const { locale } = getSearchLocale();
  link.href = `${SUPPORT_URL}/${locale}/product/${product.seofriendlyname}/${product.productid}`;
  return link;
}

/** results panel under the header search; open/close of the bar lives in header.js */
export default async function initSearchPanel(nav, form, input) {
  const [placeholders] = await Promise.all([
    fetchPlaceholders(),
    loadCSS(`${window.hlx.codeBasePath}/blocks/header/search-suggest.css`),
  ]);
  const clientGuid = getMetadata('search-client-guid') || DEFAULT_CLIENT_GUID;
  const supportApiKey = getMetadata('support-api-key');
  const resultsPage = getMetadata('search-results-page') || DEFAULT_RESULTS_PAGE;
  const resultsUrl = (keyword, type = 'product') => `${resultsPage}?q=${encodeURIComponent(keyword)}&type=${type}`;
  const label = (key, fallback) => placeholders[key] || fallback;

  const panel = createElement('div', 'nav-search-panel');
  panel.id = 'nav-search-panel';
  panel.hidden = true;
  const backdrop = createElement('div', 'nav-search-backdrop');
  backdrop.hidden = true;
  nav.append(panel, backdrop);
  input.setAttribute('aria-controls', panel.id);

  let controller;
  let debounceTimer;

  function hidePanel() {
    clearTimeout(debounceTimer);
    if (controller) controller.abort();
    panel.classList.remove('is-loading');
    panel.hidden = true;
    backdrop.hidden = true;
  }

  function showPanel() {
    nav.style.setProperty('--search-panel-top', `${nav.getBoundingClientRect().bottom}px`);
    panel.hidden = false;
    backdrop.hidden = false;
  }

  function renderPanel(keyword, data, support) {
    const seeAll = label('searchSeeAll', 'See all');

    const suggestions = createElement('div', 'nav-search-suggestions');
    const suggestionList = createElement('ul');
    (data.Popular || []).forEach((term) => {
      const link = createElement('a');
      link.href = resultsUrl(decodeURIComponent(term.RawValue));
      link.append(buildSuggestionLabel(term.Value));
      const li = createElement('li');
      li.append(link);
      suggestionList.append(li);
    });
    const allResults = createElement('a', 'nav-search-all', label('searchSeeAllResults', 'See all results'));
    allResults.href = resultsUrl(keyword);
    const suggestionsTitle = createElement('h3', '', label('searchSuggestions', 'Suggestions'));
    suggestions.append(suggestionsTitle, suggestionList, allResults);

    const results = createElement('div', 'nav-search-results');
    const addSection = (title, count, url, cards) => {
      if (!cards.length) return;
      const { section, list } = buildSection(title, count, url, seeAll);
      cards.forEach((card) => {
        const li = createElement('li');
        li.append(card);
        list.append(li);
      });
      results.append(section);
    };

    const products = (data.Products || []).slice(0, 3);
    // skip articles with no url
    const articles = (data.Content || []).filter((c) => itemField(c, 'pdp_url') || c.Url).slice(0, 3);
    addSection(
      label('searchShop', 'Shop'),
      data.ProductCount,
      resultsUrl(keyword),
      products.map(buildProductCard),
    );
    addSection(
      label('searchExplore', 'Explore'),
      data.ContentCount,
      resultsUrl(keyword, 'content'),
      articles.map(buildContentCard),
    );
    addSection(
      label('searchSupport', 'Support'),
      0,
      resultsUrl(keyword, 'support'),
      support.map(buildSupportCard),
    );

    if (!results.children.length) {
      const message = `${label('searchNoResults', 'No results for')} "${keyword}"`;
      results.append(createElement('p', 'nav-search-empty', message));
      pushSearchEvent('search_zero_results', keyword);
    }

    const inner = createElement('div', 'nav-search-panel-inner');
    inner.append(suggestions, results);
    panel.replaceChildren(inner);
    panel.classList.remove('is-loading');
    showPanel();
  }

  async function loadResults(keyword) {
    if (controller) controller.abort();
    controller = new AbortController();
    const { signal } = controller;

    // keep old results visible while loading; show a message the first time
    if (!panel.children.length) {
      panel.append(createElement('p', 'nav-search-loading', label('searchLoading', 'Searching...')));
    }
    panel.classList.add('is-loading');
    panel.setAttribute('aria-busy', 'true');
    showPanel();

    const [suggestions, support] = await Promise.allSettled([
      fetchSuggestions(clientGuid, keyword, signal),
      fetchSupport(supportApiKey, keyword, signal),
    ]);
    if (signal.aborted) return;
    panel.removeAttribute('aria-busy');
    if (suggestions.status !== 'fulfilled') {
      hidePanel();
      return;
    }
    renderPanel(keyword, suggestions.value, support.status === 'fulfilled' ? support.value : []);
  }

  function onInput() {
    clearTimeout(debounceTimer);
    const keyword = input.value.trim();
    if (keyword.length < MIN_CHARS) {
      hidePanel();
      return;
    }
    debounceTimer = setTimeout(() => loadResults(keyword), 250);
  }

  input.addEventListener('input', onInput);

  form.addEventListener('submit', (e) => {
    const keyword = input.value.trim();
    if (!keyword) {
      e.preventDefault();
      return;
    }
    pushSearchEvent('search_submit', keyword);
  });

  panel.addEventListener('click', (e) => {
    if (e.target.closest('a')) pushSearchEvent('search_suggestion_click', input.value.trim());
  });

  backdrop.addEventListener('click', () => {
    hidePanel();
    if (nav.classList.contains('nav-search-open')) nav.querySelector('.nav-search-close')?.click();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') hidePanel();
  });

  // close along with the header search, whatever closed it
  let wasOpen = nav.classList.contains('nav-search-open');
  new MutationObserver(() => {
    const isOpen = nav.classList.contains('nav-search-open');
    if (wasOpen && !isOpen) hidePanel();
    wasOpen = isOpen;
  }).observe(nav, { attributes: true, attributeFilter: ['class'] });

  // in case they typed before this loaded
  if (input.value.trim()) onInput();
}
