const DEFAULT_TITLE = 'Footnotes and Disclaimers';

/**
 * Decorates the footnotes block: one collapsible small-print panel built on
 * native <details>/<summary> (open by default like the source, +/− toggle via CSS).
 * Expected content: row 1 = title, row 2 = body (paragraphs and/or an
 * ordered list of footnotes). Authors may also put title | body side by
 * side in a single row, omit the title, or add extra body rows.
 * @param {Element} block The footnotes block element
 */
export default function decorate(block) {
  const rows = [...block.children];
  if (!rows.length) return;

  let titleCell;
  let bodyCells;
  const firstCells = [...rows[0].children];
  if (firstCells.length > 1) {
    // single-row authoring: title | body
    [titleCell] = firstCells;
    bodyCells = [...firstCells.slice(1), ...rows.slice(1).flatMap((row) => [...row.children])];
  } else if (rows.length > 1) {
    [titleCell] = firstCells;
    bodyCells = rows.slice(1).flatMap((row) => [...row.children]);
  } else {
    // a single cell: treat it as body only
    bodyCells = firstCells;
  }

  const details = document.createElement('details');
  details.open = true;
  const summary = document.createElement('summary');
  summary.className = 'footnotes-title';
  const titleText = titleCell?.textContent.trim();
  summary.textContent = titleText || DEFAULT_TITLE;

  const body = document.createElement('div');
  body.className = 'footnotes-body';
  bodyCells.forEach((cell) => body.append(...cell.childNodes));

  details.append(summary, body);
  block.replaceChildren(details);
}
