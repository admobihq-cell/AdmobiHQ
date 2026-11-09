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
- **Header** (`site-header.tsx`): from `xl`, three zones on one centre line: the nav links inside a 1.5px foreground-outlined pill (current section in terracotta, dropdowns hang below it), the full logo (mark + wordmark) in the middle, and a matching pill holding both front doors ("Partner your fleet" as text, "Start a campaign" filled terracotta). Below `xl` it's logo + wordmark, a "Start a campaign" pill (from `sm`) and an outlined round menu button; the theme toggle stays in the bar at every width.
- Optional **sticky mobile bar** with two actions (Start campaign / Fleet manager); no modal-first signup.
- **Lead forms** (start campaign, partner fleet, drivers): pitch left, form right from `lg` (`formPageGrid` in `apps/web/components/forms/form-section.tsx`), never a lone `max-w-xl` column against an empty right half. Fields group into titled `FormSection`s that pair short fields two-across from `sm`. In DOM order the form follows the intro directly, so phones reach it without scrolling past supporting copy. On submit the form is replaced by `SubmissionSuccess` (`apps/web/components/forms/submission-success.tsx`): a headline plus a short route of what happens next (done node → pulsing next node → later steps, each with an optional "when" promise), not an icon-in-a-circle card. It takes focus on mount.

## Driver surfaces (driver-web, driver-mobile)

**Scene:** a driver on a phone, in a car, often in bright sun, checking between fares whether the money went through. Same palette, type and components as the rest of Admobi. What changes is the emphasis: one answer per screen, read at a glance.

- **Money is the display type.** The newest payout leads home and Earnings as the largest text on the page (`text-5xl`/`6xl` on web, 46pt on mobile), tabular figures, tight tracking. Page headings stay smaller (`text-2xl`/`3xl`). No icon-tile stat cards, and no uppercase eyebrow labels over headings.
- **The route is the motif.** Payout status is a three-stop route, Saved → Sending → Paid (`PayoutRoute` in `apps/driver-web/components/overview/payout-hero.tsx`, mirrored in `apps/driver-mobile/components/payout-hero.tsx`): done nodes filled terracotta with a check, the current node ringed with the shared `anim-pulse`, a failed/reversed stop filled destructive with an ×. Payout history is the same idea drawn vertically, one node per month. Reuse it for any multi-step driver status instead of a stepper or progress bar.
- **Status is never colour alone:** every node and history row carries its status in words.
- **Problems carry their next step:** a failed payout shows "Check payout details" and "Ask support" in the hero itself; load errors get a Try again button.
- **Thumb first:** below `md` driver-web shows a bottom tab bar (Home, Earnings, Routes, Support) like the native app; tap targets are 44–48px; the SOS FAB sits above the tab bar and `<main>` pads to clear both.
- **Samples are tagged in place:** an illustrative figure carries its own "Sample" tag, not just a footnote.

## Motion

- Prefer opacity or transform on decorative elements only; **do not** animate width, height, margin, or top for layout.
- Easing: **ease-out** (quint or exponential feel), no bounce.

## Imagery

- **Hero / sections:** Placeholder rectangles or photography slots until shoot; no fake dashboard screenshots.
- **Ops map vehicles:** The "no literal taxi clipart" rule is for marketing surfaces. The ops network map (an Operate tool) uses top-down 3D-rendered vehicle sprites, the fleet-tracker convention ops staff read instantly. The roof screen is lit in the playing ad's brand colour.
- **Brand kit:** Reference board `public/brand/admobi-brand-kit.png` — 3×3 identity overview (logo, construction, digital crop, tagline, palette, type, taxi application, atmosphere, UI strip).

## Anti-patterns (enforced)

Gradient text, decorative glassmorphism, identical four-up icon cards, modal-first forms, left-only thick border accents on callouts.
