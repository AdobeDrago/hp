// media query match that indicates mobile/tablet width
const isDesktop = window.matchMedia('(min-width: 1300px)');

/**
 * Fetches the nav fragment. Metadata-independent dual-fetch:
 * /content first (localhost / aem up), then root (DA/EDS production).
 */
async function fetchNavHtml() {
  let resp = await fetch('/content/nav.plain.html');
  if (!resp.ok) resp = await fetch('/nav.plain.html');
  if (!resp.ok) return null;
  return resp.text();
}

/**
 * Closes any open desktop dropdown panel.
 * @param {Element} nav The nav element
 */
function closeAllPanels(nav) {
  nav.querySelectorAll('.nav-drop[aria-expanded="true"]').forEach((li) => {
    li.setAttribute('aria-expanded', 'false');
  });
}

/**
 * Builds the tools (search, cart, sign-in) region controls.
 * @param {Element} navTools The tools section element
 */
function decorateTools(navTools) {
  const links = [...navTools.querySelectorAll('a')];
  const cart = links.find((a) => /cart/i.test(a.textContent) || /cart/i.test(a.href));
  const signIn = links.find((a) => /sign\s*in/i.test(a.textContent));

  const group = document.createElement('div');
  group.className = 'nav-tools-group';

  // search (expandable input built in JS — not in the fragment)
  const searchWrap = document.createElement('div');
  searchWrap.className = 'nav-search';
  const searchBtn = document.createElement('button');
  searchBtn.type = 'button';
  searchBtn.className = 'nav-tool-btn nav-search-btn';
  searchBtn.setAttribute('aria-label', 'Search');
  searchBtn.setAttribute('aria-expanded', 'false');
  searchBtn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.097 3.012a6.534 6.534 0 0 0-2.354.6 6.582 6.582 0 0 0-1.53 1.002 9.052 9.052 0 0 0-.598.597 6.511 6.511 0 0 0-1.123 1.803 6.53 6.53 0 0 0 .06 5.11 6.533 6.533 0 0 0 3.292 3.31 6.521 6.521 0 0 0 4.525.292 6.51 6.51 0 0 0 2.236-1.187c.057-.047.11-.09.117-.094.009-.005.837.817 3.002 2.982 2.7 2.698 2.995 2.991 3.046 3.017.201.1.432.061.586-.098a.497.497 0 0 0 .087-.576c-.026-.05-.319-.346-3.018-3.046-2.804-2.805-2.989-2.992-2.976-3.008l.129-.161a6.475 6.475 0 0 0 1.418-3.931 6.47 6.47 0 0 0-.562-2.778 6.53 6.53 0 0 0-2.707-2.988 6.475 6.475 0 0 0-2.841-.847 9.95 9.95 0 0 0-.79.001Zm.716.997a5.49 5.49 0 0 1 4.238 2.404 5.507 5.507 0 0 1 .499 5.265 5.52 5.52 0 0 1-2.586 2.74 5.479 5.479 0 0 1-1.997.562c-.23.022-.703.022-.934 0a5.5 5.5 0 0 1 .204-10.974c.115-.007.44-.005.576.003Z"/></svg>';

  const searchForm = document.createElement('form');
  searchForm.className = 'nav-search-form';
  searchForm.setAttribute('role', 'search');
  searchForm.action = 'https://www.hp.com/us-en/shop/SearchDisplay';
  searchForm.hidden = true;
  const searchInput = document.createElement('input');
  searchInput.type = 'search';
  searchInput.name = 'searchTerm';
  searchInput.placeholder = 'What are you looking for?';
  searchInput.setAttribute('aria-label', 'Search');
  const searchSubmit = document.createElement('button');
  searchSubmit.type = 'submit';
  searchSubmit.className = 'nav-search-submit';
  searchSubmit.setAttribute('aria-label', 'Submit search');
  searchSubmit.innerHTML = searchBtn.innerHTML;
  searchForm.append(searchInput, searchSubmit);

  searchBtn.addEventListener('click', () => {
    const open = searchBtn.getAttribute('aria-expanded') === 'true';
    searchBtn.setAttribute('aria-expanded', open ? 'false' : 'true');
    searchForm.hidden = open;
    if (!open) searchInput.focus();
  });
  searchWrap.append(searchBtn, searchForm);

  // cart
  const cartBtn = document.createElement('a');
  cartBtn.className = 'nav-tool-btn nav-cart-btn';
  cartBtn.href = cart ? cart.href : 'https://www.hp.com/us-en/shop/cart';
  cartBtn.setAttribute('aria-label', 'Cart');
  cartBtn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.38 4.01a.52.52 0 0 0-.32.26.44.44 0 0 0-.06.23.5.5 0 0 0 .4.49h.7c.69 0 .75.01.89.05.32.1.58.35.68.67l.83 5.37.85 5.41A2 2 0 0 0 8.48 18l.34.01a.56.56 0 0 1-.1.02 2.04 2.04 0 0 0-.45.12 2 2 0 0 0-1.25 1.55 2.82 2.82 0 0 0 0 .62 2 2 0 0 0 2.24 1.67 2 2 0 0 0 1.67-1.48c.05-.18.06-.3.06-.5s-.01-.33-.06-.5a2 2 0 0 0-1.68-1.48.23.23 0 0 1-.07-.02 360.1 360.1 0 0 1 3.32 0h3.32a.74.74 0 0 1-.12.02 1.98 1.98 0 0 0-1.14.59 1.98 1.98 0 0 0-.49.86 1.57 1.57 0 0 0-.06.53c0 .26 0 .33.06.53a2 2 0 0 0 1.67 1.45c.16.02.46.02.6-.01a2 2 0 0 0 1.52-1.24c.15-.38.18-.85.07-1.26a2 2 0 0 0-1.7-1.46h-.05c0-.01.32-.02.95-.02h.96l.06-.02a.5.5 0 0 0 .34-.39.5.5 0 0 0-.35-.56c-.05-.02-.22-.02-5.03-.02H8.12l-.08-.03a1.01 1.01 0 0 1-.7-.67 12.23 12.23 0 0 1-.14-.79l4.93-.01c4.57 0 4.93 0 5.01-.02a2 2 0 0 0 1.09-.54 1.98 1.98 0 0 0 .5-.77 682.89 682.89 0 0 0 1.35-4.97.97.97 0 0 0-.1-.65 1 1 0 0 0-.65-.53L19.25 8H6.05l-.19-1.17a84.06 84.06 0 0 0-.2-1.27 2.05 2.05 0 0 0-.36-.78 2.03 2.03 0 0 0-1.1-.72C3.97 4 4 4 3.17 4l-.8.01Z"/></svg>';

  // sign in
  const signInBtn = document.createElement('a');
  signInBtn.className = 'nav-tool-btn nav-signin-btn';
  signInBtn.href = signIn ? signIn.href : 'https://account.hp.com/';
  signInBtn.setAttribute('aria-label', 'Sign In');
  signInBtn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11.73 2a10 10 0 0 0-9.63 8.62 8.48 8.48 0 0 0-.1 1.26c0 .56.02.86.08 1.35a10 10 0 0 0 13.6 8.07 10 10 0 0 0 6.26-8.22c.05-.39.05-.52.05-1.08 0-.64-.01-.88-.1-1.43a10 10 0 0 0-5.75-7.67 9.98 9.98 0 0 0-3.8-.9h-.61Zm.72 1.01a9 9 0 0 1 3.53 17.06 8.98 8.98 0 0 1-3.55.92c-.23.01-.85 0-1.04-.01a9 9 0 0 1-8.35-9.76 9 9 0 0 1 8.49-8.2c.2-.02.72-.02.92 0Zm-.66 2.5a3.5 3.5 0 0 0-2.7 1.54 3.48 3.48 0 0 0-.4 3.07 3.47 3.47 0 0 0 1.3 1.74 3.53 3.53 0 0 0 1.16.54c.32.07.5.1.85.1s.55-.03.86-.1a3.5 3.5 0 0 0 2.62-3.02 4.3 4.3 0 0 0 0-.76 3.5 3.5 0 0 0-3.3-3.11 2.6 2.6 0 0 0-.39 0Zm.5 1a2.53 2.53 0 0 1 1.66.92 2.5 2.5 0 0 1-1.17 3.94 2.27 2.27 0 0 1-.78.13c-.3 0-.52-.04-.78-.13a2.44 2.44 0 0 1-.98-.6 2.48 2.48 0 0 1-.7-2.2 2.79 2.79 0 0 1 .52-1.15c.08-.09.27-.29.37-.37a2.53 2.53 0 0 1 1.28-.53c.14-.02.43-.02.58 0Zm-.46 7a5.48 5.48 0 0 0-3.66 1.55 5.4 5.4 0 0 0-1.23 1.78.63.63 0 0 0-.02.14.5.5 0 0 0 .37.5.66.66 0 0 0 .13.02.47.47 0 0 0 .35-.15.42.42 0 0 0 .1-.15c.2-.42.4-.75.68-1.1a6.38 6.38 0 0 1 .6-.57 4.53 4.53 0 0 1 2.19-.98c.32-.05.74-.06 1.05-.03a4.48 4.48 0 0 1 2.83 1.34c.38.4.66.8.9 1.34a.5.5 0 0 0 .47.3.5.5 0 0 0 .48-.62 3.87 3.87 0 0 0-.31-.64 5.28 5.28 0 0 0-.87-1.13 5.44 5.44 0 0 0-3.66-1.6 3.88 3.88 0 0 0-.4 0Z"/></svg>';

  group.append(searchWrap, cartBtn, signInBtn);
  navTools.textContent = '';
  navTools.append(group);
}

