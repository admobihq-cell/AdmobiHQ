import type { FormFieldDef, FormFieldOption } from "@workspace/ops-contracts"
import {
  DRIVER_FORM_FIELDS,
  DRIVER_STATUS_OPTIONS,
  driverFormFromRecord,
  driverFormToPayload,
  FLEET_FORM_FIELDS,
  FLEET_STATUS_OPTIONS,
  fleetFormFromRecord,
  fleetFormToPayload,
  LEAD_FORM_FIELDS,
  LEAD_STATUS_OPTIONS,
  leadFormFromRecord,
  leadFormToPayload,
  MEDIA_KIT_FORM_FIELDS,
  mediaKitFormFromRecord,
  mediaKitFormToPayload,
  WAITLIST_FORM_FIELDS,
  waitlistFormFromRecord,
  waitlistFormToPayload,
} from "@workspace/ops-contracts"
import {
  driverCreateSchema,
  driverUpdateSchema,
  fleetCreateSchema,
  fleetUpdateSchema,
  leadCreateSchema,
  leadUpdateSchema,
  mediaKitCreateSchema,
  mediaKitUpdateSchema,
  waitlistCreateSchema,
  waitlistUpdateSchema,
} from "@workspace/ops-contracts/schemas"
import type { OpsClient } from "@workspace/ops-api-client"

export type EntityKey =
  | "leads"
  | "drivers"
  | "fleet"
  | "waitlist"
  | "mediaKit"

export type EntityFormConfig = {
  key: EntityKey
  singular: string
  fields: FormFieldDef[]
  statusOptions?: FormFieldOption[]
  defaultValues?: Record<string, string>
  fromRecord: (record: never) => Record<string, string>
  toPayload: (values: Record<string, string>) => Record<string, unknown>
  validateCreate: (payload: Record<string, unknown>) => string | null
  validateUpdate: (payload: Record<string, unknown>) => string | null
  create: (client: OpsClient, payload: Record<string, unknown>) => Promise<unknown>
  update: (
    client: OpsClient,
    id: number,
    payload: Record<string, unknown>,
  ) => Promise<unknown>
  get: (client: OpsClient, id: number) => Promise<unknown>
}

function validationError(result: {
  success: boolean
  error?: { issues: Array<{ message: string }> }
}): string | null {
  if (result.success) return null
  return result.error?.issues[0]?.message ?? "Validation failed"
}

export const ENTITY_FORM_CONFIGS: Record<EntityKey, EntityFormConfig> = {
  leads: {
    key: "leads",
    singular: "Campaign lead",
    fields: LEAD_FORM_FIELDS,
    statusOptions: LEAD_STATUS_OPTIONS,
    defaultValues: { status: "new" },
    fromRecord: leadFormFromRecord as EntityFormConfig["fromRecord"],
    toPayload: leadFormToPayload,
    validateCreate: (payload) =>
      validationError(leadCreateSchema.safeParse(payload)),
    validateUpdate: (payload) =>
      validationError(leadUpdateSchema.safeParse(payload)),
    create: (client, payload) => client.leads.create(payload as never),
    update: (client, id, payload) => client.leads.update(id, payload as never),
    get: (client, id) => client.leads.get(id),
  },
  drivers: {
    key: "drivers",
    singular: "Driver",
    fields: DRIVER_FORM_FIELDS,
    statusOptions: DRIVER_STATUS_OPTIONS,
    defaultValues: { status: "pending" },
    fromRecord: driverFormFromRecord as EntityFormConfig["fromRecord"],
    toPayload: driverFormToPayload,
    validateCreate: (payload) =>
      validationError(driverCreateSchema.safeParse(payload)),
    validateUpdate: (payload) =>
      validationError(driverUpdateSchema.safeParse(payload)),
    create: (client, payload) => client.drivers.create(payload as never),
    update: (client, id, payload) =>
      client.drivers.update(id, payload as never),
    get: (client, id) => client.drivers.get(id),
  },
  fleet: {
    key: "fleet",
    singular: "Fleet partner",
    fields: FLEET_FORM_FIELDS,
    statusOptions: FLEET_STATUS_OPTIONS,
    defaultValues: { status: "pending" },
    fromRecord: fleetFormFromRecord as EntityFormConfig["fromRecord"],
    toPayload: fleetFormToPayload,
    validateCreate: (payload) =>
      validationError(fleetCreateSchema.safeParse(payload)),
    validateUpdate: (payload) =>
      validationError(fleetUpdateSchema.safeParse(payload)),
    create: (client, payload) => client.fleet.create(payload as never),
    update: (client, id, payload) => client.fleet.update(id, payload as never),
    get: (client, id) => client.fleet.get(id),
  },
  waitlist: {
    key: "waitlist",
    singular: "Waitlist entry",
    fields: WAITLIST_FORM_FIELDS,
    fromRecord: waitlistFormFromRecord as EntityFormConfig["fromRecord"],
    toPayload: waitlistFormToPayload,
    validateCreate: (payload) =>
      validationError(waitlistCreateSchema.safeParse(payload)),
    validateUpdate: (payload) =>
      validationError(waitlistUpdateSchema.safeParse(payload)),
    create: (client, payload) => client.waitlist.create(payload as never),
    update: (client, id, payload) =>
      client.waitlist.update(id, payload as never),
    get: (client, id) => client.waitlist.get(id),
  },
  mediaKit: {
    key: "mediaKit",
    singular: "Media kit request",
    fields: MEDIA_KIT_FORM_FIELDS,
    fromRecord: mediaKitFormFromRecord as EntityFormConfig["fromRecord"],
    toPayload: mediaKitFormToPayload,
    validateCreate: (payload) =>
      validationError(mediaKitCreateSchema.safeParse(payload)),
    validateUpdate: (payload) =>
      validationError(mediaKitUpdateSchema.safeParse(payload)),
    create: (client, payload) => client.mediaKit.create(payload as never),
    update: (client, id, payload) =>
      client.mediaKit.update(id, payload as never),
    get: (client, id) => client.mediaKit.get(id),
  },
}

export function getEntityFormConfig(key: string): EntityFormConfig | null {
  if (key in ENTITY_FORM_CONFIGS) {
    return ENTITY_FORM_CONFIGS[key as EntityKey]
  }
  return null
}
