export type FaqItem = {
  q: string
  a: string
}

/** Homepage / advertiser FAQ, single source for UI and JSON-LD. */
export const advertiserFaqItems: readonly FaqItem[] = [
  {
    q: "What is taxi-top advertising in Kenya?",
    a: "Taxi-top advertising mounts LED screens on partner taxis so brands reach commuters in motion. In Kenya, Admobi runs geo-targeted flights in Nairobi with schedule control and GPS-verified proof-of-play instead of fixed billboard locations.",
  },
  {
    q: "How does geo-targeted OOH work on moving taxis?",
    a: "You book corridors and time windows, not a single postcode. Partner taxis carry connected screens; plays are logged against GPS routes so reporting shows where and when creatives actually ran across Nairobi.",
  },
  {
    q: "How does moving LED taxi-top advertising compare to static billboards?",
    a: "Static billboards stay on one road; taxi tops follow traffic through CBD, arterials, and estates. You can run short test flights, shift corridors mid-campaign, and verify plays digitally, which is useful when audiences move more than they pass one board.",
  },
  {
    q: "What creative formats does Admobi accept?",
    a: "Video and static packages sized to the unit spec. Loop length, safe zones, and codecs are listed in the media kit PDF when published.",
  },
  {
    q: "How quickly can we launch a taxi-top campaign in Nairobi?",
    a: "Short flights are possible when inventory and compliance checks line up. Contact Admobi with your brief for a timeline.",
  },
  {
    q: "Does Admobi cover counties outside Nairobi today?",
    a: "Nairobi is the first production footprint. Nakuru, Eldoret, and Mombasa are next on the rollout roadmap.",
  },
  {
    q: "What is the minimum spend or campaign duration for Admobi?",
    a: "Campaigns can start from a single day where inventory allows. Final pricing is confirmed with your brief.",
  },
] as const

/** @deprecated Use advertiserFaqItems, kept for existing imports. */
export const faqItems = advertiserFaqItems

export const driverFaqItems: readonly FaqItem[] = [
  {
    q: "Do I pay anything to join?",
    a: "No. Installation, hardware, and maintenance are free.",
  },
  {
    q: "What happens if the screen is damaged?",
    a: "Report it to us. Damage from accidents is reviewed case by case. Fair wear and tear is covered by Admobi.",
  },
  {
    q: "Can I remove the screen myself?",
    a: "No. Removal must be done by our technician to avoid damage to your vehicle. Contact us and we will arrange it.",
  },
  {
    q: "How do I track my earnings?",
    a: "We are building a driver portal. For now, a monthly payout summary is sent via SMS and WhatsApp.",
  },
] as const

export const fleetFaqItems: readonly FaqItem[] = [
  {
    q: "Do we buy the hardware?",
    a: "No. Admobi funds purchase, install, and replacement for covered faults. Your commercial upside is in the partnership revenue model, not capex on screens.",
  },
  {
    q: "How fast can we light up a second city?",
    a: "Once Nairobi density is healthy, Nakuru, Eldoret, and Mombasa follow in the Kenya rollout plan. Multi-city books are scheduled when inventory and compliance line up.",
  },
  {
    q: "Who handles driver complaints about ads?",
    a: "Escalate to Admobi operations. We triage brand-safety flags and can pause units if a creative breaches your comfort settings.",
  },
  {
    q: "What if vehicles sit idle during low season?",
    a: "Contracts define how idle time affects revenue. Your partnership manager models realistic utilisation before sign-off so expectations stay honest.",
  },
] as const
