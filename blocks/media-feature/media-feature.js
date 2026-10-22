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

// same e_linkClick hp.com sends from its video player, e.g. "HP IQ: … - play"
function trackVideo(video, title) {
  const push = (action) => {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: 'e_linkClick',
      pushSource: 'standards',
      linkPlacement: `${title}/Video`,
      linkID: `${title} - ${action}`,
    });
  };
  video.addEventListener('play', () => push('play'));
  video.addEventListener('pause', () => {
    if (!video.ended) push('pause');
  });
}

function openVideoModal({ embed, src }, trigger, title) {
  const overlay = document.createElement('dialog');
  overlay.className = 'media-feature-video-modal';
  overlay.setAttribute('aria-label', 'Video player');

  const dialog = document.createElement('div');
  dialog.className = 'media-feature-video-modal-dialog';

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'media-feature-video-modal-close';
  closeBtn.setAttribute('aria-label', 'Close video');
  closeBtn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5l14 14M19 5L5 19"/></svg>';

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
    if (title) trackVideo(media, title);
  }

  dialog.append(closeBtn, media);
  overlay.append(dialog);

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.close();
  });
  closeBtn.addEventListener('click', () => overlay.close());
  overlay.addEventListener('close', () => {
    overlay.remove();
    document.body.classList.remove('media-feature-modal-open');
    trigger.focus();
  });

  document.body.append(overlay);
  document.body.classList.add('media-feature-modal-open');
  overlay.showModal();
  closeBtn.focus();
}

export default function decorate(block) {
  const row = block.firstElementChild;
  if (!row) return;
  const [imageCell, contentCell] = row.children;

  row.className = 'media-feature-inner';

  if (imageCell) {
    imageCell.className = 'media-feature-image';
    const img = imageCell.querySelector('img');
    if (img) {
      imageCell.replaceChildren(createOptimizedPicture(img.src, img.alt, false, [
        { media: '(min-width: 1024px)', width: '1200' },
        { width: '750' },
      ]));
    }
  }

  if (!contentCell) return;
  contentCell.className = 'media-feature-content';

  const videoTitle = contentCell.querySelector('h1, h2, h3, h4, h5, h6')?.textContent.trim();
  contentCell.querySelectorAll('a').forEach((a) => {
    const video = parseVideo(a.href);
    if (video) {
      a.addEventListener('click', (e) => {
        e.preventDefault();
        openVideoModal(video, a, videoTitle);
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
