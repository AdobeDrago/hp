// client-side fallback for the newsroom "Related links" block, used where the
// related-links edge function has not already injected it into the page HTML
import { buildBlock, decorateBlock, loadBlock } from './aem.js';

const BE_CAPSULE = 'https://api.brightedge.com/api/ixf/1.0.0/get_capsule/f00000000019918';

export default async function loadRelatedLinksFallback() {
  const main = document.querySelector('main');
  if (!main || main.querySelector('.related-links')) return;
  if (!window.location.pathname.startsWith('/us-en/newsroom')) return;

  // eslint-disable-next-line import/no-relative-packages
  const be = await import('../aem-edge-functions/src/lib/brightedge.js');
  const canonical = be.canonicalizeUrl(window.location.pathname, 'www.hp.com');
  const getCapsule = async (name) => {
    try {
      const res = await fetch(`${BE_CAPSULE}/${name}`);
      return res.ok ? await res.json() : null;
    } catch {
      return null;
    }
  };

  let capsule = await getCapsule(be.getPageHash(canonical));
  if (!capsule) return;
  let { links } = be.resolveLinks(capsule, canonical);
  if (!links.length && be.needsDefaultCapsule(capsule)) {
    capsule = await getCapsule('default.json');
    if (capsule) ({ links } = be.resolveLinks(capsule, canonical));
  }
  if (!links.length || main.querySelector('.related-links')) return;

  const rows = links.map(({ url, text }) => {
    const a = document.createElement('a');
    a.href = url;
    a.textContent = text;
    return [a];
  });
  const section = document.createElement('div');
  section.className = 'section';
  const wrapper = document.createElement('div');
  const block = buildBlock('related-links', rows);
  wrapper.append(block);
  section.append(wrapper);
  main.append(section);
  decorateBlock(block);
  await loadBlock(block);
  section.dataset.sectionStatus = 'loaded';
}
