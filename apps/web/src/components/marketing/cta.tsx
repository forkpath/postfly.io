import React from 'react'
import { Link } from '@tanstack/react-router'

import { useTranslation } from 'react-i18next'

import { Button } from './button'
import { Dot } from './common/dots'
import { Container } from './container'
import { AnthropicLogo, LinearLogo, MetaLogo, NotionLogo, OpenAILogo, SlackLogo, SupabaseLogo } from './icons/general'
import { LogoSVG } from './logo'

/* CTA + Logo 轨道动画 */
export const CTA = () => {
  const { t } = useTranslation('marketing')

  return (
    <Container className="border-divide relative border-x">
      <Dot top left />
      <Dot top right />
      <Dot bottom left />
      <Dot bottom right />
      <div className="flex flex-col items-center justify-center py-20 md:py-40">
        {/* 轨道动画 */}
        <div className="relative flex items-center justify-center">
          <div className="relative z-20 flex h-16 w-16 items-center justify-center rounded-2xl border border-gray-200 bg-white shadow-md dark:border-neutral-700 dark:bg-neutral-900">
            <LogoSVG className="h-8 w-8" />
          </div>
          {/* 外圈轨道 */}
          <div className="absolute h-[200px] w-[200px] animate-orbit md:h-[300px] md:w-[300px]">
            <OrbitIcon style={{ top: 0, left: '50%', transform: 'translateX(-50%)' }}>
              <OpenAILogo className="size-4" />
            </OrbitIcon>
            <OrbitIcon
              style={{
                bottom: 0,
                left: '50%',
                transform: 'translateX(-50%)'
              }}
            >
              <SlackLogo className="size-4" />
            </OrbitIcon>
            <OrbitIcon style={{ left: 0, top: '50%', transform: 'translateY(-50%)' }}>
              <AnthropicLogo className="size-4" />
            </OrbitIcon>
            <OrbitIcon
              style={{
                right: 0,
                top: '50%',
                transform: 'translateY(-50%)'
              }}
            >
              <MetaLogo className="size-4" />
            </OrbitIcon>
          </div>
          {/* 内反向轨道 */}
          <div className="absolute h-[100px] w-[100px] animate-counter-orbit md:h-[160px] md:w-[160px]">
            <OrbitIcon style={{ top: 0, left: '50%', transform: 'translateX(-50%)' }}>
              <LinearLogo className="size-4" />
            </OrbitIcon>
            <OrbitIcon
              style={{
                bottom: 0,
                left: '50%',
                transform: 'translateX(-50%)'
              }}
            >
              <SupabaseLogo className="size-4" />
            </OrbitIcon>
            <OrbitIcon
              style={{
                right: 0,
                top: '50%',
                transform: 'translateY(-50%)'
              }}
            >
              <NotionLogo className="size-4" />
            </OrbitIcon>
          </div>
        </div>
        <h2 className="text-charcoal-700 mx-auto mt-8 max-w-md text-center text-2xl font-medium md:text-3xl lg:text-4xl dark:text-neutral-100">
          {t('ctaSection.title')}
          <br />
          {t('ctaSection.titleLine2')}
        </h2>
        <Button as={Link} to="/auth/login" variant="primary" className="mt-8">
          {t('cta.startUsing')}
        </Button>
      </div>
    </Container>
  )
}

const OrbitIcon = ({ children, style }: { children: React.ReactNode; style: React.CSSProperties }) => (
  <div
    className="absolute flex h-8 w-8 animate-counter-orbit items-center justify-center rounded-lg border border-gray-200 bg-white shadow-sm dark:border-neutral-700 dark:bg-neutral-900"
    style={style}
  >
    {children}
  </div>
)
