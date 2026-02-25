import { createFileRoute, Outlet } from '@tanstack/react-router'

import { DivideX } from '~/components/marketing/divide'
import { Footer } from '~/components/marketing/footer'
import { Navbar } from '~/components/marketing/navbar'

/* 营销站点无路径布局路由（Navbar + Outlet + Footer） */
export const Route = createFileRoute('/_marketing')({
  component: MarketingLayout
})

function MarketingLayout() {
  return (
    <div className="flex w-full flex-col">
      <Navbar />
      <main className="mt-0">
        <Outlet />
      </main>
      <DivideX />
      <Footer />
    </div>
  )
}
