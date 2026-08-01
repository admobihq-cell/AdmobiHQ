---
target: ops-mobile
total_score: 23
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 3
timestamp: 2026-07-31T19-02-17Z
slug: apps-ops-mobile
---
Method: dual-agent (A: a89bae80ab7508de2 · B: a558b8a8d49a3b3f0)

## Design Health Score

Operate-mode surface (internal staff console) — all 10 heuristics scored for real, none marked n/a.

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Shape-matched skeletons per screen type, pull-to-refresh, inline error banners. Gap: `StatusPicker` disables its chip while saving but shows no spinner. |
| 2 | Match Between System and Real World | 4 | Fluent domain language throughout (KES formatting, "campaign leads," "fleet partners"); time-of-day-aware greeting copy. |
| 3 | User Control and Freedom | 2 | Entity delete (`EntityDetail.tsx`) uses native `Alert.alert`, which `ConfirmDialog`'s own code comment says doesn't render on `react-native-web` — and this app ships a web target. Delete confirmation is likely broken or inconsistent on web. |
| 4 | Consistency and Standards | 2 | Same status value renders two different color languages depending on screen (list rows are semantically color-coded; `StatusPicker` on detail screens always shows `variant="primary"`). Card radius drifts between 14 and 16 across adjacent "hero card" surfaces, neither reliably pulled from the `radius` token scale. |
| 5 | Error Prevention | 3 | Confirm dialogs on destructive actions, debounced search, per-field inline validation on create/edit forms. |
| 6 | Recognition Rather Than Recall | 3 | Tab icons always paired with text labels; FAB items show icon *and* label. Undercut by the status-color inconsistency above. |
| 7 | Flexibility and Efficiency of Use | 1 | No bulk/batch actions anywhere. Triaging 40 new leads means open → read → act → back, one at a time, with no multi-select, swipe-to-status-change, or saved views beyond a single filter. |
| 8 | Aesthetic and Minimalist Design | 3 | Disciplined palette/type scale. Docked: the dashboard stacks banner + 4 stat cards + chart + breakdown switcher + 4 quick actions + an 8-item feed at nearly equal visual weight — nothing but the hero photo reads as clearly most important. Raw `API: {API_URL}` debug text sits in Profile with the same weight as real settings. |
| 9 | Help Users Recognize, Diagnose, and Recover from Errors | 1 | On any network failure, every screen surfaces a literal local-dev debugging instruction ("Run `npm run env:pull -w ops-mobile`..."), and 401/404 errors tell the user to "confirm production Clerk keys" or "redeploy the API" — instructions no ops staff member can act on. |
| 10 | Help and Documentation | 1 | Only help surface is a one-time, skippable onboarding carousel with no way to replay it. No Help/Support entry in Profile despite Profile having dedicated sections for everything else. |
| **Total** | | **23/40** | **Acceptable** (57.5%) |

## Design Specificity Verdict

**LLM assessment:** This is not a generic admin-dashboard template wearing a new logo. The warm terracotta/cream palette is shared with the rest of the Admobi brand system (not Tailwind-default blue/gray); the onboarding screen uses real taxi/city photography with a documented reasoning comment for its accent-color choice; Finances uses KES formatting and Nairobi-relevant copy; the entity model (leads/fleet/drivers/waitlist/media-kit/announcements) is domain-specific, not a CRUD demo. That said, the component *chrome* — StatCard, ActionCard, ListRow, ConfirmDialog — is a competent but conventional "grouped list + hero card" iOS-Settings vocabulary that would look at home in many other ops tools if you swapped the palette. The photography and copy carry the specificity; the interaction patterns are category-standard.

