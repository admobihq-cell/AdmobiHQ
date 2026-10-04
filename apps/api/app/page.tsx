import { buildCatalog, type HttpMethod } from "@/lib/route-catalog"

import { ApiLogo } from "../components/api-logo"

// The catalogue reads the route files, which only exist at build time.
export const dynamic = "force-static"

const FLAT_LIST_MAX = 12

const METHOD_CLASS: Record<HttpMethod, string> = {
  GET: "api-method-get",
  POST: "api-method-post",
  PATCH: "api-method-patch",
  PUT: "api-method-patch",
  DELETE: "api-method-delete",
}

/** `/v1/leads/[id]` as slash-separated segments, with `[id]` shown as `{id}`. */
function RoutePath({ path }: { path: string }) {
  return (
    <code className="api-path">
      {path
        .split("/")
        .filter(Boolean)
        .map((segment, index) => {
          const param = /^\[(.+)\]$/.exec(segment)
          return (
            <span key={index} className="api-segment">
              <span className="api-slash">/</span>
              {param ? <span className="api-param">{`{${param[1]}}`}</span> : segment}
            </span>
          )
        })}
    </code>
  )
}

export default function HomePage() {
  const catalog = buildCatalog()
  const total = catalog.reduce((sum, audience) => sum + audience.count, 0)

  return (
    <div className="api-shell">
      <header className="api-header">
        <a href="https://admobihq.com" className="api-brand">
          <ApiLogo className="api-brand-mark" />
          <span className="api-brand-text">
            <span className="api-brand-name">Admobi</span>
            <span className="api-brand-subtitle">Business API</span>
          </span>
        </a>

        <a href="/v1/health" className="api-status">
          <span className="api-status-dot" aria-hidden />
          Check health
        </a>
      </header>

      <section className="api-intro">
        <h1>Admobi API</h1>
        <p className="api-intro-lead">
          One REST API behind the marketing site, the ops console, and the advertiser and driver
          apps. Every route speaks JSON under <code>/v1</code>.
        </p>
        <p className="api-intro-meta">
          {total} routes, listed straight from the deployed route files and grouped by who is
          allowed to call them.
        </p>
      </section>

      <div className="api-layout">
        <nav className="api-index" aria-label="Route groups">
          <ol>
            {catalog.map((audience) => (
              <li key={audience.id}>
                <a href={`#${audience.id}`}>
                  <span>{audience.title}</span>
                  <span className="api-count">{audience.count}</span>
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <main className="api-sections">
          {catalog.map((audience) => (
            <section
              key={audience.id}
              id={audience.id}
              className="api-section"
              aria-labelledby={`${audience.id}-title`}
            >
              <div className="api-section-head">
                <h2 id={`${audience.id}-title`}>{audience.title}</h2>
                <span className={`api-auth api-auth-${audience.id}`}>{audience.auth}</span>
              </div>
              <p className="api-section-desc">{audience.description}</p>

              {/* Small audiences read better as one list than as a heading per route. */}
              {(audience.count <= FLAT_LIST_MAX
                ? [{ name: "", endpoints: audience.resources.flatMap((r) => r.endpoints) }]
                : audience.resources
              ).map((resource) => (
                <div key={resource.name} className="api-resource">
                  {resource.name ? <h3>{resource.name}</h3> : null}
                  <ul className="api-rows">
                    {resource.endpoints.map((endpoint) => (
                      <li key={endpoint.path} className="api-row">
                        <span className="api-methods">
                          {endpoint.methods.map((method) => (
                            <span key={method} className={`api-method ${METHOD_CLASS[method]}`}>
                              {method}
                            </span>
                          ))}
                        </span>
                        <RoutePath path={endpoint.path} />
                        {endpoint.note ? <span className="api-note">{endpoint.note}</span> : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </section>
          ))}
        </main>
      </div>

      <footer className="api-footer">
        <span>
          Local dev: <code>http://localhost:3003</code>
        </span>
        <a href="https://admobihq.com">admobihq.com</a>
      </footer>
    </div>
  )
}
