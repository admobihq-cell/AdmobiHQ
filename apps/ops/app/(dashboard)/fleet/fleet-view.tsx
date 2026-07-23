"use client"

import { EntityPage, SimpleFormDialog } from "@/components/entity-page"
import { StatusBadge } from "@/components/status-badge"
import {
  FLEET_FORM_FIELDS,
  FLEET_STATUS_OPTIONS,
  fleetFormFromRecord,
  fleetFormToPayload,
} from "@workspace/ops-contracts"
import { formatDateTime, formatLabel } from "@/lib/format"

type FleetPartner = {
  id: number
  company_name: string
  primary_contact_name: string
  email: string
  phone: string
  city: string
  fleet_types: string[]
  fleet_size: string | null
  vehicles_active: string | null
  status: string | null
  notes: string | null
  created_at: string
}

const fleetFields = FLEET_FORM_FIELDS

type FleetViewProps = {
  initialData: {
    items: FleetPartner[]
    total: number
    page: number
    pageSize: number
    totalPages: number
  }
}

export function FleetView({ initialData }: FleetViewProps) {
  return (
    <EntityPage<FleetPartner>
      title="Fleet Partners"
      description="Fleet operators applying to join the Admobi network."
      apiPath="/v1/fleet"
      initialData={initialData}
      getRecordTitle={(row) => row.company_name}
      statusBulkOptions={FLEET_STATUS_OPTIONS}
      statusFilterOptions={FLEET_STATUS_OPTIONS}
      detailFields={[
        {
          key: "created_at",
          label: "Submitted",
          render: (r) => formatDateTime(r.created_at),
        },
        { key: "company_name", label: "Company", render: (r) => r.company_name },
        {
          key: "primary_contact_name",
          label: "Contact",
          render: (r) => r.primary_contact_name,
        },
        { key: "email", label: "Email", render: (r) => r.email },
        { key: "phone", label: "Phone", render: (r) => r.phone },
        { key: "city", label: "City", render: (r) => r.city },
        {
          key: "fleet_types",
          label: "Fleet types",
          render: (r) => (r.fleet_types.length ? r.fleet_types.join(", ") : "—"),
        },
        { key: "fleet_size", label: "Fleet size", render: (r) => r.fleet_size ?? "—" },
        {
          key: "vehicles_active",
          label: "Vehicles active",
          render: (r) => formatLabel(r.vehicles_active),
        },
        {
          key: "status",
          label: "Status",
          render: (r) => <StatusBadge status={r.status} />,
        },
        { key: "notes", label: "Notes", render: (r) => r.notes ?? "—" },
      ]}
      columns={[
        {
          key: "created_at",
          header: "Date",
          render: (r) => formatDateTime(r.created_at),
          csv: (r) => r.created_at,
        },
        {
          key: "company_name",
          header: "Company",
          render: (r) => r.company_name,
          csv: (r) => r.company_name,
        },
        {
          key: "primary_contact_name",
          header: "Contact",
          render: (r) => r.primary_contact_name,
          csv: (r) => r.primary_contact_name,
        },
        {
          key: "city",
          header: "City",
          render: (r) => r.city,
          csv: (r) => r.city,
        },
        {
          key: "fleet_size",
          header: "Size",
          render: (r) => r.fleet_size ?? "—",
          csv: (r) => r.fleet_size,
        },
        {
          key: "status",
          header: "Status",
          render: (r) => <StatusBadge status={r.status} />,
          csv: (r) => r.status,
        },
      ]}
      renderForm={({ open, onOpenChange, initial, onSubmit, saving }) => (
        <SimpleFormDialog
          open={open}
          onOpenChange={onOpenChange}
          title={initial ? "Edit fleet partner" : "Add fleet partner"}
          fields={fleetFields}
          initial={initial ? fleetFormFromRecord(initial as never) : null}
          saving={saving}
          onSubmit={async (values) => {
            await onSubmit(fleetFormToPayload(values as Record<string, string>))
          }}
        />
      )}
    />
  )
}
