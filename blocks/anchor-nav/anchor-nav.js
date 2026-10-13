const isDesktop = window.matchMedia('(min-width: 1024px)');

const DEFAULT_TITLE = 'Overview';
const CHEVRON = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false"><path fill="currentColor" d="M4.394 8.512a.518.518 0 0 0-.249.14.495.495 0 0 0-.081.59c.014.03 1.04 1.063 3.83 3.853 3.418 3.419 3.818 3.815 3.87 3.843.154.08.317.08.476-.001.06-.031.28-.249 3.86-3.83 2.624-2.622 3.806-3.81 3.824-3.841a.5.5 0 0 0-.07-.614.52.52 0 0 0-.353-.153.602.602 0 0 0-.224.055c-.059.027-.215.181-3.669 3.635L12 15.796l-3.608-3.607c-3.454-3.454-3.61-3.608-3.67-3.635a.5.5 0 0 0-.328-.042z"/></svg>';

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
  try {
    return document.getElementById(decodeURIComponent(hash.slice(1)));
  } catch (e) {
    return null;
  }
}

function setOpen(block, toggle, open) {
  block.classList.toggle('anchor-nav-open', open);
  toggle.setAttribute('aria-expanded', String(open));
}

function setupPinning(block, placeholder, title) {
  const links = [...block.querySelectorAll('.anchor-nav-links a')];
  let inPageHeight = block.offsetHeight;

  function update() {
    const offset = getHeaderOffset();
    const shouldPin = placeholder.getBoundingClientRect().top <= offset;
    const open = block.classList.contains('anchor-nav-open');
    if (!shouldPin && !open) inPageHeight = block.offsetHeight;
    const starts = links.map((link) => {
      const target = getTarget(link);
      return target && target.getBoundingClientRect().top
        - (parseFloat(getComputedStyle(target).marginTop) || 0);
    });

    placeholder.style.setProperty('--anchor-nav-placeholder-height', shouldPin ? `${inPageHeight}px` : '0px');
    block.style.setProperty('--anchor-nav-top', `${offset}px`);
    block.classList.toggle('anchor-nav-pinned', shouldPin);

    if (!open) {
      document.documentElement.style.scrollPaddingTop = `${offset + block.offsetHeight + 16}px`;
    }

    const limit = offset + inPageHeight + 1;
    let active = null;
    links.forEach((link, i) => {
      if (starts[i] !== null && starts[i] <= limit) active = link;
    });
    links.forEach((link) => {
      const isActive = link === active;
      link.parentElement.classList.toggle('active', isActive);
      if (isActive) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
    title.textContent = active ? active.textContent : DEFAULT_TITLE;
  }

  let frame = 0;
  const scheduleUpdate = () => {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      update();
    });
  };

  window.addEventListener('scroll', scheduleUpdate, { passive: true });
  window.addEventListener('resize', scheduleUpdate);
  isDesktop.addEventListener('change', scheduleUpdate);

  requestAnimationFrame(scheduleUpdate);
  window.addEventListener('load', scheduleUpdate);
}

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
    const open = !block.classList.contains('anchor-nav-open');
    if (open && !block.classList.contains('anchor-nav-pinned')) {
      const placeholder = block.previousElementSibling;
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.scrollTo({
        top: placeholder.getBoundingClientRect().top + window.scrollY - getHeaderOffset() + 1,
        behavior: reduceMotion ? 'auto' : 'smooth',
      });
    }
    setOpen(block, toggle, open);
  });
  row.prepend(toggle);

  block.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && block.classList.contains('anchor-nav-open')) {
      setOpen(block, toggle, false);
      toggle.focus();
    }
  });
  isDesktop.addEventListener('change', () => setOpen(block, toggle, false));

  document.addEventListener('click', (e) => {
    if (!block.classList.contains('anchor-nav-open')) return;
    if (e.target === block || !block.contains(e.target)) setOpen(block, toggle, false);
  });

  let cancelSettle = () => {};

  ul.addEventListener('click', (e) => {
    const link = e.target.closest('a');
    const target = link && getTarget(link);
    if (!target) return;
    e.preventDefault();
    setOpen(block, toggle, false);
    window.history.pushState(null, '', link.getAttribute('href'));
    cancelSettle();

    const delta = () => target.getBoundingClientRect().top - getHeaderOffset() - block.offsetHeight;
    if (Math.abs(delta()) <= 1) return;
    const scrollToTarget = (behavior) => {
      window.scrollTo({ top: window.scrollY + delta(), behavior });
    };
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    scrollToTarget(reduceMotion ? 'auto' : 'smooth');

    const userInput = ['wheel', 'touchstart', 'keydown'];
    let timer;
    const settle = () => {
      cancelSettle();
      if (Math.abs(delta()) > 1) scrollToTarget('auto');
    };
    cancelSettle = () => {
      window.removeEventListener('scrollend', settle);
      clearTimeout(timer);
      userInput.forEach((type) => window.removeEventListener(type, cancelSettle));
      cancelSettle = () => {};
    };
    userInput.forEach((type) => window.addEventListener(type, cancelSettle, { passive: true }));
    if ('onscrollend' in window) window.addEventListener('scrollend', settle);
    else timer = setTimeout(settle, 1000);
  });

  const placeholder = document.createElement('div');
  placeholder.className = 'anchor-nav-placeholder';
  block.before(placeholder);
  setupPinning(block, placeholder, title);
}
