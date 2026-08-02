import {
  Megaphone,
  MessageCircle,
  ShieldCheck,
  Wallet,
  Wrench,
  type LucideIcon,
} from "lucide-react"

export const SUPPORT_CATEGORIES: {
  value: "general" | "billing" | "campaign" | "technical" | "driver"
  label: string
  icon: LucideIcon
}[] = [
  { value: "general", label: "General", icon: MessageCircle },
  { value: "billing", label: "Billing", icon: Wallet },
  { value: "campaign", label: "Campaign", icon: Megaphone },
  { value: "technical", label: "Technical", icon: Wrench },
  { value: "driver", label: "Driver", icon: ShieldCheck },
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
      return <ShieldCheck className={className} aria-hidden />
    default:
      return <MessageCircle className={className} aria-hidden />
  }
}
