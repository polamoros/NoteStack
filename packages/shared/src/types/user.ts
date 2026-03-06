export type UserRole = 'user' | 'admin'

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  banned: boolean | null
  createdAt: string
  updatedAt: string
}
