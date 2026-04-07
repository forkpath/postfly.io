import { defineExtensionMessaging } from '@webext-core/messaging'

export const Message = {
  HELLO: 'hello'
} as const

export type Message = (typeof Message)[keyof typeof Message]

interface Messages {
  [Message.HELLO]: (filename: string) => string
}

export const { onMessage, sendMessage } = defineExtensionMessaging<Messages>()
