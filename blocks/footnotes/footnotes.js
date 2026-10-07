const ICON_EXPAND = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false"><path fill="currentColor" d="M11.874 3.018a.518.518 0 0 0-.36.368c-.011.05-.013.566-.013 4.086v4.03H7.472c-3.56 0-4.036.002-4.088.014a.516.516 0 0 0-.368.364.505.505 0 0 0 .369.606c.05.012.566.014 4.087.014h4.03v4.029c0 3.52 0 4.037.013 4.087.04.174.188.323.364.369a.505.505 0 0 0 .606-.37c.012-.049.014-.565.014-4.086v-4.03h4.03c3.52 0 4.036-.001 4.086-.013a.516.516 0 0 0 .37-.364.505.505 0 0 0-.37-.606c-.05-.012-.566-.014-4.086-.014h-4.03v-4.03c0-3.52-.002-4.036-.014-4.086a.516.516 0 0 0-.364-.37.6.6 0 0 0-.247.002z"/></svg>';
const ICON_COLLAPSE = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false"><path fill="currentColor" d="M5.197 4.812a.505.505 0 0 0-.33.736c.016.03 1.057 1.078 3.227 3.247L11.297 12 8.09 15.208c-2.992 2.993-3.21 3.213-3.236 3.268a.499.499 0 0 0 .697.656c.026-.015 1.175-1.157 3.245-3.226L12 12.703l3.205 3.203c2.07 2.07 3.218 3.211 3.244 3.226a.528.528 0 0 0 .4.043.513.513 0 0 0 .348-.436.594.594 0 0 0-.05-.26c-.028-.059-.151-.184-3.237-3.27L12.703 12l3.203-3.205c2.07-2.07 3.211-3.218 3.226-3.244a.463.463 0 0 0 .063-.245.474.474 0 0 0-.145-.36.503.503 0 0 0-.598-.08c-.03.017-1.078 1.058-3.247 3.228L12 11.297 8.796 8.094c-2.17-2.17-3.218-3.211-3.248-3.228a.533.533 0 0 0-.35-.054z"/></svg>';

const DEFAULT_TITLE = 'Footnotes and Disclaimers';

// Dynamic footnote references are authored anywhere in page content as a link
// `<a href="#footnote-<key>" title="<footnote text>">1</a>`. All refs sharing
// the same <key> collapse into a single numbered entry, numbered in the order
// the key is first encountered on the page.
const DYNAMIC_REF_SELECTOR = 'a[href^="#footnote-"]';

function buildItem(id) {
  const li = document.createElement('li');
  li.className = 'footnotes__item';
  if (id) li.id = id;
  const content = document.createElement('div');
  content.className = 'footnotes__item-content';
  li.append(content);
  return li;
}

function decorateDynamicRefs(block, dynamicList) {
  const allRefs = [...document.querySelectorAll(DYNAMIC_REF_SELECTOR)];
  const refs = allRefs.filter((ref) => !block.contains(ref));
  const entries = new Map();

  refs.forEach((ref, index) => {
    const key = ref.getAttribute('href').slice('#footnote-'.length);
    if (!entries.has(key)) {
      entries.set(key, {
        number: entries.size + 1,
        id: `footnote-${key}`,
        text: ref.getAttribute('title') || '',
      });
    }
    const entry = entries.get(key);

    const refId = `footnote-ref-${key}-${index}`;
    ref.id = refId;
    ref.setAttribute('href', `#${entry.id}`);
    ref.setAttribute('aria-describedby', entry.id);
    ref.textContent = entry.number;
  });

  entries.forEach((entry) => {
    const li = buildItem(entry.id);
    li.querySelector('.footnotes__item-content').textContent = entry.text;
    const backlinks = refs.filter((ref) => ref.getAttribute('href') === `#${entry.id}`);
    backlinks.forEach((ref) => {
      const backlink = document.createElement('a');
      backlink.className = 'footnotes__item-backlink';
      backlink.href = `#${ref.id}`;
      backlink.textContent = '↑';
      backlink.setAttribute('aria-label', `Back to reference ${entry.number}`);
      li.append(backlink);
    });
    dynamicList.append(li);
  });
}

export default function decorate(block) {
  const rows = [...block.children];
  let titleText = DEFAULT_TITLE;
  let bodyRows = rows;

  if (rows.length > 1) {
    const firstRowText = rows[0].textContent.trim();
    if (firstRowText) {
      titleText = firstRowText;
      bodyRows = rows.slice(1);
    }
  }

  const staticList = document.createElement('ul');
  staticList.className = 'footnotes__list footnotes__list--static';
  bodyRows.forEach((row) => {
    if (!row.textContent.trim()) return;
    const li = buildItem();
    const content = li.querySelector('.footnotes__item-content');
    [...row.children].forEach((cell) => {
      while (cell.firstElementChild) content.append(cell.firstElementChild);
    });
    staticList.append(li);
  });

  const dynamicList = document.createElement('ol');
  dynamicList.className = 'footnotes__list footnotes__list--dynamic';

  const content = document.createElement('div');
  content.className = 'footnotes__content caption-regular reset-list no-default-list-spacings';
  content.append(staticList, dynamicList);

  const title = document.createElement('p');
  title.className = 'footnotes__title body-regular';
  title.textContent = titleText;

  const icon = document.createElement('div');
  icon.className = 'footnotes__icon';
  icon.innerHTML = `<span class="footnotes__icon-expand">${ICON_EXPAND}</span><span class="footnotes__icon-collapse">${ICON_COLLAPSE}</span>`;

  const header = document.createElement('div');
  header.className = 'footnotes__header';
  header.setAttribute('tabindex', '0');
  header.setAttribute('role', 'button');
  header.setAttribute('aria-expanded', 'false');
  header.append(title, icon);

  block.classList.add('footnotes--collapsed');
  const toggle = () => {
    const collapsed = block.classList.toggle('footnotes--collapsed');
    header.setAttribute('aria-expanded', String(!collapsed));
  };

  header.addEventListener('click', toggle);
  header.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggle();
    }
  });

  const container = document.createElement('div');
  container.className = 'footnotes__container';
  container.append(header, content);

  dynamicList.style.setProperty('--hpi-fn-static-length', staticList.children.length);

  block.replaceChildren(container);

  decorateDynamicRefs(block, dynamicList);

  block.classList.toggle('footnotes--empty', !staticList.children.length && !dynamicList.children.length);
}
