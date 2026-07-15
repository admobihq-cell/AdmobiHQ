"use client"

import { EntityPage, SimpleFormDialog } from "@/components/entity-page"
import { StatusBadge } from "@/components/status-badge"
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

const leadFields = [
  { name: "contact_name", label: "Contact name", required: true },
  { name: "email", label: "Email", type: "email", required: true },
  { name: "company_name", label: "Company", required: true },
  { name: "phone", label: "Phone" },
  { name: "cities", label: "Cities (comma-separated)" },
  { name: "ad_formats", label: "Ad formats (comma-separated)" },
  {
    name: "duration",
    label: "Duration",
    options: [
      { value: "1_day", label: "1 day" },
      { value: "1_week", label: "1 week" },
      { value: "2_weeks", label: "2 weeks" },
      { value: "1_month", label: "1 month" },
      { value: "ongoing", label: "Ongoing" },
    ],
  },
  {
    name: "budget_range",
    label: "Budget",
    options: [
      { value: "under_50k", label: "Under 50k" },
      { value: "50k_150k", label: "50k – 150k" },
      { value: "150k_500k", label: "150k – 500k" },
      { value: "500k_plus", label: "500k+" },
      { value: "not_sure", label: "Not sure" },
    ],
  },
  {
    name: "status",
    label: "Status",
    options: [
      { value: "new", label: "New" },
      { value: "contacted", label: "Contacted" },
      { value: "qualified", label: "Qualified" },
      { value: "closed", label: "Closed" },
    ],
  },
  { name: "additional_info", label: "Brief / notes" },
]

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
      apiPath="/api/leads"
      initialData={initialData}
      getRecordTitle={(row) => row.contact_name}
      statusBulkOptions={[
        { value: "new", label: "New" },
        { value: "contacted", label: "Contacted" },
        { value: "qualified", label: "Qualified" },
        { value: "closed", label: "Closed" },
      ]}
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
            initial
              ? {
                  ...initial,
                  cities: initial.cities.join(", "),
                  ad_formats: initial.ad_formats.join(", "),
                }
              : null
          }
          saving={saving}
          onSubmit={async (values) => {
            await onSubmit({
              ...values,
              cities: String(values.cities ?? "")
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean),
              ad_formats: String(values.ad_formats ?? "")
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean),
            })
          }}
        />
      )}
    />
  )
}
