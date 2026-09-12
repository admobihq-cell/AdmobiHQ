import { AcceptInvitationClient } from "@/components/invitations/accept-invitation-client"

export const metadata = { title: "Accept invitation" }

export default function AcceptInvitationPage() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-background p-6">
      <AcceptInvitationClient />
    </main>
  )
}
