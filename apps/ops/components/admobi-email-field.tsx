"use client"

import { ALLOWED_DOMAIN, getAdmobiEmailError } from "@/lib/allowed-email"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"

type AdmobiEmailFieldProps = {
  id: string
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}

export function AdmobiEmailField({
  id,
  value,
  onChange,
  disabled,
}: AdmobiEmailFieldProps) {
  const domainError = getAdmobiEmailError(value)

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>Work email</Label>
      <Input
        id={id}
        type="email"
        inputMode="email"
        autoComplete="email"
        placeholder={`you${ALLOWED_DOMAIN}`}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        aria-invalid={!!domainError}
      />
      {domainError ? (
        <p className="text-sm text-destructive">{domainError}</p>
      ) : (
        <p className="text-sm text-muted-foreground">
          Authorized personnel only ({ALLOWED_DOMAIN})
        </p>
      )}
    </div>
  )
}
