import { Img, Link, Text } from '@react-email/components'

interface FooterProps {
  readonly origin: string
}

export const Footer = ({ origin }: FooterProps) => {
  return (
    <>
      <Img src={`${origin}/images/logo.png`} alt="Ray Logo" height={45} className="mt-12" />
      <Text className="text-muted-foreground max-w-[250px] leading-normal">
        <Link href="https://forkpath.com" className="text-muted-foreground" style={{ textDecoration: 'underline' }}>
          Ray
        </Link>
      </Text>
    </>
  )
}
