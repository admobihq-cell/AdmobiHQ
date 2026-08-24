import { useState } from "react"
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
import { NavDrawer } from "@/components/app/nav-drawer"
import { useOpsAccess } from "@/lib/ops-client"
import { PageHeaderProvider } from "@/lib/page-header"
import { useNavigationTheme } from "@/lib/theme"

function TabLabel({ label, color }: { label: string; color: string }) {
  return <Text style={{ fontSize: 11, fontWeight: "600", color }}>{label}</Text>
}

function renderDashboardLabel({ color }: { color: string }) {
  return <TabLabel label="Dashboard" color={color} />
}
function renderDashboardIcon({ color, size }: { color: string; size: number }) {
  return <LayoutDashboard color={color} size={size - 2} strokeWidth={2.25} />
}

function renderLeadsLabel({ color }: { color: string }) {
  return <TabLabel label="Leads" color={color} />
}
function renderLeadsIcon({ color, size }: { color: string; size: number }) {
  return <Megaphone color={color} size={size - 2} strokeWidth={2.25} />
}

function renderFleetLabel({ color }: { color: string }) {
  return <TabLabel label="Fleet" color={color} />
}
function renderFleetIcon({ color, size }: { color: string; size: number }) {
  return <Truck color={color} size={size - 2} strokeWidth={2.25} />
}

function renderDriversLabel({ color }: { color: string }) {
  return <TabLabel label="Drivers" color={color} />
}
function renderDriversIcon({ color, size }: { color: string; size: number }) {
  return <Car color={color} size={size - 2} strokeWidth={2.25} />
}

function renderProfileLabel({ color }: { color: string }) {
  return <TabLabel label="Profile" color={color} />
}
function renderProfileIcon({ color, size }: { color: string; size: number }) {
  return <Person color={color} size={size - 2} strokeWidth={2.25} />
}

/**
 * Owns the nav drawer's open/close state so toggling it doesn't force
 * OpsLayout (and the <Tabs> navigator it renders) to re-render.
 */
function AppHeader() {
  const [drawerOpen, setDrawerOpen] = useState(false)
  return (
    <>
      <AppBar onAvatarPress={() => setDrawerOpen(true)} />
      <NavDrawer visible={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  )
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
  const { role, permissions } = useOpsAccess()
  const canSee = (permission: "leads" | "fleet" | "drivers") =>
    role === "admin" || permissions.includes(permission)

  return (
    <PageHeaderProvider>
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <AppHeader />
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
              tabBarLabel: renderDashboardLabel,
              tabBarIcon: renderDashboardIcon,
            }}
          />
          <Tabs.Screen
            name="leads"
            options={{
              title: "Leads",
              headerShown: false,
              href: canSee("leads") ? undefined : null,
              tabBarLabel: renderLeadsLabel,
              tabBarIcon: renderLeadsIcon,
            }}
          />
          <Tabs.Screen
            name="fleet"
            options={{
              title: "Fleet",
              headerShown: false,
              href: canSee("fleet") ? undefined : null,
              tabBarLabel: renderFleetLabel,
              tabBarIcon: renderFleetIcon,
            }}
          />
          <Tabs.Screen
            name="drivers"
            options={{
              title: "Drivers",
              headerShown: false,
              href: canSee("drivers") ? undefined : null,
              tabBarLabel: renderDriversLabel,
              tabBarIcon: renderDriversIcon,
            }}
          />
          <Tabs.Screen
            name="profile"
            options={{
              title: "Profile",
              headerShown: false,
              tabBarLabel: renderProfileLabel,
              tabBarIcon: renderProfileIcon,
            }}
          />
          <Tabs.Screen
            name="team"
            options={{
              title: "Team",
              headerShown: false,
              href: null,
            }}
          />
          <Tabs.Screen
            name="driver-applications"
            options={{
              title: "Driver applications",
              headerShown: false,
              href: null,
            }}
          />
          <Tabs.Screen
            name="content"
            options={{
              title: "Content",
              headerShown: false,
              href: null,
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
            name="support"
            options={{
              title: "Support",
              headerShown: false,
              href: null,
            }}
          />
        </Tabs>
      </View>
    </PageHeaderProvider>
  )
}
