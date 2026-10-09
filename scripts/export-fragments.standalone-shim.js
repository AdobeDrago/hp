// eslint-disable-next-line no-unused-vars
function getMetadata(name, doc = document) {
  const attr = name && name.includes(':') ? 'property' : 'name';
  const nodes = [...doc.head.querySelectorAll(`meta[${attr}="${name}"]`)];
  return nodes.map((m) => m.content).join(', ') || '';
}
