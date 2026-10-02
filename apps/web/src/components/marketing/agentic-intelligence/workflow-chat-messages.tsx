import { useEffect } from 'react'

import { LogoSVG } from '~/components/marketing/logo'
import { useTypewriter } from '~/hooks/use-typewriter'

const TYPING_SPEED = 30

export const UserMessage = ({
  content,
  isActive,
  onComplete
}: {
  content: string
  isActive: boolean
  onComplete: () => void
}) => {
  const { displayText, isComplete } = useTypewriter(isActive ? content : content, TYPING_SPEED)

  useEffect(() => {
    if (isComplete && isActive) {
      onComplete()
    }
  }, [isComplete, isActive, onComplete])

  return (
    <div className="flex justify-end gap-3">
      <div className="flex max-w-xs flex-col gap-1">
        <div className="rounded-2xl rounded-br-md bg-blue-500 px-4 py-2 text-sm text-white">
          {isActive ? displayText : content}
          {isActive && !isComplete && <span className="animate-pulse">|</span>}
        </div>
      </div>
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-xs font-medium text-white">
        <img src="/marketing/avatar.webp" alt="user" width={32} height={32} className="rounded-full" />
      </div>
    </div>
  )
}

export const AssistantMessage = ({
  content,
  isActive,
  onComplete
}: {
  content: string
  isActive: boolean
  onComplete: () => void
}) => {
  const { displayText, isComplete } = useTypewriter(isActive ? content : content, TYPING_SPEED)

  useEffect(() => {
    if (isComplete && isActive) {
      onComplete()
    }
  }, [isComplete, isActive, onComplete])

  return (
    <div className="flex gap-3 px-1">
      <div className="shadow-aceternity flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-xs font-medium text-white dark:bg-neutral-900">
        <LogoSVG className="size-4 text-black dark:text-white" />
      </div>
      <div className="flex max-w-xs flex-col gap-1">
        <div className="text-charcoal-700 rounded-2xl rounded-bl-md bg-gray-100 px-4 py-2 text-sm">
          {isActive ? displayText : content}
          {isActive && !isComplete && <span className="animate-pulse">|</span>}
        </div>
      </div>
    </div>
  )
}
