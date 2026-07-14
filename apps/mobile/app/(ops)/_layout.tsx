import { Tabs } from "expo-router"
import {
  BarChart3,
  Car,
  Home,
  Megaphone,
  Truck,
} from "@/components/icons"

import { colors } from "@/lib/theme"

export default function OpsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.bg,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
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
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Home color={color} size={size - 2} strokeWidth={2.25} />
          ),
        }}
      />
      <Tabs.Screen
        name="overview"
        options={{
          title: "Overview",
          tabBarIcon: ({ color, size }) => (
            <BarChart3 color={color} size={size - 2} strokeWidth={2.25} />
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
