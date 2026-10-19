import { getMetadata } from '../../scripts/aem.js';
import { decorateGtmLinks } from '../../scripts/gtm.js';
import {
  CLOSE_ICON, loadDemoUser, isSignedIn, setSignedIn,
} from './demo-user.js';

const isDesktop = window.matchMedia('(min-width: 1280px)');
const accountHover = window.matchMedia('(min-width: 1024px) and (hover: hover) and (pointer: fine)');

const SEARCH_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.097 3.012a6.534 6.534 0 0 0-2.354.6 6.582 6.582 0 0 0-1.53 1.002 9.052 9.052 0 0 0-.598.597 6.511 6.511 0 0 0-1.123 1.803 6.53 6.53 0 0 0 .06 5.11 6.533 6.533 0 0 0 3.292 3.31 6.521 6.521 0 0 0 4.525.292 6.51 6.51 0 0 0 2.236-1.187c.057-.047.11-.09.117-.094.009-.005.837.817 3.002 2.982 2.7 2.698 2.995 2.991 3.046 3.017.201.1.432.061.586-.098a.497.497 0 0 0 .087-.576c-.026-.05-.319-.346-3.018-3.046-2.804-2.805-2.989-2.992-2.976-3.008l.129-.161a6.475 6.475 0 0 0 1.418-3.931 6.47 6.47 0 0 0-.562-2.778 6.53 6.53 0 0 0-2.707-2.988 6.475 6.475 0 0 0-2.841-.847 9.95 9.95 0 0 0-.79.001Zm.716.997a5.49 5.49 0 0 1 4.238 2.404 5.507 5.507 0 0 1 .499 5.265 5.52 5.52 0 0 1-2.586 2.74 5.479 5.479 0 0 1-1.997.562c-.23.022-.703.022-.934 0a5.5 5.5 0 0 1 .204-10.974c.115-.007.44-.005.576.003Z"/></svg>';
const CART_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.38 4.01a.52.52 0 0 0-.32.26.44.44 0 0 0-.06.23.5.5 0 0 0 .4.49h.7c.69 0 .75.01.89.05.32.1.58.35.68.67l.83 5.37.85 5.41A2 2 0 0 0 8.48 18l.34.01a.56.56 0 0 1-.1.02 2.04 2.04 0 0 0-.45.12 2 2 0 0 0-1.25 1.55 2.82 2.82 0 0 0 0 .62 2 2 0 0 0 2.24 1.67 2 2 0 0 0 1.67-1.48c.05-.18.06-.3.06-.5s-.01-.33-.06-.5a2 2 0 0 0-1.68-1.48.23.23 0 0 1-.07-.02 360.1 360.1 0 0 1 3.32 0h3.32a.74.74 0 0 1-.12.02 1.98 1.98 0 0 0-1.14.59 1.98 1.98 0 0 0-.49.86 1.57 1.57 0 0 0-.06.53c0 .26 0 .33.06.53a2 2 0 0 0 1.67 1.45c.16.02.46.02.6-.01a2 2 0 0 0 1.52-1.24c.15-.38.18-.85.07-1.26a2 2 0 0 0-1.7-1.46h-.05c0-.01.32-.02.95-.02h.96l.06-.02a.5.5 0 0 0 .34-.39.5.5 0 0 0-.35-.56c-.05-.02-.22-.02-5.03-.02H8.12l-.08-.03a1.01 1.01 0 0 1-.7-.67 12.23 12.23 0 0 1-.14-.79l4.93-.01c4.57 0 4.93 0 5.01-.02a2 2 0 0 0 1.09-.54 1.98 1.98 0 0 0 .5-.77 682.89 682.89 0 0 0 1.35-4.97.97.97 0 0 0-.1-.65 1 1 0 0 0-.65-.53L19.25 8H6.05l-.19-1.17a84.06 84.06 0 0 0-.2-1.27 2.05 2.05 0 0 0-.36-.78 2.03 2.03 0 0 0-1.1-.72C3.97 4 4 4 3.17 4l-.8.01ZM19.1 9.02l-.65 2.42c-.62 2.32-.65 2.4-.7 2.5a1 1 0 0 1-.7.54c-.08.02-.3.02-5.02.02H7.08l-.42-2.75L6.23 9H19.1v.02ZM9.24 19.03A1 1 0 0 1 10 20a.92.92 0 0 1-.06.33 1.01 1.01 0 0 1-.7.64A.73.73 0 0 1 9 21a.72.72 0 0 1-.25-.02 1 1 0 0 1 .05-1.95c.12-.02.33-.02.44.01Zm6.91-.02c.14.02.3.08.41.16.07.05.2.18.26.25A.99.99 0 0 1 17 20a.98.98 0 0 1-.3.71.97.97 0 0 1-.46.26 1.28 1.28 0 0 1-.38.02A1 1 0 0 1 15 20a.99.99 0 0 1 .43-.82 1.11 1.11 0 0 1 .41-.17 1.46 1.46 0 0 1 .31 0Z"/></svg>';
const USER_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11.73 2a10 10 0 0 0-9.63 8.62 8.48 8.48 0 0 0-.1 1.26c0 .56.02.86.08 1.35a10 10 0 0 0 13.6 8.07 10 10 0 0 0 6.26-8.22c.05-.39.05-.52.05-1.08 0-.64-.01-.88-.1-1.43a10 10 0 0 0-5.75-7.67 9.98 9.98 0 0 0-3.8-.9h-.61Zm.72 1.01a9 9 0 0 1 3.53 17.06 8.98 8.98 0 0 1-3.55.92c-.23.01-.85 0-1.04-.01a9 9 0 0 1-8.35-9.76 9 9 0 0 1 8.49-8.2c.2-.02.72-.02.92 0Zm-.66 2.5a3.5 3.5 0 0 0-2.7 1.54 3.48 3.48 0 0 0-.4 3.07 3.47 3.47 0 0 0 1.3 1.74 3.53 3.53 0 0 0 1.16.54c.32.07.5.1.85.1s.55-.03.86-.1a3.5 3.5 0 0 0 2.62-3.02 4.3 4.3 0 0 0 0-.76 3.5 3.5 0 0 0-3.3-3.11 2.6 2.6 0 0 0-.39 0Zm.5 1a2.53 2.53 0 0 1 1.66.92 2.5 2.5 0 0 1-1.17 3.94 2.27 2.27 0 0 1-.78.13c-.3 0-.52-.04-.78-.13a2.44 2.44 0 0 1-.98-.6 2.48 2.48 0 0 1-.7-2.2 2.79 2.79 0 0 1 .52-1.15c.08-.09.27-.29.37-.37a2.53 2.53 0 0 1 1.28-.53c.14-.02.43-.02.58 0Zm-.46 7a5.48 5.48 0 0 0-3.66 1.55 5.4 5.4 0 0 0-1.23 1.78.63.63 0 0 0-.02.14.5.5 0 0 0 .37.5.66.66 0 0 0 .13.02.47.47 0 0 0 .35-.15.42.42 0 0 0 .1-.15c.2-.42.4-.75.68-1.1a6.38 6.38 0 0 1 .6-.57 4.53 4.53 0 0 1 2.19-.98c.32-.05.74-.06 1.05-.03a4.48 4.48 0 0 1 2.83 1.34c.38.4.66.8.9 1.34a.5.5 0 0 0 .47.3.5.5 0 0 0 .48-.62 3.87 3.87 0 0 0-.31-.64 5.28 5.28 0 0 0-.87-1.13 5.44 5.44 0 0 0-3.66-1.6 3.88 3.88 0 0 0-.4 0Z"/></svg>';

