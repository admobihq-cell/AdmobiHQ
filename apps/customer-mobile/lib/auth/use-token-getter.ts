import { useAuth } from "@clerk/clerk-expo"

export type GetToken = () => Promise<string | null>

/** Clerk session getToken — always available under root ClerkProvider. */
export function useTokenGetter(): GetToken {
  const { getToken } = useAuth()
  return getToken
}
