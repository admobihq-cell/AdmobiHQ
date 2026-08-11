"use client"

import { ThemeToggle } from "@workspace/ui/components/theme-toggle"

export function AuthThemeToggle() {
  return (
    <div className="fixed right-4 top-4 z-50 lg:right-6 lg:top-6">
      <ThemeToggle />
    </div>
  )
}
