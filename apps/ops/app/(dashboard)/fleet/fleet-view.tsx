"use client"

import { EntityPage, SimpleFormDialog } from "@/components/entity-page"
import { StatusBadge } from "@/components/status-badge"
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

const fleetFields = [
  { name: "company_name", label: "Company", required: true },
  { name: "primary_contact_name", label: "Contact name", required: true },
  { name: "email", label: "Email", type: "email", required: true },
  { name: "phone", label: "Phone", required: true },
  {
    name: "city",
    label: "City",
    required: true,
    options: [
      { value: "Nairobi", label: "Nairobi" },
      { value: "Mombasa", label: "Mombasa" },
      { value: "Kisumu", label: "Kisumu" },
    ],
  },
  { name: "fleet_types", label: "Fleet types (comma-separated: taxi, delivery_bike)" },
  { name: "fleet_size", label: "Fleet size" },
  {
    name: "vehicles_active",
    label: "Vehicles active",
    options: [
      { value: "yes", label: "Yes" },
      { value: "no", label: "No" },
      { value: "some", label: "Some" },
    ],
  },
  {
    name: "status",
    label: "Status",
    options: [
      { value: "pending", label: "Pending" },
      { value: "verified", label: "Verified" },
      { value: "active", label: "Active" },
    ],
  },
  { name: "notes", label: "Notes" },
]

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
      apiPath="/api/fleet"
      initialData={initialData}
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
          initial={
            initial
              ? { ...initial, fleet_types: initial.fleet_types.join(", ") }
              : null
          }
          saving={saving}
          onSubmit={async (values) => {
            await onSubmit({
              ...values,
              fleet_types: String(values.fleet_types ?? "")
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
