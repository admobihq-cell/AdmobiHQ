import { unstable_cache } from "next/cache"

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

type ContentStatsRow = {
  blog: Record<string, number> | null
  help: Record<string, number> | null
  media_count: string
  media_size: string
  drafts: Array<{ id: number; title: string; type: string; updated_at: string }> | null
}

async function queryContentStats(): Promise<ContentStats | null> {
  if (!process.env.DATABASE_URL) return null

  try {
    const pg = getPgPool()
    const result = await pg.query<ContentStatsRow>(
      `
      SELECT
        (SELECT COALESCE(json_object_agg(_status, c), '{}'::json)
           FROM (SELECT _status, COUNT(*)::int AS c FROM cms.blog_posts GROUP BY _status) s
        ) AS blog,
        (SELECT COALESCE(json_object_agg(_status, c), '{}'::json)
           FROM (SELECT _status, COUNT(*)::int AS c FROM cms.help_articles GROUP BY _status) s
        ) AS help,
        (SELECT COUNT(*)::text FROM cms.media) AS media_count,
        (SELECT COALESCE(SUM(filesize), 0)::text FROM cms.media) AS media_size,
        (
          SELECT COALESCE(json_agg(json_build_object(
            'id', id, 'title', title, 'type', type, 'updated_at', updated_at
          ) ORDER BY updated_at DESC), '[]'::json)
          FROM (
            SELECT * FROM (
              SELECT id, title, 'blog' AS type, updated_at FROM cms.blog_posts WHERE _status = 'draft'
              ORDER BY updated_at DESC LIMIT 5
            ) blog_drafts
            UNION ALL
            SELECT * FROM (
              SELECT id, title, 'help' AS type, updated_at FROM cms.help_articles WHERE _status = 'draft'
              ORDER BY updated_at DESC LIMIT 5
            ) help_drafts
            ORDER BY updated_at DESC
            LIMIT 10
          ) drafts
        ) AS drafts
      `,
    )

    const row = result.rows[0]
    const blogStatus = row?.blog ?? {}
    const helpStatus = row?.help ?? {}

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
        total: Number.parseInt(row?.media_count ?? "0", 10),
        totalSize: Number.parseInt(row?.media_size ?? "0", 10),
      },
      recentDrafts: (row?.drafts ?? []).map((r) => ({
        id: r.id,
        title: r.title,
        type: r.type,
        updatedAt: typeof r.updated_at === "string" ? r.updated_at : new Date(r.updated_at).toISOString(),
      })),
    }
  } catch (error) {
    console.error("[getContentStats]", error)
    return null
  }
}

export function getContentStats(): Promise<ContentStats | null> {
  return unstable_cache(queryContentStats, ["ops-content-stats"], {
    revalidate: 300,
  })()
}
