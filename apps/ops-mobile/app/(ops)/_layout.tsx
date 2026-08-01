import { Tabs } from "expo-router"
import { Text, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import {
  Car,
  LayoutDashboard,
  Megaphone,
  Person,
  Truck,
} from "@/components/icons"

import { AppBar } from "@/components/app/app-bar"
import { PageHeaderProvider } from "@/lib/page-header"
import { useNavigationTheme } from "@/lib/theme"

function TabLabel({ label, color }: { label: string; color: string }) {
  return <Text style={{ fontSize: 11, fontWeight: "600", color }}>{label}</Text>
}

export default function OpsLayout() {
  const {
    screenOptions,
    tabBarStyle,
    tabBarActiveTintColor,
    tabBarInactiveTintColor,
    colors,
  } = useNavigationTheme()
  const insets = useSafeAreaInsets()

  return (
    <PageHeaderProvider>
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <AppBar />
        <Tabs
          screenOptions={{
            ...screenOptions,
            tabBarStyle: {
              ...tabBarStyle,
              height: 60 + insets.bottom,
              paddingBottom: Math.max(insets.bottom, 8),
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
                <LayoutDashboard
                  color={color}
                  size={size - 2}
                  strokeWidth={2.25}
                />
              ),
            }}
          />
          <Tabs.Screen
            name="leads"
            options={{
              title: "Leads",
              headerShown: false,
              tabBarLabel: ({ color }) => (
                <TabLabel label="Leads" color={color} />
              ),
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
              tabBarLabel: ({ color }) => (
                <TabLabel label="Fleet" color={color} />
              ),
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
            name="profile"
            options={{
              title: "Profile",
              headerShown: false,
              tabBarLabel: ({ color }) => (
                <TabLabel label="Profile" color={color} />
              ),
              tabBarIcon: ({ color, size }) => (
                <Person color={color} size={size - 2} strokeWidth={2.25} />
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
            name="activity"
            options={{
              title: "Activity",
              headerShown: false,
              href: null,
            }}
          />
          <Tabs.Screen
            name="announcements"
            options={{
              title: "Announcements",
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
          <Tabs.Screen
            name="map"
            options={{
              title: "Map",
              headerShown: false,
              href: null,
            }}
          />
          <Tabs.Screen
            name="notifications"
            options={{
              title: "Notifications",
              headerShown: false,
              href: null,
            }}
          />
          <Tabs.Screen
            name="finances"
            options={{
              title: "Finances",
              headerShown: false,
              href: null,
            }}
          />
          <Tabs.Screen
            name="onboarding"
            options={{
              title: "Welcome",
              headerShown: false,
              href: null,
            }}
          />
        </Tabs>
      </View>
    </PageHeaderProvider>
  )
}
