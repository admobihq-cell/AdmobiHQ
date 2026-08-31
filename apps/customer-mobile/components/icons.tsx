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
export const ChevronLeft = ionicon("chevron-back")
export const List = ionicon("list-outline")
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
export const LogOut = ionicon("log-out-outline")
export const Mail = ionicon("mail-outline")
export const Call = ionicon("call-outline")
export const Pencil = ionicon("create-outline")
export const CheckmarkCircle = ionicon("checkmark-circle")
export const LogoGoogle = ionicon("logo-google")
export const Close = ionicon("close-outline")
export const Checkmark = ionicon("checkmark-outline")
export const Laptop = ionicon("laptop-outline")
export const Phone = ionicon("phone-portrait-outline")
