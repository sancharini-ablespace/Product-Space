import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { LoginForm } from '@/components/auth-forms';
import { getCurrentUser } from '@/lib/session';

export const metadata: Metadata = { title: 'Sign in · Product Hub' };

/** Reduce Auth.js's absolute callbackUrl to a same-site path (prevents open redirects). */
function safePath(value: string | string[] | undefined) {
  if (typeof value !== 'string') return '/';
  try {
    const url = new URL(value, 'http://local');
    return `${url.pathname}${url.search}`;
  } catch {
    return '/';
  }
}

/** Auth.js sends its own failures here as ?error=<type> (pages.error in src/auth.ts). */
function errorMessage(type: string | string[] | undefined) {
  if (!type) return undefined;
  return type === 'CredentialsSignin'
    ? 'Incorrect email or password.'
    : 'Sign-in failed. Try again, or ask a teammate if it keeps happening.';
}

export default async function LoginPage({ searchParams }: PageProps<'/login'>) {
  const sp = await searchParams;
  const target = safePath(sp.callbackUrl);
  if (await getCurrentUser()) redirect(target);
  return <LoginForm callbackUrl={target} initialError={errorMessage(sp.error)} />;
}
