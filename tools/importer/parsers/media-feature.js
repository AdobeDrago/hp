/* eslint-disable */
/* global WebImporter */
/**
 * Parser for media-feature. Base block: media-feature (custom, no library convention).
 * Source: https://www.hp.com/us-en/ai-solutions/next-gen-ai-pcs.html
 * Instance selector: #body > div.root > div.aem-Grid > div.backgroundContainer:nth-of-type(10) c-hp-bg-container
 *
 * Target structure (blocks/media-feature/media-feature.js):
 *   | Media Feature                                                        |
 *   | image | h2, p, p <strong><a href="….mp4">Watch Video</a></strong>, p <em><a>Learn</a></em> |
 * A CTA whose href is a video file opens the block's lightbox, so the
 * "Watch Video" button (an href-less modal trigger on hp.com) is pointed at the
 * mp4 found in the page's video modal (div.modal / c-hp-modal#video-1, which
 * the cleanup transformer removes only afterTransform).
 */
const ORIGIN = 'https://www.hp.com';
const FALLBACK_VIDEO = '/content/dam/exclusive/ai-solutions/next-gen-ai-pcs-visid/HP_ON_ULTRAHD_H264_26-03-23_V5.mp4';
const VIDEO_RE = /[^\s"'(),]+\.(mp4|webm|m3u8)(\?[^\s"'(),]*)?/i;

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
  // hp.com leaves alt empty on this background photo and puts the description in title
  out.alt = ((img.getAttribute('alt') || '').trim() || (img.getAttribute('title') || '').trim());
  return out;
}

/** first video file URL referenced anywhere inside the given scopes */
function findVideoUrl(scopes) {
  for (const scope of scopes) {
    if (!scope) continue;
    const nodes = [scope, ...scope.querySelectorAll('*')];
    for (const node of nodes) {
      for (const attr of [...(node.attributes || [])]) {
        const m = attr.value && attr.value.match(VIDEO_RE);
        if (m) return m[0];
      }
    }
  }
  return null;
}

function heading(tag, src, document) {
  if (!src) return null;
  const t = src.textContent.replace(/\s+/g, ' ').trim();
  if (!t) return null;
  const h = document.createElement(tag);
  h.textContent = t;
  return h;
}

function textPara(src, document) {
  if (!src) return null;
  const t = src.textContent.replace(/\s+/g, ' ').trim();
  if (!t) return null;
  const p = document.createElement('p');
  p.textContent = t;
  return p;
}

export default function parse(element, { document }) {
  const img = element.querySelector('.c-hp-bg-container__media-wrapper img') || element.querySelector('picture img');
  const tat = element.querySelector('.titleAndText');

  const content = [];
  if (tat) {
    const h = heading('h2', tat.querySelector('.c-hp-tat__title'), document);
    if (h) content.push(h);
    tat.querySelectorAll('.c-hp-tat__subtitle, .c-hp-tat__description').forEach((d) => {
      const p = textPara(d, document);
      if (p) content.push(p);
    });
  }

  const ctaSrcs = [...element.querySelectorAll('.ctaButton a, a.c-hp-button')].filter((a, i, arr) => arr.indexOf(a) === i);
  ctaSrcs.forEach((src) => {
    const label = src.textContent.replace(/\s+/g, ' ').trim();
    if (!label) return;
    let href = src.getAttribute('href');
    if (!href || href === '#' || /^javascript:/i.test(href) || /watch|video|play/i.test(label)) {
      // modal trigger: resolve the video file from the referenced / page modal
      const target = (src.getAttribute('data-target') || src.getAttribute('data-modal-id') || src.getAttribute('aria-controls') || '').replace(/^#/, '');
      const modal = target ? document.getElementById(target) : null;
      const video = findVideoUrl([src, modal, document.querySelector('#video-1'), document.querySelector('div.modal')])
        || FALLBACK_VIDEO;
      href = video;
    }
    const a = document.createElement('a');
    a.href = absUrl(href);
    a.textContent = label;
    const wrap = document.createElement(/c-hp-button--(secondary|tertiary)/.test(src.className) ? 'em' : 'strong');
    wrap.append(a);
    const p = document.createElement('p');
    p.append(wrap);
    content.push(p);
  });

  const image = makeImg(img, document);
  if (!content.length && !image) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const cells = [[image || '', content.length ? content : '']];
  const block = WebImporter.Blocks.createBlock(document, { name: 'Media Feature', cells });
  element.replaceWith(block);
}
