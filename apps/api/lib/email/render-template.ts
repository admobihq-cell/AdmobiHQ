import type { ReactElement } from "react"
import { render } from "react-email"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function renderTemplate(component: (props: any) => ReactElement, props: Record<string, unknown>) {
  try {
    const html = await render(component(props))
    return html
  } catch (error) {
    console.error("[Email] Failed to render template:", error)
    throw error
  }
}
