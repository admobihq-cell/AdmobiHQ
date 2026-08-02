import {
  buildListQueryParams,
  type AnnouncementDto,
  type ApiErrorResponse,
  type AuditEventDto,
  type AuditListQueryParams,
  type BroadcastCreateInput,
  type BulkResponse,
  type DateRangeKey,
  type DriverBulkInput,
  type DriverCreateInput,
  type DriverDto,
  type DriverUpdateInput,
  type FleetBulkInput,
  type FleetCreateInput,
  type FleetPartnerDto,
  type FleetUpdateInput,
  type LeadBulkInput,
  type LeadCreateInput,
  type LeadDto,
  type LeadUpdateInput,
  type ListQueryParams,
  type MediaKitBulkInput,
  type MediaKitCreateInput,
  type MediaKitRequestDto,
  type MediaKitUpdateInput,
  type PaginatedResponse,
  type StatsResponseDto,
  type SuccessResponse,
  type SupportCaseDetailDto,
  type SupportCaseDto,
  type SupportCaseUpdateInput,
  type SupportListQueryParams,
  type SupportMessageCreateInput,
  type SupportMessageDto,
  type WaitlistBulkInput,
  type WaitlistCreateInput,
  type WaitlistEntryDto,
  type WaitlistUpdateInput,
} from "@workspace/ops-contracts"

import { getApiBaseUrl, publicApiUrl } from "./base-url"
import { OpsApiError } from "./errors"
import { formatApiError, formatApiErrorResponse } from "./format-error"
import { publicApiFetch, type PublicApiResult } from "./public-fetch"

export { OpsApiError, getApiBaseUrl, publicApiUrl, formatApiError, formatApiErrorResponse, publicApiFetch }
export type { PublicApiResult }

export type OpsClientOptions = {
  /** Base URL for the API, e.g. `https://api.admobihq.com` or `http://localhost:3003`. */
  baseUrl: string
  /** API path prefix. Defaults to `/v1`. */
  apiPrefix?: string
  /** Returns a Clerk session JWT, or null if unauthenticated. */
  getToken: () => Promise<string | null>
  /** Optional fetch implementation (defaults to global fetch). */
  fetch?: typeof fetch
  /** Abort a request if it hasn't completed within this many ms. Defaults to 12000. */
  requestTimeoutMs?: number
}

type EntityResource<
  TDto,
  TCreate,
  TUpdate,
  TBulk,
  TList extends ListQueryParams = ListQueryParams,
> = {
  list: (params?: TList) => Promise<PaginatedResponse<TDto>>
  get: (id: number) => Promise<TDto>
  create: (body: TCreate) => Promise<TDto>
  update: (id: number, body: TUpdate) => Promise<TDto>
  delete: (id: number) => Promise<SuccessResponse>
  bulk: (body: TBulk) => Promise<BulkResponse>
}

export type OpsClient = {
  leads: EntityResource<
    LeadDto,
    LeadCreateInput,
    LeadUpdateInput,
    LeadBulkInput,
    ListQueryParams & { budget?: string; status?: string }
  >
  fleet: EntityResource<
    FleetPartnerDto,
    FleetCreateInput,
    FleetUpdateInput,
    FleetBulkInput,
    ListQueryParams & { city?: string; status?: string }
  >
  drivers: EntityResource<
    DriverDto,
    DriverCreateInput,
    DriverUpdateInput,
    DriverBulkInput,
    ListQueryParams & { city?: string; status?: string; vehicleType?: string }
  >
  waitlist: EntityResource<
    WaitlistEntryDto,
    WaitlistCreateInput,
    WaitlistUpdateInput,
    WaitlistBulkInput
  >
  mediaKit: EntityResource<
    MediaKitRequestDto,
    MediaKitCreateInput,
    MediaKitUpdateInput,
    MediaKitBulkInput
  >
  stats: {
    get: (params?: { range?: DateRangeKey }) => Promise<StatsResponseDto>
  }
  pushTokens: {
    register: (body: {
      expoPushToken: string
      platform?: "android" | "ios" | "web"
    }) => Promise<SuccessResponse>
    unregister: (body: { expoPushToken: string }) => Promise<SuccessResponse>
  }
  notifications: {
    broadcast: (body: BroadcastCreateInput) => Promise<AnnouncementDto>
    list: (params?: {
      page?: number
      pageSize?: number
    }) => Promise<PaginatedResponse<AnnouncementDto>>
  }
  audit: {
    list: (params?: AuditListQueryParams) => Promise<PaginatedResponse<AuditEventDto>>
  }
  support: {
    list: (params?: SupportListQueryParams) => Promise<PaginatedResponse<SupportCaseDto>>
    get: (id: number) => Promise<SupportCaseDetailDto>
    update: (id: number, body: SupportCaseUpdateInput) => Promise<SupportCaseDto>
    reply: (id: number, body: SupportMessageCreateInput) => Promise<SupportMessageDto>
  }
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/$/, "")
}

async function parseError(res: Response): Promise<OpsApiError> {
  let body: ApiErrorResponse | undefined
  try {
    body = (await res.json()) as ApiErrorResponse
  } catch {
    body = undefined
  }
  return new OpsApiError(
    formatApiErrorResponse(body, res.status),
    res.status,
    body?.issues,
  )
}

