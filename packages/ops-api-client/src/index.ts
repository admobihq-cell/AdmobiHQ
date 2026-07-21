import {
  buildListQueryParams,
  type ApiErrorResponse,
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
  type WaitlistBulkInput,
  type WaitlistCreateInput,
  type WaitlistEntryDto,
  type WaitlistUpdateInput,
} from "@workspace/ops-contracts"

export class OpsApiError extends Error {
  readonly status: number
  readonly issues?: unknown

  constructor(message: string, status: number, issues?: unknown) {
    super(message)
    this.name = "OpsApiError"
    this.status = status
    this.issues = issues
  }
}

export type OpsClientOptions = {
  /** Base URL for the API, e.g. `https://api.admobihq.com` or `http://localhost:3003`. */
  baseUrl: string
  /** API path prefix. Defaults to `/v1`. */
  apiPrefix?: string
  /** Returns a Clerk session JWT, or null if unauthenticated. */
  getToken: () => Promise<string | null>
  /** Optional fetch implementation (defaults to global fetch). */
  fetch?: typeof fetch
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
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/$/, "")
}

const DEFAULT_API_BASE_URL = "http://localhost:3003"

export function getApiBaseUrl(): string {
  return normalizeBaseUrl(
    process.env.NEXT_PUBLIC_API_URL ??
      process.env.EXPO_PUBLIC_API_URL ??
      DEFAULT_API_BASE_URL,
  )
}

export function publicApiUrl(resource: string): string {
  const path = resource.startsWith("/") ? resource : `/${resource}`
  return `${getApiBaseUrl()}/v1/public${path}`
}

async function parseError(res: Response): Promise<OpsApiError> {
  let body: ApiErrorResponse | undefined
  try {
    body = (await res.json()) as ApiErrorResponse
  } catch {
    body = undefined
  }
  return new OpsApiError(
    body?.error ?? `Request failed (${res.status})`,
    res.status,
    body?.issues,
  )
}

export function createOpsClient(options: OpsClientOptions): OpsClient {
  const baseUrl = normalizeBaseUrl(options.baseUrl)
  const apiPrefix = options.apiPrefix ?? "/v1"
  const fetchImpl = options.fetch ?? fetch

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

    const res = await fetchImpl(`${baseUrl}${path}`, {
      ...init,
      headers,
    })

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
  }
}
