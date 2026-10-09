/**
 * Decorates the promo block: full-bleed background image + text + CTA(s).
 * @param {Element} block The promo block element
 */
export default function decorate(block) {
  const rows = [...block.children];
  const mediaRow = rows.find((row) => row.querySelector('picture'));
  const contentRow = rows.find((row) => row !== mediaRow);

  // The row itself is the real flex item (a direct child of the block);
  // its cell is a grandchild, so flex-basis on the cell would have no effect.
  if (mediaRow) mediaRow.classList.add('promo-media');
  if (contentRow) contentRow.classList.add('promo-content');
}
