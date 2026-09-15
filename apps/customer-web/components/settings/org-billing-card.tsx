"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@clerk/nextjs"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { type AdvertiserOrgDto, orgCan } from "@workspace/ops-contracts"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent } from "@workspace/ui/components/card"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"

import { updateOrg } from "@/lib/org-client"

/**
 * Invoice recipient and KRA PIN. These belong to the company, not whoever is
 * admin today — Kenyan tax invoices are issued against a company PIN, so the
 * fields exist on the org ahead of the Pesapal work that will consume them.
 */
export function OrgBillingCard({ org }: { org: AdvertiserOrgDto | undefined }) {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()
  const [billingEmail, setBillingEmail] = useState("")
  const [taxPin, setTaxPin] = useState("")

  useEffect(() => {
    setBillingEmail(org?.billingEmail ?? "")
    setTaxPin(org?.taxPin ?? "")
  }, [org?.billingEmail, org?.taxPin])

  const save = useMutation({
    mutationFn: () =>
      updateOrg(getToken, {
        billingEmail: billingEmail.trim() || null,
        taxPin: taxPin.trim() || null,
      }),
    onSuccess: async () => {
      toast.success("Billing details saved")
      await queryClient.invalidateQueries({ queryKey: ["customer-org"] })
    },
    onError: (error: Error) => toast.error(error.message),
  })

  if (!orgCan(org, "billing:read")) return null

  const canWrite = orgCan(org, "billing:write")
  const dirty =
    billingEmail.trim() !== (org?.billingEmail ?? "") || taxPin.trim() !== (org?.taxPin ?? "")

  return (
    <Card>
      <CardContent className="space-y-4 p-6">
        <div>
          <h2 className="text-lg font-medium">Billing details</h2>
          <p className="text-sm text-muted-foreground">
            Where invoices go, and the KRA PIN they&apos;re issued against.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="billing-email">Billing email</Label>
            <Input
              id="billing-email"
              type="email"
              value={billingEmail}
              onChange={(e) => setBillingEmail(e.target.value)}
              placeholder="finance@company.co.ke"
              disabled={!canWrite}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tax-pin">KRA PIN</Label>
            <Input
              id="tax-pin"
              value={taxPin}
              onChange={(e) => setTaxPin(e.target.value.toUpperCase())}
              placeholder="P051234567M"
              disabled={!canWrite}
            />
          </div>
        </div>
        {canWrite ? (
          <Button
            disabled={!dirty || save.isPending}
            loading={save.isPending}
            onClick={() => save.mutate()}
          >
            Save billing details
          </Button>
        ) : null}
      </CardContent>
    </Card>
  )
}
