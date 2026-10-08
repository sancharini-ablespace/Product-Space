'use client';

// Owners / watchers / POCs picker for one feature (prototype pk with a feature target),
// built on the shared Stage 5 PeoplePicker.
import { useTransition } from 'react';
import { PeoplePicker, type Anchor, type PickerItem } from '@/components/popovers';
import { createPoc, setFeatureLink } from '@/lib/actions';
import { memberAv, memberName, pocAv } from '@/lib/hub';
import type { FeatureRow } from '@/lib/queries';
import type { Member, Poc } from '@/lib/types';

export type FeatureLinkKind = 'owners' | 'watchers' | 'pocs';
export type TeamMember = Member & { role_title: string | null };
export type PocOption = Pick<Poc, 'id' | 'name' | 'org' | 'role'>;

const TITLES: Record<FeatureLinkKind, string> = { owners: 'Owners', watchers: 'Watchers', pocs: 'POCs · requested by' };

export function memberItems(members: TeamMember[], meId: string): PickerItem[] {
  return members.map((m) => ({
    id: m.id,
    name: m.id === meId ? `${memberName(m)} (you)` : memberName(m),
    sub: m.role_title || 'Member',
    av: memberAv(m),
  }));
}

export function pocItems(pocs: PocOption[]): PickerItem[] {
  return pocs.map((c) => ({
    id: c.id,
    name: c.name,
    sub: [c.org, c.role].filter(Boolean).join(' · '),
    av: pocAv(c),
    square: true,
  }));
}

export function FeaturePicker({
  feature,
  kind,
  anchor,
  members,
  pocOptions,
  meId,
  onLocal,
  onClose,
}: {
  feature: FeatureRow;
  kind: FeatureLinkKind;
  anchor: Anchor;
  members: TeamMember[];
  pocOptions: PocOption[];
  meId: string;
  /** Applies the change locally before the server confirms it (optimistic). */
  onLocal: (patch: Partial<FeatureRow>) => void;
  onClose: () => void;
}) {
  const [, startTransition] = useTransition();
  const isPoc = kind === 'pocs';
  const list: (Member | Poc)[] = feature[kind];

  return (
    <PeoplePicker
      anchor={anchor}
      title={TITLES[kind]}
      placeholder={isPoc ? 'Search or add a customer…' : 'Search team…'}
      items={isPoc ? pocItems(pocOptions) : memberItems(members, meId)}
      selected={list.map((x) => x.id)}
      onToggle={(id, on) => {
        const item = isPoc
          ? ({ ...pocOptions.find((x) => x.id === id), email: null } as Poc)
          : (members.find((x) => x.id === id) as Member);
        const next = on ? [...list, item] : list.filter((x) => x.id !== id);
        startTransition(async () => {
          onLocal({ [kind]: next } as Partial<FeatureRow>);
          await setFeatureLink(feature.id, kind, id, on);
        });
      }}
      onAddNew={
        isPoc
          ? (name) =>
              startTransition(async () => {
                const res = await createPoc({ name });
                if (res.id) {
                  onLocal({ pocs: [...feature.pocs, { id: res.id, name, org: null, role: null } as Poc] });
                  await setFeatureLink(feature.id, 'pocs', res.id, true);
                }
              })
          : undefined
      }
      onClose={onClose}
    />
  );
}
