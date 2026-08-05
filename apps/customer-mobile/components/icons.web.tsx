import Ionicons from "@expo/vector-icons/Ionicons"
import type { ComponentType } from "react"
import type { TextStyle } from "react-native"

export type IconProps = {
  color?: string
  size?: number
}

export type AppIcon = ComponentType<IconProps>

// Eagerly register the icon font for the static web-demo export. Individual
// Ionicons still lazy-load per component, but this avoids a flash of missing
// glyphs on first paint inside the marketing-site iframe.
void Ionicons.loadFont()

const iconStyle: TextStyle = {
  // @ts-expect-error web-only CSS properties forwarded by react-native-web
  WebkitFontSmoothing: "antialiased",
  MozOsxFontSmoothing: "grayscale",
}

function ionicon(name: keyof typeof Ionicons.glyphMap): AppIcon {
  return function Icon({ color = "#000", size = 20 }: IconProps) {
    return <Ionicons name={name} color={color} size={size} style={iconStyle} />
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
export const Megaphone = ionicon("megaphone-outline")
export const Warning = ionicon("warning-outline")
export const Gift = ionicon("gift-outline")
export const Send = ionicon("paper-plane-outline")
export const Wallet = ionicon("wallet-outline")
export const EyeOff = ionicon("eye-off-outline")
export const Download = ionicon("download-outline")
export const RefreshCcw = ionicon("refresh-outline")
export const Receipt = ionicon("receipt-outline")
export const TrendingDown = ionicon("trending-down-outline")
export const Car = ionicon("car-outline")
export const Construct = ionicon("construct-outline")
export const LifeBuoy = ionicon("help-buoy-outline")
export const ChatBubble = ionicon("chatbubble-ellipses-outline")
export const Lock = ionicon("lock-closed-outline")
