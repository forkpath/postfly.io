import { AnthropicLogo, MetaLogo, OpenAILogo, SlackLogo } from '~/components/marketing/icons/general'
import { Card } from '~/components/marketing/tech-card'

import { CenterSVG, LeftSVG, RightSVG } from './workflow-connectors'

/* 工作原理骨架屏动画 */
export const DesignYourWorkflowSkeleton = () => {
  return (
    <div className="mt-12 flex flex-col items-center">
      <div className="relative">
        <Card title="Slack" subtitle="#standups" logo={<SlackLogo />} cta="Connected" tone="default" />
        <LeftSVG className="absolute top-12 -left-32" />
        <RightSVG className="absolute top-12 -right-32" />
        <CenterSVG className="absolute top-24 right-[107px]" />
      </div>

      <div className="mt-12 flex flex-row gap-4.5">
        <Card
          title="Anthropic"
          subtitle="Claude 4"
          logo={<AnthropicLogo />}
          cta="UI Generator"
          tone="danger"
          delay={0.2}
        />
        <Card title="Meta" subtitle="Llama 2" logo={<MetaLogo />} cta="Text Generator" tone="default" delay={0.4} />
        <Card title="OpenAI" subtitle="GPT-5" logo={<OpenAILogo />} cta="Code Generator" tone="success" delay={0.6} />
      </div>
    </div>
  )
}
