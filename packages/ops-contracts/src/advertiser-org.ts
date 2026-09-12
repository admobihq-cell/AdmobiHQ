import { z } from "zod"

import { ADVERTISER_PERMISSIONS, type AdvertiserPermission } from "./enums"

export const advertiserOrgRenameSchema = z.object({
  name: z.string().trim().min(1).max(120),
})
export type AdvertiserOrgRenameInput = z.infer<typeof advertiserOrgRenameSchema>

export const advertiserInviteSchema = z.object({
  email: z.string().trim().email(),
  roleId: z.number().int().positive(),
})
export type AdvertiserInviteInput = z.infer<typeof advertiserInviteSchema>

/** Role change for a non-owner member, or promote/demote owner flag. */
export const advertiserMemberUpdateSchema = z
  .object({
    roleId: z.number().int().positive().nullable().optional(),
    isOwner: z.boolean().optional(),
  })
  .refine((v) => v.roleId !== undefined || v.isOwner !== undefined, {
    message: "Provide roleId and/or isOwner",
  })
export type AdvertiserMemberUpdateInput = z.infer<typeof advertiserMemberUpdateSchema>

export const advertiserRoleCreateSchema = z.object({
  name: z.string().trim().min(1).max(80),
  permissions: z.array(z.enum(ADVERTISER_PERMISSIONS)).default([]),
})
export type AdvertiserRoleCreateInput = z.infer<typeof advertiserRoleCreateSchema>

export const advertiserRoleUpdateSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  permissions: z.array(z.enum(ADVERTISER_PERMISSIONS)).optional(),
})
export type AdvertiserRoleUpdateInput = z.infer<typeof advertiserRoleUpdateSchema>

export type AdvertiserOrgDto = {
  id: number
  name: string
  memberCount: number
  /** Display label for the caller's membership — "Admin" or their role name. */
  myRoleName: string
}

export type AdvertiserMemberDto = {
  id: number
  clerkUserId: string
  email: string | null
  name: string | null
  isOwner: boolean
  roleId: number | null
  roleName: string | null
  joinedAt: string
}

export type AdvertiserInvitationDto = {
  id: number
  email: string
  roleId: number | null
  roleName: string | null
  createdAt: string
  expiresAt: string
  status: "pending" | "accepted" | "revoked" | "expired"
}

export type AdvertiserRoleDto = {
  id: number
  name: string
  permissions: AdvertiserPermission[]
  /** null = shared starter template; set = this org's custom/customized role. */
  orgId: number | null
  isStarter: boolean
  /** Active members in the caller's org assigned to this role. */
  memberCount: number
}

export type AdvertiserOrgMembersDto = {
  members: AdvertiserMemberDto[]
  invitations: AdvertiserInvitationDto[]
}

/** Ops list row — member/campaign counts are active memberships and all org campaigns. */
export type OpsAdvertiserOrgListItemDto = {
  id: number
  name: string
  memberCount: number
  campaignCount: number
  createdAt: string
}

export type OpsAdvertiserOrgCampaignSummaryDto = {
  id: number
  name: string
  status: string
  submittedAt: string | null
  contactEmail: string | null
}

/** Ops detail — members (active), pending invites, recent campaigns, projected activity. */
export type OpsAdvertiserOrgDetailDto = {
  id: number
  name: string
  createdAt: string
  updatedAt: string
  memberCount: number
  campaignCount: number
  members: AdvertiserMemberDto[]
  invitations: AdvertiserInvitationDto[]
  campaigns: OpsAdvertiserOrgCampaignSummaryDto[]
  activity: import("./advertiser-activity").AdvertiserActivityItemDto[]
}
