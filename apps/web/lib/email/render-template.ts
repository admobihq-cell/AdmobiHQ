import { render } from "react-email"

export async function renderTemplate(component: any, props: Record<string, any>) {
  try {
    const html = await render(component(props))
    return html
  } catch (error) {
    console.error("[Email] Failed to render template:", error)
    throw error
  }
}
