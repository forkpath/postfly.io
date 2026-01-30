import type { ReactNode } from 'react'
import type { User } from '@libs/auth'

import { memo, useState } from 'react'

import { useTranslation } from '@libs/i18n'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Icons,
  Input,
  Separator,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SidebarTrigger,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from '@libs/ui-shared/web'

import { GoLink, pathsConfig } from '../../../index'
import { authClient } from '../../../lib/auth/client'

// ============================================================================
// Language Dropdown
// ============================================================================

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'zh', label: '中文' }
] as const

interface LanguageDropdownProps {
  readonly trigger?: ReactNode
  readonly align?: 'start' | 'center' | 'end'
}

export const LanguageDropdown = memo<LanguageDropdownProps>(({ trigger, align = 'end' }) => {
  const { i18n } = useTranslation()
  const [language, setLanguage] = useState(i18n.language)

  const handleLanguageChange = (value: string) => {
    setLanguage(value)
    void i18n.changeLanguage(value)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {trigger || (
          <Button variant="outline" size="icon">
            <Icons.Languages className="size-5" />
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-50" align={align}>
        <DropdownMenuRadioGroup value={language} onValueChange={handleLanguageChange}>
          {LANGUAGES.map(lang => (
            <DropdownMenuRadioItem
              key={lang.value}
              value={lang.value}
              className="data-[state=checked]:bg-accent data-[state=checked]:text-accent-foreground pl-2 text-base [&>span]:hidden"
            >
              {lang.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
})

LanguageDropdown.displayName = 'LanguageDropdown'

// ============================================================================
// Activity Sheet
// ============================================================================

interface ActivitySheetProps {
  readonly trigger?: ReactNode
}

export const ActivitySheet = memo<ActivitySheetProps>(({ trigger }) => {
  const { t } = useTranslation('common')

  return (
    <Sheet>
      <SheetTrigger asChild>
        {trigger || (
          <Button variant="outline" size="icon">
            <Icons.Activity className="size-5" />
          </Button>
        )}
      </SheetTrigger>
      <SheetContent className="gap-0 sm:max-w-md [&>button]:top-2.75 [&>button>svg]:size-5">
        <SheetHeader className="border-b py-2.25">
          <SheetTitle className="text-lg leading-6">{t('activity')}</SheetTitle>
          <SheetDescription hidden />
        </SheetHeader>

        <div className="overflow-y-auto">
          <div className="flex gap-4 px-4 py-3">
            <Avatar>
              <AvatarFallback>JL</AvatarFallback>
            </Avatar>
            <div className="flex w-full flex-col items-start gap-2.5">
              <div className="text-muted-foreground flex flex-col items-start text-sm">
                <p>
                  <span className="text-foreground font-semibold">Joe Lincoln</span>{' '}
                  {t('activity.mentionedYou', { defaultValue: 'mentioned you in last trends topic' })}
                </p>
                <p>
                  18 {t('minutes')} {t('ago')}
                </p>
              </div>
              <div className="bg-muted flex flex-col gap-4 rounded-md border px-4 py-2.5">
                <p className="text-sm font-medium">
                  @User{' '}
                  {t('activity.checkTopic', {
                    defaultValue: 'For an expert opinion, check out what Mike has to say on this topic!'
                  })}
                </p>
                <div className="relative">
                  <Input placeholder={t('reply', { defaultValue: 'Reply' })} className="peer bg-card pr-9" />
                  <div className="text-muted-foreground pointer-events-none absolute inset-y-0 right-0 flex items-center justify-center pr-3 peer-disabled:opacity-50">
                    <Icons.Image className="size-4" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          <div className="flex gap-4 px-4 py-3">
            <Avatar>
              <AvatarFallback>JP</AvatarFallback>
            </Avatar>
            <div className="flex w-full flex-col items-start gap-2.5">
              <div className="text-muted-foreground flex flex-col items-start text-sm">
                <p>
                  <span className="text-foreground font-semibold">Jane Perez</span>{' '}
                  {t('activity.invitesReview', { defaultValue: 'invites you to review a file' })}
                </p>
                <p>
                  39 {t('minutes')} {t('ago')}
                </p>
              </div>
              <div className="bg-muted flex items-center gap-1 rounded-md px-1.5 py-1">
                <Icons.FileText className="size-4" />
                <span className="text-sm font-medium">invoices.pdf</span>
              </div>
            </div>
          </div>

          <Separator />

          <div className="flex gap-4 px-4 py-3">
            <Avatar>
              <AvatarFallback>TH</AvatarFallback>
            </Avatar>
            <div className="flex w-full flex-col items-start gap-2.5">
              <div className="text-muted-foreground flex flex-col items-start text-sm">
                <p>
                  <span className="text-foreground font-semibold">Tyler Hero</span>{' '}
                  {t('activity.wantsView', { defaultValue: 'wants to view your design project' })}
                </p>
                <p>
                  1 {t('hour')} {t('ago')}
                </p>
              </div>
              <div className="bg-muted flex w-full items-center gap-4 rounded-md border px-4 py-2.5">
                <Icons.FileImage className="size-8" />
                <span className="text-sm font-medium">Launcher-Uikit.fig</span>
              </div>
            </div>
          </div>

          <Separator />

          <div className="flex gap-4 px-4 py-3">
            <Avatar>
              <AvatarFallback>D</AvatarFallback>
            </Avatar>
            <div className="text-muted-foreground flex flex-col items-start text-sm">
              <p>
                <span className="text-foreground font-semibold">Denial</span>{' '}
                {t('activity.invitesReviewDesign', { defaultValue: 'invites you to review the new design' })}
              </p>
              <p>
                3 {t('hours')} {t('ago')}
              </p>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
})

ActivitySheet.displayName = 'ActivitySheet'

// ============================================================================
// Notification Dropdown
// ============================================================================

interface NotificationDropdownProps {
  readonly trigger?: ReactNode
  readonly align?: 'start' | 'center' | 'end'
}

export const NotificationDropdown = memo<NotificationDropdownProps>(({ trigger, align = 'end' }) => {
  const { t } = useTranslation('common')

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {trigger || (
          <Button variant="outline" size="icon" className="relative">
            <Icons.Bell className="size-5" />
            <span className="bg-destructive absolute -top-0.5 -right-0.5 size-2 rounded-full" />
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent className="max-w-xs sm:max-w-122" align={align}>
        <Tabs defaultValue="inbox" className="gap-0">
          <DropdownMenuLabel className="flex flex-col pb-0">
            <div className="flex items-center justify-between gap-6 pb-2.5">
              <span className="text-muted-foreground text-base font-normal uppercase">{t('notifications')}</span>
              <Badge variant="secondary" className="bg-primary/10 text-primary font-normal">
                8 {t('new')}
              </Badge>
            </div>
            <div className="-mb-0.5 flex items-center justify-between gap-4">
              <TabsList className="relative h-fit rounded-none bg-transparent p-0">
                <TabsTrigger
                  value="inbox"
                  className="data-[state=active]:border-b-primary! rounded-none border-b-2 border-b-transparent font-normal data-[state=active]:bg-transparent data-[state=active]:shadow-none dark:data-[state=active]:border-transparent dark:data-[state=active]:bg-transparent"
                >
                  {t('inbox', { defaultValue: 'Inbox' })}
                </TabsTrigger>
                <TabsTrigger
                  value="general"
                  className="data-[state=active]:border-b-primary! rounded-none border-b-2 border-b-transparent font-normal data-[state=active]:bg-transparent data-[state=active]:shadow-none dark:data-[state=active]:border-transparent dark:data-[state=active]:bg-transparent"
                >
                  {t('general', { defaultValue: 'General' })}
                </TabsTrigger>
              </TabsList>
              <Icons.Settings className="size-5" />
            </div>
          </DropdownMenuLabel>

          <DropdownMenuSeparator className="mt-0 h-0.5" />

          <TabsContent value="inbox">
            <DropdownMenuItem className="gap-3 px-2 py-3 text-base">
              <Avatar className="size-9.5">
                <AvatarFallback>MB</AvatarFallback>
              </Avatar>
              <div className="flex w-full flex-col items-start">
                <span className="text-base font-medium">Mark Bush</span>
                <div className="flex items-center gap-2.5">
                  <span className="text-muted-foreground text-sm">
                    12 {t('minutes')} {t('ago')}
                  </span>
                  <div className="bg-muted size-1.5 rounded-full" />
                  <span className="text-muted-foreground text-sm">
                    {t('notification.newPost', { defaultValue: 'New post' })}
                  </span>
                </div>
              </div>
              <div className="flex flex-col items-center gap-3">
                <Icons.X className="text-foreground size-3.5" />
                <div className="bg-primary size-1.5 rounded-full" />
              </div>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-3 px-2 py-3 text-base">
              <Avatar className="size-9.5">
                <AvatarFallback>AB</AvatarFallback>
              </Avatar>
              <div className="flex w-full flex-col items-start">
                <span className="text-base font-medium">Aaron Black</span>
                <div className="flex items-center gap-2.5">
                  <span className="text-muted-foreground text-sm">
                    27 {t('minutes')} {t('ago')}
                  </span>
                  <div className="bg-muted size-1.5 rounded-full" />
                  <span className="text-muted-foreground text-sm">
                    {t('notification.newComment', { defaultValue: 'New comment' })}
                  </span>
                </div>
              </div>
              <div className="flex flex-col items-center gap-3">
                <Icons.X className="text-foreground size-3.5" />
                <div className="bg-primary size-1.5 rounded-full" />
              </div>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="items-start gap-3 px-2 py-3 text-base">
              <Avatar className="size-9.5">
                <AvatarFallback>A</AvatarFallback>
              </Avatar>
              <div className="flex w-full flex-col items-start">
                <span className="text-base font-medium">
                  {t('notification.appliedCampaign', {
                    defaultValue: 'Anna has applied to create an ad for your campaign'
                  })}
                </span>
                <div className="flex items-center gap-2.5">
                  <span className="text-muted-foreground text-sm">
                    2 {t('hours')} {t('ago')}
                  </span>
                  <div className="bg-muted size-1.5 rounded-full" />
                  <span className="text-muted-foreground text-sm">
                    {t('notification.newRequest', { defaultValue: 'New request for campaign' })}
                  </span>
                </div>
                <div className="mt-3 flex items-center gap-4">
                  <Button variant="secondary" size="sm">
                    {t('decline')}
                  </Button>
                  <Button size="sm">{t('accept')}</Button>
                </div>
              </div>
            </DropdownMenuItem>
          </TabsContent>

          <TabsContent value="general">
            <DropdownMenuItem className="gap-3 px-2 py-3 text-base">
              <Avatar className="size-9.5">
                <AvatarFallback>FC</AvatarFallback>
              </Avatar>
              <div className="flex w-full flex-col items-start">
                <span className="text-base font-medium">Fred Campbell</span>
                <div className="flex items-center gap-2.5">
                  <span className="text-muted-foreground text-sm">
                    39 {t('minutes')} {t('ago')}
                  </span>
                  <div className="bg-muted size-1.5 rounded-full" />
                  <span className="text-muted-foreground text-sm">
                    {t('notification.newComment', { defaultValue: 'New comment' })}
                  </span>
                </div>
              </div>
              <div className="flex flex-col items-center gap-3">
                <Icons.X className="text-foreground size-3.5" />
                <div className="bg-primary size-1.5 rounded-full" />
              </div>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="items-start gap-3 px-2 py-3 text-base">
              <Avatar className="size-9.5">
                <AvatarFallback>S</AvatarFallback>
              </Avatar>
              <div className="flex w-full flex-col items-start">
                <span className="text-base font-medium">
                  {t('notification.attachedFile', { defaultValue: 'Scott attached the file' })}
                </span>
                <div className="flex items-center gap-2.5">
                  <span className="text-muted-foreground text-sm">
                    3 {t('hours')} {t('ago')}
                  </span>
                  <div className="bg-muted size-1.5 rounded-full" />
                  <span className="text-muted-foreground text-sm">
                    {t('notification.attachedFiles', { defaultValue: 'Attached files' })}
                  </span>
                </div>
                <div className="mt-3 flex items-center gap-1.5">
                  <Icons.Link className="text-foreground size-4" />
                  <span className="text-sm">Work examples.com</span>
                </div>
              </div>
            </DropdownMenuItem>
          </TabsContent>
        </Tabs>
      </DropdownMenuContent>
    </DropdownMenu>
  )
})

NotificationDropdown.displayName = 'NotificationDropdown'

// ============================================================================
// Profile Dropdown
// ============================================================================

interface ProfileDropdownProps {
  readonly user: User
  readonly trigger?: ReactNode
  readonly align?: 'start' | 'center' | 'end'
}

export const ProfileDropdown = memo<ProfileDropdownProps>(({ user, trigger, align = 'end' }) => {
  const { t } = useTranslation(['common', 'auth'])

  const handleLogout = () => {
    void authClient.signOut()
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="icon" className="size-9.5">
            <Avatar className="size-9.5 rounded-md">
              <AvatarImage src={user.image ?? undefined} alt={user.name ?? ''} />
              <AvatarFallback>{user.name?.slice(0, 2).toUpperCase() || 'U'}</AvatarFallback>
            </Avatar>
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80" align={align}>
        <DropdownMenuLabel className="flex items-center gap-4 px-4 py-2.5 font-normal">
          <div className="relative">
            <Avatar className="size-10">
              <AvatarImage src={user.image ?? undefined} alt={user.name ?? ''} />
              <AvatarFallback>{user.name?.slice(0, 2).toUpperCase() || 'U'}</AvatarFallback>
            </Avatar>
            <span className="ring-card absolute right-0 bottom-0 block size-2 rounded-full bg-green-600 ring-2" />
          </div>
          <div className="flex flex-1 flex-col items-start">
            <span className="text-foreground text-lg font-semibold">{user.name}</span>
            <span className="text-muted-foreground text-base">{user.email}</span>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuItem className="px-4 py-2.5 text-base" asChild>
            <GoLink href={pathsConfig.user.settings.index}>
              <Icons.User className="text-foreground size-5" />
              <span>{t('account.profile')}</span>
            </GoLink>
          </DropdownMenuItem>
          <DropdownMenuItem className="px-4 py-2.5 text-base" asChild>
            <GoLink href={pathsConfig.user.settings.index}>
              <Icons.Settings className="text-foreground size-5" />
              <span>{t('settings')}</span>
            </GoLink>
          </DropdownMenuItem>
          <DropdownMenuItem className="px-4 py-2.5 text-base" asChild>
            <GoLink href={pathsConfig.user.settings.billing}>
              <Icons.CreditCard className="text-foreground size-5" />
              <span>{t('billing')}</span>
            </GoLink>
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuItem className="px-4 py-2.5 text-base" asChild>
            <GoLink href={pathsConfig.organization.members}>
              <Icons.Users className="text-foreground size-5" />
              <span>{t('organization.members')}</span>
            </GoLink>
          </DropdownMenuItem>
          <DropdownMenuItem className="px-4 py-2.5 text-base" asChild>
            <GoLink href={pathsConfig.organization.settings}>
              <Icons.Pencil className="text-foreground size-5" />
              <span>{t('customization', { defaultValue: 'Customization' })}</span>
            </GoLink>
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuItem variant="destructive" className="px-4 py-2.5 text-base" onClick={handleLogout}>
          <Icons.LogOut className="size-5" />
          <span>{t('logout.cta')}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
})

ProfileDropdown.displayName = 'ProfileDropdown'

// ============================================================================
// App Header
// ============================================================================

interface AppHeaderProps {
  readonly user: User
  readonly onToggleSidebar?: () => void
  readonly showSidebarToggle?: boolean
  readonly actions?: ReactNode
}

export const AppHeader = memo<AppHeaderProps>(({ user, onToggleSidebar, showSidebarToggle = true, actions }) => {
  const { t } = useTranslation('common')

  return (
    <header className="bg-card sticky top-0 z-50 flex h-14 items-center justify-between gap-6 border-b px-4 sm:px-6">
      <div className="flex items-center gap-4">
        <SidebarTrigger className="md:hidden [&_svg]:size-5!" />
        {showSidebarToggle && (
          <Button variant="ghost" size="icon" className="hidden md:flex" onClick={onToggleSidebar}>
            <Icons.PanelLeft className="size-5" />
            <span className="sr-only">{t('toggleSidebar', { defaultValue: 'Toggle sidebar' })}</span>
          </Button>
        )}
        <Button variant="ghost" className="hidden bg-transparent! px-1 py-0 font-normal sm:block">
          <div className="text-muted-foreground hidden items-center gap-1.5 text-sm sm:flex">
            <Icons.Search className="size-4" />
            <span>{t('search.placeholder', { defaultValue: 'Type to search...' })}</span>
          </div>
        </Button>
        <Button variant="ghost" size="icon" className="sm:hidden">
          <Icons.Search className="size-5" />
          <span className="sr-only">{t('search')}</span>
        </Button>
      </div>
      <div className="flex items-center gap-1.5 sm:gap-6">
        <div className="flex items-center gap-1.5">
          <LanguageDropdown />
          <ActivitySheet />
          <NotificationDropdown />
        </div>
        {actions}
        <ProfileDropdown user={user} />
      </div>
    </header>
  )
})

AppHeader.displayName = 'AppHeader'
