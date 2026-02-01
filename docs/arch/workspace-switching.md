# 工作空间切换功能设计方案

## 概述

本文档描述了用户登录后选择工作空间以及在应用内切换工作空间的功能设计方案。

## 需求分析

### 核心需求

1. **登录后前置选择**：当用户登录后，如果用户是某个或多个组织的成员，需要显示一个过渡页面让用户选择要进入的工作空间（个人空间或组织）
2. **无组织直接进入**：如果用户不属于任何组织，则直接进入应用主界面
3. **应用内切换**：用户进入应用后，可以通过顶部导航栏的用户下拉菜单中的"切换空间"选项来切换工作空间

### 用户场景

- 用户 A 属于组织 X 和组织 Y，登录后显示选择页面，可选择：个人空间、组织 X、组织 Y
- 用户 B 不属于任何组织，登录后直接进入应用主界面（个人空间）

## 技术方案

### Better Auth 组织 API

利用 better-auth 的 organization 插件提供的以下 API：

```typescript
// 客户端 Hooks
authClient.useListOrganizations()     // 获取用户所属的组织列表
authClient.useActiveOrganization()    // 获取当前活跃的组织

// 客户端方法
authClient.organization.setActive({
  organizationId: 'org-id'            // 设置活跃组织
})
authClient.organization.setActive({
  organizationId: null                // 清除活跃组织（切换到个人空间）
})
```

### 路由结构

```
/auth/login          -> 登录页面
/workspace           -> 工作空间布局 (需要认证)
  /workspace/select  -> 工作空间选择页面
/_app                -> 应用主界面 (需要认证 + 工作空间已选择)
  /crm               -> CRM 模块
  /admin             -> 管理模块
  ...
```

### 路径配置

在 `libs/studio/src/config/paths.ts` 中添加：

```typescript
const WORKSPACE_PREFIX = '/workspace'

const pathsConfig = {
  // ... existing paths
  workspace: {
    index: WORKSPACE_PREFIX,
    select: `${WORKSPACE_PREFIX}/select`
  }
}
```

### 认证流程

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              用户登录                                        │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       检查用户所属组织列表                                    │
│                  authClient.organization.list()                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    │                               │
                    ▼                               ▼
        ┌───────────────────┐           ┌───────────────────┐
        │   有组织成员身份   │           │  无组织成员身份    │
        │ organizations > 0 │           │ organizations = 0 │
        └───────────────────┘           └───────────────────┘
                    │                               │
                    ▼                               │
        ┌───────────────────┐                       │
        │  /workspace/select │                      │
        │   工作空间选择页面  │                      │
        └───────────────────┘                       │
                    │                               │
                    ▼                               │
        ┌───────────────────┐                       │
        │  用户选择工作空间  │                      │
        │  - 个人空间        │                      │
        │  - 组织 A          │                      │
        │  - 组织 B          │                      │
        └───────────────────┘                       │
                    │                               │
                    ▼                               │
        ┌───────────────────┐                       │
        │ setActiveOrganization                     │
        │ (null = 个人空间)  │                      │
        └───────────────────┘                       │
                    │                               │
                    └───────────────┬───────────────┘
                                    │
                                    ▼
        ┌─────────────────────────────────────────────────────────────────────┐
        │                           /_app                                      │
        │                        应用主界面                                     │
        └─────────────────────────────────────────────────────────────────────┘
