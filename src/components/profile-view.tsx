'use client';

// Profile — design/PM Dashboard v3.dc.html (isProfile): Profile, Security and Team tabs.
import { useState, useTransition } from 'react';
import { Avatar } from '@/components/hub/Avatar';
import { Button } from '@/components/hub/Button';
import { ConfirmDialog } from '@/components/hub/ConfirmDialog';
import { Select } from '@/components/hub/Select';
import { Tabs } from '@/components/hub/Tabs';
import { changePassword, inviteUser, resetPassword, revokeInvite, updateProfile } from '@/lib/actions';
import { signOutAction } from '@/lib/auth-actions';
import { T, memberAv, memberName, rel } from '@/lib/hub';
import type { TeamRow } from '@/lib/queries';
import type { User } from '@/lib/types';

export type ProfileTab = 'profile' | 'security' | 'team';
type Counts = Record<string, { owns: number; ownerOf: number; watching: number }>;

const label = 'flex flex-col gap-1.5 text-md font-medium text-ink-3';
const input =
  'h-[34px] rounded-md border border-border-strong bg-surface px-2.5 text-[13.5px] font-normal text-ink outline-none focus:border-muted';
const card = 'rounded-lg border border-border bg-surface';
const TEAM_COLS = 'grid-cols-[minmax(220px,2fr)_minmax(130px,1fr)_90px_90px_80px]';
const TZ = [
  ['Asia/Kolkata', 'India (IST, UTC+5:30)'],
  ['Europe/London', 'London (GMT/BST)'],
  ['America/New_York', 'New York (ET)'],
  ['America/Los_Angeles', 'Los Angeles (PT)'],
].map(([v, l]) => ({ v: v!, l: l! }));
const ROLES = ['Product Manager', 'Engineer', 'Designer', 'QA', 'Viewer'].map((x) => ({ v: x, l: x }));

