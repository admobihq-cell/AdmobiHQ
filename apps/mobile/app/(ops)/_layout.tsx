import { Tabs } from "expo-router"
import {
  Car,
  LayoutDashboard,
  Megaphone,
  MoreHorizontal,
  Truck,
} from "@/components/icons"

import { colors } from "@/lib/theme"

export default function OpsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.bg,
          borderBottomWidth: 0,
        },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: "600" },
        headerShadowVisible: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 60,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
        },
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Dashboard",
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <LayoutDashboard color={color} size={size - 2} strokeWidth={2.25} />
          ),
        }}
      />
      <Tabs.Screen
        name="leads"
        options={{
          title: "Leads",
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Megaphone color={color} size={size - 2} strokeWidth={2.25} />
          ),
        }}
      />
      <Tabs.Screen
        name="fleet"
        options={{
          title: "Fleet",
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Truck color={color} size={size - 2} strokeWidth={2.25} />
          ),
        }}
      />
      <Tabs.Screen
        name="drivers"
        options={{
          title: "Drivers",
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Car color={color} size={size - 2} strokeWidth={2.25} />
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: "More",
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <MoreHorizontal color={color} size={size - 2} strokeWidth={2.25} />
          ),
        }}
      />
      <Tabs.Screen
        name="waitlist"
        options={{
          title: "Waitlist",
          headerShown: false,
          href: null,
        }}
      />
      <Tabs.Screen
        name="media-kit"
        options={{
          title: "Media kit",
          headerShown: false,
          href: null,
        }}
      />
    </Tabs>
  )
}
