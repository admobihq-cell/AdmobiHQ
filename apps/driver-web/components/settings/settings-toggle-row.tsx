import type { LucideIcon } from "lucide-react"

import { Checkbox } from "@workspace/ui/components/checkbox"

type SettingsToggleRowProps = {
  id: string
  label: string
  description?: string
  icon: LucideIcon
  checked: boolean
  disabled?: boolean
}

export function SettingsToggleRow({
  id,
  label,
  description,
  icon: Icon,
  checked,
  disabled,
}: SettingsToggleRowProps) {
  return (
    <label
      htmlFor={id}
      className="flex items-center gap-4 px-4 py-3 has-[:disabled]:cursor-not-allowed"
    >
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary">
        <Icon className="size-4 text-primary" aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{label}</p>
        {description ? (
          <p className="truncate text-xs text-muted-foreground">{description}</p>
        ) : null}
      </div>
      <Checkbox id={id} checked={checked} disabled={disabled} />
    </label>
  )
}
