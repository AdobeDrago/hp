// client-side fallback for the newsroom "Related links" block, used where the
// related-links edge function has not already injected it into the page HTML
import { buildBlock, loadSections } from './aem.js';
import { decorateMain } from './scripts.js';

const BRIGHTEDGE_ACCOUNT = 'f00000000019918';
const CAPSULE_URL = `https://api.brightedge.com/api/ixf/1.0.0/get_capsule/${BRIGHTEDGE_ACCOUNT}`;
const CANONICAL_HOST = 'www.hp.com';

async function getCapsule(name) {
  try {
    const res = await fetch(`${CAPSULE_URL}/${name}`);
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

async function fetchLinks() {
  // eslint-disable-next-line import/no-relative-packages
  const be = await import('../aem-edge-functions/src/lib/brightedge.js');
  const canonical = be.canonicalizeUrl(window.location.pathname, CANONICAL_HOST);

  let capsule = await getCapsule(be.getPageHash(canonical));
  if (!capsule) return [];
  let { links } = be.resolveLinks(capsule, canonical);
  if (!links.length && be.needsDefaultCapsule(capsule)) {
    capsule = await getCapsule('default.json');
    if (capsule) ({ links } = be.resolveLinks(capsule, canonical));
  }
  return links;
}

export default async function loadRelatedLinks(main = document.querySelector('main')) {
  if (!main || main.querySelector('.related-links')) return;

  const links = await fetchLinks();
  if (!links.length || main.querySelector('.related-links')) return;

  const rows = links.map(({ url, text }) => {
    const a = document.createElement('a');
    a.href = url;
    a.textContent = text;
    return [a];
  });
  const section = document.createElement('div');
  section.append(buildBlock('related-links', rows));
  const fragment = document.createElement('div');
  fragment.append(section);
  decorateMain(fragment);
  main.append(...fragment.children);
  await loadSections(main);
}
