import { Tabs } from "expo-router"
import { Text } from "react-native"
import {
  Car,
  LayoutDashboard,
  Megaphone,
  MoreHorizontal,
  Truck,
} from "@/components/icons"

import { useNavigationTheme } from "@/lib/theme"

function TabLabel({ label, color }: { label: string; color: string }) {
  return (
    <Text style={{ fontSize: 11, fontWeight: "600", color }}>{label}</Text>
  )
}

export default function OpsLayout() {
  const {
    screenOptions,
    tabBarStyle,
    tabBarActiveTintColor,
    tabBarInactiveTintColor,
  } = useNavigationTheme()

  return (
    <Tabs
      screenOptions={{
        ...screenOptions,
        tabBarStyle: {
          ...tabBarStyle,
          height: 60,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarActiveTintColor,
        tabBarInactiveTintColor,
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Dashboard",
          headerShown: false,
          tabBarLabel: ({ color }) => (
            <TabLabel label="Dashboard" color={color} />
          ),
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
          tabBarLabel: ({ color }) => <TabLabel label="Leads" color={color} />,
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
          tabBarLabel: ({ color }) => <TabLabel label="Fleet" color={color} />,
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
          tabBarLabel: ({ color }) => (
            <TabLabel label="Drivers" color={color} />
          ),
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
          tabBarLabel: ({ color }) => <TabLabel label="More" color={color} />,
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
