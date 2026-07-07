import { getPgPool } from "@/lib/pg"

export type ContentStats = {
  blog: { total: number; published: number; draft: number }
  help: { total: number; published: number; draft: number }
  media: { total: number; totalSize: number }
  recentDrafts: Array<{
    id: number
    title: string
    type: string
    updatedAt: string
  }>
}

export async function getContentStats(): Promise<ContentStats | null> {
  if (!process.env.DATABASE_URL) return null

  try {
    const pg = getPgPool()

    const [blogRows, helpRows, mediaRow, draftRows] = await Promise.all([
      pg.query<{ _status: string; count: string }>(
        `SELECT _status, COUNT(*)::text AS count FROM blog_posts GROUP BY _status`,
      ),
      pg.query<{ _status: string; count: string }>(
        `SELECT _status, COUNT(*)::text AS count FROM help_articles GROUP BY _status`,
      ),
      pg.query<{ count: string; total_size: string | null }>(
        `SELECT COUNT(*)::text AS count, COALESCE(SUM(filesize), 0)::text AS total_size FROM media`,
      ),
      pg.query<{ id: number; title: string; type: string; updated_at: Date }>(
        `
        (
          SELECT id, title, 'blog' AS type, updated_at FROM blog_posts WHERE _status = 'draft'
          ORDER BY updated_at DESC LIMIT 5
        )
        UNION ALL
        (
          SELECT id, title, 'help' AS type, updated_at FROM help_articles WHERE _status = 'draft'
          ORDER BY updated_at DESC LIMIT 5
        )
        ORDER BY updated_at DESC
        LIMIT 10
        `,
      ),
    ])

    const blogStatus = Object.fromEntries(
      blogRows.rows.map((r) => [r._status, Number.parseInt(r.count, 10)]),
    )
    const helpStatus = Object.fromEntries(
      helpRows.rows.map((r) => [r._status, Number.parseInt(r.count, 10)]),
    )

    return {
      blog: {
        total: (blogStatus.published ?? 0) + (blogStatus.draft ?? 0),
        published: blogStatus.published ?? 0,
        draft: blogStatus.draft ?? 0,
      },
      help: {
        total: (helpStatus.published ?? 0) + (helpStatus.draft ?? 0),
        published: helpStatus.published ?? 0,
        draft: helpStatus.draft ?? 0,
      },
      media: {
        total: Number.parseInt(mediaRow.rows[0]?.count ?? "0", 10),
        totalSize: Number.parseInt(mediaRow.rows[0]?.total_size ?? "0", 10),
      },
      recentDrafts: draftRows.rows.map((r) => ({
        id: r.id,
        title: r.title,
        type: r.type,
        updatedAt: r.updated_at.toISOString(),
      })),
    }
  } catch {
    return null
  }
}
