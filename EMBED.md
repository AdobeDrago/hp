# Embedding the HP header and footer on non-EDS sites

Non-EDS sites show the HP header and footer with the `aem-embed` web component
(`scripts/aem-embed.js`), following https://www.aem.live/docs/aem-embed. The
content is rendered from the live `nav` and `footer` documents in Document
Authoring, inside a shadow root, so the host page's CSS can't change it and
ours can't leak into the host page.

## Use

```html
<script type="module" src="https://main--hp--adobedrago.aem.live/scripts/aem-embed.js"></script>

<aem-embed type="header" url="https://main--hp--adobedrago.aem.live/nav" link-base="https://www.hp.com"></aem-embed>
<!-- page content -->
<aem-embed type="footer" url="https://main--hp--adobedrago.aem.live/footer" link-base="https://www.hp.com"></aem-embed>
```

| Attribute | Purpose |
| --- | --- |
| `url` | Page to embed, without `.plain.html` (required). |
| `type` | `header`, `footer` or `main` (any other page, default). |
| `link-base` | Origin for site-relative links (`/us-en/...`). Defaults to the content's origin. |
| `newsroom="true"` | Header only: show the black HP Newsroom bar (hidden by default). |

The element fires `aem-embed:loaded` or `aem-embed:error` (bubbling), so the host
page can show its own fallback if the content can't load.

## Versions

Pick the code and content version with the host name, as with any EDS branch
(`https://{branch}--hp--adobedrago.aem.live`). `main` is production: merges reach
every embedding site immediately. To roll changes out deliberately, point
partners at a release branch (for example `embed-v1`) in both the script `src`
and the `url`, and update that branch from `main` when a release is approved.

## Requirements on this site

- **CORS:** a site admin adds `access-control-allow-origin` to the site's headers
  configuration (Admin API config service), or embedding pages are blocked:

  ```json
  {
    "/scripts/**": [{ "key": "access-control-allow-origin", "value": "*" }],
    "/blocks/**": [{ "key": "access-control-allow-origin", "value": "*" }],
    "/styles/**": [{ "key": "access-control-allow-origin", "value": "*" }],
    "/fonts/**": [{ "key": "access-control-allow-origin", "value": "*" }],
    "/icons/**": [{ "key": "access-control-allow-origin", "value": "*" }],
    "/nav.plain.html": [{ "key": "access-control-allow-origin", "value": "*" }],
    "/footer.plain.html": [{ "key": "access-control-allow-origin", "value": "*" }]
  }
  ```

  Replace `*` with partner origins to allow only those sites.
- **Code changes that keep the site embeddable** (already in place):
  `scripts.js` skips `loadPage()` when `window.hlx.suppressLoadPage` is set,
  `styles.css` declares its variables on `:root, :host`, and the header and
  footer use content passed in by `aem-embed` instead of fetching it.

## Behaviour on embedding pages

- Operational telemetry (RUM) is off: `aem-embed` sets `window.hlx.rum` before
  `aem.js` loads, so nothing is sampled or sent from partner pages.
- Fonts are registered on the host document, because browsers ignore
  `@font-face` inside shadow roots.
- The demo sign-in only runs on EDS preview hosts; elsewhere Sign in links to
  hp.com.

## Testing

Use the Embed Simulator Chrome extension linked from the aem.live doc, or a
local page with the snippet above. Until the CORS headers are configured, test
with a browser profile started with `--disable-web-security`.
