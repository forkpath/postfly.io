import React from 'react'
import { Link } from '@tanstack/react-router'

import { useTranslation } from 'react-i18next'

import { Button } from './button'
import { Container } from './container'
import { DivideX } from './divide'
import { SectionHeading } from './section-heading'
import { SubHeading } from './subheading'

/* 安全认证板块 */
export const Security = () => {
  const { t } = useTranslation('marketing')
  return (
    <>
      <Container className="border-divide border-x">
        <h2 className="pt-10 pb-5 text-center font-mono text-sm tracking-tight text-neutral-500 uppercase md:pt-20 md:pb-10 dark:text-neutral-400">
          {t('security.label')}
        </h2>
      </Container>
      <DivideX />
      <Container className="border-divide grid grid-cols-1 border-x bg-gray-100 px-8 py-12 md:grid-cols-2 dark:bg-neutral-900">
        <div>
          <SectionHeading className="text-left">{t('security.title')}</SectionHeading>
          <SubHeading as="p" className="mt-4 text-left">
            {t('security.subtitle')}
          </SubHeading>
          <Button className="mt-4 mb-8 inline-block w-full md:w-auto" as={Link} to="/pricing">
            {t('cta.startFree')}
          </Button>
        </div>
        <div className="flex items-center justify-center gap-10">
          <img src="/marketing/logos/CCPA.png" alt="CCPA" className="h-auto w-14" draggable={false} />
          <img src="/marketing/logos/GDPR.png" alt="GDPR" className="h-auto w-14" draggable={false} />
          <img src="/marketing/logos/ISO.png" alt="ISO" className="h-auto w-14" draggable={false} />
        </div>
      </Container>
    </>
  )
}
