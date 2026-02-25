import React from 'react'
import { Link } from '@tanstack/react-router'

import { useTranslation } from 'react-i18next'

import { Container } from './container'
import { DivideX } from './divide'
import { LinkedInIcon } from './icons/general'
import { LogoSVG } from './logo'

/* 营销站页脚 */
export const Footer = () => {
  const { t } = useTranslation('marketing')

  const productLinks = [
    { label: t('footer.product.agentBuilder'), href: '#' },
    { label: t('footer.product.simulation'), href: '#' },
    { label: t('footer.product.integrations'), href: '#' },
    { label: t('footer.product.multiAgent'), href: '#' },
    { label: t('footer.product.workflowApi'), href: '#' }
  ]

  const companyLinks = [
    { label: t('footer.company.about'), href: '/about' },
    { label: t('footer.company.pricing'), href: '/pricing' },
    { label: t('footer.company.careers'), href: '/careers' },
    { label: t('footer.company.contact'), href: '/contact' }
  ]

  const legalLinks = [
    { label: t('footer.legal.privacy'), href: '#' },
    { label: t('footer.legal.terms'), href: '#' },
    { label: t('footer.legal.cookies'), href: '#' }
  ]

  return (
    <footer>
      <Container className="border-divide border-x">
        <div className="grid grid-cols-2 gap-8 px-4 py-12 md:grid-cols-5 md:px-8">
          {/* Logo & 简介 */}
          <div className="col-span-2">
            <div className="flex items-center gap-2">
              <LogoSVG />
              <span className="text-xl font-medium">Notus</span>
            </div>
            <p className="mt-4 max-w-sm text-sm text-gray-600 dark:text-neutral-400">{t('footer.tagline')}</p>
            <a
              href="https://linkedin.com"
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-block text-gray-600 hover:text-black dark:text-neutral-400 dark:hover:text-white"
            >
              <LinkedInIcon className="size-5" />
            </a>
          </div>

          {/* 产品链接 */}
          <div>
            <h3 className="mb-4 text-sm font-medium">{t('footer.product.title')}</h3>
            <ul className="space-y-3">
              {productLinks.map(link => (
                <li key={link.label}>
                  <a href={link.href} className="text-sm text-footer-link hover:text-black dark:hover:text-white">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* 公司链接 */}
          <div>
            <h3 className="mb-4 text-sm font-medium">{t('footer.company.title')}</h3>
            <ul className="space-y-3">
              {companyLinks.map(link => (
                <li key={link.label}>
                  <Link to={link.href} className="text-sm text-footer-link hover:text-black dark:hover:text-white">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* 法律链接 */}
          <div>
            <h3 className="mb-4 text-sm font-medium">{t('footer.legal.title')}</h3>
            <ul className="space-y-3">
              {legalLinks.map(link => (
                <li key={link.label}>
                  <a href={link.href} className="text-sm text-footer-link hover:text-black dark:hover:text-white">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <DivideX />
        {/* 版权信息 */}
        <div className="flex items-center justify-between px-4 py-6 md:px-8">
          <p className="text-sm text-gray-600 dark:text-neutral-400">
            &copy; {new Date().getFullYear()} Notus. {t('footer.copyright')}
          </p>
        </div>
      </Container>
    </footer>
  )
}
