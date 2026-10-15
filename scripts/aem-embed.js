const CODE_BASE = new URL('..', import.meta.url);

window.hlx = window.hlx || {};
window.hlx.suppressLoadPage = true;
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

function addHostDocumentStyles() {
  loadStylesheet(document.head, codeUrl('styles/fonts.css'));
  if (document.head.querySelector('style[data-aem-embed]')) return;
  const style = document.createElement('style');
  style.dataset.aemEmbed = '';
  style.textContent = 'body.nav-scroll-lock { overflow-y: hidden; }';
  document.head.append(style);
}

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
      // eslint-disable-next-line no-console
      console.error('aem-embed:', error);
    }
  }
}

if (!customElements.get('aem-embed')) customElements.define('aem-embed', AEMEmbed);