const CLEAR_ICON = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M9.56 2.01a8 8 0 1 0 .88 16 8 8 0 0 0-.88-16ZM6.91 6.35c.07.01.14.03.19.06.03.03.37.35 1.47 1.46L10 9.29l1.42-1.42 1.45-1.44a.5.5 0 0 1 .35-.08.5.5 0 0 1 .38.73c-.03.06-.06.08-1.46 1.49L10.7 10l1.42 1.42 1.44 1.45a.5.5 0 0 1-.65.73c-.06-.03-.08-.06-1.49-1.46L10 10.7l-1.43 1.43a19 19 0 0 1-1.5 1.46.5.5 0 0 1-.57-.08.5.5 0 0 1-.07-.65l1.44-1.45L9.29 10 7.86 8.57c-1.4-1.4-1.43-1.43-1.46-1.5a.5.5 0 0 1 .51-.72Z"/></svg>';

const SEARCH_URL = 'https://www.hp.com/us-en/shop/sitesearch';

const DEFAULT_HEADER_FRAGMENT = '/nav';

async function fetchNavHtml(path) {
  const isAbsolute = /^https?:\/\//i.test(path);
  const root = !isAbsolute && window.location.pathname.startsWith('/content/') ? '/content' : '';
  const resolvedPath = `${root}${path}`;
  const resp = await fetch(`${resolvedPath}.plain.html`);
  if (!resp.ok) return null;
  const container = document.createElement('div');
  container.innerHTML = await resp.text();

  const resetAttributeBase = (tag, attr) => {
    container.querySelectorAll(`${tag}[${attr}^="./media_"]`).forEach((elem) => {
      elem[attr] = new URL(elem.getAttribute(attr), new URL(resolvedPath, window.location)).href;
    });
  };
  resetAttributeBase('img', 'src');
  resetAttributeBase('source', 'srcset');

  return container.innerHTML;
}

