const mongodb = require("mongodb")
const mongoClient = mongodb.MongoClient
const url = process.env.MONGODB_CON_URL
const client = new mongoClient(url)
const database = "bit-legion"

// Exports
module.exports = { client, database };