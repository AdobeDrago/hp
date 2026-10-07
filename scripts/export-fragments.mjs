/**
 * Exports the header and footer as standalone, self-contained HTML files -
 * for dropping into another website (EDS or not) without any build step.
 *
 * It runs the SAME decorate() functions this project uses at runtime, so the
 * export can never drift out of sync with the live header/footer: fetches
 * the real fragment content from a running site, decorates it exactly as
 * the browser would, then inlines the resulting markup with this block's
 * CSS into one file per fragment.
 *
 * Usage:
 *   node scripts/export-fragments.mjs [baseUrl]
 *
 * baseUrl defaults to http://localhost:3000 (a local `aem up`). Point it at
 * a live site (e.g. https://main--hp--adobedrago.aem.page) to export
 * whatever that site currently authors as its header/footer.
 *
 * Output: exports/header.html, exports/footer.html
 */

import { JSDOM } from 'jsdom';
import { readFile, mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const rootDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const baseUrl = process.argv[2] || 'http://localhost:3000';

const FRAGMENTS = [
  {
    name: 'header',
    tag: 'header',
    blockPath: 'blocks/header/header.js',
    cssPath: 'blocks/header/header.css',
  },
  {
    name: 'footer',
    tag: 'footer',
    blockPath: 'blocks/footer/footer.js',
    cssPath: 'blocks/footer/footer.css',
  },
];

/**
 * Sets up a minimal DOM + fetch so the block's own decorate() function can
 * run in Node exactly as it does in a browser.
 */
function setupDomGlobals() {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', {
    url: baseUrl,
    pretendToBeVisual: true,
  });
  global.window = dom.window;
  global.document = dom.window.document;
  global.HTMLElement = dom.window.HTMLElement;

  // jsdom has no layout engine, so it can't evaluate real media queries;
  // this is only used for structural decoration here, not live breakpoint
  // behavior, so a static "no match" is enough.
  global.window.matchMedia = () => ({
    matches: false,
    addEventListener: () => {},
    removeEventListener: () => {},
  });

  // the real fetch() resolves page-relative paths against document.baseURI;
  // Node's fetch needs an absolute URL, so resolve against baseUrl here.
  const nodeFetch = global.fetch;
  global.fetch = (input, init) => nodeFetch(new URL(input, baseUrl), init);
}

async function exportFragment({
  name, tag, blockPath, cssPath,
}) {
  const block = document.createElement('div');
  block.className = name;
  document.body.append(block);

  const { default: decorate } = await import(path.join(rootDir, blockPath));
  await decorate(block);
  // styles.css hides a block until this is set, and hides <body> entirely
  // until it has .appear (both exist only to prevent flash-of-unstyled-
  // content during the full page lifecycle) - this export IS the "loaded,
  // ready to show" state, so mark it as such up front.
  block.dataset.blockStatus = 'loaded';

  const css = await readFile(path.join(rootDir, cssPath), 'utf8');
  const sharedCss = await readFile(path.join(rootDir, 'styles/styles.css'), 'utf8');

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${name} fragment</title>
<style>
/* styles/styles.css (site-wide tokens this fragment's CSS depends on) */
${sharedCss}

/* blocks/${name}/${name}.css */
${css}
</style>
</head>
<body class="appear">
<${tag} class="${name}-export">
  <div class="${block.className}" data-block-status="${block.dataset.blockStatus}">
${block.innerHTML}
  </div>
</${tag}>
<script type="module" src="./${name}.js"></script>
</body>
</html>
`;

  // the exported JS must have zero project-relative imports so it runs
  // standalone on another site; inline a tiny equivalent of the one helper
  // these blocks import from this project's core script.
  const standaloneGetMetadata = await readFile(path.join(rootDir, 'scripts/export-fragments.standalone-shim.js'), 'utf8');
  const blockSource = await readFile(path.join(rootDir, blockPath), 'utf8');
  const standaloneSource = blockSource.includes('getMetadata')
    ? standaloneGetMetadata + blockSource.replace(/^import .*getMetadata.*\n/m, '')
    : blockSource;

  const outDir = path.join(rootDir, 'exports');
  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, `${name}.html`), html);
  await writeFile(path.join(outDir, `${name}.js`), standaloneSource);
  // eslint-disable-next-line no-console
  console.log(`wrote exports/${name}.html (+ exports/${name}.js)`);
}

async function main() {
  setupDomGlobals();
  // sequential, not parallel: every fragment shares the one jsdom `document`
  await FRAGMENTS.reduce(
    (previous, fragment) => previous.then(() => exportFragment(fragment)),
    Promise.resolve(),
  );
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Export failed:', err);
  process.exitCode = 1;
});
