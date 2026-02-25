import React from 'react'
import { Link } from '@tanstack/react-router'

import { useTranslation } from 'react-i18next'

import { Badge } from './badge'
import { Button } from './button'
import { Container } from './container'
import { DivideX } from './divide'
import { Heading } from './heading'
import { GartnerLogo, GartnerLogoText, Star } from './icons/general'
import { SubHeading } from './subheading'

/* 首页 Hero 区域 */
export const Hero = () => {
  const { t } = useTranslation('marketing')

  return (
    <>
      <Container className="border-divide flex flex-col items-center justify-center border-x px-4 pt-32 pb-12 md:pt-40">
        <Badge text={t('hero.badge')} />
        <Heading className="mt-6 max-w-3xl">
          {t('hero.title')} <span className="text-primary">{t('hero.titleMiddle')}</span> {t('hero.titleHighlight')}
        </Heading>
        <SubHeading as="p" className="mx-auto mt-6 max-w-lg">
          {t('hero.subtitle')}
        </SubHeading>
        <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row">
          <Button as={Link} to="/auth/login" variant="primary">
            {t('cta.startUsing')}
          </Button>
          <Button as={Link} to="/pricing" variant="secondary">
            {t('cta.viewPricing')}
          </Button>
        </div>

        {/* Gartner 评分 */}
        <div className="mt-8 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
          <GartnerLogo className="size-6" />
          <div className="flex gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className="size-4" />
            ))}
          </div>
          <span>{t('hero.gartner')}</span>
          <GartnerLogoText className="h-4 w-auto" />
        </div>
      </Container>
      <DivideX />
    </>
  )
}
