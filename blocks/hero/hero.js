/**
 * Hero block: full-bleed background image with an overlaid content band.
 * Generic — the authored picture becomes the background layer and every
 * remaining line is rendered in the band (divided by a rule in CSS) and
 * styled by its own tag. No per-row role classes.
 */
export default function decorate(block) {
  const cell = block.querySelector(':scope > div > div');
  if (!cell) return;

  const bg = document.createElement('div');
  bg.className = 'hero-bg';
  const picture = cell.querySelector('picture');
  if (picture) bg.append(picture);

  const content = document.createElement('div');
  content.className = 'hero-content';
  [...cell.children]
    .filter((el) => !el.querySelector('picture') && el.textContent.trim() !== '')
    .forEach((el) => content.append(el));

  block.replaceChildren(bg, content);
}