**Deterministic scan:** The bundled HTML/CSS detector ran cleanly (exit 0, 0 findings) against 100 scanned files — this reflects "no applicable markup," not a design-quality signal, since the app has zero HTML/CSS (all styling is `StyleSheet.create`). In its place, a manual grep-based scan found real, quantifiable design-system drift: 24 hardcoded hex-color lines and ~20 rgba literals outside the theme files (including a fully dead second theming file, `constants/Colors.ts`, and a fourth, undocumented brand-color constant in `lib/push-notifications.ts`); 45 off-scale spacing values and 21 magic-number border-radii that duplicate existing token values instead of referencing them; and a `iconWrap` box shape hand-rolled independently in 6 files despite an existing, unused `IconBox` component built to do exactly this. One false positive noted and excluded: `metric-bar.tsx`'s 7-color array is a legitimate categorical chart palette, not a UI-chrome violation.

**Visual overlays:** Not available for this run. ops-mobile is a native Expo/React Native app with no HTML/CSS and no renderable web page — no simulator, emulator, or device was available in this environment, so no dev server was started and no browser overlay was injected. This is the fallback signal, reported plainly rather than simulated; all findings above come from direct source reading.

## Overall Impression

The app has real design intent — a considered palette, an above-average skeleton-loading system, and photography that commits to a specific mood — but it reads as built by and for the person shipping it rather than the person using it eight hours a day. The clearest evidence: production error messages contain literal `npm run` commands and "redeploy the API" instructions aimed at engineers, not the ops staff who will actually see them. The single biggest opportunity is closing the gap between "looks considered" (onboarding, palette, skeletons) and "operates considered" (error recovery, bulk actions, consistent status color language) — right now the polish is front-loaded into the one screen (onboarding) staff see exactly once, and the daily-use screens carry the rough edges.

## What's Working

1. **`components/app/skeleton.tsx`** — four distinct skeleton shapes, each hand-matched to the exact layout of the content they precede (avatar+2-line row vs. 3-line triage row vs. hero+grouped-fields), including staggered widths so loading states look like the actual screen turning on rather than generic gray boxes. Above-average craft most teams skip.
2. **`components/onboarding/onboarding-screen.tsx`** — real city/taxi photography, a documented rationale for the accent-color choice against that photography, and a per-image-tuned scrim gradient. The one place the app fully commits to a specific mood instead of defaulting to generic SaaS blue.
3. **`lib/theme/palettes.ts` + `useThemedStyles`/`useThemeColors`** — a real, consistently-applied light/dark token system shared with the web app's `globals.css`. Real infrastructure most internal tools never bother building — even though (per the scan below) it's inconsistently *used* in practice.

## Priority Issues

**[P0] Developer debug messages surface as production error copy**
- **What**: `lib/format-error.ts` and `packages/ops-api-client/src/format-error.ts` wire local-dev troubleshooting text into every screen's network-error state — "Run `npm run env:pull -w ops-mobile` and use your machine's LAN IP," "confirm the app uses production Clerk keys" (401), "Check EXPO_PUBLIC_API_URL... and redeploy the API" (404).
- **Why it matters**: This is exactly the moment (Heuristic 9) a non-technical ops staff member most needs plain language and an action they can actually take. On office wifi, this could surface daily, and none of the instructions are things a staff member has the access to do.
- **Fix**: Split error copy by build channel — dev/preview builds keep the LAN-IP hint, production builds say something like "Can't reach Admobi's servers right now. Check your connection and try again, or contact IT if this continues." Replace "redeploy the API" / "production Clerk keys" with staff-actionable copy.
- **Suggested command**: `/impeccable harden`

**[P1] Delete confirmation is likely broken or inconsistent on the web build**
- **What**: `EntityDetail.tsx`'s delete flow uses native `Alert.alert` with a Cancel/Delete button array. `components/ui/confirm-dialog.tsx` exists specifically because, per its own comment, `Alert.alert`'s button array doesn't render an interactive dialog on `react-native-web` — and this app ships a web target (`app.json` → `expo.web.output: "single"`).
- **Why it matters**: Deleting a lead, fleet partner, driver, waitlist entry, or media-kit request is likely non-functional or behaves unpredictably on web, while the identical interaction elsewhere in the app (sign-out in `profile.tsx`) correctly uses the safe custom dialog.
- **Fix**: Replace the `Alert.alert` call in `EntityDetail.tsx` with `ConfirmDialog`, matching the proven `profile.tsx` pattern.
- **Suggested command**: `/impeccable harden`

