export default function decorate(block) {
  const width = [...block.classList].find((c) => /^width-\d{1,3}$/.test(c));
  if (width) block.style.setProperty('--image-width', `${width.slice(6)}%`);
}
