import { createOptimizedPicture } from '../../scripts/aem.js';

export default function decorate(block) {
  const isSpotlight = block.classList.contains('spotlight');
  const hasTextHeader = ['grid', 'showcase', 'feature'].some((c) => block.classList.contains(c));
  const rows = [...block.children];
  const headerRow = (isSpotlight || hasTextHeader) ? rows.shift() : null;

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
    const headerCells = [...headerRow.children].filter((cell) => cell.textContent.trim());
    const textCell = headerCells[headerCells.length - 1] || headerRow;
    textCell.className = 'cards-header';
    newChildren.push(textCell);
  }
  newChildren.push(ul);

  block.replaceChildren(...newChildren);
}
