/**
 * Hero block: full-bleed background image with an overlaid content band.
 * Splits the authored picture into a background layer and tags the text
 * rows by role so the CSS can style and divide them. Flexible: any subset
 * of eyebrow / title / description / date / CTA may be present.
 */
export default function decorate(block) {
  const cell = block.querySelector(':scope > div > div');
  if (!cell) return;

  const kids = [...cell.children];

  // background image
  const bg = document.createElement('div');
  bg.className = 'hero-bg';
  const picture = cell.querySelector('picture');
  if (picture) bg.append(picture);

  // content rows (skip the picture wrapper and empty nodes)
  const content = document.createElement('div');
  content.className = 'hero-content';
  const rows = kids.filter((el) => !el.querySelector('picture') && el.textContent.trim() !== '');

  // a CTA is a standalone link (decorateButtons wraps it as .button-container)
  const isCta = (el) => el.classList.contains('button-container')
    || (el.children.length === 1
      && el.firstElementChild.tagName === 'A'
      && el.textContent.trim() === el.firstElementChild.textContent.trim());

  const title = rows.find((el) => el.tagName === 'H1');
  let passedTitle = false;
  const meta = [];
  rows.forEach((el) => {
    if (el === title) {
      el.className = 'hero-title';
      passedTitle = true;
    } else if (isCta(el)) {
      el.classList.add('hero-cta'); // keep the button-container class
    } else if (!passedTitle) {
      el.className = 'hero-eyebrow';
    } else {
      meta.push(el);
    }
  });
  // remaining rows after the title: all but the last are description, last is the date
  meta.forEach((el, i) => {
    el.className = i === meta.length - 1 ? 'hero-date' : 'hero-desc';
  });

  rows.forEach((el) => content.append(el));
  block.replaceChildren(bg, content);
}
