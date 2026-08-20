import {
  buildListQueryParams,
  type AnnouncementDto,
  type ApiErrorResponse,
  type AuditEventDto,
  type AuditListQueryParams,
  type BroadcastCreateInput,
  type BulkResponse,
  type DateRangeKey,
  type DriverApplicationListItemDto,
  type DriverBulkInput,
  type DriverCreateInput,
  type DriverDto,
  type DriverProfileDto,
  type DriverProfileReviewInput,
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
  type MeDto,
  type MediaKitBulkInput,
  type MediaKitCreateInput,
  type MediaKitRequestDto,
  type MediaKitUpdateInput,
  type PaginatedResponse,
  type PlatformFlagDto,
  type PlatformFlagUpdateInput,
  type PlatformUserListDto,
  type PlatformUserType,
  type StatsResponseDto,
  type SuccessResponse,
  type SupportCaseDetailDto,
  type SupportCaseDto,
  type SupportCaseUpdateInput,
  type SupportListQueryParams,
  type SupportMessageCreateInput,
  type SupportMessageDto,
  type OpsRoleCreateInput,
  type OpsRoleDto,
  type OpsRoleUpdateInput,
  type PaginationParams,
  type TeamDto,
  type TeamInvitationDto,
  type TeamInviteInput,
  type TeamMemberDto,
  type TeamRoleUpdateInput,
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
  me: {
    get: () => Promise<MeDto>
  }
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
    delete: (id: number) => Promise<SuccessResponse>
    /**
     * Uploads an image (already cropped/resized client-side) and returns its
     * public URL, for use as `image_url` on `broadcast`. Accepts either a Web
     * `Blob`/`File` or React Native's `{ uri, name, type }` file descriptor —
     * RN's `FormData.append` takes the latter shape, not a real `Blob`.
     */
    uploadImage: (
      file: Blob | { uri: string; name: string; type: string },
    ) => Promise<{ url: string }>
  }
  audit: {
    list: (params?: AuditListQueryParams) => Promise<PaginatedResponse<AuditEventDto>>
  }
  flags: {
    list: () => Promise<{ items: PlatformFlagDto[] }>
    update: (body: PlatformFlagUpdateInput) => Promise<PlatformFlagDto>
  }
  team: {
    list: () => Promise<TeamDto>
    invite: (body: TeamInviteInput) => Promise<TeamInvitationDto>
    updateRole: (userId: string, body: TeamRoleUpdateInput) => Promise<TeamMemberDto>
    removeMember: (userId: string) => Promise<SuccessResponse>
    revokeInvitation: (invitationId: string) => Promise<SuccessResponse>
  }
  users: {
    list: (params: {
      type: PlatformUserType
      query?: string
      limit?: number
      offset?: number
    }) => Promise<PlatformUserListDto>
  }
  roles: {
    list: () => Promise<{ items: OpsRoleDto[] }>
    create: (body: OpsRoleCreateInput) => Promise<OpsRoleDto>
    update: (roleId: number, body: OpsRoleUpdateInput) => Promise<OpsRoleDto>
    delete: (roleId: number) => Promise<SuccessResponse>
  }
  support: {
    list: (params?: SupportListQueryParams) => Promise<PaginatedResponse<SupportCaseDto>>
    get: (id: number) => Promise<SupportCaseDetailDto>
    update: (id: number, body: SupportCaseUpdateInput) => Promise<SupportCaseDto>
    reply: (id: number, body: SupportMessageCreateInput) => Promise<SupportMessageDto>
  }
  driverApplications: {
    list: (
      params?: Partial<PaginationParams> & { status?: string },
    ) => Promise<PaginatedResponse<DriverApplicationListItemDto>>
    get: (id: number) => Promise<DriverProfileDto>
    review: (id: number, body: DriverProfileReviewInput) => Promise<DriverProfileDto>
    /** No JSON endpoint for this — the file route streams raw bytes, so the
     * caller fetches it directly (with the same bearer token) rather than
     * going through request<T>()'s JSON parsing. */
    documentFileUrl: (applicationId: number, documentId: number) => string
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
    // FormData needs the runtime-generated multipart boundary header, not JSON.
    if (!headers.has("Content-Type") && init.body && !(init.body instanceof FormData)) {
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
    me: {
      get: () => request<MeDto>(`${apiPrefix}/me`),
    },
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
      delete: (id) =>
        request<SuccessResponse>(`${apiPrefix}/notifications/${id}`, { method: "DELETE" }),
      uploadImage: (file) => {
        const form = new FormData()
        // React Native's FormData accepts { uri, name, type } directly, which
        // isn't assignable to the DOM lib's Blob type this package is compiled
        // against — the cast bridges that real cross-platform API difference.
        form.append("file", file as Blob)
        return request<{ url: string }>(`${apiPrefix}/notifications/broadcast-image`, {
          method: "POST",
          body: form,
        })
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
    flags: {
      list: () => request<{ items: PlatformFlagDto[] }>(`${apiPrefix}/flags`),
      update: (body) =>
        request<PlatformFlagDto>(`${apiPrefix}/flags`, {
          method: "PATCH",
          body: JSON.stringify(body),
        }),
    },
    team: {
      list: () => request<TeamDto>(`${apiPrefix}/team`),
      invite: (body) =>
        request<TeamInvitationDto>(`${apiPrefix}/team`, {
          method: "POST",
          body: JSON.stringify(body),
        }),
      updateRole: (userId, body) =>
        request<TeamMemberDto>(`${apiPrefix}/team/${userId}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        }),
      removeMember: (userId) =>
        request<SuccessResponse>(`${apiPrefix}/team/${userId}`, { method: "DELETE" }),
      revokeInvitation: (invitationId) =>
        request<SuccessResponse>(`${apiPrefix}/team/invitations/${invitationId}`, {
          method: "DELETE",
        }),
    },
    users: {
      list: (params) => {
        const query = buildListQueryParams({
          type: params.type,
          query: params.query,
          limit: params.limit,
          offset: params.offset,
        })
        const qs = query.toString()
        return request<PlatformUserListDto>(`${apiPrefix}/users${qs ? `?${qs}` : ""}`)
      },
    },
    roles: {
      list: () => request<{ items: OpsRoleDto[] }>(`${apiPrefix}/roles`),
      create: (body) =>
        request<OpsRoleDto>(`${apiPrefix}/roles`, {
          method: "POST",
          body: JSON.stringify(body),
        }),
      update: (roleId, body) =>
        request<OpsRoleDto>(`${apiPrefix}/roles/${roleId}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        }),
      delete: (roleId) =>
        request<SuccessResponse>(`${apiPrefix}/roles/${roleId}`, { method: "DELETE" }),
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
    driverApplications: {
      list: (params = {}) => {
        const query = buildListQueryParams({
          page: params.page,
          pageSize: params.pageSize,
          status: "status" in params ? params.status : undefined,
        })
        const qs = query.toString()
        return request<PaginatedResponse<DriverApplicationListItemDto>>(
          `${apiPrefix}/driver-applications${qs ? `?${qs}` : ""}`,
        )
      },
      get: (id) => request<DriverProfileDto>(`${apiPrefix}/driver-applications/${id}`),
      review: (id, body) =>
        request<DriverProfileDto>(`${apiPrefix}/driver-applications/${id}/review`, {
          method: "PATCH",
          body: JSON.stringify(body),
        }),
      documentFileUrl: (applicationId, documentId) =>
        `${baseUrl}${apiPrefix}/driver-applications/${applicationId}/documents/${documentId}/file`,
    },
  }
}
