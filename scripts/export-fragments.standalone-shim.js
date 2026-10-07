// Standalone equivalent of scripts/aem.js's getMetadata(), inlined into
// exported fragment JS so it has zero project-relative imports. Used by
// whichever block source this text gets concatenated onto, not from here.
// eslint-disable-next-line no-unused-vars
function getMetadata(name, doc = document) {
  const attr = name && name.includes(':') ? 'property' : 'name';
  const nodes = [...doc.head.querySelectorAll(`meta[${attr}="${name}"]`)];
  return nodes.map((m) => m.content).join(', ') || '';
}
