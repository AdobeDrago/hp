# Related Links Edge Function — Client Prerequisites

This document lists what HP (the customer) must provide or set up in **Adobe Cloud
Manager** before the "Related links" AEM Edge Function can be deployed to production.
None of these block local development — the function can be built and tested locally
with `aio aem edge-functions serve` — but all are required to route real newsroom
traffic through it.

## 1. Edge Delivery site onboarded to Cloud Manager

The newsroom EDS site must exist as an Edge Delivery site in a Cloud Manager program.
- **Program:** a Cloud Manager program with the **Edge Delivery Services add-on**.
- **Site origin:** `https://main--hp--adobedrago.aem.live/`
  (preview tier `https://main--hp--adobedrago.aem.page/` is used for dev/testing).
- Confirm the **Edge Delivery** tab is visible on the program overview and the site
  appears in the Edge Delivery Sites table.

## 2. Production custom domain + TLS

A custom domain **must** be mapped to the Adobe-managed CDN — required even for a dev
deployment. For production this is the live newsroom hostname (e.g. `www.hp.com`); for
a staging deployment, whatever staging host is used.
- Domain added and mapped to the Adobe-managed CDN in Cloud Manager.
- SSL certificate (Adobe-managed DV, or customer-managed OV/EV) installed.
- DNS record pointing the domain at the Adobe-managed CDN.

> **Why it matters:** BrightEdge link resolution is keyed to the canonical
> `https://www.hp.com/us-en/...` URL. The function rewrites the serving host to the
> canonical host before resolving links (config value `CANONICAL_HOST`), so the domain
> setup and the canonical-host config must agree.

## 3. Roles / permissions

The person deploying needs **one** of:
- **Cloud Manager Deployment Manager** role (Admin Console), for Edge Delivery sites; or
- the AEM Administrator Product Profile on the author instance (Java-stack only — not
  applicable here).

## 4. Edge Delivery configuration pipeline

An **Edge Delivery configuration pipeline** must exist in Cloud Manager, pointed at this
repository's config folder:
- **Source repository:** this repo (added to Cloud Manager as an Adobe or private repo).
- **Branch:** `main`.
- **Code location:** `/aem-edge-functions/config`
  (contains `edgeFunctions.yaml` and `cdn.yaml`).

If a private GitHub repo is used, complete the **Private Repository Ownership Validation**
in Cloud Manager (store the validation secret in the repo).

## 5. (CI/CD only) Adobe Developer Console project

Required only to deploy from CI/CD rather than a developer's machine: an Adobe Developer
Console project with the **AEM Content Delivery Network (CDN) API** credential. Not needed
for manual `aio aem edge-functions deploy`.

## 6. Program limits to be aware of

- **3 AEM Edge Functions per Edge Delivery program** (intended for dev/staging/prod).
  Confirm headroom before adding this one.
- Up to **5 edge-function executions per licensed content request**.

---

## Summary checklist for the client

- [ ] Edge Delivery site onboarded in Cloud Manager (origin `main--hp--adobedrago.aem.live`)
- [ ] Production/staging custom domain mapped to Adobe-managed CDN, with TLS + DNS
- [ ] Deployment Manager role granted to the deploying user
- [ ] Edge Delivery config pipeline created, pointed at `/aem-edge-functions/config` on `main`
- [ ] (If CI/CD) Adobe Developer Console project with AEM CDN API credential
- [ ] Confirm < 3 existing edge functions on the program
