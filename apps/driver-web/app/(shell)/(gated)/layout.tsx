import { CompleteProfilePlaceholder } from "@/components/profile-setup/complete-profile-placeholder"
import { ProfileLoadError } from "@/components/profile-setup/profile-load-error"
import { isAuthEnabled } from "@/lib/auth/is-auth-enabled"
import { fetchDriverProfile } from "@/lib/driver-profile"

/** Every screen under (shell) except settings lives here. Unlike the old
 * hard redirect-to-/profile-setup behavior, a driver can freely navigate
 * between these routes — each one just shows a placeholder instead of real
 * content until their profile is approved. Settings (a sibling of this
 * group, not nested inside it) always renders normally, since that's where
 * the profile-completion flow and status now live. */
export default async function GatedLayout({ children }: { children: React.ReactNode }) {
  if (!isAuthEnabled()) {
    return <>{children}</>
  }

  const result = await fetchDriverProfile()

  if (result.status === "error") {
    return <ProfileLoadError />
  }

  if (result.profile.status !== "approved") {
    return <CompleteProfilePlaceholder status={result.profile.status} />
  }

  return <>{children}</>
}
