import {
  buildListQueryParams,
  type AnnouncementDto,
  type ApiErrorResponse,
  type AuditEventDto,
  type AuditListQueryParams,
  type BroadcastCreateInput,
  type BulkResponse,
  type CampaignDto,
  type CampaignListItemDto,
  type BulkReviewInput,
  type BulkReviewResult,
  type CampaignReviewInput,
  type RecordTransactionInput,
  type ActionQueueItem,
  type AdvertiserDashboardDto,
  type IntegrationDto,
  type AttentionItemDto,
  type DeliveryDto,
  type FleetDashboardDto,
  type InventoryDto,
  type PipelineDto,
  type SupportDashboardDto,
  type FinanceLedgerDto,
  type FinanceOverviewDto,
  type FinancePayoutsDto,
  type RecordOptionsDto,
  type ToolCostsDto,
  type WalletRowDto,
  type DateRangeKey,
  type DocumentExportRequest,
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
  type OpsAdvertiserOrgDetailDto,
  type OpsAdvertiserOrgListItemDto,
  type PaginatedResponse,
  type PlatformFlagDto,
  type PlatformFlagUpdateInput,
  type PlatformUserListDto,
  type PlatformUserType,
  type SafetyIncidentDetailDto,
  type SafetyIncidentDto,
  type SafetyIncidentMessageCreateInput,
  type SafetyIncidentOpsUpdateInput,
  type SafetyIncidentUpdateDto,
  type SafetyListQueryParams,
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

import type { IntegrationTotals, IntegrationWrite } from "@workspace/ops-contracts/integration-costs"

import { getApiBaseUrl, publicApiUrl } from "./base-url"
import { OpsApiError } from "./errors"
import { formatApiError, formatApiErrorResponse } from "./format-error"
import { publicApiFetch, type PublicApiResult } from "./public-fetch"

export { OpsApiError, getApiBaseUrl, publicApiUrl, formatApiError, formatApiErrorResponse, publicApiFetch }
export type { PublicApiResult, DocumentExportRequest }

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
  documents: {
    exportPdf: (body: DocumentExportRequest) => Promise<Blob>
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
      sortDir?: "asc" | "desc"
      search?: string
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
      sortBy?: "email" | "phone" | "createdAt"
      sortDir?: "asc" | "desc"
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
  safety: {
    list: (params?: SafetyListQueryParams) => Promise<PaginatedResponse<SafetyIncidentDto>>
    get: (id: number) => Promise<SafetyIncidentDetailDto>
    update: (id: number, body: SafetyIncidentOpsUpdateInput) => Promise<SafetyIncidentDto>
    reply: (
      id: number,
      body: SafetyIncidentMessageCreateInput,
    ) => Promise<SafetyIncidentUpdateDto>
    /** No JSON endpoint for this — the file route streams raw bytes, so the
     * caller fetches it directly (with the same bearer token) rather than
     * going through request<T>()'s JSON parsing. */
    photoFileUrl: (incidentId: number, photoId: number) => string
  }
  driverApplications: {
    list: (
      params?: Partial<PaginationParams> & { status?: string },
    ) => Promise<PaginatedResponse<DriverApplicationListItemDto>>
    get: (id: number) => Promise<DriverProfileDto>
    review: (id: number, body: DriverProfileReviewInput) => Promise<DriverProfileDto>
    bulkReview: (body: BulkReviewInput) => Promise<BulkReviewResult>
    /** No JSON endpoint for this — the file route streams raw bytes, so the
     * caller fetches it directly (with the same bearer token) rather than
     * going through request<T>()'s JSON parsing. */
    documentFileUrl: (applicationId: number, documentId: number) => string
  }
  campaigns: {
    list: (
      params?: Partial<PaginationParams> & { status?: string },
    ) => Promise<PaginatedResponse<CampaignListItemDto>>
    get: (id: number) => Promise<CampaignDto>
    review: (id: number, body: CampaignReviewInput) => Promise<CampaignDto>
    bulkReview: (body: BulkReviewInput) => Promise<BulkReviewResult>
    /** No JSON endpoint — the file route streams raw bytes, so the caller
     * fetches it directly (with the same bearer token) rather than going
     * through request<T>()'s JSON parsing. Same shape as
     * driverApplications.documentFileUrl above. */
    creativeFileUrl: (campaignId: number, creativeId: number) => string
  }
  advertiserOrgs: {
    list: (
      params?: Partial<PaginationParams>,
    ) => Promise<PaginatedResponse<OpsAdvertiserOrgListItemDto>>
    get: (id: number) => Promise<OpsAdvertiserOrgDetailDto>
  }
  finance: {
    /** Appends a wallet ledger row. Needs the `finances` permission; the ledger has no edit or delete. */
    recordTransaction: (body: RecordTransactionInput) => Promise<{ id: number; amountKes: number }>
    /** Refunds unused credit to the org's original Paystack payments. Needs `finances`. */
    refund: (body: { orgId: number; amountKes: number; reason: string }) => Promise<{ refundIds: number[] }>
    /** Live Paystack KES balance. Needs `finances`. */
    paystackBalance: () => Promise<{ balanceKes: number }>
    /** Finances reads, each needing `finances`. `range` is a dashboard range (`7d`, `30d`, `90d`, `all`). */
    overview: (range: DateRangeKey) => Promise<FinanceOverviewDto>
    ledger: (range: DateRangeKey) => Promise<FinanceLedgerDto>
    wallets: () => Promise<WalletRowDto[]>
    payouts: (range: DateRangeKey) => Promise<FinancePayoutsDto>
    /** Payments and payouts that need a person, shown first on the Overview. */
    attention: () => Promise<AttentionItemDto[]>
    /** Organizations and campaigns offered by the Record transaction and Refund forms. */
    recordOptions: () => Promise<RecordOptionsDto>
    toolCosts: () => Promise<ToolCostsDto>
    /** Settled payments ops hasn't looked at yet (the nav badge). */
    unseenCount: () => Promise<{ count: number }>
    /** Stamps every unseen settled payment as seen; call when the Ledger opens. */
    markSeen: () => Promise<{ marked: number }>
  }
  integrations: {
    /** Every tool and subscription plus the monthly USD / KES totals. Ops admin only. */
    list: () => Promise<{ items: IntegrationDto[]; totals: IntegrationTotals }>
    create: (body: IntegrationWrite) => Promise<IntegrationDto>
    /** Replaces the record: send every field, as the form does. */
    update: (id: number, body: IntegrationWrite) => Promise<IntegrationDto>
    remove: (id: number) => Promise<{ ok: true }>
  }
  actionQueue: {
    /** The header bell: counts that need someone, filtered to the caller's permissions. Any ops user. `href` is an ops-console path. */
    list: (range?: DateRangeKey) => Promise<{ items: ActionQueueItem[] }>
  }
  dashboards: {
    /** The Campaigns dashboard, one tab at a time. Needs `campaigns`; money is null without `finances`. */
    campaignsPipeline: (range: DateRangeKey) => Promise<PipelineDto>
    campaignsDelivery: (range: DateRangeKey) => Promise<DeliveryDto>
    campaignsInventory: (range: DateRangeKey) => Promise<InventoryDto>
    /** Needs `drivers`; the `money` block is absent without `finances`. */
    fleet: (range: DateRangeKey) => Promise<FleetDashboardDto>
    /** Needs `campaigns`; spend figures are absent without `finances`. */
    advertisers: (range: DateRangeKey) => Promise<AdvertiserDashboardDto & { window: { start: string; end: string } }>
    /** Needs `support`; `safety` is null without `safety`. */
    support: (range: DateRangeKey) => Promise<SupportDashboardDto>
  }
  payouts: {
    /** A month's payout run: eligible drivers and any saved payout. Needs `finances`. */
    getRun: (month: string) => Promise<PayoutRunDto>
    /** Save typed amounts as pending payouts. Needs `finances`. */
    saveRun: (body: { periodMonth: string; items: { driverProfileId: number; amountKes: number }[] }) => Promise<{
      saved: number
      skipped: { driverProfileId: number; reason: string }[]
    }>
    /** Send payouts through Paystack Transfers. Needs `payouts`. */
    disburse: (payoutIds: number[]) => Promise<PayoutDisburseResult>
    /** Resend a failed payout with the same reference. Needs `payouts`. */
    retry: (id: number) => Promise<PayoutDisburseResult>
  }
}

export type PayoutRunDto = {
  month: string
  drivers: {
    driverProfileId: number
    name: string
    method: "mpesa" | "bank"
    destinationMasked: string | null
    bankName: string | null
    payout: { id: number; amountKes: number; status: string; failureReason: string | null; estimatedFeeKes: number } | null
  }[]
}

export type PayoutDisburseResult = { queued: number; skipped: { id: number; reason: string }[] }

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
    body,
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

  async function requestBlob(
    path: string,
    init: RequestInit = {},
  ): Promise<Blob> {
    const token = await options.getToken()
    const headers = new Headers(init.headers)
    if (!headers.has("Content-Type") && init.body) {
      headers.set("Content-Type", "application/json")
    }
    if (token) {
      headers.set("Authorization", `Bearer ${token}`)
    }

    const controller = new AbortController()
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
    }

    if (!res.ok) {
      throw await parseError(res)
    }

    return res.blob()
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
    documents: {
      exportPdf: (body: DocumentExportRequest) =>
        requestBlob(`${apiPrefix}/ops/documents/export`, {
          method: "POST",
          body: JSON.stringify(body),
        }),
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
          sortDir: params?.sortDir,
          search: params?.search,
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
          sortBy: params.sortBy,
          sortDir: params.sortDir,
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
    safety: {
      list: (params = {}) => {
        const query = buildListQueryParams({
          page: params.page,
          pageSize: params.pageSize,
          search: params.search,
          sortBy: params.sortBy,
          sortDir: params.sortDir,
          status: params.status,
          type: params.type,
          severity: params.severity,
        })
        const qs = query.toString()
        return request<PaginatedResponse<SafetyIncidentDto>>(
          `${apiPrefix}/safety-incidents${qs ? `?${qs}` : ""}`,
        )
      },
      get: (id) => request<SafetyIncidentDetailDto>(`${apiPrefix}/safety-incidents/${id}`),
      update: (id, body) =>
        request<SafetyIncidentDto>(`${apiPrefix}/safety-incidents/${id}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        }),
      reply: (id, body) =>
        request<SafetyIncidentUpdateDto>(`${apiPrefix}/safety-incidents/${id}/messages`, {
          method: "POST",
          body: JSON.stringify(body),
        }),
      photoFileUrl: (incidentId, photoId) =>
        `${baseUrl}${apiPrefix}/safety-incidents/${incidentId}/photos/${photoId}/file`,
    },
    driverApplications: {
      list: (params = {}) => {
        const query = buildListQueryParams({
          page: params.page,
          pageSize: params.pageSize,
          search: params.search,
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
      bulkReview: (body) =>
        request<BulkReviewResult>(`${apiPrefix}/driver-applications/bulk-review`, {
          method: "POST",
          body: JSON.stringify(body),
        }),
      documentFileUrl: (applicationId, documentId) =>
        `${baseUrl}${apiPrefix}/driver-applications/${applicationId}/documents/${documentId}/file`,
    },
    campaigns: {
      list: (params = {}) => {
        const query = buildListQueryParams({
          page: params.page,
          pageSize: params.pageSize,
          search: params.search,
          status: "status" in params ? params.status : undefined,
        })
        const qs = query.toString()
        return request<PaginatedResponse<CampaignListItemDto>>(
          `${apiPrefix}/campaigns${qs ? `?${qs}` : ""}`,
        )
      },
      get: (id) => request<CampaignDto>(`${apiPrefix}/campaigns/${id}`),
      review: (id, body) =>
        request<CampaignDto>(`${apiPrefix}/campaigns/${id}/review`, {
          method: "PATCH",
          body: JSON.stringify(body),
        }),
      bulkReview: (body) =>
        request<BulkReviewResult>(`${apiPrefix}/campaigns/bulk-review`, {
          method: "POST",
          body: JSON.stringify(body),
        }),
      creativeFileUrl: (campaignId, creativeId) =>
        `${baseUrl}${apiPrefix}/campaigns/${campaignId}/creatives/${creativeId}/file`,
    },
    advertiserOrgs: {
      list: (params = {}) => {
        const query = buildListQueryParams({
          page: params.page,
          pageSize: params.pageSize,
          search: params.search,
        })
        const qs = query.toString()
        return request<PaginatedResponse<OpsAdvertiserOrgListItemDto>>(
          `${apiPrefix}/advertiser-orgs${qs ? `?${qs}` : ""}`,
        )
      },
      get: (id) => request<OpsAdvertiserOrgDetailDto>(`${apiPrefix}/advertiser-orgs/${id}`),
    },
    finance: {
      recordTransaction: (body) =>
        request<{ id: number; amountKes: number }>(`${apiPrefix}/ops/finance/transactions`, {
          method: "POST",
          body: JSON.stringify(body),
        }),
      refund: (body) =>
        request<{ refundIds: number[] }>(`${apiPrefix}/ops/payments/refunds`, {
          method: "POST",
          body: JSON.stringify(body),
        }),
      paystackBalance: () => request<{ balanceKes: number }>(`${apiPrefix}/ops/payments/balance`),
      overview: (range) => request<FinanceOverviewDto>(`${apiPrefix}/ops/finance/overview?range=${range}`),
      ledger: (range) => request<FinanceLedgerDto>(`${apiPrefix}/ops/finance/ledger?range=${range}`),
      wallets: () => request<WalletRowDto[]>(`${apiPrefix}/ops/finance/wallets`),
      payouts: (range) => request<FinancePayoutsDto>(`${apiPrefix}/ops/finance/payouts?range=${range}`),
      attention: () => request<AttentionItemDto[]>(`${apiPrefix}/ops/finance/attention`),
      recordOptions: () => request<RecordOptionsDto>(`${apiPrefix}/ops/finance/record-options`),
      toolCosts: () => request<ToolCostsDto>(`${apiPrefix}/ops/finance/tool-costs`),
      unseenCount: () => request<{ count: number }>(`${apiPrefix}/ops/payments/unseen`),
      markSeen: () => request<{ marked: number }>(`${apiPrefix}/ops/payments/unseen`, { method: "POST" }),
    },
    integrations: {
      list: () => request<{ items: IntegrationDto[]; totals: IntegrationTotals }>(`${apiPrefix}/ops/integrations`),
      create: (body) => request<IntegrationDto>(`${apiPrefix}/ops/integrations`, { method: "POST", body: JSON.stringify(body) }),
      update: (id, body) => request<IntegrationDto>(`${apiPrefix}/ops/integrations/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
      remove: (id) => request<{ ok: true }>(`${apiPrefix}/ops/integrations/${id}`, { method: "DELETE" }),
    },
    actionQueue: {
      list: (range = "30d") => request<{ items: ActionQueueItem[] }>(`${apiPrefix}/ops/action-queue?range=${range}`),
    },
    dashboards: {
      campaignsPipeline: (range) => request<PipelineDto>(`${apiPrefix}/ops/dashboards/campaigns?tab=pipeline&range=${range}`),
      campaignsDelivery: (range) => request<DeliveryDto>(`${apiPrefix}/ops/dashboards/campaigns?tab=delivery&range=${range}`),
      campaignsInventory: (range) => request<InventoryDto>(`${apiPrefix}/ops/dashboards/campaigns?tab=inventory&range=${range}`),
      fleet: (range) => request<FleetDashboardDto>(`${apiPrefix}/ops/dashboards/fleet?range=${range}`),
      advertisers: (range) =>
        request<AdvertiserDashboardDto & { window: { start: string; end: string } }>(`${apiPrefix}/ops/dashboards/advertisers?range=${range}`),
      support: (range) => request<SupportDashboardDto>(`${apiPrefix}/ops/dashboards/support?range=${range}`),
    },
    payouts: {
      getRun: (month) => request<PayoutRunDto>(`${apiPrefix}/ops/payouts?month=${encodeURIComponent(month)}`),
      saveRun: (body) =>
        request(`${apiPrefix}/ops/payouts`, { method: "POST", body: JSON.stringify(body) }),
      disburse: (payoutIds) =>
        request<PayoutDisburseResult>(`${apiPrefix}/ops/payouts/disburse`, {
          method: "POST",
          body: JSON.stringify({ payoutIds }),
        }),
      retry: (id) => request<PayoutDisburseResult>(`${apiPrefix}/ops/payouts/${id}/retry`, { method: "POST" }),
    },
  }
}
