"use client"

import { useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import Link from "next/link"
import { ArrowLeft, Building2, MailPlus, MonitorPlay, Users } from "lucide-react"
import { toast } from "sonner"
import type {
  AdvertiserInvitationDto,
  AdvertiserMemberDto,
  OpsAdvertiserOrgCampaignSummaryDto,
} from "@workspace/ops-contracts"
import { formatApiError } from "@workspace/ops-api-client"

import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { AdvertiserOrgDetailSkeleton } from "@/components/advertiser-org-detail-skeleton"
import { StatusBadge } from "@/components/status-badge"
import { SectionCard, SectionEmpty } from "@/components/ui/section-card"
import { StatCard } from "@/components/ui/stat-card"
import { formatDate, formatDateTime } from "@/lib/format"
import { useOpsClient } from "@/lib/ops-client"

/** Two letters off the org name, so a member-less workspace still reads as an
 * identity rather than an empty tile. */
function monogram(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return "??"
  if (words.length === 1) return words[0]!.slice(0, 2).toUpperCase()
  return `${words[0]![0]}${words[1]![0]}`.toUpperCase()
}

function memberLabel(member: AdvertiserMemberDto): string {
  return member.name ?? member.email ?? member.clerkUserId
}

function MemberRow({ member }: { member: AdvertiserMemberDto }) {
  const label = memberLabel(member)
  const secondary = member.name ? member.email : null

  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
        {monogram(label)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{label}</p>
        <p className="truncate text-xs text-muted-foreground">
          {secondary ?? `Joined ${formatDate(member.joinedAt)}`}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <Badge variant={member.isOwner ? "default" : "outline"}>
          {member.isOwner ? "Owner" : (member.roleName ?? "Member")}
        </Badge>
        <span className="hidden w-24 text-right text-xs text-muted-foreground sm:block">
          {formatDate(member.joinedAt)}
        </span>
      </div>
    </li>
  )
}

function InvitationRow({ invitation }: { invitation: AdvertiserInvitationDto }) {
  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{invitation.email}</p>
        <p className="text-xs text-muted-foreground">Expires {formatDate(invitation.expiresAt)}</p>
      </div>
      <Badge variant="outline" className="shrink-0">
        {invitation.roleName ?? "Member"}
      </Badge>
    </li>
  )
}

function CampaignsTable({ campaigns }: { campaigns: OpsAdvertiserOrgCampaignSummaryDto[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="pl-4">Campaign</TableHead>
          <TableHead className="w-40">Status</TableHead>
          <TableHead className="w-44 pr-4 text-right">Submitted</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {campaigns.map((campaign) => (
          <TableRow key={campaign.id}>
            <TableCell className="p-0">
              <Link href={`/campaigns/${campaign.id}`} className="block px-4 py-2.5">
                <span className="block truncate font-medium">{campaign.name}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {campaign.createdByName ?? campaign.contactEmail ?? "—"}
                </span>
              </Link>
            </TableCell>
            <TableCell>
              <StatusBadge status={campaign.status} />
            </TableCell>
            <TableCell className="p-0 text-right">
              <Link
                href={`/campaigns/${campaign.id}`}
                className="block py-2.5 pr-4 text-xs tabular-nums text-muted-foreground"
              >
                {campaign.submittedAt ? formatDateTime(campaign.submittedAt) : "Not submitted"}
              </Link>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

export function AdvertiserOrgDetailView({ orgId }: { orgId: number }) {
  const client = useOpsClient()
  const query = useQuery({
    queryKey: ["ops-advertiser-org", orgId],
    queryFn: () => client.advertiserOrgs.get(orgId),
  })

  useEffect(() => {
    if (query.isError) toast.error(formatApiError(query.error))
  }, [query.isError, query.error])

  if (query.isLoading) return <AdvertiserOrgDetailSkeleton />

  const data = query.data
  if (!data) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-muted/20 px-6 py-20 text-center">
        <Building2 className="size-8 text-muted-foreground" aria-hidden />
        <p className="text-sm font-medium">Organization not found</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          It may have been removed, or the link points at an id that never existed.
        </p>
        <Button variant="outline" asChild className="mt-1">
          <Link href="/advertiser-orgs">Back to advertiser orgs</Link>
        </Button>
      </div>
    )
  }

  const name = data.name || "Untitled organization"

  return (
    <div className="flex w-full flex-1 flex-col gap-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon-sm" asChild>
          <Link href="/advertiser-orgs">
            <ArrowLeft aria-hidden />
            <span className="sr-only">Back to advertiser orgs</span>
          </Link>
        </Button>
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-sm font-semibold text-primary">
          {monogram(name)}
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-semibold tracking-tight">{name}</h1>
          <p className="text-sm text-muted-foreground">
            Org #{data.id} · Created {formatDate(data.createdAt)} · Updated{" "}
            {formatDateTime(data.updatedAt)}
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard icon={Users} label="Active members" value={data.memberCount} />
        <StatCard icon={MonitorPlay} label="Campaigns" value={data.campaignCount} />
        <StatCard
          icon={MailPlus}
          label="Pending invitations"
          value={data.invitations.length}
          hint={data.invitations.length > 0 ? "Awaiting acceptance" : undefined}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex flex-col gap-6">
          <SectionCard title="Members" count={data.members.length} flush>
            {data.members.length === 0 ? (
              <SectionEmpty>No active members.</SectionEmpty>
            ) : (
              <ul className="divide-y">
                {data.members.map((member) => (
                  <MemberRow key={member.id} member={member} />
                ))}
              </ul>
            )}
          </SectionCard>

          <SectionCard title="Campaigns" count={data.campaignCount} flush>
            {data.campaigns.length === 0 ? (
              <SectionEmpty>No campaigns on this org yet.</SectionEmpty>
            ) : (
              <CampaignsTable campaigns={data.campaigns} />
            )}
          </SectionCard>
        </div>

        <div className="flex flex-col gap-6">
          <SectionCard title="Pending invitations" count={data.invitations.length} flush>
            {data.invitations.length === 0 ? (
              <SectionEmpty>Nobody is waiting on an invite.</SectionEmpty>
            ) : (
              <ul className="divide-y">
                {data.invitations.map((invitation) => (
                  <InvitationRow key={invitation.id} invitation={invitation} />
                ))}
              </ul>
            )}
          </SectionCard>

          <SectionCard title="Activity" flush contentClassName="max-h-[420px] overflow-y-auto">
            {data.activity.length === 0 ? (
              <SectionEmpty>No recent activity.</SectionEmpty>
            ) : (
              <ol className="relative space-y-5 px-4 py-4 before:absolute before:bottom-6 before:left-[calc(1rem+3px)] before:top-6 before:w-px before:bg-border">
                {data.activity.map((item) => (
                  <li key={item.id} className="relative flex gap-3">
                    <span
                      className="mt-1.5 size-[7px] shrink-0 rounded-full bg-primary ring-4 ring-card"
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <p className="text-sm font-medium leading-snug">{item.label}</p>
                      {item.detail ? (
                        <p className="text-sm text-muted-foreground">{item.detail}</p>
                      ) : null}
                      <p className="text-xs text-muted-foreground">
                        {item.actorLabel} · {formatDateTime(item.createdAt)}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  )
}
