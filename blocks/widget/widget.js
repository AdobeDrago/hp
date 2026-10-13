import { loadCSS } from '../../scripts/aem.js';

const SAFE_SEGMENT = /^[a-z0-9-]+$/;

function parseWidgetHref(pathname) {
  const pathSegments = pathname.split('/').filter((p) => p);
  const widgetName = (pathSegments[pathSegments.length - 1] || '').split('.')[0];
  const widgetPath = pathSegments.slice(1, -1).join('/');
  return { widgetPath, widgetName };
}

function isSafeWidget(widgetPath, widgetName) {
  return SAFE_SEGMENT.test(widgetName)
    && widgetPath.split('/').filter((p) => p).every((p) => SAFE_SEGMENT.test(p));
}

function widgetUrl(widgetPath, widgetName, extension) {
  const prefix = widgetPath ? `${widgetPath}/` : '';
  return `${window.hlx.codeBasePath}/widgets/${prefix}${widgetName}.${extension}`;
}

function applyWidgetShell(widget, source, widgetName, searchParams) {
  widget.classList.add(widgetName);
  widget.classList.remove('block');
  widget.dataset.source = source.href;
  searchParams.forEach((value, key) => {
    widget.dataset[key.replace(/-([a-z])/g, (_, char) => char.toUpperCase())] = value;
  });

  const wrapper = widget.closest('.widget-wrapper');
  if (wrapper) {
    wrapper.classList.add(`${widgetName}-wrapper`);
    wrapper.classList.remove('widget-wrapper');
  }
  const container = widget.closest('.widget-container');
  if (container) {
    container.classList.add(`${widgetName}-container`);
    container.classList.remove('widget-container');
  }
}

export default async function decorate(widget) {
  const source = widget.querySelector('a[href]');
  if (!source) return;
  const { pathname, searchParams } = new URL(source.href);
  const { widgetPath, widgetName } = parseWidgetHref(pathname);
  if (!isSafeWidget(widgetPath, widgetName)) return;

  try {
    applyWidgetShell(widget, source, widgetName, searchParams);

    const resp = await fetch(widgetUrl(widgetPath, widgetName, 'html'));
    if (!resp.ok) throw new Error(`widget markup returned ${resp.status}`);
    widget.innerHTML = await resp.text();

    const cssLoaded = loadCSS(widgetUrl(widgetPath, widgetName, 'css'));
    const decorationComplete = (async () => {
      const mod = await import(widgetUrl(widgetPath, widgetName, 'js'));
      if (mod.default) await mod.default(widget);
    })();
    await Promise.all([cssLoaded, decorationComplete]);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`failed to load widget ${widgetPath}/${widgetName}`, error);
  }
}
