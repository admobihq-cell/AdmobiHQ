import AsyncStorage from "@react-native-async-storage/async-storage"

const READ_IDS_KEY = "admobi.customer.readNotificationIds"

async function loadReadIds(): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(READ_IDS_KEY)
    return new Set(raw ? (JSON.parse(raw) as string[]) : [])
  } catch {
    return new Set()
  }
}

async function saveReadIds(ids: Set<string>): Promise<void> {
  try {
    await AsyncStorage.setItem(READ_IDS_KEY, JSON.stringify([...ids]))
  } catch {
    // best-effort — read state is a nice-to-have, not worth surfacing an error for
  }
}

export async function getReadNotificationIds(): Promise<Set<string>> {
  return loadReadIds()
}

export async function markNotificationRead(id: string): Promise<void> {
  const ids = await loadReadIds()
  ids.add(id)
  await saveReadIds(ids)
}

export async function markNotificationsRead(ids: string[]): Promise<void> {
  const current = await loadReadIds()
  for (const id of ids) current.add(id)
  await saveReadIds(current)
}
