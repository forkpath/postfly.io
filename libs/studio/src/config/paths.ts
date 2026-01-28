const ADMIN_PREFIX = '/admin'
const AUTH_PREFIX = '/auth'
const BLOG_PREFIX = '/blog'
const CRM_PREFIX = '/crm'
const ORGANIZATION_PREFIX = '/organization'
const USER_PREFIX = '/user'
const LEGAL_PREFIX = '/legal'

const API_PREFIX = '/api'

const pathsConfig = {
  index: '/',
  admin: {
    index: ADMIN_PREFIX,
    users: {
      index: `${ADMIN_PREFIX}/users`,
      user: (id: string) => `${ADMIN_PREFIX}/users/${id}`
    },
    organizations: {
      index: `${ADMIN_PREFIX}/organizations`,
      organization: (slug: string) => `${ADMIN_PREFIX}/organizations/${slug}`
    },
    customers: {
      index: `${ADMIN_PREFIX}/customers`,
      customer: (id: string) => `${ADMIN_PREFIX}/customers/${id}`
    }
  },
  marketing: {
    pricing: '/pricing',
    contact: '/contact',
    blog: {
      index: BLOG_PREFIX,
      post: (slug: string) => `${BLOG_PREFIX}/${slug}`
    },
    legal: (slug: string) => `${LEGAL_PREFIX}/${slug}`
  },
  auth: {
    login: `${AUTH_PREFIX}/login`,
    register: `${AUTH_PREFIX}/register`,
    join: `${AUTH_PREFIX}/join`,
    forgotPassword: `${AUTH_PREFIX}/password/forgot`,
    updatePassword: `${AUTH_PREFIX}/password/update`,
    error: `${AUTH_PREFIX}/error`
  },
  user: {
    settings: {
      index: `${USER_PREFIX}/settings`,
      security: `${USER_PREFIX}/settings/security`,
      billing: `${USER_PREFIX}/settings/billing`
    }
  },
  crm: {
    index: CRM_PREFIX,
    ai: `${CRM_PREFIX}/ai`
  },
  organization: {
    index: ORGANIZATION_PREFIX,
    settings: `${ORGANIZATION_PREFIX}/settings`,
    members: `${ORGANIZATION_PREFIX}/members`
  }
} as const

export {
  pathsConfig,
  ADMIN_PREFIX,
  CRM_PREFIX,
  ORGANIZATION_PREFIX,
  USER_PREFIX,
  BLOG_PREFIX,
  AUTH_PREFIX,
  API_PREFIX,
  LEGAL_PREFIX
}
