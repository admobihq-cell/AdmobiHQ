---
version: 1
slug: "eb-components-overview-dashboard-view-tsx-c3db9d7f"
primary_target: "apps/driver-web/components/overview/dashboard-view.tsx"
related_targets: ["apps/driver-web/components/overview/earnings-view.tsx","apps/driver-web/components/maps/driver-routes-view.tsx","apps/driver-web/components/deliveries/deliveries-view.tsx"]
---

# Driver web dashboards

Scope: driver-web Dashboard, Earnings, Routes, Deliveries (and their loading states). Mode: Operate.
Audience: approved Admobi drivers checking their screen time, routes and money between fares, on a phone or a laptop.
Constraints: replace the payout-first look from 1c04230c; keep its data fixes. Shared @workspace/ui dashboard kit, same world as customer-web and ops. Only payouts, notifications and profile are real; screen, route and play figures are Sample-tagged until telemetry exists.

## Direction contract

THESIS: A driver dashboard is an operations console for one vehicle, not a single payout headline floating in a column. Refuses the centred max-w column and the one-number hero.
OWN-WORLD: The Admobi dashboard kit as customer-web and ops ship it: warm neutral cards, KpiStrip hairline cells, ChartCard with chart/table toggle, StatusPill tones, terracotta primary for actions and the lead series. Sample figures carry a dashed "Sample" tag in place.
STORY: The driver sees how much their screen ran, where, when it was busiest, what Admobi owes and has paid, and anything that needs them, then acts (fix payout details, ask support, open history).
FIRST VIEWPORT: Full-width. Greeting h1 with subtitle and Support/Earnings actions; toolbar with date range and a Sample-data pill; problem AlertStrip when a payout failed; row of hero (screen-on time with sparkline and delta) beside a 4-cell KPI strip spanning two columns.
FORM: Pinned by the user (same kit as customer/ops); no seed roll.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
