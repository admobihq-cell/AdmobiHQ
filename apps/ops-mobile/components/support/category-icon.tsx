import { Car, ChatBubble, Construct, HelpCircle, Megaphone, Wallet } from "@/components/icons"

/** A declared component (not a resolved reference) so its identity is stable across renders. */
export function CategoryIcon({
  category,
  size = 16,
  color,
}: {
  category: string
  size?: number
  color: string
}) {
  switch (category) {
    case "billing":
      return <Wallet size={size} color={color} />
    case "campaign":
      return <Megaphone size={size} color={color} />
    case "technical":
      return <Construct size={size} color={color} />
    case "driver":
      return <Car size={size} color={color} />
    case "general":
      return <HelpCircle size={size} color={color} />
    default:
      return <ChatBubble size={size} color={color} />
  }
}
