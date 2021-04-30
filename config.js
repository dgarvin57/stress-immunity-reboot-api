const dotenv = require("dotenv")
dotenv.config()

const config = {
  currEnv: process.env.NODE_ENV,
  port: process.env.PORT || 3000,
  dbLoadBatchSize: 10000,
  accessTokenSecret: process.env.ACCESS_TOKEN_SECRET,
  refreshTokenSecret: process.env.REFRESH_TOKEN_SECRET,
  accessTokenExpiresInMinutes: 30,
  refreshTokenExpiresInHours: 72,
  listPerPage: 10,
  db: {
    host: process.env.HOST,
    port: process.env.DB_PORT,
    database: process.env.DATABASE,
    user: process.env.USER,
    password: process.env.PASSWORD,
    connectionLimit: 10,
  },
}

module.exports = config
