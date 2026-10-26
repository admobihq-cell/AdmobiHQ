/**
 * The made-up advertisers that play on the ops network map's demo fleet. Shared so the
 * marketing site's products page rotates through the very same ads (brand, tagline, call to
 * action, colours, video); `src` is served from each app's own public/demo-fleet/ads, so an app that
 * shows an ad must ship its video there (ops has all eleven, web the six its loop uses).
 * Everything here is invented: no real brands, prices or campaigns.
 */

export type DemoAdId =
  | "safari-cola"
  | "pesa-mint"
  | "nairobi-nights"
  | "soko-fresh"
  | "kahawa-house"
  | "mtaa-kicks"
  | "savanna-air"
  | "chakula-express"
  | "kasi-5g"
  | "fit254"
  | "tatu-heights"

export type DemoAd = {
  id: DemoAdId
  brand: string
  tagline: string
  cta: string
  /** Brand colour: lit-screen glow on the marker + the creative's colour band */
  color: string
  /** Text colour on the band */
  ink: string
  src: string
  advertiser: string
  campaign: string
}

export const DEMO_ADS: DemoAd[] = [
  {
    id: "safari-cola",
    brand: "Safari Cola",
    tagline: "Ice cold on every corner",
    cta: "From KES 60",
    color: "#c8202f",
    ink: "#fff7ef",
    src: "/demo-fleet/ads/safari-cola.mp4",
    advertiser: "Safari Beverages Ltd",
    campaign: "Hot season push",
  },
  {
    id: "pesa-mint",
    brand: "Pesa Mint",
    tagline: "Send to anyone. Zero fees under 500",
    cta: "Dial *483#",
    color: "#0f9d6b",
    ink: "#f2fff9",
    src: "/demo-fleet/ads/pesa-mint.mp4",
    advertiser: "Mint Mobile Money",
    campaign: "Zero-fee October",
  },
  {
    id: "nairobi-nights",
    brand: "Nairobi Nights",
    tagline: "Live at KICC grounds · Sat 25 Oct",
    cta: "Tickets KES 1,500",
    color: "#7a2fb8",
    ink: "#fbf5ff",
    src: "/demo-fleet/ads/nairobi-nights.mp4",
    advertiser: "Kilele Live Events",
    campaign: "Nairobi Nights 2026",
  },
  {
    id: "soko-fresh",
    brand: "Soko Fresh",
    tagline: "Farm to your door in 3 hours",
    cta: "Order on the app",
    color: "#e8a317",
    ink: "#2a1b02",
    src: "/demo-fleet/ads/soko-fresh.mp4",
    advertiser: "Soko Fresh Groceries",
    campaign: "Weekend basket",
  },
  {
    id: "kahawa-house",
    brand: "Kahawa House",
    tagline: "Kenyan AA, poured right",
    cta: "2nd cup free before 9am",
    color: "#7b4a2a",
    ink: "#fff4ea",
    src: "/demo-fleet/ads/kahawa-house.mp4",
    advertiser: "Kahawa House Cafés",
    campaign: "Morning commute",
  },
  {
    id: "mtaa-kicks",
    brand: "Mtaa Kicks",
    tagline: "New drops every Friday",
    cta: "Sarit Centre · Level 1",
    color: "#1f4fd1",
    ink: "#f3f6ff",
    src: "/demo-fleet/ads/mtaa-kicks.mp4",
    advertiser: "Mtaa Kicks",
    campaign: "Friday drops",
  },
  {
    id: "savanna-air",
    brand: "Savanna Air",
    tagline: "Nairobi to Mombasa in 55 minutes",
    cta: "From KES 4,999",
    color: "#0e86a8",
    ink: "#effbff",
    src: "/demo-fleet/ads/savanna-air.mp4",
    advertiser: "Savanna Airways",
    campaign: "Coast weekender",
  },
  {
    id: "chakula-express",
    brand: "Chakula Express",
    tagline: "Hot food at your gate in 30 minutes",
    cta: "Free delivery today",
    color: "#e4571b",
    ink: "#fff6f0",
    src: "/demo-fleet/ads/chakula-express.mp4",
    advertiser: "Chakula Express",
    campaign: "Free delivery Fridays",
  },
  {
    id: "kasi-5g",
    brand: "Kasi 5G",
    tagline: "The whole city, buffer-free",
    cta: "Home fibre from KES 2,999",
    color: "#d0246f",
    ink: "#fff3f8",
    src: "/demo-fleet/ads/kasi-5g.mp4",
    advertiser: "Kasi Telecom",
    campaign: "5G city launch",
  },
  {
    id: "fit254",
    brand: "Fit254",
    tagline: "Your first month is on us",
    cta: "Yaya Centre · Junction",
    color: "#4f7a12",
    ink: "#f6fbea",
    src: "/demo-fleet/ads/fit254.mp4",
    advertiser: "Fit254 Gyms",
    campaign: "New member drive",
  },
  {
    id: "tatu-heights",
    brand: "Tatu Heights",
    tagline: "2-bed homes off Thika Rd from KES 6.5M",
    cta: "Show flat open daily",
    color: "#1f2a3d",
    ink: "#eef3ff",
    src: "/demo-fleet/ads/tatu-heights.mp4",
    advertiser: "Tatu Homes Ltd",
    campaign: "Phase 2 launch",
  },
]
