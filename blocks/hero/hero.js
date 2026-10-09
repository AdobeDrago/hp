/**
 * Hero block: full-bleed background image with an overlaid content band.
 * Generic — the authored picture becomes the background layer and every
 * remaining line is rendered in the band (divided by a rule in CSS) and
 * styled by its own tag. No per-row role classes.
 *
 * "split" option: text column + photo side by side (stacked on mobile). The
 * first picture that is not wrapped in a link is the photo; linked pictures
 * (e.g. partner logos) stay in the text column as a logo row.
 */
function decorateSplit(block) {
  const cells = [...block.querySelectorAll(':scope > div > div')];
  const pictures = [...block.querySelectorAll('picture')];
  const photo = pictures.find((pic) => !pic.closest('a')) || pictures[0];

  const media = document.createElement('div');
  media.className = 'hero-media';
  if (photo) {
    // the photo is the LCP image, but the logo badges precede it in the DOM,
    // so the default first-image handling would leave it lazy-loaded
    const img = photo.querySelector('img');
    if (img) {
      img.loading = 'eager';
      img.fetchPriority = 'high';
    }
    const holder = photo.parentElement;
    media.append(photo);
    // drop the paragraph/cell that only wrapped the photo
    if (holder && !cells.includes(holder) && holder.textContent.trim() === ''
      && !holder.querySelector('picture')) holder.remove();
  }

  const content = document.createElement('div');
  content.className = 'hero-content';
  cells.forEach((cell) => {
    [...cell.children]
      .filter((el) => el.textContent.trim() !== '' || el.querySelector('picture'))
      .forEach((el) => {
        // a line made only of (linked) images is the logo row; consecutive
        // logo lines (one paragraph per logo in published content) merge
        // into a single row so the logos sit side by side
        if (el.querySelector('picture') && el.textContent.trim() === '') {
          const prev = content.lastElementChild;
          if (prev && prev.classList.contains('hero-logos')) {
            prev.append(...el.childNodes);
            return;
          }
          el.classList.add('hero-logos');
        }
        content.append(el);
      });
  });

  block.replaceChildren(content, media);
}

export default function decorate(block) {
  if (block.classList.contains('split')) {
    decorateSplit(block);
    return;
  }

  const cell = block.querySelector(':scope > div > div');
  if (!cell) return;

  const bg = document.createElement('div');
  bg.className = 'hero-bg';
  const picture = cell.querySelector('picture');
  if (picture) bg.append(picture);

  const content = document.createElement('div');
  content.className = 'hero-content';
  [...cell.children]
    .filter((el) => !el.querySelector('picture') && el.textContent.trim() !== '')
    .forEach((el) => content.append(el));

  block.replaceChildren(bg, content);
}
