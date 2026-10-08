// Drawers live in the URL (?feature=, ?poc=, ?research=, ?new=[&parent=]) and are updated in place
// (no server round trip), so the page underneath keeps its filters, selection and scroll.
// As in the prototype, only one drawer is open at a time: opening one clears the others.
const DRAWER_PARAMS = ['feature', 'poc', 'research', 'new', 'parent'];

export function openDrawer(key: 'feature' | 'poc' | 'research', id: string) {
  const u = new URL(window.location.href);
  for (const p of DRAWER_PARAMS) u.searchParams.delete(p);
  u.searchParams.set(key, id);
  window.history.pushState(null, '', u);
}

export function closeDrawer(...keys: string[]) {
  const u = new URL(window.location.href);
  for (const p of keys) u.searchParams.delete(p);
  window.history.pushState(null, '', u);
}
