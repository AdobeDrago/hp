// label of the collapsed toggle while no linked section is under the bar
const DEFAULT_LABEL = 'Overview';

/**
 * Decorates the section-nav block: sticky in-page jump links.
 * EDS has no native way to assign an id to an arbitrary section, so the
 * target sections carry a `Section Metadata` "Id" row (delivered as
 * data-id on the section) and this block scrolls to that element instead
 * of relying on native anchor/id behavior.
 * Like the reference, the link of the section currently under the bar is
 * marked active (scroll-spy), and when the links don't fit on one row they
 * fold into a "current section ⌄" toggle that opens them as a list.
 * @param {Element} block The section-nav block element
 */
export default function decorate(block) {
  const bar = block.closest('.section') || block;
  const panel = block.closest('.section-nav-wrapper') || block;
  const list = block.querySelector('ul');
  const links = [...block.querySelectorAll('a[href^="#"]')];
  // the published site turns the "Id" row into the section's id; other
  // pipelines deliver it as data-id
  const findTarget = (link) => {
    const id = decodeURIComponent(link.getAttribute('href').slice(1));
    return document.getElementById(id) || document.querySelector(`[data-id="${CSS.escape(id)}"]`);
  };
  // bottom edge of the pinned bar (fixed header offset + bar height)
  const barBottom = () => (parseFloat(getComputedStyle(bar).top) || 0) + bar.offsetHeight;

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'section-nav-toggle';
  toggle.setAttribute('aria-expanded', 'false');
  const label = document.createElement('span');
  label.className = 'section-nav-label';
  label.textContent = DEFAULT_LABEL;
  toggle.append(label);
  if (list) {
    list.id = list.id || 'section-nav-list';
    toggle.setAttribute('aria-controls', list.id);
    list.before(toggle);
  }

  const setOpen = (open) => {
    if (open === bar.classList.contains('is-open')) return;
    // the open panel overlays the page; hold the bar's own height meanwhile
    bar.style.height = open ? `${bar.offsetHeight}px` : '';
    bar.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
  };

  toggle.addEventListener('click', () => setOpen(!bar.classList.contains('is-open')));
  document.addEventListener('click', (event) => {
    if (bar.classList.contains('is-open') && !panel.contains(event.target)) setOpen(false);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || !bar.classList.contains('is-open')) return;
    setOpen(false);
    toggle.focus();
  });

  // collapse only when the links overflow their row (measured inline)
  let lastWidth = 0;
  const fit = () => {
    if (!list || bar.offsetWidth === lastWidth) return;
    lastWidth = bar.offsetWidth;
    setOpen(false);
    block.classList.remove('is-collapsed');
    block.classList.toggle('is-collapsed', list.scrollWidth > list.clientWidth + 1);
  };
  new ResizeObserver(fit).observe(bar);
  fit();

  // land below the fixed header + this sticky bar, not underneath them.
  // Lazy images above the target still load (and grow the page) during the
  // smooth scroll, so re-aim once scrolling settles if the target moved.
  const scrollToTarget = (target, attempts = 3) => {
    const top = target.getBoundingClientRect().top + window.scrollY - barBottom();
    window.scrollTo({ top, behavior: 'smooth' });
    if (attempts <= 1) return;
    let timer;
    const settle = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        window.removeEventListener('scroll', settle);
        if (Math.abs(target.getBoundingClientRect().top - barBottom()) > 2) {
          scrollToTarget(target, attempts - 1);
        }
      }, 150);
    };
    window.addEventListener('scroll', settle, { passive: true });
    settle();
  };

  links.forEach((link) => {
    link.addEventListener('click', (event) => {
      const target = findTarget(link);
      if (!target) return;
      event.preventDefault();
      setOpen(false);
      scrollToTarget(target);
    });
  });

  let current = null;
  const update = () => {
    const edge = barBottom() + 1;
    const active = links.findLast((link) => {
      const rect = findTarget(link)?.getBoundingClientRect();
      return rect && rect.top <= edge && rect.bottom > edge;
    }) || null;
    if (active === current) return;
    current?.removeAttribute('aria-current');
    current?.parentElement.classList.remove('active');
    current = active;
    label.textContent = active ? active.textContent : DEFAULT_LABEL;
    if (!active) return;
    active.setAttribute('aria-current', 'true');
    const li = active.parentElement;
    li.classList.add('active');
    // keep the active link visible in the horizontally scrolling list
    if (!block.classList.contains('is-collapsed') && list.scrollWidth > list.clientWidth) {
      const left = list.scrollLeft + li.getBoundingClientRect().left
        - list.getBoundingClientRect().left;
      list.scrollTo({ left, behavior: 'smooth' });
    }
  };

  let ticking = false;
  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      update();
    });
  }, { passive: true });
}
