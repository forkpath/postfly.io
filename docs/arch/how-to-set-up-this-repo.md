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
npx lefthook install
```

- 安装lint和format工具依赖

```shell
pnpm add -D @ianvs/prettier-plugin-sort-imports prettier-plugin-tailwindcss
```

- 创建service等核心依赖core和共享模块shared

```shell
nx g @nx/nest:lib libs/srv-core --linter=eslint --tags=scope:backend,type:lib --skipTsConfig
nx g @nx/nest:lib libs/srv-shared --linter=eslint --tags=scope:backend,type:lib --skipTsConfig
```

- 创建pg-dao，用prisma作为orm

```shell
nx g @nx/js:lib libs/pg-dao --minimal --bundler=none --tags=scope:backend,type:lib --skipTsConfig
pnpm add @prisma/client @prisma/adapter-pg pg
pnpm add -D prisma @types/pg
```

- 创建mongo-dao，用mongoose作为orm

```shell
nx g @nx/js:lib libs/mongo-dao --minimal --bundler=none --tags=scope:backend,type:lib --skipTsConfig
pnpm add @nestjs/mongoose @nestjs/config mongoose
```

- 创建apps共用的ui组件库以及spa应用核心组件库studio

```shell
nx g @nx/react:library libs/shared-ui --unitTestRunner=vitest --linter=eslint --tags=scope:frontend,type:lib --skipTsConfig
nx g @nx/react:library libs/studio --unitTestRunner=vitest --linter=eslint --tags=scope:frontend,type:lib --skipTsConfig

# 因为该lib不会打包输出，所以不需要babel，所以删除该目录下的.babelrc
rm libs/shared-ui/.babelrc
rm libs/studio/.babelrc

# 移除对应依赖
pnpm remove @babel/core @babel/preset-react
```
