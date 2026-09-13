# 隔离 Ray 功能任务

你在已确认迁移 SHA 的独立副本中工作；使用当前安装的适用 Ray skills，不修改技能本身。
实现一个仅供评测的收藏条目/组织实时通知模块，不新增真实产品业务事件。
只在 tools/skill-evaluation 中开发，允许为它添加 Nx targets；不要修改原 services、libs、根依赖、lockfile、AGENTS 或现有配置。
不得安装包、提交、推送、部署、读取仓库外的业务配置，或修改依赖内容。已有独立依赖副本可用，允许正常工具写入编译缓存。
没有所需模型/目录时可以在限定目录内合理组织，使用现有框架与分层规则，不用空文件充数。

本轮协议由调用方指定为 REST、WS 或 MIXED。请阅读随任务附带的 contract.md。
支持代码 support.mjs 提供真实 Better Auth 测试实例及隔离表初始化，不是业务实现；只能在测试中使用。
环境 RAY_EVALUATION_DATABASE_URL / RAY_EVALUATION_REDIS_URL 指向本次隔离容器，不要寻找其他数据库。
自行编写并实际执行相关 Nx typecheck/test，缺环境时报 blocked，不能 skip 或用口头声明替代。
最终列出实际执行命令和结果。不要读取、猜测或修改外部验收用例。
