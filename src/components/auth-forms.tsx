'use client';

import { useActionState, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/hub/Button';
import { setUpAccount, signInWithPassword } from '@/lib/auth-actions';

// Field styling follows the create drawer's labelled inputs in design/PM Dashboard v3.dc.html.
function Field({ label, ...props }: { label: string } & React.ComponentProps<'input'>) {
  return (
    <label className="flex flex-col gap-1.5 text-md font-medium text-ink-3">
      {label}
      <input
        {...props}
        className="h-[34px] rounded-md border border-border-strong bg-surface px-2.5 text-lg font-normal text-ink outline-none focus:border-muted"
      />
    </label>
  );
}

function ErrorText({ message }: { message?: string }) {
  if (!message) return null;
  return <div className="text-sm text-tone-red-fg">{message}</div>;
}

/** Centered card used by /login and /setup, built from the Profile card and sidebar brand styles. */
export function AuthCard({
  title,
  sub,
  children,
  footer,
}: {
  title: string;
  sub: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <main className="flex min-h-full items-center justify-center bg-bg px-4 py-10">
      <div className="flex w-full max-w-[460px] flex-col gap-4">
        <div className="flex items-center gap-[9px] px-1">
          <div className="flex size-[22px] items-center justify-center rounded-md bg-ink text-[11px] font-semibold text-on-primary">
            P
          </div>
          <div className="text-[14px] font-semibold tracking-[-0.01em]">Product Hub</div>
        </div>
        <div className="flex flex-col gap-3.5 rounded-lg border border-border bg-surface p-5">
          <div>
            <div className="text-[14px] font-semibold">{title}</div>
            <div className="mt-0.5 text-md text-faint">{sub}</div>
          </div>
          {children}
        </div>
        <div className="px-1 text-md text-muted">{footer}</div>
      </div>
    </main>
  );
}

const footerLink = 'text-muted underline underline-offset-2 hover:text-ink';

// The email (and name) fields are controlled: React resets uncontrolled form fields after a
// form action runs, which would wipe them after a failed attempt.
export function LoginForm({ callbackUrl }: { callbackUrl: string }) {
  const [state, action, pending] = useActionState(signInWithPassword, undefined);
  const [email, setEmail] = useState('');
  return (
    <AuthCard
      title="Sign in"
      sub="Use your AbleSpace email and password."
      footer={
        <>
          Invited by a teammate?{' '}
          <Link href="/setup" className={footerLink}>
            Set up your account
          </Link>
        </>
      }
    >
      <form action={action} className="flex flex-col gap-3.5">
        <input type="hidden" name="callbackUrl" value={callbackUrl} />
        <Field
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          required
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Field label="Password" name="password" type="password" autoComplete="current-password" required />
        <ErrorText message={state?.error} />
        <div className="flex justify-end">
          <Button type="submit" variant="primary" label={pending ? 'Signing in…' : 'Sign in'} disabled={pending} />
        </div>
      </form>
    </AuthCard>
  );
}

export function SetupForm({ domain }: { domain: string }) {
  const [state, action, pending] = useActionState(setUpAccount, undefined);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  return (
    <AuthCard
      title="Set up your account"
      sub="For teammates who've been invited. Choose the password you'll sign in with."
      footer={
        <>
          Already set up?{' '}
          <Link href="/login" className={footerLink}>
            Sign in
          </Link>
        </>
      }
    >
      <form action={action} className="flex flex-col gap-3.5">
        <Field
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder={`name@${domain}`}
          required
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Field
          label="Full name"
          name="name"
          autoComplete="name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Field label="Password" name="password" type="password" autoComplete="new-password" minLength={8} required />
        <Field label="Confirm password" name="confirm" type="password" autoComplete="new-password" required />
        <ErrorText message={state?.error} />
        <div className="flex justify-end">
          <Button
            type="submit"
            variant="primary"
            label={pending ? 'Setting up…' : 'Set up account'}
            disabled={pending}
          />
        </div>
      </form>
    </AuthCard>
  );
}
