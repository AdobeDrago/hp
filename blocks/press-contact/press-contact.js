/**
 * Press contact: the blue "About HP / Media Contact" band at the end of a
 * press release (hp.com). Authored as two rows of two cells:
 *   | About HP (heading)      | Media Contact (heading)                  |
 *   | about text              | label, link, label, link, ...            |
 * Each label in the second cell is paired with the link that follows it
 * (e.g. "Inquire" + "Media Only") as one row with a button on the right.
 */

function contactItems(cell) {
  const items = [];
  let current = null;
  [...cell.children].forEach((el) => {
    const link = el.querySelector('a') || (el.tagName === 'A' ? el : null);
    if (!link) {
      current = { label: el.textContent.trim(), link: null };
      items.push(current);
    } else if (current && !current.link) {
      current.link = link;
    } else {
      current = { label: '', link };
      items.push(current);
    }
  });

  const list = document.createElement('div');
  list.className = 'press-contact-items';
  items.forEach(({ label, link }) => {
    const item = document.createElement('div');
    item.className = 'press-contact-item';
    const text = document.createElement('p');
    text.className = 'press-contact-label';
    text.textContent = label;
    const action = document.createElement('p');
    action.className = 'press-contact-action';
    if (link) {
      link.className = 'press-contact-button';
      link.title = link.textContent.trim();
      action.append(link);
    }
    item.append(text, action);
    list.append(item);
  });
  return list;
}

function row(cells, className) {
  const band = document.createElement('div');
  band.className = className;
  const inner = document.createElement('div');
  inner.className = 'press-contact-row';
  cells.forEach((cell) => {
    cell.className = 'press-contact-cell';
    inner.append(cell);
  });
  band.append(inner);
  return band;
}

export default function decorate(block) {
  const [headRow, bodyRow] = [...block.children];
  const headCells = headRow ? [...headRow.children] : [];
  const bodyCells = bodyRow ? [...bodyRow.children] : [];

  if (bodyCells[1]) bodyCells[1].replaceChildren(contactItems(bodyCells[1]));

  block.replaceChildren(
    row(headCells, 'press-contact-head'),
    row(bodyCells, 'press-contact-body'),
  );
}
