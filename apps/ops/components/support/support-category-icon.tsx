import { Megaphone, MessageCircle, ShieldCheck, Wallet, Wrench } from "lucide-react"

/** A declared component (not a resolved reference) so its identity is stable across renders. */
export function SupportCategoryIcon({
  category,
  className,
}: {
  category: string
  className?: string
}) {
  switch (category) {
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
