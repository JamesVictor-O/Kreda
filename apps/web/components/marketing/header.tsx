"use client";

import Link from "next/link";
import { useState } from "react";
import { useAccount } from "wagmi";
import { motion, useMotionValueEvent, useReducedMotion, useScroll } from "framer-motion";
import { ButtonLink } from "@/components/ui/button";
import { ArrowUpRight } from "@/components/ui/icons";
import { ConnectButton } from "@/components/wallet/connect-button";
import { cn } from "@/lib/cn";

const NAV_LINKS = [
  { label: "Sellers", href: "/seller" },
  { label: "Investors", href: "/investor" },
  { label: "Evidence", href: "/evidence" },
];

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const { scrollY } = useScroll();
  const reduceMotion = useReducedMotion();
  const { isConnected } = useAccount();

  useMotionValueEvent(scrollY, "change", (latest) => {
    setScrolled(latest > 8);
  });

  return (
    <motion.header
      initial={{ opacity: 0, y: reduceMotion ? 0 : -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reduceMotion ? { duration: 0 } : { duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "fixed inset-x-0 top-0 z-50 border-b transition-colors duration-200",
        scrolled
          ? "border-border bg-background/80 backdrop-blur-md"
          : "border-transparent bg-transparent",
      )}
    >
      <div className="mx-auto grid h-20 max-w-7xl grid-cols-2 items-center px-6 lg:grid-cols-[1fr_auto_1fr] lg:px-8">
        <Link
          href="/"
          className="flex items-center gap-2 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground">
            K
          </span>
          <span className="text-lg font-semibold tracking-tight text-foreground">Kreda</span>
        </Link>

        <nav aria-label="Primary" className="hidden justify-center gap-8 lg:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-sm text-sm text-muted-foreground transition-colors duration-150 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center justify-end gap-3">
          {isConnected ? (
            <ButtonLink href="/seller">
              Get started
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </ButtonLink>
          ) : (
            <ConnectButton />
          )}
        </div>
      </div>
    </motion.header>
  );
}
