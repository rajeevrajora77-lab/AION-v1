/**
 * Display helpers for authenticated user — never hardcode names in UI.
 */

export function emailLocalPart(email) {
  if (!email || typeof email !== 'string') return '';
  const at = email.indexOf('@');
  return at > 0 ? email.slice(0, at) : email;
}

/**
 * Prefer trimmed name; if missing, use email local part (before @).
 */
export function getDisplayName(user) {
  if (!user) return '';
  const name = typeof user.name === 'string' ? user.name.trim() : '';
  if (name) return name;
  return emailLocalPart(user.email) || '';
}

/**
 * Avatar initials: first letters of first + last word of name, else first email char.
 */
export function getUserInitials(user) {
  if (!user) return '?';
  const name = typeof user.name === 'string' ? user.name.trim() : '';
  if (name) {
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }
  const em = user.email;
  if (em && typeof em === 'string' && em.length) return em[0].toUpperCase();
  return '?';
}

/**
 * Normalize API user object (id as string, display name fallback).
 */
export function normalizeUser(raw) {
  if (!raw) return null;
  const id = raw.id != null ? String(raw.id) : raw._id != null ? String(raw._id) : '';
  const email = typeof raw.email === 'string' ? raw.email.toLowerCase().trim() : '';
  const name =
    (typeof raw.name === 'string' && raw.name.trim()) || emailLocalPart(email) || '';
  return {
    ...raw,
    id,
    email,
    name,
  };
}
