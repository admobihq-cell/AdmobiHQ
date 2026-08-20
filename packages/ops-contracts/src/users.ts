export type PlatformUserType = "drivers" | "customers"

export type PlatformUserStatus = "active" | "banned" | "locked"

export type PlatformUserDto = {
  id: string
  name: string
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
