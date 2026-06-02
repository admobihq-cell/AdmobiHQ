import pg from "pg"

/**
 * Build-time help URLs for next-sitemap. Uses Postgres directly so next-sitemap.config.js
 * does not need to boot the full Payload app.
 */
export async function fetchHelpSitemapPaths() {
  const now = new Date().toISOString()
  const base = [
    {
      loc: "/help",
      changefreq: "weekly",
      priority: 0.8,
      lastmod: now,
    },
  ]

  const connectionString = process.env.DATABASE_URL?.trim()
  if (!connectionString) {
    return base
  }

  const pool = new pg.Pool({ connectionString })

  try {
    const result = await pool.query(
      `SELECT slug FROM help_articles
       WHERE slug IS NOT NULL
         AND (_status = 'published' OR _status IS NULL)
       ORDER BY slug`,
    )

    return [
      ...base,
      ...result.rows.map((row) => ({
        loc: `/help/${row.slug}`,
        changefreq: "weekly",
        priority: 0.7,
        lastmod: now,
      })),
    ]
  } catch {
    return base
  } finally {
    await pool.end()
  }
}
