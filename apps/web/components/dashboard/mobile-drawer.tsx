"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { IconClose } from "@/components/ui/icons";
import { SidebarContent } from "@/components/dashboard/sidebar-content";
import type { DashboardRole } from "@/lib/dashboard/role-config";

export function MobileDrawer({
  role,
  open,
  onClose,
  triggerRef,
}: {
  role: DashboardRole;
  open: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
}) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    const trigger = triggerRef.current;
    closeButtonRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
      trigger?.focus();
    };
  }, [open, onClose, triggerRef]);

  // `open` starts false on both server and first client render, so we never
  // touch `document.body` before the browser environment actually exists —
  // no separate mount-detection state needed.
  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 lg:hidden">
      <div
        aria-hidden="true"
        onClick={onClose}
        className="absolute inset-0 bg-foreground/30 backdrop-blur-[2px]"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Navigation"
        className="absolute inset-y-0 left-0 w-[280px] max-w-[85vw] border-r border-border bg-surface shadow-xl"
      >
        <div className="flex justify-end p-3">
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-foreground transition-colors duration-150 hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            aria-label="Close navigation menu"
          >
            <IconClose className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <div className="h-[calc(100%-3.75rem)]">
          <SidebarContent role={role} onNavigate={onClose} />
        </div>
      </div>
    </div>,
    document.body,
  );
}
