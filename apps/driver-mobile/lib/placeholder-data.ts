export type RouteSummary = {
  id: string
  name: string
  corridor: string
  hours: string
  earnings: string
  weight: "High earner" | "Medium earner" | "Low earner"
}

export const ROUTE_HISTORY: RouteSummary[] = [
  {
    id: "1",
    name: "CBD Loop",
    corridor: "Nairobi CBD · 3 corridors",
    hours: "12.4 hrs this week",
    earnings: "KES 2,600",
    weight: "High earner",
  },
  {
    id: "2",
    name: "Westlands Run",
    corridor: "Westlands · 2 corridors",
    hours: "9.1 hrs this week",
    earnings: "KES 1,850",
    weight: "Medium earner",
  },
  {
    id: "3",
    name: "Mombasa Rd Commute",
    corridor: "Mombasa Rd · 1 corridor",
    hours: "6.0 hrs this week",
    earnings: "KES 980",
    weight: "Low earner",
  },
]

export type RecentActivityItem = {
  id: string
  title: string
  detail: string
  time: string
}

export const RECENT_ACTIVITY: RecentActivityItem[] = [
  {
    id: "1",
    title: "Route completed — CBD Loop",
    detail: "3.2 hrs screen-on",
    time: "Today",
  },
  {
    id: "3",
    title: "Route completed — Westlands Run",
    detail: "2.1 hrs screen-on",
    time: "Yesterday",
  },
]

export type DeliveryJob = {
  id: string
  pickup: string
  dropoff: string
  fee: string
}

export const SAMPLE_DELIVERY_JOBS: DeliveryJob[] = [
  { id: "1", pickup: "Sarit Centre, Westlands", dropoff: "Kilimani, Wood Ave", fee: "KES 350" },
  { id: "2", pickup: "CBD, Kimathi St", dropoff: "Lavington Mall", fee: "KES 420" },
]
