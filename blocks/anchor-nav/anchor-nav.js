const isDesktop = window.matchMedia('(min-width: 900px)');

const DEFAULT_TITLE = 'Overview';
const CHEVRON = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false"><path fill="currentColor" d="M4.394 8.512a.518.518 0 0 0-.249.14.495.495 0 0 0-.081.59c.014.03 1.04 1.063 3.83 3.853 3.418 3.419 3.818 3.815 3.87 3.843.154.08.317.08.476-.001.06-.031.28-.249 3.86-3.83 2.624-2.622 3.806-3.81 3.824-3.841a.5.5 0 0 0-.07-.614.52.52 0 0 0-.353-.153.602.602 0 0 0-.224.055c-.059.027-.215.181-3.669 3.635L12 15.796l-3.608-3.607c-3.454-3.454-3.61-3.608-3.67-3.635a.5.5 0 0 0-.328-.042z"/></svg>';

/**
 * Height of the part of the site header that stays stuck to the top of the
 * viewport (0 when the header scrolls away with the page).
 * @returns {number} offset in px
 */
function getHeaderOffset() {
  const header = document.querySelector('header');
  if (!header) return 0;
  const { position, top } = getComputedStyle(header);
  if (position !== 'sticky' && position !== 'fixed') return 0;
  return Math.max(0, header.offsetHeight + (parseFloat(top) || 0));
}

function getTarget(link) {
  const hash = link.getAttribute('href') || '';
  if (!hash.startsWith('#') || hash.length < 2) return null;
  return document.getElementById(decodeURIComponent(hash.slice(1)));
}

function setOpen(block, toggle, open) {
  block.classList.toggle('anchor-nav-open', open);
  toggle.setAttribute('aria-expanded', String(open));
}

/**
 * Pins the block below the sticky header once its natural position scrolls
 * there, releases it when scrolled back above that point, and marks the link
 * of the section currently under the nav as active.
 * @param {Element} block the block
 * @param {Element} placeholder keeps the block's layout space reserved while pinned
 * @param {Element} title the mobile dropdown title
 */
function setupPinning(block, placeholder, title) {
  const links = [...block.querySelectorAll('.anchor-nav-links a')];

  function update() {
    const offset = getHeaderOffset();
    const shouldPin = placeholder.getBoundingClientRect().top <= offset;

    placeholder.style.height = shouldPin ? `${block.offsetHeight}px` : '0';
    block.style.setProperty('--anchor-nav-top', `${offset}px`);
    block.classList.toggle('anchor-nav-pinned', shouldPin);

    const limit = offset + block.offsetHeight + 1;
    let active = null;
    links.forEach((link) => {
      const target = getTarget(link);
      if (target && target.getBoundingClientRect().top <= limit) active = link;
    });
    links.forEach((link) => {
      const isActive = link === active;
      link.parentElement.classList.toggle('active', isActive);
      if (isActive) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
    title.textContent = active ? active.textContent : DEFAULT_TITLE;
  }

  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  isDesktop.addEventListener('change', update);

  requestAnimationFrame(() => requestAnimationFrame(update));
  window.addEventListener('load', update);
}

/**
 * decorate the block
 * @param {Element} block the block
 */
export default function decorate(block) {
  const row = block.firstElementChild;
  const [linksCell, ctaCell] = row.children;

  const ul = document.createElement('ul');
  ul.id = `anchor-nav-links-${[...document.querySelectorAll('.anchor-nav')].indexOf(block)}`;
  linksCell.querySelectorAll('a').forEach((a) => {
    a.className = '';
    const li = document.createElement('li');
    li.append(a);
    ul.append(li);
  });
  linksCell.replaceChildren(ul);
  linksCell.className = 'anchor-nav-links';

  if (ctaCell) {
    ctaCell.className = 'anchor-nav-cta';
    const ctaLink = ctaCell.querySelector('a');
    if (ctaLink && !ctaLink.classList.contains('button')) {
      const strong = ctaLink.closest('strong');
      const em = ctaLink.closest('em');
      ctaLink.className = 'button';
      if (strong) ctaLink.classList.add('primary');
      else if (em) ctaLink.classList.add('secondary');
    }
  }

  // mobile dropdown toggle (hidden on desktop via CSS)
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'anchor-nav-toggle';
  toggle.setAttribute('aria-controls', ul.id);
  toggle.setAttribute('aria-expanded', 'false');
  const title = document.createElement('span');
  title.className = 'anchor-nav-toggle-title';
  title.textContent = DEFAULT_TITLE;
  toggle.append(title);
  toggle.insertAdjacentHTML('beforeend', CHEVRON);
  toggle.addEventListener('click', () => {
    setOpen(block, toggle, !block.classList.contains('anchor-nav-open'));
  });
  row.prepend(toggle);

  block.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && block.classList.contains('anchor-nav-open')) {
      setOpen(block, toggle, false);
      toggle.focus();
    }
  });
  isDesktop.addEventListener('change', () => setOpen(block, toggle, false));

  // in-page links: land the target section just below the pinned nav
  ul.addEventListener('click', (e) => {
    const link = e.target.closest('a');
    const target = link && getTarget(link);
    if (!target) return;
    e.preventDefault();
    setOpen(block, toggle, false);
    const scrollToTarget = (behavior) => {
      const top = target.getBoundingClientRect().top + window.scrollY
        - getHeaderOffset() - block.offsetHeight;
      window.scrollTo({ top, behavior });
    };
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    scrollToTarget(reduceMotion ? 'auto' : 'smooth');
    // lazy images loading above the target can shift it during the smooth
    // scroll: re-align once scrolling settles
    const settle = () => {
      const delta = target.getBoundingClientRect().top - getHeaderOffset() - block.offsetHeight;
      if (Math.abs(delta) > 1) scrollToTarget('auto');
    };
    if ('onscrollend' in window) window.addEventListener('scrollend', settle, { once: true });
    else setTimeout(settle, 1000);
    window.history.pushState(null, '', link.getAttribute('href'));
  });

  const placeholder = document.createElement('div');
  placeholder.className = 'anchor-nav-placeholder';
  block.before(placeholder);
  setupPinning(block, placeholder, title);
}