/**
 * Structures a single top-level menu section into a trigger + megamenu panel.
 * Reads content authored in the nav fragment; invents no copy.
 * @param {Element} sectionsWrapper The container holding the raw section content
 */
function decorateSections(navSections) {
  const wrapper = navSections.querySelector(':scope > div') || navSections;
  const nodes = [...wrapper.children];

  const menu = document.createElement('ul');
  menu.className = 'nav-menu nav-list';

  let current = null;
  nodes.forEach((node) => {
    if (node.tagName === 'H2') {
      // start a new top-level menu item
      current = document.createElement('li');
      current.className = 'nav-drop';
      current.setAttribute('aria-expanded', 'false');

      const topLink = node.querySelector('a');
      const label = topLink ? topLink.textContent : node.textContent;
      const trigger = document.createElement('a');
      trigger.className = 'nav-menu-trigger nav-trigger';
      trigger.href = topLink ? topLink.getAttribute('href') : '#';
      trigger.textContent = label;
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
          cardsCol.append(...node.children);
        } else {
          featuredCol.append(...node.children);
        }
      }
    }
  });

  navSections.textContent = '';
  navSections.append(menu);

  // desktop hover + click behavior
  menu.querySelectorAll('.nav-drop').forEach((li) => {
    const trigger = li.querySelector('.nav-menu-trigger');
    li.addEventListener('mouseenter', () => {
      if (isDesktop.matches) {
        closeAllPanels(li.closest('.nav-menu'));
        li.setAttribute('aria-expanded', 'true');
      }
    });
    li.addEventListener('mouseleave', () => {
      if (isDesktop.matches) li.setAttribute('aria-expanded', 'false');
    });
    trigger.addEventListener('click', (e) => {
      // On desktop the panel is hover-driven; the click toggles it and must not
      // navigate. On mobile the trigger acts as an accordion toggle.
      e.preventDefault();
      const expanded = li.getAttribute('aria-expanded') === 'true';
      const menuEl = li.closest('.nav-menu');
      if (!expanded) closeAllPanels(menuEl);
      li.setAttribute('aria-expanded', expanded ? 'false' : 'true');
      trigger.setAttribute('aria-expanded', expanded ? 'false' : 'true');
    });
  });
}

