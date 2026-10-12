import { createOptimizedPicture } from '../../scripts/aem.js';

const VIDEO_FILE = /\.(mp4|webm|ogg)$/i;
const YOUTUBE_HOSTS = ['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtube-nocookie.com', 'www.youtube-nocookie.com'];
const VIMEO_HOSTS = ['vimeo.com', 'www.vimeo.com', 'player.vimeo.com'];

function parseVideo(href) {
  let url;
  try {
    url = new URL(href);
  } catch (e) {
    return null;
  }
  if (!['http:', 'https:'].includes(url.protocol)) return null;

  const { hostname, pathname, searchParams } = url;
  const segments = pathname.split('/').filter(Boolean);

  if (hostname === 'youtu.be' && segments[0]) {
    return { embed: true, src: `https://www.youtube.com/embed/${encodeURIComponent(segments[0])}` };
  }
  if (YOUTUBE_HOSTS.includes(hostname)) {
    if (segments[0] === 'embed') return { embed: true, src: url.href };
    const id = searchParams.get('v');
    return id ? { embed: true, src: `https://www.youtube.com/embed/${encodeURIComponent(id)}` } : null;
  }
  if (VIMEO_HOSTS.includes(hostname)) {
    if (hostname === 'player.vimeo.com') return { embed: true, src: url.href };
    const id = segments.find((part) => /^\d+$/.test(part));
    return id ? { embed: true, src: `https://player.vimeo.com/video/${id}` } : null;
  }
  if (VIDEO_FILE.test(pathname)) return { embed: false, src: url.href };
  return null;
}

function openVideoModal({ embed, src }, trigger) {
  const overlay = document.createElement('div');
  overlay.className = 'media-feature-video-modal';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', 'Video player');

  const dialog = document.createElement('div');
  dialog.className = 'media-feature-video-modal-dialog';

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'media-feature-video-modal-close';
  closeBtn.setAttribute('aria-label', 'Close video');
  closeBtn.innerHTML = '&times;';

  const media = document.createElement(embed ? 'iframe' : 'video');
  media.className = 'media-feature-video-modal-media';
  media.src = src;
  if (embed) {
    media.title = 'Video player';
    media.allow = 'autoplay; fullscreen; picture-in-picture';
    media.allowFullscreen = true;
  } else {
    media.controls = true;
    media.autoplay = true;
  }

  dialog.append(closeBtn, media);
  overlay.append(dialog);

  function onKeydown(e) {
    if (e.key === 'Escape') close(); // eslint-disable-line no-use-before-define
    if (e.key !== 'Tab') return;
    const [first, last] = [closeBtn, media];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  function close() {
    overlay.remove();
    document.removeEventListener('keydown', onKeydown);
    trigger.focus();
  }

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });
  closeBtn.addEventListener('click', close);
  document.addEventListener('keydown', onKeydown);

  document.body.append(overlay);
  closeBtn.focus();
}

export default function decorate(block) {
  const row = block.firstElementChild;
  const [imageCell, contentCell] = row.children;

  row.className = 'media-feature-inner';

  imageCell.className = 'media-feature-image';
  contentCell.className = 'media-feature-content';

  const img = imageCell.querySelector('img');
  if (img) {
    imageCell.replaceChildren(createOptimizedPicture(img.src, img.alt, true, [
      { media: '(min-width: 900px)', width: '1200' },
      { width: '750' },
    ]));
  }

  contentCell.querySelectorAll('a').forEach((a) => {
    const video = parseVideo(a.href);
    if (video) {
      a.addEventListener('click', (e) => {
        e.preventDefault();
        openVideoModal(video, a);
      });
    }

    if (!a.classList.contains('button')) {
      const strong = a.closest('strong');
      const em = a.closest('em');
      if (strong || em) {
        a.className = 'button';
        a.classList.add(strong ? 'primary' : 'secondary');
        let wrapper = a.closest('p');
        if (!wrapper) {
          wrapper = document.createElement('p');
          (strong || em).replaceWith(a);
          wrapper.append(a);
          contentCell.append(wrapper);
        }
        wrapper.classList.add('button-container');
      }
    }
  });

  const buttons = contentCell.querySelectorAll('p.button-container');
  if (buttons.length) {
    const ctaWrapper = document.createElement('div');
    ctaWrapper.className = 'media-feature-cta';
    ctaWrapper.append(...buttons);
    contentCell.append(ctaWrapper);
  }
}
