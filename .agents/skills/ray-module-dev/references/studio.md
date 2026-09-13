# Studio / Web / Desktop

## 定位与参考

共享页面放 libs/studio/src/modules/<feature>；组件、layout、lib、store 按需要拆，不要求空目录。
路由：Web 的 apps/web/src/routes；Desktop 的 apps/desktop/src/renderer/routes。两端独立生成 route tree，不手改生成文件。
查看当前 libs/studio/src/modules/admin/users/data-table/users-data-table.tsx、columns.tsx 和 libs/api-client/src/domains/admin/users.ts 了解组件签名。
这些是接线参考，不是复制权限、缓存 key 或假定所有接口 admin-only 的理由。

## 完整流程

- API client 从 @libs/payload 取得请求/响应类型，遵循 REST 技能；只通过 public API 导出。
- useDataTable 配合 ColumnDef 和 DataTableColumnHeader；使用当前支持的 meta.variant（text/multiSelect/dateRange）和服务端排序白名单。
- 路由 validateSearch 复用共享搜索 schema；分页字段名必须与后端一致，不无理由在 page/perPage/limit 之间转换。
- 表格使用响应的 list/total；React Query 得到已解包 payload，勿再读 data.data。
- Detail 通过 route params 和 query factory 加载；列表/详情/子资源都带 owner identity 和查询参数。
- app routes 保持薄壳，shared components 不绑定某端独有 router context 或 Node 能力。
- 从 feature barrel 逐级导出到 libs/studio/src/index.ts；内部避免从自身 public barrel 循环引用。
- 导航修改现有模块的 nav-config；先确认文件位置和命名，不硬编码不存在的 nav-config.tsx。
- beforeLoad/loader 的 session guard 只改善 UX，不能替代后端授权。Web 与 Desktop 都测试直接访问 URL。
- 中文/英文等使用 i18n 现有 namespace，不新增第二套翻译机制。

## 错误与交互

沿用 api-core 的 ApiError/ApiNetworkError 和全局 QueryClient 错误处理；避免组件与全局 toast 重复提示。
仅在已有机制允许时用 query.meta.suppressError 抑制特定 query 提示，并提供可见局部错误。
覆盖 loading、empty、retry、partial failure、mutation pending、权限禁用和确认危险动作；不要用默认数据把服务异常伪装为成功。
Mutation 后按 owner 精确 invalidation；登出/组织切换取消旧查询并避免旧响应回填。
导航、表单、表格具备键盘访问、标签/错误关联和响应式布局；复用现有 UI tokens，不引入未经批准的另一套设计系统。

## 验证

Nx 查出实际存在的 targets，再跑相关 lint/typecheck/test；缺 test target 时新增适当测试，不把 glob 当覆盖率。
组件交互测试之外，需要 Playwright 验证真实 Web/Desktop 页面接线、URL search、组织切换、错误展示与 API 行为。
Mobile/Extension 的专属交付需要各自导航/权限与真实运行环境验收，不能用 Web 通过替代。
