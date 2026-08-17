"use client";

import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";

export function BackgroundWordmark() {
  const ref = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], [0, reduceMotion ? 0 : -40]);

  return (
    <div ref={ref} aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      <motion.span
        style={{ y, fontSize: "clamp(11rem, 32vw, 34rem)" }}
        className="absolute left-[58%] top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap font-semibold tracking-tight text-foreground/[0.035] select-none"
      >
        CAPITAL
      </motion.span>
    </div>
  );
}
