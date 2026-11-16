---
target: payments and finance flows and dashboards
total_score: 24
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 2
target_identity: "file:C:\\Users\\victo\\Documents\\GitHub\\AdmobiHQ\\apps\\customer-web\\components\\billing"
timestamp: 2026-11-09T21-29-09Z
slug: apps-customer-web-components-billing
---
⚠️ DEGRADED: single-context (user asked not to use sub-agents)

Scope: customer-web billing (overview, top-up, refund, payment return), ops Finances (overview, payouts tab, payout run dialog), driver-web earnings. Mode: Operate.

| # | Heuristic | Score | Key issue |
|---|---|---|---|
| 1 | Visibility of system status | 2 | Payout receipt says "Payouts sent" for transfers Paystack refused |
| 2 | Match system / real world | 3 | Balance/Available/Committed overlap; dev-speak note on Balance |
| 3 | User control and freedom | 3 | Cancel/back everywhere; pending payouts editable |
| 4 | Consistency and standards | 2 | Raw `processing` vs "Sending"; duplicate FileText icon; dead "M-Pesa ref" column |
| 5 | Error prevention | 3 | Balance check + confirm good; KES 1,000,000 single payout unchallenged |
| 6 | Recognition over recall | 2 | Failure reasons only in hover title; Needs attention rows not links |
| 7 | Flexibility and efficiency | 2 | No bulk retry/fill, no driver search, no top-up presets |
| 8 | Aesthetic and minimalist | 2 | Customer overview overloaded; 3 Top up CTAs; repeated figures |
| 9 | Error recovery | 2 | Disabled Send without reason; driver "Didn't go through" without next step |
| 10 | Help and documentation | 3 | Good inline honesty notes |
| Total | | 24/40 | Acceptable |

Design specificity: receipt printer is the one authored moment; the rest is the shared dashboard kit. Detector: 0 findings. No browser overlay (Clerk-gated, no browser automation).

Priority issues:
- [P0] Payout receipt claims success Paystack refused: disburse() counts 4xx-refused chunks as queued. Return failed rows; receipt shows a refused section. (/impeccable harden)
- [P1] Failure reasons hover-only (payouts tab, run dialog); ops "Needs attention" last and not linked. Show reason inline; move attention to top when non-empty; link rows. (/impeccable clarify, /impeccable layout)
- [P1] Customer overview overloaded and buries funding status; Top up x3, Committed x2, Next charge x2, 8 shortcuts mostly duplicates; alert only on short, not low. Lead with Available + runway + status. (/impeccable distill)
- [P2] Payout run dialog doesn't scale: no search, bulk fill, running total; raw statuses; disabled Send without reason; no large-amount warning. (/impeccable harden)
- [P2] Driver earnings: failed payouts vanish from Pending with no reason or next step. (/impeccable clarify)

Personas: Alex (5 retries one by one, hover for reasons, no bulk fill); Sam (title-only reasons never announced); Jordan (four overlapping money terms, funding status buried); Casey (failed payout silently drops out of Pending).

Minor: M-Pesa ref column always None for Paystack; fake pagination in payouts ledger; Margin card mixes explanation and actions; no top-up presets; eyebrow labels add nothing.

Questions: answer one question on the advertiser overview ("am I covered, until when?"); should a refused payout print a receipt at all; six charts above the list of what's broken?
