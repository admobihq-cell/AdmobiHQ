"use client"

import { Fragment, type ReactNode } from "react"

/** Stub for Payload import map when clientUploads is disabled (server-side Blob only). */
export function VercelBlobClientUploadHandler({ children }: { children?: ReactNode }) {
  return <Fragment>{children}</Fragment>
}
