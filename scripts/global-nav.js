/*
 * HP global nav consumer package.
 *
 * A consuming site adds:
 *   <header data-global-nav></header>
 *   <script type="module" src="https://<hp-origin>/scripts/global-nav.js"></script>
 *
 * The script fetches HP's published /nav (nav.plain.html), runs the same decorate logic as
 * the header block, and renders it inside a shadow root so neither side's CSS can leak.
 *
 * Full URLs can be passed as attributes on the <header>; each defaults to a path relative to
 * this script (so the origin it was loaded from):
 *   data-nav-path    nav document, no extension   (../nav)
 *   data-header-js   header block module          (../blocks/header/header.js)
 *   data-styles      nav stylesheet               (../styles/global-nav.css)
 */
// defaults are relative to this script, so they follow whichever origin it was loaded from
const DEFAULT_NAV = new URL('https://feature-header-layout-fix--hp--adobedrago.aem.page/nav', import.meta.url).href;
const DEFAULT_STYLES = new URL('https://feature-header-layout-fix--hp--adobedrago.aem.page/styles/global-nav.css', import.meta.url).href;
const DEFAULT_HEADER_JS = new URL('https://feature-header-layout-fix--hp--adobedrago.aem.page/blocks/header/header.js', import.meta.url).href;

// the mobile menu locks page scroll through a class on the host page's <body>
function ensureScrollLockStyle() {
  if (document.getElementById('global-nav-scroll-lock')) return;
  const style = document.createElement('style');
  style.id = 'global-nav-scroll-lock';
  style.textContent = 'body.nav-scroll-lock { overflow: hidden; }';
  document.head.append(style);
}

async function mount(host) {
  const root = host.shadowRoot || host.attachShadow({ mode: 'open' });
  root.textContent = '';

  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = host.dataset.styles || DEFAULT_STYLES;
  const header = document.createElement('header');
  root.append(link, header);

  // hold the nav back until its styles are in, to avoid an unstyled flash
  await new Promise((resolve) => {
    link.addEventListener('load', resolve);
    link.addEventListener('error', resolve);
  });

  const path = host.dataset.navPath || DEFAULT_NAV;
  const { decorateNav } = await import(host.dataset.headerJs || DEFAULT_HEADER_JS);
  await decorateNav(header, { path });
  ensureScrollLockStyle();
}

async function init() {
  const hosts = document.querySelectorAll('header[data-global-nav]');
  await Promise.all([...hosts].map(mount));
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
