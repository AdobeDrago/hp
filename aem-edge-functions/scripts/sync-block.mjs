/*
 * Copy the repo-root related-links block into ./assets so the edge function can
 * serve it locally via includeBytes(). Source of truth is blocks/related-links/.
 * Runs on postinstall and before build/serve.
 */
import { mkdirSync, copyFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const src = resolve(here, '../../blocks/related-links');
const dest = resolve(here, '../assets/related-links');

mkdirSync(dest, { recursive: true });
for (const f of ['related-links.js', 'related-links.css']) {
  const from = resolve(src, f);
  if (!existsSync(from)) {
    console.error(`sync-block: missing ${from}`);
    process.exit(1);
  }
  copyFileSync(from, resolve(dest, f));
}
console.log('sync-block: copied related-links block into assets/');
