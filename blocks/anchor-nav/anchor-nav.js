const isDesktop = window.matchMedia('(min-width: 900px)');

/**
 * Pins the block to the top of the viewport once its natural position
 * scrolls there, and releases it again when scrolled back above that point.
 * @param {Element} block the block
 * @param {Element} placeholder keeps the block's layout space reserved while pinned
 */
function setupPinning(block, placeholder) {
  function update() {
    // this project's header scrolls away with the page at every breakpoint
    // (no fixed header bar), so the nav always pins flush to the top
    const shouldPin = placeholder.getBoundingClientRect().top <= 0;

    placeholder.style.height = shouldPin ? `${block.offsetHeight}px` : '0';
    block.classList.toggle('anchor-nav-pinned', shouldPin);
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

  const placeholder = document.createElement('div');
  placeholder.className = 'anchor-nav-placeholder';
  block.before(placeholder);
  setupPinning(block, placeholder);
}
