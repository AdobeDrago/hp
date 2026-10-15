/*
 * HP global nav consumer package.
 *
 * A consuming site adds:
 *   <header data-global-nav></header>
 *   <script type="module" src="https://<hp-origin>/scripts/global-nav.js"></script>
 *
 * The script fetches HP's published /nav (nav.plain.html), runs the same decorate logic as
 * the header block, and renders it inside a shadow root so neither side's CSS can leak.
 * Optional attributes on the <header>: data-nav-path (default <hp-origin>/nav).
 */
import { decorateNav } from '../blocks/header/header.js';

const HP_ORIGIN = new URL(import.meta.url).origin;
const STYLES_URL = new URL('../styles/global-nav.css', import.meta.url).href;

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
  link.href = STYLES_URL;
  const header = document.createElement('header');
  root.append(link, header);

  // hold the nav back until its styles are in, to avoid an unstyled flash
  await new Promise((resolve) => {
    link.addEventListener('load', resolve);
    link.addEventListener('error', resolve);
  });

  const path = host.dataset.navPath || `${HP_ORIGIN}/nav`;
  await decorateNav(header, { path });
  ensureScrollLockStyle();
}

async function init() {
  const hosts = document.querySelectorAll('header[data-global-nav]');
  await Promise.all([...hosts].map(mount));
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
