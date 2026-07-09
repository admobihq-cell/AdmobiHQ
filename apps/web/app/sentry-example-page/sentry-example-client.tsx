"use client"

import * as Sentry from "@sentry/nextjs"

export function SentryExampleClient() {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-6 p-8">
      <div>
        <h1 className="text-2xl font-semibold">Sentry test page</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Development only. Trigger an error, then check{" "}
          <a
            className="underline"
            href="https://admobi-media.sentry.io/issues/"
            rel="noreferrer"
            target="_blank"
          >
            Sentry Issues
          </a>{" "}
          within ~30 seconds.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <button
          type="button"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          onClick={() => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ;(globalThis as any).myUndefinedFunction()
          }}
        >
          Trigger client error
        </button>

        <button
          type="button"
          className="rounded-md border px-4 py-2 text-sm font-medium"
          onClick={() => {
            Sentry.captureException(new Error("Sentry manual test error — delete me"))
          }}
        >
          Capture exception manually
        </button>

        <button
          type="button"
          className="rounded-md border px-4 py-2 text-sm font-medium"
          onClick={async () => {
            await fetch("/api/sentry-example")
          }}
        >
          Trigger server error
        </button>
      </div>
    </main>
  )
}
