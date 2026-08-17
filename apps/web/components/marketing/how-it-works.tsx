"use client";

import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/cn";

interface Step {
  number: string;
  title: string;
  body: string;
}

const STEPS: Step[] = [
  {
    number: "01",
    title: "Connect your store",
    body: "Sign in with Shopify. Read-only access to orders, fulfilment, and payouts — no contracts, no paperwork, nothing to install.",
  },
  {
    number: "02",
    title: "The agent underwrites",
    body: "It reads 90 days of history, checks fulfilment against every order, and returns a grade and an advance rate in under a minute. Its reasoning is published, not hidden.",
  },
  {
    number: "03",
    title: "Get funded",
    body: "Investors fill the vault and stablecoin lands in your wallet. You sign once — gas is sponsored, so you never need to hold a token.",
  },
];

export function HowItWorks() {
  const reduceMotion = useReducedMotion();

  return (
    <section aria-labelledby="how-it-works-heading" className="relative bg-background py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="max-w-2xl">
          <h2
            id="how-it-works-heading"
            className="text-3xl font-semibold leading-tight tracking-tight text-foreground sm:text-4xl"
          >
            Three steps from store to stablecoin.
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
            No paperwork, no manual review, no waiting on a human underwriter.
          </p>
        </div>

        <ol className="mt-16 border-t border-border lg:mt-24 lg:grid lg:grid-cols-3">
          {STEPS.map((step, index) => (
            <motion.li
              key={step.number}
              initial={reduceMotion ? undefined : { opacity: 0, y: 12 }}
              whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0 }}
              transition={{
                duration: 0.4,
                ease: [0.16, 1, 0.3, 1],
                delay: reduceMotion ? 0 : index * 0.1,
              }}
              className={cn(
                "pt-8 lg:pt-10",
                index > 0 && "mt-12 lg:mt-0 lg:border-l lg:border-border lg:pl-12",
                index < STEPS.length - 1 && "lg:pr-12",
              )}
            >
              <p className="font-mono text-5xl font-semibold text-primary lg:text-6xl">
                {step.number}
              </p>
              <h3 className="mt-5 text-xl font-semibold text-foreground">{step.title}</h3>
              <p className="mt-3 max-w-sm text-base leading-relaxed text-muted-foreground">
                {step.body}
              </p>
            </motion.li>
          ))}
        </ol>
      </div>
    </section>
  );
}
