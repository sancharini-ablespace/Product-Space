import 'server-only';
import bcrypt from 'bcryptjs';
import { db } from './supabase';

export const allowedDomain = (process.env.ALLOWED_EMAIL_DOMAIN ?? 'ablespace.io').toLowerCase();

/** Emails that may set up an account without an invite (bootstraps the first users). */
const adminEmails = new Set(
  (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),
);

export const MIN_PASSWORD = 8;

/** Password rule from the design's Security tab: at least 8 characters and a number. */
export function meetsPasswordRules(password: string) {
  return password.length >= MIN_PASSWORD && /\d/.test(password);
}

export const normalizeEmail = (email: string) => email.trim().toLowerCase();

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function isValidEmail(email: string) {
  return EMAIL_RE.test(email);
}

export function isAllowedEmail(email: string | null | undefined): email is string {
  return !!email && isValidEmail(normalizeEmail(email)) && normalizeEmail(email).endsWith(`@${allowedDomain}`);
}

export const isAdminEmail = (email: string) => adminEmails.has(normalizeEmail(email));

export const hashPassword = (password: string) => bcrypt.hash(password, 12);

// Compared against when the email is unknown, so response time doesn't reveal which emails exist.
const DUMMY_HASH = '$2b$12$ue.rF0BoDBR1ArXuuUWTaueTiAe/lQaqr4RGnKrqbtlw5hdFORDBa';

interface AccountRow {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  password_hash: string | null;
  invite_role: string | null;
  activated_at: string | null;
}

export async function findAccount(email: string): Promise<AccountRow | null> {
  const { data, error } = await db()
    .from('users')
    .select('id, email, name, image, password_hash, invite_role, activated_at')
    .eq('email', normalizeEmail(email))
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

/** Returns the user if the email/password pair is valid, else null. */
export async function verifyCredentials(email: string, password: string) {
  const account = isAllowedEmail(email) ? await findAccount(email) : null;
  const ok = await bcrypt.compare(password, account?.password_hash ?? DUMMY_HASH);
  if (!account?.password_hash || !ok) return null;
  return { id: account.id, email: account.email, name: account.name, image: account.image };
}
