# Related Links — AEM Edge Function

Renders the HP newsroom **"Related links"** component server-side by reproducing the
BrightEdge IXF link resolution at the CDN edge — no BrightEdge source access required.
Links land in the initial HTML (good for SEO/AI crawlers); the `blocks/related-links`
EDS block styles them and adds GTM click tracking client-side.

## How it works

```
Browser → Edge Function ─┬→ EDS origin (page HTML)
                         └→ api.brightedge.com (capsule)
              ↳ injects <div class="related-links"> before </main>, then returns HTML
```

For a `/us-en/newsroom[/...]` page the function:

1. fetches the page HTML from the EDS origin;
2. canonicalizes the URL to the hp.com `.html` form BrightEdge keys on
   (EDS is extensionless: `/us-en/newsroom` → `https://www.hp.com/us-en/newsroom.html`);
3. computes the BrightEdge page hash (Java `String.hashCode()`; negative → `"0"+abs`);
4. fetches the capsule and resolves links in three tiers:
   - **page-specific** — `nodes[body_1]` (newsroom listing pages),
   - **page-group** — first `config.page_groups[]` rule (by priority) that matches the
     URL, then `page_group_nodes[group]` (articles, e.g. "AI and Omnibook"),
   - **account default** — `default.json` when `account_id === 0`;
5. injects the `related-links` block markup before `</main>`.

Any failure (origin error, capsule error, no links) serves the origin HTML unchanged —
related links never break the page.

See `../.claude` memory `brightedge-ixf-contract` for the full reverse-engineered contract.

## Project layout

| Path | Role |
|------|------|
| `src/index.js` | entry point: router + transparent origin proxy |
| `src/related-links.js` | the handler (fetch origin, resolve, inject) |
| `src/lib/brightedge.js` | pure resolution logic (canonicalize, hash, page-group match) |
| `src/lib/html.js` | escaping + block markup + injection |
| `src/lib/config.js` | ConfigStore access with local fallbacks |
| `config/edgeFunctions.yaml` | function + origins + config (deploy via config pipeline) |
| `config/cdn.yaml` | origin selector routing `/us-en/newsroom(/.*)?` to the function |
| `test/` | Mocha unit tests + live capsule fixtures |
| `scripts/sync-block.mjs` | copies `blocks/related-links` into `assets/` for local serving |

## Local demo (no custom domain, no deploy)

Prereqs: Node.js, and the Adobe CLI with the Edge Functions plugin:

```bash
npm install -g @adobe/aio-cli
aio plugins install @adobe/aio-cli-plugin-aem-edge-functions
```

Then, from this folder:

```bash
npm install          # installs deps and copies the block into assets/
npm run serve        # aio aem edge-functions serve  → http://127.0.0.1:7676
```

Open **http://127.0.0.1:7676/us-en/newsroom** — the real newsroom page renders (proxied
from the EDS preview origin) with the styled Related Links block injected. Try
`/us-en/newsroom/press-releases` and a blog article to see per-page links.

Verify the links are truly server-side (present without JavaScript):

```bash
curl -s http://127.0.0.1:7676/us-en/newsroom | grep -o 'class="related-links".*</main>' | head
```

> The function serves `blocks/related-links/related-links.{js,css}` itself for the local
> demo, so nothing needs pushing to a branch. In production those come from the EDS code
> bus and that route can be removed.

## Tests

```bash
npm test
```

## Deploy (production — requires client prerequisites)

See [PREREQUISITES.md](./PREREQUISITES.md). Once the Cloud Manager Edge Delivery site,
custom domain, role, and config pipeline exist:

```bash
npm run build                 # aio aem edge-functions build
npm run deploy                # aio aem edge-functions deploy related-links
# commit config/ and run the Edge Delivery config pipeline to deploy edgeFunctions.yaml + cdn.yaml
```

Set the production origin (`EDS_ORIGIN` → `https://main--hp--adobedrago.aem.live`) via the
ConfigStore values in `config/edgeFunctions.yaml`.
