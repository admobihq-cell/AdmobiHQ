import { ApiLogo } from "../components/api-logo"

type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE"

type Endpoint = {
  method: HttpMethod
  path: string
  note?: string
}

type EndpointGroup = {
  title: string
  description: string
  badge: "public" | "auth"
  endpoints: Endpoint[]
}

const endpointGroups: EndpointGroup[] = [
  {
    title: "Public routes",
    description: "Marketing forms and public signups. CORS-enabled, no auth required.",
    badge: "public",
    endpoints: [
      { method: "POST", path: "/v1/public/leads", note: "Campaign & fleet partner forms" },
      { method: "POST", path: "/v1/public/drivers", note: "Driver enrollment" },
      { method: "POST", path: "/v1/public/waitlist", note: "Waitlist signup" },
      { method: "POST", path: "/v1/public/media-kit", note: "Media kit request" },
    ],
  },
  {
    title: "Admin routes",
    description: "Ops console and mobile clients. Requires a Clerk session JWT.",
    badge: "auth",
    endpoints: [
      { method: "GET", path: "/v1/stats", note: "Dashboard stats" },
      { method: "GET", path: "/v1/leads", note: "List leads" },
      { method: "POST", path: "/v1/leads", note: "Create lead" },
      { method: "PATCH", path: "/v1/leads/[id]", note: "Update lead" },
      { method: "DELETE", path: "/v1/leads/[id]", note: "Delete lead" },
    ],
  },
  {
    title: "Fleet, drivers & waitlist",
    description: "Same CRUD pattern as leads, plus bulk actions on each resource.",
    badge: "auth",
    endpoints: [
      { method: "GET", path: "/v1/fleet" },
      { method: "GET", path: "/v1/drivers" },
      { method: "GET", path: "/v1/waitlist" },
      { method: "GET", path: "/v1/media-kit" },
      { method: "POST", path: "/v1/*/bulk", note: "Bulk create/update per resource" },
    ],
  },
  {
    title: "Health & status",
    description: "Use for uptime checks and load balancer probes.",
    badge: "public",
    endpoints: [{ method: "GET", path: "/v1/health", note: "Returns service status JSON" }],
  },
]

function methodClass(method: HttpMethod) {
  if (method === "GET") return "api-method api-method-get"
  if (method === "POST") return "api-method api-method-post"
  return "api-method api-method-write"
}

export default function HomePage() {
  return (
    <div className="api-page">
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

        <section className="api-hero">
          <p className="api-hero-eyebrow">REST · v1</p>
          <h1>Admobi API</h1>
          <p className="api-hero-lead">
            JSON endpoints for marketing form submissions and ops admin CRUD. Routes are
            served under <code>/v1</code> and <code>/v1/public</code>.
          </p>
        </section>

        <div className="api-grid">
          {endpointGroups.map((group) => (
            <article key={group.title} className="api-card">
              <div className="api-card-header">
                <div>
                  <h2 className="api-card-title">{group.title}</h2>
                  <p className="api-card-desc">{group.description}</p>
                </div>
                <span
                  className={`api-badge ${
                    group.badge === "public" ? "api-badge-public" : "api-badge-auth"
                  }`}
                >
                  {group.badge === "public" ? "Public" : "Clerk JWT"}
                </span>
              </div>

              <ul className="api-endpoints">
                {group.endpoints.map((endpoint) => (
                  <li key={`${endpoint.method}-${endpoint.path}`} className="api-endpoint">
                    <span className={methodClass(endpoint.method)}>{endpoint.method}</span>
                    <span className="api-path">
                      {endpoint.path}
                      {endpoint.note ? (
                        <span className="api-path-muted"> — {endpoint.note}</span>
                      ) : null}
                    </span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>

        <footer className="api-footer">
          <span>Local dev: http://localhost:3003</span>
          <a href="https://admobihq.com">admobihq.com</a>
        </footer>
      </div>
    </div>
  )
}
