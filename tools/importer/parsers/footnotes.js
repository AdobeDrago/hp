/* eslint-disable */
/* global WebImporter */
const ORIGIN = 'https://www.hp.com';
const INLINE = { B: 'strong', STRONG: 'strong', I: 'em', EM: 'em', U: 'u', SUP: 'sup', SUB: 'sub', BR: 'br' };
const SKIP = ['STYLE', 'SCRIPT', 'NOSCRIPT', 'TEMPLATE', 'BUTTON'];

function absUrl(url) {
  if (!url) return url;
  const u = url.trim();
  if (u.startsWith('#')) return u;
  if (u.startsWith('//')) return `https:${u}`;
  if (u.startsWith('/')) return `${ORIGIN}${u}`;
  return u;
}

function norm(t) {
  return (t || '').replace(/\s+/g, ' ').trim();
}

function copyInline(src, target, document) {
  src.childNodes.forEach((n) => {
    if (n.nodeType === 3) {
      target.append(document.createTextNode(n.textContent.replace(/\s+/g, ' ')));
    } else if (n.nodeType === 1) {
      if (SKIP.includes(n.tagName.toUpperCase())) return;
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

function disclaimerParagraphs(itemContent, document) {
  const out = [];
  let current = document.createElement('p');
  let pendingBr = 0;
  const flush = () => {
    trimEdges(current);
    if (current.textContent.trim()) out.push(current);
    current = document.createElement('p');
  };
  itemContent.childNodes.forEach((n) => {
    if (n.nodeType === 1 && ['OL', 'UL'].includes(n.tagName)) return;
    if (n.nodeType === 1 && n.querySelector && n.querySelector('ol, ul')) return;
    if (n.nodeType === 1 && SKIP.includes(n.tagName.toUpperCase())) return;
    if (n.nodeName === 'BR') {
      pendingBr += 1;
      if (pendingBr >= 2) {
        flush();
        pendingBr = 0;
      }
      return;
    }
    if (n.nodeType === 3 && !n.textContent.trim()) return;
    if (pendingBr === 1) current.append(document.createElement('br'));
    pendingBr = 0;
    const holder = document.createElement('span');
    holder.append(n.cloneNode(true));
    copyInline(holder, current, document);
  });
  flush();
  return out;
}

export default function parse(element, { document }) {
  const titleSrc = element.querySelector('.c-hp-footnotes__title');
  const title = norm(titleSrc && titleSrc.textContent) || 'Footnotes and Disclaimers';

  const referenced = new Set(
    [...document.querySelectorAll('a[href^="#footnote-"]')]
      .filter((a) => !element.contains(a))
      .map((a) => norm(a.getAttribute('title'))),
  );

  const rows = [];
  let items = [...element.querySelectorAll('.c-hp-footnotes__list--static > li')];
  if (!items.length) items = [...element.querySelectorAll('.c-hp-footnotes__item')];

  items.forEach((li) => {
    const content = li.querySelector('.c-hp-footnotes__item-content') || li;
    disclaimerParagraphs(content, document).forEach((p) => rows.push([p]));

    content.querySelectorAll('ol').forEach((ol) => {
      const remaining = [...ol.children].filter((item) => item.tagName === 'LI' && !referenced.has(norm(item.textContent)));
      if (!remaining.length) return;
      const list = document.createElement('ol');
      remaining.forEach((item) => {
        const out = trimEdges(copyInline(item, document.createElement('li'), document));
        if (out.textContent.trim()) list.append(out);
      });
      if (list.children.length) rows.push([list]);
    });
  });

  if (!rows.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const cells = [[title], ...rows];
  const block = WebImporter.Blocks.createBlock(document, { name: 'Footnotes', cells });
  element.replaceWith(block);
}
