/*
 * Accordion Block
 * Recreate an accordion
 * https://www.hlx.live/developer/block-collection/accordion
 */

const FAQ_ANIMATION = { duration: 300, easing: 'ease-in-out' };
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

function animateToggle(details) {
  const summary = details.querySelector('summary');
  let animation = null;

  const heightWhen = (open) => {
    const was = details.open;
    details.open = open;
    const h = details.getBoundingClientRect().height;
    details.open = was;
    return h;
  };

  const onCloseIcon = (e) => {
    const icon = getComputedStyle(summary, '::after');
    const box = summary.getBoundingClientRect();
    const right = box.right - parseFloat(icon.right);
    const top = box.top + parseFloat(icon.top);
    return e.clientX >= right - parseFloat(icon.width) && e.clientX <= right
      && e.clientY >= top && e.clientY <= top + parseFloat(icon.height);
  };

  summary.addEventListener('click', (e) => {
    const isOpen = animation ? details.classList.contains('is-opening') : details.open;
    if (isOpen && e.detail > 0 && !onCloseIcon(e)) {
      e.preventDefault();
      return;
    }
    if (reducedMotion.matches) return;
    e.preventDefault();

    const closing = isOpen;
    const from = details.getBoundingClientRect().height;
    if (animation) animation.cancel();
    const to = heightWhen(!closing);

    details.classList.toggle('is-opening', !closing);
    details.classList.toggle('is-closing', closing);
    if (!closing) details.open = true;
    details.style.overflow = 'hidden';

    animation = details.animate({ height: [`${from}px`, `${to}px`] }, FAQ_ANIMATION);
    animation.onfinish = () => {
      if (closing) details.open = false;
      details.classList.remove('is-opening', 'is-closing');
      details.style.overflow = '';
      animation = null;
    };
  });
}

export default function decorate(block) {
  const animate = block.classList.contains('faq');
  [...block.children].forEach((row) => {
    // decorate accordion item label
    const label = row.children[0];
    const summary = document.createElement('summary');
    summary.className = 'accordion-item-label';
    summary.append(...label.childNodes);
    // decorate accordion item body
    const body = row.children[1];
    body.className = 'accordion-item-body';
    // decorate accordion item
    const details = document.createElement('details');
    details.className = 'accordion-item';
    details.append(summary, body);
    if (animate) animateToggle(details);
    row.replaceWith(details);
  });
}
