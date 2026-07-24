import Constants from "expo-constants"
import * as SplashScreen from "expo-splash-screen"
import * as Updates from "expo-updates"
import { useEffect, useState } from "react"

const isExpoGo = Constants.executionEnvironment === "storeClient"

if (!isExpoGo) {
  SplashScreen.setOptions({
    duration: 500,
    fade: true,
  })
}

const MIN_SPLASH_MS = 900

export function useSplashBootstrap(isReady: boolean) {
  const [minTimeElapsed, setMinTimeElapsed] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setMinTimeElapsed(true), MIN_SPLASH_MS)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (!isReady || !minTimeElapsed) return
    void SplashScreen.hideAsync()
  }, [isReady, minTimeElapsed])
}

export function useOtaUpdates() {
  useEffect(() => {
    if (__DEV__) return

    void (async () => {
      try {
        const update = await Updates.checkForUpdateAsync()
        if (!update.isAvailable) return

        await Updates.fetchUpdateAsync()
        // Fetch only on launch — apply on next cold start. Immediate reloadAsync()
        // after splash often looks like a crash when the OTA bundle is bad.
      } catch {
        // OTA is best-effort; offline or misconfigured EAS Update should not block launch.
      }
    })()
  }, [])
}

export type ManualUpdateCheckResult =
  | { status: "unsupported" }
  | { status: "up-to-date" }
  | { status: "downloaded" }
  | { status: "error"; message: string }

export async function checkForUpdateManually(): Promise<ManualUpdateCheckResult> {
  if (__DEV__ || isExpoGo) return { status: "unsupported" }

  try {
    const update = await Updates.checkForUpdateAsync()
    if (!update.isAvailable) return { status: "up-to-date" }

    await Updates.fetchUpdateAsync()
    return { status: "downloaded" }
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

export { isExpoGo }
