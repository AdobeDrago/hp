import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import {
  canonicalizeUrl, getPageHash, resolveLinks, derivePageGroup, decodeEntities,
} from '../src/lib/brightedge.js';
import { escapeHtml, buildRelatedLinksBlock, injectBeforeMain } from '../src/lib/html.js';

const here = dirname(fileURLToPath(import.meta.url));
const fixture = (name) => JSON.parse(readFileSync(resolve(here, 'fixtures', name), 'utf8'));

describe('canonicalizeUrl', () => {
  it('forces host and adds .html to extensionless EDS paths', () => {
    assert.equal(
      canonicalizeUrl('/us-en/newsroom', 'www.hp.com'),
      'https://www.hp.com/us-en/newsroom.html',
    );
  });
  it('strips a trailing slash before adding .html', () => {
    assert.equal(
      canonicalizeUrl('/us-en/newsroom/blogs/', 'www.hp.com'),
      'https://www.hp.com/us-en/newsroom/blogs.html',
    );
  });
  it('leaves an existing extension alone', () => {
    assert.equal(
      canonicalizeUrl('/us-en/newsroom.html', 'www.hp.com'),
      'https://www.hp.com/us-en/newsroom.html',
    );
  });
});

describe('getPageHash (BrightEdge port)', () => {
  const cases = {
    'https://www.hp.com/us-en/newsroom.html': '953301158',
    'https://www.hp.com/us-en/newsroom/press-releases.html': '1742629639',
    'https://www.hp.com/us-en/newsroom/press-kits.html': '514152342',
    'https://www.hp.com/us-en/newsroom/blogs.html': '1154808292',
    // negative hash -> "0" + abs
    'https://www.hp.com/us-en/newsroom/blogs/2026/hp-ai-nvidia-agent-safety-platform.html': '01134718190',
  };
  Object.entries(cases).forEach(([url, expected]) => {
    it(`hashes ${url.slice(28)}`, () => assert.equal(getPageHash(url), expected));
  });
});

describe('decodeEntities', () => {
  it('decodes the entities BrightEdge emits', () => {
    assert.equal(decodeEntities('Home &amp; Office 7K&#43; &#39;x&#39;'), "Home & Office 7K+ 'x'");
  });
});

describe('resolveLinks — 3 tiers against live fixtures', () => {
  it('tier 1: page-specific (newsroom landing)', () => {
    const url = canonicalizeUrl('/us-en/newsroom', 'www.hp.com');
    const { links, source } = resolveLinks(fixture('newsroom.json'), url);
    assert.equal(source, 'page-specific');
    assert.equal(links.length, 10);
    assert.equal(links[0].text, 'Shop Laptops & 2-in-1 Computers');
    assert.ok(links[0].url.startsWith('https://'));
  });

  it('tier 2: page-group match (AI article -> "AI and Omnibook")', () => {
    const url = canonicalizeUrl('/us-en/newsroom/blogs/2026/hp-ai-nvidia-agent-safety-platform', 'www.hp.com');
    const { links, source } = resolveLinks(fixture('ai-article.json'), url);
    assert.equal(source, 'page-group:AI and Omnibook');
    assert.equal(links.length, 10);
    assert.ok(links.some((l) => /AI/i.test(l.text)));
  });

  it('tier 2: catch-all group (racetrack article -> "Global Settings")', () => {
    // same account-wide capsule as the AI article; only the URL differs, which is
    // what selects the page group — so we reuse the one fixture.
    const url = canonicalizeUrl('/us-en/newsroom/blogs/2026/from-the-racetrack-to-the-pitch-and-the-boardroom-how-technology-leaders-help-high-performing-organizations-to-do-their-best-work', 'www.hp.com');
    const { links, source } = resolveLinks(fixture('ai-article.json'), url);
    assert.equal(source, 'page-group:Global Settings');
    assert.equal(links.length, 10);
  });

  it('returns no links for a non-matching / empty capsule', () => {
    const { links } = resolveLinks({ nodes: [], config: { page_groups: [] } }, 'https://www.hp.com/x.html');
    assert.equal(links.length, 0);
  });
});

describe('derivePageGroup', () => {
  it('respects priority order and exclude rules', () => {
    const groups = [
      { name: 'low', priority: 10, include_rules: ['/foo'] },
      { name: 'high', priority: 1, include_rules: ['/foo'], exclude_rules: ['/foo/bar'] },
    ];
    assert.equal(derivePageGroup(groups, 'https://x/foo'), 'high');
    assert.equal(derivePageGroup(groups, 'https://x/foo/bar'), 'low');
  });
  it('ignores malformed regexes without throwing', () => {
    const groups = [{ name: 'bad', priority: 1, include_rules: ['('] }, { name: 'ok', priority: 2, include_rules: ['/foo'] }];
    assert.equal(derivePageGroup(groups, 'https://x/foo'), 'ok');
  });
});

describe('html helpers', () => {
  it('escapes HTML in text and attributes', () => {
    assert.equal(escapeHtml('a & <b> "c"'), 'a &amp; &lt;b&gt; &quot;c&quot;');
  });
  it('builds block markup and escapes link content', () => {
    const html = buildRelatedLinksBlock([{ url: 'https://x/?a=1&b=2', text: 'A & B' }]);
    assert.ok(html.includes('class="related-links"'));
    assert.ok(html.includes('href="https://x/?a=1&amp;b=2"'));
    assert.ok(html.includes('>A &amp; B<'));
  });
  it('returns empty markup for no links', () => {
    assert.equal(buildRelatedLinksBlock([]), '');
  });
  it('injects before </main> and no-ops when absent', () => {
    assert.equal(injectBeforeMain('<main>x</main>', 'Y'), '<main>xY</main>');
    assert.equal(injectBeforeMain('<div>x</div>', 'Y'), '<div>x</div>');
  });
});
