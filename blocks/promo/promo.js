export default function decorate(block) {
  const rows = [...block.children];
  const mediaRow = rows.find((row) => row.querySelector('picture'));
  const contentRow = rows.find((row) => row !== mediaRow);

  if (mediaRow) mediaRow.classList.add('promo-media');
  if (contentRow) contentRow.classList.add('promo-content');
}
