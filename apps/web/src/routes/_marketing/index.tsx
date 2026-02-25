import { createFileRoute } from '@tanstack/react-router'

import { AgenticIntelligence } from '~/components/marketing/agentic-intelligence'
import { Benefits } from '~/components/marketing/benefits'
import { CTA } from '~/components/marketing/cta'
import { DivideX } from '~/components/marketing/divide'
import { FAQs } from '~/components/marketing/faqs'
import { Hero } from '~/components/marketing/hero'
import { HeroImage } from '~/components/marketing/hero-image'
import { HowItWorks } from '~/components/marketing/how-it-works'
import { LogoCloud } from '~/components/marketing/logo-cloud'
import { PricingSection } from '~/components/marketing/pricing-section'
import { Security } from '~/components/marketing/security'
import { Testimonials } from '~/components/marketing/testimonials'
import { UseCases } from '~/components/marketing/use-cases'

/* 营销首页路由 */
export const Route = createFileRoute('/_marketing/')({
  head: () => ({
    meta: [
      { title: 'Ray - AI 驱动的智能工作流平台' },
      {
        name: 'description',
        content: '赋能开发者和技术团队可视化地创建、模拟和管理 AI 驱动的工作流'
      },
      { property: 'og:title', content: 'Ray - AI Powered Workflow Platform' },
      {
        property: 'og:description',
        content: 'Empower developers and technical teams to create, simulate, and manage AI-driven workflows visually'
      },
      { property: 'og:type', content: 'website' }
    ]
  }),
  component: HomePage
})

function HomePage() {
  return (
    <>
      <DivideX />
      <Hero />
      <DivideX />
      <HeroImage />
      <DivideX />
      <LogoCloud />
      <DivideX />
      <HowItWorks />
      <DivideX />
      <AgenticIntelligence />
      <DivideX />
      <UseCases />
      <DivideX />
      <Benefits />
      <DivideX />
      <Testimonials />
      <DivideX />
      <PricingSection />
      <DivideX />
      <Security />
      <DivideX />
      <FAQs />
      <DivideX />
      <CTA />
      <DivideX />
    </>
  )
}
