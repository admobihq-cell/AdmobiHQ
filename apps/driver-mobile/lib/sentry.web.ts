/**
 * Web build of lib/sentry — Metro resolves this over sentry.ts when bundling
 * for web. The web export is a demo-only fallback (Expo web has no
 * production audience for the driver app), so it stays a no-op rather than
 * reporting demo-visitor noise into the same production Sentry project the
 * native apps use. Sentry.wrap(RootLayout) in app/_layout.tsx is safe to
 * leave in place — it's inert without an active SDK init.
 */
export function initSentry() {}
