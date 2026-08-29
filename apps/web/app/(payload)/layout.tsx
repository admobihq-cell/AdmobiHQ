/* Payload admin layout, generated pattern from blank template */
import config from "@payload-config"
import "@payloadcms/next/css"
import type { ServerFunctionClient } from "payload"
import { handleServerFunctions, RootLayout } from "@payloadcms/next/layouts"
import type { ReactNode } from "react"

import { importMap } from "./admin/importMap.js"
import "./custom.scss"

export const dynamic = "force-dynamic"
export const maxDuration = 60

type Args = {
  children: ReactNode
}

const serverFunction: ServerFunctionClient = async function (args) {
  "use server"
  return handleServerFunctions({
    ...args,
    config,
    importMap,
  })
}

export default function Layout({ children }: Args) {
  return (
    <RootLayout config={config} importMap={importMap} serverFunction={serverFunction}>
      {children}
    </RootLayout>
  )
}
