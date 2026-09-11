import { createAccessControl } from 'better-auth/plugins/access'
import { adminAc, defaultStatements, memberAc, ownerAc } from 'better-auth/plugins/organization/access'

const BaseActions = ['create', 'view', 'edit', 'delete'] as const
const WorkspaceActions = ['crm', 'organization'] as const

const Resource = {
  PRODUCT: 'product',
  ORDER: 'order',
  CUSTOMER: 'customer',
  CLINIC: 'clinic',
  INVENTORY: 'inventory',
  REPORT: 'report',
  SETTINGS: 'settings',
  WORKSPACE: 'workspace'
} as const

const statements = {
  ...defaultStatements,
  [Resource.PRODUCT]: BaseActions,
  [Resource.ORDER]: BaseActions,
  [Resource.CUSTOMER]: BaseActions,
  [Resource.CLINIC]: BaseActions,
  [Resource.INVENTORY]: BaseActions,
  [Resource.REPORT]: BaseActions,
  [Resource.SETTINGS]: BaseActions,
  [Resource.WORKSPACE]: WorkspaceActions
} as const

const ac = createAccessControl(statements)

const owner = ac.newRole({
  ...ownerAc.statements,
  [Resource.PRODUCT]: ['create', 'view', 'edit', 'delete'],
  [Resource.ORDER]: ['create', 'view', 'edit', 'delete'],
  [Resource.CUSTOMER]: ['create', 'view', 'edit', 'delete'],
  [Resource.CLINIC]: ['create', 'view', 'edit', 'delete'],
  [Resource.INVENTORY]: ['create', 'view', 'edit', 'delete'],
  [Resource.REPORT]: ['create', 'view', 'edit', 'delete'],
  [Resource.SETTINGS]: ['create', 'view', 'edit', 'delete'],
  [Resource.WORKSPACE]: ['crm', 'organization']
})

const admin = ac.newRole({
  ...adminAc.statements,
  [Resource.PRODUCT]: ['create', 'view', 'edit', 'delete'],
  [Resource.ORDER]: ['create', 'view', 'edit', 'delete'],
  [Resource.CUSTOMER]: ['create', 'view', 'edit', 'delete'],
  [Resource.CLINIC]: ['create', 'view', 'edit', 'delete'],
  [Resource.INVENTORY]: ['create', 'view', 'edit'],
  [Resource.REPORT]: ['create', 'view', 'edit'],
  [Resource.SETTINGS]: ['view', 'edit'],
  [Resource.WORKSPACE]: ['crm', 'organization']
})

const member = ac.newRole({
  ...memberAc.statements,
  [Resource.PRODUCT]: ['view'],
  [Resource.ORDER]: ['create', 'view'],
  [Resource.CUSTOMER]: ['view'],
  [Resource.CLINIC]: ['view'],
  [Resource.INVENTORY]: ['view'],
  [Resource.REPORT]: ['view'],
  [Resource.SETTINGS]: [],
  [Resource.WORKSPACE]: ['crm']
})

const roles = { owner, admin, member } as const

export type ResourceAction = (typeof BaseActions)[number] | (typeof WorkspaceActions)[number]
export type Statements = typeof statements
export type RoleName = keyof typeof roles
export type PermissionTemplate = Record<string, string[]>
export type PermissionCheckParams = {
  [K in keyof Statements]?: Statements[K][number][]
}

export { ac, roles, owner, admin, member, statements, Resource, BaseActions, WorkspaceActions }
