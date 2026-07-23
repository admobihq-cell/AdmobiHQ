"use client"

import { EntityPage, SimpleFormDialog } from "@/components/entity-page"
import { StatusBadge } from "@/components/status-badge"
import {
  DRIVER_FORM_FIELDS,
  DRIVER_STATUS_OPTIONS,
  driverFormFromRecord,
  driverFormToPayload,
} from "@workspace/ops-contracts"
import { formatDateTime, formatLabel } from "@/lib/format"

type Driver = {
  id: number
  name: string
  phone: string
  email: string | null
  city: string
  vehicle_type: string | null
  days_per_week: string | null
  heard_about: string | null
  status: string | null
  notes: string | null
  created_at: string
}

const driverFields = DRIVER_FORM_FIELDS

type DriversViewProps = {
  initialData: {
    items: Driver[]
    total: number
    page: number
    pageSize: number
    totalPages: number
  }
}

export function DriversView({ initialData }: DriversViewProps) {
  return (
    <EntityPage<Driver>
      title="Drivers"
      description="Driver onboarding applications and walk-in registrations."
      apiPath="/v1/drivers"
      initialData={initialData}
      getRecordTitle={(row) => row.name}
      statusBulkOptions={DRIVER_STATUS_OPTIONS}
      statusFilterOptions={DRIVER_STATUS_OPTIONS}
      detailFields={[
        {
          key: "created_at",
          label: "Submitted",
          render: (r) => formatDateTime(r.created_at),
        },
        { key: "name", label: "Name", render: (r) => r.name },
        { key: "phone", label: "Phone", render: (r) => r.phone },
        { key: "email", label: "Email", render: (r) => r.email ?? "—" },
        { key: "city", label: "City", render: (r) => r.city },
        {
          key: "vehicle_type",
          label: "Vehicle type",
          render: (r) => formatLabel(r.vehicle_type),
        },
        {
          key: "days_per_week",
          label: "Days per week",
          render: (r) => formatLabel(r.days_per_week),
        },
        {
          key: "heard_about",
          label: "Heard about",
          render: (r) => formatLabel(r.heard_about),
        },
        {
          key: "status",
          label: "Status",
          render: (r) => <StatusBadge status={r.status} />,
        },
        { key: "notes", label: "Internal notes", render: (r) => r.notes ?? "—" },
      ]}
      columns={[
        {
          key: "created_at",
          header: "Date",
          render: (r) => formatDateTime(r.created_at),
          csv: (r) => r.created_at,
        },
        { key: "name", header: "Name", render: (r) => r.name, csv: (r) => r.name },
        { key: "phone", header: "Phone", render: (r) => r.phone, csv: (r) => r.phone },
        { key: "city", header: "City", render: (r) => r.city, csv: (r) => r.city },
        {
          key: "vehicle_type",
          header: "Vehicle",
          render: (r) => formatLabel(r.vehicle_type),
          csv: (r) => r.vehicle_type,
        },
        {
          key: "heard_about",
          header: "Source",
          render: (r) => formatLabel(r.heard_about),
          csv: (r) => r.heard_about,
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
          title={initial ? "Edit driver" : "Add driver"}
          fields={driverFields}
          initial={initial ? driverFormFromRecord(initial as never) : null}
          saving={saving}
          onSubmit={async (values) => {
            await onSubmit(driverFormToPayload(values as Record<string, string>))
          }}
        />
      )}
    />
  )
}
