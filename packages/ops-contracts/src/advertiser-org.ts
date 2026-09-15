import { z } from "zod"

import { ADVERTISER_PERMISSIONS, type AdvertiserPermission } from "./enums"

export const advertiserOrgRenameSchema = z.object({
  name: z.string().trim().min(1).max(120),
})
export type AdvertiserOrgRenameInput = z.infer<typeof advertiserOrgRenameSchema>

/** Org profile edit. Every field optional so the name form and the billing form
 * can PATCH independently; null clears a billing field. */
export const advertiserOrgUpdateSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    billingEmail: z.string().trim().email().nullable().optional(),
    /** KRA PIN, e.g. P051234567M. Validated loosely — ops corrects bad ones. */
    taxPin: z.string().trim().min(4).max(20).nullable().optional(),
  })
  .refine(
    (v) => v.name !== undefined || v.billingEmail !== undefined || v.taxPin !== undefined,
    { message: "Provide at least one field to update" },
  )
export type AdvertiserOrgUpdateInput = z.infer<typeof advertiserOrgUpdateSchema>

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
  /** Owners bypass every permission check, so clients must branch on this as
   * well as `permissions` when deciding what to render. */
  isOwner: boolean
  /** The caller's effective permissions — owners get the full set. Clients hide
   * actions they lack; the server check stays authoritative. */
  permissions: AdvertiserPermission[]
  /** Invoice recipient and KRA PIN. Only populated for callers holding
   * `billing:read`; everyone else gets null. */
  billingEmail: string | null
  taxPin: string | null
}

/** True when the caller may perform `permission`. Mirrors requireCustomerPermission. */
export function orgCan(
  org: Pick<AdvertiserOrgDto, "isOwner" | "permissions"> | null | undefined,
  permission: AdvertiserPermission,
): boolean {
  if (!org) return false
  return org.isOwner || org.permissions.includes(permission)
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
  status: "pending" | "accepted" | "revoked" | "declined" | "expired"
}

/** How accepting would collide with the caller's existing membership. Drives
 * the confirmation copy — replacing an empty auto-created workspace and
 * abandoning a real one are very different decisions. */
export type AdvertiserInviteConflict =
  | "none"
  | "empty_solo_org"
  | "solo_org_with_content"
  | "existing_team"

/** Read-only view of an invitation, so the invitee can see what they're being
 * asked to join *before* committing to it. */
export type AdvertiserInvitationPreviewDto = {
  orgName: string
  roleName: string | null
  inviterName: string
  /** The address the invitation was sent to. */
  email: string
  expiresAt: string
  /** Null until the caller is signed in — conflict can't be computed without an identity. */
  conflict: AdvertiserInviteConflict | null
  /** The org the caller would be leaving, when `conflict` is a solo-org case. */
  currentOrgName: string | null
  /** What leaving `currentOrgName` would detach, for the confirmation copy. */
  campaignCount: number
  supportCaseCount: number
  /** True when the signed-in address differs from `email`. */
  emailMismatch: boolean
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
  /** Member who authored it, from Campaign.clerk_user_id. */
  createdByName: string | null
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
