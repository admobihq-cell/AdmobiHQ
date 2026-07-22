import { isAdmobiEmail } from "@workspace/ops-contracts"

export function getPrimaryEmail(
  emailAddresses:
    | Array<{ emailAddress: string; id: string }>
    | undefined,
  primaryEmailAddressId: string | null | undefined,
): string | null {
  if (!emailAddresses?.length) return null
  return (
    emailAddresses.find((e) => e.id === primaryEmailAddressId)?.emailAddress ??
    emailAddresses[0]?.emailAddress ??
    null
  )
}

export function isOpsStaffEmail(email: string | null | undefined): boolean {
  return isAdmobiEmail(email)
}
