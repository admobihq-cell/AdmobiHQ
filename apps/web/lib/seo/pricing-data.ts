/** The rate card now lives in @workspace/ui/lib/pricing so the advertiser
 * console's campaign wizard prices a flight with exactly the same numbers
 * this marketing page quotes. Re-exported here so existing imports (and the
 * llms.txt/static-AI generators) keep working. */
export * from "@workspace/ui/lib/pricing"
