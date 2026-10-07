import { createOptimizedPicture } from '../../scripts/aem.js';

export default function decorate(block) {
  // "spotlight": first row is a background photo + heading/intro, the rest
  // are a vertical icon + text list instead of a boxed grid.
  // "grid" and "showcase" are handled identically here - they only diverge
  // in cards.css (boxed/left vs. borderless/centered cards). "feature" shares
  // the same text header row and differs only in cards.css (borderless 4-up).
  const isSpotlight = block.classList.contains('spotlight');
  const hasTextHeader = ['grid', 'showcase', 'feature'].some((c) => block.classList.contains(c));
  const rows = [...block.children];
  const headerRow = (isSpotlight || hasTextHeader) ? rows.shift() : null;

  /* change remaining rows to ul, li */
  const ul = document.createElement('ul');
  rows.forEach((row) => {
    const li = document.createElement('li');
    while (row.firstElementChild) li.append(row.firstElementChild);
    [...li.children].forEach((div) => {
      if (div.children.length === 1 && div.querySelector('picture')) div.className = 'cards-card-image';
      else div.className = 'cards-card-body';
    });
    ul.append(li);
  });

  // replace images with optimized versions - icons in the spotlight list stay
  // small, photo cards (default grid and other variants) keep the existing
  // larger size
  const iconWidth = isSpotlight ? '64' : '750';
  ul.querySelectorAll('picture > img').forEach((img) => {
    img.closest('picture').replaceWith(createOptimizedPicture(img.src, img.alt, false, [{ width: iconWidth }]));
  });

  const newChildren = [];
  if (headerRow && isSpotlight) {
    const [imageCell, textCell] = headerRow.children;
    const img = imageCell && imageCell.querySelector('img');
    if (img) {
      imageCell.replaceChildren(createOptimizedPicture(img.src, img.alt, true, [
        { media: '(min-width: 900px)', width: '1600' },
        { width: '750' },
      ]));
    }
    imageCell.className = 'cards-spotlight-bg';
    textCell.className = 'cards-spotlight-header';
    newChildren.push(imageCell, textCell);
  } else if (headerRow && hasTextHeader) {
    // authors may leave a leading cell empty - use whichever cell has content
    const headerCells = [...headerRow.children].filter((cell) => cell.textContent.trim());
    const textCell = headerCells[headerCells.length - 1] || headerRow;
    textCell.className = 'cards-header';
    newChildren.push(textCell);
  }
  newChildren.push(ul);

  block.replaceChildren(...newChildren);
}
