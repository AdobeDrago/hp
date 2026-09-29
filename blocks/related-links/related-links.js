/*
 * Related Links Block
 *
 * Renders the newsroom "Related links" drawer. The markup is injected server-side by
 * the AEM Edge Function (aem-edge-functions/) from BrightEdge data; this block turns
 * the injected rows into a collapsible, pipe-separated link list and adds the GTM
 * tracking attributes so click analytics match the existing hp.com setup.
 *
 * Default state is collapsed; the links stay in the DOM (SEO-visible) either way.
 */

/**
 * Derive the data-gtm-value slug from link text, matching hp.com's convention
 * (lowercased; "&" dropped; punctuation except hyphen removed; spaces -> "_").
 * @param {string} text
 * @returns {string}
 */
function gtmValue(text) {
  return text
    .toLowerCase()
    .replace(/&/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '_');
}

export default function decorate(block) {
  const links = [...block.querySelectorAll('a')];
  block.textContent = '';

  const details = document.createElement('details');
  details.className = 'related-links-drawer'; // collapsed by default

  const summary = document.createElement('summary');
  summary.className = 'related-links-trigger';
  const title = document.createElement('span');
  title.className = 'related-links-title';
  title.textContent = 'Related links';
  const chevron = document.createElement('span');
  chevron.className = 'related-links-chevron';
  chevron.setAttribute('aria-hidden', 'true');
  summary.append(title, chevron);

  const list = document.createElement('div');
  list.className = 'related-links-list';

  links.forEach((a) => {
    // strip any button/link decoration EDS may have applied — these are plain links
    a.className = 'be-related-link';
    a.target = '_blank';
    a.rel = 'noopener';
    a.setAttribute('data-gtm-id', 'related_links');
    a.setAttribute('data-gtm-category', 'linkClick');
    a.setAttribute('data-gtm-value', gtmValue(a.textContent));
    list.append(a);
  });

  details.append(summary, list);
  block.append(details);
}
