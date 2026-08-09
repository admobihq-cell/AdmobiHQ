import { Tabs } from "expo-router"
import { Text, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { AppBar } from "@/components/app/app-bar"
import { Deliveries, Payouts, Routes, Settings, Wallet } from "@/components/icons"
import { usePlatformFlags } from "@/lib/flags"
import { useNavigationTheme } from "@/lib/theme"

function TabLabel({ label, color }: { label: string; color: string }) {
  return (
    <Text style={{ fontSize: 11, fontWeight: "600", color }}>{label}</Text>
  )
}

export default function TabsLayout() {
  const {
    screenOptions,
    tabBarStyle,
    tabBarActiveTintColor,
    tabBarInactiveTintColor,
    colors,
  } = useNavigationTheme()
  const insets = useSafeAreaInsets()
  const flags = usePlatformFlags()

  return (
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
          name="index"
          options={{
            title: "Earnings",
            headerShown: false,
            tabBarLabel: ({ color }) => <TabLabel label="Earnings" color={color} />,
            tabBarIcon: ({ color, size }) => (
              <Wallet color={color} size={size - 2} />
            ),
          }}
        />
        <Tabs.Screen
          name="routes"
          options={{
            title: "Routes",
            headerShown: false,
            tabBarLabel: ({ color }) => <TabLabel label="Routes" color={color} />,
            tabBarIcon: ({ color, size }) => (
              <Routes color={color} size={size - 2} />
            ),
          }}
        />
        <Tabs.Screen
          name="payouts"
          options={{
            title: "Payouts",
            headerShown: false,
            tabBarLabel: ({ color }) => <TabLabel label="Payouts" color={color} />,
            tabBarIcon: ({ color, size }) => (
              <Payouts color={color} size={size - 2} />
            ),
          }}
        />
        <Tabs.Screen
          name="deliveries"
          options={{
            title: "Deliveries",
            headerShown: false,
            // Hides the tab from the bar without unmounting the route — a
            // shared link to /deliveries still works, it just isn't tapped
            // into from here while the platform flag is off.
            href: flags.deliveries ? undefined : null,
            tabBarLabel: ({ color }) => <TabLabel label="Deliveries" color={color} />,
            tabBarIcon: ({ color, size }) => (
              <Deliveries color={color} size={size - 2} />
            ),
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: "Settings",
            headerShown: false,
            tabBarLabel: ({ color }) => <TabLabel label="Settings" color={color} />,
            tabBarIcon: ({ color, size }) => (
              <Settings color={color} size={size - 2} />
            ),
          }}
        />
      </Tabs>
    </View>
  )
}
