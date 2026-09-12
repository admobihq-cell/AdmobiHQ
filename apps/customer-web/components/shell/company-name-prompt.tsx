"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@clerk/nextjs"

import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"

import { isAuthEnabled } from "@/lib/auth/is-auth-enabled"
import { getOrg, renameOrg } from "@/lib/org-client"

function useSignedInAuth() {
  return useAuth()
}

function useNoAuth() {
  return {
    isLoaded: true,
    isSignedIn: false,
    getToken: async () => null as string | null,
  }
}

const useAuthIfEnabled = isAuthEnabled() ? useSignedInAuth : useNoAuth

/**
 * Collects an organization name when the org was bootstrapped with an empty
 * name (typical for Google SSO that skipped the optional company field).
 * Writes through PATCH /v1/customer/org — Postgres owns the name, not Clerk
 * unsafeMetadata.
 */
export function CompanyNamePrompt() {
  const { isLoaded, isSignedIn, getToken } = useAuthIfEnabled()
  const [company, setCompany] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [needsName, setNeedsName] = useState(false)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    if (!isLoaded || !isSignedIn || checked) return
    let cancelled = false
    void getOrg(getToken)
      .then((org) => {
        if (cancelled) return
        setNeedsName(!org.name.trim())
        setChecked(true)
      })
      .catch(() => {
        if (cancelled) return
        setChecked(true)
      })
    return () => {
      cancelled = true
    }
  }, [checked, getToken, isLoaded, isSignedIn])

  const open = checked && needsName

  async function handleSave() {
    if (!company.trim()) return
    setSaving(true)
    setError(null)
    try {
      await renameOrg(getToken, { name: company.trim() })
      setNeedsName(false)
      window.dispatchEvent(
        new CustomEvent("customer-org-named", { detail: { name: company.trim() } }),
      )
    } catch {
      setError("Could not save that. Try again.")
      setSaving(false)
    }
  }

  return (
    <Dialog open={open}>
      <DialogContent showCloseButton={false} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>One last thing</DialogTitle>
          <DialogDescription>
            Tell us the company or organization you&apos;re booking campaigns for. It shows on
            your campaigns so our team knows who to talk to.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="prompt-company">Company or organization</Label>
          <Input
            id="prompt-company"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="Acme Media"
            autoComplete="organization"
            disabled={saving}
            onKeyDown={(e) => {
              if (e.key === "Enter") void handleSave()
            }}
            autoFocus
          />
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>
        <DialogFooter>
          <Button
            className="w-full"
            disabled={saving || !company.trim()}
            loading={saving}
            loadingText="Saving…"
            onClick={() => void handleSave()}
          >
            Save and continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
