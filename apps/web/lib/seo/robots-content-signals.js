/**
 * EU Directive 2019/790 content-signals preamble for robots.txt.
 * @see https://contentsignals.org/
 */
const ROBOTS_CONTENT_SIGNALS_PREAMBLE = `# As a condition of accessing this website, you agree to abide by the following
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
#
# Active policy (also sent as HTTP Content-Signal on page responses):
# ai-train=no, search=yes, ai-input=yes
`

/** Block AI training; allow search indexing and AI ingestion for answer engines. */
const CONTENT_SIGNAL_VALUE = "ai-train=no, search=yes, ai-input=yes"

/**
 * Sent on every HTML response. Googlebot does not parse Content-Signal in robots.txt;
 * use the header so compliant crawlers still receive the policy without GSC warnings.
 */
export const CONTENT_SIGNAL_HEADER = {
  key: "Content-Signal",
  value: CONTENT_SIGNAL_VALUE,
}

/** Crawlers used by AI search and answer products; explicitly allowed sitewide. */
const ROBOTS_AI_SEARCH_USER_AGENTS = [
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
  const withoutUnsupportedDirectives = robotsTxt
    .replace(/^Content-Signal:.*\r?\n/gm, "")
    .replace(/^# Host\r?\nHost:.*\r?\n/gm, "")
    .replace(/^Host:.*\r?\n/gm, "")

  const withAiSearchPolicies = withoutUnsupportedDirectives.replace(
    /^(User-agent: \*\r?\nAllow: \/\r?\nDisallow: \/api\/\r?\n)/m,
    `$1\n${ROBOTS_AI_SEARCH_SECTION}\n${ROBOTS_API_BLOCK_SECTION}\n`
  )

  const withoutDuplicateSitemaps = withAiSearchPolicies.replace(
    /(^# Sitemaps\r?\nSitemap: [^\r\n]+\r?\n)(?:# Sitemaps\r?\nSitemap: [^\r\n]+\r?\n)+/gm,
    "$1"
  )

  return `${ROBOTS_CONTENT_SIGNALS_PREAMBLE}\n${withoutDuplicateSitemaps}`
}
