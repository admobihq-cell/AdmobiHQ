"use client"

import { EntityPage, SimpleFormDialog } from "@/components/entity-page"
import {
  MEDIA_KIT_FORM_FIELDS,
  mediaKitFormFromRecord,
  mediaKitFormToPayload,
} from "@workspace/ops-contracts"
import { formatDateTime } from "@/lib/format"

type MediaKitRequest = {
  id: number
  name: string
  email: string
  created_at: string
}

const mediaKitFields = MEDIA_KIT_FORM_FIELDS

type MediaKitViewProps = {
  initialData: {
    items: MediaKitRequest[]
    total: number
    page: number
    pageSize: number
    totalPages: number
  }
}

export function MediaKitView({ initialData }: MediaKitViewProps) {
  return (
    <EntityPage<MediaKitRequest>
      title="Media Kit Requests"
      description="Marketers and agencies who requested the Admobi media kit."
      apiPath="/v1/media-kit"
      initialData={initialData}
      getRecordTitle={(row) => row.name}
      columns={[
        {
          key: "created_at",
          header: "Date",
          render: (r) => formatDateTime(r.created_at),
          csv: (r) => r.created_at,
        },
        { key: "name", header: "Name", render: (r) => r.name, csv: (r) => r.name },
        { key: "email", header: "Email", render: (r) => r.email, csv: (r) => r.email },
      ]}
      renderForm={({ open, onOpenChange, initial, onSubmit, saving }) => (
        <SimpleFormDialog
          open={open}
          onOpenChange={onOpenChange}
          title={initial ? "Edit request" : "Add request"}
          fields={mediaKitFields}
          initial={initial ? mediaKitFormFromRecord(initial as never) : null}
          saving={saving}
          onSubmit={async (values) => {
            await onSubmit(mediaKitFormToPayload(values as Record<string, string>))
          }}
        />
      )}
    />
  )
}
