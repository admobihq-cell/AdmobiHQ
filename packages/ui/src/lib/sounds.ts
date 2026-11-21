"use client"

import { useSyncExternalStore } from "react"

/**
 * Three short UI tones made with Web Audio — no audio files, nothing to license. Played only for
 * live toasts, only after the page has had a user gesture (browsers block audio before that), and
 * never when muted. With several tabs open one plays: a visible tab plays at once, hidden tabs
 * wait a beat and stand down if another tab already played the same alert.
 */
export type SoundName = "chime" | "ping" | "low"

const MUTED_KEY = "admobi-live-sound-muted"
const MUTE_EVENT = "admobi-live-sound-muted-change"

/** Notes as [frequency Hz, start offset s]; each note is a soft ~180 ms envelope. */
const TONES: Record<SoundName, { type: OscillatorType; notes: [number, number][] }> = {
  chime: { type: "sine", notes: [[880, 0], [1318.5, 0.09]] },
  ping: { type: "triangle", notes: [[1046.5, 0], [1568, 0.07]] },
  low: { type: "sine", notes: [[523.25, 0], [392, 0.12]] },
}

let unlocked = false
let audio: AudioContext | null = null
const played = new Set<string>()
let channel: BroadcastChannel | null = null

if (typeof window !== "undefined") {
  const unlock = () => {
    unlocked = true
    window.removeEventListener("pointerdown", unlock)
    window.removeEventListener("keydown", unlock)
  }
  window.addEventListener("pointerdown", unlock)
  window.addEventListener("keydown", unlock)
  if (typeof BroadcastChannel !== "undefined") {
    channel = new BroadcastChannel("admobi-live-sound")
    channel.addEventListener("message", (event: MessageEvent<string>) => played.add(event.data))
  }
}

function readMuted(): boolean {
  try {
    return localStorage.getItem(MUTED_KEY) === "1"
  } catch {
    return false
  }
}

function tone(name: SoundName) {
  try {
    audio ??= new AudioContext()
    const { type, notes } = TONES[name]
    const start = audio.currentTime + 0.01
    for (const [frequency, offset] of notes) {
      const osc = audio.createOscillator()
      const gain = audio.createGain()
      osc.type = type
      osc.frequency.value = frequency
      const t = start + offset
      gain.gain.setValueAtTime(0.0001, t)
      gain.gain.exponentialRampToValueAtTime(0.12, t + 0.015)
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.18)
      osc.connect(gain).connect(audio.destination)
      osc.start(t)
      osc.stop(t + 0.2)
    }
  } catch {
    // no audio device / blocked: a silent toast is fine
  }
}

/** `key` identifies the alert so several tabs don't all chime for the same one. */
export function playSound(name: SoundName, key?: string): void {
  if (typeof window === "undefined" || !unlocked || readMuted()) return
  const go = () => {
    if (key) {
      if (played.has(key)) return
      played.add(key)
      channel?.postMessage(key)
    }
    tone(name)
  }
  if (!key || document.visibilityState === "visible") go()
  else setTimeout(go, 60 + Math.random() * 240)
}

function subscribe(onChange: () => void) {
  window.addEventListener(MUTE_EVENT, onChange)
  window.addEventListener("storage", onChange)
  return () => {
    window.removeEventListener(MUTE_EVENT, onChange)
    window.removeEventListener("storage", onChange)
  }
}

/** Per-device mute for live alert sounds. */
export function useSoundMuted(): [muted: boolean, setMuted: (value: boolean) => void] {
  const muted = useSyncExternalStore(subscribe, readMuted, () => false)
  const setMuted = (value: boolean) => {
    try {
      if (value) localStorage.setItem(MUTED_KEY, "1")
      else localStorage.removeItem(MUTED_KEY)
    } catch {
      // storage blocked: the toggle just won't stick
    }
    window.dispatchEvent(new Event(MUTE_EVENT))
  }
  return [muted, setMuted]
}
