db = db.getSiblingDB('REPLACE_WITH_DB_NAME')
db.createUser({
    user: 'REPLACE_WITH_USERNAME',
    pwd: 'REPLACE_WITH_STRONG_PASSWORD',
    roles: [{ role: 'readWrite', db: 'REPLACE_WITH_DB_NAME' }]
})
