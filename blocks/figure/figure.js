export default function decorate(block) {
  const width = [...block.classList].find((c) => /^width-\d{1,3}$/.test(c));
  if (width) block.style.setProperty('--figure-width', `${width.slice(6)}%`);
}
