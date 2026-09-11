import { Img } from '@react-email/components'

interface HeaderProps {
  readonly origin: string
}

export const Header = ({ origin }: HeaderProps) => {
  return <Img src={`${origin}/images/logo-text.png`} alt="Ray Logo" className="mb-10" height={45} />
}
