"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ChevronRight, Inbox, Plus } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { Card, CardContent } from "@workspace/ui/components/card"
import { Separator } from "@workspace/ui/components/separator"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@workspace/ui/components/sheet"

import { CaseListSkeleton } from "@/components/skeletons/case-list-skeleton"
import { NewSupportRequestForm } from "@/components/support/new-support-request-form"
import { SupportStatusBadge } from "@/components/support-status-badge"
import { useCustomerSession } from "@/lib/auth/customer-session"
import { getStoredIdentity, listMySupportCases, type SupportCase } from "@/lib/support-client"
import { CategoryIcon } from "@/lib/support-categories"

export function SupportClient() {
  const router = useRouter()
  const session = useCustomerSession()

  const [cases, setCases] = useState<SupportCase[]>([])
  const [loadingCases, setLoadingCases] = useState(true)
  const [newRequestOpen, setNewRequestOpen] = useState(false)

  const refreshCases = useCallback(async () => {
    setLoadingCases(true)
    try {
      const items = await listMySupportCases()
      setCases(items)
    } finally {
      setLoadingCases(false)
    }
  }, [])

  useEffect(() => {
    if (session.status !== "anonymous") return
    // Hydrating from localStorage — an external system — is exactly what
    // this effect is for; it can only run client-side, once, after the
    // session hook resolves.
    if (getStoredIdentity()) {
      void refreshCases()
    } else {
      setLoadingCases(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.status])

  function handleCreated(caseId: number) {
    setNewRequestOpen(false)
    router.push(`/settings/support/${caseId}`)
  }

  return (
    <div className="relative flex flex-1 flex-col gap-8 pb-20">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Help &amp; contact</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Reach the Admobi team about billing, campaigns, or anything else — we
          usually reply within one business day.
        </p>
      </div>

      {loadingCases ? (
        <CaseListSkeleton rows={3} />
      ) : cases.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed bg-muted/20 p-10 text-center">
          <Inbox className="size-5 text-muted-foreground" aria-hidden />
          <p className="text-sm font-medium">No requests yet</p>
          <p className="max-w-sm text-xs text-muted-foreground">
            Send a request below and the team&apos;s replies will show up here on
            this device.
          </p>
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

      <Sheet open={newRequestOpen} onOpenChange={setNewRequestOpen}>
        <SheetTrigger asChild>
          <Button className="fixed bottom-6 right-6 z-10 gap-2 rounded-full px-5 shadow-lg md:bottom-8 md:right-8">
            <Plus className="size-4" aria-hidden />
            New request
          </Button>
        </SheetTrigger>
        <SheetContent className="sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>New request</SheetTitle>
            <SheetDescription>
              We&apos;ll email you at the address below when the team replies.
            </SheetDescription>
          </SheetHeader>
          <NewSupportRequestForm onCreated={handleCreated} />
        </SheetContent>
      </Sheet>
    </div>
  )
}
