'use client'

import type { Organization } from '@libs/auth'

import { useCallback } from 'react'
import { useNavigate } from '@tanstack/react-router'

import { useTranslation } from '@libs/i18n'
import { cn } from '@libs/ui-shared/common'
import { Avatar, AvatarFallback, AvatarImage, buttonVariants, Icons, Skeleton } from '@libs/ui-shared/web'

import { pathsConfig } from '../../config/paths'
import { authClient } from '../../lib/auth/client'
import { useWorkspaceStore } from './store'

interface WorkspaceItemProps {
  readonly type: 'personal' | 'organization'
  readonly organization?: Organization
  readonly onSelect: () => void
}

const WorkspaceItem = ({ type, organization, onSelect }: WorkspaceItemProps) => {
  const { t } = useTranslation('workspace')

  const isPersonal = type === 'personal'
  const name = isPersonal ? t('personal') : (organization?.name ?? '')
  const description = isPersonal ? t('personalDescription') : t('organizationDescription')
  const logo = isPersonal ? undefined : organization?.logo

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        buttonVariants({ variant: 'outline' }),
        'text-muted-foreground h-auto w-full items-center justify-between gap-3 px-6 py-5 has-[>svg]:px-6'
      )}
    >
      <div className="flex w-full min-w-0 items-center gap-4">
        <Avatar className="size-12">
          {isPersonal ? (
            <AvatarFallback>
              <Icons.User className="text-muted-foreground size-6" />
            </AvatarFallback>
          ) : (
            <>
              <AvatarImage src={logo ?? undefined} alt="" />
              <AvatarFallback>
                <span className="text-muted-foreground text-lg uppercase">{name.charAt(0)}</span>
              </AvatarFallback>
            </>
          )}
        </Avatar>
        <div className="flex flex-1 flex-col items-start gap-0.5">
          <span className="text-foreground text-base font-medium">{name}</span>
          <span className="text-muted-foreground text-sm">{description}</span>
        </div>
      </div>
      <Icons.ChevronRight className="-mr-1 size-5 shrink-0" />
    </button>
  )
}

export const WorkspaceSelector = () => {
  const { t } = useTranslation('workspace')
  const navigate = useNavigate()
  const { data: organizations, isPending } = authClient.useListOrganizations()
  const markSelected = useWorkspaceStore(state => state.markSelected)

  const handleSelectPersonal = useCallback(async () => {
    // 设置 activeOrganization 为 null 表示个人空间
    await authClient.organization.setActive({ organizationId: null })
    // 标记用户已选择工作空间
    markSelected()
    navigate({ to: pathsConfig.crm.index })
  }, [navigate, markSelected])

  const handleSelectOrganization = useCallback(
    async (org: Organization) => {
      // 设置活跃组织
      await authClient.organization.setActive({ organizationId: org.id })
      // 标记用户已选择工作空间
      markSelected()
      navigate({ to: pathsConfig.crm.index })
    },
    [navigate, markSelected]
  )

  return (
    <div className="w-full max-w-md space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">{t('select.title')}</h1>
        <p className="text-muted-foreground text-sm">{t('select.description')}</p>
      </div>

      <nav className="space-y-3">
        {isPending ? (
          <>
            <Skeleton className="h-[76px]" />
            <Skeleton className="h-[76px]" />
          </>
        ) : (
          <>
            {/* 个人空间选项 */}
            <WorkspaceItem type="personal" onSelect={handleSelectPersonal} />

            {/* 组织列表 */}
            {organizations?.map(org => (
              <WorkspaceItem
                key={org.id}
                type="organization"
                organization={org}
                onSelect={() => handleSelectOrganization(org)}
              />
            ))}
          </>
        )}
      </nav>
    </div>
  )
}