function copyTitle(from, to) {
  const title = from && from.getAttribute('title');
  if (title) to.setAttribute('title', title);
}

function closeAllPanels(nav) {
  nav.querySelectorAll('.nav-drop[aria-expanded="true"]').forEach((li) => {
    li.setAttribute('aria-expanded', 'false');
  });
}

function setBodyScrollLock(lock) {
  document.body.classList.toggle('nav-scroll-lock', lock);
}

function setAccountOpen(account, open) {
  if (!account) return;
  account.classList.toggle('nav-account-open', open);
  const btn = account.querySelector('.nav-signin-btn');
  if (btn) btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  const nav = account.closest('nav');
  if (open && nav && !isDesktop.matches) {
    if (nav.getAttribute('aria-expanded') === 'true') {
      nav.setAttribute('aria-expanded', 'false');
      setBodyScrollLock(false);
    }
    if (nav.classList.contains('nav-search-open')) nav.querySelector('.nav-search-close')?.click();
  }
}

function setSearchOpen(nav, open) {
  if (!nav) return;
  const searchBtn = nav.querySelector('.nav-search-btn');
  const form = nav.querySelector('.nav-search-form');
  const close = nav.querySelector('.nav-search-close');
  if (!searchBtn || !form) return;
  searchBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
  nav.classList.toggle('nav-search-open', open);
  form.hidden = !open;
  if (close) close.hidden = !open;
  const clear = form.querySelector('.nav-search-clear');
  if (clear) clear.hidden = !form.querySelector('input').value;
  if (open) {
    setAccountOpen(nav.querySelector('.nav-account'), false);
    if (nav.getAttribute('aria-expanded') === 'true') {
      nav.setAttribute('aria-expanded', 'false');
      setBodyScrollLock(false);
      closeAllPanels(nav);
    }
    form.querySelector('input').focus();
  } else if (searchBtn.offsetParent) {
    searchBtn.focus();
  }
}

