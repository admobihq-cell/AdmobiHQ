"use client"

import { useEffect } from "react"

import { registerStaleDeployReload } from "@/lib/stale-deploy-reload"

/** Mount once in the root layout. See lib/stale-deploy-reload.ts. */
export function StaleDeployReload() {
  useEffect(() => registerStaleDeployReload(), [])
  return null
}
