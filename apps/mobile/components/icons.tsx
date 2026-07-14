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
export const Inbox = ionicon("file-tray-outline")
export const ShieldCheck = ionicon("shield-checkmark-outline")
export const Clock = ionicon("time-outline")
export const ArrowRight = ionicon("arrow-forward")
export const LayoutDashboard = ionicon("grid-outline")