const ACCOUNT_ICONS = {
  orders: '<path d="M2.5 4.5h2.2l2.1 10.2h10.6l2.1-7.2H6"/><circle cx="9" cy="18.5" r="1.4"/><circle cx="16.5" cy="18.5" r="1.4"/>',
  subscriptions: '<rect x="7.5" y="7.5" width="13" height="13" rx="1.5"/><path d="M4.5 16.5v-11a1 1 0 0 1 1-1h11M14 11v6M11 14h6"/>',
  devices: '<rect x="2.5" y="4" width="15" height="10.5" rx="1"/><path d="M6 18h6M9 14.5V18"/><rect x="14.5" y="10.5" width="7" height="9.5" rx="1"/><path d="M17 17.5h2"/>',
  account: '<circle cx="12" cy="8" r="3.6"/><path d="M4.8 20c.9-3.6 3.8-5.6 7.2-5.6s6.3 2 7.2 5.6"/>',
};

function accountIcon(href) {
  let key = 'account';
  if (/order/i.test(href)) key = 'orders';
  else if (/subscription/i.test(href)) key = 'subscriptions';
  else if (/device/i.test(href)) key = 'devices';
  return `<svg class="nav-account-icon" viewBox="0 0 24 24" aria-hidden="true">${ACCOUNT_ICONS[key]}</svg>`;
}

function buildAccountFlyout(list) {
  const items = [...list.children];
  if (!items.length) return null;

  const flyout = document.createElement('div');
  flyout.className = 'nav-account-flyout';
  flyout.id = 'nav-account-flyout';

  const head = document.createElement('div');
  head.className = 'nav-account-head';
  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'nav-account-close';
  close.setAttribute('aria-label', 'Close');
  close.innerHTML = CLOSE_ICON;

  const linkList = document.createElement('ul');
  linkList.className = 'nav-account-links';
  let greeting = null;

  items.forEach((li) => {
    const a = li.querySelector('a');
    if (!a) {
      const text = li.textContent.trim();
      if (!text) return;
      if (!greeting) {
        greeting = document.createElement('p');
        greeting.className = 'nav-account-greeting';
        greeting.textContent = text;
      } else {
        const p = document.createElement('p');
        p.className = 'nav-account-benefit';
        p.textContent = text;
        flyout.append(p);
      }
      return;
    }
    const btn = document.createElement('a');
    btn.href = a.getAttribute('href');
    btn.textContent = a.textContent.trim();
    copyTitle(a, btn);
    if (a.closest('strong')) {
      btn.className = 'nav-account-btn primary';
      flyout.append(btn);
    } else if (a.closest('em')) {
      btn.className = 'nav-account-btn secondary';
      flyout.append(btn);
    } else {
      btn.className = 'nav-account-link';
      btn.insertAdjacentHTML('afterbegin', accountIcon(btn.href));
      const item = document.createElement('li');
      item.append(btn);
      linkList.append(item);
    }
  });

  if (greeting) head.append(greeting);
  head.append(close);
  flyout.prepend(head);
  if (linkList.children.length) flyout.append(linkList);
  return flyout;
}

function wireDemoSignIn(account, flyout) {
  const trigger = account.querySelector('.nav-signin-btn');
  const primary = flyout.querySelector('.nav-account-btn.primary');
  if (!primary) return;

  const badge = document.createElement('span');
  badge.className = 'nav-signin-initials';
  badge.setAttribute('aria-hidden', 'true');
  trigger.append(badge);

  const user = document.createElement('div');
  user.className = 'nav-account-user';
  const initials = document.createElement('span');
  initials.className = 'nav-account-initials';
  initials.setAttribute('aria-hidden', 'true');
  const name = document.createElement('p');
  name.className = 'nav-account-name';
  const signOut = document.createElement('button');
  signOut.type = 'button';
  signOut.className = 'nav-account-btn secondary nav-account-signout';
  user.append(initials, name);
  flyout.querySelector('.nav-account-head').after(user);
  const divider = document.createElement('span');
  divider.className = 'nav-account-divider';
  flyout.append(divider, signOut);

  const render = (data) => {
    account.classList.toggle('nav-account-signed-in', !!data);
    if (!data) return;
    const { user: { firstName, initials: userInitials }, labels } = data;
    badge.textContent = userInitials;
    initials.textContent = userInitials;
    name.textContent = labels.greeting.replace('{name}', firstName);
    signOut.textContent = labels.signOut;
  };

  if (isSignedIn()) loadDemoUser().then((data) => { if (data) render(data); });

  primary.addEventListener('click', async (e) => {
    e.preventDefault();
    const data = await loadDemoUser();
    if (!data) {
      window.location.href = primary.href;
      return;
    }
    setSignedIn(true);
    render(data);
    setAccountOpen(account, true);
    signOut.focus();
  });

  signOut.addEventListener('click', () => {
    setSignedIn(false);
    render(null);
    setAccountOpen(account, false);
    trigger.focus();
  });
}

