/**
 * Constants shared by the finance queries and the finance screens. Kept apart from finance.ts,
 * which imports the database pool and must never end up in a browser bundle.
 */

/** "Deleted organization" and "No campaign" keep a ledger row visible when its owner is gone. */
export const DELETED_ORG = "Deleted organization"
export const NO_CAMPAIGN = "No campaign"

/** A wallet with no activity for this long is shown as inactive. */
export const INACTIVE_AFTER_DAYS = 60
