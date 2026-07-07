export const ALLOWED_DOMAIN = "@admobihq.com"

export function isAdmobiEmail(email: string | null | undefined): boolean {
  return !!email?.trim().toLowerCase().endsWith(ALLOWED_DOMAIN)
}

/** Live validation while the user types their email address. */
export function getAdmobiEmailError(email: string): string | null {
  const trimmed = email.trim().toLowerCase()
  if (!trimmed) {
    return null
  }

  const atIndex = trimmed.indexOf("@")
  if (atIndex === -1) {
    return null
  }

  const domainPart = trimmed.slice(atIndex)
  if (domainPart === "@") {
    return null
  }

  if (
    ALLOWED_DOMAIN.startsWith(domainPart) &&
    domainPart.length < ALLOWED_DOMAIN.length
  ) {
    return null
  }

  if (!isAdmobiEmail(trimmed)) {
    return `Only ${ALLOWED_DOMAIN} email addresses are authorized for this console.`
  }

  return null
}