function decorateTools(navTools) {
  const links = [...navTools.querySelectorAll('a')];
  const cart = links.find((a) => /cart/i.test(a.textContent) || /cart/i.test(a.href));
  const signIn = links.find((a) => /sign\s*in/i.test(a.textContent));
  const signInList = signIn && signIn.closest('li') && signIn.closest('li').querySelector(':scope > ul');
  const flyout = signInList ? buildAccountFlyout(signInList) : null;

  const group = document.createElement('div');
  group.className = 'nav-tools-group';

  const searchWrap = document.createElement('div');
  searchWrap.className = 'nav-search';
  const searchBtn = document.createElement('button');
  searchBtn.type = 'button';
  searchBtn.className = 'nav-tool-btn nav-search-btn';
  searchBtn.setAttribute('aria-label', 'Search');
  searchBtn.setAttribute('aria-expanded', 'false');
  searchBtn.innerHTML = SEARCH_ICON;

  const searchForm = document.createElement('form');
  searchForm.className = 'nav-search-form';
  searchForm.setAttribute('role', 'search');
  searchForm.action = SEARCH_URL;
  searchForm.hidden = true;
  const searchInput = document.createElement('input');
  searchInput.type = 'search';
  searchInput.name = 'keyword';
  searchInput.placeholder = 'What are you looking for?';
  searchInput.autocomplete = 'off';
  searchInput.setAttribute('aria-label', 'Search');
  const searchClear = document.createElement('button');
  searchClear.type = 'button';
  searchClear.className = 'nav-search-clear';
  searchClear.setAttribute('aria-label', 'Clear Search');
  searchClear.hidden = true;
  searchClear.innerHTML = CLEAR_ICON;
  const searchSubmit = document.createElement('button');
  searchSubmit.type = 'submit';
  searchSubmit.className = 'nav-search-submit';
  searchSubmit.setAttribute('aria-label', 'Submit search');
  searchSubmit.innerHTML = SEARCH_ICON;
  searchForm.append(searchInput, searchClear, searchSubmit);

  searchForm.addEventListener('submit', (e) => {
    const keyword = searchInput.value.trim();
    if (!keyword) {
      e.preventDefault();
      searchInput.focus();
      return;
    }
    searchInput.value = keyword;
  });
  searchInput.addEventListener('input', () => {
    searchClear.hidden = !searchInput.value;
  });

  searchClear.addEventListener('click', () => {
    searchInput.value = '';
    searchClear.hidden = true;
    searchInput.focus();
  });

  const searchClose = document.createElement('button');
  searchClose.type = 'button';
  searchClose.className = 'nav-search-close';
  searchClose.setAttribute('aria-label', 'Close search');
  searchClose.hidden = true;
  searchClose.innerHTML = CLOSE_ICON;

  searchBtn.addEventListener('click', () => {
    const open = searchBtn.getAttribute('aria-expanded') !== 'true';
    setSearchOpen(navTools.closest('nav'), open);
  });
  searchClose.addEventListener('click', () => setSearchOpen(navTools.closest('nav'), false));
  searchWrap.append(searchBtn, searchForm, searchClose);

  // fall back to the page's locale if someone submits before the panel code has loaded
  searchForm.addEventListener('submit', async (e) => {
    if (searchForm.dataset.ready || getMetadata('search-results-page')) return;
    e.preventDefault();
    if (!searchInput.value.trim()) return;
    const { default: getPageLocale } = await import('../../scripts/locale.js');
    searchForm.action = `/${getPageLocale()}/newsroom/search`;
    searchForm.submit();
  });

  // load the results panel on first use
  searchInput.addEventListener('focus', async () => {
    const { default: initSearchPanel } = await import('./search-suggest.js');
    initSearchPanel(navTools.closest('nav'), searchForm, searchInput);
  }, { once: true });

  const cartBtn = document.createElement('a');
  cartBtn.className = 'nav-tool-btn nav-cart-btn';
  cartBtn.href = cart ? cart.href : 'https://www.hp.com/us-en/shop/cart';
  cartBtn.setAttribute('aria-label', 'Cart');
  copyTitle(cart, cartBtn);
  cartBtn.innerHTML = CART_ICON;

  const signInBtn = document.createElement('a');
  signInBtn.className = 'nav-tool-btn nav-signin-btn';
  signInBtn.href = signIn ? signIn.href : 'https://account.hp.com/';
  signInBtn.setAttribute('aria-label', 'Sign In');
  copyTitle(signIn, signInBtn);
  signInBtn.innerHTML = USER_ICON;

  let account = signInBtn;
  if (flyout) {
    account = document.createElement('div');
    account.className = 'nav-account';
    signInBtn.setAttribute('role', 'button');
    signInBtn.setAttribute('aria-haspopup', 'true');
    signInBtn.setAttribute('aria-expanded', 'false');
    signInBtn.setAttribute('aria-controls', flyout.id);
    account.append(signInBtn, flyout);

    let closeTimer;
    account.addEventListener('mouseenter', () => {
      if (!accountHover.matches) return;
      clearTimeout(closeTimer);
      setAccountOpen(account, true);
    });
    account.addEventListener('mouseleave', () => {
      if (!accountHover.matches) return;
      closeTimer = setTimeout(() => setAccountOpen(account, false), 150);
    });
    signInBtn.addEventListener('click', (e) => {
      e.preventDefault();
      setAccountOpen(account, accountHover.matches || !account.classList.contains('nav-account-open'));
    });
    flyout.querySelector('.nav-account-close').addEventListener('click', () => {
      setAccountOpen(account, false);
      signInBtn.focus();
    });
    wireDemoSignIn(account, flyout);
  }

  group.append(searchWrap, cartBtn, account);
  navTools.textContent = '';
  navTools.append(group);
}

