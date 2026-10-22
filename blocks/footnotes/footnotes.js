const ICON_EXPAND = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false"><path fill="currentColor" d="M11.874 3.018a.518.518 0 0 0-.36.368c-.011.05-.013.566-.013 4.086v4.03H7.472c-3.56 0-4.036.002-4.088.014a.516.516 0 0 0-.368.364.505.505 0 0 0 .369.606c.05.012.566.014 4.087.014h4.03v4.029c0 3.52 0 4.037.013 4.087.04.174.188.323.364.369a.505.505 0 0 0 .606-.37c.012-.049.014-.565.014-4.086v-4.03h4.03c3.52 0 4.036-.001 4.086-.013a.516.516 0 0 0 .37-.364.505.505 0 0 0-.37-.606c-.05-.012-.566-.014-4.086-.014h-4.03v-4.03c0-3.52-.002-4.036-.014-4.086a.516.516 0 0 0-.364-.37.6.6 0 0 0-.247.002z"/></svg>';
const ICON_COLLAPSE = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false"><path fill="currentColor" d="M5.197 4.812a.505.505 0 0 0-.33.736c.016.03 1.057 1.078 3.227 3.247L11.297 12 8.09 15.208c-2.992 2.993-3.21 3.213-3.236 3.268a.499.499 0 0 0 .697.656c.026-.015 1.175-1.157 3.245-3.226L12 12.703l3.205 3.203c2.07 2.07 3.218 3.211 3.244 3.226a.528.528 0 0 0 .4.043.513.513 0 0 0 .348-.436.594.594 0 0 0-.05-.26c-.028-.059-.151-.184-3.237-3.27L12.703 12l3.203-3.205c2.07-2.07 3.211-3.218 3.226-3.244a.463.463 0 0 0 .063-.245.474.474 0 0 0-.145-.36.503.503 0 0 0-.598-.08c-.03.017-1.078 1.058-3.247 3.228L12 11.297 8.796 8.094c-2.17-2.17-3.218-3.211-3.248-3.228a.533.533 0 0 0-.35-.054z"/></svg>';

const DEFAULT_TITLE = 'Footnotes and Disclaimers';

const DYNAMIC_REF_SELECTOR = 'a[href^="#footnote-"]';

const ICON_CHEVRON = '<svg width="12" height="7" viewBox="0 0 12 7" aria-hidden="true" focusable="false"><path fill="currentColor" d="M0 10.658L1.28 12 7 6 1.28 0 0 1.337 4.51 6z" transform="rotate(90 6 6)"/></svg>';
const ICON_EXTERNAL = '<svg class="footnotes-external-icon" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path fill="none" stroke="currentColor" stroke-width="1.5" d="M13.5 9v4.5h-11v-11H7M10 2.5h3.5V6M13.5 2.5 7.5 8.5"/></svg>';

// URLs in the footnote text; sentence punctuation after a URL stays outside
// the link, a closing bracket only when the URL did not open one
const URL_PATTERN = /https?:\/\/\S+/g;
const TRAILING_PUNCTUATION = /[.,;:!?'"\]}>]+$/;

// GTM value from the link itself: "http://aka.ms/WindowsAIFeatures" -> "aka-ms-windowsaifeatures"
const gtmValueOf = (url) => url.toLowerCase()
  .replace(/^https?:\/\/(www\.)?/, '')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '');

function trimUrl(raw) {
  let url = raw.replace(TRAILING_PUNCTUATION, '');
  while (url.endsWith(')') && (url.match(/\(/g) || []).length < (url.match(/\)/g) || []).length) {
    url = url.slice(0, -1).replace(TRAILING_PUNCTUATION, '');
  }
  return url;
}

