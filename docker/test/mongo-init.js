// Runs inside Mongo's first-start initialization, in an isolated test database.
db.getSiblingDB(process.env.MONGO_INITDB_DATABASE).createUser({
  user: 'ray_test',
  pwd: process.env.RAY_TEST_PASSWORD,
  roles: [{ role: 'readWrite', db: process.env.MONGO_INITDB_DATABASE }]
})
