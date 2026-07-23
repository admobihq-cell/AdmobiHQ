"use client"

import { EntityPage, SimpleFormDialog } from "@/components/entity-page"
import { StatusBadge } from "@/components/status-badge"
import {
  LEAD_FORM_FIELDS,
  LEAD_STATUS_OPTIONS,
  leadFormFromRecord,
  leadFormToPayload,
} from "@workspace/ops-contracts"
import { formatDateTime, formatLabel, truncate } from "@/lib/format"

type Lead = {
  id: number
  contact_name: string
  email: string
  company_name: string
  phone: string | null
  cities: string[]
  ad_formats: string[]
  duration: string | null
  budget_range: string | null
  status: string | null
  additional_info: string | null
  created_at: string
}

const leadFields = LEAD_FORM_FIELDS

type LeadsViewProps = {
  initialData: {
    items: Lead[]
    total: number
    page: number
    pageSize: number
    totalPages: number
  }
}

export function LeadsView({ initialData }: LeadsViewProps) {
  return (
    <EntityPage<Lead>
      title="Campaign Leads"
      description="Advertisers who submitted campaign briefs or were added manually."
      apiPath="/v1/leads"
      initialData={initialData}
      getRecordTitle={(row) => row.contact_name}
      statusBulkOptions={LEAD_STATUS_OPTIONS}
      statusFilterOptions={LEAD_STATUS_OPTIONS}
      detailFields={[
        {
          key: "created_at",
          label: "Submitted",
          render: (r) => formatDateTime(r.created_at),
        },
        { key: "contact_name", label: "Contact", render: (r) => r.contact_name },
        { key: "company_name", label: "Company", render: (r) => r.company_name },
        { key: "email", label: "Email", render: (r) => r.email },
        { key: "phone", label: "Phone", render: (r) => r.phone ?? "—" },
        {
          key: "cities",
          label: "Cities",
          render: (r) => (r.cities.length ? r.cities.join(", ") : "—"),
        },
        {
          key: "ad_formats",
          label: "Ad formats",
          render: (r) => (r.ad_formats.length ? r.ad_formats.join(", ") : "—"),
        },
        {
          key: "duration",
          label: "Duration",
          render: (r) => formatLabel(r.duration),
        },
        {
          key: "budget_range",
          label: "Budget",
          render: (r) => formatLabel(r.budget_range),
        },
        {
          key: "status",
          label: "Status",
          render: (r) => <StatusBadge status={r.status} />,
        },
        {
          key: "additional_info",
          label: "Brief / notes",
          render: (r) => r.additional_info ?? "—",
        },
      ]}
      columns={[
        {
          key: "created_at",
          header: "Date",
          render: (r) => formatDateTime(r.created_at),
          csv: (r) => r.created_at,
        },
        {
          key: "contact_name",
          header: "Contact",
          render: (r) => r.contact_name,
          csv: (r) => r.contact_name,
        },
        {
          key: "company_name",
          header: "Company",
          render: (r) => r.company_name,
          csv: (r) => r.company_name,
        },
        {
          key: "email",
          header: "Email",
          render: (r) => r.email,
          csv: (r) => r.email,
        },
        {
          key: "budget_range",
          header: "Budget",
          render: (r) => formatLabel(r.budget_range),
          csv: (r) => r.budget_range,
        },
        {
          key: "status",
          header: "Status",
          render: (r) => <StatusBadge status={r.status} />,
          csv: (r) => r.status,
        },
        {
          key: "additional_info",
          header: "Brief",
          render: (r) => truncate(r.additional_info),
          csv: (r) => r.additional_info,
        },
      ]}
      renderForm={({ open, onOpenChange, initial, onSubmit, saving }) => (
        <SimpleFormDialog
          open={open}
          onOpenChange={onOpenChange}
          title={initial ? "Edit lead" : "Add lead"}
          fields={leadFields}
          initial={
            initial ? leadFormFromRecord(initial as never) : null
          }
          saving={saving}
          onSubmit={async (values) => {
            await onSubmit(leadFormToPayload(values as Record<string, string>))
          }}
        />
      )}
    />
  )
}
