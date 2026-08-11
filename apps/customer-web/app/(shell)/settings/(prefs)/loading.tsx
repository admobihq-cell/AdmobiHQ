import { AccountSettingsSkeleton } from "@/components/skeletons/account-settings-skeleton"

/**
 * Fallback for /settings itself, which immediately redirects to /settings/account.
 * account/ and notifications/ each have their own matching loading.tsx for direct navigation.
 */
export default function PrefsLoading() {
  return <AccountSettingsSkeleton />
}
