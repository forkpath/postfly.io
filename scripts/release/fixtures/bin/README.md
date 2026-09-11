# docker / curl 测试替身

语义 type:platform/runtime:node/domain:platform；不是独立 Nx 项目。给 test-deploy-controller.sh 使用。

docker 模拟容器/Compose/切流等操作并记录调用，curl 模拟健康/请求结果。具体测试控制变量由父脚本设置；不要手工赋予真实凭据或直接作为部署命令使用。通过 bash scripts/release/test-deploy-controller.sh 运行，新增失败场景同时扩展替身和断言。此目录的 PATH 只应在测试子进程有效，没有 app 单测/E2E target。
