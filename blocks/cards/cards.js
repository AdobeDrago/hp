import { createOptimizedPicture } from '../../scripts/aem.js';

const BAND_IMAGE_SIZES = [{ media: '(min-width: 600px)', width: '2000' }, { width: '750' }];

export default function decorate(block) {
  const has = (variant) => block.classList.contains(variant);
  const isIcon = has('icon');
  const isBand = has('left') || has('right');
  const hasTextHeader = !isBand && (has('product') || (has('image') && (has('3-up') || has('4-up'))));
  const rows = [...block.children];
  const headerRow = (isIcon || hasTextHeader) ? rows.shift() : null;

  const list = document.createElement(isBand ? 'div' : 'ul');
  if (isBand) list.className = 'cards-band';
  rows.forEach((row) => {
    const item = document.createElement(isBand ? 'div' : 'li');
    if (isBand) item.className = 'cards-band-item';
    while (row.firstElementChild) item.append(row.firstElementChild);
    [...item.children].forEach((div) => {
      if (div.children.length === 1 && div.querySelector('picture')) div.className = 'cards-card-image';
      else div.className = 'cards-card-body';
    });
    list.append(item);
  });

  const iconWidth = isIcon ? '64' : '750';
  list.querySelectorAll('picture > img').forEach((img) => {
    const sizes = isBand && img.closest('.cards-card-image') ? BAND_IMAGE_SIZES : [{ width: iconWidth }];
    img.closest('picture').replaceWith(createOptimizedPicture(img.src, img.alt, false, sizes));
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
  newChildren.push(list);

  block.replaceChildren(...newChildren);
}
