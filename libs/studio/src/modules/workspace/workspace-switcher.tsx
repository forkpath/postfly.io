'use client'

import type { ActiveOrganization, Organization } from '@libs/auth'

import { memo, useCallback } from 'react'

import { useTranslation } from '@libs/i18n'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  Icons
} from '@libs/ui-shared/web'

import { authClient } from '../../lib/auth/client'

interface WorkspaceSwitcherItemProps {
  readonly type: 'personal' | 'organization'
  readonly organization?: Organization
  readonly isActive: boolean
  readonly onSelect: () => void
}

const WorkspaceSwitcherItem = memo<WorkspaceSwitcherItemProps>(({ type, organization, isActive, onSelect }) => {
  const { t } = useTranslation('workspace')

  const isPersonal = type === 'personal'
  const name = isPersonal ? t('personal') : (organization?.name ?? '')
  const logo = isPersonal ? undefined : organization?.logo

  return (
    <DropdownMenuItem className="gap-3 px-3 py-2.5 text-base" onClick={onSelect}>
      <Avatar className="size-7">
        {isPersonal ? (
          <AvatarFallback className="bg-muted">
            <Icons.User className="text-muted-foreground size-4" />
          </AvatarFallback>
        ) : (
          <>
            <AvatarImage src={logo ?? undefined} alt="" />
            <AvatarFallback className="bg-muted">
              <span className="text-muted-foreground text-xs uppercase">{name.charAt(0)}</span>
            </AvatarFallback>
          </>
        )}
      </Avatar>
      <span className="flex-1 truncate">{name}</span>
      {isActive && <Icons.Check className="text-primary size-4 shrink-0" />}
    </DropdownMenuItem>
  )
})

WorkspaceSwitcherItem.displayName = 'WorkspaceSwitcherItem'

/**
 * 预取组织数据的 hook
 * 在组件挂载时就开始请求数据，避免 dropdown 打开时才请求导致的白屏
 */
export function useWorkspaceSwitcherData() {
  const { data: organizations, isPending: isLoadingOrgs } = authClient.useListOrganizations()
  const { data: activeOrg } = authClient.useActiveOrganization()

  return {
    organizations: organizations ?? [],
    activeOrg,
    isLoading: isLoadingOrgs,
    hasOrganizations: !isLoadingOrgs && organizations && organizations.length > 0
  }
}

interface WorkspaceSwitcherProps {
  readonly organizations: Organization[]
  readonly activeOrg: ActiveOrganization | null | undefined
}

export const WorkspaceSwitcher = memo<WorkspaceSwitcherProps>(({ organizations, activeOrg }) => {
  const { t } = useTranslation('workspace')

  const isPersonalActive = !activeOrg

  const handleSelectPersonal = useCallback(async () => {
    await authClient.organization.setActive({ organizationId: null })
  }, [])

  const handleSelectOrganization = useCallback(async (org: Organization) => {
    await authClient.organization.setActive({ organizationId: org.id })
  }, [])

  // 如果没有组织，不显示切换器
  if (organizations.length === 0) {
    return null
  }

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger className="px-4 py-2.5 text-base">
        <Icons.RefreshCw className="text-foreground size-5" />
        <span>{t('switch')}</span>
      </DropdownMenuSubTrigger>
      <DropdownMenuPortal>
        <DropdownMenuSubContent className="min-w-56">
          {/* 个人空间选项 */}
          <WorkspaceSwitcherItem type="personal" isActive={isPersonalActive} onSelect={handleSelectPersonal} />

          {/* 组织列表 */}
          {organizations.map(org => (
            <WorkspaceSwitcherItem
              key={org.id}
              type="organization"
              organization={org}
              isActive={activeOrg?.id === org.id}
              onSelect={() => handleSelectOrganization(org)}
            />
          ))}
        </DropdownMenuSubContent>
      </DropdownMenuPortal>
    </DropdownMenuSub>
  )
})

WorkspaceSwitcher.displayName = 'WorkspaceSwitcher'