function decorateSections(navSections) {
  const wrapper = navSections.querySelector(':scope > div') || navSections;
  const nodes = [...wrapper.children];

  const menu = document.createElement('ul');
  menu.className = 'nav-menu nav-list';

  let businessCta = null;

  let current = null;
  nodes.forEach((node) => {
    if (node.tagName === 'H2') {
      const topLink = node.querySelector('a');
      const label = topLink ? topLink.textContent : node.textContent;
      const href = topLink ? topLink.getAttribute('href') : '';

      if (/\/business-solutions\.html$/i.test(href)) {
        businessCta = { href, label, link: topLink };
        current = null;
        return;
      }

      current = document.createElement('li');
      current.className = 'nav-drop';
      current.setAttribute('aria-expanded', 'false');

      const trigger = document.createElement('a');
      trigger.className = 'nav-menu-trigger nav-trigger';
      trigger.href = topLink ? topLink.getAttribute('href') : '#';
      trigger.textContent = label;
      copyTitle(topLink, trigger);
      trigger.setAttribute('role', 'button');
      trigger.setAttribute('aria-expanded', 'false');

      const panel = document.createElement('div');
      panel.className = 'nav-panel';
      const featuredCol = document.createElement('div');
      featuredCol.className = 'nav-panel-featured';
      const cardsCol = document.createElement('div');
      cardsCol.className = 'nav-panel-cards';
      panel.append(featuredCol, cardsCol);

      current.append(trigger, panel);
      menu.append(current);
    } else if (current) {
      const panel = current.querySelector('.nav-panel');
      const featuredCol = panel.querySelector('.nav-panel-featured');
      const cardsCol = panel.querySelector('.nav-panel-cards');
      if (node.tagName === 'H3') {
        const h = document.createElement('p');
        h.className = 'nav-featured-heading';
        h.textContent = node.textContent;
        featuredCol.append(h);
      } else if (node.tagName === 'UL') {
        const hasImages = node.querySelector('img');
        if (hasImages) {
          cardsCol.append(node);
        } else {
          featuredCol.append(node);
        }
      }
    }
  });

  if (businessCta) {
    const ctaLi = document.createElement('li');
    ctaLi.className = 'nav-cta';
    const ctaBtn = document.createElement('a');
    ctaBtn.className = 'nav-cta-btn';
    ctaBtn.href = businessCta.href;
    ctaBtn.textContent = businessCta.label;
    copyTitle(businessCta.link, ctaBtn);
    ctaLi.append(ctaBtn);
    menu.append(ctaLi);
  }

  navSections.textContent = '';
  navSections.append(menu);

  const HOVER_INTENT_MS = 200;
  let pending;
  const openPanel = (li) => {
    clearTimeout(pending);
    closeAllPanels(menu);
    li.setAttribute('aria-expanded', 'true');
  };
  menu.querySelectorAll('.nav-drop').forEach((li) => {
    const trigger = li.querySelector('.nav-menu-trigger');
    li.addEventListener('mouseenter', () => {
      if (!isDesktop.matches) return;
      clearTimeout(pending);
      const openLi = menu.querySelector('.nav-drop[aria-expanded="true"]');
      if (!openLi || openLi === li) openPanel(li);
      else pending = setTimeout(() => openPanel(li), HOVER_INTENT_MS);
    });
    li.addEventListener('mouseleave', () => {
      if (!isDesktop.matches) return;
      clearTimeout(pending);
      pending = setTimeout(() => closeAllPanels(menu), HOVER_INTENT_MS);
    });
    trigger.addEventListener('click', (e) => {
      e.preventDefault();
      const expanded = li.getAttribute('aria-expanded') === 'true';
      const menuEl = li.closest('.nav-menu');
      if (!expanded) closeAllPanels(menuEl);
      li.setAttribute('aria-expanded', expanded ? 'false' : 'true');
      trigger.setAttribute('aria-expanded', expanded ? 'false' : 'true');
    });
  });
}

