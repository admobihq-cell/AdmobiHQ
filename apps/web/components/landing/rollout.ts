/** The one place homepage copy gets its city claims from. Update here when a city goes live. */
export const LIVE_CITY = "Nairobi"
export const NEXT_CITIES = ["Nakuru", "Eldoret", "Mombasa"] as const

export const nextCitiesList = new Intl.ListFormat("en", { type: "conjunction" }).format(NEXT_CITIES)
