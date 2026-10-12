export const CLOSE_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5l14 14M19 5L5 19"/></svg>';

const DATA_URL = '/mock-users.json';
const SESSION_KEY = 'hp-mock-session';
const SESSION_HOURS = 8;

export const LABELS = {
  title: 'Sign in',
  countryLabel: 'Country code',
  mobileLabel: 'Mobile number',
  send: 'Send sign-in code',
  invalidMobile: 'Enter a valid mobile number.',
  notFound: 'We couldn’t find an account with that mobile number.',
  codeTitle: 'Enter your sign-in code',
  codeSent: 'We sent a 6-digit code to {mobile}.',
  codeLabel: 'Sign-in code',
  demoHint: 'Demo code: {code}',
  verify: 'Sign in',
  wrongCode: 'That code isn’t right. Try again.',
  changeNumber: 'Use a different number',
  close: 'Close',
  greeting: 'Welcome, {name}!',
  signOut: 'Sign out',
};

const digits = (v) => String(v ?? '').replace(/\D/g, '');
const nationalNumber = (v) => digits(v).replace(/^0+/, '');
const fill = (text, values) => text.replace(/\{(\w+)\}/g, (m, k) => values[k] ?? m);

let dataPromise;

export function loadMockData() {
  if (!dataPromise) {
    dataPromise = fetch(DATA_URL)
      .then((resp) => (resp.ok ? resp.json() : null))
      .then((json) => {
        if (!json) return null;
        const multi = json[':type'] === 'multi-sheet';
        const rows = (multi ? json.users?.data : json.data) || [];
        const users = rows
          .map((r) => ({
            country: digits(r.country),
            mobile: nationalNumber(r.mobile),
            firstName: String(r.firstName || '').trim(),
            lastName: String(r.lastName || '').trim(),
            otp: digits(r.otp),
          }))
          .filter((u) => u.mobile && u.otp);
        const labels = { ...LABELS };
        (multi ? json.labels?.data || [] : []).forEach((r) => {
          if (r.key && r.text) labels[r.key] = r.text;
        });
        return users.length ? { users, labels } : null;
      })
      .catch(() => null);
  }
  return dataPromise;
}

// localStorage throws when the browser blocks site data, so every access is guarded
function storage(action) {
  try {
    return action(window.localStorage);
  } catch (e) {
    return null;
  }
}

export function clearSession() {
  storage((s) => s.removeItem(SESSION_KEY));
}

export function getSession() {
  const session = storage((s) => JSON.parse(s.getItem(SESSION_KEY)));
  if (session && session.expires > Date.now()) return session;
  clearSession();
  return null;
}

function saveSession(user) {
  const session = {
    firstName: user.firstName,
    lastName: user.lastName,
    initials: `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase(),
    mobile: `+${user.country} •••• ${user.mobile.slice(-4)}`,
    expires: Date.now() + SESSION_HOURS * 60 * 60 * 1000,
  };
  // without storage the session still lasts for this page view
  storage((s) => s.setItem(SESSION_KEY, JSON.stringify(session)));
  return session;
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function field(id, label, input) {
  const wrap = el('div', 'mock-sign-in-field');
  const lab = el('label', null, label);
  lab.htmlFor = id;
  input.id = id;
  wrap.append(lab, input);
  return wrap;
}

export function openSignInDialog({ users, labels }) {
  return new Promise((resolve) => {
    let result = null;
    const dialog = el('dialog', 'mock-sign-in');
    dialog.setAttribute('aria-labelledby', 'mock-sign-in-title');

    const close = el('button', 'mock-sign-in-close');
    close.type = 'button';
    close.setAttribute('aria-label', labels.close);
    close.innerHTML = CLOSE_ICON;
    close.addEventListener('click', () => dialog.close());

    const title = el('h2', 'mock-sign-in-title', labels.title);
    title.id = 'mock-sign-in-title';
    const error = el('p', 'mock-sign-in-error');
    error.setAttribute('role', 'alert');
    const showError = (msg) => { error.textContent = msg; };

    const mobileForm = el('form', 'mock-sign-in-step');
    const country = el('select', 'mock-sign-in-country');
    [...new Set(users.map((u) => u.country))].forEach((c) => {
      const opt = el('option', null, `+${c}`);
      opt.value = c;
      country.append(opt);
    });
    const mobile = el('input', 'mock-sign-in-input');
    mobile.type = 'tel';
    mobile.autocomplete = 'tel-national';
    mobile.required = true;
    const row = el('div', 'mock-sign-in-row');
    row.append(field('mock-sign-in-country', labels.countryLabel, country), field('mock-sign-in-mobile', labels.mobileLabel, mobile));
    const send = el('button', 'mock-sign-in-submit', labels.send);
    send.type = 'submit';
    mobileForm.append(row, send);

    const codeForm = el('form', 'mock-sign-in-step');
    codeForm.hidden = true;
    const codeIntro = el('p', 'mock-sign-in-intro');
    const code = el('input', 'mock-sign-in-input');
    code.inputMode = 'numeric';
    code.autocomplete = 'one-time-code';
    code.maxLength = 6;
    code.required = true;
    const hint = el('p', 'mock-sign-in-hint');
    const verify = el('button', 'mock-sign-in-submit', labels.verify);
    verify.type = 'submit';
    const change = el('button', 'mock-sign-in-link', labels.changeNumber);
    change.type = 'button';
    codeForm.append(codeIntro, field('mock-sign-in-code', labels.codeLabel, code), hint, verify, change);

    let user = null;
    mobileForm.addEventListener('submit', (e) => {
      e.preventDefault();
      showError('');
      const number = nationalNumber(mobile.value);
      if (number.length < 6) { showError(labels.invalidMobile); mobile.focus(); return; }
      user = users.find((u) => u.country === country.value && u.mobile === number);
      if (!user) { showError(labels.notFound); mobile.focus(); return; }
      title.textContent = labels.codeTitle;
      codeIntro.textContent = fill(labels.codeSent, { mobile: `+${user.country} •••• ${user.mobile.slice(-4)}` });
      hint.textContent = fill(labels.demoHint, { code: user.otp });
      mobileForm.hidden = true;
      codeForm.hidden = false;
      code.value = '';
      code.focus();
    });
    codeForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (digits(code.value) !== user.otp) { showError(labels.wrongCode); code.select(); return; }
      result = saveSession(user);
      dialog.close();
    });
    change.addEventListener('click', () => {
      showError('');
      title.textContent = labels.title;
      codeForm.hidden = true;
      mobileForm.hidden = false;
      mobile.focus();
    });

    dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
    dialog.addEventListener('close', () => {
      dialog.remove();
      resolve(result);
    });

    const card = el('div', 'mock-sign-in-card');
    card.append(close, title, error, mobileForm, codeForm);
    dialog.append(card);
    document.body.append(dialog);
    dialog.showModal();
    mobile.focus();
  });
}
