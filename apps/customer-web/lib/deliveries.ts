// Local-only delivery tracking preview — static sample data, nothing here
// reaches a real backend or live GPS feed. Matches the "Preview — Not yet
// live" convention used across apps/customer-web/lib/campaigns.ts.

export type DeliveryStatus = "accepted" | "picked_up" | "in_transit" | "delivered"

export type DeliveryTimelineEvent = {
  label: string
  timestamp: string
  done: boolean
}

export type DeliveryNote = {
  id: string
  author: string
  body: string
  timestamp: string
  fromCustomer?: boolean
}

export type Delivery = {
  id: string
  reference: string
  status: DeliveryStatus
  statusLabel: string
  createdOn: string
  distanceKm: number
  etaMinutes: number
  price: string
  pickup: { address: string; instructions: string }
  dropoff: { address: string; contact: string }
  package: string
  driver: { name: string; vehicle: string; phone: string }
  /** [longitude, latitude] pairs tracing the route, pickup to dropoff. */
  route: [number, number][]
  /** Current live position — a point along `route`. */
  currentPosition: [number, number]
  timeline: DeliveryTimelineEvent[]
  notes: DeliveryNote[]
}

const SEED_DELIVERIES: Delivery[] = [
  {
    id: "del-1042",
    reference: "DEL-1042",
    status: "in_transit",
    statusLabel: "In transit",
    createdOn: "Today",
    distanceKm: 6.3,
    etaMinutes: 14,
    price: "KES 350",
    pickup: {
      address: "Sarit Centre, Westlands",
      instructions: "Ask for the loading bay at the west entrance.",
    },
    dropoff: {
      address: "Kilimani, Wood Ave",
      contact: "James Otieno · 0712 345 678",
    },
    package: "1 screen unit, boxed · 18 kg",
    driver: { name: "Kevin Parada", vehicle: "Delivery bike · KKA 204B", phone: "0798 112 233" },
    route: [
      [36.8025, -1.2635],
      [36.8062, -1.2705],
      [36.801, -1.279],
      [36.794, -1.2855],
      [36.7885, -1.2913],
    ],
    currentPosition: [36.801, -1.279],
    timeline: [
      { label: "Carrier accepted order", timestamp: "8:30 AM", done: true },
      { label: "In-route for pickup", timestamp: "8:40 AM", done: true },
      { label: "Arrived at pickup", timestamp: "8:55 AM", done: true },
      { label: "Picked up order", timestamp: "9:05 AM", done: true },
      { label: "In transit to dropoff", timestamp: "9:06 AM", done: true },
      { label: "Delivered", timestamp: "ETA 9:20 AM", done: false },
    ],
    notes: [
      {
        id: "n1",
        author: "Admobi Support",
        body: "Your driver Kevin is on the way with your package.",
        timestamp: "9:06 AM",
      },
      {
        id: "n2",
        author: "You",
        body: "Great, thank you! Please have him call on arrival.",
        timestamp: "9:08 AM",
        fromCustomer: true,
      },
    ],
  },
]

export function getDeliveries(): Delivery[] {
  return SEED_DELIVERIES
}

export function getActiveDelivery(): Delivery | null {
  return SEED_DELIVERIES.find((delivery) => delivery.status !== "delivered") ?? null
}

export function getDeliveryById(id: string): Delivery | null {
  return SEED_DELIVERIES.find((delivery) => delivery.id === id) ?? null
}