function appendLinkified(target, text) {
  let last = 0;
  [...text.matchAll(URL_PATTERN)].forEach((match) => {
    const url = trimUrl(match[0]);
    if (!url) return;
    target.append(text.slice(last, match.index));
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = url;
    link.dataset.gtmCategory = 'linkClick';
    link.dataset.gtmId = 'footnotes';
    link.dataset.gtmValue = gtmValueOf(url);
    const hint = document.createElement('span');
    hint.className = 'footnotes-visually-hidden';
    hint.textContent = ' (opens in a new tab)';
    link.append(hint);
    target.append(link);
    link.insertAdjacentHTML('afterend', ICON_EXTERNAL);
    last = match.index + url.length;
  });
  target.append(text.slice(last));
}

function buildItem(id) {
  const li = document.createElement('li');
  li.className = 'footnotes-item';
  if (id) li.id = id;
  const content = document.createElement('div');
  content.className = 'footnotes-item-content';
  li.append(content);
  return li;
}

function decorateDynamicRefs(block, dynamicList) {
  const allRefs = [...document.querySelectorAll(DYNAMIC_REF_SELECTOR)];
  const refs = allRefs.filter((ref) => !ref.closest('.footnotes') && !ref.dataset.footnoteRef);
  const entries = new Map();

  refs.forEach((ref) => {
    const key = ref.getAttribute('href').slice('#footnote-'.length);
    if (!entries.has(key)) {
      entries.set(key, {
        number: entries.size + 1,
        id: `footnote-${key}`,
        text: ref.getAttribute('title') || '',
      });
    }
    const entry = entries.get(key);

    ref.dataset.footnoteRef = key;
    ref.setAttribute('href', `#${entry.id}`);
    ref.setAttribute('aria-describedby', entry.id);
    ref.setAttribute('aria-label', `Footnote ${entry.number}`);
    ref.textContent = entry.number;
  });

  entries.forEach((entry) => {
    const li = buildItem(entry.id);
    appendLinkified(li.querySelector('.footnotes-item-content'), entry.text);
    dynamicList.append(li);
  });
}

export default function decorate(block) {
  const rows = [...block.children];
  const press = block.classList.contains('press');
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
  staticList.className = 'footnotes-list footnotes-list-static';
  bodyRows.forEach((row) => {
    if (!row.textContent.trim()) return;
    const li = buildItem();
    const content = li.querySelector('.footnotes-item-content');
    [...row.children].forEach((cell) => {
      while (cell.firstChild) content.append(cell.firstChild);
    });
    if (press && !content.querySelector(':scope > :is(p, ol, ul)')) {
      const p = document.createElement('p');
      p.append(...content.childNodes);
      content.append(p);
    }
    staticList.append(li);
  });

  const dynamicList = document.createElement('ol');
  dynamicList.className = 'footnotes-list footnotes-list-dynamic';

  const content = document.createElement('div');
  content.className = 'footnotes-content';
  content.id = `footnotes-content-${[...document.querySelectorAll('.footnotes')].indexOf(block)}`;
  content.append(staticList, dynamicList);

  const title = document.createElement('p');
  title.className = 'footnotes-title';
  title.textContent = titleText;

  block.classList.toggle('footnotes-collapsed', press);

  const icon = document.createElement('div');
  icon.className = 'footnotes-icon';
  icon.innerHTML = press
    ? ICON_CHEVRON
    : `<span class="footnotes-icon-expand">${ICON_EXPAND}</span><span class="footnotes-icon-collapse">${ICON_COLLAPSE}</span>`;

  const header = document.createElement('div');
  header.className = 'footnotes-header';
  header.setAttribute('tabindex', '0');
  header.setAttribute('role', 'button');
  header.setAttribute('aria-expanded', String(!press));
  header.setAttribute('aria-controls', content.id);
  header.append(title, icon);

  const toggle = () => {
    const collapsed = block.classList.toggle('footnotes-collapsed');
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
  container.className = 'footnotes-panel';
  container.append(header, content);

  dynamicList.style.setProperty('--hpi-fn-static-length', staticList.children.length);

  block.replaceChildren(container);

  decorateDynamicRefs(block, dynamicList);

  block.classList.toggle('footnotes-empty', !staticList.children.length && !dynamicList.children.length);
}