```

### 组件设计

#### 1. WorkspaceSelector 组件

工作空间选择页面的核心组件，用于展示可选的工作空间列表。

**文件位置**：`libs/studio/src/modules/workspace/workspace-selector.tsx`

**功能**：
- 显示个人空间选项
- 显示用户所属的所有组织
- 支持点击选择并跳转到应用主界面

#### 2. WorkspaceSwitcher 组件

用于在应用内切换工作空间的下拉子菜单组件。

**文件位置**：`libs/studio/src/modules/workspace/workspace-switcher.tsx`

**功能**：
- 显示"切换空间"菜单项
- 展开二级菜单显示所有可选工作空间
- 标注当前所在的工作空间（使用 check icon）
- 支持快速切换

#### 3. ProfileDropdown 增强

在现有的 ProfileDropdown 组件中集成 WorkspaceSwitcher。

**修改文件**：`libs/studio/src/components/layout/app-shell/app-header.tsx`

### 数据流

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              State Management                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Better Auth Hooks:                                                          │
│  ├── authClient.useListOrganizations()                                      │
│  │   ├── data: Organization[] | undefined                                   │
│  │   └── isPending: boolean                                                 │
│  └── authClient.useActiveOrganization()                                     │
│      ├── data: ActiveOrganization | null                                    │
│      └── isPending: boolean                                                 │
│                                                                              │
│  Zustand Store (useWorkspaceStore):                                          │
│  ├── hasSelected: boolean          // 用户是否已选择过工作空间               │
│  ├── markSelected: () => void      // 标记已选择                            │
│  └── reset: () => void             // 重置状态（退出登录时调用）             │
│                                                                              │
│  当前空间判断逻辑：                                                           │
│  - activeOrganization === null → 个人空间                                    │
│  - activeOrganization !== null → 组织空间                                    │
│                                                                              │
│  持久化：                                                                     │
│  - 使用 zustand/middleware persist 自动持久化到 localStorage                 │
│  - key: 'workspace-storage'                                                  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### UI 设计

#### 工作空间选择页面

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  [Logo]                                                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│                          选择工作空间                                         │
│                    请选择要进入的工作空间                                      │
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  👤  个人空间                                                          │  │
│  │      您的个人工作空间                                                   │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  🏢  组织 A                                                            │  │
│  │      组织工作空间                                                       │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  🏢  组织 B                                                            │  │
│  │      组织工作空间                                                       │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### ProfileDropdown 切换空间菜单

```
┌──────────────────────────────────────┐
│  [Avatar]  用户名                    │
│            user@email.com            │
├──────────────────────────────────────┤
│  👤  个人资料                         │
│  ⚙️  设置                             │
│  💳  账单                             │
├──────────────────────────────────────┤
│  👥  组织成员                         │
│  ✏️  自定义                           │
├──────────────────────────────────────┤
│  🔄  切换空间                    ▶   │ ← 新增
│      ┌────────────────────────────┐  │
│      │ ✓ 个人空间                 │  │ ← 当前空间标识
│      │   组织 A                   │  │
│      │   组织 B                   │  │
│      └────────────────────────────┘  │
├──────────────────────────────────────┤
│  🚪  退出登录                         │
└──────────────────────────────────────┘
```

### 文件变更清单

#### 新增文件

1. `apps/web/src/routes/workspace.tsx` - 工作空间布局路由 ✅ 已存在
2. `apps/web/src/routes/workspace/select.tsx` - 工作空间选择页面路由
3. `libs/studio/src/modules/workspace/index.ts` - 模块导出
4. `libs/studio/src/modules/workspace/store.ts` - Zustand 状态管理
5. `libs/studio/src/modules/workspace/workspace-selector.tsx` - 选择器组件
6. `libs/studio/src/modules/workspace/workspace-switcher.tsx` - 切换器组件
7. `libs/i18n/src/translations/zh/workspace.json` - 中文翻译

#### 修改文件

1. `libs/studio/src/config/paths.ts` - 添加 workspace 路径
2. `libs/studio/src/components/layout/app-shell/app-header.tsx` - 集成切换器
3. `libs/studio/src/index.ts` - 导出 workspace 模块
4. `libs/i18n/src/translations/en/index.ts` - 添加 workspace 翻译导入
5. `libs/i18n/src/translations/zh/index.ts` - 添加 workspace 翻译导入
6. `apps/web/src/routes/_app.tsx` - 添加工作空间检查逻辑
7. `apps/web/src/routes/workspace.tsx` - 完善布局

### 实施步骤

1. **配置更新**
   - 更新 `paths.ts` 添加 workspace 路由路径
   - 更新 i18n 索引文件

2. **创建翻译文件**
   - 创建中文 workspace 翻译文件
   - 更新英文 workspace 翻译文件

3. **创建 Workspace 模块**
   - 创建 `workspace-selector.tsx` 组件
   - 创建 `workspace-switcher.tsx` 组件
   - 创建模块索引文件

4. **创建路由页面**
   - 完善 `apps/web/src/routes/workspace.tsx`
   - 创建 `apps/web/src/routes/workspace/select.tsx`

5. **修改认证流程**
   - 更新 `_app.tsx` 添加组织检查和重定向逻辑

6. **集成切换器**
   - 修改 `ProfileDropdown` 组件添加切换空间功能

### 测试计划

1. **无组织用户测试**
   - 登录后应直接进入应用主界面
   - 下拉菜单不应显示"切换空间"选项（或仅显示个人空间）

2. **有组织用户测试**
   - 登录后应跳转到工作空间选择页面
   - 选择组织后应正确设置 activeOrganization
   - 下拉菜单应显示所有可选工作空间
   - 当前空间应有明确标识

3. **切换功能测试**
   - 切换组织后 activeOrganization 应正确更新
   - 页面内容应根据当前组织正确显示

## 参考资料

- [Better Auth Organization Plugin](https://www.better-auth.com/docs/plugins/organization)
- [TanStack Router Documentation](https://tanstack.com/router/latest/docs/framework/react/overview)