/**
 * Toggles the mobile menu open/closed.
 * @param {Element} nav The nav element
 * @param {Boolean} forceClose When true, always close
 */
function toggleMobileMenu(nav, forceClose = false) {
  const expanded = nav.getAttribute('aria-expanded') === 'true';
  const open = forceClose ? false : !expanded;
  nav.setAttribute('aria-expanded', open ? 'true' : 'false');
  document.body.style.overflowY = open && !isDesktop.matches ? 'hidden' : '';
  const button = nav.querySelector('.nav-hamburger button');
  if (button) button.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
  if (!open) closeAllPanels(nav);
}

/**
 * loads and decorates the header, mainly the nav
 * @param {Element} block The header block element
 */
export default async function decorate(block) {
  const html = await fetchNavHtml();
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

  const navBrand = nav.querySelector('.nav-brand');
  const navSections = nav.querySelector('.nav-sections');
  const navTools = nav.querySelector('.nav-tools');
  const navNewsroom = nav.querySelector('.nav-newsroom');

  if (navSections) decorateSections(navSections);
  if (navTools) decorateTools(navTools);
  // The newsroom sub-bar keeps its authored links as-is; styling makes it the
  // black secondary bar below the global header.
  if (navNewsroom) {
    const brandP = navNewsroom.querySelector(':scope > p:first-child');
    if (brandP) brandP.classList.add('nav-newsroom-brand');

    // On mobile the link list collapses behind a chevron next to the brand.
    const linksUl = navNewsroom.querySelector('ul');
    if (brandP && linksUl) {
      const toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'nav-newsroom-toggle';
      toggle.setAttribute('aria-label', 'Toggle newsroom links');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.innerHTML = '<span class="nav-newsroom-chevron" aria-hidden="true"></span>';
      brandP.append(toggle);
      toggle.addEventListener('click', () => {
        const open = toggle.getAttribute('aria-expanded') === 'true';
        toggle.setAttribute('aria-expanded', open ? 'false' : 'true');
        navNewsroom.classList.toggle('nav-newsroom-open', !open);
      });
    }
  }

  // hamburger for mobile
  const hamburger = document.createElement('div');
  hamburger.className = 'nav-hamburger';
  hamburger.innerHTML = `<button type="button" aria-controls="nav" aria-label="Open navigation">
      <span class="nav-hamburger-icon"></span>
    </button>`;
  hamburger.addEventListener('click', () => toggleMobileMenu(nav));
  nav.prepend(hamburger);

  // close panels when clicking outside
  document.addEventListener('click', (e) => {
    if (isDesktop.matches && !nav.contains(e.target)) closeAllPanels(nav);
  });

  // close on escape
  document.addEventListener('keydown', (e) => {
    if (e.code === 'Escape') {
      closeAllPanels(nav);
      if (!isDesktop.matches) toggleMobileMenu(nav, true);
    }
  });

  // viewport resize handling: reset state when crossing the breakpoint
  isDesktop.addEventListener('change', () => {
    closeAllPanels(nav);
    toggleMobileMenu(nav, true);
    const button = nav.querySelector('.nav-hamburger button');
    if (button) button.setAttribute('aria-label', 'Open navigation');
    document.body.style.overflowY = '';
  });

  const navWrapper = document.createElement('div');
  navWrapper.className = 'nav-wrapper';
  navWrapper.append(nav);

  // The newsroom sub-bar spans full width below the centered global header.
  if (navNewsroom) {
    navNewsroom.remove();
    navWrapper.append(navNewsroom);
  }

  block.append(navWrapper);
  if (navBrand) { /* brand kept as-is */ }
}
