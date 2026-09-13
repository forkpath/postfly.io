// 测试身份工厂：固定版本 Better Auth，独立数据库。不得用于生产。
import { betterAuth } from 'better-auth'
import { getMigrations } from 'better-auth/db/migration'
import { organization } from 'better-auth/plugins'

export function createEvaluationAuth(pool) {
  return betterAuth({
    database: pool,
    secret: 'ray-evaluation-only-not-a-production-secret-2026',
    baseURL: 'http://localhost:18080',
    trustedOrigins: ['http://localhost:18080'],
    emailAndPassword: { enabled: true, requireEmailVerification: true },
    emailVerification: {
      sendVerificationEmail: async () => {
        /* Test-only mail sink; users are verified explicitly in isolated PG. */
      }
    },
    session: { cookieCache: { enabled: false } },
    plugins: [organization()],
    advanced: { useSecureCookies: false },
    logger: { disabled: true }
  })
}
export async function initialize(pool) {
  const auth = createEvaluationAuth(pool)
  const migrations = await getMigrations(auth.options)
  await migrations.runMigrations()
  await pool.query(
    'CREATE TABLE IF NOT EXISTS evaluation_items (id text PRIMARY KEY, owner_user_id text, organization_id text, title text NOT NULL, CHECK ((owner_user_id IS NULL) <> (organization_id IS NULL)))'
  )
  return auth
}
export async function identity(auth, pool, email) {
  const password = 'Evaluation-only-pass-123!'
  await auth.api.signUpEmail({ body: { name: email, email, password } })
  await pool.query('UPDATE "user" SET "emailVerified" = true WHERE email = $1', [email])
  const response = await auth.api.signInEmail({ body: { email, password }, asResponse: true })
  const cookies = response.headers
    .getSetCookie()
    .map(c => c.split(';')[0])
    .join('; ')
  const session = await auth.api.getSession({ headers: new Headers({ cookie: cookies }) })
  if (!session) throw new Error('Test identity creation failed')
  return { userId: session.user.id, sessionId: session.session.id, cookie: cookies }
}
