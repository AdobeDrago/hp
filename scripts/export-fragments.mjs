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

function setupDomGlobals() {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', {
    url: baseUrl,
    pretendToBeVisual: true,
  });
  global.window = dom.window;
  global.document = dom.window.document;
  global.HTMLElement = dom.window.HTMLElement;

  global.window.matchMedia = () => ({
    matches: false,
    addEventListener: () => {},
    removeEventListener: () => {},
  });

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
${sharedCss}

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