**[P1] No bulk actions anywhere in an all-day, high-volume triage tool**
- **What**: `EntityList.tsx` renders every record as an individually-tappable row — no selection mode, no swipe actions, no batch status change, no saved views beyond a single status filter + text search.
- **Why it matters**: This is Heuristic 7's core failure. Staff triaging leads or waitlist entries at volume must open → act → back-navigate for every single record, all day, with zero accelerators ever offered.
- **Fix**: Add long-press/edit-mode multi-select on `EntityList` rows with a bulk status-change action bar, and/or swipe-to-status-change on `TriageRow`.
- **Suggested command**: `/impeccable optimize`

**[P1] The design-token system exists but is bypassed at scale**
- **What**: Manual scan found 24 hardcoded hex-color lines and ~20 rgba literals outside the theme files; 45 off-scale spacing values and 21 magic-number border-radii duplicating existing tokens; a fully dead second theming file (`constants/Colors.ts`, unused by any real screen); a fourth, undocumented brand-color constant in `lib/push-notifications.ts` that doesn't match either palette's `primary`; and a reusable `iconWrap`-style box hand-rolled independently in 6 files despite an existing, unused `IconBox` component built for exactly that. This drift is also what directly produced the touch-target violation below — the "add" button was duplicated by hand into two files instead of reused from one shared, correctly-sized component.
- **Why it matters**: The token system is real and well-built, but its inconsistent use is precisely what's dragging down Heuristic 4 (Consistency) — the same "hero card," icon box, and status chip render with different values depending on which screen you're on.
- **Fix**: Sweep the flagged files to reference `spacing`/`radius`/`palettes` tokens instead of literals; delete `constants/Colors.ts` and its two dead-code consumers; consolidate the four brand-color sources into one; replace the 6 hand-rolled `iconWrap` shapes with the existing `IconBox` (or a small new `IconWrap` if `IconBox`'s API doesn't fit all 6 cases).
- **Suggested command**: `/impeccable extract`, then `/impeccable polish`

**[P2] Two unmitigated sub-44pt touch targets on the primary "create record" button**
- **What**: The `addButton` style (`width: 40, height: 40`, no `hitSlop`) is duplicated verbatim in `app/(ops)/announcements/index.tsx:37-45` and `components/EntityList.tsx:97-105` — both below the 44×44pt iOS HIG minimum. (Cleared as false positives: `theme-toggle-button.tsx` and `activity-bell-button.tsx` are visually 32×32 but carry `hitSlop={10}`, bringing their effective target past 44pt.)
- **Why it matters**: This is the primary "add new record" action on two of the app's core list screens — exactly the button that should be easiest to hit reliably, especially one-handed.
- **Fix**: Bump both to at least 44×44, or add `hitSlop={8}`+ to match the mitigation already used elsewhere in the app.
- **Suggested command**: `/impeccable adapt`

**[P2] Finances screen mixes confidently-styled fabricated data with dead-end actions**
- **What**: `finances.tsx` hardcodes a large `KES 1,264,800` balance and five named transactions, disclosed only by one small caption below the fold ("Placeholder data..."). Separately, every wallet quick-action button and the "See all transactions" link call `Alert.alert("Coming soon", ...)` — 4 distinct dead-end interactions clustered on this one screen.
- **Why it matters**: A staff member glancing at the wallet card sees a large, styled number that reads as real, on the one screen (finance) where accuracy matters most — and then hits 4 dead ends trying to act on it.
- **Fix**: Move the "placeholder" disclosure into the hero itself (a visible "Preview / Not connected to live billing" badge, not a footer caption), and either hide the still-inactive action buttons or visually mark them as not-yet-available instead of letting them look tappable.
- **Suggested command**: `/impeccable clarify`

## Persona Red Flags

Interface type is both Dashboard/admin (→ Alex, Sam) and native mobile used one-handed (→ Casey); using all three per the brief.

