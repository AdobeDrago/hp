# HP global nav: consumer package

HP's global nav is authored once and consumed by other HP sites and partners. The `/nav` document
in DA is the source of truth; publishing it updates every consumer.

| Phase | Behaviour |
| --- | --- |
| 1 | The newsroom demos its own EDS-authored nav (`blocks/header`). |
| 2 (go-live) | The newsroom header block fetches HP's published nav instead of maintaining a second copy. |

## Files

| File | Purpose |
| --- | --- |
| `blocks/header/header.js` | Decorate logic. Exports `decorateNav(block, { path })`; the default export is the header block and calls it with the page's `header` metadata (or `/nav`). |
| `scripts/global-nav.js` | Consumer entry point. Finds `header[data-global-nav]`, attaches a shadow root, loads styles, runs `decorateNav` against the HP origin. |
| `styles/global-nav.css` | Shadow-root styles: imports `blocks/header/header.css`, sets `:host` sizing variables, and resets properties a host site may set on `<header>`. |
| `docs/global-nav-test/index.html` | Test page used as a different-origin consumer. |

## 1. Script consumer (recommended)

```html
<header data-global-nav></header>
<script type="module" src="https://<hp-origin>/scripts/global-nav.js"></script>
```

How it works:

1. The script derives the HP origin from its own URL (`import.meta.url`).
2. It fetches `<hp-origin>/nav.plain.html` and runs the same decorate logic as the header block, so
   menus, search, account flyout and mobile behaviour are identical to the HP site.
3. The nav renders inside a **shadow root**. Host-site CSS cannot restyle it and nav CSS cannot leak out.
4. Root-relative links and images in the fragment are rewritten to the HP origin.
5. Script and styles load from HP, so a nav change ships to all consumers without a redeploy.

Options (attributes on the `<header>`):

| Attribute | Default | Meaning |
| --- | --- | --- |
| `data-nav-path` | `<hp-origin>/nav` | Absolute URL of the nav document, without `.plain.html`. |

Page requirements:

- Load as `type="module"`.
- The mobile menu toggles `body.nav-scroll-lock` on the host page; the script injects the one CSS rule this needs.
- Fonts (forma-djr) are declared in HP's document, so a partner page falls back to Helvetica/Arial unless it loads the font itself.

## 2. Static fragment

Sites that take raw HTML partials (HP's current model) fetch

```
https://<hp-origin>/nav.plain.html
```

and decorate it themselves. Structure: brand `<p>`, sections (`h2` + lists), tools list, newsroom bar.
Footer partial: `/footer.plain.html`.

## 3. CORS (config service, outside this repo)

Partner origins must be allowed to fetch `nav.plain.html`, `/scripts/global-nav.js`,
`/styles/global-nav.css`, `/blocks/header/*` and `/scripts/*`. Set headers through the EDS config
service (needs an admin token; replace `<org>` and `<site>`):

```bash
curl -X POST "https://admin.hlx.page/config/<org>/sites/<site>/headers.json" \
  -H "x-auth-token: $TOKEN" -H "content-type: application/json" \
  -d '{"/**": [{"key": "Access-Control-Allow-Origin", "value": "*"}]}'
```

Use an explicit partner origin list instead of `*` if the nav must not be public. Local `aem up`
already returns `access-control-allow-origin: *`.

## 4. Testing locally

```bash
aem up                                   # HP site on http://localhost:3000
cd docs/global-nav-test
python3 -m http.server 8099              # partner page on a different origin
```

Open `http://localhost:8099/index.html`. The page deliberately sets hostile CSS on `header`, `a`, `ul`,
etc. (red, uppercase, wavy underlines); the nav must be unaffected. The test page points at
`http://localhost:3000`; change the script URL to test against another HP origin.

## 5. Go-live proof

1. A test page on a different origin renders the HP nav (above).
2. Change a nav link in DA and publish.
3. Reload HP and the test page: both show the new link.

## Known limits

- The nav appears about a second after load (styles and fragment fetch first).
- The footer has no embeddable script; consumers use `footer.plain.html`.
- Demo sign-in (`demo-user.js`) only activates on localhost and `.aem/.hlx.page` hosts.
