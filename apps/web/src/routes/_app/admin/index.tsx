import { createFileRoute, redirect } from '@tanstack/react-router'

import { pathsConfig } from '@libs/studio'

// Admin 首页重定向到 organizations
// 访问 /admin 时自动跳转到 /admin/organizations
export const Route = createFileRoute('/_app/admin/')({
  beforeLoad: () => {
    throw redirect({ to: pathsConfig.admin.organizations.index })
  }
})
