# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v54.0.0/ before writing any code.

This is the **driver** mobile app (`apps/driver-mobile`), scaffolded from the customer-mobile
pattern — see [docs/driver/DRIVER-APP.md](../../docs/driver/DRIVER-APP.md) for the full plan. It has **no Clerk
session mounted yet** (dormant auth seam, same pattern as customer-mobile). No push notifications
yet either — deferred until drivers can log in.

**Before EAS builds or OTA updates work**, this app needs its own EAS project:
run `eas init` from this directory (or `eas project:init`) to populate `extra.eas.projectId` and
`updates.url` in app.json — they're intentionally omitted from the scaffold rather than faked.
