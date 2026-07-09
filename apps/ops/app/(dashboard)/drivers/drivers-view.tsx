"use client"

import { EntityPage, SimpleFormDialog } from "@/components/entity-page"
import { StatusBadge } from "@/components/status-badge"
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

const driverFields = [
  { name: "name", label: "Name", required: true },
  { name: "phone", label: "Phone", required: true },
  { name: "email", label: "Email", type: "email" },
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
  {
    name: "vehicle_type",
    label: "Vehicle type",
    options: [
      { value: "taxi", label: "Taxi" },
      { value: "delivery_bike", label: "Delivery bike" },
      { value: "three_wheeler", label: "Three wheeler" },
      { value: "other", label: "Other" },
    ],
  },
  {
    name: "days_per_week",
    label: "Days per week",
    options: [
      { value: "1_2", label: "1–2" },
      { value: "3_4", label: "3–4" },
      { value: "5_6", label: "5–6" },
      { value: "daily", label: "Daily" },
    ],
  },
  {
    name: "heard_about",
    label: "Heard about",
    options: [
      { value: "whatsapp", label: "WhatsApp" },
      { value: "facebook", label: "Facebook" },
      { value: "friend", label: "Friend" },
      { value: "roadside", label: "Roadside" },
      { value: "other", label: "Other" },
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
  { name: "notes", label: "Internal notes" },
]

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
      apiPath="/api/drivers"
      initialData={initialData}
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
          initial={initial}
          saving={saving}
          onSubmit={onSubmit}
        />
      )}
    />
  )
}
