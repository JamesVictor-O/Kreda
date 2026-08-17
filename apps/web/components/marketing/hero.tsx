"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ButtonLink } from "@/components/ui/button";
import { ArrowUpRight } from "@/components/ui/icons";
import { BackgroundWordmark } from "@/components/marketing/background-wordmark";
import { FloatingCard } from "@/components/marketing/floating-card";

/* ─────────────────────────────────────────────────────────
 * HERO ENTRANCE STORYBOARD
 *
 *    0ms   header fades in (components/marketing/header.tsx, non-blocking)
 *  200ms   floating receivable card fades in, scales up, settles to its tilt
 *  120ms   headline fades in + slides up
 *  260ms   paragraph fades in + slides up
 *  380ms   CTA row fades in + slides up
 * (settle) card begins a slow, continuous float loop (7.5s, easeInOut)
 * (scroll) background wordmark drifts up ~40px — very subtle parallax
 * ───────────────────────────────────────────────────────── */

const TIMING = {
  card: 200,
  headline: 120,
  paragraph: 260,
  ctas: 380,
} as const;

const RISE_SPRING = { type: "spring" as const, stiffness: 350, damping: 28 };
const RISE_OFFSET = 16;

export function Hero() {
  const [stage, setStage] = useState(0);
  const reduceMotion = useReducedMotion();
  const riseTransition = reduceMotion ? { duration: 0 } : RISE_SPRING;
  const riseOffset = reduceMotion ? 0 : RISE_OFFSET;

  useEffect(() => {
    const delay = (ms: number) => (reduceMotion ? 0 : ms);

    const timers = [
      setTimeout(() => setStage((s) => Math.max(s, 1)), delay(TIMING.card)),
      setTimeout(() => setStage((s) => Math.max(s, 2)), delay(TIMING.headline)),
      setTimeout(() => setStage((s) => Math.max(s, 3)), delay(TIMING.paragraph)),
      setTimeout(() => setStage((s) => Math.max(s, 4)), delay(TIMING.ctas)),
    ];

    return () => timers.forEach(clearTimeout);
  }, [reduceMotion]);

  return (
    <section className="relative min-h-[100svh] overflow-hidden bg-background py-28 lg:flex lg:items-center lg:py-24">
      <BackgroundWordmark />

      <div className="relative z-10 mx-auto w-full max-w-7xl px-6 lg:px-8">
        <div className="max-w-xl">
          <motion.h1
            initial={{ opacity: 0, y: riseOffset }}
            animate={stage >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: riseOffset }}
            transition={riseTransition}
            className="text-4xl font-semibold leading-[1.1] tracking-tight text-foreground sm:text-5xl lg:text-[3.4rem]"
          >
            Turn tomorrow&rsquo;s revenue into today&rsquo;s working capital.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: riseOffset }}
            animate={stage >= 3 ? { opacity: 1, y: 0 } : { opacity: 0, y: riseOffset }}
            transition={riseTransition}
            className="mt-7 max-w-md text-lg leading-relaxed text-muted-foreground"
          >
            Kreda helps e-commerce sellers unlock cash trapped in marketplace payouts.
            An AI underwriter verifies the receivable, investors provide the liquidity,
            and everything settles transparently on BOT Chain.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: riseOffset }}
            animate={stage >= 4 ? { opacity: 1, y: 0 } : { opacity: 0, y: riseOffset }}
            transition={riseTransition}
            className="mt-12 flex flex-wrap items-center gap-x-8 gap-y-4"
          >
            <ButtonLink href="/seller">
              Get started
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </ButtonLink>
            <ButtonLink href="/investor" variant="ghost">
              I&rsquo;m an investor
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </ButtonLink>
          </motion.div>
        </div>
      </div>

      {/* Card sits in normal flow on mobile (contained, centered); on lg+ it
          breaks out of the content column entirely, pinned to the right and
          allowed to overflow past the viewport edge like the reference. */}
      <div className="relative z-10 mt-16 flex justify-center px-6 lg:absolute lg:inset-y-0 lg:right-0 lg:mt-0 lg:w-[42%] lg:items-center lg:justify-end lg:px-0 lg:pr-10 xl:w-[38%] xl:pr-16">
        <div className="w-full">
          <FloatingCard stage={stage} />
        </div>
      </div>
    </section>
  );
}
