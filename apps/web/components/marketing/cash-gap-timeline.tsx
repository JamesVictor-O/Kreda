"use client";

import type { CSSProperties } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/cn";

interface TimelineEvent {
  day: number;
  description: string;
  amount: number;
  kind: "negative" | "zero" | "positive";
  note?: string;
}

const TOTAL_DAYS = 44;

const EVENTS: TimelineEvent[] = [
  { day: 0, description: "Pay your supplier", amount: -50_000, kind: "negative" },
  { day: 7, description: "Inventory ships", amount: -2_000, kind: "negative" },
  {
    day: 30,
    description: "Product sells",
    amount: 0,
    kind: "zero",
    note: "Revenue booked, not received",
  },
  { day: 37, description: "Marketplace holds payout", amount: 0, kind: "zero" },
  { day: 44, description: "Payout arrives", amount: 50_000, kind: "positive" },
];

const KREDA_AMOUNT = 39_200;

const AMOUNT_CLASS: Record<TimelineEvent["kind"], string> = {
  negative: "text-danger",
  zero: "text-muted-foreground",
  positive: "text-foreground",
};

function formatAmount(amount: number): string {
  if (amount === 0) return "$0";
  const abs = Math.abs(amount).toLocaleString("en-US");
  return amount > 0 ? `+$${abs}` : `−$${abs}`;
}

function formatPlainAmount(amount: number): string {
  return `$${amount.toLocaleString("en-US")}`;
}

function pctOf(day: number): CSSProperties {
  return { "--pos": `${(day / TOTAL_DAYS) * 100}%` } as CSSProperties;
}

/** The dot marker always sits exactly on the day's position — on both axes,
 *  since the same percentage drives `top` on mobile and `left` on desktop.
 *  The text block beneath it can't always be centered on that same point on
 *  desktop — centering the day-0 or day-44 block would push half of it past
 *  the line's own edge — so the first/last blocks anchor by their outer
 *  edge there instead. Mobile never has this problem since every block runs
 *  full-width beneath its dot. */
function textBlockPosition(index: number, count: number): string {
  if (index === 0) return "lg:left-0";
  if (index === count - 1) return "lg:right-0";
  return "lg:left-1/2 lg:-translate-x-1/2";
}

export function CashGapTimeline() {
  const reduceMotion = useReducedMotion();

  return (
    <section aria-labelledby="cash-gap-heading" className="relative bg-background py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="max-w-2xl">
          <h2
            id="cash-gap-heading"
            className="text-3xl font-semibold leading-tight tracking-tight text-foreground sm:text-4xl"
          >
            You made the sale. The cash won&rsquo;t arrive for six weeks.
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
            For a growing seller, the working capital this gap demands runs 20&ndash;30% of
            annual revenue.
          </p>
        </div>

        {/* Shared coordinate space: the Kreda marker and the timeline list
            both position against this one container so their percentages
            line up. */}
        <div className="relative mt-16 lg:mt-24 lg:h-72">
          {/* Kreda intervention marker — offset above the row, reads as an
              alternative path rather than another step on the timeline. */}
          <motion.p
            initial={reduceMotion ? undefined : { opacity: 0, y: 8 }}
            whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1], delay: reduceMotion ? 0 : 0.65 }}
            className="relative z-10 mb-10 inline-flex items-baseline gap-2 rounded-full border border-primary/25 bg-primary/[0.06] py-2 pl-4 pr-5 text-sm lg:absolute lg:left-[var(--pos)] lg:top-0 lg:mb-0"
            style={pctOf(0)}
          >
            <span className="font-medium text-primary">With Kreda</span>
            <span className="font-mono tabular-nums font-semibold text-primary">
              {formatPlainAmount(KREDA_AMOUNT)}
            </span>
            <span className="text-primary/70">on day 0</span>
          </motion.p>

          {/* Timeline — proportional to the day count on both axes, so the
              day 7 → day 44 gap stays the dominant span at every width. */}
          <ol className="relative h-[880px] pt-1 lg:absolute lg:inset-x-0 lg:top-[104px] lg:h-auto lg:pt-0">
            <div
              aria-hidden="true"
              className="absolute left-[5px] top-0 bottom-0 w-px bg-border lg:left-0 lg:right-0 lg:top-0 lg:bottom-auto lg:h-px lg:w-auto"
            />

            {EVENTS.map((event, index) => (
              <motion.li
                key={event.day}
                initial={reduceMotion ? undefined : { opacity: 0, y: 10 }}
                whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0 }}
                transition={{
                  duration: 0.4,
                  ease: [0.16, 1, 0.3, 1],
                  delay: reduceMotion ? 0 : index * 0.09,
                }}
                className="absolute left-0 right-0 top-[var(--pos)] pl-6 lg:left-[var(--pos)] lg:right-auto lg:top-0 lg:pl-0"
                style={pctOf(event.day)}
              >
                <span
                  aria-hidden="true"
                  className="absolute left-[5px] top-1.5 h-2.5 w-2.5 -translate-x-1/2 rounded-full border-2 border-background bg-foreground/60 lg:left-0 lg:top-0 lg:-translate-y-1/2"
                />
                <div
                  className={cn(
                    "lg:absolute lg:top-4 lg:w-32",
                    textBlockPosition(index, EVENTS.length),
                  )}
                >
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Day {event.day}
                  </p>
                  <p className="mt-1 text-sm text-foreground">{event.description}</p>
                  <p
                    className={cn(
                      "mt-1.5 font-mono text-lg font-semibold tabular-nums",
                      AMOUNT_CLASS[event.kind],
                    )}
                  >
                    {formatAmount(event.amount)}
                    <span className="sr-only">
                      {event.amount < 0 ? " (loss)" : event.amount > 0 ? " (received)" : " (pending)"}
                    </span>
                  </p>
                  {event.note && (
                    <p className="mt-1 text-xs leading-snug text-muted-foreground">{event.note}</p>
                  )}
                </div>
              </motion.li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
