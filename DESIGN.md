---
name: Karte
description: A shared neutral-Geist and gold identity for public profiles and contextual inbound.
colors:
  background: "#0a0a0a"
  foreground: "#ededed"
  body: "#d4d4d8"
  surface: "#0c0c0b"
  card: "#121211"
  muted: "#a1a1aa"
  hint: "#8a8a93"
  border: "#272727"
  gold: "#c4a46b"
  accent-soft: "#f4ebd4"
  destructive: "#fca5a5"
typography:
  display:
    fontFamily: "Geist Variable, Geist, system-ui, sans-serif"
    fontSize: "clamp(36px, 6vw, 76px)"
    fontWeight: 600
    lineHeight: 1.02
    letterSpacing: "-0.025em"
  body:
    fontFamily: "Geist Variable, Geist, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Geist Variable, Geist, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "0.22em"
rounded:
  surface: "12px"
  panel: "24px"
  pill: "999px"
spacing:
  xs: "10px"
  sm: "16px"
  md: "24px"
  lg: "40px"
  xl: "64px"
components:
  button-primary:
    backgroundColor: "{colors.foreground}"
    textColor: "{colors.background}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "16px 28px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.foreground}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "16px 24px"
---

# Design System: Karte

## Overview

Karte's landing and Next app share neutral near-black surfaces, Geist type,
and restrained gold accents. The Astro Gallery landing derives its palette
from the app through `page.fromApp`; supporting reading pages use the same
roles. Sign-in, welcome, creation, dashboard, and unthemed public profiles use
the shared brand scope. Explicit user profile palettes remain customisable.

The system is restrained by design. Gold dots and active states orient the
reader. A single Instrument Serif italic word can soften a Geist headline.
Hairlines, bounded reading measures, and generous spacing carry hierarchy.

**Key Characteristics:**

- Flat #0A0A0A background with readable off-white and zinc text.
- Geist headings at weight 600 and -0.025em tracking.
- Instrument Serif italic accents in #F4EBD4, one word per headline.
- A faint 72px grid where atmosphere helps; no ornamental frames or sheen.
- Accessible focus, semantic reading order, and responsive stacking.

## Colors

The resolved palette above is shared with `src/app/globals.css` and the Astro
landing's `page.fromApp` settings. Default profile chrome adopts gold only
when no palette has been explicitly configured.

### Primary

- **Foreground:** #EDEDED headings and primary CTA fills.
- **Gold:** #C4A46B dots, selected states, and focus outlines.
- **Accent Soft:** #F4EBD4 italic headline emphasis.
- **Destructive:** #FCA5A5 for destructive-action text.

### Neutral

- **Background:** #0A0A0A page ground and footer.
- **Surface:** #0C0C0B for gently raised app surfaces.
- **Card / Muted:** #121211 for cards and contained entries.
- **Body:** #D4D4D8 for long-form reading and explanations.
- **Muted Foreground:** #A1A1AA for supporting copy.
- **Hint:** #8A8A93 minimum for small hints and eyebrows.
- **Border:** #272727 hairlines on the page ground.

Gold is a scarce orientation accent. Primary actions use off-white fills;
body copy and passive borders retain neutral roles.

## Typography

**Display and Body Font:** Geist, bundled on Astro and loaded by Next's font
pipeline in the app. Use system sans-serif fallbacks.

**Accent Font:** Instrument Serif italic, weight 400, reserved for a single
headline word and the established app wordmark.

**Code Font:** Geist Mono, with system monospace fallbacks.

### Hierarchy

- **Display** (600, fluid 36–76px, 1.05): Page-defining statements and titles,
  with -0.025em tracking and optional italic accent.
- **Headline** (600, fluid 20–26px, 1.15): Questions and content subheads.
- **Body** (400, 15px, 1.6): Factual explanations; keep long-form measures near
  65–75 characters.
- **Eyebrow** (500, 11px, 0.22em tracking): Short uppercase orientation text
  with a small gold dot prefix.

Geist carries hierarchy, action, and explanation. Italic serif emphasis is
limited so it remains recognisable. Monospace belongs to code and machine paths.

## Layout

Public reading pages use a full-width neutral ground with fluid side padding and a
centered content column. The established FAQ column tops out at 880px; prose
inside that frame stays narrower when needed for comfortable reading. Major
sections separate through generous vertical space and neutral
hairlines rather than repeated card shells.

At 768px and below, multi-column reading structures stack into one column with
tighter type and spacing. At 640px and below, footer columns also collapse.
Controls keep useful touch targets and content must never force horizontal page
overflow; wide comparisons may use an explicitly labelled local overflow
region with keyboard access.

## Elevation & Depth

The reading world is flat by default. Neutral surface shifts and hairline
separators establish grouping. The landing grid is faint and the app may use
one low-opacity gold blur behind sign-in. Avoid radial page-ground gradients,
gradient text, inset foil, corner marks, and ambient action shadows.

Articles and references gain hierarchy from type, space, and separators.

## Shapes

Inputs and compact chips use 12px corners. Large app panels use 24px corners.
Primary and secondary actions are pills. Gold orientation marks are small
round dots. Content pages keep their existing reading structure and reflow.

## Components

### Buttons

- **Shape:** Compact pill with clear internal space.
- **Primary:** Off-white #EDEDED fill with #0A0A0A label; reserve for the single
  most important action in a reading context.
- **Hover / Focus:** Shift the neutral fill on hover and expose an obvious
  gold focus-visible outline with separation from the dark ground.
- **Ghost:** Transparent neutral surface with a #272727 border and
  off-white label; use for secondary navigation only.

### Cards / Containers

- **Corner Style:** 12px for compact containers, 24px for larger panels.
- **Background:** Use neutral surface and card roles.
- **Shadow Strategy:** Flat at rest; dividers and surface tone carry grouping.
- **Border:** One #272727 hairline; avoid border plus shadow on passive surfaces.
- **Internal Padding:** Fluid 20–44px depending on density and viewport.

### Navigation

The minimal public header pairs the gold dot and Geist wordmark with a
short uppercase back link. Contextual discovery lives in prose and the quiet
footer; primary navigation labels do not change for one content page.

### Reading Lists

Use semantic ordered or unordered structures with hairline separators. On wide
screens, a question or label may sit beside its answer; on small screens the
pair stacks while preserving DOM and reading order.

## Do's and Don'ts

### Do:

- **Do** keep long-form copy on bounded measures with strong semantic headings.
- **Do** make one action visually primary and keep source or FAQ links quieter.
- **Do** use the gold dots, italic accents, and hairlines sparingly as signatures.
- **Do** preserve keyboard-visible focus, contrast, responsive stacking, and
  reduced-motion behavior.

### Don't:

- **Don't** turn content sections into a wall of equal rounded cards.
- **Don't** use gold as paragraph text or decorative glow across the page.
- **Don't** introduce a new visual identity, gradient text, generic glass, or
  technical monospace styling for ordinary prose.
- **Don't** change the Karte wordmark, primary navigation labels, analytics
  identifiers, legal copy, or route behavior while extending this system.
