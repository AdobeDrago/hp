import { createOptimizedPicture } from '../../scripts/aem.js';

export default function decorate(block) {
  const isIcon = block.classList.contains('icon');
  const isSideBySide = ['left', 'right'].some((c) => block.classList.contains(c));
  const hasTextHeader = !isSideBySide && ['image', 'product'].some((c) => block.classList.contains(c));
  const rows = [...block.children];
  const headerRow = (isIcon || hasTextHeader) ? rows.shift() : null;

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

  const iconWidth = isIcon ? '64' : '750';
  ul.querySelectorAll('picture > img').forEach((img) => {
    img.closest('picture').replaceWith(createOptimizedPicture(img.src, img.alt, false, [{ width: iconWidth }]));
  });

  const newChildren = [];
  if (headerRow && isIcon) {
    const cells = [...headerRow.children];
    const imageCell = cells.find((cell) => cell.querySelector('img'));
    const textCell = cells.find((cell) => cell !== imageCell);
    if (imageCell) {
      const img = imageCell.querySelector('img');
      imageCell.replaceChildren(createOptimizedPicture(img.src, img.alt, false, [
        { media: '(min-width: 1024px)', width: '1600' },
        { width: '750' },
      ]));
      imageCell.className = 'cards-icon-bg';
      newChildren.push(imageCell);
    }
    if (textCell) {
      textCell.className = 'cards-icon-header';
      newChildren.push(textCell);
    }
  } else if (headerRow && hasTextHeader) {
    const headerCells = [...headerRow.children].filter((cell) => cell.textContent.trim());
    const textCell = headerCells[headerCells.length - 1] || headerRow;
    textCell.className = 'cards-header';
    newChildren.push(textCell);
  }
  newChildren.push(ul);

  block.replaceChildren(...newChildren);
}
