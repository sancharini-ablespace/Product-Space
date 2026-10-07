"use client";

// App shell from design/PM Dashboard v3.dc.html: 216px sidebar, scrollable main,
// and below 900px an off-canvas sidebar opened from a sticky top bar.
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Avatar } from "@/components/hub/Avatar";
import type { Av } from "@/lib/hub";

export type NavCounts = Partial<Record<"projects" | "features" | "pocs" | "research" | "watchlist", number>>;

const NAV = [
  { id: "dashboard", label: "Dashboard", href: "/" },
  { id: "projects", label: "Projects", href: "/projects" },
  { id: "features", label: "Features", href: "/features" },
  { id: "pocs", label: "POCs", href: "/pocs" },
  { id: "research", label: "Research", href: "/research" },
  { id: "watchlist", label: "Watchlist", href: "/watchlist" },
] as const;

function Mark() {
  return (
    <div className="flex size-[22px] items-center justify-center rounded-md bg-ink text-[11px] font-semibold text-on-primary">
      P
    </div>
  );
}

export function AppShell({
  me,
  counts,
  children,
}: {
  me: { name: string; role: string; av: Av };
  counts: NavCounts;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [navOpen, setNavOpen] = useState(false);

  // Close the drawer on navigation, and when the window grows past the breakpoint.
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setNavOpen(false);
  }
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 900px)");
    const onChange = () => mq.matches && setNavOpen(false);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
  const profileActive = isActive("/profile");

  return (
    <div className="flex min-h-screen">
      {navOpen && <div onClick={() => setNavOpen(false)} className="fixed inset-0 z-[54] bg-scrim" />}
      <aside
        className={`sticky top-0 left-0 z-[55] flex h-screen w-[216px] shrink-0 flex-col gap-0.5 border-r border-border bg-surface-sunken px-2.5 py-3.5 transition-transform duration-200 ease-in-out max-[899px]:fixed ${
          navOpen
            ? "max-[899px]:translate-x-0 max-[899px]:shadow-[0_12px_32px_rgba(0,0,0,.18)]"
            : "max-[899px]:-translate-x-full"
        }`}
      >
        <div className="flex items-center gap-[9px] px-2 pt-1 pb-4">
          <Mark />
          <div className="text-[14px] font-semibold tracking-[-0.01em]">Product Hub</div>
        </div>
        {NAV.map((n) => {
          const act = isActive(n.href);
          const count = n.id === "dashboard" ? undefined : counts[n.id];
          return (
            <Link
              key={n.id}
              href={n.href}
              className={`flex h-8 w-full items-center justify-between rounded-md px-2.5 text-left text-[13.5px] no-underline hover:bg-hover hover:text-ink ${
                act ? "bg-selected font-semibold text-ink" : "bg-transparent font-medium text-ink-3"
              }`}
            >
              <span>{n.label}</span>
              <span className="text-[12px] text-fainter tabular-nums">{count ?? ""}</span>
            </Link>
          );
        })}
        <div className="flex-1" />
        <div className="mt-2 border-t border-border pt-2">
          <Link
            href="/profile"
            title="Profile & settings"
            className={`flex w-full items-center gap-[9px] rounded-md px-2 py-1.5 text-left no-underline hover:bg-hover ${
              profileActive ? "bg-selected" : "bg-transparent"
            }`}
          >
            <Avatar av={me.av} size={26} />
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-medium text-ink">{me.name}</span>
              <span className="block truncate text-[11.5px] text-faint">{me.role}</span>
            </span>
          </Link>
        </div>
      </aside>

      <main className="h-screen min-w-0 flex-1 overflow-auto">
        <div className="sticky top-0 z-20 hidden h-12 items-center gap-2.5 border-b border-border bg-surface-sunken px-3 max-[899px]:flex">
          <button
            type="button"
            onClick={() => setNavOpen(true)}
            title="Menu"
            className="flex size-9 cursor-pointer flex-col items-center justify-center gap-1 rounded-md border-0 bg-transparent hover:bg-hover"
          >
            <span className="h-[1.5px] w-4 bg-ink" />
            <span className="h-[1.5px] w-4 bg-ink" />
            <span className="h-[1.5px] w-4 bg-ink" />
          </button>
          <Mark />
          <div className="flex-1 text-[14px] font-semibold tracking-[-0.01em]">Product Hub</div>
          <Link href="/profile" title="Profile & settings" className="flex rounded-full p-1">
            <Avatar av={me.av} size={26} />
          </Link>
        </div>
        {children}
      </main>
    </div>
  );
}
