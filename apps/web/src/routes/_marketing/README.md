# 营销站点迁移文档

## 概述

本次迁移将 `/Users/forkpath/Downloads/ref` 中基于 Next.js App Router 的营销网站完整迁移至 `apps/web` 的 TanStack Start 框架，采用 `_marketing` pathless 路由组织，支持 SSR + SEO + 中英双语。

## 架构决策

### 路由方案

采用 TanStack Router 的 **pathless 布局路由**（`_marketing` 前缀），不会产生 URL 路径段，因此 `_marketing/index.tsx` 自然映射到 `/`。

| Next.js 路由 | TanStack Start 路由 | URL |
|---|---|---|
| `app/page.tsx` | `_marketing/index.tsx` | `/` |
| `app/about/page.tsx` | `_marketing/about.tsx` | `/about` |
| `app/pricing/page.tsx` | `_marketing/pricing.tsx` | `/pricing` |
| `app/careers/page.tsx` | `_marketing/careers.tsx` | `/careers` |
| `app/contact/page.tsx` | `_marketing/contact.tsx` | `/contact` |
| `app/sign-in/page.tsx` | *(不迁移)* | 由 `/auth/login` 替代 |
| `app/sign-up/page.tsx` | *(不迁移)* | 由 `/auth/register` 替代 |
| `app/blog/page.tsx` | *(不迁移)* | 博客系统未迁移 |

### 布局结构

```
_marketing.tsx          ← pathless 布局路由 (Navbar + Outlet + Footer)
├── index.tsx           ← 首页 (/)
├── about.tsx           ← 关于 (/about)
├── pricing.tsx         ← 定价 (/pricing)
├── careers.tsx         ← 招聘 (/careers)
└── contact.tsx         ← 联系 (/contact)
```

### SSR & SEO

所有营销路由均通过 `head()` 配置 SEO 元数据（title、description、og:* 等），TanStack Start 默认启用 SSR。

## 组件映射清单

所有营销组件位于 `apps/web/src/components/marketing/`：

### 布局组件
| 组件 | 文件 | 说明 |
|---|---|---|
| Navbar | `navbar.tsx` | 响应式导航栏（桌面 + 移动端 + 滚动浮动） |
| Footer | `footer.tsx` | 页脚（产品/公司/法律链接 + 版权） |
| Container | `container.tsx` | 通用容器 (max-w-7xl) |
| DivideX | `divide.tsx` | 水平分割线 |

### UI 基础组件
| 组件 | 文件 | 说明 |
|---|---|---|
| Button | `button.tsx` | 营销按钮（primary/secondary/brand 变体） |
| Badge | `badge.tsx` | 闪烁标签 |
| Heading | `heading.tsx` | 页面主标题 |
| SubHeading | `subheading.tsx` | 副标题 |
| SectionHeading | `section-heading.tsx` | 章节标题 |
| ShimmerText | `shimmer-text.tsx` | 文字闪烁动画 |
| Logo | `logo.tsx` | Notus Logo 及链接 |
| Scale | `scale.tsx` | 网格斜线背景 |
| ModeToggle | `mode-toggle.tsx` | 明暗主题切换 |
| SlidingNumber | `sliding-number.tsx` | 数字滑动动画 |

### 首页板块组件
| 组件 | 文件 | 说明 |
|---|---|---|
| Hero | `hero.tsx` | Hero 区域 + 星级评分 + CTA |
| HeroImage | `hero-image.tsx` | 3D 视差图片 |
| LogoCloud | `logo-cloud.tsx` | Logo 合作伙伴轮播 |
| UseCases | `use-cases.tsx` | 应用场景展示 |
| Testimonials | `testimonials.tsx` | 客户评价轮播 |
| PricingSection | `pricing-section.tsx` | 定价板块（月/年切换） |
| Security | `security.tsx` | 安全认证板块 |
| FAQs | `faqs.tsx` | FAQ 手风琴 |
| CTA | `cta.tsx` | CTA + Logo 轨道动画 |

### 辅助组件
| 组件 | 文件 | 说明 |
|---|---|---|
| Dot | `common/dots.tsx` | 角落装饰点 |
| IconBlock | `common/icon-block.tsx` | 图标容器块 |
| HorizontalLine | `common/horizontal-line.tsx` | 水平动画连线 |
| VerticalLine | `common/vertical-line.tsx` | 垂直动画连线 |

