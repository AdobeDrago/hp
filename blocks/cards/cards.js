import { createOptimizedPicture, loadCSS } from '../../scripts/aem.js';
import { renderDropdown } from '../cta-dropdown/cta-dropdown.js';

const BAND_IMAGE_SIZES = [{ media: '(min-width: 600px)', width: '2000' }, { width: '750' }];
const LABEL_WORD = /^(explore|download|downloads|read|view|watch|see|get|learn)\b/i;
const FILE_LINK = /\.(pdf|jpe?g|png|zip|docx?|pptx?)(\?|#|$)/i;

function isLinkOnly(el) {
  if (el.tagName === 'UL' || el.tagName === 'OL') {
    return el.children.length > 0 && [...el.children].every((li) => {
      const a = li.querySelector('a[href]');
      return a && li.textContent.trim() === a.textContent.trim();
    });
  }
  const a = el.tagName === 'P' && el.querySelector('a[href]');
  return !!a && el.textContent.trim() === a.textContent.trim();
}

// only the trailing run of link-only paragraphs/lists is the card CTA; earlier links stay inline
function decoratePressLinks(body) {
  const group = [];
  let el = body.lastElementChild;
  while (el && isLinkOnly(el)) {
    group.unshift(el);
    el = el.previousElementSibling;
  }
  if (!group.length) return;
  const links = group.flatMap((g) => [...g.querySelectorAll('a[href]')]);
  let label = '';
  const labelText = el && el.tagName === 'P' && !el.querySelector('a') ? el.textContent.trim() : '';
  if (labelText.split(/\s+/).length <= 3 && (LABEL_WORD.test(labelText) || labelText.endsWith(':'))) {
    label = labelText.replace(/:$/, '');
    el.remove();
  }
  if (!label && links.length > 1) label = links.every((a) => FILE_LINK.test(a.href)) ? 'Download' : 'Explore';
  const wrapper = document.createElement('div');
  wrapper.className = 'cta-dropdown';
  group[0].before(wrapper);
  group.forEach((g) => g.remove());
  links.forEach((a) => a.classList.remove('button'));
  renderDropdown(wrapper, label, links);
}

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

  if (has('press')) {
    loadCSS(`${window.hlx.codeBasePath}/blocks/cta-dropdown/cta-dropdown.css`);
    list.querySelectorAll('.cards-card-body').forEach(decoratePressLinks);
  }
}
