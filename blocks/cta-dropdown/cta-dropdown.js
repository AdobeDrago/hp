const ICON_CHEVRON = '<svg class="cta-dropdown-chevron" width="12" height="6" viewBox="0 0 12 6" aria-hidden="true" focusable="false"><path fill="none" stroke="currentColor" stroke-width="1.5" d="M1 5.5 6 1l5 4.5"/></svg>';

let dropdownId = 0;

function setOpen(block, open) {
  const toggle = block.querySelector('.cta-dropdown-button');
  block.classList.toggle('cta-dropdown-open', open);
  toggle.setAttribute('aria-expanded', open);
  block.querySelector('.cta-dropdown-menu').hidden = !open;
}

function buildMenu(block, label, links) {
  dropdownId += 1;
  const menuId = `cta-dropdown-menu-${dropdownId}`;

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'cta-dropdown-button';
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-controls', menuId);
  const text = document.createElement('span');
  text.textContent = label;
  toggle.append(text);
  toggle.insertAdjacentHTML('beforeend', ICON_CHEVRON);

  const menu = document.createElement('ul');
  menu.className = 'cta-dropdown-menu';
  menu.id = menuId;
  menu.hidden = true;
  links.forEach((link) => {
    const item = document.createElement('li');
    link.className = 'cta-dropdown-item';
    if (!link.title) link.title = link.textContent.trim();
    item.append(link);
    menu.append(item);
  });

  block.append(toggle, menu);

  toggle.addEventListener('click', () => {
    setOpen(block, toggle.getAttribute('aria-expanded') !== 'true');
  });
  block.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && block.classList.contains('cta-dropdown-open')) {
      setOpen(block, false);
      toggle.focus();
    }
  });
  block.addEventListener('focusout', (e) => {
    if (!block.contains(e.relatedTarget)) setOpen(block, false);
  });
  document.addEventListener('click', (e) => {
    if (!e.composedPath().includes(block)) setOpen(block, false);
  });
}

export default function decorate(block) {
  const rows = [...block.children];
  const links = [...block.querySelectorAll('a[href]')];
  const labelRow = rows.find((row) => !row.querySelector('a[href]') && row.textContent.trim());
  const label = labelRow ? labelRow.textContent.trim() : '';
  block.textContent = '';
  if (!links.length) return;

  if (links.length === 1) {
    const [link] = links;
    link.className = 'cta-dropdown-button';
    if (label) link.textContent = label;
    block.append(link);
    return;
  }

  buildMenu(block, label || links[0].textContent.trim(), links);
}
