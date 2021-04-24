const dotenv = require("dotenv")
dotenv.config()

module.exports = {
  currEnv: process.env.NODE_ENV,
  dbLoadBatchSize: 10000,
  host: process.env.HOST,
  port: process.env.PORT || 3000,
  database: process.env.DATABASE,
  user: process.env.USER,
  password: process.env.PASSWORD,
  accessTokenSecret: process.env.ACCESS_TOKEN_SECRET,
  refreshTokenSecret: process.env.REFRESH_TOKEN_SECRET,
  accessTokenExpiresInMinutes: 30,
  refreshTokenExpiresInHours: 72,
  defaultRecordLimit: 50,
}