**Alex (Power User)**
- No bulk/batch actions anywhere in `EntityList` — every record requires an individual open → act → back cycle; triaging a queue of 30 leads never gets faster.
- The FAB menu (`FAB_ITEMS` in `dashboard.tsx`) presents 6 simultaneous "create new X" options — two over the 4-item working-memory guideline — so Alex has to read labels instead of muscle-memory-tapping a fixed position, the opposite of a power-user accelerator.

**Sam (Accessibility-Dependent User)**
- The dark palette's hairline border (`rgba(247, 245, 242, 0.12)`, ~12% opacity) against a `#1E1D24` background is plausibly under WCAG's non-text contrast minimum — group boundaries and dividers may be nearly invisible in dark mode even with normal vision.
- `StatusChip`'s `attention` (~14% alpha) and `primary` (~12% alpha) variants use near-identical tints with identical text color — color is doing double duty as the *only* differentiator between two semantic states, a direct instance of the "don't rely on color alone" red flag.
- Correction from Assessment B's manual check: the `AppBar`'s icon buttons do carry `accessibilityLabel`s, and the two icon buttons flagged as visually small (theme toggle, activity bell) both clear the 44pt target once `hitSlop` is accounted for — so this persona's real exposure is the two *unmitigated* `addButton` instances above, not the app bar.

**Casey (Distracted Mobile User)**
- The persistent `AppBar` (brand mark, activity bell, theme toggle, avatar) sits fixed at the *top* of every ops screen — outside the thumb zone on a one-handed grip. The FAB correctly sits bottom-right for reachability, but the bell and profile avatar — arguably the two most-tapped icons after the FAB — sit exactly where Casey's thumb can't comfortably reach.
- `EntityList`'s search box and filter chips are also top-anchored, so refining a list one-handed mid-walk requires a stretch or a two-handed grip every time.
- Pull-to-refresh and debounced search (300ms) both handle interruption reasonably — state isn't lost if Casey gets pulled away mid-search, a genuine plus for this persona.

## Minor Observations

- `profile.tsx`'s footer exposes `API: {API_URL}` as plain text with the same visual weight as real settings — likely meant for support/debugging but unexplained to staff.
- Status color language is inconsistent: list rows semantically color-code status (attention/progress/success/muted), but `StatusPicker` on every detail screen always renders the current status as `variant="primary"` regardless of value — the color-coding a user learns from the list stops applying the moment they open a record.
- `notifications.tsx` (labeled "Preview alert styles" in Profile) is a QA/dev tool for previewing push styles, sitting in the same "Preferences" section as real user-facing settings, with no visual distinction.
- `StatusPicker`'s `saving` state disables the pressable but shows no spinner — a fast tapper could plausibly double-tap before the disabled state visually registers.
- Onboarding has no way to be replayed from Profile — a staff member who skips it, or a new hire wanting a refresher, has no path back to it.
- The dashboard's cognitive load: 3 of 8 checklist items fail (single focus, visual hierarchy, minimal choices at the FAB) — Moderate load, worth addressing alongside the priority issues above.

## Questions to Consider

1. The error-message system reads as written by and for the person shipping the app (LAN IPs, npm scripts, redeploy instructions) rather than the person using it. What would the *ops staff member's* version of every message in `format-error.ts` say instead — and should the split by build channel be automatic?
2. The dashboard tries to be an overview, a chart, a breakdown, a quick-launcher, and a feed all in one scroll. If you had to cut it to the one thing a staffer opens the app to check first thing each morning, what would survive above the fold?
3. Given `IconBox` already exists and is unused by 6 near-identical hand-rolled duplicates, and `constants/Colors.ts` is fully dead code — is there appetite for a token/component cleanup pass (`/impeccable extract`) before more screens get built on top of the drifted patterns?
4. `finances.tsx` is fully mock — is it further along in a branch somewhere, or is this genuinely the state it ships in? If it's staying mock a while, should it be reachable from the main Profile menu at all, or gated behind a clearer "Coming soon" state that doesn't show fabricated numbers?
