import Link from "next/link"
import { BarChart3, LayoutDashboard } from "lucide-react"

import { Button } from "@workspace/ui/components/button"

import { getOpsUser } from "@/lib/auth"

export async function HomeWelcome() {
  const user = await getOpsUser()
  const rawName =
    user?.user?.firstName?.trim() || user?.email.split("@")[0] || "there"
  const displayName = rawName.charAt(0).toUpperCase() + rawName.slice(1)

  return (
    <section className="relative isolate overflow-hidden rounded-xl border">
      {/* Reused ops brand photo (also on the sign-in split screen). */}
      {/* eslint-disable-next-line @next/next/no-img-element -- local static hero asset */}
      <img
        src="/auth/hero-ops.jpg"
        alt=""
        className="absolute inset-0 size-full object-cover object-center"
      />
      <div className="absolute inset-0 bg-gradient-to-tr from-black/85 via-black/55 to-black/25" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

      <div className="relative flex min-h-[13rem] flex-col justify-end gap-5 p-6 md:min-h-[15rem] md:p-8">
        <div className="space-y-1.5">
          <h1 className="text-2xl font-semibold tracking-tight text-white md:text-3xl">
            Welcome back, {displayName}
          </h1>
          <p className="max-w-xl text-sm leading-relaxed text-white/70">
            Signed in as{" "}
            <span className="font-medium text-white/90">
              {user?.email ?? "@admobihq.com"}
            </span>
            . Review operational data, manage submissions, and monitor CMS health
            from this workspace.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button asChild className="h-10 gap-2">
            <Link href="/overview">
              <BarChart3 className="size-4" />
              View analytics
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="h-10 gap-2 border-white/25 bg-white/10 text-white backdrop-blur-sm hover:bg-white/20 hover:text-white dark:bg-white/10 dark:hover:bg-white/20"
          >
            <Link href="/leads">
              <LayoutDashboard className="size-4" />
              Open leads
            </Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