export function ProfileView({
  profile,
  team,
  counts,
  initialTab,
}: {
  profile: User;
  team: TeamRow[];
  counts: Counts;
  initialTab: ProfileTab;
}) {
  const [tab, setTabState] = useState<ProfileTab>(initialTab);
  const setTab = (t: ProfileTab) => {
    setTabState(t);
    window.history.replaceState(null, '', `/profile?tab=${t}`);
  };
  const role = profile.role_title || 'Member';
  const tabs = (
    [
      ['profile', 'Profile', ''],
      ['security', 'Security', ''],
      ['team', 'Team', team.length],
    ] as const
  ).map(([id, l, count]) => ({ label: l, count, active: tab === id, go: () => setTab(id) }));

  return (
    <div className="max-w-[960px] px-[clamp(16px,4vw,32px)] pt-6 pb-10">
      <div className="flex items-center gap-3.5">
        <Avatar av={memberAv(profile)} size={48} />
        <div>
          <h1 className="m-0 text-[20px] font-semibold tracking-[-0.015em]">{memberName(profile)}</h1>
          <div className="mt-0.5 text-[13px] text-muted">
            {role} · {profile.email}
          </div>
        </div>
      </div>
      <div className="mt-5 mb-[18px]">
        <Tabs items={tabs} />
      </div>
      {tab === 'profile' && <ProfileTabView profile={profile} />}
      {tab === 'security' && <SecurityTab profile={profile} />}
      {tab === 'team' && <TeamTab team={team} counts={counts} meId={profile.id} />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------
interface Draft {
  name: string;
  role: string;
  timezone: string;
  notifyWatch: boolean;
  notifyConf: boolean;
}

function ProfileTabView({ profile }: { profile: User }) {
  const saved: Draft = {
    name: memberName(profile),
    role: profile.role_title ?? '',
    timezone: profile.timezone,
    notifyWatch: profile.notify_watch,
    notifyConf: profile.notify_conf,
  };
  const [draft, setDraft] = useState<Draft | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const d = draft ?? saved;
  const set = (patch: Partial<Draft>) => {
    setDraft({ ...d, ...patch });
    setMsg(null);
  };

  function save() {
    if (!draft) return setMsg({ ok: true, text: 'Saved' });
    if (!draft.name.trim()) return setMsg({ ok: false, text: "Name can't be empty." });
    startTransition(async () => {
      const res = await updateProfile({
        name: draft.name,
        roleTitle: draft.role,
        timezone: draft.timezone,
        notifyWatch: draft.notifyWatch,
        notifyConf: draft.notifyConf,
      });
      if (res.error) return setMsg({ ok: false, text: res.error });
      setDraft(null);
      setMsg({ ok: true, text: 'Saved' });
    });
  }

  const savedMsg = msg ? msg.text : draft ? 'Unsaved changes' : '';
  const savedColor = msg ? (msg.ok ? T.green.fg : T.red.fg) : 'var(--faint)';
  const toggles = [
    { key: 'notifyWatch' as const, label: 'Watched features', sub: 'Email me when a feature I watch changes status.' },
    {
      key: 'notifyConf' as const,
      label: 'Confidence changes',
      sub: 'Email me when confidence changes on versions I own.',
    },
  ];

  return (
    <div className={`${card} flex max-w-[620px] flex-col gap-4 p-5`}>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3.5">
        <label className={label}>
          Full name
          <input value={d.name} onChange={(e) => set({ name: e.target.value })} className={input} />
        </label>
        <label className={label}>
          Role / title
          <input value={d.role} onChange={(e) => set({ role: e.target.value })} className={input} />
        </label>
        <label className={label}>
          Email
          {/* Email is the sign-in identity, so it's read-only here. */}
          <input value={profile.email} readOnly className={input} />
        </label>
        <label className={label}>
          Time zone
          <Select value={d.timezone} options={TZ} onChange={(e) => set({ timezone: e.target.value })} block />
        </label>
      </div>
      <div className="flex flex-col gap-2.5 border-t border-border-subtle pt-3.5">
        <div className="text-[11.5px] font-semibold tracking-[0.05em] text-faint uppercase">Notifications</div>
        {toggles.map((tg) => {
          const on = d[tg.key];
          return (
            <button
              key={tg.key}
              type="button"
              onClick={() => set({ [tg.key]: !on })}
              className="flex w-full cursor-pointer items-center justify-between gap-4 border-0 bg-transparent px-0 py-1 text-left"
            >
              <span>
                <span className="block text-[13px] font-medium">{tg.label}</span>
                <span className="block text-md text-faint">{tg.sub}</span>
              </span>
              <span
                className="relative h-[18px] w-8 shrink-0 rounded-[9px] transition-[background] duration-150"
                style={{ background: on ? 'var(--ink)' : '#d6d4cf' }}
              >
                <span
                  className="absolute top-0.5 size-3.5 rounded-full bg-surface shadow-[0_1px_2px_rgba(0,0,0,0.2)] transition-[left] duration-150"
                  style={{ left: on ? 16 : 2 }}
                />
              </span>
            </button>
          );
        })}
      </div>
      <div className="flex items-center justify-end gap-3">
        <span className="text-md" style={{ color: savedColor }}>
          {savedMsg}
        </span>
        <Button label="Save changes" variant="primary" onClick={() => !pending && save()} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Security
// ---------------------------------------------------------------------------
function SecurityTab({ profile }: { profile: User }) {
  const [pw, setPw] = useState({ cur: '', next: '', conf: '' });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const setField = (k: keyof typeof pw) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setPw({ ...pw, [k]: e.target.value });
    setMsg(null);
  };
  const rules: [string, boolean][] = [
    ['At least 8 characters', pw.next.length >= 8],
    ['Contains a number', /\d/.test(pw.next)],
    ['Different from current password', !!pw.next && pw.next !== pw.cur],
  ];

  function submit() {
    if (pending) return;
    let err = '';
    if (!pw.cur) err = 'Enter your current password.';
    else if (!rules.every((r) => r[1])) err = "New password doesn't meet the requirements.";
    else if (pw.next !== pw.conf) err = "Passwords don't match.";
    if (err) return setMsg({ ok: false, text: err });
    startTransition(async () => {
      const res = await changePassword({ current: pw.cur, next: pw.next, confirm: pw.conf });
      if (res.error) return setMsg({ ok: false, text: res.error });
      setPw({ cur: '', next: '', conf: '' });
      setMsg({ ok: true, text: 'Password updated.' });
    });
  }

  return (
    <div className="flex flex-col gap-3.5">
      <div className={`${card} flex max-w-[460px] flex-col gap-3.5 p-5`}>
        <div>
          <div className="text-[14px] font-semibold">Reset password</div>
          <div className="mt-0.5 text-md text-faint">
            {profile.password_changed_at
              ? `Last changed ${rel(profile.password_changed_at)}`
              : "Choose a strong password you don't use elsewhere."}
          </div>
        </div>
        <label className={label}>
          Current password
          <input
            type="password"
            value={pw.cur}
            onChange={setField('cur')}
            autoComplete="current-password"
            className={input}
          />
        </label>
        <label className={label}>
          New password
          <input
            type="password"
            value={pw.next}
            onChange={setField('next')}
            autoComplete="new-password"
            className={input}
          />
        </label>
        <div className="-mt-1 flex flex-col gap-1">
          {rules.map(([l, okRule]) => (
            <span
              key={l}
              className="flex items-center gap-[7px] text-[12px]"
              style={{ color: pw.next && okRule ? T.green.fg : 'var(--faint)' }}
            >
              <span
                className="size-1.5 rounded-full"
                style={{ background: pw.next && okRule ? T.green.dot : '#d6d4cf' }}
              />
              {l}
            </span>
          ))}
        </div>
        <label className={label}>
          Confirm new password
          <input
            type="password"
            value={pw.conf}
            onChange={setField('conf')}
            autoComplete="new-password"
            className={input}
          />
        </label>
        {msg && (
          <div
            className="rounded-md px-2.5 py-2 text-md"
            style={{ background: msg.ok ? T.green.bg : T.red.bg, color: msg.ok ? T.green.fg : T.red.fg }}
          >
            {msg.text}
          </div>
        )}
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            // No email reset exists: a teammate resets the password from Profile → Team.
            onClick={() => setMsg({ ok: true, text: 'Ask a teammate to reset your password.' })}
            className="cursor-pointer border-0 bg-transparent p-0 text-md text-muted underline underline-offset-2 hover:text-ink"
          >
            Forgot current password?
          </button>
          <Button label="Update password" variant="primary" onClick={submit} />
        </div>
      </div>
      <div className={`${card} flex max-w-[460px] items-center justify-between gap-4 p-5`}>
        <div>
          <div className="text-[14px] font-semibold">Sign out</div>
          <div className="mt-0.5 text-md text-faint">Sign out of Product Hub on this device.</div>
        </div>
        <Button label="Sign out" variant="secondary" onClick={() => startTransition(() => signOutAction())} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Team
// ---------------------------------------------------------------------------
function TeamTab({ team, counts, meId }: { team: TeamRow[]; counts: Counts; meId: string }) {
  const [email, setEmail] = useState('');
  const [roleSel, setRoleSel] = useState('Engineer');
  const [err, setErr] = useState('');
  const [resetting, setResetting] = useState<TeamRow | null>(null);
  const [pending, startTransition] = useTransition();
  const members = team.filter((u) => u.active);
  const invites = team.filter((u) => !u.active);

  function send() {
    if (pending) return;
    startTransition(async () => {
      const res = await inviteUser({ email, role: roleSel });
      if (res.error) return setErr(res.error);
      setEmail('');
      setErr('');
    });
  }

  return (
    <div className="flex flex-col gap-3.5">
      <div className={`${card} flex flex-wrap items-end gap-2.5 px-4 py-3.5`}>
        <label className={`${label} flex-[1_1_240px]`}>
          Invite by email
          <input
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setErr('');
            }}
            onKeyDown={(e) => e.key === 'Enter' && send()}
            placeholder="name@ablespace.io"
            className={input}
          />
        </label>
        <label className={`${label} flex-[0_1_180px]`}>
          Role
          <Select value={roleSel} options={ROLES} onChange={(e) => setRoleSel(e.target.value)} block />
        </label>
        <Button label="Send invite" variant="primary" onClick={send} />
        {err && <div className="basis-full text-[12px] text-tone-red-fg">{err}</div>}
      </div>
      <div className={`${card} overflow-x-auto`}>
        <div className="min-w-[720px]">
          <div
            className={`grid ${TEAM_COLS} gap-3 border-b border-border bg-surface-sunken px-4 py-[9px] text-[12px] font-medium text-faint`}
          >
            <span>Member</span>
            <span>Role</span>
            <span>Owns</span>
            <span>Owner of</span>
            <span>Watching</span>
          </div>
          {members.map((m) => {
            const c = counts[m.id] ?? { owns: 0, ownerOf: 0, watching: 0 };
            return (
              <div
                key={m.id}
                className={`grid ${TEAM_COLS} items-center gap-3 border-b border-border-subtle px-4 py-2 text-[13px]`}
              >
                <span className="flex min-w-0 items-center gap-2.5">
                  <Avatar av={memberAv(m)} size={28} />
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">
                      {m.id === meId ? `${memberName(m)} (you)` : memberName(m)}
                    </span>
                    <span className="block truncate text-[12px] text-faint">{m.email}</span>
                  </span>
                  {m.id !== meId && (
                    <Button label="Reset password" variant="ghost" size="sm" onClick={() => setResetting(m)} />
                  )}
                </span>
                <span className="text-ink-2">{m.role_title || 'Member'}</span>
                <span className="text-ink-3 tabular-nums">{c.owns} projects</span>
                <span className="text-ink-3 tabular-nums">{c.ownerOf} features</span>
                <span className="text-ink-3 tabular-nums">{c.watching}</span>
              </div>
            );
          })}
          {invites.map((iv) => (
            <div
              key={iv.id}
              className={`grid ${TEAM_COLS} items-center gap-3 border-b border-border-subtle bg-[#fcfcfb] px-4 py-2 text-[13px]`}
            >
              <span className="flex min-w-0 items-center gap-2.5">
                <span className="size-7 shrink-0 rounded-full border border-dashed border-[#cfcdc8]" />
                <span className="min-w-0">
                  <span className="block truncate font-medium">{iv.email}</span>
                  <span className="block text-[12px] text-faint">Invite pending · sent {rel(iv.created_at)}</span>
                </span>
              </span>
              <span className="text-ink-2">{iv.invite_role ?? ''}</span>
              <span />
              <span />
              <span>
                <Button
                  label="Revoke"
                  variant="ghost"
                  size="sm"
                  onClick={() => startTransition(async () => void (await revokeInvite(iv.id)))}
                />
              </span>
            </div>
          ))}
        </div>
      </div>
      {resetting && (
        <ConfirmDialog
          title={`Reset ${memberName(resetting)}'s password?`}
          message="Their current password stops working right away."
          impact={[
            {
              text: "They can't sign in until they choose a new password",
              sub: `Ask them to use “Set up your account” on the sign-in page with ${resetting.email}.`,
            },
            { text: 'Their features, projects and watchlist stay as they are' },
          ]}
          confirmLabel="Reset password"
          onCancel={() => setResetting(null)}
          onConfirm={() =>
            startTransition(async () => {
              await resetPassword(resetting.id);
              setResetting(null);
            })
          }
        />
      )}
    </div>
  );
}
