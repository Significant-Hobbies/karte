---
name: Karte
description: An Onyx reading room for public profiles and contextual inbound.
colors:
  onyx: "#0a0805"
  onyx-deep: "#050403"
  onyx-surface: "#100d09"
  parchment: "#e8dfca"
  parchment-bright: "#f4ebd4"
  parchment-muted: "#b8ad96"
  gold-foil: "#c4a46b"
  gold-soft: "#d7b97e"
  gold-shadow: "#b8924f"
typography:
  display:
    fontFamily: "Playfair Display Variable, Playfair Display, Georgia, serif"
    fontSize: "clamp(36px, 6vw, 76px)"
    fontWeight: 500
    lineHeight: 1.02
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Inter Variable, Inter, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Inter Variable, Inter, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "0.18em"
rounded:
  foil: "4px"
  surface: "5px"
  pill: "999px"
spacing:
  xs: "10px"
  sm: "16px"
  md: "24px"
  lg: "40px"
  xl: "64px"
components:
  button-primary:
    backgroundColor: "{colors.gold-foil}"
    textColor: "{colors.onyx}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "16px 28px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.parchment}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "16px 24px"
---

# Design System: Karte

## Overview

**Creative North Star: "The Onyx Reading Room"**

Karte's public world feels like a dark, quiet reading room finished with gold
foil: focused, warm, and deliberate rather than glossy or loud. Parchment text
sits on near-black Onyx surfaces; Playfair gives public stories editorial
weight while Inter keeps actions and explanatory copy direct. Content pages
extend the landing deck's material language without inheriting its scroll-snap
staging.

The system is restrained by design. Gold identifies the path forward and the
small pieces of metadata that orient a reader. Hairline and dotted separators
provide structure; large boxed cards are not the default container for prose.

**Key Characteristics:**

- Near-black layered surfaces with parchment text and one gold-foil accent.
- Editorial Playfair headings paired with workhorse Inter body copy.
- Generous vertical rhythm, bounded reading measures, and thin separators.
- Small diamond marks and restrained italics as recurring signatures.
- Accessible focus, semantic reading order, and responsive stacking.

## Colors

Onyx provides depth, parchment preserves long-form readability, and gold is a
scarce navigational accent rather than decoration.

### Primary

- **Gold Foil:** Marks primary actions, diamonds, emphasized words, and compact
  orientation labels.
- **Soft Gold:** Supports linked text where the primary foil needs a quieter
  reading treatment.
- **Gold Shadow:** Grounds the lower edge of the tactile primary-button finish.

### Neutral

- **Onyx:** The principal page ground and footer surface.
- **Deep Onyx:** The darkest radial-gradient edge and atmospheric depth.
- **Onyx Surface:** A slightly lifted neutral for contained entries.
- **Parchment:** Primary long-form text and quiet navigation.
- **Bright Parchment:** Display headings and highest-emphasis reading text.
- **Muted Parchment:** Supporting explanations and secondary detail.

**The Scarce Foil Rule.** Gold identifies priority and orientation; it does not
coat every heading, border, or body link.

## Typography

**Display Font:** Playfair Display Variable (with Georgia and serif fallbacks)

**Body Font:** Inter Variable (with system sans-serif fallbacks)

**Character:** Playfair gives the public surface the cadence of a considered
profile or folio. Inter keeps controls, labels, explanations, and dense factual
copy crisp.

### Hierarchy

- **Display** (500, fluid 36–76px, 1.02): Page-defining statements and section
  titles, with restrained italic gold emphasis.
- **Headline** (500, fluid 20–26px, 1.15): Questions and content subheads.
- **Body** (400, 15px, 1.6): Factual explanations; keep long-form measures near
  65–75 characters.
- **Label** (500, 11px, 0.18em tracking): Short uppercase navigation and compact
  orientation copy, never paragraph text.

**The Two-Voice Rule.** Playfair carries story and hierarchy; Inter carries
action and explanation. Monospace is reserved for literal code or machine
paths.

## Layout

Public reading pages use a full-width Onyx ground with fluid side padding and a
centered content column. The established FAQ column tops out at 880px; prose
inside that frame stays narrower when needed for comfortable reading. Major
sections separate through generous vertical space and dotted or low-contrast
hairlines rather than repeated card shells.

At 768px and below, multi-column reading structures stack into one column with
tighter type and spacing. At 640px and below, footer columns also collapse.
Controls keep useful touch targets and content must never force horizontal page
overflow; wide comparisons may use an explicitly labelled local overflow
region with keyboard access.

## Elevation & Depth

The reading world is flat by default. Tonal layering, radial surface gradients,
inset foil, and hairline separators establish depth. Wide ambient shadows are
reserved for tactile primary actions; prose containers do not float above the
page.

**The Flat Reading Rule.** Articles and references gain hierarchy from type,
space, and separators—not stacks of shadowed cards.

## Shapes

Large surfaces and foil frames are square or gently curved. Primary and ghost
actions are compact pills. The rotated five-pixel diamond is the recurring
orientation mark. Dotted hairlines evoke a printed index without becoming a
background texture.

## Components

### Buttons

- **Shape:** Compact pill with clear internal space.
- **Primary:** Gold-foil vertical finish on Onyx text; reserve for the single
  most important action in a reading context.
- **Hover / Focus:** Brighten the gold finish on hover and expose an obvious
  gold focus-visible outline with separation from the dark ground.
- **Ghost:** Transparent Onyx surface with a low-contrast gold border and
  parchment label; use for secondary navigation only.

### Cards / Containers

- **Corner Style:** Square by default, gently curved only for framed material.
- **Background:** Use tonal Onyx shifts rather than white or translucent glass.
- **Shadow Strategy:** Flat at rest; dividers and surface tone carry grouping.
- **Border:** One low-contrast gold hairline or dotted separator, never border
  plus shadow on the same passive surface.
- **Internal Padding:** Fluid 20–44px depending on density and viewport.

### Navigation

The minimal public header pairs the gold diamond and Playfair wordmark with a
short uppercase back link. Contextual discovery lives in prose and the quiet
footer; primary navigation labels do not change for one content page.

### Reading Lists

Use semantic ordered or unordered structures with dotted separators. On wide
screens, a question or label may sit beside its answer; on small screens the
pair stacks while preserving DOM and reading order.

## Do's and Don'ts

### Do:

- **Do** keep long-form copy on bounded measures with strong semantic headings.
- **Do** make one action visually primary and keep source or FAQ links quieter.
- **Do** use the gold diamond, italics, and dotted rules sparingly as signatures.
- **Do** preserve keyboard-visible focus, contrast, responsive stacking, and
  reduced-motion behavior.

### Don't:

- **Don't** turn content sections into a wall of equal rounded cards.
- **Don't** use gold as paragraph text or decorative glow across the page.
- **Don't** introduce a new visual identity, gradient text, generic glass, or
  technical monospace styling for ordinary prose.
- **Don't** change the Karte wordmark, primary navigation labels, analytics
  identifiers, legal copy, or route behavior while extending this system.
