/*
 * Config access with safe fallbacks.
 *
 * In production, values come from the Fastly ConfigStore "config_default" (declared
 * in config/edgeFunctions.yaml). Locally / in sandbox programs the store may not
 * exist, so every read falls back to a built-in default and never throws.
 */

const DEFAULTS = {
  // Host that BrightEdge keys on (canonical production host).
  CANONICAL_HOST: 'www.hp.com',
  // EDS origin the function proxies to. Preview tier for dev; set the .aem.live
  // origin via ConfigStore in production.
  EDS_ORIGIN: 'https://main--hp--adobedrago.aem.page',
  // BrightEdge account id.
  BE_ACCOUNT: 'f00000000019918',
  // BrightEdge API base.
  BE_API: 'https://api.brightedge.com/api/ixf/1.0.0/get_capsule',
  // Path prefix the related-links feature applies to.
  NEWSROOM_PREFIX: '/us-en/newsroom',
};

// eslint-disable-next-line import/no-unresolved
import { ConfigStore } from 'fastly:config-store';

let store = null;
try {
  store = new ConfigStore('config_default');
} catch {
  // store not provisioned (e.g. sandbox program) — fall back to DEFAULTS
  store = null;
}

/**
 * @param {keyof typeof DEFAULTS} key
 * @returns {string}
 */
export function cfg(key) {
  if (store) {
    try {
      const v = store.get(key);
      if (v != null && v !== '') return v;
    } catch {
      // fall through to default
    }
  }
  return DEFAULTS[key];
}
