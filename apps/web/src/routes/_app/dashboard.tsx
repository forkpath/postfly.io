import { createFileRoute, Outlet } from '@tanstack/react-router'

// Dashboard 路由
export const Route = createFileRoute('/_app/dashboard')({
  component: DashboardRoute
})

function DashboardRoute() {
  return <Outlet />
}
