import Ionicons from "@expo/vector-icons/Ionicons"
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons"
import type { ComponentType } from "react"

export type IconProps = {
  color?: string
  size?: number
  strokeWidth?: number
}

export type AppIcon = ComponentType<IconProps>

function ionicon(name: keyof typeof Ionicons.glyphMap): AppIcon {
  return function Icon({ color = "#000", size = 20 }: IconProps) {
    return <Ionicons name={name} color={color} size={size} />
  }
}

function material(name: keyof typeof MaterialCommunityIcons.glyphMap): AppIcon {
  return function Icon({ color = "#000", size = 20 }: IconProps) {
    return <MaterialCommunityIcons name={name} color={color} size={size} />
  }
}

export const Home = ionicon("home-outline")
export const BarChart3 = ionicon("bar-chart-outline")
export const Megaphone = ionicon("megaphone-outline")
export const Truck = material("truck-outline")
export const Car = ionicon("car-outline")
export const Mail = ionicon("mail-outline")
export const FileText = ionicon("document-text-outline")
export const ChevronRight = ionicon("chevron-forward")
export const ChevronDown = ionicon("chevron-down")
export const Inbox = ionicon("file-tray-outline")
export const ShieldCheck = ionicon("shield-checkmark-outline")
export const Clock = ionicon("time-outline")
export const ArrowRight = ionicon("arrow-forward")
export const LayoutDashboard = ionicon("grid-outline")
export const MoreHorizontal = ionicon("ellipsis-horizontal")
export const Search = ionicon("search-outline")
export const Trash = ionicon("trash-outline")
export const Pencil = ionicon("pencil-outline")
export const Plus = ionicon("add-outline")
export const Copy = ionicon("copy-outline")
export const Call = ionicon("call-outline")
export const LogOut = ionicon("log-out-outline")
export const Person = ionicon("person-circle-outline")
export const Map = ionicon("map-outline")
export const CheckboxOn = ionicon("checkbox")
export const CheckboxOff = ionicon("square-outline")
export const Bell = ionicon("notifications-outline")
export const Warning = ionicon("warning-outline")
export const Send = ionicon("paper-plane-outline")
export const Wallet = ionicon("wallet-outline")
export const Eye = ionicon("eye-outline")
export const EyeOff = ionicon("eye-off-outline")
export const ArrowUpCircle = ionicon("arrow-up-circle-outline")
export const ArrowDownCircle = ionicon("arrow-down-circle-outline")
export const SwapHorizontal = ionicon("swap-horizontal-outline")
export const TrendingUp = ionicon("trending-up-outline")
export const TrendingDown = ionicon("trending-down-outline")
export const Receipt = ionicon("receipt-outline")
export const RefreshCcw = ionicon("refresh-outline")
