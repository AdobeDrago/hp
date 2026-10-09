/* eslint-disable */
/* global WebImporter */
/**
 * Parser for anchor-nav. Base block: anchor-nav (custom, no library convention).
 * Source: https://www.hp.com/us-en/ai-solutions/next-gen-ai-pcs.html
 * Instance selector: c-hp-anchor-nav
 *
 * Target structure (blocks/anchor-nav/anchor-nav.js):
 *   | Anchor Nav                                         |
 *   | <p><a href="#benefits">…</a></p> … | <p><strong><a>Contact Sales</a></strong></p> |
 * Row 1 cell 1: every in-page link; cell 2: CTA (strong = primary, em = secondary).
 * Iterates li.c-hp-anchor-nav__item (block-level wrapper), not the anchors.
 */
const ORIGIN = 'https://www.hp.com';

function absUrl(url) {
  if (!url) return url;
  const u = url.trim();
  if (u.startsWith('#')) return u;
  if (u.startsWith('//')) return `https:${u}`;
  if (u.startsWith('/')) return `${ORIGIN}${u}`;
  return u;
}

function clean(t) {
  return (t || '').replace(/\s+/g, ' ').trim();
}

export default function parse(element, { document }) {
  let items = [...element.querySelectorAll('li.c-hp-anchor-nav__item')];
  if (!items.length) items = [...element.querySelectorAll('.c-hp-anchor-nav__items li')];

  const linksCell = [];
  items.forEach((li) => {
    const src = li.querySelector('a[href]');
    const label = clean(li.textContent);
    if (!src || !label) return;
    const a = document.createElement('a');
    a.href = absUrl(src.getAttribute('href'));
    a.textContent = label;
    const p = document.createElement('p');
    p.append(a);
    linksCell.push(p);
  });

  const ctaCell = [];
  const ctas = [...element.querySelectorAll('.c-hp-anchor-nav__aside .ctaButton a[href], .c-hp-anchor-nav__buttons a.c-hp-button[href]')]
    .filter((a, i, arr) => arr.indexOf(a) === i);
  ctas.forEach((src, i) => {
    const label = clean(src.textContent);
    if (!label) return;
    const a = document.createElement('a');
    a.href = absUrl(src.getAttribute('href'));
    a.textContent = label;
    const isSecondary = i > 0 || /secondary|tertiary/.test(src.className);
    const wrap = document.createElement(isSecondary ? 'em' : 'strong');
    wrap.append(a);
    const p = document.createElement('p');
    p.append(wrap);
    ctaCell.push(p);
  });

  if (!linksCell.length && !ctaCell.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const cells = [[linksCell, ctaCell.length ? ctaCell : '']];
  const block = WebImporter.Blocks.createBlock(document, { name: 'Anchor Nav', cells });
  element.replaceWith(block);
}
