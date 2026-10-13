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

// static imports, including ones that span several lines
const IMPORT_RE = /^import\s+(?:[^'";]*?\s+from\s+)?['"]([^'"]+)['"];?[ \t]*\n?/gm;
const PROJECT_SCRIPT_RE = /(^|\/)scripts\/(aem|gtm)\.js$/;

// Writes a block module (and the sibling modules it imports) to the export
// folder: imports of scripts/aem.js and scripts/gtm.js are replaced by the
// standalone shim, relative imports are copied next to it.
async function writeStandaloneModule(sourcePath, outName, outDir, written = []) {
  const source = await readFile(path.join(rootDir, sourcePath), 'utf8');
  const dependencies = [];
  let usesProjectScripts = false;

  const stripped = source.replace(IMPORT_RE, (statement, specifier) => {
    if (PROJECT_SCRIPT_RE.test(specifier)) {
      usesProjectScripts = true;
      return '';
    }
    if (!specifier.startsWith('./')) {
      throw new Error(`${sourcePath}: cannot export import of "${specifier}"`);
    }
    dependencies.push(specifier);
    return statement;
  });

  const shim = usesProjectScripts
    ? await readFile(path.join(rootDir, 'scripts/export-fragments.standalone-shim.js'), 'utf8')
    : '';
  await writeFile(path.join(outDir, outName), shim + stripped);
  written.push(outName);

  await dependencies.reduce((previous, specifier) => previous.then(() => {
    const depSource = path.join(path.dirname(sourcePath), specifier);
    const depOut = path.join(path.dirname(outName), specifier);
    if (written.includes(depOut)) return undefined;
    return writeStandaloneModule(depSource, depOut, outDir, written);
  }), Promise.resolve());

  return written;
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

  const outDir = path.join(rootDir, 'exports');
  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, `${name}.html`), html);
  const written = await writeStandaloneModule(blockPath, `${name}.js`, outDir);
  // eslint-disable-next-line no-console
  console.log(`wrote exports/${name}.html (+ ${written.map((file) => `exports/${file}`).join(', ')})`);
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
