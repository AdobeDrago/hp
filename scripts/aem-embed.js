/*
 * AEM Embed web component: shows this site's header, footer or a page on a
 * non-EDS site, isolated in a shadow root. Based on adobe/aem-embed, see
 * https://www.aem.live/docs/aem-embed
 *
 *   <script type="module" src="https://main--hp--adobedrago.aem.live/scripts/aem-embed.js"></script>
 *   <aem-embed type="header" url="https://main--hp--adobedrago.aem.live/nav"></aem-embed>
 *
 * Attributes: url (required), type (main | header | footer), link-base
 * (origin for site-relative links, defaults to the content's origin) and,
 * for the header, newsroom="true" to show the newsroom bar.
 * Fires aem-embed:loaded or aem-embed:error on the element.
 *
 * Changes from the upstream component: header and footer receive the raw
 * nav/footer content and decorate it themselves; operational telemetry stays
 * off; fonts are registered on the host document; link-base; events.
 */

// the code base this file is served from, e.g. https://main--hp--adobedrago.aem.live/
const CODE_BASE = new URL('..', import.meta.url);

window.hlx = window.hlx || {};
window.hlx.suppressLoadPage = true;
// aem.js samples only when window.hlx.rum is unset: no telemetry on pages this site doesn't run
window.hlx.rum = window.hlx.rum || { isSelected: false };

const codeUrl = (path) => new URL(path, CODE_BASE).href;

function loadStylesheet(root, href) {
  const existing = root.querySelector(`link[href="${href}"]`);
  if (existing) return Promise.resolve();
  return new Promise((resolve) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.onload = resolve;
    link.onerror = resolve;
    root.append(link);
  });
}

// browsers ignore @font-face inside shadow roots, and the header locks page
// scrolling on the host document's body
function addHostDocumentStyles() {
  loadStylesheet(document.head, codeUrl('styles/fonts.css'));
  if (document.head.querySelector('style[data-aem-embed]')) return;
  const style = document.createElement('style');
  style.dataset.aemEmbed = '';
  style.textContent = 'body.nav-scroll-lock { overflow-y: hidden; }';
  document.head.append(style);
}

// media and links in .plain.html are relative to the page they come from
function absolutize(container, contentUrl, linkBase) {
  container.querySelectorAll('img[src], source[srcset]').forEach((el) => {
    const attr = el.hasAttribute('src') ? 'src' : 'srcset';
    el.setAttribute(attr, new URL(el.getAttribute(attr), contentUrl).href);
  });
  container.querySelectorAll('a[href]').forEach((a) => {
    const href = a.getAttribute('href');
    if (/^(#|[a-z][a-z0-9+.-]*:)/i.test(href)) return;
    a.setAttribute('href', new URL(href, linkBase).href);
  });
}

async function loadBlock(root, block) {
  const { blockName } = block.dataset;
  await loadStylesheet(root, codeUrl(`blocks/${blockName}/${blockName}.css`));
  const mod = await import(codeUrl(`blocks/${blockName}/${blockName}.js`));
  if (mod.default) await mod.default(block);
  block.dataset.blockStatus = 'loaded';
}

export default class AEMEmbed extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.initialized = false;
  }

  async connectedCallback() {
    if (this.initialized) return;
    this.initialized = true;
    try {
      const url = this.getAttribute('url');
      if (!url) throw new Error('missing url attribute');
      const type = this.getAttribute('type') || 'main';
      const contentUrl = new URL(url.endsWith('/') ? `${url}index.plain.html` : `${url}.plain.html`, window.location.href);
      const linkBase = this.getAttribute('link-base') || contentUrl.origin;

      addHostDocumentStyles();
      const body = document.createElement('body');
      if (type === 'header' && this.getAttribute('newsroom') !== 'true') body.dataset.noNewsroom = 'true';
      this.shadowRoot.append(body);

      const [resp] = await Promise.all([
        fetch(contentUrl),
        loadStylesheet(this.shadowRoot, codeUrl('styles/styles.css')),
      ]);
      if (!resp.ok) throw new Error(`could not load ${contentUrl} (${resp.status})`);
      const container = document.createElement('div');
      container.innerHTML = await resp.text();
      absolutize(container, contentUrl, linkBase);

      if (type === 'header' || type === 'footer') {
        const wrapper = document.createElement(type);
        const block = document.createElement('div');
        block.className = `${type} block`;
        block.dataset.blockName = type;
        block.innerHTML = container.innerHTML;
        wrapper.append(block);
        body.append(wrapper);
        await loadBlock(this.shadowRoot, block);
      } else {
        const main = document.createElement('main');
        main.innerHTML = container.innerHTML;
        body.append(main);
        const { decorateMain } = await import(codeUrl('scripts/scripts.js'));
        decorateMain(main);
        const blocks = [...main.querySelectorAll('.block')];
        await blocks.reduce(
          (ready, block) => ready.then(() => loadBlock(this.shadowRoot, block)),
          Promise.resolve(),
        );
        main.querySelectorAll('.section').forEach((section) => {
          section.dataset.sectionStatus = 'loaded';
          section.style.display = null;
        });
      }

      body.classList.add('appear');
      this.dispatchEvent(new CustomEvent('aem-embed:loaded', { bubbles: true }));
    } catch (error) {
      this.dispatchEvent(new CustomEvent('aem-embed:error', { bubbles: true, detail: { error } }));
      // the host page can listen for aem-embed:error to show its own fallback
      // eslint-disable-next-line no-console
      console.error('aem-embed:', error);
    }
  }
}

if (!customElements.get('aem-embed')) customElements.define('aem-embed', AEMEmbed);
