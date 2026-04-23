import React, { useState } from 'react'

import { motion } from 'motion/react'
import { useTranslation } from 'react-i18next'

import { Badge } from './badge'
import { Container } from './container'
import { DatabaseIcon, DevopsIcon, GraphIcon, PhoneIcon, TruckIcon, WalletIcon } from './icons/card-icons'
import { Scale } from './scale'
import { SectionHeading } from './section-heading'
import { SubHeading } from './subheading'

/* 应用场景展示 */
export const UseCases = () => {
  const { t } = useTranslation('marketing')
  const useCases = [
    { key: 'devops', icon: <DevopsIcon className="text-primary size-6" /> },
    { key: 'salesops', icon: <GraphIcon className="text-primary size-6" /> },
    {
      key: 'supplyChain',
      icon: <TruckIcon className="text-primary size-6" />
    },
    {
      key: 'customerSupport',
      icon: <PhoneIcon className="text-primary size-6" />
    },
    { key: 'dataops', icon: <DatabaseIcon className="text-primary size-6" /> },
    { key: 'finops', icon: <WalletIcon className="text-primary size-6" /> }
  ] as const
  const [active, setActive] = useState<number | null>(null)

  return (
    <Container className="border-divide relative overflow-hidden border-x px-4 md:px-8">
      <div className="relative flex flex-col items-center py-20">
        <Badge text={t('useCases.badge')} />
        <SectionHeading className="mt-4">{t('useCases.title')}</SectionHeading>
        <SubHeading as="p" className="mx-auto mt-6 max-w-lg">
          {t('useCases.subtitle')}
        </SubHeading>
        <div className="mt-12 grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-3">
          {useCases.map((uc, i) => (
            <div key={uc.key} onMouseEnter={() => setActive(i)} className="relative">
              {active === i && (
                <motion.div
                  layoutId="scale"
                  className="absolute inset-0 z-0"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.5 }}
                  exit={{ opacity: 0 }}
                >
                  <Scale />
                </motion.div>
              )}
              <div className="relative z-10 rounded-lg bg-gray-50 p-4 transition duration-200 hover:bg-transparent md:p-5 dark:bg-neutral-800">
                <div className="flex items-center gap-2">{uc.icon}</div>
                <h3 className="mt-4 mb-2 text-lg font-medium">{t(`useCases.items.${uc.key}.title` as const)}</h3>
                <p className="text-gray-600">{t(`useCases.items.${uc.key}.description` as const)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Container>
  )
}
