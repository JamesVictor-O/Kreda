# Brand — Kreda

_Status: set from an inline design brief (2026-08-07), not the `brand-design` flow._

The user supplied a detailed hero-section brief directly in conversation — palette
direction, typography intent, and a reference screenshot — rather than running the
interactive `brand-design` picker. Colors below were sampled from the shipped hero
asset (`public/herosectionCard.png`) to keep the UI and the artwork visually coherent.

## Palette

| Token | Value | Use |
|---|---|---|
| `--background` | `#FAF7F2` | Warm off-white, paper-like. Page background. |
| `--foreground` | `#17140F` | Warm near-black. Body text, headings. |
| `--muted-foreground` | `#6B6558` | Warm gray. Secondary text. 5.4:1 on background. |
| `--primary` | `#123526` | Deep forest green, sampled from the receivable card wordmark. |
| `--primary-foreground` | `#FAF7F2` | Text/icons on `--primary`. |
| `--border` | `#E7E1D4` | Hairline dividers, barely visible by design. |

All pairings checked against WCAG AA (see `frontend-design-guidelines` skill).

## Typography

Geist Sans (already loaded via `next/font` in `app/layout.tsx`) for UI and display type.
Geist Mono for anything tabular. No additional fonts installed.

## Voice

Sentence case, no marketing language, no "seamless" / "unlock" / "leverage" /
"revolutionary" — per the root `CLAUDE.md`. Copy states what the product does.

## Scope note

This is a light-only palette. The marketing homepage intentionally does not follow
`prefers-color-scheme: dark` — most Stripe/Linear/Mercury-style marketing pages
lock to a single designed theme rather than auto-inverting. If Kreda later needs a
dark variant (app screens, dashboards), treat that as a separate token set rather
than inverting these values.

To run the full interactive brand picker instead, say **"pick brand colors"** or
run `/brand-design` — it will detect this file and offer to replace it.
