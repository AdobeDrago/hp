/* eslint-disable */
/* global WebImporter */
const BLOCK_NAME = 'Cards (Feature)';
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

function trimEdges(el) {
  const blank = (n) => n && (n.nodeName === 'BR' || (n.nodeType === 3 && !n.textContent.trim()));
  while (blank(el.firstChild)) el.firstChild.remove();
  while (blank(el.lastChild)) el.lastChild.remove();
  if (el.firstChild && el.firstChild.nodeType === 3) el.firstChild.textContent = el.firstChild.textContent.replace(/^\s+/, '');
  if (el.lastChild && el.lastChild.nodeType === 3) el.lastChild.textContent = el.lastChild.textContent.replace(/\s+$/, '');
  return el;
}

function para(src, document) {
  if (!src || !src.textContent.trim()) return null;
  return trimEdges(copyInline(src, document.createElement('p'), document));
}

function heading(tag, src, document) {
  if (!src) return null;
  const t = src.textContent.replace(/\s+/g, ' ').trim();
  if (!t) return null;
  const h = document.createElement(tag);
  h.textContent = t;
  return h;
}

function tatContent(tat, headingTag, document) {
  const out = [];
  if (!tat) return out;
  const h = heading(headingTag, tat.querySelector('.c-hp-tat__title'), document);
  if (h) out.push(h);
  tat.querySelectorAll('.c-hp-tat__subtitle, .c-hp-tat__description').forEach((d) => {
    const p = para(d, document);
    if (p) out.push(p);
  });
  return out;
}

function ctaParagraphs(scope, document) {
  return [...scope.querySelectorAll('.ctaButton a[href], a.c-hp-button[href]')]
    .filter((a, i, arr) => arr.indexOf(a) === i)
    .map((src) => {
      const label = src.textContent.replace(/\s+/g, ' ').trim();
      if (!label) return null;
      const a = document.createElement('a');
      a.href = absUrl(src.getAttribute('href'));
      a.textContent = label;
      const p = document.createElement('p');
      p.append(a);
      return p;
    })
    .filter(Boolean);
}

export default function parse(element, { document }) {
  const leafCells = [...element.querySelectorAll('.c-hp-grid-cell')].filter((c) => !c.querySelector('.c-hp-grid-cell'));

  const headerCellSrc = leafCells.find((c) => !c.querySelector('.image img') && c.querySelector('.titleAndText .c-hp-tat__title'));
  const headerContent = headerCellSrc ? [
    ...tatContent(headerCellSrc.querySelector('.titleAndText'), 'h2', document),
    ...ctaParagraphs(headerCellSrc, document),
  ] : [];

  const rows = [];
  leafCells.filter((c) => c.querySelector('.image img')).forEach((cell) => {
    const img = makeImg(cell.querySelector('.image img'), document);
    const body = [...tatContent(cell.querySelector('.titleAndText'), 'h3', document), ...ctaParagraphs(cell, document)];
    rows.push([img || '', body.length ? body : '']);
  });

  if (!headerContent.length && !rows.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const cells = [['', headerContent.length ? headerContent : ''], ...rows];
  const block = WebImporter.Blocks.createBlock(document, { name: BLOCK_NAME, cells });
  element.replaceWith(block);
}
