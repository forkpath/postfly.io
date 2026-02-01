const ADMIN_PREFIX = '/admin'
const AI_PREFIX = '/ai'
const AUTH_PREFIX = '/auth'
const BLOG_PREFIX = '/blog'
const CRM_PREFIX = '/crm'
const ORGANIZATION_PREFIX = '/organization'
const USER_PREFIX = '/user'
const WORKSPACE_PREFIX = '/workspace'
const LEGAL_PREFIX = '/legal'

const API_PREFIX = '/api'

const pathsConfig = {
  index: '/',
  ai: {
    index: AI_PREFIX,
    chat: (id: string) => `${AI_PREFIX}/chat/${id}`
  },
  crm: {
    index: CRM_PREFIX, // 用来放置crm仪表盘
    ai: `${CRM_PREFIX}/ai`,
    order: {
      index: `${CRM_PREFIX}/order`,
      order: (id: string) => `${CRM_PREFIX}/order/${id}`
    },
    customer: {
      index: `${CRM_PREFIX}/customer`,
      customer: (id: string) => `${CRM_PREFIX}/customer/${id}`
    },
    product: {
      index: `${CRM_PREFIX}/product`,
      product: (id: string) => `${CRM_PREFIX}/product/${id}`
    },
    invoice: {
      index: `${CRM_PREFIX}/invoice`,
      invoice: (id: string) => `${CRM_PREFIX}/invoice/${id}`
    },
    payment: {
      index: `${CRM_PREFIX}/payment`,
      payment: (id: string) => `${CRM_PREFIX}/payment/${id}`
    }
  },
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
  auth: {
    login: `${AUTH_PREFIX}/login`,
    register: `${AUTH_PREFIX}/register`,
    join: `${AUTH_PREFIX}/join`,
    forgotPassword: `${AUTH_PREFIX}/password/forgot`,
    updatePassword: `${AUTH_PREFIX}/password/update`,
    error: `${AUTH_PREFIX}/error`
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
  user: {
    settings: {
      index: `${USER_PREFIX}/settings`,
      security: `${USER_PREFIX}/settings/security`,
      billing: `${USER_PREFIX}/settings/billing`
    }
  },
  organization: {
    index: ORGANIZATION_PREFIX,
    settings: `${ORGANIZATION_PREFIX}/settings`,
    members: `${ORGANIZATION_PREFIX}/members`
  },
  workspace: {
    index: WORKSPACE_PREFIX,
    select: `${WORKSPACE_PREFIX}/select`
  }
} as const

export {
  pathsConfig,
  ADMIN_PREFIX,
  CRM_PREFIX,
  ORGANIZATION_PREFIX,
  USER_PREFIX,
  WORKSPACE_PREFIX,
  BLOG_PREFIX,
  AUTH_PREFIX,
  API_PREFIX,
  LEGAL_PREFIX
}
