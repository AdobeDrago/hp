/* eslint-disable */
/* global WebImporter */
/**
 * Parser for hero-split. Base block: hero (option "split").
 * Source: https://www.hp.com/us-en/ai-solutions/next-gen-ai-pcs.html
 * Instance selector: c-hp-hero-banner
 *
 * Target structure (blocks/hero/hero.js decorateSplit):
 *   | Hero (Split)                                              |
 *   | eyebrow p, h1, h2 subtitle, p of linked logos | photo     |
 * decorateSplit() takes the first picture that is NOT wrapped in a link as the
 * photo; linked pictures stay in the text column as the logo row.
 */
const ORIGIN = 'https://www.hp.com';

function absUrl(url) {
  if (!url) return url;
  const u = url.trim();
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

// The source badges are 1x rasters only (blurry on high-density screens and
// flagged by Lighthouse); swap them for vector redraws hosted in DA. The alt
// carries the badge's visible text, since the image is an image of text.
const VECTOR_BADGES = {
  'win-26-gettoknow-windows-11_32px.png': {
    src: 'https://content.da.live/adobedrago/hp/us-en/ai-solutions/assets/badge-windows-11.svg',
    alt: 'Get to know Windows 11 devices',
  },
  'win-26-gettoknow-copilot-pc-button-en-gb-1@2x2.png': {
    src: 'https://content.da.live/adobedrago/hp/us-en/ai-solutions/assets/badge-copilot-plus-pc.svg',
    alt: 'Get to know Copilot+ PC',
  },
};

function makeImg(img, document) {
  if (!img) return null;
  const out = document.createElement('img');
  const src = absUrl(imgSrc(img));
  const vector = VECTOR_BADGES[src.split('?')[0].split('/').pop()];
  out.src = vector ? vector.src : src;
  out.alt = vector ? vector.alt : (img.getAttribute('alt') || '').trim();
  if (vector) {
    // intrinsic size of the badge art, so the image reserves its space
    out.width = src.includes('copilot') ? 198 : 240;
    out.height = 32;
  }
  return out;
}

function textEl(tag, src, document) {
  if (!src) return null;
  const t = src.textContent.replace(/\s+/g, ' ').trim();
  if (!t) return null;
  const el = document.createElement(tag);
  el.textContent = t;
  return el;
}

export default function parse(element, { document }) {
  const eyebrow = element.querySelector('.c-hp-hero-banner__eyebrow p, .c-hp-hero-banner__eyebrow');
  const title = element.querySelector('.c-hp-hero-banner__title h1, h1');
  const subtitle = element.querySelector('.c-hp-hero-banner__subtitle h2, .c-hp-hero-banner__subtitle p, .c-hp-hero-banner__subtitle');

  const textCell = [];
  const eyebrowEl = textEl('p', eyebrow, document);
  if (eyebrowEl) textCell.push(eyebrowEl);
  const h1 = textEl('h1', title, document);
  if (h1) textCell.push(h1);
  const h2 = textEl('h2', subtitle, document);
  if (h2) textCell.push(h2);

  // badge logos (Windows 11, Copilot+ PC) - each wrapped in its link
  const badges = [...element.querySelectorAll('.c-hp-hero-banner__badges img')];
  if (badges.length) {
    const p = document.createElement('p');
    badges.forEach((img) => {
      const link = img.closest('a');
      const im = makeImg(img, document);
      if (link && link.getAttribute('href')) {
        const a = document.createElement('a');
        a.href = absUrl(link.getAttribute('href'));
        a.append(im);
        p.append(a);
      } else {
        p.append(im);
      }
    });
    textCell.push(p);
  }

  // CTA buttons, if any are authored on other hero instances
  element.querySelectorAll('.c-hp-hero-banner__content a.c-hp-button, .c-hp-hero-banner__content .ctaButton a').forEach((a, i) => {
    const label = a.textContent.replace(/\s+/g, ' ').trim();
    if (!label || !a.getAttribute('href')) return;
    const link = document.createElement('a');
    link.href = absUrl(a.getAttribute('href'));
    link.textContent = label;
    const wrap = document.createElement(i === 0 ? 'strong' : 'em');
    wrap.append(link);
    const p = document.createElement('p');
    p.append(wrap);
    textCell.push(p);
  });

  const photo = element.querySelector('.c-hp-hero-banner__media img, .c-hp-hero-banner__media--image img');
  const photoEl = makeImg(photo, document);

  if (!textCell.length && !photoEl) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const cells = [[textCell, photoEl || '']];
  const block = WebImporter.Blocks.createBlock(document, { name: 'Hero (Split)', cells });
  element.replaceWith(block);
}
