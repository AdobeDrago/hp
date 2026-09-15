/**
 * Hero block: full-bleed background image with an overlaid content band.
 * Splits the authored picture into a background layer and tags the text
 * rows (eyebrow / title / description / date) so the CSS can style and
 * divide them without relying on fragile positional selectors.
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

  // content rows (skip the now-empty picture wrapper and empty nodes)
  const content = document.createElement('div');
  content.className = 'hero-content';
  const rows = kids.filter((el) => !el.querySelector('picture') && el.textContent.trim() !== '');

  const title = rows.find((el) => el.tagName === 'H1');
  let passedTitle = false;
  const afterTitle = [];
  rows.forEach((el) => {
    if (el === title) {
      el.className = 'hero-title';
      passedTitle = true;
    } else if (!passedTitle) {
      el.className = 'hero-eyebrow';
    } else {
      afterTitle.push(el);
    }
  });
  // everything after the title is description, except the last row (the date)
  afterTitle.forEach((el, i) => {
    el.className = i === afterTitle.length - 1 ? 'hero-date' : 'hero-desc';
  });

  rows.forEach((el) => content.append(el));
  block.replaceChildren(bg, content);
}
