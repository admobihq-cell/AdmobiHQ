import { Tabs } from "expo-router"
import { Text, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { AppBar } from "@/components/app/app-bar"
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

function renderOverviewLabel({ color }: { color: string }) {
  return <TabLabel label="Overview" color={color} />
}

function renderOverviewIcon({ color, size }: { color: string; size: number }) {
  return <Overview color={color} size={size - 2} />
}

function renderCampaignsLabel({ color }: { color: string }) {
  return <TabLabel label="Campaigns" color={color} />
}

function renderCampaignsIcon({ color, size }: { color: string; size: number }) {
  return <Campaigns color={color} size={size - 2} />
}

function renderMapLabel({ color }: { color: string }) {
  return <TabLabel label="Map" color={color} />
}

function renderMapIcon({ color, size }: { color: string; size: number }) {
  return <Map color={color} size={size - 2} />
}

function renderSettingsLabel({ color }: { color: string }) {
  return <TabLabel label="Settings" color={color} />
}

function renderSettingsIcon({ color, size }: { color: string; size: number }) {
  return <Settings color={color} size={size - 2} />
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
            title: "Overview",
            headerShown: false,
            tabBarLabel: renderOverviewLabel,
            tabBarIcon: renderOverviewIcon,
          }}
        />
        <Tabs.Screen
          name="campaigns"
          options={{
            title: "Campaigns",
            headerShown: false,
            tabBarLabel: renderCampaignsLabel,
            tabBarIcon: renderCampaignsIcon,
          }}
        />
        <Tabs.Screen
          name="map"
          options={{
            title: "Map",
            headerShown: false,
            tabBarLabel: renderMapLabel,
            tabBarIcon: renderMapIcon,
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: "Settings",
            headerShown: false,
            tabBarLabel: renderSettingsLabel,
            tabBarIcon: renderSettingsIcon,
          }}
          listeners={({ navigation }) => ({
            tabPress: (e) => {
              // Deep links into this tab's stack (e.g. the wallet card jumping
              // straight to /settings/billing from the Overview tab) leave
              // billing as the remembered screen. Always reset to the settings
              // list when the tab icon itself is pressed.
              e.preventDefault()
              navigation.navigate("settings", { screen: "index" })
            },
          })}
        />
      </Tabs>
    </View>
  )
}
