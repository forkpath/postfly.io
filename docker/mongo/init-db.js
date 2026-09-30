/**
 * Mongo init script (runs only when /data/db is empty).
 *
 * Goals:
 * - Ensure the application database exists (Mongo creates DB on first write).
 * - Create an application user in that database so clients can use authSource=<dbName>.
 *
 * Env vars used (provided by docker-compose):
 * - MONGO_INITDB_DATABASE
 * - MONGO_INITDB_ROOT_USERNAME
 * - MONGO_INITDB_ROOT_PASSWORD
 *
 * Notes:
 * - The "root" user created by the official image lives in "admin" (authSource=admin).
 * - This script additionally creates a user in <dbName> so authSource=<dbName> works.
 */

const dbName =
  (typeof process !== 'undefined' && process.env && process.env.MONGO_INITDB_DATABASE) || db.getName() || 'ray'
const username = (typeof process !== 'undefined' && process.env && process.env.MONGO_INITDB_ROOT_USERNAME) || 'ray_user'
const password =
  (typeof process !== 'undefined' && process.env && process.env.MONGO_INITDB_ROOT_PASSWORD) || 'ray_password'

const targetDb = db.getSiblingDB(dbName)

print(`[init-db] target database: ${dbName}`)
print(`[init-db] ensuring user exists in db: ${dbName}`)

const existingUser = targetDb.getUser(username)
if (!existingUser) {
  targetDb.createUser({
    user: username,
    pwd: password,
    roles: [
      // Minimal privileges for typical app usage
      { role: 'readWrite', db: dbName }
    ]
  })
  print(`[init-db] created user '${username}' with readWrite on '${dbName}'`)
} else {
  print(`[init-db] user '${username}' already exists in '${dbName}', skipping createUser`)
}

// Force DB creation (MongoDB creates DB on first write)
const initColl = targetDb.getCollection('_init')
initColl.updateOne({ _id: 'initialized' }, { $set: { at: new Date(), db: dbName, user: username } }, { upsert: true })
print(`[init-db] ensured database '${dbName}' is initialized`)
