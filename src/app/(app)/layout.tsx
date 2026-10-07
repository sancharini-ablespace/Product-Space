import { Suspense } from "react";
import { AppShell } from "@/components/app-shell";
import { CreateDrawerHost } from "@/components/create-drawer";
import { FeatureDrawerHost } from "@/components/feature/feature-drawer";
import { PocDrawerHost } from "@/components/poc/poc-drawer";
import { ResearchDrawerHost } from "@/components/research/research-drawer";
import { SearchOverlay } from "@/components/search-overlay";
import { av } from "@/lib/hub";
import { getNavCounts } from "@/lib/queries";
import { requireProfile, requireUserWith } from "@/lib/session";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const [user, counts] = await requireUserWith((uid) => getNavCounts(uid));
  const profile = await requireProfile();
  const name = user.name ?? user.email;
  // The prototype falls back to "Member" when a person has no role title.
  return (
    <AppShell me={{ name, role: profile?.role_title || "Member", av: av(name) }} counts={counts}>
      {children}
      {/* Drawers open on any page: ?feature=, ?poc=, ?research=, and ?new=project|version|feature|poc[&parent=]; ⌘K opens search. */}
      <Suspense>
        <FeatureDrawerHost me={{ id: user.id, name, av: av(name) }} />
        <PocDrawerHost />
        <ResearchDrawerHost me={{ id: user.id, name, av: av(name) }} />
        <CreateDrawerHost meId={user.id} />
      </Suspense>
      <SearchOverlay />
    </AppShell>
  );
}
