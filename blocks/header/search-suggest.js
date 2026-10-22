import {
  HAWK_AUTOCOMPLETE_API, createElement, createImage, getField, formatPrice,
  fetchSupport, getResultsPage, getClientGuid, safeDecode, supportProductUrl,
  hpSearchUrl, supportSearchUrl, loadSiteMetadata, loadPlaceholders,
} from '../../scripts/search-utils.js';

const MIN_CHARS = 2;

// same as global-nav.js: absolute url from this module, into whichever root holds the header
function loadStyles(nav) {
  const { href } = new URL('./search-suggest.css', import.meta.url);
  const root = nav.getRootNode();
  const target = root instanceof ShadowRoot ? root : document.head;
  if (target.querySelector(`link[href="${href}"]`)) return Promise.resolve();
  return new Promise((resolve) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.onload = resolve;
    link.onerror = resolve;
    target.append(link);
  });
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
  if (!clientGuid) throw new Error('search-client-guid metadata is not set');
  const resp = await fetch(HAWK_AUTOCOMPLETE_API, {
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

// listbox may only own groups and options, so headings are role="none" and only name their group
function buildSection(key, title, count, seeAllUrl, seeAllLabel) {
  const section = createElement('section', 'nav-search-section');
  const head = createElement('div', 'nav-search-heading');
  const heading = createElement('h3', '', title);
  heading.id = `nav-search-${key}`;
  heading.setAttribute('role', 'none');
  if (count) heading.append(createElement('span', '', `(${count})`));
  const seeAll = createElement('a', '', seeAllLabel);
  seeAll.href = seeAllUrl;
  head.append(heading, seeAll);
  section.setAttribute('role', 'group');
  section.setAttribute('aria-labelledby', heading.id);

  const list = createElement('ul');
  section.append(head, list);
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
  link.href = supportProductUrl(product);
  return link;
}

/** results panel under the header search; open/close of the bar lives in header.js */
export default async function initSearchPanel(nav, form, input) {
  const [placeholders] = await Promise.all([
    loadPlaceholders(),
    loadSiteMetadata(),
    loadStyles(nav),
  ]);
  const clientGuid = getClientGuid();
  const resultsPage = getResultsPage();
  form.action = resultsPage;
  form.dataset.ready = 'true';
  // without a hawksearch client guid there is nothing to suggest; the plain form still submits
  if (!clientGuid) return;
  const label = (key, fallback) => placeholders[key] || fallback;
  form.setAttribute('aria-label', label('searchSiteLabel', 'Site search'));

  const panel = createElement('div', 'nav-search-panel');
  panel.id = 'nav-search-panel';
  panel.hidden = true;
  panel.setAttribute('role', 'listbox');
  panel.setAttribute('aria-label', label('searchSuggestionsLabel', 'Search suggestions'));
  const backdrop = createElement('div', 'nav-search-backdrop');
  backdrop.hidden = true;
  nav.append(panel, backdrop);
  input.setAttribute('role', 'combobox');
  input.setAttribute('aria-autocomplete', 'list');
  input.setAttribute('aria-expanded', 'false');
  input.setAttribute('aria-controls', panel.id);

  let controller;
  let debounceTimer;
  let activeIndex = -1;

  const getOptions = () => [...panel.querySelectorAll('[role="option"]')];

  // focus stays in the input; the highlighted option is announced via aria-activedescendant
  function setActive(index) {
    const options = getOptions();
    options.forEach((option) => option.classList.remove('is-active'));
    activeIndex = index;
    const active = options[index];
    if (active) {
      active.classList.add('is-active');
      active.scrollIntoView({ block: 'nearest' });
      input.setAttribute('aria-activedescendant', active.id);
    } else {
      input.removeAttribute('aria-activedescendant');
    }
  }

  function hidePanel() {
    clearTimeout(debounceTimer);
    if (controller) controller.abort();
    panel.classList.remove('is-loading');
    panel.removeAttribute('aria-busy');
    panel.hidden = true;
    backdrop.hidden = true;
    input.setAttribute('aria-expanded', 'false');
    setActive(-1);
  }

  function showPanel() {
    nav.style.setProperty('--search-panel-top', `${nav.getBoundingClientRect().bottom}px`);
    panel.hidden = false;
    backdrop.hidden = false;
    input.setAttribute('aria-expanded', 'true');
  }

  function renderPanel(keyword, data, support) {
    const seeAll = label('searchSeeAll', 'See all');

    const suggestions = createElement('div', 'nav-search-suggestions');
    const suggestionList = createElement('ul');
    (data.Popular || []).forEach((term) => {
      const link = createElement('a');
      link.href = hpSearchUrl(safeDecode(term.RawValue));
      link.append(buildSuggestionLabel(term.Value));
      const li = createElement('li');
      li.append(link);
      suggestionList.append(li);
    });
    const allResults = createElement('a', 'nav-search-all', label('searchSeeAllResults', 'See all results'));
    allResults.href = hpSearchUrl(keyword);
    const suggestionsTitle = createElement('h3', '', label('searchSuggestions', 'Suggestions'));
    suggestionsTitle.id = 'nav-search-suggestions';
    suggestionsTitle.setAttribute('role', 'none');
    suggestions.setAttribute('role', 'group');
    suggestions.setAttribute('aria-labelledby', suggestionsTitle.id);
    suggestions.append(suggestionsTitle, suggestionList, allResults);

    const results = createElement('div', 'nav-search-results');
    const addSection = (key, title, count, url, cards) => {
      if (!cards.length) return;
      const { section, list } = buildSection(key, title, count, url, seeAll);
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
      'shop',
      label('searchShop', 'Shop'),
      data.ProductCount,
      hpSearchUrl(keyword),
      products.map(buildProductCard),
    );
    addSection(
      'explore',
      label('searchExplore', 'Explore'),
      data.ContentCount,
      hpSearchUrl(keyword, 'content'),
      articles.map(buildContentCard),
    );
    addSection(
      'support',
      label('searchSupport', 'Support'),
      0,
      supportSearchUrl(keyword),
      support.map(buildSupportCard),
    );

    if (!results.children.length) {
      const message = `${label('searchNoResults', 'No results for')} "${keyword}"`;
      results.append(createElement('p', 'nav-search-empty', message));
    }

    const inner = createElement('div', 'nav-search-panel-inner');
    inner.append(suggestions, results);
    panel.replaceChildren(inner);
    panel.querySelectorAll('ul, li, .nav-search-heading, .nav-search-panel-inner, .nav-search-results')
      .forEach((el) => el.setAttribute('role', 'none'));
    panel.querySelectorAll('a').forEach((link, i) => {
      link.id = `nav-search-option-${i}`;
      link.setAttribute('role', 'option');
      link.tabIndex = -1;
    });
    setActive(-1);
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
      fetchSupport(keyword, 3, signal),
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
    if (!input.value.trim()) e.preventDefault();
  });

  backdrop.addEventListener('click', () => {
    hidePanel();
    if (nav.classList.contains('nav-search-open')) nav.querySelector('.nav-search-close')?.click();
  });

  // header.js closes the bar on Escape below 1680px; this covers the always-visible box above that
  input.addEventListener('keydown', (e) => {
    const options = getOptions();
    if (e.key === 'ArrowDown' && !panel.hidden && options.length) {
      e.preventDefault();
      setActive((activeIndex + 1) % options.length);
    } else if (e.key === 'ArrowUp' && !panel.hidden && options.length) {
      e.preventDefault();
      setActive(activeIndex <= 0 ? options.length - 1 : activeIndex - 1);
    } else if (e.key === 'Enter' && options[activeIndex]) {
      e.preventDefault();
      options[activeIndex].click();
    } else if (e.key === 'Escape') {
      hidePanel();
    }
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
