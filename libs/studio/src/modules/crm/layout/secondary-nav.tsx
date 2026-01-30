import { Link, useLocation } from '@tanstack/react-router'

import { useTranslation } from '@libs/i18n'
import { cn } from '@libs/ui-shared/common'
import { Icons } from '@libs/ui-shared/web'

import { pathsConfig } from '../../../config/paths'

/**
 * CRM 二级导航 - 复杂的仪表板式布局
 */
export function CrmSecondaryNav() {
  const { t } = useTranslation('common')
  const location = useLocation()

  const isActive = (href: string) => location.pathname === href || location.pathname.startsWith(href + '/')

  // 快捷入口页面（网格卡片）
  const quickPages = [
    {
      label: t('overview'),
      href: pathsConfig.crm.index,
      icon: <Icons.LayoutDashboard className="size-6" />
    },
    {
      label: t('ai'),
      href: pathsConfig.crm.ai,
      icon: <Icons.Brain className="size-6" />
    }
  ]

  return (
    <div className="flex flex-col gap-6 p-4">
      {/* 统计卡片区域 */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Orders" value="1.2k" />
        <StatCard label="Revenue" value="$48k" />
      </div>

      {/* 进度指示器 */}
      <div className="flex flex-col gap-2">
        <span className="text-muted-foreground text-sm">Monthly Target</span>
        <div className="bg-muted h-2 overflow-hidden rounded-full">
          <div className="bg-primary h-full w-[65%] rounded-full" />
        </div>
        <span className="text-muted-foreground text-xs">Reached 65% from target</span>
      </div>

      {/* 快捷页面入口（网格） */}
      <div className="flex flex-col gap-2">
        <span className="text-muted-foreground text-sm">Pages</span>
        <div className="grid grid-cols-2 gap-2">
          {quickPages.map(page => (
            <Link
              key={page.href}
              to={page.href}
              className={cn(
                'flex flex-col items-center gap-2 rounded-lg border p-4 transition-colors',
                'hover:bg-accent hover:text-accent-foreground',
                isActive(page.href) && 'bg-accent border-primary'
              )}
            >
              {page.icon}
              <span className="text-xs">{page.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border p-3">
      <span className="text-muted-foreground text-xs">{label}</span>
      <span className="text-lg font-semibold">{value}</span>
    </div>
  )
}
