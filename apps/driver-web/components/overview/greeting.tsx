"use client"

import { useEffect, useState } from "react"

function getGreeting(hour: number): string {
  if (hour < 12) return "Good morning"
  if (hour < 17) return "Good afternoon"
  return "Good evening"
}

/** Computed client-side (after mount) so it reflects the viewer's local time
 * rather than the server's — this component renders inside a server-rendered
 * page, so a static string here would otherwise show whatever time zone the
 * server happens to be in. */
export function Greeting() {
  const [greeting, setGreeting] = useState<string | null>(null)

  useEffect(() => {
    setGreeting(getGreeting(new Date().getHours()))
  }, [])

  return <>{greeting ?? "Welcome back"}</>
}
