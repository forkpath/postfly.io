declare module '@ungap/structured-clone' {
  const structuredClone: <T>(value: T, options?: { transfer?: unknown[] }) => T
  export default structuredClone
}

declare module '@stardazed/streams-text-encoding' {
  export class TextEncoderStream {
    constructor()
  }
  export class TextDecoderStream {
    constructor()
  }
}

declare module 'react-native-marked' {
  import type { ComponentType } from 'react'
  const Markdown: ComponentType<Record<string, unknown>>
  export default Markdown
}

declare module 'react-qr-code' {
  import type { ComponentType } from 'react'
  const QRCode: ComponentType<Record<string, unknown>>
  export default QRCode
}
