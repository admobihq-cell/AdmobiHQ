import { z } from "zod"

import { OPS_PERMISSIONS, type OpsPermission, type OpsRole } from "./enums"

export type MeDto = {
  role: OpsRole
  permissions: OpsPermission[]
}

const tierSchema = z.discriminatedUnion("tier", [
  z.object({ tier: z.literal("admin") }),
  z.object({ tier: z.literal("member"), roleId: z.number().int().positive() }),
])

export const teamInviteSchema = z.intersection(
  z.object({ email: z.string().trim().email() }),
  tierSchema,
)

export const teamRoleUpdateSchema = tierSchema

export type TeamInviteInput = z.infer<typeof teamInviteSchema>
export type TeamRoleUpdateInput = z.infer<typeof teamRoleUpdateSchema>

export type TeamMemberDto = {
  userId: string
  email: string
  role: "admin" | "member"
  roleId: number | null
  roleName: string | null
  joinedAt: string
}

export type TeamInvitationDto = {
  id: string
  email: string
  role: "admin" | "member"
  createdAt: string
  status: string
}

export type NotYetInvitedDto = {
  userId: string
  email: string
}

export type TeamDto = {
  members: TeamMemberDto[]
  invitations: TeamInvitationDto[]
  notYetInvited: NotYetInvitedDto[]
}

export const opsRoleCreateSchema = z.object({
  name: z.string().trim().min(1).max(60),
  permissions: z.array(z.enum(OPS_PERMISSIONS)).default([]),
})

export const opsRoleUpdateSchema = z.object({
  name: z.string().trim().min(1).max(60).optional(),
  permissions: z.array(z.enum(OPS_PERMISSIONS)).optional(),
})

export type OpsRoleCreateInput = z.infer<typeof opsRoleCreateSchema>
export type OpsRoleUpdateInput = z.infer<typeof opsRoleUpdateSchema>

export type OpsRoleDto = {
  id: number
  name: string
  permissions: (typeof OPS_PERMISSIONS)[number][]
  memberCount: number
}
