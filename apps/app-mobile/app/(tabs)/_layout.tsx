import { Tabs } from "expo-router"
import { Text } from "react-native"

import { Campaigns, Map, Overview, Settings } from "@/components/icons"
import { useNavigationTheme } from "@/lib/theme"

function TabLabel({
  label,
  color,
}: {
  label: string
  color: string
}) {
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
        name="index"
        options={{
          title: "Overview",
          headerShown: false,
          tabBarLabel: ({ color }) => <TabLabel label="Overview" color={color} />,
          tabBarIcon: ({ color, size }) => (
            <Overview color={color} size={size - 2} />
          ),
        }}
      />
      <Tabs.Screen
        name="campaigns"
        options={{
          title: "Campaigns",
          headerShown: false,
          tabBarLabel: ({ color }) => (
            <TabLabel label="Campaigns" color={color} />
          ),
          tabBarIcon: ({ color, size }) => (
            <Campaigns color={color} size={size - 2} />
          ),
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: "Map",
          headerShown: false,
          tabBarLabel: ({ color }) => <TabLabel label="Map" color={color} />,
          tabBarIcon: ({ color, size }) => (
            <Map color={color} size={size - 2} />
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
  )
}
