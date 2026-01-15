# libs/i18n

面向大型 monorepo 的国际化模块，支持多个应用共享翻译资源、按需加载、多语言校验（Zod）、日期本地化（dayjs），并兼容 @tanstack/react-start 的 SSR 场景。

## 设计方案

### 1) 统一配置与资源入口
- `config.ts` 统一维护 locale、namespace、cookie 名称等基础配置。
- `translations/**` 采用按 namespace 分文件的组织方式，减少单次加载体积。
- `translations/index.ts` 通过动态 import 实现按需加载。

### 2) 客户端与服务端分层
- `client/index.tsx`：用于 React 客户端，内置语言检测、动态加载、I18nProvider。
- `server/index.ts`：用于 SSR 或服务端渲染场景，提供 `getTranslation()`，支持显式传入 `locale` 或从 `Request` 中解析。

### 3) 校验与日期本地化
- `utils/validation.ts` 将 Zod 的错误映射为 i18n 文案。
- `client` 和 `server` 都会在初始化时设置 dayjs 的 locale 与 Zod 的 i18n map。

## 使用场景

### 1) React 客户端
```tsx
import { I18nProvider, useTranslation } from "@libs/i18n";

export function App() {
  return (
    <I18nProvider locale="en">
      <Content />
    </I18nProvider>
  );
}

function Content() {
  const { t } = useTranslation("common");
  return <div>{t("welcome")}</div>;
}
```

### 2) SSR（@tanstack/react-start）
```ts
import { getTranslation } from "@libs/i18n";

export async function loader({ request }: { request: Request }) {
  const { t } = await getTranslation({ request, ns: "auth" });
  return { title: t("login.title") };
}
```

### 3) 邮件模板渲染（@react-email/render）
```ts
import { getTranslation } from "@libs/i18n";

export const ConfirmEmail = async ({ url, locale }: { url: string; locale?: string }) => {
  const { t } = await getTranslation({ locale, ns: "auth" });
  return (
    <>
      <h1>{t("account.email.confirm.email.subject")}</h1>
      <p>{t("account.email.confirm.email.body")}</p>
      <a href={url}>{t("account.email.confirm.email.cta")}</a>
    </>
  );
};
```

## 关键 API

- `getTranslation({ locale?, request?, ns? })`：服务端获取 `t` 与 i18n 实例
- `initializeI18nClient({ locale?, ns? })`：客户端初始化（通常由 `I18nProvider` 封装）
- `I18nProvider`：React 客户端 Provider
- `useTranslation(ns)`：React hooks

## 环境变量

支持 VITE_ 前缀：

- `VITE_DEFAULT_LOCALE`：默认语言（可选）
- `DEFAULT_LOCALE`：服务端默认语言（可选）

