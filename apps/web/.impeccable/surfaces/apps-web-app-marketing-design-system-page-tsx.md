---
version: 1
slug: "apps-web-app-marketing-design-system-page-tsx"
primary_target: "apps/web/app/(marketing)/design-system/page.tsx"
related_targets: []
---

Scope: /design-system — internal reference for the tokens and components defined in packages/ui, not a public marketing route (noindex).
Visitor mode: Read.

Audience: Admobi engineers/designers extending the marketing or product surfaces who need an exact token value or a live look at a component's variants.
Job: find and copy a color/type/space/radius/shadow/motion token, or see a component's real variants, within seconds.
Action: click any dimension callout to copy its value; jump sheets via the sticky index (rail on desktop, horizontal pill strip on mobile).
Proof/content: every value shown is read live from packages/ui/src/styles/globals.css and the real shared components — no invented tokens, no mockups. Component demos use the actual `@workspace/ui` components, not recreations.
Constraints: must not touch the fixed Admobi palette/type system; must stay inside the existing (marketing) route group's chrome (header/footer/theme toggle) since there's no chrome-less layout precedent in this app.

Chosen direction: spec-sheet / drawing-set structure — numbered sheets (title block, sheet number, monospace dimension-callout leader lines) instead of a generic sidebar-docs template. Sheet order: 01 Color, 02 Type, 03 Space & radius, 04 Elevation & motion, 05 Components, 06 Brand mark.
Memorable moment: Sheet 04 demonstrates the site's real route-draw / fade-rise / signal-pulse keyframes live, on the actual RouteSignal path geometry — the page explains the brand's own motion system using the brand's own animation code, not a description of it.

Unresolved decisions: none blocking. Two things flagged for the user, not fixed: the reference-board image at the bottom of Sheet 06 loads correctly in real browsers (verified via direct fetch + forced load) but can appear blank under headless-Chromium scripted scrolling — a test-tooling quirk, not a page defect; and a pre-existing Radix Checkbox SSR hydration console warning (style-attribute serialization mismatch inside Radix's internal bubble input) surfaced because this page is the first place in the app to render `<Checkbox>` — it's in the shared `packages/ui` component, out of scope for this page to fix.
