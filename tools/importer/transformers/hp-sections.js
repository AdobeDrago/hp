/* eslint-disable */
/* global WebImporter */


const SECTION_ANCHORS = {
  'ai-solutions': {
    3: 'benefits',
    4: 'portfolio',
    5: 'products',
    6: 'roi-calculator',
    12: 'faqs',
  },
};

const SECTION_MARKER_ATTR = 'data-excat-section-id';

function querySection(root, selectors) {
  const list = Array.isArray(selectors) ? selectors : [selectors];
  for (const sel of list) {
    if (!sel) continue;
    let el = null;
    try {
      el = root.querySelector(sel);
    } catch (e) {
      el = null;
    }
    if (el) return el;
  }
  return null;
}

function getMetadataCells(section, templateName) {
  const cells = {};
  if (section.style) cells.style = section.style;
  const anchors = SECTION_ANCHORS[templateName] || {};
  const anchorId = anchors[section.id];
  if (anchorId) cells.id = anchorId;
  return cells;
}

function breakAnchor(sectionEl) {
  let anchor = sectionEl;
  let prev = anchor.previousElementSibling;
  while (prev && prev.matches('div.spacing')) {
    anchor = prev;
    prev = anchor.previousElementSibling;
  }
  return anchor;
}

export default function transform(hookName, element, payload) {
  const template = (payload && payload.template) || {};
  const sections = template.sections || [];
  const templateName = template.name;
  if (sections.length < 2) return;

  if (hookName === 'beforeTransform') {
    for (let i = sections.length - 1; i >= 0; i -= 1) {
      const section = sections[i];
      const hasMetadata = Object.keys(getMetadataCells(section, templateName)).length > 0;
      if (i === 0 && !hasMetadata) continue;
      const sectionEl = querySection(element, section.selector);
      if (!sectionEl) continue;

      const hr = document.createElement('hr');
      if (hasMetadata) hr.setAttribute(SECTION_MARKER_ATTR, section.id);
      breakAnchor(sectionEl).before(hr);
    }
  }

  if (hookName === 'afterTransform') {
    for (let i = sections.length - 1; i >= 0; i -= 1) {
      const section = sections[i];
      const cells = getMetadataCells(section, templateName);
      if (!Object.keys(cells).length) continue;

      const marker = element.querySelector(`[${SECTION_MARKER_ATTR}="${section.id}"]`);
      const anchor = marker || querySection(element, section.selector);
      if (!anchor) continue;

      const metadataBlock = WebImporter.Blocks.createBlock(document, {
        name: 'Section Metadata',
        cells,
      });
      anchor.after(metadataBlock);

      if (marker) {
        marker.removeAttribute(SECTION_MARKER_ATTR);
        if (i === 0) marker.remove();
      }
    }
  }
}
