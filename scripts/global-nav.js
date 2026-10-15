const CODE_BASE = new URL('..', import.meta.url);
const DEFAULT_LINK_BASE = 'https://www.hp.com';
const PARTIALS = { header: 'nav', footer: 'footer' };

window.hlx = window.hlx || {};
window.hlx.rum = window.hlx.rum || { isSelected: false };

const codeUrl = (path) => new URL(path, CODE_BASE).href;

function loadStylesheet(root, href) {
  if (root.querySelector(`link[href="${href}"]`)) return Promise.resolve();
  return new Promise((resolve) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.onload = resolve;
    link.onerror = resolve;
    root.append(link);
  });
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

async function render(host, type) {
  host.dataset.globalNav = 'loading';
  const shadow = host.attachShadow({ mode: 'open' });
  const body = document.createElement('body');
  if (type === 'header' && host.dataset.newsroom !== 'true') body.dataset.noNewsroom = 'true';
  shadow.append(body);

  const contentUrl = new URL(`${PARTIALS[type]}.plain.html`, CODE_BASE);
  const [resp] = await Promise.all([
    fetch(contentUrl),
    loadStylesheet(shadow, codeUrl('styles/styles.css')),
    loadStylesheet(shadow, codeUrl(`blocks/${type}/${type}.css`)),
  ]);
  if (!resp.ok) throw new Error(`could not load ${contentUrl} (${resp.status})`);

  const block = document.createElement('div');
  block.className = `${type} block`;
  block.dataset.blockName = type;
  block.innerHTML = await resp.text();
  absolutize(block, contentUrl, host.dataset.linkBase || DEFAULT_LINK_BASE);

  const wrapper = document.createElement(type);
  wrapper.setAttribute('role', 'none');
  wrapper.append(block);
  body.append(wrapper);

  const { default: decorate } = await import(codeUrl(`blocks/${type}/${type}.js`));
  await decorate(block);
  block.dataset.blockStatus = 'loaded';
  body.classList.add('appear');
  host.dataset.globalNav = 'loaded';
}

function findHost(type) {
  const host = document.querySelector(`${type}[data-global-nav]`)
    || document.querySelector(`body > ${type}`);
  return host && !host.shadowRoot ? host : null;
}

async function mount(host, type) {
  try {
    await render(host, type);
    host.dispatchEvent(new CustomEvent('global-nav:loaded', { bubbles: true }));
  } catch (error) {
    host.dataset.globalNav = 'error';
    host.shadowRoot.replaceChildren(document.createElement('slot'));
    host.dispatchEvent(new CustomEvent('global-nav:error', { bubbles: true, detail: { error } }));
    // eslint-disable-next-line no-console
    console.error('global-nav:', error);
  }
}

function mountFound(pending) {
  [...pending].forEach((type) => {
    const host = findHost(type);
    if (!host) return;
    pending.delete(type);
    mount(host, type);
  });
}

function init() {
  loadStylesheet(document.head, codeUrl('styles/global-nav.css'));
  loadStylesheet(document.head, codeUrl('styles/fonts.css'));

  const pending = new Set(Object.keys(PARTIALS));
  const observer = new MutationObserver(() => {
    mountFound(pending);
    if (!pending.size) observer.disconnect();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  mountFound(pending);
  if (!pending.size) observer.disconnect();
}

init();
