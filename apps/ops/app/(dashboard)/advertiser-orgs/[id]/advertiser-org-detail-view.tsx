"use client"

import { useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { toast } from "sonner"
import { formatApiError } from "@workspace/ops-api-client"

import { Button } from "@workspace/ui/components/button"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { StatusBadge } from "@/components/status-badge"
import { formatDateTime } from "@/lib/format"
import { useOpsClient } from "@/lib/ops-client"

export function AdvertiserOrgDetailView({ orgId }: { orgId: number }) {
  const client = useOpsClient()
  const query = useQuery({
    queryKey: ["ops-advertiser-org", orgId],
    queryFn: () => client.advertiserOrgs.get(orgId),
  })

  useEffect(() => {
    if (query.isError) toast.error(formatApiError(query.error))
  }, [query.isError, query.error])

  if (query.isLoading) {
    return (
      <div className="flex flex-1 flex-col gap-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-40 w-full max-w-3xl" />
        <Skeleton className="h-40 w-full max-w-3xl" />
      </div>
    )
  }

  const data = query.data
  if (!data) {
    return (
      <div className="py-10 text-center text-muted-foreground">Organization not found.</div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-8">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon-sm" asChild>
          <Link href="/advertiser-orgs">
            <ArrowLeft aria-hidden />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-lg font-semibold">{data.name || "Untitled organization"}</h1>
          <p className="text-sm text-muted-foreground">
            {data.memberCount} member{data.memberCount === 1 ? "" : "s"} · {data.campaignCount}{" "}
            campaign{data.campaignCount === 1 ? "" : "s"} · Created {formatDateTime(data.createdAt)}
          </p>
        </div>
      </div>

      <section className="max-w-3xl space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Members
        </h2>
        <div className="overflow-hidden rounded-xl border bg-card shadow-none">
          {data.members.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">No active members.</p>
          ) : (
            <ul className="divide-y">
              {data.members.map((member) => (
                <li key={member.id} className="flex items-start justify-between gap-4 px-4 py-3 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium">{member.name ?? member.email ?? member.clerkUserId}</p>
                    <p className="truncate text-muted-foreground">
                      {member.email ?? member.clerkUserId}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-medium">{member.isOwner ? "Admin" : (member.roleName ?? "Member")}</p>
                    <p className="text-xs text-muted-foreground">
                      Joined {formatDateTime(member.joinedAt)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {data.invitations.length > 0 ? (
        <section className="max-w-3xl space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Pending invitations
          </h2>
          <div className="overflow-hidden rounded-xl border bg-card shadow-none">
            <ul className="divide-y">
              {data.invitations.map((invite) => (
                <li key={invite.id} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
                  <span>{invite.email}</span>
                  <span className="text-muted-foreground">{invite.roleName ?? "Member"}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      <section className="max-w-3xl space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Campaigns
        </h2>
        <div className="overflow-hidden rounded-xl border bg-card shadow-none">
          {data.campaigns.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">No campaigns on this org yet.</p>
          ) : (
            <ul className="divide-y">
              {data.campaigns.map((campaign) => (
                <li key={campaign.id}>
                  <Link
                    href={`/campaigns/${campaign.id}`}
                    className="flex items-center justify-between gap-4 px-4 py-3 text-sm hover:bg-muted/40"
                  >
                    <div className="min-w-0">
                      <p className="font-medium">{campaign.name}</p>
                      <p className="truncate text-muted-foreground">
                        {campaign.contactEmail ?? "—"}
                        {campaign.submittedAt
                          ? ` · Submitted ${formatDateTime(campaign.submittedAt)}`
                          : ""}
                      </p>
                    </div>
                    <StatusBadge status={campaign.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="max-w-3xl space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Activity
        </h2>
        <div className="overflow-hidden rounded-xl border bg-card shadow-none">
          {data.activity.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">No recent activity.</p>
          ) : (
            <ul className="divide-y">
              {data.activity.map((item) => (
                <li key={item.id} className="space-y-1 px-4 py-3 text-sm">
                  <div className="flex items-start justify-between gap-4">
                    <p className="font-medium">{item.label}</p>
                    <p className="shrink-0 text-xs text-muted-foreground">
                      {formatDateTime(item.createdAt)}
                    </p>
                  </div>
                  <p className="text-muted-foreground">
                    {item.actorLabel}
                    {item.detail ? ` · ${item.detail}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  )
}
