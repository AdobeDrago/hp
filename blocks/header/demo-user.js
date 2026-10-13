export const CLOSE_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5l14 14M19 5L5 19"/></svg>';

const DATA_URL = '/mock-users.json';
const SIGNED_IN_KEY = 'hp-demo-signed-in';

export const LABELS = {
  greeting: 'Welcome, {name}!',
  signOut: 'Sign out',
};

const DEMO_HOSTS = /^(localhost|127\.0\.0\.1)$|\.(aem|hlx)\.page$/;
const isDemoHost = () => DEMO_HOSTS.test(window.location.hostname);

let dataPromise;

export function loadDemoUser() {
  if (!dataPromise) {
    dataPromise = (isDemoHost() ? fetch(DATA_URL) : Promise.resolve({ ok: false }))
      .then((resp) => (resp.ok ? resp.json() : null))
      .then((json) => {
        if (!json) return null;
        const multi = json[':type'] === 'multi-sheet';
        const [row] = (multi ? json.users?.data : json.data) || [];
        const firstName = String(row?.firstName || '').trim();
        const lastName = String(row?.lastName || '').trim();
        if (!firstName) return null;
        const labels = { ...LABELS };
        (multi ? json.labels?.data || [] : []).forEach((r) => {
          if (r.key && r.text) labels[r.key] = r.text;
        });
        const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
        return { user: { firstName, lastName, initials }, labels };
      })
      .catch(() => null);
  }
  return dataPromise;
}

function storage(action) {
  try {
    return action(window.localStorage);
  } catch (e) {
    return null;
  }
}

export function isSignedIn() {
  return storage((s) => s.getItem(SIGNED_IN_KEY)) === 'true';
}

export function setSignedIn(signedIn) {
  storage((s) => (signedIn ? s.setItem(SIGNED_IN_KEY, 'true') : s.removeItem(SIGNED_IN_KEY)));
}
