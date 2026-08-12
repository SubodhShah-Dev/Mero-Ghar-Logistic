// Client-side role/permission helpers mirroring backend PERMISSIONS map.
// Keep in sync with backend/utils/permissions.js

export type UserRole = 'user' | 'vendor' | 'branch_admin' | 'super_admin'

export const ROLES: UserRole[] = ['user', 'vendor', 'branch_admin', 'super_admin']

export const PERMISSIONS: Record<string, UserRole[]> = {
  'dashboard.analytics.global': ['super_admin'],
  'dashboard.analytics.region': ['super_admin', 'branch_admin'],
  'branches.manage': ['super_admin'],
  'users.manage.global': ['super_admin'],
  'users.manage.region': ['super_admin', 'branch_admin'],
  'users.roles.assign': ['super_admin'],
  'shipments.view.global': ['super_admin'],
  'shipments.view.region': ['super_admin', 'branch_admin'],
  'shipments.approve.region': ['super_admin', 'branch_admin'],
  'shipments.status.admin': ['super_admin', 'branch_admin'],
  'vendors.view.global': ['super_admin'],
  'vendors.view.region': ['super_admin', 'branch_admin'],
  'vendors.status.region': ['super_admin', 'branch_admin'],
  'tickets.manage.global': ['super_admin'],
  'tickets.manage.region': ['super_admin', 'branch_admin'],
  'escalations.create': ['super_admin', 'branch_admin'],
  'escalations.resolve': ['super_admin', 'branch_admin'],
  'settings.manage': ['super_admin'],
  'audit.read': ['super_admin'],
  'admin.dashboard': ['super_admin', 'branch_admin'],
}

export const isSuperAdmin = (role: string) => role === 'super_admin'
export const isBranchAdmin = (role: string) => role === 'branch_admin'
export const isAdminRole = (role: string) => role === 'super_admin' || role === 'branch_admin'

export const hasPermission = (role: UserRole, ...capabilities: string[]): boolean => {
  if (role === 'super_admin') return true
  return capabilities.some(cap => (PERMISSIONS[cap] || []).includes(role))
}

export const canAccessBranch = (user: { role: string; branches?: number[] }, branchId: number): boolean => {
  if (isSuperAdmin(user.role)) return true
  return (user.branches || []).includes(branchId)
}

export const getBranchIds = (user: { role: string; branches?: number[] }): number[] | null => {
  if (isSuperAdmin(user.role)) return null
  return user.branches || []
}