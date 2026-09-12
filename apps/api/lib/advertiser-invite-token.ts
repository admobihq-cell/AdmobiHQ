import { generateAccessToken, hashAccessToken } from "@/lib/support-token"

/** Opaque invite token returned once in the email link; only the SHA-256 hash is stored. */
export function generateAdvertiserInviteToken(): string {
  return generateAccessToken()
}

export function hashAdvertiserInviteToken(token: string): string {
  return hashAccessToken(token)
}
