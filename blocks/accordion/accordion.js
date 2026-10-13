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

  const onCloseIcon = (e) => !!e.target.closest('.accordion-item-icon');

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

    animation = details.animate({ height: [`${from}px`, `${to}px`] }, FAQ_ANIMATION);
    animation.onfinish = () => {
      if (closing) details.open = false;
      details.classList.remove('is-opening', 'is-closing');
      animation = null;
    };
  });
}

export default function decorate(block) {
  const animate = block.classList.contains('faq');
  [...block.children].forEach((row) => {
    const label = row.children[0];
    const summary = document.createElement('summary');
    summary.className = 'accordion-item-label';
    summary.append(...label.childNodes);
    const body = row.children[1];
    body.className = 'accordion-item-body';
    const details = document.createElement('details');
    details.className = 'accordion-item';
    details.append(summary, body);
    if (animate) {
      const icon = document.createElement('span');
      icon.className = 'accordion-item-icon';
      icon.setAttribute('aria-hidden', 'true');
      summary.append(icon);
      animateToggle(details);
    }
    row.replaceWith(details);
  });
}
