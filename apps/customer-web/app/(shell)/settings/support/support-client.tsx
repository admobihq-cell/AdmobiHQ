"use client"

import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { useAuth } from "@clerk/nextjs"
import Link from "next/link"
import { ChevronRight, Inbox, Plus } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { Card, CardContent } from "@workspace/ui/components/card"
import { Separator } from "@workspace/ui/components/separator"

import { CaseListSkeleton } from "@/components/skeletons/case-list-skeleton"
import { SupportStatusBadge } from "@/components/support-status-badge"
import { useCustomerSession } from "@/lib/auth/customer-session"
import {
  getStoredIdentity,
  listMySupportCases,
  listMySupportCasesForAccount,
} from "@/lib/support-client"
import { CategoryIcon } from "@/lib/support-categories"

export function SupportClient() {
  const session = useCustomerSession()
  const { getToken } = useAuth()

  // getStoredIdentity() guards its own localStorage access, so it's safe to
  // call during render — memoized on session status so its result stays
  // referentially stable across re-renders.
  const hasIdentity = useMemo(
    () => session.status === "anonymous" && Boolean(getStoredIdentity()),
    [session.status],
  )
  const isAuthenticated = session.status === "authenticated"

  const casesQuery = useQuery({
    queryKey: isAuthenticated ? ["customer-support-cases", "account"] : ["customer-support-cases"],
    queryFn: async () => {
      if (isAuthenticated) {
        const token = await getToken()
        return token ? listMySupportCasesForAccount(token) : []
      }
      return listMySupportCases()
    },
    enabled: hasIdentity || isAuthenticated,
  })
  const cases = casesQuery.data ?? []
  // Keep showing the skeleton while the session is still resolving (before
  // hasIdentity/isAuthenticated can even be known) so a first-time-this-tab
  // visitor doesn't flash the "no requests yet" empty state before the
  // query has a chance to run.
  const loadingCases =
    session.status === "loading" || ((hasIdentity || isAuthenticated) && casesQuery.isLoading)

  return (
    <div className="relative flex flex-1 flex-col gap-8 pb-20">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">Help &amp; contact</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Reach the Admobi team about billing, campaigns, or anything else — we usually reply
            within one business day.
          </p>
        </div>
        <Button asChild className="w-fit">
          <Link href="/settings/support/new">
            <Plus data-icon="inline-start" />
            New request
          </Link>
        </Button>
      </div>

      {loadingCases ? (
        <CaseListSkeleton rows={3} />
      ) : cases.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed bg-muted/20 p-10 text-center">
          <Inbox className="size-5 text-muted-foreground" aria-hidden />
          <p className="text-sm font-medium">No requests yet</p>
          <p className="max-w-sm text-xs text-muted-foreground">
            Send a request and the team&apos;s replies will show up here on this device.
          </p>
          <Button asChild variant="outline" className="mt-2">
            <Link href="/settings/support/new">
              <Plus data-icon="inline-start" />
              New request
            </Link>
          </Button>
        </div>
      ) : (
        <Card className="shadow-none">
          <CardContent className="p-0">
            {cases.map((item, index) => (
              <div key={item.id}>
                {index > 0 ? <Separator /> : null}
                <Link
                  href={`/settings/support/${item.id}`}
                  className="flex items-center gap-3 p-4 text-sm transition-colors hover:bg-accent"
                >
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary">
                    <CategoryIcon value={item.category} className="size-4 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{item.subject}</p>
                    <p className="text-xs text-muted-foreground">
                      #{item.id} · {new Date(item.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <SupportStatusBadge status={item.status} />
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                </Link>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
