import type { MouseEventHandler } from 'react'
import type { LinkProps } from '@tanstack/react-router'

import { forwardRef } from 'react'
import { Link } from '@tanstack/react-router'

export interface GoLinkProps extends Omit<LinkProps, 'to'> {
  readonly href: string
  readonly children?: React.ReactNode
  readonly className?: string
  readonly onClick?: MouseEventHandler<HTMLAnchorElement>
}

/**
 * GoLink - 对 TanStack Router 的 Link 组件进行封装
 *
 * 封装目的：
 * 1. 统一接口命名：将 `to` 属性重命名为 `href`，符合标准 HTML <a> 标签的语义习惯
 * 2. 解耦路由依赖：提供路由库无关的接口，便于未来切换路由实现（如 Next.js、React Router）
 * 3. 跨平台复用：web 和 desktop 应用可共享相同的链接组件接口
 * 4. 支持 ref 转发：通过 forwardRef 允许父组件访问底层 DOM 元素
 */
export const GoLink = forwardRef<HTMLAnchorElement, GoLinkProps>(
  ({ href, children, className, onClick, ...props }, ref) => {
    return (
      <Link ref={ref} to={href as never} className={className} onClick={onClick} {...props}>
        {children}
      </Link>
    )
  }
)

GoLink.displayName = 'GoLink'
