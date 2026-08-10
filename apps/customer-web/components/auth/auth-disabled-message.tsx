export function AuthDisabledMessage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-2 px-4 text-center">
      <h1 className="font-heading text-xl font-medium">Sign-in isn&apos;t enabled here</h1>
      <p className="text-sm text-muted-foreground">
        This environment is running without auth configured. Set
        NEXT_PUBLIC_AUTH_ENABLED=true and a Clerk publishable key to try it.
      </p>
    </div>
  )
}
