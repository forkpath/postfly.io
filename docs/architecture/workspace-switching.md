# 个人与组织上下文

Ray 使用 Better Auth 的 User、Organization、Member 与 Session。界面上的“空间”表示当前以个人还是组织身份操作，不对应额外的 Workspace 数据库模型。

- 个人上下文：会话中的 `activeOrganizationId` 为空，业务归属使用 `userId`。
- 组织上下文：通过 Better Auth 选择组织，会话记录 `activeOrganizationId`，服务端验证成员资格与所需权限。

界面入口在 [AccountSwitcher](../../libs/studio/src/modules/organization/account-switcher.tsx)，它调用 `authClient.organization.setActive({ organizationId })`；传 `null` 切回个人。组织 API 选项在 [organization/lib/api.ts](../../libs/studio/src/modules/organization/lib/api.ts)。

服务端必须从经过验证的会话解析主体。请求参数或浏览器缓存只能表达选择意图，不能直接授予资源访问权。新增组织业务需要在 Use Case 中检查成员资格、角色与目标资源归属。

Customer 使用 `userId` 或 `organizationId` 表示所有者，数据库约束要求二者恰好一个有值。是否启用组织计费由 `ORGANIZATION_BILLING_ENABLED` 控制；这是功能选项，不是数据库升级开关。

共享页面和查询在组织切换后应刷新依赖该身份的数据，避免继续展示上一个组织的结果。新增业务的缓存键与授权测试要覆盖个人/组织切换和越权拒绝。
