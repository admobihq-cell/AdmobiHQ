export type PlatformUserType = "drivers" | "customers"

export type PlatformUserStatus = "active" | "banned" | "locked"

export type PlatformUserDto = {
  id: string
  name: string
  /** Advertiser's company, from their Clerk unsafeMetadata at sign-up. Always
   * null for drivers, who sign up as individuals — the ops Users page only
   * renders this column for customers. */
  company: string | null
  email: string | null
  phone: string | null
  createdAt: string
  status: PlatformUserStatus
}

export type PlatformUserListDto = {
  users: PlatformUserDto[]
  total: number
  hasMore: boolean
}
