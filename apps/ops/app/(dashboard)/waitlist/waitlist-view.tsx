"use client"

import { EntityPage, SimpleFormDialog } from "@/components/entity-page"
import {
  WAITLIST_FORM_FIELDS,
  waitlistFormFromRecord,
  waitlistFormToPayload,
} from "@workspace/ops-contracts"
import { formatDateTime, formatLabel } from "@/lib/format"

type WaitlistEntry = {
  id: number
  email: string
  source: string | null
  name: string | null
  persona: string | null
  created_at: string
}

const waitlistFields = WAITLIST_FORM_FIELDS

type WaitlistViewProps = {
  initialData: {
    items: WaitlistEntry[]
    total: number
    page: number
    pageSize: number
    totalPages: number
  }
}

export function WaitlistView({ initialData }: WaitlistViewProps) {
  return (
    <EntityPage<WaitlistEntry>
      title="Waitlist"
      description="Early-interest emails from homepage and other CTAs."
      apiPath="/v1/waitlist"
      initialData={initialData}
      getRecordTitle={(row) => row.email}
      columns={[
        {
          key: "created_at",
          header: "Joined",
          render: (r) => formatDateTime(r.created_at),
          csv: (r) => formatDateTime(r.created_at),
        },
        { key: "email", header: "Email", render: (r) => r.email, csv: (r) => r.email },
        {
          key: "source",
          header: "Source",
          render: (r) => r.source ?? "homepage",
          csv: (r) => r.source,
        },
        { key: "persona", header: "Persona", render: (r) => formatLabel(r.persona), csv: (r) => r.persona },
      ]}
      detailFields={[
        { key: "email", label: "Email", render: (r) => r.email },
        { key: "name", label: "Name", render: (r) => r.name ?? "—" },
        { key: "persona", label: "Persona", render: (r) => formatLabel(r.persona) },
        { key: "source", label: "Source", render: (r) => r.source ?? "homepage" },
        { key: "created_at", label: "Joined", render: (r) => formatDateTime(r.created_at) },
      ]}
      renderForm={({ open, onOpenChange, initial, onSubmit, saving }) => (
        <SimpleFormDialog
          open={open}
          onOpenChange={onOpenChange}
          title={initial ? "Edit waitlist entry" : "Add to waitlist"}
          fields={waitlistFields}
          initial={initial ? waitlistFormFromRecord(initial as never) : null}
          saving={saving}
          onSubmit={async (values) => {
            await onSubmit(waitlistFormToPayload(values as Record<string, string>))
          }}
        />
      )}
    />
  )
}
