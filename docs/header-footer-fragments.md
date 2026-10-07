# Header & Footer as Reusable Fragments

The `header` and `footer` blocks now treat their content as a **fragment**: a
separate document, fetched at render time, decorated the same way on every
page. This is the same idea the project's `fragment` block already uses for
reusable content — header/footer just apply it to themselves instead of
requiring an author to drop a `fragment` block on every page.

This doc covers two audiences:
- **Developers / implementers** — how the reuse mechanism works, and how to
  run the HTML export.
- **Authors** — how to edit the header/footer content, and how to point a
  page (or a whole other site) at a different header/footer fragment.

---

## 1. How it works

### Before

`header.js` / `footer.js` fetched a **hardcoded** path (`/nav`, `/footer`)
with a dual-attempt fetch order that always 404'd once before falling back.
Nothing about the source was configurable — every page on this site got
exactly the same fragment, and no other site could point at it without
copying code.

### After

Both blocks now:

1. Read the fragment path from **page metadata** (`Header` / `Footer`),
   falling back to this site's defaults (`/nav`, `/footer`) when the
   metadata is absent.
2. Fetch `${path}.plain.html` — `path` can be a **site-relative path** or a
   **full URL on another domain**.
3. Rewrite any page-relative media references (`./media_...`) in the
   fetched content so images still resolve correctly regardless of where
   the fragment came from.
4. Decorate the result exactly as before (same nav/footer markup, same
   interactions) — nothing about the *visual output* changed for this
   site's existing pages, since the defaults are unchanged.

This is implemented independently in `header.js` and `footer.js` (not
factored through a shared import) **on purpose**: it keeps each block
free of project-specific dependencies beyond `getMetadata`, which matters
for the HTML export in section 3.

### Reuse within this website

Any page can override its header or footer by adding metadata rows in DA:

| Key | Value |
|---|---|
| `Header` | `/fragments/campaign-header` |
| `Footer` | `/fragments/campaign-footer` |

Leave them out and the page gets this site's normal `/nav` and `/footer`.

### Reuse across websites

Because the fetch accepts a full URL, another Edge Delivery Services site
can point its own `Header`/`Footer` metadata at **this site's** published
fragment, e.g.:

```
Header: https://main--hp--adobedrago.aem.page/nav
```

Two things have to be true for that to work:
1. The source site's content bus must serve `.plain.html` with permissive
   CORS (EDS content buses do this by default for published content).
2. The consuming site needs its own copy of `header.js` / `header.css`
   (and the same for footer) — **content** is fetched live across the
   network, but **code** (the decoration logic + styles) is not. This
   matches how every block in the wider AEM block collection is reused:
   you copy the block into your project once, then it can point at
   anyone's fragment content.

---

## 2. Authoring guide

### Editing the content

- The header's content lives in the `/nav` document in DA
  (`https://da.live/edit#/<org>/<repo>/nav`).
- The footer's content lives in the `/footer` document in DA.

Edit these like any other page. `header.js` expects four top-level
groups in `/nav`, in order: brand, sections (the mega-menu), tools, and
the newsroom sub-bar. `footer.js` expects three in `/footer`: the
country/region row, the link columns, and the legal/copyright block.
Reordering or removing a group is safe — the block only decorates what's
present — but moving content *between* groups isn't supported without a
code change.

### Pointing a page at a different header or footer

Open the page in DA, add a **Metadata** block (or edit the existing one),
and add a row named `Header` and/or `Footer` with the fragment's path:

```
Header: /fragments/holiday-header
```

If that row is empty or missing, the page falls back to this site's
default `/nav` / `/footer`.

### Reusing another site's header or footer

Same as above, but the value is a full URL instead of a path:

```
Header: https://main--some-other-site--org.aem.page/nav
```

The content comes from that site, live, on every page load. If that site
changes its header tomorrow, this page's header changes too — there's no
copy to keep in sync. If you don't want that coupling, copy the content
into your own fragment document instead and reference that.

---

## 3. Exporting as standalone HTML

For dropping the header or footer into a site that **isn't** Edge Delivery
Services at all — a static site, a different CMS, anywhere — use the
export script. It runs this project's real `decorate()` functions in Node
against a live (or local) site and writes out fully self-contained files.

```bash
node scripts/export-fragments.mjs [baseUrl]
```

`baseUrl` defaults to `http://localhost:3000` (a local `aem up`). Point it
at a live site to export whatever that site currently authors, e.g.:

```bash
node scripts/export-fragments.mjs https://main--hp--adobedrago.aem.page
```

This writes to `exports/`:

- `header.html` / `footer.html` — a complete standalone page: the decorated
  markup, this project's site-wide tokens (`styles/styles.css`) and the
  block's own CSS inlined into one `<style>` tag, plus a `<script>` tag
  pointing at the matching `.js` file.
- `header.js` / `footer.js` — the same decoration logic the live site
  uses, with its one project-relative import (`getMetadata`) inlined so it
  has **zero dependencies** on this codebase.

To use the export: copy the `.html` file's `<style>` block and the
`<header>`/`<footer>` markup into the target page, and include the `.js`
file as a `<script type="module">` if you want the interactive behavior
(dropdowns, mobile accordion, country selector) rather than just the
static appearance.

### What the export does and doesn't capture

- **Does**: exact current markup and CSS, byte-for-byte from this
  project's source — re-running the script after a content or code change
  picks up the new version automatically.
- **Doesn't**: re-evaluate responsive breakpoints at export time (the
  script runs in Node, with no real browser layout engine, so
  `window.matchMedia` is stubbed to always report "no match" during
  decoration). This only affects decoration-time branching — in practice,
  neither block currently branches its structure on `matchMedia` at decorate
  time, so this is a safety net rather than a workaround. The CSS itself
  still contains every breakpoint, so the exported page is fully
  responsive once it's opened in a real browser.
