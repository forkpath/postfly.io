import type { LinkProps } from '@tanstack/react-router'

import { forwardRef } from 'react'
import { Link } from '@tanstack/react-router'

export interface TurboLinkProps extends Omit<LinkProps, 'to'> {
  readonly href: string
  readonly children?: React.ReactNode
  readonly className?: string
}

export const TurboLink = forwardRef<HTMLAnchorElement, TurboLinkProps>(
  ({ href, children, className, ...props }, ref) => {
    return (
      <Link ref={ref} to={href} className={className} {...props}>
        {children}
      </Link>
    )
  }
)

TurboLink.displayName = 'TurboLink'
