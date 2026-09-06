/** The rate card lives in @workspace/ops-contracts/pricing — pure TypeScript
 * with no React or DOM, so the advertiser console (apps/customer-web) and the
 * Expo app (apps/customer-mobile) price a flight off exactly the same numbers
 * this marketing page quotes. Re-exported here so the existing imports, and
 * the llms.txt / static-AI generators, keep working. */
export * from "@workspace/ops-contracts/pricing"