export function createOpsClient(options: OpsClientOptions): OpsClient {
  const baseUrl = normalizeBaseUrl(options.baseUrl)
  const apiPrefix = options.apiPrefix ?? "/v1"
  const fetchImpl = options.fetch ?? fetch
  const requestTimeoutMs = options.requestTimeoutMs ?? 12_000

  async function request<T>(
    path: string,
    init: RequestInit = {},
  ): Promise<T> {
    const token = await options.getToken()
    const headers = new Headers(init.headers)
    if (!headers.has("Content-Type") && init.body) {
      headers.set("Content-Type", "application/json")
    }
    if (token) {
      headers.set("Authorization", `Bearer ${token}`)
    }

    const controller = new AbortController()
    const callerSignal = init.signal
    const onCallerAbort = () => controller.abort()
    if (callerSignal) {
      if (callerSignal.aborted) controller.abort()
      else callerSignal.addEventListener("abort", onCallerAbort)
    }
    const timer = setTimeout(() => controller.abort(), requestTimeoutMs)

    let res: Response
    try {
      res = await fetchImpl(`${baseUrl}${path}`, {
        ...init,
        headers,
        signal: controller.signal,
      })
    } catch (err) {
      if (controller.signal.aborted) {
        throw new OpsApiError(
          "Request timed out. Check your connection and try again.",
          408,
        )
      }
      throw err
    } finally {
      clearTimeout(timer)
      callerSignal?.removeEventListener("abort", onCallerAbort)
    }

    if (!res.ok) {
      throw await parseError(res)
    }

    if (res.status === 204) {
      return undefined as T
    }

    return (await res.json()) as T
  }

  function createEntityResource<
    TDto,
    TCreate,
    TUpdate,
    TBulk,
    TList extends ListQueryParams = ListQueryParams,
  >(apiPath: string): EntityResource<TDto, TCreate, TUpdate, TBulk, TList> {
    return {
      list: (params = {} as TList) => {
        const query = buildListQueryParams({
          page: params.page,
          pageSize: params.pageSize,
          search: params.search,
          sortBy: params.sortBy,
          sortDir: params.sortDir,
          budget: "budget" in params ? params.budget : undefined,
          status: "status" in params ? params.status : undefined,
          city: "city" in params ? params.city : undefined,
          vehicleType: "vehicleType" in params ? params.vehicleType : undefined,
        })
        const qs = query.toString()
        return request<PaginatedResponse<TDto>>(
          `${apiPath}${qs ? `?${qs}` : ""}`,
        )
      },
      get: (id) => request<TDto>(`${apiPath}/${id}`),
      create: (body) =>
        request<TDto>(apiPath, {
          method: "POST",
          body: JSON.stringify(body),
        }),
      update: (id, body) =>
        request<TDto>(`${apiPath}/${id}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        }),
      delete: (id) =>
        request<SuccessResponse>(`${apiPath}/${id}`, { method: "DELETE" }),
      bulk: (body) =>
        request<BulkResponse>(`${apiPath}/bulk`, {
          method: "POST",
          body: JSON.stringify(body),
        }),
    }
  }

  return {
    leads: createEntityResource(`${apiPrefix}/leads`),
    fleet: createEntityResource(`${apiPrefix}/fleet`),
    drivers: createEntityResource(`${apiPrefix}/drivers`),
    waitlist: createEntityResource(`${apiPrefix}/waitlist`),
    mediaKit: createEntityResource(`${apiPrefix}/media-kit`),
    stats: {
      get: (params) => {
        const query = buildListQueryParams({ range: params?.range })
        const qs = query.toString()
        return request<StatsResponseDto>(`${apiPrefix}/stats${qs ? `?${qs}` : ""}`)
      },
    },
    pushTokens: {
      register: (body) =>
        request<SuccessResponse>(`${apiPrefix}/push-tokens`, {
          method: "POST",
          body: JSON.stringify(body),
        }),
      unregister: (body) =>
        request<SuccessResponse>(`${apiPrefix}/push-tokens`, {
          method: "DELETE",
          body: JSON.stringify(body),
        }),
    },
    notifications: {
      broadcast: (body) =>
        request<AnnouncementDto>(`${apiPrefix}/notifications/broadcast`, {
          method: "POST",
          body: JSON.stringify(body),
        }),
      list: (params) => {
        const query = buildListQueryParams({
          page: params?.page,
          pageSize: params?.pageSize,
        })
        const qs = query.toString()
        return request<PaginatedResponse<AnnouncementDto>>(
          `${apiPrefix}/notifications${qs ? `?${qs}` : ""}`,
        )
      },
    },
    audit: {
      list: (params = {}) => {
        const query = buildListQueryParams({
          page: params.page,
          pageSize: params.pageSize,
          search: params.search,
          sortBy: params.sortBy,
          sortDir: params.sortDir,
          entity_type: params.entity_type,
          actor_email: params.actor_email,
          app: params.app,
          action: params.action,
        })
        const qs = query.toString()
        return request<PaginatedResponse<AuditEventDto>>(
          `${apiPrefix}/audit${qs ? `?${qs}` : ""}`,
        )
      },
    },
    support: {
      list: (params = {}) => {
        const query = buildListQueryParams({
          page: params.page,
          pageSize: params.pageSize,
          search: params.search,
          sortBy: params.sortBy,
          sortDir: params.sortDir,
          status: params.status,
          category: params.category,
          assignedToClerkId: params.assignedToClerkId,
        })
        const qs = query.toString()
        return request<PaginatedResponse<SupportCaseDto>>(
          `${apiPrefix}/support${qs ? `?${qs}` : ""}`,
        )
      },
      get: (id) => request<SupportCaseDetailDto>(`${apiPrefix}/support/${id}`),
      update: (id, body) =>
        request<SupportCaseDto>(`${apiPrefix}/support/${id}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        }),
      reply: (id, body) =>
        request<SupportMessageDto>(`${apiPrefix}/support/${id}/messages`, {
          method: "POST",
          body: JSON.stringify(body),
        }),
    },
  }
}
