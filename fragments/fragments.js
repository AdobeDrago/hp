/*
 * Renders the HP header and footer on non-EDS sites.
 * Include fragments/header.html or fragments/footer.html; each holds an empty
 * <header data-hp-fragment="header"> / <footer data-hp-fragment="footer">
 * that this script fills with the live nav and footer content from this site.
 */

// the EDS site this file is served from, e.g. https://main--hp--adobedrago.aem.live
const ORIGIN = new URL('..', import.meta.url).origin;
const LINK_ORIGIN = 'https://www.hp.com';

window.hpFragments = { origin: ORIGIN, linkOrigin: LINK_ORIGIN };

// site-relative links and media point at the downstream site otherwise
function absolutize(root) {
  root.querySelectorAll('a[href^="/"]:not([href^="//"])').forEach((a) => {
    a.href = `${LINK_ORIGIN}${a.getAttribute('href')}`;
  });
  root.querySelectorAll('img[src^="/"]:not([src^="//"]), source[srcset^="/"]:not([srcset^="//"])').forEach((el) => {
    const attr = el.tagName === 'IMG' ? 'src' : 'srcset';
    el.setAttribute(attr, `${ORIGIN}${el.getAttribute(attr)}`);
  });
}

async function loadFragment(host) {
  const name = host.dataset.hpFragment;
  if (!['header', 'footer'].includes(name) || host.dataset.hpFragmentStatus) return;
  host.dataset.hpFragmentStatus = 'loading';

  const block = document.createElement('div');
  block.className = `${name} block`;
  block.dataset.blockName = name;
  host.replaceChildren(block);

  try {
    const { default: decorate } = await import(`${ORIGIN}/blocks/${name}/${name}.js`);
    await decorate(block);
    absolutize(host);
    block.dataset.blockStatus = 'loaded';
    host.dataset.hpFragmentStatus = 'loaded';
  } catch (error) {
    host.dataset.hpFragmentStatus = 'error';
    // eslint-disable-next-line no-console
    console.error(`hp-fragments: could not load the ${name}`, error);
  }
}

function init() {
  document.querySelectorAll('[data-hp-fragment]').forEach(loadFragment);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
