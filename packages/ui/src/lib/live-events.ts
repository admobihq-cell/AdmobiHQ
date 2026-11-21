"use client"

import { useEffect, useRef } from "react"

import { parseSseChunk, reconnectDelay, type LiveEvent } from "@workspace/ops-contracts"

/** A hidden tab drops its stream after this long and reconnects when it's shown again. */
const HIDDEN_DISCONNECT_MS = 5 * 60_000

/**
 * Holds one SSE stream to `url` with a bearer token (EventSource can't send headers, so this is
 * `fetch` plus a stream reader). Reconnects with backoff, and right away when the server closes
 * its ~280 s window, fetching a fresh token each time. `onReconnect` fires after every reconnect
 * so the screen can refetch whatever it missed during the gap. A 204 means live updates aren't
 * configured on the server: the hook stays idle.
 */
export function useLiveEvents(opts: {
  url: string | null
  getToken: () => Promise<string | null>
  onEvent: (event: LiveEvent) => void
  onReconnect?: () => void
}): void {
  const latest = useRef(opts)
  useEffect(() => {
    latest.current = opts
  })

  const { url } = opts
  useEffect(() => {
    if (!url) return
    let stopped = false
    let disabled = false
    let attempt = 0
    let connectedOnce = false
    let controller: AbortController | null = null
    let retry: ReturnType<typeof setTimeout> | undefined
    let hiddenTimer: ReturnType<typeof setTimeout> | undefined

    const schedule = (ms: number) => {
      // Hidden past the cutoff (no hiddenTimer left): stay down until the tab is shown.
      if (stopped || disabled || (document.visibilityState === "hidden" && hiddenTimer === undefined)) return
      clearTimeout(retry)
      retry = setTimeout(connect, ms)
    }

    async function connect() {
      if (stopped || disabled || controller) return
      const current = new AbortController()
      controller = current
      try {
        const token = await latest.current.getToken()
        const res = await fetch(url!, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          signal: current.signal,
          cache: "no-store",
        })
        if (res.status === 204) {
          disabled = true
          return
        }
        if (!res.ok || !res.body) throw new Error(`live stream ${res.status}`)
        if (connectedOnce) latest.current.onReconnect?.()
        connectedOnce = true
        attempt = 0

        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ""
        for (;;) {
          const { value, done } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const parsed = parseSseChunk(buffer)
          buffer = parsed.rest
          for (const event of parsed.events) latest.current.onEvent(event)
        }
        controller = null
        schedule(0) // the server closed its window: pick straight back up
      } catch {
        controller = null
        if (current.signal.aborted) return
        schedule(reconnectDelay(attempt++))
      }
    }

    const disconnect = () => {
      clearTimeout(retry)
      controller?.abort()
      controller = null
    }

    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        hiddenTimer = setTimeout(() => {
          hiddenTimer = undefined
          disconnect()
        }, HIDDEN_DISCONNECT_MS)
      } else {
        clearTimeout(hiddenTimer)
        hiddenTimer = undefined
        if (!controller) {
          attempt = 0
          void connect()
        }
      }
    }

    document.addEventListener("visibilitychange", onVisibility)
    void connect()
    return () => {
      stopped = true
      document.removeEventListener("visibilitychange", onVisibility)
      clearTimeout(hiddenTimer)
      disconnect()
    }
  }, [url])
}
