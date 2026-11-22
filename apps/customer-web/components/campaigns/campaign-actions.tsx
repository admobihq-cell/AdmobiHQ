"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Trash2, Undo2 } from "lucide-react"
import { canWithdrawCampaign, formatKes, nairobiDay, type CampaignDto } from "@workspace/ops-contracts"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog"
import { Button } from "@workspace/ui/components/button"
import { useDeleteCampaign, useWithdrawCampaign } from "@/lib/use-campaigns"
import { useOrgPermissions } from "@/lib/use-org"

/**
 * Delete (drafts, campaigns:write) and Withdraw (before the flight starts, campaigns:submit).
 * The API enforces both rules; the buttons only appear when the request would succeed.
 */
export function CampaignActions({ campaign }: { campaign: CampaignDto }) {
  const router = useRouter()
  const { can } = useOrgPermissions()
  const remove = useDeleteCampaign()
  const withdraw = useWithdrawCampaign()
  const [confirm, setConfirm] = useState<"delete" | "withdraw" | null>(null)

  const canDelete = campaign.status === "draft" && can("campaigns:write")
  const canWithdraw = can("campaigns:submit") && canWithdrawCampaign(campaign, nairobiDay(new Date()))
  if (!canDelete && !canWithdraw) return null

  return (
    <>
      {canDelete ? (
        <Button size="sm" variant="outline" onClick={() => setConfirm("delete")}>
          <Trash2 data-icon="inline-start" />
          Delete
        </Button>
      ) : null}
      {canWithdraw ? (
        <Button size="sm" variant="outline" onClick={() => setConfirm("withdraw")}>
          <Undo2 data-icon="inline-start" />
          Withdraw
        </Button>
      ) : null}

      <AlertDialog open={confirm != null} onOpenChange={(open) => !open && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirm === "delete" ? "Delete this draft?" : "Withdraw this campaign?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirm === "delete"
                ? `"${campaign.name}" will be deleted. Its artwork stays in your Media Library, and any payment you made stays in your balance.`
                : campaign.funded_at
                  ? `"${campaign.name}" won't run, and its ${formatKes(Number(campaign.budget_kes ?? 0))} budget goes back to your available balance, to use on another campaign or refund. This can't be undone.`
                  : `"${campaign.name}" won't run. This can't be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (confirm === "delete") {
                  remove.mutate(campaign.id, { onSuccess: () => router.push("/campaigns") })
                } else {
                  withdraw.mutate(campaign.id)
                }
              }}
            >
              {confirm === "delete" ? "Delete draft" : "Withdraw campaign"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
