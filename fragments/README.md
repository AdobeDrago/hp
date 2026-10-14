# HP header and footer for non-EDS sites

Any site can show the HP header and footer by including two hosted HTML files.
They are rendered from the live `nav` and `footer` documents in Document
Authoring, so content edits and code fixes reach every site without changes on
their side.

## Include

Add the files with your server or CMS include, where the header and footer
should appear:

- `https://main--hp--adobedrago.aem.live/fragments/header.html`
- `https://main--hp--adobedrago.aem.live/fragments/footer.html`

Each file is three lines: the stylesheet, an empty `<header>` or `<footer>`
placeholder, and the script that fills it. Without a server include, paste the
same three lines into the page template.

```html
<link rel="stylesheet" href="https://main--hp--adobedrago.aem.live/fragments/fragments.css">
<header data-hp-fragment="header"></header>
<script type="module" src="https://main--hp--adobedrago.aem.live/fragments/fragments.js"></script>
```

## Options

- `data-newsroom="true"` on the `<header>` adds the black HP Newsroom bar.
  It is hidden by default.

## Notes

- Links that are site paths in the nav/footer documents (`/us-en/...`) point
  to `https://www.hp.com`; images, fonts and code load from the EDS site.
- The page needs no other HP styles or scripts. The header and footer keep
  their own look, but very specific host-site CSS (for example `header nav a`)
  can still override it.
- The EDS site must send `Access-Control-Allow-Origin` for the fragment files,
  code, fonts and the `nav`/`footer` content (site `headers` configuration).
