import Ionicons from "@expo/vector-icons/Ionicons"
import type { ComponentType } from "react"

export type IconProps = {
  color?: string
  size?: number
}

export type AppIcon = ComponentType<IconProps>

function ionicon(name: keyof typeof Ionicons.glyphMap): AppIcon {
  return function Icon({ color = "#000", size = 20 }: IconProps) {
    return <Ionicons name={name} color={color} size={size} />
  }
}

export const Overview = ionicon("speedometer-outline")
export const Campaigns = ionicon("megaphone-outline")
export const Map = ionicon("map-outline")
export const Settings = ionicon("cog-outline")
export const ChevronRight = ionicon("chevron-forward")
export const Person = ionicon("person-circle-outline")
export const Bell = ionicon("notifications-outline")
export const Card = ionicon("card-outline")
export const HelpCircle = ionicon("help-circle-outline")
export const Shield = ionicon("shield-checkmark-outline")
export const Globe = ionicon("globe-outline")
export const Eye = ionicon("eye-outline")
export const TrendingUp = ionicon("trending-up-outline")
export const Radio = ionicon("radio-outline")
export const Calendar = ionicon("calendar-outline")
export const Location = ionicon("location-outline")
export const Add = ionicon("add-outline")
export const Time = ionicon("time-outline")
