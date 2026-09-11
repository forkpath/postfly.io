import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

const workspaceRoot = resolve(import.meta.dirname, '../..')
const outputPath = resolve(workspaceRoot, 'docs/architecture/ray-nx-migration-review.html')

function run(command, args) {
  return execFileSync(command, args, {
    cwd: workspaceRoot,
    encoding: 'utf8',
    env: { ...process.env, NX_DAEMON: 'false' },
    maxBuffer: 32 * 1024 * 1024
  }).trim()
}

function readJson(path) {
  return JSON.parse(readFileSync(resolve(workspaceRoot, path), 'utf8'))
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function tagValue(tags, dimension) {
  return tags.find(tag => tag.startsWith(`${dimension}:`))?.split(':')[1] ?? 'untagged'
}

function findCycles(names, dependencies) {
  const state = new Map()
  const stack = []
  const cycles = []

  function visit(name) {
    state.set(name, 'visiting')
    stack.push(name)

    for (const dependency of dependencies[name] ?? []) {
      if (!state.has(dependency.target)) visit(dependency.target)
      else if (state.get(dependency.target) === 'visiting') {
        const start = stack.indexOf(dependency.target)
        cycles.push([...stack.slice(start), dependency.target])
      }
    }

    stack.pop()
    state.set(name, 'visited')
  }

  for (const name of names) if (!state.has(name)) visit(name)
  return cycles
}

const graphOutput = run('pnpm', ['exec', 'nx', 'graph', '--print'])
const graph = JSON.parse(graphOutput.slice(graphOutput.indexOf('{'))).graph
const branch = run('git', ['branch', '--show-current'])
const sha = run('git', ['rev-parse', '--short', 'HEAD'])
const dirtyEntries = run('git', ['status', '--porcelain=v1']).split('\n').filter(Boolean)
const generatedAt = new Intl.DateTimeFormat('zh-CN', {
  dateStyle: 'long',
  timeStyle: 'medium',
  timeZone: 'Asia/Shanghai'
}).format(new Date())

const dependencies = graph.dependencies
const nodes = Object.entries(graph.nodes)
  .map(([name, node]) => {
    const tags = node.data.tags ?? []
    const targets = Object.keys(node.data.targets ?? {}).filter(target => !target.startsWith('test-ci--'))
    const directDependencies = (dependencies[name] ?? []).map(dependency => dependency.target).sort()
    const directDependents = Object.entries(dependencies)
      .filter(([, entries]) => entries.some(entry => entry.target === name))
      .map(([source]) => source)
      .sort()

    return {
      name,
      root: node.data.root,
      type: tagValue(tags, 'type'),
      runtime: tagValue(tags, 'runtime'),
      domain: tagValue(tags, 'domain'),
      tags,
      targets: [...new Set(targets)].sort(),
      dependencies: directDependencies,
      dependents: directDependents
    }
  })
  .sort((left, right) => left.name.localeCompare(right.name))

const edges = Object.entries(dependencies).flatMap(([source, entries]) =>
  entries.map(entry => ({ source, target: entry.target, type: entry.type }))
)
const cycles = findCycles(
  nodes.map(node => node.name),
  dependencies
)
const legacyProjects = ['auth', 'billing', 'srv-core', 'srv-shared', 'ui-shared', 'server-platform']
const resolvedLegacyProjects = nodes.filter(node => legacyProjects.includes(node.name))
const tsconfigPaths = readJson('tsconfig.base.json').compilerOptions.paths
const canonicalServerAliases = Object.keys(tsconfigPaths).filter(alias => /^@libs\/(?:auth-server|server-)/.test(alias))
const canonicalUiAliases = Object.keys(tsconfigPaths).filter(alias => /^@libs\/ui-/.test(alias))
const taggedProjects = nodes.filter(node => node.tags.length > 0).length
const projectsWithTest = nodes.filter(node => node.targets.includes('test')).length
const projectsWithBuild = nodes.filter(node => node.targets.includes('build')).length
const appRows = [
  ['web', '否', '历史复验：3 通过、15 条受凭据门控而跳过；2026-09-08 未重跑 E2E', '需继续补页面级组件/路由单测'],
  ['desktop', '否', '无独立 E2E target', '需新增 Electron smoke 与关键 IPC 场景'],
  ['mobile', '否', '无独立 E2E target', '需新增 Maestro/Detox 或 Expo 集成方案'],
  ['extension', '否', '无独立 E2E target', '需新增浏览器扩展加载与消息链路测试'],
  ['engine', '是：45', '由 Web E2E/API 流程间接覆盖部分 HTTP 路径', '核心应用层与控制器已有真实单测'],
  ['pulse', '是：4', '尚无真实多实例 WebSocket E2E', '认证/越权/跨组织与 Redis adapter 仍需环境测试'],
  ['worker', '是：7', '尚无真实 RabbitMQ/PostgreSQL E2E', '重复消息、重试、DLQ 已有单测']
]

const projectRows = nodes
  .map(
    node => `<tr data-project-row data-search="${escapeHtml(
      [node.name, node.root, ...node.tags, ...node.dependencies].join(' ').toLowerCase()
    )}">
      <td><button class="project-link" data-project="${escapeHtml(node.name)}">${escapeHtml(node.name)}</button><small>${escapeHtml(node.root)}</small></td>
      <td><span class="tag type">${escapeHtml(node.type)}</span></td>
      <td><span class="tag runtime">${escapeHtml(node.runtime)}</span></td>
      <td><span class="tag domain">${escapeHtml(node.domain)}</span></td>
      <td>${node.dependencies.length}</td>
      <td>${node.dependents.length}</td>
      <td>${escapeHtml(node.targets.join(', ') || '—')}</td>
    </tr>`
  )
  .join('\n')

const appCoverageRows = appRows
  .map(
    row =>
      `<tr>${row.map((value, index) => `<td${index === 0 ? ' class="mono"' : ''}>${escapeHtml(value)}</td>`).join('')}</tr>`
  )
  .join('\n')

const graphData = JSON.stringify({ nodes, edges }).replaceAll('<', '\\u003c')

const html = String.raw`<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="description" content="Ray Nx 迁移复核：Tag 体系、旧库拆分、别名、项目图、测试覆盖与工程门禁。" />
    <title>Ray Nx 迁移复核 · ${escapeHtml(generatedAt)}</title>
    <style>
      :root{color-scheme:dark;--bg:#071018;--panel:#0d1822;--panel2:#101f2c;--ink:#edf6f5;--muted:#97aaa9;--line:#213744;--mint:#65e6bb;--cyan:#69c7e7;--amber:#ffc46b;--rose:#ff8b8b;--violet:#b5a5ff;--shadow:0 24px 70px rgba(0,0,0,.28)}
      *{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:radial-gradient(circle at 10% 0%,rgba(105,199,231,.12),transparent 30rem),radial-gradient(circle at 92% 8%,rgba(101,230,187,.10),transparent 34rem),var(--bg);color:var(--ink);font-family:Inter,ui-sans-serif,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;line-height:1.65}
      a{color:var(--cyan)}code,.mono{font-family:"SFMono-Regular",Consolas,monospace}code{color:#d7f7ee;background:#142631;border:1px solid #25404e;border-radius:.35rem;padding:.08rem .34rem}button,input,select{font:inherit}.wrap{width:min(1460px,calc(100% - 32px));margin:auto}
      header{padding:72px 0 42px;border-bottom:1px solid var(--line)}.eyebrow{margin:0 0 12px;color:var(--mint);font-weight:800;letter-spacing:.15em;text-transform:uppercase;font-size:.78rem}.hero{display:grid;grid-template-columns:minmax(0,1.5fr) minmax(300px,.7fr);gap:42px;align-items:end}h1{font-size:clamp(2.45rem,5vw,5.4rem);line-height:.98;letter-spacing:-.055em;margin:0;max-width:900px}.lead{font-size:1.16rem;color:#c9d7d5;max-width:820px}.stamp{padding:22px;border:1px solid var(--line);background:rgba(13,24,34,.74);border-radius:18px;box-shadow:var(--shadow)}.stamp strong{display:block;color:var(--mint);font-size:1.1rem}.stamp span{display:block;color:var(--muted);margin-top:7px}
      nav{position:sticky;top:0;z-index:30;background:rgba(7,16,24,.88);backdrop-filter:blur(14px);border-bottom:1px solid var(--line)}nav .wrap{display:flex;overflow:auto;gap:5px;padding:10px 0}nav a{color:#b9c9c7;text-decoration:none;white-space:nowrap;padding:7px 11px;border-radius:8px;font-size:.88rem}nav a:hover{background:#152633;color:#fff}
      main{padding:20px 0 80px}section{scroll-margin-top:72px;margin:26px 0;padding:34px;border:1px solid var(--line);background:linear-gradient(145deg,rgba(15,30,41,.94),rgba(9,20,29,.94));border-radius:22px;box-shadow:var(--shadow)}.section-head{display:flex;gap:20px;align-items:flex-start;margin-bottom:22px}.section-no{font:800 2.1rem/1 "SFMono-Regular",monospace;color:#365566}.kicker{margin:0;color:var(--mint);font-size:.75rem;text-transform:uppercase;letter-spacing:.13em;font-weight:800}h2{margin:2px 0 0;font-size:clamp(1.7rem,3vw,2.7rem);letter-spacing:-.04em}h3{font-size:1.04rem;margin:0 0 8px}p{margin:8px 0;color:#c3d0cf}.muted,small{color:var(--muted)}small{display:block}.grid{display:grid;gap:14px}.metrics{grid-template-columns:repeat(5,1fr)}.metric,.card,.verdict,.tool-card{border:1px solid var(--line);background:rgba(8,19,28,.78);border-radius:15px;padding:18px}.metric strong{display:block;font-size:2rem;line-height:1;color:var(--mint);margin-bottom:8px}.metric span{color:var(--muted);font-size:.87rem}.cards-3{grid-template-columns:repeat(3,1fr)}.cards-2{grid-template-columns:repeat(2,1fr)}.good{color:var(--mint)}.warn{color:var(--amber)}.bad{color:var(--rose)}
      .verdict{border-left:4px solid var(--mint);margin:18px 0}.verdict.warn-box{border-left-color:var(--amber)}.verdict strong{color:#fff}.flow{display:flex;flex-wrap:wrap;gap:7px;align-items:center}.flow span{border:1px solid #31505e;background:#122632;border-radius:999px;padding:5px 10px;font-size:.84rem}.flow i{color:#587684;font-style:normal}.migration-map{display:grid;gap:9px}.map-row{display:grid;grid-template-columns:180px 28px minmax(0,1fr);gap:10px;align-items:start;padding:14px 0;border-bottom:1px dashed #25404c}.map-row:last-child{border-bottom:0}.map-row .old{color:var(--rose);font-family:"SFMono-Regular",monospace}.map-row .arrow{color:var(--mint)}
      .table-wrap{overflow:auto;border:1px solid var(--line);border-radius:14px}table{border-collapse:collapse;width:100%;min-width:760px;background:rgba(6,15,22,.58)}th,td{text-align:left;padding:11px 13px;border-bottom:1px solid #1c313c;vertical-align:top}th{position:sticky;top:0;background:#132430;color:#9db2b1;font-size:.74rem;text-transform:uppercase;letter-spacing:.08em}td{font-size:.88rem;color:#c9d5d4}.tag{display:inline-block;border-radius:999px;padding:2px 8px;border:1px solid;font-size:.73rem}.tag.type{border-color:#5f8fc2;color:#8ac6ff}.tag.runtime{border-color:#5b967c;color:#7be3b4}.tag.domain{border-color:#9a8156;color:#ffd080}.project-link{padding:0;border:0;background:none;color:#fff;font-weight:800;cursor:pointer;text-align:left}.project-link:hover{color:var(--mint)}
      .controls{display:flex;flex-wrap:wrap;gap:9px;margin:14px 0}.controls input,.controls select{background:#091823;color:#e9f3f2;border:1px solid #2b4654;border-radius:9px;padding:9px 11px}.controls input{min-width:250px;flex:1}.controls label{display:flex;align-items:center;gap:7px;color:#b8c8c7;font-size:.86rem}.graph-shell{display:grid;grid-template-columns:minmax(0,1fr) 310px;border:1px solid var(--line);border-radius:16px;overflow:hidden;background:#07131b}.graph-stage{overflow:auto;min-height:650px}.graph-stage svg{display:block;min-width:1050px;width:100%;height:auto}.graph-detail{padding:20px;border-left:1px solid var(--line);background:#0b1923}.graph-detail ul{padding-left:18px;margin:8px 0}.graph-detail .empty{color:var(--muted)}.edge{stroke:#35515e;stroke-width:1;opacity:.36;transition:.2s}.edge.active{stroke:var(--mint);stroke-width:2;opacity:.95}.edge.hidden{opacity:0}.graph-node rect{fill:#102530;stroke:#355665;stroke-width:1.2;rx:9;transition:.2s}.graph-node text{fill:#dfecea;font:600 11px ui-sans-serif,sans-serif;pointer-events:none}.graph-node .node-meta{fill:#88a19f;font-size:8px;font-weight:500}.graph-node{cursor:pointer;transition:opacity .2s}.graph-node:hover rect,.graph-node.selected rect{stroke:var(--mint);stroke-width:2;fill:#12352f}.graph-node.related rect{stroke:var(--cyan)}.graph-node.dim{opacity:.12}.domain-label{fill:#6f8c98;font:800 12px ui-sans-serif,sans-serif;letter-spacing:.13em;text-transform:uppercase}.axis-line{stroke:#1b3541;stroke-dasharray:4 7}
      .callouts{counter-reset:item}.callout{display:grid;grid-template-columns:36px 1fr;gap:12px;padding:13px 0;border-bottom:1px dashed #25404c}.callout:before{counter-increment:item;content:counter(item);display:grid;place-items:center;width:28px;height:28px;border-radius:50%;background:#18382f;color:var(--mint);font-weight:900}.callout:last-child{border:0}.commands{white-space:pre-wrap;overflow:auto;background:#061018;border:1px solid #203744;padding:16px;border-radius:12px;color:#cbe5df;font:12px/1.65 "SFMono-Regular",monospace}.status{display:inline-flex;align-items:center;gap:6px;font-weight:800}.status:before{content:"";width:8px;height:8px;border-radius:50%;background:currentColor}.search-count{color:var(--muted);font-size:.85rem}.project-table-search{margin-bottom:10px;width:min(100%,420px);background:#091823;color:white;border:1px solid #2b4654;border-radius:9px;padding:9px 11px}
      footer{padding:25px 0 50px;color:#708684;text-align:center}.noscript{padding:12px;background:#3b2d12;color:#ffe1a8;border-radius:9px}@media(max-width:1000px){.hero,.graph-shell{grid-template-columns:1fr}.graph-detail{border-left:0;border-top:1px solid var(--line)}.metrics{grid-template-columns:repeat(2,1fr)}.cards-3{grid-template-columns:1fr}.cards-2{grid-template-columns:1fr}}@media(max-width:640px){.wrap{width:min(100% - 18px,1460px)}header{padding:46px 0 28px}section{padding:22px 16px;border-radius:16px}.metrics{grid-template-columns:1fr 1fr}.section-no{font-size:1.35rem}.map-row{grid-template-columns:1fr}.map-row .arrow{transform:rotate(90deg);width:max-content}}
    </style>
  </head>
  <body>
    <header>
      <div class="wrap hero">
        <div>
          <p class="eyebrow">Current workspace evidence · Nx 23.0.1</p>
          <h1>Ray Nx 迁移<br />结构复核报告</h1>
          <p class="lead">针对 <code>srv-core</code>、<code>srv-shared</code>、<code>ui-shared</code> 的本轮实质拆分结果，以及 Tag、别名、项目图、单测与 E2E 的真实性复核。</p>
        </div>
        <aside class="stamp">
          <strong>${escapeHtml(branch)} @ ${escapeHtml(sha)}</strong>
          <span>生成时间：${escapeHtml(generatedAt)}</span>
          <span>工作区：${dirtyEntries.length} 个状态条目，尚未提交/部署</span>
          <span>证据口径：当前本地工作树，不是 dev/main 远端快照</span>
        </aside>
      </div>
    </header>
    <nav aria-label="报告章节"><div class="wrap"><a href="#summary">结论</a><a href="#tags">Tag / Scope</a><a href="#split">拆分去向</a><a href="#aliases">别名</a><a href="#tools">Tools / Scripts</a><a href="#graph-section">Nx Graph</a><a href="#tests">测试</a><a href="#cleanup">清理</a><a href="#gates">门禁</a><a href="#runtime-refinement">运行时细化</a></div></nav>
    <main class="wrap">
      <section id="summary">
        <div class="section-head"><div class="section-no">01</div><div><p class="kicker">Executive outcome</p><h2>本轮结论</h2></div></div>
        <div class="grid metrics">
          <article class="metric"><strong>${nodes.length}</strong><span>Nx resolved projects，含根治理项目</span></article>
          <article class="metric"><strong>${edges.length}</strong><span>静态依赖边</span></article>
          <article class="metric"><strong>${cycles.length}</strong><span>依赖循环</span></article>
          <article class="metric"><strong>${resolvedLegacyProjects.length}</strong><span>旧项目仍在图中</span></article>
          <article class="metric"><strong>${taggedProjects}</strong><span>带正交 Tag 的项目</span></article>
        </div>
        <div class="verdict"><strong>六个旧项目已退出 Nx Graph。</strong><p><code>auth</code>、<code>billing</code>、<code>srv-core</code>、<code>srv-shared</code>、<code>ui-shared</code> 与过渡 <code>server-platform</code> 已退役。Auth/Billing 的业务导入、测试与 schema-check 入口迁入新所有者，旧长篇指南归档保留。<a href="../development/legacy-cleanup.md">查看完整清理依据与验证台账</a>。</p></div>
        <div class="verdict warn-box"><strong>Ray 是可复用框架，未被业务启用的能力仍应保留。</strong><p>2026-09-08 恢复 Elasticsearch、SMS、Email Nest 与 Storage adapter。本页图数据每次生成时刷新；测试文字是有日期的验证记录，生成 HTML 不会重新运行测试。Web smoke 成绩来自上一轮；当前未执行系统部署。</p><p><a href="ray-framework-nx-guide.md">阅读完整开发者指南：Nx/Cloud、CI/CD、Tools/Scripts 的调用时机和测试说明</a></p></div>
      </section>

      <section id="tags">
        <div class="section-head"><div class="section-no">02</div><div><p class="kicker">Nx vocabulary</p><h2>Type / Runtime / Domain 是 Tag，不是 Nx 新概念</h2></div></div>
        <div class="grid cards-3">
          <article class="card"><h3>哪些是 Nx 内建</h3><p>Nx 项目配置原生支持任意字符串组成的 <code>tags</code> 数组，并由 <code>@nx/enforce-module-boundaries</code> 使用。Nx 不规定必须叫 <code>scope</code>。</p></article>
          <article class="card"><h3>哪些是本仓库自定义</h3><p><code>type:*</code>、<code>runtime:*</code>、<code>domain:*</code> 的命名和值域由本仓库定义；它们是给同一个项目打的三组正交标签。</p></article>
          <article class="card"><h3>原来的 scope 去哪了</h3><p><code>scope:*</code> 仍是官方常用约定，不是被弃用的旧机制。这里用 domain 表达归属，同时增加职责和运行时两个维度；继续使用 scope + type + runtime 也同样有效，名称不是性能优化。</p></article>
        </div>
        <div class="table-wrap" style="margin-top:16px"><table><thead><tr><th>维度</th><th>回答的问题</th><th>当前值</th><th>关键约束</th></tr></thead><tbody>
          <tr><td><code>type</code></td><td>这个项目承担什么职责？</td><td>app / feature / data-access / contract / ui / util / platform</td><td>contract 只能向 contract/util 收敛；app 作为组合根。</td></tr>
          <tr><td><code>runtime</code></td><td>代码在哪种运行时安全？</td><td>node / web / native / universal</td><td>universal 不能依赖专属运行时；web/native/node 只可依赖自身与 universal。</td></tr>
          <tr><td><code>domain</code></td><td>谁拥有这段能力？</td><td>auth / billing / organization / shared / platform / composition</td><td>shared/platform 不反向依赖业务域；composition 可组装多个域。</td></tr>
        </tbody></table></div>
        <p>标签由 ESLint 边界规则执行，不会自动提高缓存命中率。affected 看真实依赖和变更，缓存看任务输入与输出。当前规则仍有宽松处，例如 Billing 可以依赖 Auth 域，并未严格限制为只依赖 Auth contract；universal 标签也不能把 Node SDK 自动变成浏览器代码。</p>
        <h3 style="margin-top:24px">一次 PR 中，GitHub Actions、Nx、Nx Cloud 各做什么？</h3>
        <div class="flow" aria-label="PR 验证执行顺序"><span>GitHub 收到 PR</span><i>→</i><span>runner 准备环境</span><i>→</i><span>Nx 选择 affected 任务</span><i>→</i><span>查询缓存</span><i>→</i><span>恢复结果或实际执行</span><i>→</i><span>GitHub 展示结果</span></div>
        <div class="grid cards-3" style="margin-top:16px">
          <article class="card"><h3>GitHub Actions：流程执行平台</h3><p>响应 PR/push/tag，启动 runner、安装依赖、注入 Secrets，调用测试与部署命令。它负责“什么时候、在哪台机器上启动流程”。</p></article>
          <article class="card"><h3>Nx：仓库任务调度器</h3><p>读取项目和任务图，决定哪些任务需要运行、依赖顺序和缓存键。底层 Vitest、TypeScript、Vite 才实际做测试或编译。</p></article>
          <article class="card"><h3>Nx Cloud：共享结果与 CI 协作</h3><p>让团队和 CI 复用远程任务结果并查看日志。额外接入 Agents 才会分布式执行；购买 Cloud 不会自动替代 GitHub、部署服务器或数据库。</p></article>
        </div>
        <div class="verdict warn-box"><strong>当前配置与尚未证明的效果分开看。</strong><p>仓库配置 nxCloudId，CI 引用 Cloud token；没有配置 Agents 分布式启动。本次没有读取套餐或实际远程命中记录。pnpm 下载缓存、Nx 任务缓存、Docker 镜像层缓存是三种不同缓存。</p></div>
        <div class="table-wrap"><table><thead><tr><th>触发时间</th><th>当前行为</th><th>边界</th></tr></thead><tbody>
          <tr><td>PR / dev push</td><td>SHA 解析成功时 affected lint/typecheck/test/build</td><td>基线 dev；没有 test target 的项目不会自动获得单测</td></tr>
          <tr><td>main push / v* tag / 每日定时</td><td>全量任务、服务 package、Web E2E</td><td>E2E 中受凭据门控的业务用例仍可能跳过</td></tr>
          <tr><td>SHA action 失败</td><td>全量任务与 package</td><td>此分支不会额外增加 E2E；仓库也没有明确实现 Cloud 故障禁云重跑</td></tr>
          <tr><td>手动 baseline</td><td>同 SHA 的五个独立 runner 全量禁缓存采样</td><td>不是日常每个 PR 都跑五次，也不是性能已达标的证明</td></tr>
          <tr><td>发布 v* tag</td><td>独立 deploy workflow 验证、构建镜像、按 digest 部署</td><td>不会自动等待另一个 CI workflow 的全部 jobs；本次没有部署</td></tr>
        </tbody></table></div>
        <p><a href="ray-framework-nx-guide.md">完整开发者指南</a>进一步解释输入/输出、实际调用命令、缓存命中证据和发布时机。外部副作用（迁移、签名、发送邮件等）不能当成可复用任务结果跳过。</p>
        <p class="muted">官方参考：<a href="https://nx.dev/docs/features/enforce-module-boundaries">Enforce Module Boundaries</a> · <a href="https://nx.dev/docs/guides/enforce-module-boundaries/tag-multiple-dimensions">Tag Multiple Dimensions</a></p>
      </section>

      <section id="split">
        <div class="section-head"><div class="section-no">03</div><div><p class="kicker">Ownership map</p><h2>旧库逐项去了哪里</h2></div></div>
        <div class="migration-map">
          <div class="map-row"><div class="old">srv-core</div><div class="arrow">→</div><div><strong>已删除项目。</strong> Nest 配置、常量、装饰器、异常、Filter、Guard、Interceptor 进入 <code>server-nest</code>；纯配置契约进入 <code>server-kernel</code>。</div></div>
          <div class="map-row"><div class="old">srv-shared/auth</div><div class="arrow">→</div><div>Better Auth 的 Nest Module、Guard、Middleware、Session 装饰器迁入 <code>auth-server/nest</code>，让 Auth 域拥有自己的框架桥接层。</div></div>
          <div class="map-row"><div class="old">srv-shared/i18n + logger</div><div class="arrow">→</div><div>两者都依赖 Nest 生命周期与 DI，迁入 <code>server-nest</code>。</div></div>
          <div class="map-row"><div class="old">srv-shared/redis</div><div class="arrow">→</div><div>Redis client、cache 与 throttler adapter 迁入 <code>server-redis</code>；服务按需直接依赖。</div></div>
          <div class="map-row"><div class="old">srv-shared/rabbitmq</div><div class="arrow">→</div><div>RabbitMQ module 与 publisher 迁入 <code>server-rabbitmq</code>；Worker 不再经由万能 shared 库。</div></div>
          <div class="map-row"><div class="old">srv-shared 扩展能力</div><div class="arrow">→</div><div>纠正此前删除决策：Elasticsearch → <code>server-elasticsearch</code>；SMS → <code>server-sms</code>；邮件注入桥 → <code>server-email</code>；对象操作 → <code>server-storage</code>。四项都作为可选模块保留，按需注册，有独立测试。</div></div>
          <div class="map-row"><div>Email / Storage 替代关系</div><div class="arrow">→</div><div>旧 Email wrapper 把原始正文误接到模板函数，现改为 raw sender，模板能力仍在 <code>email/server</code>。Engine 的 S3 签名 URL 用例没有覆盖通用存储的读写/复制/分页等功能；已恢复通用 adapter，不能再称为完整替代。</div></div>
          <div class="map-row"><div class="old">ui-shared</div><div class="arrow">→</div><div><code>ui-core</code> 持有 universal 资源/工具，<code>ui-web</code> 持有 Web primitives，<code>ui-native</code> 持有 React Native primitives。消费者迁移完成后旧项目已删除。</div></div>
        </div>
        <h3 style="margin-top:24px">其他库：区分真正替代与独立职责</h3>
        <div class="table-wrap"><table><thead><tr><th>项目</th><th>当前职责</th><th>结论</th><th>后续关注</th></tr></thead><tbody>
          <tr><td><code>studio</code></td><td>Web/Desktop 的 SaaS 页面级 feature 与组合组件</td><td><span class="good">保留</span></td><td>它不是 primitive UI；应继续依赖 ui-web/api-client，而不是吞并底层库。</td></tr>
          <tr><td><code>email</code></td><td>通用邮件契约</td><td><span class="good">保留并细化</span></td><td>2026-09-10 已将模板/发送移到 Node-only 的 email-server；server-email 仍是 Nest 桥接。</td></tr>
          <tr><td><code>analytics / monitoring</code></td><td>无环境求值的公共策略与注册接口</td><td><span class="good">保留并细化</span></td><td>各自增加 web/native/server 项目；客户端配置不再扩展服务端 preset。</td></tr>
          <tr><td><code>i18n</code></td><td>共享翻译资源与客户端 i18n</td><td><span class="good">保留</span></td><td>Nest i18n 已移出；翻译源仍应只有这一处。</td></tr>
          <tr><td><code>common</code></td><td>真正跨域、跨运行时的最小工具集</td><td><span class="good">保留</span></td><td>必须防止再次膨胀成“什么都放”的 shared。</td></tr>
          <tr><td><code>auth</code> / <code>billing</code></td><td>旧兼容项目，职责已由 contract/client/server 分层承接</td><td><span class="good">已移除</span></td><td>旧别名已迁移；原单测迁入 contract；schema-check 改由 auth-server 持有。全库 38 个保留项目逐项依据见清理台账。</td></tr>
          <tr><td><code>shared</code></td><td>当前解析图中不存在一个名为 shared 的项目</td><td>无需删除</td><td>“shared”现在是 domain 标签，不是万能目录。</td></tr>
        </tbody></table></div>
        <div class="grid cards-2" style="margin-top:16px">
          <article class="card"><h3>为什么是多个 server-* 库</h3><p>目标不是增加前缀，而是把可独立替换、可按需装配、故障模式不同的 adapter 分开。Engine 组合 Nest + Redis + RabbitMQ；Pulse 只取 Redis；Worker 只取 RabbitMQ。修改队列适配器不应无条件让 Pulse 失效缓存。</p></article>
          <article class="card"><h3>为什么没有继续叫 srv-shared</h3><p><code>srv-shared</code> 同时承担 Auth、缓存、限流、消息、日志、i18n、邮件、短信、存储，外部看不到真正所有者。新的名字直接表达技术边界，项目图也能反映真实变更影响面。</p></article>
        </div>
      </section>

      <section id="aliases">
        <div class="section-head"><div class="section-no">04</div><div><p class="kicker">Public API discipline</p><h2>Alias 与 package.json 的处理</h2></div></div>
        <div class="grid cards-2">
          <article class="card"><h3>根别名是唯一公共入口目录</h3><div class="flow">${canonicalServerAliases.map(alias => `<span>${escapeHtml(alias)}</span>`).join('')}${canonicalUiAliases.map(alias => `<span>${escapeHtml(alias)}</span>`).join('')}</div><p>常规导入走项目 <code>src/index.ts</code>。<code>@libs/auth-server/nest</code> 是刻意定义的精确公共子入口，用于隔离 Better Auth 的 Session 类型与 Nest 参数装饰器同名冲突；它不是任意深层源码通配符。</p></article>
          <article class="card"><h3>服务 tsconfig 为什么要特别检查</h3><p>TypeScript 子配置一旦声明 <code>compilerOptions.paths</code>，不会与父配置做逐项合并。Engine/Pulse/Worker 的构建配置因此必须显式包含自身实际需要的 adapter 及传递契约。新增的治理测试会阻止旧 alias 回流，并验证这些关键映射。</p></article>
          <article class="card"><h3>服务 package.json：发现打包缺陷</h3><p>Engine/Pulse/Worker 源码目录没有 package.json；Webpack 在 <code>dist/services/*</code> 生成 manifest。2026-09-10 实测后续 <code>prune-lockfile / copy-workspace-modules</code> 却要求源码 manifest，三个 package target 均失败。故旧 Engine lockfile 脚本暂保留，不能声称打包链路已完成替代；应用 build 通过不等于 package 通过。</p></article>
          <article class="card"><h3>为什么 apps/web 与 libs 没有</h3><p>Nx 的 integrated monorepo 可仅用 <code>project.json</code> 定义项目。Web 当前由 Vite/Nitro 生成部署产物；普通 libs 通过根 workspace 统一安装且不单独发布，因此不需要每个目录放 package.json。只有成为独立 npm package 或独立部署依赖清单时才应增加。</p></article>
        </div>
      </section>

      <section id="tools">
        <div class="section-head"><div class="section-no">05</div><div><p class="kicker">Operational code</p><h2>Tools 与 Scripts 为什么分开</h2></div></div>
        <div class="grid cards-3">
          <article class="tool-card"><h3><code>tools/auth-schema</code></h3><p>由 auth-server:schema-check 的 checker 调用 CLI，在临时目录生成并比较逻辑 schema。当前 CLI 1.4.21 与 runtime 1.6.26 并非同版本，比较会忽略物理映射；不能据此宣称同版本和完整物理契约治理已完成。</p></article>
          <article class="tool-card"><h3><code>tools/migrator</code></h3><p>独立可打包 migrator 边界，只携带固定 Prisma CLI、schema、migration 与发布策略；生产不再依赖容器内临时下载。</p></article>
          <article class="tool-card"><h3><code>tools/migration-tests</code></h3><p>数据库兼容性测试项目，承载历史升级、Billing V2 应用兼容和可恢复回填验证，而不是塞进运行时服务。</p></article>
          <article class="tool-card"><h3><code>scripts/ci</code></h3><p>实现 affected/full 指标采集、五次 baseline 证据校验、缓存输入与副作用规则、容器/发布契约，以及本轮新增的 server/UI 边界防回归。</p></article>
          <article class="tool-card"><h3><code>scripts/migrations</code></h3><p>执行只读预检、可恢复 backfill、迁移策略检查和 Contract 门禁。脚本负责编排，数据库 migration 仍是唯一 DDL 事实源。</p></article>
          <article class="tool-card"><h3><code>scripts/release</code></h3><p>不可变 digest 发布、蓝绿切流、readiness/smoke、自动回退、RTO 与 release manifest；这些有外部副作用，明确不进入 Nx Cache。</p></article>
        </div>
        <div class="verdict"><strong>按使用者理解：</strong><p>开发者通常只调用 pnpm/Nx 入口。CI 调用 scripts/ci；数据库变更调用 scripts/migrations；发布控制器调用 scripts/release。tools/auth-schema 和 tools/migrator 是工具依赖包；tools/migration-tests 是 Nx 测试项目；tools/ai-migrations 只是维护者阅读的升级说明。</p></div>
        <div class="table-wrap"><table><thead><tr><th>何时 / 谁使用</th><th>入口 → 被调用者</th><th>解决的问题 / 结果</th></tr></thead><tbody>
          <tr><td>改认证模型 / CI 与开发者</td><td>auth-server:schema-check → scripts/auth → tools/auth-schema</td><td>生成临时候选并报告逻辑漂移，不覆盖受控 schema。</td></tr>
          <tr><td>每次 PR / runner</td><td>ci.yml → scripts/ci/run-nx-with-metrics</td><td>运行 Nx 并收集时长/命中率；原任务失败仍失败。</td></tr>
          <tr><td>CI 预检 / runner</td><td>ci:nx-cache-contracts、ci:metrics:test</td><td>阻止错误缓存输入、旧 alias 和假 baseline 证据。</td></tr>
          <tr><td>手动测基准 / baseline workflow</td><td>五个 sample → summarize-nx-baseline</td><td>同 SHA 禁缓存中位数，给优化设比较基准。</td></tr>
          <tr><td>定时检查 / metrics-audit job</td><td>evaluate-nx-metrics + 历史 JSON</td><td>样本足够后判断改善率与命中率；没有基准不自动审计。</td></tr>
          <tr><td>数据库 CI / PostgreSQL job</td><td>migration-test / historical-migration-test → tools/migration-tests</td><td>在空的可丢弃 DB 检查升级与应用兼容，有测试库写入。</td></tr>
          <tr><td>正式发布 / deploy job</td><td>deploy-blue-green → migrator → policy check → Prisma</td><td>按 digest 部署，迁移分类、探针、切流、回退、manifest。</td></tr>
          <tr><td>发布控制器测试 / CI</td><td>check-container-contracts → test-deploy-controller + fixtures</td><td>用假 docker/curl 等验证失败路径；不是部署生产。</td></tr>
          <tr><td>架构修改 / 文档维护者</td><td>docs:nx-migration-review</td><td>刷新图与 HTML；完整逐文件调用表见开发者指南第 8 节。</td></tr>
        </tbody></table></div>
      </section>

      <section id="graph-section">
        <div class="section-head"><div class="section-no">06</div><div><p class="kicker">Resolved project graph</p><h2>最新 Nx Graph：${nodes.length} 项目 / ${edges.length} 边 / ${cycles.length} 循环</h2></div></div>
        <p>搜索或按维度过滤；点击节点查看直接依赖、反向消费者与可执行 targets。边方向为“项目 → 它依赖的项目”。</p>
        <div class="controls">
          <input id="graph-search" type="search" placeholder="搜索项目、路径或 Tag…" aria-label="搜索项目" />
          <select id="type-filter" aria-label="按类型过滤"><option value="">所有 type</option></select>
          <select id="runtime-filter" aria-label="按运行时过滤"><option value="">所有 runtime</option></select>
          <select id="domain-filter" aria-label="按领域过滤"><option value="">所有 domain</option></select>
          <label><input id="edge-toggle" type="checkbox" checked /> 显示依赖边</label>
          <span id="graph-count" class="search-count"></span>
        </div>
        <div class="graph-shell">
          <div class="graph-stage"><svg id="graph" role="img" aria-label="Ray Nx 项目依赖图"></svg></div>
          <aside id="graph-detail" class="graph-detail"><h3>选择一个项目</h3><p class="empty">点击节点查看所有权、公共 targets 与一阶影响面。</p></aside>
        </div>
        <details style="margin-top:18px"><summary>查看全部项目清单</summary><input id="project-table-search" class="project-table-search" type="search" placeholder="过滤项目表…" /><div class="table-wrap"><table><thead><tr><th>项目 / 根目录</th><th>Type</th><th>Runtime</th><th>Domain</th><th>依赖</th><th>消费者</th><th>Targets</th></tr></thead><tbody id="project-table-body">${projectRows}</tbody></table></div></details>
      </section>

      <section id="tests">
        <div class="section-head"><div class="section-no">07</div><div><p class="kicker">Verification truth</p><h2>单元测试与 E2E：现在真实覆盖到哪里</h2></div></div>
        <div class="grid metrics">
          <article class="metric"><strong>${projectsWithTest}</strong><span>拥有标准 test target 的项目</span></article>
          <article class="metric"><strong>${projectsWithBuild}</strong><span>拥有标准 build target 的项目</span></article>
          <article class="metric"><strong>56</strong><span>三个后端服务单测：45 + 4 + 7</span></article>
          <article class="metric"><strong>3 / 18</strong><span>上一轮 Playwright 通过 / 发现</span></article>
          <article class="metric"><strong>266</strong><span>清理后根 Vitest 用例通过，61 个文件</span></article>
        </div>
        <div class="table-wrap" style="margin-top:16px"><table><thead><tr><th>应用/服务</th><th>单元测试</th><th>E2E 当前事实</th><th>工程判断</th></tr></thead><tbody>${appCoverageRows}</tbody></table></div>
        <div class="grid cards-2" style="margin-top:16px">
          <article class="card"><h3 class="good">当前 CI 能保证</h3><p>所有存在 target 的项目执行对应 lint/typecheck/test/build；main/tag/schedule 执行全量，PR/dev 执行 affected；数据库/auth、容器、可部署产物与 Web E2E 有独立门禁。SHA 解析失败会失败关闭到全量。</p></article>
          <article class="card"><h3 class="warn">当前 CI 不能凭空保证</h3><p>Nx 不会因为项目缺少 test target 自动失败；Web/Desktop/Mobile/Extension 仍需新增单元测试代码。E2E 文件已经存在，但认证、组织、Stripe mock 等 15 个浏览器矩阵用例没有隔离凭据时会显式跳过，不应把 3 个 marketing smoke 误报为完整业务 E2E。</p></article>
        </div>
        <div class="verdict"><strong>根 Vitest 配置已纠正。</strong><p>根 test.projects 统一发现 apps/libs/services 下的 <code>vitest.config.{mjs,js,ts,mts}</code>，删除旧 vitest.workspace.ts；不再加载 Web 的构建 Vite 配置。Vite 配置可承载 test，但当前 Web 配置没有测试块。Glob 不是测试：四个客户端仍需要编写专用配置和真实用例，未使用空配置或 passWithNoTests 冒充覆盖。Nx 按各项目 test target 调度，根配置用于根目录 Vitest/编辑器聚合发现。</p><p>2026-09-10 清理复验：根 Vitest 61 文件 / 266 用例通过；全量 lint/typecheck/test 47 项目通过；七个应用 build 通过；schema-check 与 pg-dao:generate 通过且 auth.prisma 哈希不变。三个服务 package 失败，未部署或重跑真实 E2E。</p></div>
        <pre class="commands"># 以下为清理前历史验证；生成 HTML 本身不会运行下列命令
# 2026-09-10：运行时细化后全量复验通过
pnpm nx run-many -t lint,typecheck,test,build --all \
  --nxBail --skipNxCache --outputStyle=static --parallel=4

# 上一轮 E2E 记录（2026-09-08 未重跑）：
pnpm nx e2e web-e2e --skipNxCache --outputStyle=static
# Chromium / Firefox / WebKit：3 passed，15 skipped（缺隔离环境凭据）

pnpm ci:metrics:test              # 12 / 12（2026-09-10）
pnpm ci:nx-cache-contracts        # 通过
pnpm ci:container-contracts       # 本次停在 Docker 基础镜像元数据获取，已中止；未判通过
# 纯本地发布/迁移测试另见 ray-framework-restore-validation.md</pre>
      </section>

      <section id="cleanup">
        <div class="section-head"><div class="section-no">08</div><div><p class="kicker">Dirty worktree audit</p><h2>清理了什么，为什么工作区仍然是 dirty</h2></div></div>
        <div class="grid cards-2">
          <article class="card"><h3 class="good">迁移记录</h3><div class="callouts"><div class="callout"><div><strong>旧聚合项目退出</strong><p>四个 legacy project 不再存在于解析图；2026-09-08 将被误删的可选能力恢复到独立项目。</p></div></div><div class="callout"><div><strong>临时产物</strong><p>上一轮清理了本地构建日志与空目录；这不意味着每次生成报告都重新清理工作区。</p></div></div><div class="callout"><div><strong>开发工具知识</strong><p>项目指南已写明框架能力不能只因无当前消费者而删除。</p></div></div></div></article>
          <article class="card"><h3 class="warn">仍然 dirty 的原因</h3><p>当前 <code>${escapeHtml(branch)}</code> 工作树包含整套 Wave 迁移的已修改/新增文件，状态条目数为 <strong>${dirtyEntries.length}</strong>。这些不是本轮可以武断删除的临时文件；它们包含数据库、CI、发布、Billing/Auth/UI 拆分等尚未提交成果。</p><p>因此报告不把“清理完成”误写成“工作树干净”。下一步应按波次审阅并提交，而不是通过 reset 或批量删除掩盖变更。</p></article>
        </div>
      </section>

      <section id="gates">
        <div class="section-head"><div class="section-no">09</div><div><p class="kicker">Acceptance and remaining risk</p><h2>不会破坏原逻辑：证据与边界</h2></div></div>
        <div class="table-wrap"><table><thead><tr><th>检查</th><th>结果</th><th>能证明什么</th></tr></thead><tbody>
          <tr><td>Nx resolved graph</td><td><span class="status good">${nodes.length} 项目 / ${edges.length} 边 / ${cycles.length} 循环</span></td><td>项目可解析、依赖无环、旧边界无残留。</td></tr>
          <tr><td>全量 lint/typecheck/test/build</td><td><span class="status good">通过</span></td><td>公共 API、别名、类型与现有测试/构建消费者兼容。</td></tr>
          <tr><td>server-boundaries</td><td><span class="status good">4 类断言通过</span></td><td>服务直接依赖真实 adapter，旧 alias 不会通过 CI 回流。</td></tr>
          <tr><td>CI metrics / runtime tests</td><td><span class="status good">12 / 12（2026-09-10）</span></td><td>baseline、旧边界与新增运行时图、ESLint 负向、browser bundle、Expo 静态变量检查。</td></tr>
          <tr><td>Cache contracts</td><td><span class="status good">通过</span></td><td>代码项目、运行时输入、固定 Action 与副作用排除受检查，数量以当前检查输出为准。</td></tr>
          <tr><td>Container contracts</td><td><span class="status warn">本次未完成</span></td><td>Docker 基础镜像元数据获取未完成，已中止；不能沿用历史通过结果。独立本地发布脚本测试见验证记录，不代表真实切流。</td></tr>
          <tr><td>上一轮 Web E2E（无业务凭据）</td><td><span class="status warn">3 通过 / 15 跳过</span></td><td>历史三浏览器 smoke 成绩；2026-09-08 未重跑，不证明业务环境。</td></tr>
          <tr><td>部署与 Contract Migration</td><td><span class="status warn">未执行</span></td><td>本地工程能力已准备，生产/隔离环境结果仍待外部输入与正式发布。</td></tr>
        </tbody></table></div>
        <h3 style="margin-top:24px">建议的下一组独立提交</h3>
        <p><a href="ray-framework-restore-validation.md">2026-09-08 验证记录与范围</a> · <a href="ray-framework-nx-guide.md">开发者完整指南</a></p>
        <div class="callouts">
          <div class="callout"><div><strong>按框架能力审阅拆分</strong><p>独立审查 adapter 恢复、alias、注册方式、测试和指南；未使用的可选能力不再作为删除理由。</p></div></div>
          <div class="callout"><div><strong>单独处理 Nx 24 前置告警</strong><p>部分既有 Vitest 配置仍提示 <code>nxViteTsPaths</code> / <code>nxCopyAssetsPlugin</code> 将移除；四个恢复模块已用 vite-tsconfig-paths。其余工具链迁移应独立审查。</p></div></div>
          <div class="callout"><div><strong>补应用级测试代码</strong><p>为 Web/Desktop/Mobile/Extension 增加真实 test target 与最小关键场景；然后再把“所有应用都有单测”升级为 CI 硬门禁。</p></div></div>
          <div class="callout"><div><strong>在隔离环境执行完整 E2E</strong><p>提供测试账号、组织种子、Provider mock、PostgreSQL/Redis/RabbitMQ 后，执行 15 个受控业务用例与数据库历史升级测试。生产部署仍应是另一波次。</p></div></div>
        </div>
      </section>
      <section id="runtime-refinement">
        <div class="section-head"><div class="section-no">10</div><div><p class="kicker">2026-09-10 · Runtime isolation</p><h2>Email / Analytics / Monitoring：细化已完成</h2></div></div>
        <p>必要性不在命名：Nx 标签以项目为单位。旧 universal 项目包含 Node SDK，且 analytics/monitoring 根入口会创建各个平台 env，Web preset 还包含 server preset。现将运行时实现移到独立项目，核心接口不读环境变量；这不是已经发生泄密的断言，而是消除可验证的误用路径。</p>
        <div class="table-wrap"><table><thead><tr><th>能力</th><th>保留的通用核心</th><th>运行时实现</th><th>开发者使用方式</th></tr></thead><tbody>
          <tr><td>Email</td><td>email：模板标识和参数、发送类型</td><td>email-server：模板渲染/发送；server-email：Nest 注入</td><td>Node 使用 @libs/email-server，浏览器只依赖 @libs/email 契约</td></tr>
          <tr><td>Analytics</td><td>analytics：类型、策略、Adapter 注册</td><td>analytics-web / analytics-native / analytics-server</td><td>runtime/env 读取对应公开或服务端配置；track/identify/reset 语义保留</td></tr>
          <tr><td>Monitoring</td><td>monitoring：类型、策略、Adapter 注册</td><td>monitoring-web / monitoring-native / monitoring-server</td><td>初始化、身份与异常接口保留；Sentry SDK 仍由 App 提供</td></tr>
        </tbody></table></div>
        <div class="grid cards-2" style="margin-top:16px">
          <article class="card"><h3>兼容与有意变化</h3><p>旧 /web、/mobile、/server、/desktop、/extension alias 直接映射到真实项目，并受同样的运行时规则。移除含混 /env 和根入口 Env 导出，改用 -web/env、-native/env、-server/env；仓内调用方已迁移。Web/renderer/extension 共用 Web 项目，不为每个 provider 拆库。</p></article>
          <article class="card"><h3>验证，而不只搬目录</h3><p>全量 lint/typecheck/test/build 通过：49 项目及 3 个依赖任务。七个新增项目的 11 个行为测试通过；治理测试 12/12。实际 ESLint 拒绝客户端导入 Node 的新旧 alias，核心 browser bundle 不含 SDK/envin，Expo 环境读取通过 AST 检查。</p></article>
        </div>
        <p>未执行真实云端投递、原生设备 E2E 或部署；没有据此声称 CI 提速某个百分比。<a href="runtime-refinement.md">完整决策、迁移表与验证范围</a> · <a href="runtime-refinement-tracker.md">实施台账</a></p>
      </section>
    </main>
    <footer class="wrap">Ray Nx Migration Review · current workspace generated artifact · standalone HTML</footer>
    <noscript><div class="wrap noscript">此报告的正文可离线阅读；启用 JavaScript 后可使用 Nx Graph 搜索、过滤与节点详情。</div></noscript>
    <script>
      const graphData = ${graphData};
      const svg = document.getElementById('graph');
      const detail = document.getElementById('graph-detail');
      const search = document.getElementById('graph-search');
      const typeFilter = document.getElementById('type-filter');
      const runtimeFilter = document.getElementById('runtime-filter');
      const domainFilter = document.getElementById('domain-filter');
      const edgeToggle = document.getElementById('edge-toggle');
      const graphCount = document.getElementById('graph-count');
      const nodeByName = new Map(graphData.nodes.map(function(node){ return [node.name,node]; }));
      const desiredDomains = ['composition','auth','billing','platform','shared','organization','untagged'];
      const domains = Array.from(new Set(graphData.nodes.map(function(node){return node.domain;}))).sort(function(a,b){
        const ai=desiredDomains.indexOf(a), bi=desiredDomains.indexOf(b);
        return (ai<0?99:ai)-(bi<0?99:bi) || a.localeCompare(b);
      });
      const grouped = Object.fromEntries(domains.map(function(domain){return [domain,graphData.nodes.filter(function(node){return node.domain===domain;}).sort(function(a,b){return a.type.localeCompare(b.type)||a.name.localeCompare(b.name);})];}));
      const width = Math.max(1080, domains.length * 210 + 80);
      const height = Math.max(650, Math.max.apply(null,domains.map(function(domain){return grouped[domain].length;})) * 64 + 105);
      const positions = new Map();
      domains.forEach(function(domain,domainIndex){
        grouped[domain].forEach(function(node,nodeIndex){
          positions.set(node.name,{x:45+domainIndex*210,y:58+nodeIndex*64});
        });
      });
      svg.setAttribute('viewBox','0 0 '+width+' '+height);
      svg.setAttribute('height',String(height));
      const ns='http://www.w3.org/2000/svg';
      function element(name,attrs){const item=document.createElementNS(ns,name);Object.entries(attrs||{}).forEach(function(entry){item.setAttribute(entry[0],entry[1]);});return item;}
      domains.forEach(function(domain,index){
        const label=element('text',{x:String(45+index*210),y:'28',class:'domain-label'});label.textContent=domain;svg.appendChild(label);
        const line=element('line',{x1:String(30+index*210),x2:String(30+index*210),y1:'38',y2:String(height-25),class:'axis-line'});svg.appendChild(line);
      });
      const edgeLayer=element('g',{'aria-hidden':'true'});svg.appendChild(edgeLayer);
      const edgeElements=[];
      graphData.edges.forEach(function(edge){
        const from=positions.get(edge.source),to=positions.get(edge.target);if(!from||!to)return;
        const line=element('line',{x1:String(from.x+82),y1:String(from.y+21),x2:String(to.x+82),y2:String(to.y+21),class:'edge','data-source':edge.source,'data-target':edge.target});
        edgeLayer.appendChild(line);edgeElements.push(line);
      });
      const nodeLayer=element('g',{});svg.appendChild(nodeLayer);
      const nodeElements=new Map();
      graphData.nodes.forEach(function(node){
        const pos=positions.get(node.name);const group=element('g',{class:'graph-node',transform:'translate('+pos.x+' '+pos.y+')',tabindex:'0',role:'button','aria-label':node.name,'data-name':node.name});
        group.appendChild(element('rect',{width:'164',height:'43'}));
        const title=element('text',{x:'9',y:'17'});title.textContent=node.name;group.appendChild(title);
        const meta=element('text',{x:'9',y:'33',class:'node-meta'});meta.textContent=node.type+' · '+node.runtime;group.appendChild(meta);
        group.addEventListener('click',function(){selectNode(node.name);});group.addEventListener('keydown',function(event){if(event.key==='Enter'||event.key===' '){event.preventDefault();selectNode(node.name);}});
        nodeLayer.appendChild(group);nodeElements.set(node.name,group);
      });
      function optionValues(select,dimension){Array.from(new Set(graphData.nodes.map(function(node){return node[dimension];}))).sort().forEach(function(value){const option=document.createElement('option');option.value=value;option.textContent=value;select.appendChild(option);});}
      optionValues(typeFilter,'type');optionValues(runtimeFilter,'runtime');optionValues(domainFilter,'domain');
      let selected='';
      function filteredNames(){const query=search.value.trim().toLowerCase();return new Set(graphData.nodes.filter(function(node){return (!query||[node.name,node.root].concat(node.tags).join(' ').toLowerCase().includes(query))&&(!typeFilter.value||node.type===typeFilter.value)&&(!runtimeFilter.value||node.runtime===runtimeFilter.value)&&(!domainFilter.value||node.domain===domainFilter.value);}).map(function(node){return node.name;}));}
      function render(){const visible=filteredNames();const related=new Set();if(selected){const node=nodeByName.get(selected);if(node){node.dependencies.concat(node.dependents).forEach(function(name){related.add(name);});}}
        nodeElements.forEach(function(group,name){group.classList.toggle('dim',!visible.has(name)||(selected&&name!==selected&&!related.has(name)));group.classList.toggle('selected',name===selected);group.classList.toggle('related',related.has(name));});
        edgeElements.forEach(function(line){const source=line.dataset.source,target=line.dataset.target;const shown=edgeToggle.checked&&visible.has(source)&&visible.has(target);line.classList.toggle('hidden',!shown||(selected&&source!==selected&&target!==selected));line.classList.toggle('active',selected&&(source===selected||target===selected));});
        graphCount.textContent=visible.size+' / '+graphData.nodes.length+' 项目';
      }
      function list(items){return items.length?'<ul>'+items.map(function(item){return '<li><button class="project-link" data-project="'+item+'">'+item+'</button></li>';}).join('')+'</ul>':'<p class="empty">无</p>';}
      function selectNode(name){selected=name;const node=nodeByName.get(name);detail.innerHTML='<p class="kicker">'+node.type+' · '+node.runtime+' · '+node.domain+'</p><h3>'+node.name+'</h3><p class="mono muted">'+node.root+'</p><p>'+node.tags.map(function(tag){return '<span class="tag domain">'+tag+'</span> ';}).join('')+'</p><h3>直接依赖 ('+node.dependencies.length+')</h3>'+list(node.dependencies)+'<h3>直接消费者 ('+node.dependents.length+')</h3>'+list(node.dependents)+'<h3>Targets</h3><p class="mono">'+(node.targets.join(', ')||'—')+'</p>';detail.querySelectorAll('[data-project]').forEach(function(button){button.addEventListener('click',function(){selectNode(button.dataset.project);});});render();}
      [search,typeFilter,runtimeFilter,domainFilter,edgeToggle].forEach(function(control){control.addEventListener(control===search?'input':'change',render);});
      document.querySelectorAll('[data-project]').forEach(function(button){button.addEventListener('click',function(){document.getElementById('graph-section').scrollIntoView();selectNode(button.dataset.project);});});
      const tableSearch=document.getElementById('project-table-search');tableSearch.addEventListener('input',function(){const query=tableSearch.value.trim().toLowerCase();document.querySelectorAll('[data-project-row]').forEach(function(row){row.hidden=query&&!row.dataset.search.includes(query);});});
      render();
    </script>
  </body>
</html>`

mkdirSync(dirname(outputPath), { recursive: true })
writeFileSync(outputPath, html)
console.log(
  `Generated ${outputPath} (${nodes.length} projects, ${edges.length} edges, ${cycles.length} cycles, ${dirtyEntries.length} worktree entries).`
)
