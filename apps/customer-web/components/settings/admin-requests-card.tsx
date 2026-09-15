"use client"

import { useState } from "react"
import { useAuth } from "@clerk/nextjs"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import type { AdvertiserAdminRequestDto } from "@workspace/ops-contracts"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent } from "@workspace/ui/components/card"
import { Label } from "@workspace/ui/components/label"
import { Textarea } from "@workspace/ui/components/textarea"

import { listAdminRequests, requestAdminAccess, reviewAdminRequest } from "@/lib/org-client"

const KEY = ["customer-org-admin-requests"] as const

function StatusBadge({ status }: { status: AdvertiserAdminRequestDto["status"] }) {
  if (status === "approved") return <Badge variant="secondary">Approved</Badge>
  if (status === "denied") return <Badge variant="outline">Declined</Badge>
  if (status === "withdrawn") return <Badge variant="outline">Withdrawn</Badge>
  return <Badge>Awaiting review</Badge>
}

/**
 * Two views of one queue. Owners review requests; everyone else sees only
 * their own and can raise one. Promotion is owner-only, so this is the
 * sanctioned route for someone who needs more access than their role gives.
 */
export function AdminRequestsCard({ isOwner }: { isOwner: boolean }) {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()
  const [reason, setReason] = useState("")
  const [notes, setNotes] = useState<Record<number, string>>({})

  const requestsQuery = useQuery({
    queryKey: KEY,
    queryFn: () => listAdminRequests(getToken),
    retry: false,
  })

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: KEY })
    await queryClient.invalidateQueries({ queryKey: ["customer-org"] })
    await queryClient.invalidateQueries({ queryKey: ["customer-org-members"] })
  }

  const create = useMutation({
    mutationFn: () => requestAdminAccess(getToken, { reason: reason.trim() }),
    onSuccess: async () => {
      setReason("")
      toast.success("Request sent", { description: "An admin will review it." })
      await refresh()
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const review = useMutation({
    mutationFn: ({ id, decision }: { id: number; decision: "approve" | "deny" }) =>
      reviewAdminRequest(getToken, id, { decision, note: notes[id]?.trim() || undefined }),
    onSuccess: async (_r, { decision }) => {
      toast.success(decision === "approve" ? "Admin access granted" : "Request declined")
      await refresh()
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const requests = requestsQuery.data ?? []
  const pending = requests.filter((r) => r.status === "pending")
  const mine = requests.find((r) => r.status === "pending")

  if (!isOwner) {
    return (
      <Card>
        <CardContent className="space-y-4 p-6">
          <div>
            <h2 className="text-lg font-medium">Need admin access?</h2>
            <p className="text-sm text-muted-foreground">
              Only an admin can change roles, billing, or the team. Ask one to promote you and say
              why — they&apos;ll see your reason.
            </p>
          </div>

          {mine ? (
            <div className="rounded-lg border p-4 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="font-medium">Your request is awaiting review</span>
                <StatusBadge status={mine.status} />
              </div>
              <p className="mt-2 whitespace-pre-line text-muted-foreground">{mine.reason}</p>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="admin-reason">Why do you need admin access?</Label>
              <Textarea
                id="admin-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="I need to add our media buyer and submit campaigns while Jane is away."
                rows={3}
              />
              <Button
                disabled={reason.trim().length < 10 || create.isPending}
                loading={create.isPending}
                loadingText="Sending…"
                onClick={() => create.mutate()}
              >
                Request admin access
              </Button>
            </div>
          )}

          {requests
            .filter((r) => r.status !== "pending")
            .slice(0, 3)
            .map((r) => (
              <div key={r.id} className="rounded-lg border p-4 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">
                    Reviewed by {r.reviewedByName ?? "an admin"}
                  </span>
                  <StatusBadge status={r.status} />
                </div>
                {r.reviewNote ? <p className="mt-2">{r.reviewNote}</p> : null}
              </div>
            ))}
        </CardContent>
      </Card>
    )
  }

  if (!pending.length) return null

  return (
    <Card>
      <CardContent className="space-y-4 p-6">
        <div>
          <h2 className="text-lg font-medium">
            Admin access requests
            <Badge className="ml-2">{pending.length}</Badge>
          </h2>
          <p className="text-sm text-muted-foreground">
            Approving makes them a full admin — they&apos;ll be able to manage the team, billing and
            roles.
          </p>
        </div>

        {pending.map((request) => (
          <div key={request.id} className="space-y-3 rounded-lg border p-4">
            <div>
              <p className="text-sm font-medium">{request.name ?? request.email ?? "A teammate"}</p>
              {request.email ? (
                <p className="text-xs text-muted-foreground">{request.email}</p>
              ) : null}
            </div>
            <p className="whitespace-pre-line text-sm">{request.reason}</p>
            <Textarea
              value={notes[request.id] ?? ""}
              onChange={(e) => setNotes((prev) => ({ ...prev, [request.id]: e.target.value }))}
              placeholder="Add a note (required if you decline)"
              rows={2}
            />
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                className="flex-1"
                disabled={review.isPending}
                onClick={() => review.mutate({ id: request.id, decision: "approve" })}
              >
                Make admin
              </Button>
              <Button
                variant="outline"
                disabled={review.isPending || !(notes[request.id] ?? "").trim()}
                onClick={() => review.mutate({ id: request.id, decision: "deny" })}
              >
                Decline
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
