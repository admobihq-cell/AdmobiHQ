import { useEffect } from "react"
import { Platform } from "react-native"
import * as WebBrowser from "expo-web-browser"

/**
 * Pre-warms the OS browser so the "Continue with Google" handoff opens
 * instantly instead of visibly spinning up a fresh browser process —
 * mainly matters on Android, where Chrome Custom Tabs cold-start is slow
 * enough to read as a glitch. iOS's SFSafariViewController is already fast
 * and has no equivalent warm-up API.
 */
export function useWarmUpBrowser() {
  useEffect(() => {
    if (Platform.OS !== "android") return
    void WebBrowser.warmUpAsync()
    return () => {
      void WebBrowser.coolDownAsync()
    }
  }, [])
}