function toggleMobileMenu(nav, forceClose = false) {
  const expanded = nav.getAttribute('aria-expanded') === 'true';
  const open = forceClose ? false : !expanded;
  if (open && nav.classList.contains('nav-search-open')) setSearchOpen(nav, false);
  if (open) setAccountOpen(nav.querySelector('.nav-account'), false);
  nav.setAttribute('aria-expanded', open ? 'true' : 'false');
  setBodyScrollLock(open && !isDesktop.matches);
  const button = nav.querySelector('.nav-hamburger button');
  if (button) button.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
  if (!open) closeAllPanels(nav);
}

async function loadNavHtml() {
  const navMeta = getMetadata('nav');
  const path = navMeta ? new URL(navMeta, window.location).pathname.replace(/\.html$/, '') : DEFAULT_HEADER_FRAGMENT;
  return fetchNavHtml(path).catch(() => null);
}

export default async function decorate(block) {
  const html = block.textContent.trim() ? block.innerHTML : await loadNavHtml();
  block.textContent = '';
  if (!html) return;

  const fragment = document.createElement('div');
  fragment.innerHTML = html;

  const nav = document.createElement('nav');
  nav.id = 'nav';
  nav.setAttribute('aria-expanded', 'false');
  while (fragment.firstElementChild) nav.append(fragment.firstElementChild);

  const classes = ['brand', 'sections', 'tools', 'newsroom'];
  classes.forEach((c, i) => {
    const section = nav.children[i];
    if (section) section.classList.add(`nav-${c}`);
  });

  const navSections = nav.querySelector('.nav-sections');
  const navTools = nav.querySelector('.nav-tools');
  let navNewsroom = nav.querySelector('.nav-newsroom');

  const embed = block.getRootNode().host;
  const hideNewsroom = embed
    ? embed.dataset.newsroom !== 'true'
    : document.body.dataset.noNewsroom === 'true';
  if (navNewsroom && hideNewsroom) {
    navNewsroom.remove();
    navNewsroom = null;
  }

  if (navSections) decorateSections(navSections);
  if (navTools) decorateTools(navTools);
  if (navNewsroom) {
    const brandP = navNewsroom.querySelector(':scope > p:first-child');
    if (brandP) brandP.classList.add('nav-newsroom-brand');

    const linksUl = navNewsroom.querySelector('ul');
    if (brandP && linksUl) {
      const toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'nav-newsroom-toggle';
      toggle.setAttribute('aria-label', 'Toggle newsroom links');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.innerHTML = '<span class="nav-newsroom-chevron" aria-hidden="true"></span>';
      brandP.append(toggle);
      const setNewsroomOpen = (open) => {
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        navNewsroom.classList.toggle('nav-newsroom-open', open);
      };
      toggle.addEventListener('click', () => {
        setNewsroomOpen(toggle.getAttribute('aria-expanded') !== 'true');
      });
      navNewsroom.addEventListener('click', (e) => {
        if (e.target === navNewsroom) setNewsroomOpen(false);
      });
      document.addEventListener('keydown', (e) => {
        if (e.code === 'Escape' && navNewsroom.classList.contains('nav-newsroom-open')) {
          setNewsroomOpen(false);
          toggle.focus();
        }
      });
    }
  }

  const hamburger = document.createElement('div');
  hamburger.className = 'nav-hamburger';
  hamburger.innerHTML = `<button type="button" aria-controls="nav" aria-label="Open navigation">
      <span class="nav-hamburger-icon"></span>
    </button>`;
  hamburger.addEventListener('click', () => toggleMobileMenu(nav));
  nav.prepend(hamburger);

  document.addEventListener('click', (e) => {
    const path = e.composedPath();
    if (isDesktop.matches && !path.includes(nav)) closeAllPanels(nav);
    const account = nav.querySelector('.nav-account');
    if (account && !path.includes(account)) setAccountOpen(account, false);
  });

  nav.addEventListener('keydown', (e) => {
    if (e.key === ' ' && e.target.matches('a[role="button"]')) {
      e.preventDefault();
      e.target.click();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.code === 'Escape') {
      closeAllPanels(nav);
      const account = nav.querySelector('.nav-account');
      const flyout = account && account.querySelector('.nav-account-flyout');
      const focusInFlyout = flyout && flyout.contains(nav.getRootNode().activeElement);
      setAccountOpen(account, false);
      if (focusInFlyout) account.querySelector('.nav-signin-btn').focus();
      if (nav.classList.contains('nav-search-open')) setSearchOpen(nav, false);
      if (!isDesktop.matches) toggleMobileMenu(nav, true);
    }
  });

  isDesktop.addEventListener('change', () => {
    closeAllPanels(nav);
    toggleMobileMenu(nav, true);
    if (nav.classList.contains('nav-search-open')) setSearchOpen(nav, false);
    const button = nav.querySelector('.nav-hamburger button');
    if (button) button.setAttribute('aria-label', 'Open navigation');
    setBodyScrollLock(false);
  });

  const navWrapper = document.createElement('div');
  navWrapper.className = 'nav-wrapper';
  navWrapper.append(nav);

  const overlay = document.createElement('div');
  overlay.className = 'nav-overlay';
  overlay.setAttribute('aria-hidden', 'true');
  overlay.addEventListener('click', () => {
    toggleMobileMenu(nav, true);
    setAccountOpen(nav.querySelector('.nav-account'), false);
  });
  navWrapper.append(overlay);

  if (navNewsroom) {
    navNewsroom.remove();
    navWrapper.append(navNewsroom);
  }

  decorateGtmLinks(navWrapper);
  block.append(navWrapper);
}
