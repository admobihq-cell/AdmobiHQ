---
target: driver dashboard and pages
total_score: 23
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 3
target_identity: "file:C:\\Users\\victo\\Documents\\GitHub\\AdmobiHQ\\apps\\driver-web"
timestamp: 2026-11-09T21-54-24Z
slug: apps-driver-web
---
⚠️ DEGRADED: single-context (user preference: no subagents; no browser tool)

# Critique: Driver web dashboard & pages (apps/driver-web)

## Design Health Score
| # | Heuristic | Score | Key Issue |
|---|---|---|---|
| 1 | Visibility of System Status | 2 | Stat cards show bare `…`/`—`; history "Loading…" text despite existing stat-card-grid-skeleton |
| 2 | Match System / Real World | 3 | "Screen telemetry", "Screen-on hrs" ops jargon |
| 3 | User Control and Freedom | 3 | Solid; SOS only navigates |
| 4 | Consistency and Standards | 2 | Payouts nav redirects to Earnings, shares Package icon with Deliveries; stale Earnings description |
| 5 | Error Prevention | 3 | Mostly read-only |
| 6 | Recognition Rather Than Recall | 3 | Labeled nav, tour |
| 7 | Flexibility and Efficiency | 1 | Quick actions duplicate sidebar; no contextual next step |
| 8 | Aesthetic and Minimalist Design | 2 | No focal point; h1 outranks money |
| 9 | Error Recovery | 1 | No retry; failed/reversed payouts look like pending |
| 10 | Help and Documentation | 3 | Tour + Support + SOS |
| **Total** | | **23/40** | **Acceptable** |

## Design Specificity Verdict
Category-interchangeable: shadcn sidebar-inset + eyebrow/h1/paragraph + 3 icon-tile stat cards + list card on every page. Brand metaphor (path/node route) absent; SubmissionSuccess route pattern in apps/web unused. Detector: 0 findings (bland, not wrong).

## Priority Issues
- [P1] Dashboard has no hero: make pending/next payout the display number with a Saved → Sending → Paid track; demote last/YTD; drop icon tiles. (/impeccable layout, /impeccable bolder)
- [P1] Fake RECENT_ACTIVITY sits beside real money; Routes figures illustrative. Replace with real events (payouts, notifications, verification, support) or delete; tag illustrative figures in place. (/impeccable distill, /impeccable harden)
- [P1] Errors dead-end: no retry; failed/reversed indistinguishable from pending by color only; useDriverPayouts fetched twice on Earnings. (/impeccable harden)
- [P2] Nav duplication: hide Payouts, replace Quick actions with one contextual next step, fix stale description. (/impeccable distill)
- [P2] Desktop-first on a phone-first audience: add bottom tab bar under md, pb-24 on main to clear SOS FAB. (/impeccable adapt)

## Motion (emil-design-eng)
SOS hover:scale-105 ungated by hover media; no :active scale on SOS/buttons; stat values pop from … to value (skeleton + opacity fade); history rows could stagger 30–50ms first load; status by dot color only.

## Persona Red Flags
Casey: top-left hamburger, answer split across 3 cards, FAB covers last row, no skeleton on slow network.
Sam: failed vs pending color-only; Loading… not in a live region.
Riley: forced fetch error → three — and no retry; reversed looks pending; dashboard screen-on hours have no source.

## Minor Observations
StatCard hint in text-primary reads as a link; uppercase eyebrow on every page; disabled Accept is a raw button; "Driver" repeated 3x in chrome; header subtitle describes the system, not the driver's day.

## Questions
One number + one track as the whole dashboard? Four-tab phone app instead of a sidebar? A live "your roof is showing X" tile?
