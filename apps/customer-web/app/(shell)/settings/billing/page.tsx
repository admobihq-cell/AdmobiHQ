import { redirect } from "next/navigation"

/** The Wallet page moved to Finance & Billing; keep old links and bookmarks working. */
export default function LegacyBillingSettingsPage() {
  redirect("/billing")
}
