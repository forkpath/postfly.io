import { Img, Link, Text } from '@react-email/components'

import { APP_NAME } from '@libs/common'

interface FooterProps {
  readonly origin: string
}

export const Footer = ({ origin }: FooterProps) => {
  return (
    <>
      <Img src={`${origin}/images/logo.png`} alt={`${APP_NAME} Logo`} height={45} className="mt-12" />
      <Text className="text-muted-foreground max-w-[250px] leading-normal">
        <Link href="https://forkpath.com" className="text-muted-foreground" style={{ textDecoration: 'underline' }}>
          {APP_NAME}
        </Link>
      </Text>
    </>
  )
}
