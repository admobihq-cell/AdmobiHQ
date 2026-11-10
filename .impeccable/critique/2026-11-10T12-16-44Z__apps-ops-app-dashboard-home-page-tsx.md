---
target: ops home page
total_score: 20
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
target_identity: "file:C:\\Users\\victo\\Documents\\GitHub\\AdmobiHQ\\apps\\ops\\app\\(dashboard)\\home\\page.tsx"
target_fingerprint: "sha256:b9fe733d3f1236cc43e6217514b16db120c94b2b9444678a7d381948090ba4b8"
target_path: "C:\\Users\\victo\\Documents\\GitHub\\AdmobiHQ\\apps\\ops\\app\\(dashboard)\\home\\page.tsx"
timestamp: 2026-11-10T12-16-44Z
slug: apps-ops-app-dashboard-home-page-tsx
---
⚠️ DEGRADED: single-context (user preference: no subagents; no browser tool)

# Critique: Ops home page (apps/ops/app/(dashboard)/home)

## Design Health Score
| # | Heuristic | Score | Key Issue |
|---|---|---|---|
| 1 | Visibility of System Status | 1 | No "needs you now"; SOS/reviews/payments only as sidebar badges |
| 2 | Match System / Real World | 3 | "Total submissions" sums unlike things; "monitor CMS health" |
| 3 | User Control and Freedom | 3 | Read-only; every element is an exit |
| 4 | Consistency and Standards | 2 | Old StatCard/ModuleCard vs dashboard kit; modules not permission-gated |
| 5 | Error Prevention | 2 | Module links to forbidden pages bounce to /home |
| 6 | Recognition Rather Than Recall | 3 | Labeled |
| 7 | Flexibility and Efficiency | 1 | Same two hero CTAs for every role |
| 8 | Aesthetic and Minimalist Design | 1 | Photo hero carries no info; 8-card grid duplicates sidebar |
| 9 | Error Recovery | 2 | Dev instruction (npm run env:pull) shown to staff; no retry |
| 10 | Help and Documentation | 2 | Tour in shell only |
| **Total** | | **20/40** | **Acceptable (low)** |

## Design Specificity Verdict
Category-interchangeable: stock-photo welcome hero + 6 icon-tile stats + 8 identical module cards (DESIGN.md anti-pattern). Not on the dashboard kit the rest of ops uses. Detector: 0 findings (bland, not broken).

## Priority Issues
- [P1] No attention queue; SOS absent. Lead with permission-filtered ActionQueue (SOS, reviews oldest-first w/ Overdue >72h, failed payouts/mismatches, unseen payments, open support). (/impeccable layout, /impeccable harden)
- [P1] Module grid duplicates sidebar, ignores permissions. Delete HomeModules; ≤3 role shortcuts. (/impeccable distill)
- [P2] Photo hero takes first viewport, no info. One-line greeting + status sentence + permission-aware actions. (/impeccable distill)
- [P2] Stats lack context; "Total submissions" meaningless. KpiStrip: live campaigns, active vehicles today, money in (finances-gated), new leads, with vs last period. (/impeccable layout)
- [P3] Error message is dev-facing, no retry. (/impeccable clarify)

## Persona Red Flags
Alex: photo first, triage needs badges/bell, no oldest-first jump. Sam: 8 redundant tab stops; text on photo contrast unverified. Limited-permission staff: forbidden module cards bounce; own queue missing.

## Minor Observations
Signed-in email repeated; parallel SectionHeading/StatCard/ModuleCard set; double gradient overlay; CMS module copy is setup detail.

## Questions
Home = only the queue? SOS as interrupting banner? Per-role home?
