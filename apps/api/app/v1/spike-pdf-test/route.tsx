import { renderPdf } from "@/lib/pdf/render-pdf"

export async function GET() {
  const bytes = await renderPdf(
    <div tw="flex flex-col p-8 text-[14px]">
      <span tw="font-semibold" style={{ color: "#b45309" }}>
        Admobi
      </span>
      <span>PDF spike — if you can read this in a PDF viewer, Takumi works.</span>
    </div>,
  )
  return new Response(Buffer.from(bytes), {
    status: 200,
    headers: { "Content-Type": "application/pdf" },
  })
}
