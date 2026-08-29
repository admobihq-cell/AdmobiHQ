import config from "@payload-config"
import { getPayload, type Payload } from "payload"

let payloadPromise: Promise<Payload> | undefined

/** One Payload instance per Fluid isolate — avoid re-init + sharp on every RSC. */
export function getPayloadClient() {
  payloadPromise ??= getPayload({ config })
  return payloadPromise
}
