// 仅传递 Agent 自身认证/已配置模型路由，绝不继承业务 Secret。
import { assertSupportedAgent } from './agents.mjs'

export function agentEnvironment(agent, source) {
  assertSupportedAgent(agent)
  const result = {}
  const keys = [
    'PATH',
    'HOME',
    'USER',
    'LOGNAME',
    'SHELL',
    'LANG',
    'TMPDIR',
    'TERM',
    'HTTP_PROXY',
    'HTTPS_PROXY',
    'ALL_PROXY',
    'NO_PROXY',
    'http_proxy',
    'https_proxy',
    'all_proxy',
    'no_proxy',
    'NODE_EXTRA_CA_CERTS'
  ]
  const provider = agent === 'cursor' ? ['CURSOR_API_KEY'] : []
  for (const key of [...keys, ...provider]) if (source[key]) result[key] = source[key]
  return result
}
