/*
 * Mock mobile-number sign-in (demo only).
 *
 * Mimics hp.com's "Sign in with mobile number" + sign-in code flow without
 * HP ID: users come from the "mock-users" spreadsheet in Document Authoring
 * (published as /mock-users.json), the code is a fixed value per user, and the
 * "session" lives in localStorage. Nothing here is real authentication — the
 * sheet is public, so it must only ever hold made-up numbers.
 *
 * Sheet "users" (or the only sheet): country | mobile | firstName | lastName | otp
 * Optional sheet "labels": key | text — overrides any of the LABELS below.
 */

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
  greeting: 'Hi, {name}',
  signOut: 'Sign out',
};

const digits = (v) => String(v ?? '').replace(/\D/g, '');
// national numbers are often written with a trunk "0" (UK 07700…); ignore it
// so "07700 900123" and "7700 900123" match the same user
const nationalNumber = (v) => digits(v).replace(/^0+/, '');
const fill = (text, values) => text.replace(/\{(\w+)\}/g, (m, k) => values[k] ?? m);

let dataPromise;

/**
 * Loads (once) the mock users and label overrides from the spreadsheet.
 * Accepts a single-sheet or multi-sheet ("users" + "labels") workbook.
 * @returns {Promise<{users: Object[], labels: Object}|null>} null when unavailable
 */
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

/** @returns {Object|null} The stored, unexpired mock session */
export function getSession() {
  try {
    const session = JSON.parse(localStorage.getItem(SESSION_KEY));
    if (session && session.expires > Date.now()) return session;
  } catch (e) { /* unreadable storage counts as signed out */ }
  localStorage.removeItem(SESSION_KEY);
  return null;
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

function saveSession(user) {
  const session = {
    firstName: user.firstName,
    lastName: user.lastName,
    initials: `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase(),
    mobile: `+${user.country} •••• ${user.mobile.slice(-4)}`,
    expires: Date.now() + SESSION_HOURS * 60 * 60 * 1000,
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
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

/**
 * Opens the sign-in dialog. Resolves with the new session once signed in,
 * or null if the dialog is closed first.
 * @param {{users: Object[], labels: Object}} data From loadMockData()
 * @returns {Promise<Object|null>}
 */
export function openSignInDialog({ users, labels }) {
  return new Promise((resolve) => {
    let result = null;
    const dialog = el('dialog', 'mock-sign-in');
    dialog.setAttribute('aria-labelledby', 'mock-sign-in-title');

    const close = el('button', 'mock-sign-in-close');
    close.type = 'button';
    close.setAttribute('aria-label', labels.close);
    close.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5l14 14M19 5L5 19"/></svg>';
    close.addEventListener('click', () => dialog.close());

    const title = el('h2', 'mock-sign-in-title', labels.title);
    title.id = 'mock-sign-in-title';
    const error = el('p', 'mock-sign-in-error');
    error.setAttribute('role', 'alert');
    const showError = (msg) => { error.textContent = msg; };

    // step 1: country code + mobile number
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

    // step 2: sign-in code
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

    // backdrop click closes, as with the other header overlays
    dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
    dialog.addEventListener('close', () => {
      dialog.remove();
      resolve(result);
    });

    // content sits in an inner card so only clicks outside it hit the dialog
    // element itself (the backdrop)
    const card = el('div', 'mock-sign-in-card');
    card.append(close, title, error, mobileForm, codeForm);
    dialog.append(card);
    document.body.append(dialog);
    dialog.showModal();
    mobile.focus();
  });
}
