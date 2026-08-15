import { useRouter, useSegments } from "expo-router"
import { useEffect } from "react"

import { useDriverProfile } from "@/lib/driver-profile"

/** Separate from AuthGate (Clerk-only concern). Unlike the old hard gate,
 * this no longer redirects a driver away from the tabs — they can browse
 * freely; each gated tab screen shows its own "complete your profile"
 * placeholder (see CompleteProfilePlaceholder) instead. The only thing this
 * still does is bounce an already-approved driver out of the profile-setup
 * stack if they land there (nothing left to do there once approved). */
export function ProfileSetupGate({ children }: { children: React.ReactNode }) {
  const { profile, loading, error } = useDriverProfile()
  const segments = useSegments()
  const router = useRouter()

  const inProfileSetup = segments[0] === "profile-setup"

  useEffect(() => {
    if (loading || error || !profile) return
    if (profile.status === "approved" && inProfileSetup) {
      router.replace("/(tabs)")
    }
  }, [loading, error, profile, inProfileSetup, router])

  return <>{children}</>
}
