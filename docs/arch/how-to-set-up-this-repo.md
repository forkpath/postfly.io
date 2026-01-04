## 如何初始化RAY

- 利用nx构建一个基础的repo

```bash
npx create-nx-workspace --name ray --appName engine --workspaceType integrated --aiAgents claude copilot cursor codex --pm pnpm --style tailwind --formatter prettier --e2eTestRunner playwright --unitTestRunner vitest --preset nest  --useGithub --skipGitHubPush --defaultBase dev --ci github --commit.email forkpath@gmail.com --commit.name forkpath --docker
```

- 在apps目录下创建一个基础react应用

```bash
nx add @nx/react
nx g @nx/react:app apps/web --bundler=vite --style=css --globalCss --linter eslint --port 3000 --unitTestRunner vitest --e2eTestRunner playwright--tags=scope:frontend,type:app
```

计划将scope和type进行固定分类，方便后续根据tag来运行对应工作流

| Tag   | 分类                          |
| ----- | ----------------------------- |
| Scope | `frontend` `backend` `client` |
| Type  | `app` `lib`                   |

- 将engine移动到services中

```bash
mkdir -p services
nx g @nx/workspace:move --project engine  services/engine

# 更新scope和type
sed -i '' 's/"tags":[[:space:]]*\[\]/"tags": ["scope:backend", "type:app"]/g' services/engine/project.json
```

- 安装commit信息规范化工具及git钩子工具

```shell
pnpm add -D @commitlint/{config-conventional,cli} cz-customizable
pnpm add -D lefthook
```
