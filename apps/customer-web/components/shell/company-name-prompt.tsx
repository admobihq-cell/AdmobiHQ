"use client"

import { useState } from "react"
import { useUser } from "@clerk/nextjs"

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
import { readCompanyName, withCompanyName } from "@/lib/company-name"

function useSignedInUser() {
  return useUser()
}

function useNoUser() {
  return { user: null, isLoaded: true }
}

/**
 * Same "pick the hook once at module load" pattern as app-shell.tsx —
 * useUser() must never run unless ClerkProvider is mounted.
 */
const useUserIfEnabled = isAuthEnabled() ? useSignedInUser : useNoUser

/**
 * Advertisers who sign up with Google never get asked for a company — Google's
 * consent screen has no field for it and Clerk owns that step. Ops needs the
 * value (readCompanyName in apps/api/lib/customer-clerk.ts reads exactly this
 * key), so collect it on first load for anyone who arrived without one.
 *
 * unsafeMetadata is client-writable, which is what makes this possible without
 * an API route — the same field <AdvertiserSignUp> writes at sign-up.
 */
export function CompanyNamePrompt() {
  const { user, isLoaded } = useUserIfEnabled()
  const [company, setCompany] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const open = isLoaded && Boolean(user) && !readCompanyName(user?.unsafeMetadata)

  async function handleSave() {
    if (!user || !company.trim()) return
    setSaving(true)
    setError(null)
    try {
      await user.update({ unsafeMetadata: withCompanyName(user.unsafeMetadata, company) })
      // No setSaving(false) on success — `open` flips false as soon as Clerk's
      // user object refreshes, and the dialog unmounts.
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
