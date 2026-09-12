import type {
  AdvertiserInvitationDto,
  AdvertiserInviteInput,
  AdvertiserMemberDto,
  AdvertiserMemberUpdateInput,
  AdvertiserOrgDto,
  AdvertiserOrgMembersDto,
  AdvertiserOrgRenameInput,
  AdvertiserRoleDto,
} from "@workspace/ops-contracts"

import { EXPO_PUBLIC_API_URL } from "@/lib/env"

const API_URL = EXPO_PUBLIC_API_URL ?? "http://localhost:3003"

export type GetToken = () => Promise<string | null>

async function authedFetch(getToken: GetToken, path: string, init?: RequestInit) {
  const token = await getToken()
  const headers = new Headers(init?.headers)
  if (token) headers.set("Authorization", `Bearer ${token}`)

  const res = await fetch(`${API_URL}${path}`, { ...init, headers })
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null
    const error = new Error(body?.error ?? `Request failed (${res.status})`) as Error & {
      status?: number
    }
    error.status = res.status
    throw error
  }
  return res
}

function jsonInit(method: string, body: unknown): RequestInit {
  return {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }
}

export async function getOrg(getToken: GetToken): Promise<AdvertiserOrgDto> {
  const res = await authedFetch(getToken, "/v1/customer/org")
  return res.json()
}

export async function renameOrg(
  getToken: GetToken,
  data: AdvertiserOrgRenameInput,
): Promise<AdvertiserOrgDto> {
  const res = await authedFetch(getToken, "/v1/customer/org", jsonInit("PATCH", data))
  return res.json()
}

export async function listOrgMembers(getToken: GetToken): Promise<AdvertiserOrgMembersDto> {
  const res = await authedFetch(getToken, "/v1/customer/org/members")
  return res.json()
}

export async function inviteOrgMember(
  getToken: GetToken,
  data: AdvertiserInviteInput,
): Promise<AdvertiserInvitationDto> {
  const res = await authedFetch(getToken, "/v1/customer/org/members", jsonInit("POST", data))
  return res.json()
}

export async function updateOrgMember(
  getToken: GetToken,
  memberId: number,
  data: AdvertiserMemberUpdateInput,
): Promise<AdvertiserMemberDto> {
  const res = await authedFetch(
    getToken,
    `/v1/customer/org/members/${memberId}`,
    jsonInit("PATCH", data),
  )
  return res.json()
}

export async function removeOrgMember(getToken: GetToken, memberId: number): Promise<void> {
  await authedFetch(getToken, `/v1/customer/org/members/${memberId}`, { method: "DELETE" })
}

export async function revokeOrgInvitation(getToken: GetToken, invitationId: number): Promise<void> {
  await authedFetch(getToken, `/v1/customer/org/invitations/${invitationId}`, {
    method: "DELETE",
  })
}

export async function listOrgRoles(getToken: GetToken): Promise<AdvertiserRoleDto[]> {
  const res = await authedFetch(getToken, "/v1/customer/org/roles")
  return res.json()
}

export async function createOrgRole(
  getToken: GetToken,
  data: import("@workspace/ops-contracts").AdvertiserRoleCreateInput,
): Promise<AdvertiserRoleDto> {
  const res = await authedFetch(getToken, "/v1/customer/org/roles", jsonInit("POST", data))
  return res.json()
}

export async function updateOrgRole(
  getToken: GetToken,
  roleId: number,
  data: import("@workspace/ops-contracts").AdvertiserRoleUpdateInput,
): Promise<AdvertiserRoleDto> {
  const res = await authedFetch(
    getToken,
    `/v1/customer/org/roles/${roleId}`,
    jsonInit("PATCH", data),
  )
  return res.json()
}

export async function deleteOrgRole(getToken: GetToken, roleId: number): Promise<void> {
  await authedFetch(getToken, `/v1/customer/org/roles/${roleId}`, { method: "DELETE" })
}

export async function acceptOrgInvitation(getToken: GetToken, token: string): Promise<void> {
  await authedFetch(getToken, `/v1/customer/org/invitations/accept/${encodeURIComponent(token)}`, {
    method: "POST",
  })
}

export async function listOrgActivity(
  getToken: GetToken,
  options?: { cursor?: string; limit?: number },
): Promise<import("@workspace/ops-contracts").AdvertiserActivityPageDto> {
  const params = new URLSearchParams()
  if (options?.cursor) params.set("cursor", options.cursor)
  if (options?.limit != null) params.set("limit", String(options.limit))
  const qs = params.toString()
  const res = await authedFetch(getToken, `/v1/customer/org/activity${qs ? `?${qs}` : ""}`)
  return res.json()
}

export async function getOrgDeletionStatus(getToken: GetToken): Promise<{
  canDeleteAccount: boolean
  isSoleOwner: boolean
  orgId?: number
}> {
  const res = await authedFetch(getToken, "/v1/customer/org/deletion-status")
  return res.json()
}

export async function transferOrgOwnership(
  getToken: GetToken,
  memberId: number,
): Promise<void> {
  await authedFetch(getToken, "/v1/customer/org/transfer-ownership", jsonInit("POST", { memberId }))
}

export async function deleteOrganization(getToken: GetToken): Promise<void> {
  await authedFetch(getToken, "/v1/customer/org/delete-organization", { method: "POST" })
}
