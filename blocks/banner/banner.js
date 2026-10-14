export default function decorate(block) {
  const cells = [...block.querySelectorAll(':scope > div > div')];
  const mediaCell = cells.find((cell) => cell.querySelector('picture'));
  const contentCell = cells.find((cell) => cell !== mediaCell);

  const rows = [];
  [[mediaCell, 'banner-media'], [contentCell, 'banner-content']].forEach(([cell, className]) => {
    if (!cell) return;
    const row = document.createElement('div');
    row.className = className;
    row.append(cell);
    rows.push(row);
  });
  block.replaceChildren(...rows);
}
