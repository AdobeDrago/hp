/* eslint-disable */
/* global WebImporter */
/**
 * Parser for promo-compact. Base block: promo (option "compact").
 * Source: https://www.hp.com/us-en/ai-solutions/next-gen-ai-pcs.html
 * Instance selector: #body > div.root > div.aem-Grid > div.containedSectionBlock
 *
 * Target structure (blocks/promo/promo.js - one 1-cell row per part; the row
 * holding a picture becomes .promo-media, the other .promo-content):
 *   | Promo (Compact)                                                |
 *   | main image                                                     |
 *   | h2, p <strong><a>primary CTA</a></strong>, p <em><a>secondary CTA</a></em> |
 * CTAs: c-hp-button--primary -> <strong><a>, --secondary -> <em><a>.
 * Superscript footnote numbers become dynamic footnote refs per
 * blocks/footnotes/footnotes.js: <sup><a href="#footnote-<key>" title="<text>">n</a></sup>,
 * the text taken from the page's c-hp-footnotes numbered list.
 */
const BLOCK_NAME = 'Promo (Compact)';
// 'image-first' -> image row, content row; 'content-first' -> content row, image row
const ROW_ORDER = 'image-first';

const ORIGIN = 'https://www.hp.com';
const INLINE = { B: 'strong', STRONG: 'strong', I: 'em', EM: 'em', U: 'u', SUP: 'sup', SUB: 'sub', BR: 'br' };
const FOOTNOTE_KEYS = [[/copilot/i, 'copilot'], [/windows/i, 'windows']];

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

/** numbered footnotes (static list) of the page, keyed by number */
function footnoteMap(document) {
  const map = {};
  const used = new Set();
  const items = document.querySelectorAll('c-hp-footnotes .c-hp-footnotes__list--static ol > li, .c-hp-footnotes__list--static ol > li');
  [...new Set(items)].forEach((li, i) => {
    const n = i + 1;
    const text = li.textContent.replace(/\s+/g, ' ').trim();
    const hint = FOOTNOTE_KEYS.find(([re, key]) => re.test(text) && !used.has(key));
    const key = hint ? hint[1] : `note-${n}`;
    used.add(key);
    map[n] = { key, text };
  });
  return map;
}

function copyInline(src, target, document, notes) {
  src.childNodes.forEach((n) => {
    if (n.nodeType === 3) {
      target.append(document.createTextNode(n.textContent.replace(/\s+/g, ' ')));
    } else if (n.nodeType === 1) {
      const num = n.textContent.trim();
      if (n.tagName === 'SUP' && /^\d+$/.test(num) && notes && notes[num]) {
        const sup = document.createElement('sup');
        const a = document.createElement('a');
        a.href = `#footnote-${notes[num].key}`;
        a.title = notes[num].text;
        a.textContent = num;
        sup.append(a);
        target.append(sup);
      } else if (n.tagName === 'A') {
        const a = document.createElement('a');
        if (n.getAttribute('href')) a.href = absUrl(n.getAttribute('href'));
        copyInline(n, a, document, notes);
        target.append(a);
      } else if (INLINE[n.tagName]) {
        const el = document.createElement(INLINE[n.tagName]);
        if (n.tagName !== 'BR') copyInline(n, el, document, notes);
        target.append(el);
      } else {
        copyInline(n, target, document, notes);
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

/** copy a rich-text container, splitting it into paragraphs at double <br> */
function paragraphs(src, document, notes) {
  if (!src || !src.textContent.trim()) return [];
  const flat = copyInline(src, document.createElement('div'), document, notes);
  const out = [];
  let current = document.createElement('p');
  const nodes = [...flat.childNodes];
  for (let i = 0; i < nodes.length; i += 1) {
    const node = nodes[i];
    if (node.nodeName === 'BR') {
      let j = i + 1;
      while (j < nodes.length && nodes[j].nodeType === 3 && !nodes[j].textContent.trim()) j += 1;
      if (j < nodes.length && nodes[j].nodeName === 'BR') {
        out.push(current);
        current = document.createElement('p');
        i = j;
        continue;
      }
    }
    current.append(node);
  }
  out.push(current);
  return out.map(trimEdges).filter((p) => p.textContent.trim());
}

function heading(tag, src, document) {
  if (!src) return null;
  const t = src.textContent.replace(/\s+/g, ' ').trim();
  if (!t) return null;
  const h = document.createElement(tag);
  h.textContent = t;
  return h;
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
      const wrap = document.createElement(/c-hp-button--(secondary|tertiary)/.test(src.className) ? 'em' : 'strong');
      wrap.append(a);
      const p = document.createElement('p');
      p.append(wrap);
      return p;
    })
    .filter(Boolean);
}

export default function parse(element, { document }) {
  const notes = footnoteMap(document);

  // main (large) image: media column of c-hp-media-content / contained section,
  // or the grid cell whose only content is an image
  let mainImgSrc = element.querySelector('.c-hp-media-content__media img, .c-hp-contained-section-block__media img');
  if (!mainImgSrc) {
    const imageCell = [...element.querySelectorAll('.c-hp-grid-cell')]
      .find((c) => c.querySelector('.image img') && !c.querySelector('.titleAndText'));
    mainImgSrc = imageCell && imageCell.querySelector('img');
  }

  // content column
  const contentScope = element.querySelector('.c-hp-media-content__content, .c-hp-contained-section-block__content')
    || [...element.querySelectorAll('.c-hp-grid-cell')].find((c) => c.querySelector('.titleAndText'))
    || element;

  const content = [];
  // inline logo image(s) in the content column (e.g. Copilot+ PC logo)
  contentScope.querySelectorAll('.image img').forEach((img) => {
    if (img !== mainImgSrc) content.push(makeImg(img, document));
  });
  const titleSrc = contentScope.querySelector('.c-hp-tat__title, .c-hp-contained-section-block__title, h2, h3');
  const h = heading('h2', titleSrc, document);
  if (h) content.push(h);
  contentScope.querySelectorAll('.c-hp-tat__subtitle, .c-hp-tat__description, .c-hp-contained-section-block__description')
    .forEach((d) => content.push(...paragraphs(d, document, notes)));
  content.push(...ctaParagraphs(contentScope, document));

  const mainImg = makeImg(mainImgSrc, document);
  if (!content.length && !mainImg) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const imageRow = mainImg ? [[mainImg]] : [];
  const contentRow = content.length ? [[content]] : [];
  const cells = ROW_ORDER === 'content-first' ? [...contentRow, ...imageRow] : [...imageRow, ...contentRow];
  const block = WebImporter.Blocks.createBlock(document, { name: BLOCK_NAME, cells });
  element.replaceWith(block);
}
