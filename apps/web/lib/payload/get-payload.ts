import config from "@payload-config"
import { getPayload, type Payload } from "payload"

let payloadPromise: Promise<Payload> | undefined

/** One Payload instance per Fluid isolate — avoid re-init + sharp on every RSC.
 * Do not cache a rejected init: a cold Neon miss would brick the isolate. */
export function getPayloadClient() {
  payloadPromise ??= getPayload({ config }).catch((error: unknown) => {
    payloadPromise = undefined
    throw error
  })
  return payloadPromise
}
