import { getOpsUser } from "@/lib/auth"

/** Photo greeting at the top of Overview, the console's landing page. */
export async function OverviewWelcome() {
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
            . Here&apos;s what needs you across the sections you can open.
          </p>
        </div>
      </div>
    </section>
  )
}

export function WelcomeSkeleton() {
  return <div className="min-h-[13rem] animate-pulse rounded-xl border bg-muted md:min-h-[15rem]" />
}
