/**
 * EU Directive 2019/790 content-signals preamble for robots.txt.
 * @see https://contentsignals.org/
 */
export const ROBOTS_CONTENT_SIGNALS_PREAMBLE = `# As a condition of accessing this website, you agree to abide by the following
# content signals:
#
# (a)  If a content-signal = yes, you may collect content for the corresponding
#      use.
# (b)  If a content-signal = no, you may not collect content for the
#      corresponding use.
# (c)  If the website operator does not include a content signal for a
#      corresponding use, the website operator neither grants nor restricts
#      permission via content signal with respect to the corresponding use.
#
# The content signals and their meanings are:
#
# search:   building a search index and providing search results (e.g., returning
#           hyperlinks and short excerpts from your website's contents). Search does not
#           include providing AI-generated search summaries.
# ai-input: inputting content into one or more AI models (e.g., retrieval
#           augmented generation, grounding, or other real-time taking of content for
#           generative AI search answers).
# ai-train: training or fine-tuning AI models.
#
# ANY RESTRICTIONS EXPRESSED VIA CONTENT SIGNALS ARE EXPRESS RESERVATIONS OF
# RIGHTS UNDER ARTICLE 4 OF THE EUROPEAN UNION DIRECTIVE 2019/790 ON COPYRIGHT
# AND RELATED RIGHTS IN THE DIGITAL SINGLE MARKET.
`

/** Block AI training; allow search indexing and AI ingestion for answer engines. */
export const ROBOTS_CONTENT_SIGNAL =
  "Content-Signal: ai-train=no, search=yes, ai-input=yes"

/** Crawlers used by AI search and answer products — explicitly allowed sitewide. */
export const ROBOTS_AI_SEARCH_USER_AGENTS = [
  "GPTBot",
  "ChatGPT-User",
  "PerplexityBot",
  "ClaudeBot",
  "anthropic-ai",
  "GoogleOther",
  "Google-Extended",
  "Googlebot",
  "bingbot",
  "OAI-SearchBot",
  "cohere-ai",
  "YouBot",
]

const ROBOTS_AI_SEARCH_SECTION = [
  "# AI Search & Answer Engines",
  ...ROBOTS_AI_SEARCH_USER_AGENTS.flatMap((userAgent) => [
    `User-agent: ${userAgent}`,
    "Allow: /",
    "",
  ]),
].join("\n")

const ROBOTS_API_BLOCK_SECTION = `# Block all bots from API routes
User-agent: *
Disallow: /api/
`

/**
 * @param {string} robotsTxt
 * @returns {string}
 */
export function enhanceRobotsTxt(robotsTxt) {
  const withContentSignal = robotsTxt.replace(
    /^User-agent: \*\r?\n/m,
    `User-agent: *\n${ROBOTS_CONTENT_SIGNAL}\n`
  )

  const withAiSearchPolicies = withContentSignal.replace(
    /^(User-agent: \*\r?\nContent-Signal:.*\r?\nAllow: \/\r?\nDisallow: \/api\/\r?\n)/m,
    `$1\n${ROBOTS_AI_SEARCH_SECTION}\n${ROBOTS_API_BLOCK_SECTION}\n`
  )

  const withoutDuplicateSitemaps = withAiSearchPolicies.replace(
    /(# Sitemaps\r?\nSitemap: [^\r\n]+\r?\n)(?:# Sitemaps\r?\nSitemap: [^\r\n]+\r?\n)+/g,
    "$1"
  )

  return `${ROBOTS_CONTENT_SIGNALS_PREAMBLE}\n${withoutDuplicateSitemaps}`
}
