import { createHash, randomBytes } from "node:crypto"

/** Anonymous case-access token: returned once to the submitter, never stored raw. */
export function generateAccessToken(): string {
  return randomBytes(24).toString("base64url")
}

export function hashAccessToken(token: string): string {
  return createHash("sha256").update(token).digest("hex")
}
