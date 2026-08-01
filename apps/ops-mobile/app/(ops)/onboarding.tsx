import { useRouter } from "expo-router"

import { OnboardingScreen } from "@/components/onboarding/onboarding-screen"

/** Replay entry point for the first-run onboarding carousel, reachable from Profile. Does not touch the AsyncStorage-persisted "completed" flag used by the auth gate — this is just a manual replay. */
export default function OnboardingReplayScreen() {
  const router = useRouter()

  return (
    <OnboardingScreen
      onDone={() => {
        if (router.canGoBack()) {
          router.back()
        } else {
          router.replace("/(ops)/profile")
        }
      }}
    />
  )
}
