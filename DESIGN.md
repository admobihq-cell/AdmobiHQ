# Admobi — DESIGN

## Visual theme

**Scene (drives theme):** A Nairobi business owner reviews media options on a laptop in bright daylight between meetings. The interface is **light-first**: decisive contrast, warm-tinted neutrals, and a single strong accent for actions. Dark mode is supported for user preference and mirrors the same accent logic with deeper surfaces.

**Brand metaphor:** *Signal that moves through the city* — path, node, or frame over a route. The logo and UI details echo direction and placement without literal taxi clipart.

**Color strategy:** **Committed** — one saturated accent (terracotta / warm brick) carries primary actions and key headings; neutrals are tinted (no pure black or white).

## Color palette (OKLCH)

Semantic roles in [`packages/ui/src/styles/globals.css`](../packages/ui/src/styles/globals.css):

| Role | Light `:root` intent | Notes |
|------|-------------------------|--------|
| Background | Warm near-white | Reduced chroma at high lightness |
| Foreground | Cool-gray brown | Slight hue for calm, not flat gray |
| Primary | Terra / brick | Buttons, key links, focus emphasis |
| Primary foreground | Warm off-white | Text on primary buttons |
| Muted | Warm gray fields | Secondary surfaces |
| Border | Low-chroma warm | Full borders only; no decorative side-stripe accents |

Dark `.dark`: Charcoal-violet neutrals with brighter primary for contrast; accent chroma tuned down at extreme darkness.

## Typography

- **Sans:** Geist (via Next font) — headings and UI.
- **Mono:** Geist Mono — optional labels, codes, small technical lines.
- Hierarchy: display > section title > body; minimum step ratio ~1.25 between levels.
- Body measure: cap near **65–75ch** for long copy blocks.

## Components

- Buttons: [`@workspace/ui` Button](../packages/ui/src/components/button.tsx) — primary for main CTAs, outline/secondary for alternatives.
- Inputs: shared `Input` + `Label` in UI package; rounded, bordered, focus ring using `--ring`.
- FAQs: native `<details>` / `<summary>` for accessibility without custom accordion scripts.

## Layout

- Long-scroll landing with anchor IDs: `#product`, `#markets`, `#campaign`, `#fleet`, `#waitlist`, `#drivers`, `#media-kit`, `#faq`.
- Responsive nav collapses to menu button on small screens.
- Optional **sticky mobile bar** with two actions (Start campaign / Fleet manager); no modal-first signup.

## Motion

- Prefer opacity or transform on decorative elements only; **do not** animate width, height, margin, or top for layout.
- Easing: **ease-out** (quint or exponential feel), no bounce.

## Imagery

- **Hero / sections:** Placeholder rectangles or photography slots until shoot; no fake dashboard screenshots.
- **Brand kit:** Reference board `public/brand/admobi-brand-kit.png` — 3×3 identity overview (logo, construction, digital crop, tagline, palette, type, taxi application, atmosphere, UI strip).

## Anti-patterns (enforced)

Gradient text, decorative glassmorphism, identical four-up icon cards, modal-first forms, left-only thick border accents on callouts.
