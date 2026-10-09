import { getMetadata } from '../../scripts/aem.js';

const DEFAULT_FOOTER_FRAGMENT = '/footer';

/**
 * Fetches a footer fragment by path (same-site absolute path, or a full
 * cross-origin URL to reuse another site's footer content), resolving it
 * against the same content root as the current page (/content/ for pages
 * served from /content/ - localhost / aem up - the site root otherwise, so
 * neither environment requests a 404), and fixes up any page-relative media
 * references so they still resolve from here.
 * @param {string} path Path or URL to the fragment, without the .plain.html suffix
 * @returns {string|null} The fragment's inner HTML, or null if it couldn't be loaded
 */
async function fetchFooterHtml(path) {
  const isAbsolute = /^https?:\/\//i.test(path);
  const root = !isAbsolute && window.location.pathname.startsWith('/content/') ? '/content' : '';
  const resolvedPath = `${root}${path}`;
  const resp = await fetch(`${resolvedPath}.plain.html`);
  if (!resp.ok) return null;
  const container = document.createElement('div');
  container.innerHTML = await resp.text();

  const resetAttributeBase = (tag, attr) => {
    container.querySelectorAll(`${tag}[${attr}^="./media_"]`).forEach((elem) => {
      elem[attr] = new URL(elem.getAttribute(attr), new URL(resolvedPath, window.location)).href;
    });
  };
  resetAttributeBase('img', 'src');
  resetAttributeBase('source', 'srcset');

  return container.innerHTML;
}

/**
 * Tags the "Stay connected" list for social-icon styling and mirrors each
 * icon's alt text onto its link as an aria-label. Icon images come from the
 * fragment — footer.js never invents copy or link destinations.
 * @param {Element} list The "Stay connected" list element
 */
function decorateSocialList(list) {
  list.classList.add('footer-social');
  list.querySelectorAll('a').forEach((a) => {
    const img = a.querySelector('img');
    if (img && img.alt) a.setAttribute('aria-label', img.alt);
  });
}

/**
 * loads and decorates the footer
 * @param {Element} block The footer block element
 */
export default async function decorate(block) {
  const path = getMetadata('footer') || DEFAULT_FOOTER_FRAGMENT;
  const html = await fetchFooterHtml(path);
  block.textContent = '';
  if (!html) return;

  const fragment = document.createElement('div');
  fragment.innerHTML = html;

  const footer = document.createElement('div');
  footer.className = 'footer-inner';
  while (fragment.firstElementChild) footer.append(fragment.firstElementChild);

  // section classing: [0] country row, [1] link columns, [2] legal + copyright
  const sections = [...footer.children];
  if (sections[0]) sections[0].classList.add('footer-country');
  if (sections[1]) sections[1].classList.add('footer-columns');
  if (sections[2]) sections[2].classList.add('footer-legal');

  // the "Your privacy choices" legal link carries a small toggle icon (source
  // renders it as a CSS background); tag it so footer.css can draw the icon.
  const legal = footer.querySelector('.footer-legal');
  if (legal) {
    const privacy = [...legal.querySelectorAll('a')]
      .find((a) => /your privacy choices/i.test(a.textContent));
    if (privacy) privacy.classList.add('footer-privacy-icon');
  }

  // country/region selector: the second paragraph is the current locale (button),
  // the following list is the full country overlay (hidden until toggled).
  const country = footer.querySelector('.footer-country');
  if (country) {
    const trigger = country.querySelector('p:nth-of-type(2)');
    const list = country.querySelector('ul');
    if (trigger && list) {
      list.classList.add('footer-country-list');
      list.id = 'footer-country-list';
      country.dataset.expanded = 'false';
      trigger.classList.add('footer-country-trigger');
      const control = trigger.querySelector('a') || trigger;
      if (control === trigger) {
        trigger.setAttribute('role', 'button');
        trigger.tabIndex = 0;
      }
      control.setAttribute('aria-expanded', 'false');
      control.setAttribute('aria-controls', list.id);
      const toggle = () => {
        const open = country.dataset.expanded !== 'true';
        country.dataset.expanded = open;
        control.setAttribute('aria-expanded', open);
      };
      trigger.addEventListener('click', (e) => {
        // toggle the overlay rather than following the current-locale link
        if (e.target.closest('a')) e.preventDefault();
        toggle();
      });
      if (control === trigger) {
        trigger.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggle();
          }
        });
      }
    }
  }

  // wrap each column heading + its following list into a column group
  const columns = footer.querySelector('.footer-columns');
  if (columns) {
    const groups = [];
    let group = null;
    [...columns.children].forEach((node) => {
      if (node.tagName === 'H2') {
        group = document.createElement('div');
        group.className = 'footer-column';
        group.append(node);
        groups.push(group);
      } else if (group) {
        group.append(node);
      }
    });
    columns.textContent = '';
    groups.forEach((g) => columns.append(g));

    // the last column is "Stay connected" — turn its list into social icons
    const last = groups[groups.length - 1];
    const socialList = last?.querySelector('ul');
    if (socialList) decorateSocialList(socialList);
    if (last) last.classList.add('footer-column-social');

    // Mobile accordion: every link column (not the social one) collapses under
    // its heading. The heading becomes a toggle button; desktop CSS keeps it open.
    groups.forEach((col, i) => {
      if (col === last) return;
      const heading = col.querySelector('h2');
      const listEl = col.querySelector('ul');
      if (!heading || !listEl) return;
      col.classList.add('footer-column-accordion');
      col.dataset.expanded = 'false';
      listEl.id = listEl.id || `footer-column-list-${i}`;
      let control = heading.querySelector('a');
      if (!control) {
        control = document.createElement('button');
        control.type = 'button';
        control.className = 'footer-column-toggle';
        control.append(...heading.childNodes);
        heading.append(control);
      }
      control.setAttribute('aria-expanded', 'false');
      control.setAttribute('aria-controls', listEl.id);
      heading.addEventListener('click', (e) => {
        if (window.matchMedia('(min-width: 900px)').matches) return;
        // On mobile the heading toggles the accordion instead of navigating.
        e.preventDefault();
        const open = col.dataset.expanded !== 'true';
        col.dataset.expanded = open;
        control.setAttribute('aria-expanded', open);
      });
    });
  }

  block.append(footer);
}
