"use client";

import { useState } from "react";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";

const FLOAT_DURATION = 7.5;

// Physical resting orientation — a document tilted in space, not a flat sticker.
const PERSPECTIVE = 1800;
const ROTATE_Z = -17;
const ROTATE_X = 10;
const ROTATE_Y = -6;

export function FloatingCard({ stage }: { stage: number }) {
  const reduceMotion = useReducedMotion();
  const [settled, setSettled] = useState(false);

  const entranceVisible = stage >= 1;
  const floating = settled && !reduceMotion;

  return (
    <div className="relative mx-auto flex w-full max-w-[380px] items-center justify-center lg:mx-0 lg:max-w-[820px] lg:justify-end">
      {/* layered ambient shadow — several soft, low-opacity blurs rather than one hard blob */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-[60%] h-20 w-[55%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground/25 blur-[50px]" />
        <div className="absolute left-1/2 top-[60%] h-32 w-[75%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground/15 blur-[90px]" />
        <div className="absolute left-1/2 top-[60%] h-48 w-[95%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground/[0.08] blur-[130px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.92, rotateZ: ROTATE_Z + 8, y: 30 }}
        animate={
          entranceVisible
            ? { opacity: 1, scale: 1, rotateZ: ROTATE_Z, y: 0 }
            : { opacity: 0, scale: 0.92, rotateZ: ROTATE_Z + 8, y: 30 }
        }
        transition={
          reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 260, damping: 24 }
        }
        onAnimationComplete={() => {
          if (entranceVisible && !reduceMotion) setSettled(true);
        }}
        style={{
          transformPerspective: PERSPECTIVE,
          rotateX: ROTATE_X,
          rotateY: ROTATE_Y,
        }}
        className="relative w-full"
      >
        <motion.div
          animate={
            floating
              ? { y: [-10, 8, -10], rotateZ: [-1, 1.5, -1] }
              : { y: 0, rotateZ: 0 }
          }
          transition={
            floating ? { duration: FLOAT_DURATION, repeat: Infinity, ease: "easeInOut" } : undefined
          }
        >
          <Image
            src="/herosectionCard-flat.png"
            alt="Kreda verified receivable certificate: Glow Beauty on Shopify, $52,840 receivable, $42,100 advance available, risk grade A, 98.2% AI confidence, status verified"
            width={1053}
            height={827}
            priority
            className="h-auto w-full select-none"
          />
        </motion.div>
      </motion.div>
    </div>
  );
}
