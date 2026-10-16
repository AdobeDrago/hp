import { getMetadata } from '../../scripts/aem.js';
import { decorateGtmLinks } from '../../scripts/gtm.js';

const DEFAULT_FOOTER_FRAGMENT = '/footer';

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

function decorateSocialList(list) {
  list.classList.add('footer-social');
  list.querySelectorAll('a').forEach((a) => {
    const img = a.querySelector('img');
    if (img && img.alt) a.setAttribute('aria-label', img.alt);
  });
}

export default async function decorate(block) {
  const html = block.textContent.trim()
    ? block.innerHTML
    : await fetchFooterHtml(getMetadata('footer') || DEFAULT_FOOTER_FRAGMENT);
  block.textContent = '';
  if (!html) return;

  const fragment = document.createElement('div');
  fragment.innerHTML = html;

  const footer = document.createElement('div');
  footer.className = 'footer-inner';
  while (fragment.firstElementChild) footer.append(fragment.firstElementChild);

  const sections = [...footer.children];
  if (sections[0]) sections[0].classList.add('footer-country');
  if (sections[1]) sections[1].classList.add('footer-columns');
  if (sections[2]) sections[2].classList.add('footer-legal');

  const legal = footer.querySelector('.footer-legal');
  if (legal) {
    const privacy = [...legal.querySelectorAll('a')]
      .find((a) => /your privacy choices/i.test(a.textContent));
    if (privacy) privacy.classList.add('footer-privacy-icon');
  }

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

    const last = groups[groups.length - 1];
    const socialList = last?.querySelector('ul');
    if (socialList) decorateSocialList(socialList);
    if (last) last.classList.add('footer-column-social');

    groups.forEach((col, i) => {
      if (col === last) return;
      const heading = col.querySelector('h2');
      const listEl = col.querySelector('ul');
      if (!heading || !listEl) return;
      const headingLink = heading.querySelector('a');
      if (headingLink) {
        const overview = document.createElement('li');
        overview.className = 'footer-column-overview';
        overview.append(headingLink.cloneNode(true));
        listEl.prepend(overview);
      }
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
      const desktop = window.matchMedia('(min-width: 1024px)');
      if (control === headingLink) {
        const syncControl = () => {
          if (desktop.matches) {
            ['role', 'aria-expanded', 'aria-controls'].forEach((attr) => control.removeAttribute(attr));
          } else {
            control.setAttribute('role', 'button');
            control.setAttribute('aria-expanded', col.dataset.expanded);
            control.setAttribute('aria-controls', listEl.id);
          }
        };
        syncControl();
        desktop.addEventListener('change', syncControl);
      }
      heading.addEventListener('click', (e) => {
        if (desktop.matches) return;
        e.preventDefault();
        const open = col.dataset.expanded !== 'true';
        col.dataset.expanded = open;
        control.setAttribute('aria-expanded', open);
      });
    });
  }

  decorateGtmLinks(footer);
  block.append(footer);
}
