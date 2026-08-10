"use client"

import { useEffect, useState } from "react"
import { useUser } from "@clerk/nextjs"

import { isAuthEnabled } from "@/lib/auth/is-auth-enabled"

function getGreeting(hour: number): string {
  if (hour < 12) return "Good morning"
  if (hour < 17) return "Good afternoon"
  return "Good evening"
}

function useSignedInFirstName(): string | null {
  const { user } = useUser()
  return user?.firstName ?? null
}

function useNoFirstName(): string | null {
  return null
}

/**
 * Same "pick the hook once at module load" pattern as customer-session.ts —
 * useUser() must never run unless ClerkProvider is mounted.
 */
const useFirstName = isAuthEnabled() ? useSignedInFirstName : useNoFirstName

/** Computed client-side (after mount) so it reflects the viewer's local time
 * rather than the server's — this component renders inside a server-rendered
 * page, so a static string here would otherwise show whatever time zone the
 * server happens to be in. */
export function Greeting() {
  const [greeting, setGreeting] = useState<string | null>(null)
  const firstName = useFirstName()

  useEffect(() => {
    setGreeting(getGreeting(new Date().getHours()))
  }, [])

  const base = greeting ?? "Welcome back"
  return <>{firstName ? `${base}, ${firstName}` : base}</>
}
