# 营销页面

`_marketing` 是 TanStack Router 的无路径布局，提供导航栏、页面 Outlet 与页脚，不增加 URL 前缀。

| 文件          | URL        |
| ------------- | ---------- |
| `index.tsx`   | `/`        |
| `about.tsx`   | `/about`   |
| `pricing.tsx` | `/pricing` |
| `careers.tsx` | `/careers` |
| `contact.tsx` | `/contact` |

公共营销组件位于 `apps/web/src/components/marketing`，页面在各自 `head()` 中配置 SEO 元数据。文案使用 i18n 资源；修改时同步中英文内容。认证页面由 `/auth` 路由负责。

开发与构建入口见 [Web README](../../../README.md)。营销内容是可替换的业务示例，接入自己的产品时同步替换品牌、联系信息、套餐、链接与媒体资源。
