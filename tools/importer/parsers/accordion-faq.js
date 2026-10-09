/* eslint-disable */
/* global WebImporter */
const ORIGIN = 'https://www.hp.com';
const INLINE = { B: 'strong', STRONG: 'strong', I: 'em', EM: 'em', U: 'u', SUP: 'sup', SUB: 'sub', BR: 'br' };
const BLOCKS = { P: 'p', UL: 'ul', OL: 'ol', LI: 'li' };
const SKIP = ['STYLE', 'SCRIPT', 'NOSCRIPT', 'TEMPLATE', 'svg', 'SVG', 'BUTTON'];

function absUrl(url) {
  if (!url) return url;
  const u = url.trim();
  if (u.startsWith('#')) return u;
  if (u.startsWith('//')) return `https:${u}`;
  if (u.startsWith('/')) return `${ORIGIN}${u}`;
  return u;
}

function copyRich(src, target, document) {
  src.childNodes.forEach((n) => {
    if (n.nodeType === 3) {
      target.append(document.createTextNode(n.textContent.replace(/\s+/g, ' ')));
    } else if (n.nodeType === 1) {
      if (SKIP.includes(n.tagName)) return;
      let el = null;
      if (n.tagName === 'A') {
        el = document.createElement('a');
        if (n.getAttribute('href')) el.href = absUrl(n.getAttribute('href'));
      } else if (INLINE[n.tagName]) el = document.createElement(INLINE[n.tagName]);
      else if (BLOCKS[n.tagName]) el = document.createElement(BLOCKS[n.tagName]);
      if (el) {
        if (n.tagName !== 'BR') copyRich(n, el, document);
        target.append(el);
      } else {
        copyRich(n, target, document);
      }
    }
  });
  return target;
}

function answerContent(copy, document) {
  const tmp = copyRich(copy, document.createElement('div'), document);
  const out = [];
  let run = null;
  [...tmp.childNodes].forEach((n) => {
    if (n.nodeType === 1 && ['P', 'UL', 'OL'].includes(n.tagName)) {
      run = null;
      if (n.textContent.trim()) out.push(n);
    } else {
      if (!run) {
        run = document.createElement('p');
        out.push(run);
      }
      run.append(n);
    }
  });
  return out.filter((el) => el.textContent.trim()).map((el) => {
    if (el.tagName === 'P') {
      if (el.firstChild && el.firstChild.nodeType === 3) el.firstChild.textContent = el.firstChild.textContent.replace(/^\s+/, '');
      if (el.lastChild && el.lastChild.nodeType === 3) el.lastChild.textContent = el.lastChild.textContent.replace(/\s+$/, '');
    }
    return el;
  });
}

export default function parse(element, { document }) {
  let items = [...element.querySelectorAll('div.collapsibleSection')];
  if (!items.length) items = [...element.querySelectorAll('c-hp-collapsible-section')];

  const cells = [];
  items.forEach((item) => {
    const titleSrc = item.querySelector('.c-hp-collapsible-section__title');
    const question = titleSrc ? titleSrc.textContent.replace(/\s+/g, ' ').trim() : '';
    if (!question) return;

    const answer = [];
    const copy = item.querySelector('.c-hp-collapsible-section__copy, .c-hp-collapsible-section__description-content');
    if (copy) answer.push(...answerContent(copy, document));
    item.querySelectorAll('.c-hp-collapsible-section__cta a[href]').forEach((src) => {
      const label = src.textContent.replace(/\s+/g, ' ').trim();
      if (!label) return;
      const a = document.createElement('a');
      a.href = absUrl(src.getAttribute('href'));
      a.textContent = label;
      const p = document.createElement('p');
      p.append(a);
      answer.push(p);
    });

    const q = document.createElement('p');
    q.textContent = question;
    cells.push([q, answer.length ? answer : '']);
  });

  if (!cells.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'Accordion (Faq)', cells });
  element.replaceWith(block);
}
