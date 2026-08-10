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

export const Wallet = ionicon("wallet-outline")
export const Routes = ionicon("navigate-outline")
export const Payouts = ionicon("cash-outline")
export const Deliveries = ionicon("cube-outline")
export const Settings = ionicon("cog-outline")
export const ChevronRight = ionicon("chevron-forward")
export const RefreshCcw = ionicon("refresh-outline")
export const TrendingUp = ionicon("trending-up-outline")
export const Clock = ionicon("time-outline")
export const MapPin = ionicon("location-outline")
export const PackageCheck = ionicon("checkmark-done-outline")
export const Dashboard = ionicon("speedometer-outline")
export const HelpCircle = ionicon("help-circle-outline")
export const Megaphone = ionicon("megaphone-outline")
export const Construct = ionicon("construct-outline")
export const Car = ionicon("car-outline")
export const Send = ionicon("paper-plane-outline")
export const Person = ionicon("person-circle-outline")
export const LogOut = ionicon("log-out-outline")
export const Mail = ionicon("mail-outline")
export const Call = ionicon("call-outline")
export const Pencil = ionicon("create-outline")
export const CheckmarkCircle = ionicon("checkmark-circle")
export const LogoGoogle = ionicon("logo-google")
export const Shield = ionicon("shield-checkmark-outline")
export const Laptop = ionicon("laptop-outline")
export const Phone = ionicon("phone-portrait-outline")
export const Bell = ionicon("notifications-outline")
export const Gift = ionicon("gift-outline")
export const Warning = ionicon("warning-outline")
export const Receipt = ionicon("receipt-outline")
