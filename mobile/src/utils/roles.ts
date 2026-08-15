// Client-side role helper. Backend owns authorization via utils/permissions.js.

export type UserRole = 'user' | 'vendor' | 'branch_admin' | 'super_admin'

export const isAdminRole = (role: string) => role === 'super_admin' || role === 'branch_admin'
