import { createFileRoute } from '@tanstack/react-router'

import { DivideX } from '~/components/marketing/divide'
import { FAQs } from '~/components/marketing/faqs'
import { PricingSection } from '~/components/marketing/pricing-section'

/* 定价页面路由 */
export const Route = createFileRoute('/_marketing/pricing')({
  head: () => ({
    meta: [
      { title: 'Pricing - Ray' },
      {
        name: 'description',
        content: 'Simple and feasible pricing for teams of all sizes.'
      }
    ]
  }),
  component: PricingPage
})

function PricingPage() {
  return (
    <div className="pt-24">
      <PricingSection />
      <DivideX />
      <FAQs />
    </div>
  )
}
