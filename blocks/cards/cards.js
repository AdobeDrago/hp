import { createOptimizedPicture } from '../../scripts/aem.js';

export default function decorate(block) {
  // "feature list" variant: first row is a background photo + heading/intro,
  // the rest are a vertical list of icon + text items instead of a boxed grid
  const isBenefits = block.classList.contains('benefits');
  const rows = [...block.children];
  const headerRow = isBenefits ? rows.shift() : null;

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

  // replace images with optimized versions - icons in a feature list stay
  // small, photo cards keep the existing larger grid size
  const iconWidth = isBenefits ? '64' : '750';
  ul.querySelectorAll('picture > img').forEach((img) => {
    img.closest('picture').replaceWith(createOptimizedPicture(img.src, img.alt, false, [{ width: iconWidth }]));
  });

  const newChildren = [];
  if (headerRow) {
    const [imageCell, textCell] = headerRow.children;
    const img = imageCell && imageCell.querySelector('img');
    if (img) {
      imageCell.replaceChildren(createOptimizedPicture(img.src, img.alt, true, [
        { media: '(min-width: 900px)', width: '1600' },
        { width: '750' },
      ]));
    }
    imageCell.className = 'cards-feature-bg';
    textCell.className = 'cards-feature-header';
    newChildren.push(imageCell, textCell);
  }
  newChildren.push(ul);

  block.replaceChildren(...newChildren);
}
