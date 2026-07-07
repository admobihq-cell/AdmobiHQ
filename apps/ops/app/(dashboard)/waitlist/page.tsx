"use client"

import { EntityPage, SimpleFormDialog } from "@/components/entity-page"
import { formatDateTime } from "@/lib/format"

type WaitlistEntry = {
  id: number
  email: string
  source: string | null
  created_at: string
}

const waitlistFields = [
  { name: "email", label: "Email", type: "email", required: true },
  { name: "source", label: "Source" },
]

export default function WaitlistPage() {
  return (
    <EntityPage<WaitlistEntry>
      title="Waitlist"
      description="Early-interest emails from homepage and other CTAs."
      apiPath="/api/waitlist"
      columns={[
        {
          key: "created_at",
          header: "Joined",
          render: (r) => formatDateTime(r.created_at),
          csv: (r) => r.created_at,
        },
        { key: "email", header: "Email", render: (r) => r.email, csv: (r) => r.email },
        {
          key: "source",
          header: "Source",
          render: (r) => r.source ?? "homepage",
          csv: (r) => r.source,
        },
      ]}
      renderForm={({ open, onOpenChange, initial, onSubmit, saving }) => (
        <SimpleFormDialog
          open={open}
          onOpenChange={onOpenChange}
          title={initial ? "Edit waitlist entry" : "Add to waitlist"}
          fields={waitlistFields}
          initial={initial}
          saving={saving}
          onSubmit={onSubmit}
        />
      )}
    />
  )
}
