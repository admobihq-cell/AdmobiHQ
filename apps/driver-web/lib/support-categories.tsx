import {
  Car,
  Megaphone,
  MessageCircle,
  Wallet,
  Wrench,
  type LucideIcon,
} from "lucide-react"

export const SUPPORT_CATEGORIES: {
  value: "general" | "billing" | "campaign" | "technical" | "driver"
  label: string
  icon: LucideIcon
}[] = [
  { value: "driver", label: "Driver", icon: Car },
  { value: "technical", label: "Technical", icon: Wrench },
  { value: "billing", label: "Payouts", icon: Wallet },
  { value: "campaign", label: "Campaign", icon: Megaphone },
  { value: "general", label: "General", icon: MessageCircle },
]

export function getCategoryLabel(value: string): string {
  return SUPPORT_CATEGORIES.find((c) => c.value === value)?.label ?? value
}

/** A declared component (not a resolved reference) so its identity is stable across renders. */
export function CategoryIcon({ value, className }: { value: string; className?: string }) {
  switch (value) {
    case "billing":
      return <Wallet className={className} aria-hidden />
    case "campaign":
      return <Megaphone className={className} aria-hidden />
    case "technical":
      return <Wrench className={className} aria-hidden />
    case "driver":
      return <Car className={className} aria-hidden />
    default:
      return <MessageCircle className={className} aria-hidden />
  }
}
