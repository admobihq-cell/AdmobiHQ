"use client"

import { Controller, type Control, type FieldPath, type FieldValues } from "react-hook-form"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"

/**
 * The design-system Select wired to react-hook-form for the marketing lead
 * forms. A native <select> renders its option list with OS colours, which
 * left light text on a white list in dark mode.
 */
export function FormSelect<T extends FieldValues>({
  control,
  name,
  id,
  options,
  placeholder = "Select…",
}: {
  control: Control<T>
  name: FieldPath<T>
  id: string
  options: readonly { value: string; label: string }[]
  placeholder?: string
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        // "" (not undefined) keeps Radix controlled, so form.reset() clears back to the placeholder.
        // Radix's hidden native <select> reports "" when setValue lands before its options mount
        // (e.g. a query-string prefill); no item has an empty value, so drop it.
        <Select value={field.value ?? ""} onValueChange={(v) => v && field.onChange(v)}>
          <SelectTrigger
            id={id}
            ref={field.ref}
            onBlur={field.onBlur}
            aria-invalid={!!fieldState.error}
            className="w-full"
          >
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent position="popper" className="rounded-xl p-1">
            {options.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    />
  )
}
