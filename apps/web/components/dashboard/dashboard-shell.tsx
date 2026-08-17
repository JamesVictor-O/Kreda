"use client";

import { useRef, useState } from "react";
import { SidebarContent } from "@/components/dashboard/sidebar-content";
import { MobileDrawer } from "@/components/dashboard/mobile-drawer";
import { Topbar } from "@/components/dashboard/topbar";
import type { DashboardRole } from "@/lib/dashboard/role-config";

export function DashboardShell({
  role,
  children,
}: {
  role: DashboardRole;
  children: React.ReactNode;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const menuTriggerRef = useRef<HTMLButtonElement>(null);

  return (
    <div className="min-h-screen bg-background p-3 lg:flex lg:gap-3 lg:p-4">
      <aside className="hidden lg:sticky lg:top-4 lg:block lg:h-[calc(100vh-2rem)] lg:w-[250px] lg:shrink-0">
        <div className="h-full rounded-2xl border border-border bg-surface">
          <SidebarContent role={role} />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="pb-4 lg:pb-6">
          <Topbar role={role} onMenuClick={() => setDrawerOpen(true)} menuButtonRef={menuTriggerRef} />
        </div>

        <main className="flex-1 pb-8 lg:pb-0">{children}</main>
      </div>

      <MobileDrawer
        role={role}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        triggerRef={menuTriggerRef}
      />
    </div>
  );
}
