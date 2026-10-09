/* eslint-disable */
/* global WebImporter */
const ORIGIN = 'https://www.hp.com';
const INLINE = { B: 'strong', STRONG: 'strong', I: 'em', EM: 'em', U: 'u', SUP: 'sup', SUB: 'sub', BR: 'br' };

function absUrl(url) {
  if (!url) return url;
  const u = url.trim();
  if (u.startsWith('#')) return u;
  if (u.startsWith('//')) return `https:${u}`;
  if (u.startsWith('/')) return `${ORIGIN}${u}`;
  return u;
}

function imgSrc(img) {
  const candidates = [img.getAttribute('src'), img.getAttribute('data-src')];
  const pic = img.closest('picture');
  if (pic) {
    pic.querySelectorAll('source').forEach((s) => {
      const ss = s.getAttribute('srcset') || s.getAttribute('data-srcset');
      if (ss) candidates.push(ss.split(',')[0].trim().split(/\s+/)[0]);
    });
  }
  return candidates.find((c) => c && !c.startsWith('data:')) || img.getAttribute('src') || '';
}

function makeImg(img, document) {
  if (!img) return null;
  const out = document.createElement('img');
  out.src = absUrl(imgSrc(img));
  out.alt = (img.getAttribute('alt') || '').trim();
  return out;
}

function copyInline(src, target, document) {
  src.childNodes.forEach((n) => {
    if (n.nodeType === 3) {
      target.append(document.createTextNode(n.textContent.replace(/\s+/g, ' ')));
    } else if (n.nodeType === 1) {
      if (n.tagName === 'A') {
        const a = document.createElement('a');
        if (n.getAttribute('href')) a.href = absUrl(n.getAttribute('href'));
        copyInline(n, a, document);
        target.append(a);
      } else if (INLINE[n.tagName]) {
        const el = document.createElement(INLINE[n.tagName]);
        if (n.tagName !== 'BR') copyInline(n, el, document);
        target.append(el);
      } else {
        copyInline(n, target, document);
      }
    }
  });
  return target;
}

function trimBr(el) {
  while (el.firstChild && (el.firstChild.nodeName === 'BR' || (el.firstChild.nodeType === 3 && !el.firstChild.textContent.trim()))) el.firstChild.remove();
  while (el.lastChild && (el.lastChild.nodeName === 'BR' || (el.lastChild.nodeType === 3 && !el.lastChild.textContent.trim()))) el.lastChild.remove();
  if (el.firstChild && el.firstChild.nodeType === 3) el.firstChild.textContent = el.firstChild.textContent.replace(/^\s+/, '');
  if (el.lastChild && el.lastChild.nodeType === 3) el.lastChild.textContent = el.lastChild.textContent.replace(/\s+$/, '');
  return el;
}

function para(src, document) {
  if (!src || !src.textContent.trim()) return null;
  return trimBr(copyInline(src, document.createElement('p'), document));
}

function heading(tag, src, document) {
  if (!src) return null;
  const t = src.textContent.replace(/\s+/g, ' ').trim();
  if (!t) return null;
  const h = document.createElement(tag);
  h.textContent = t;
  return h;
}

export default function parse(element, { document }) {
  const bgImg = element.querySelector(':scope > .c-hp-bg-container__body > .c-hp-bg-container__media-wrapper img')
    || element.querySelector('.c-hp-bg-container__media-wrapper img');
  const headerTat = [...element.querySelectorAll('.titleAndText')].find((t) => t.querySelector('.c-hp-tat__title'));

  const headerCell = [];
  if (headerTat) {
    const titleSrc = headerTat.querySelector('.c-hp-tat__title h1, .c-hp-tat__title h2, .c-hp-tat__title h3, .c-hp-tat__title');
    const h = heading('h2', titleSrc, document);
    if (h) headerCell.push(h);
    headerTat.querySelectorAll('.c-hp-tat__subtitle, .c-hp-tat__description').forEach((d) => {
      const p = para(d, document);
      if (p) headerCell.push(p);
    });
  }

  const rows = [];
  const imageCells = [...element.querySelectorAll('.c-hp-grid-cell')]
    .filter((c) => c.querySelector(':scope > .image img') && !c.querySelector('.c-hp-grid-cell'));
  imageCells.forEach((cell) => {
    const img = makeImg(cell.querySelector('.image img'), document);
    let textCell = cell.querySelector('.titleAndText');
    if (!textCell) {
      const next = cell.nextElementSibling;
      textCell = next && next.querySelector('.titleAndText');
    }
    const body = [];
    if (textCell) {
      const t = textCell.querySelector('.c-hp-tat__title h3, .c-hp-tat__title h4, .c-hp-tat__title');
      const h = heading('h3', t, document);
      if (h) body.push(h);
      textCell.querySelectorAll('.c-hp-tat__description, .c-hp-tat__subtitle').forEach((d) => {
        const p = para(d, document);
        if (p) body.push(p);
      });
    }
    if (img || body.length) rows.push([img || '', body.length ? body : '']);
  });

  if (!headerCell.length && !rows.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const cells = [[makeImg(bgImg, document) || '', headerCell.length ? headerCell : ''], ...rows];
  const block = WebImporter.Blocks.createBlock(document, { name: 'Cards (Spotlight)', cells });
  element.replaceWith(block);
}
