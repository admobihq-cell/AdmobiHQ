import { TourSettingsSection } from "@workspace/ui/components/tour-settings-section"

export const metadata = { title: "Product tour" }

export default function TourSettingsPage() {
  return (
    <TourSettingsSection description="Replay the welcome tour you saw after verification, or jump straight to a single chapter." />
  )
}
