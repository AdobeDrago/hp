export default function decorate(block) {
  const cells = [...block.querySelectorAll(':scope > div > div')];
  const mediaCell = cells.find((cell) => cell.querySelector('picture'));

  const rows = cells.map((cell) => {
    const row = document.createElement('div');
    row.className = cell === mediaCell ? 'banner-media' : 'banner-content';
    row.append(cell);
    return row;
  });
  block.replaceChildren(...rows);
}