### 图标组件
| 文件 | 包含 |
|---|---|
| `icons/general.tsx` | GartnerLogo、Star、社交媒体图标、导航图标等 |
| `icons/card-icons.tsx` | CheckIcon、功能图标（DevOps、Rocket、Shield 等） |
| `icons/bento-icons.tsx` | BrainIcon、NativeIcon、SDKIcon 等 |

## 主题/样式映射

### CSS 变量映射

| ref 变量 | 映射方式 |
|---|---|
| `--color-brand` | `var(--primary)` — 使用当前主题系统的 primary 色 |
| 背景色 white/black | `var(--background)` — 使用当前主题变量 |
| `--color-charcoal-*` | 直接定义在 `app.css` 中 |
| `--color-gray-*` | 直接定义在 `app.css` 中 |

### 营销专用语义色

在 `app.css` 中新增了以下语义变量（亮/暗模式自动切换）：

- `--divide` — 分割线颜色
- `--mk-primary` — 营销区域主色
- `--canvas` / `--canvas-fill` — 画布色
- `--dots` — 点阵色
- `--line` — 连线色
- `--footer-link` — 页脚链接色

### 字体

保留 ref 项目的字体方案：
- 主字体：Inter / Inter Display
- 等宽字体：DM Mono

### 动画

迁移了以下 CSS 动画：
- `orbit` — 轨道旋转（24s）
- `counter-orbit` — 反向轨道旋转（24s）

## i18n 翻译 Key 结构

翻译文件位于 `libs/i18n/src/translations/{en,zh}/marketing.json`，结构如下：

```
marketing
├── nav           — 导航链接文本
├── cta           — 行为召唤按钮文本
├── hero          — Hero 区域
├── logoCloud     — Logo 云
├── howItWorks    — 工作原理
├── agenticIntelligence — 核心功能
├── useCases      — 应用场景
├── benefits      — 核心优势
├── testimonials  — 客户评价
├── pricing       — 定价
├── security      — 安全
├── faqs          — 常见问题
├── ctaSection    — CTA 区域
├── about         — 关于页面
├── careers       — 招聘页面
├── contact       — 联系页面
└── footer        — 页脚
```

## 关键变更

### Next.js → TanStack Start 适配

| 变更项 | 原始 | 迁移后 |
|---|---|---|
| 路由链接 | `next/link` 的 `Link` | `@tanstack/react-router` 的 `Link` |
| 图片 | `next/image` 的 `Image` | 标准 `<img>` 标签 |
| 客户端指令 | `"use client"` | 已移除（TanStack Start 默认客户端） |
| 主题切换 | `next-themes` | 复用现有 `ThemeProvider` |
| 字体加载 | `next/font/google` | CSS `@theme` 中定义 |
| SEO 元数据 | `generateMetadata()` | `head()` 配置 |

### "Start building" → "立即使用"

所有原 ref 项目中的 "Start building" 按钮已改为 i18n key `cta.startUsing`：
- 英文：Get Started
- 中文：立即使用
- 点击跳转至 `/auth/login`

## 静态资源

ref 项目的公共资源已复制到 `apps/web/public/marketing/`：

```
public/marketing/
├── avatars/      — 团队头像
├── logos/        — 合作伙伴 Logo + 安全认证标识
├── team/         — 团队照片
├── blog/         — 博客配图
├── illustrations/ — 插图
├── dashboard@3x.png — 首页 Hero 截图
├── dashboard.png
├── banner.png
└── avatar.webp
```

## 依赖变更

新增依赖：
- `react-use-measure` — 组件尺寸测量（用于 FAQ 手风琴、数字动画）

已有依赖（无需新增）：
- `motion` (^12.29.0) — 核心动画库
- `lucide-react` — 图标
- `class-variance-authority` — 样式变体

## 未迁移内容

1. **博客系统** — MDX 博客未迁移，导航中已移除
2. **登录/注册页** — 由现有 `/auth/login` 和 `/auth/register` 替代
3. **Playground 页** — ref 中的 playground 页面未迁移
4. **HowItWorks 骨架屏** — 复杂的 how-it-works 和 agentic-intelligence 板块的骨架屏动画简化处理
5. **Benefits 中间卡片** — 复杂的中间动画卡片简化处理

## 后续优化方向

1. 完善 Benefits 和 HowItWorks 板块的动画效果
2. 添加页面切换过渡动画
3. 图片资源优化（WebP 格式、懒加载）
4. 性能优化（组件懒加载、代码分割）
5. 博客系统迁移（如需要）
6. 表单提交功能对接后端 API
