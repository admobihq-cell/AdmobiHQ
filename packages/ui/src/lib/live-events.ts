"use client"

import { useEffect, useRef } from "react"

import {
  nextLiveStep,
  parseSseChunk,
  type LiveEvent,
  type LiveOutcome,
  type LiveState,
} from "@workspace/ops-contracts"

/** A hidden tab drops its stream after this long and reconnects when it's shown again. */
const HIDDEN_DISCONNECT_MS = 5 * 60_000

/**
 * Holds one SSE stream to `url` with a bearer token (EventSource can't send headers, so this is
 * `fetch` plus a stream reader), fetching a fresh token for every connect. The policy is
 * `nextLiveStep` (tested in ops-contracts): the server's planned ~280 s close reconnects at once
 * with no refetch, so a tab left open never wakes the database; an early end, an error or a long
 * hidden spell backs off and fires `onReconnect` on the next good connect so the screen refetches
 * what it missed. 204 (not configured), 403, or repeated 401s stop the hook for good.
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
    // gap: events may have been missed since the last good stream, so the next connect refetches.
    let state: LiveState = { attempt: 0, authFailures: 0, gap: false }
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
      let startedAt = 0
      let outcome: LiveOutcome
      try {
        const token = await latest.current.getToken()
        const res = await fetch(url!, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          signal: current.signal,
          cache: "no-store",
        })
        if (res.status !== 200 || !res.body) {
          outcome = { kind: "http", status: res.status }
        } else {
          startedAt = Date.now()
          if (state.gap) latest.current.onReconnect?.()
          state = { ...state, gap: false }
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
          outcome = { kind: "ended", uptimeMs: Date.now() - startedAt }
        }
      } catch {
        if (current.signal.aborted) {
          if (controller === current) controller = null
          return
        }
        outcome = { kind: "error", uptimeMs: startedAt ? Date.now() - startedAt : 0 }
      }
      controller = null
      // Planned close: straight back up, no refetch. Early end or error: back off, refetch on
      // the next good connect. 204/403, or repeated 401s: stop for good.
      const step = nextLiveStep(outcome, state)
      state = { attempt: step.attempt, authFailures: step.authFailures, gap: step.gap }
      if (step.stop) {
        disabled = true
        return
      }
      schedule(step.delayMs)
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
          state = { ...state, gap: true }
        }, HIDDEN_DISCONNECT_MS)
      } else {
        clearTimeout(hiddenTimer)
        hiddenTimer = undefined
        if (!controller && !disabled) {
          state = { ...state, attempt: 0 }
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
