const db = require("./db")
const mysql = require("mysql2/promise")
const helper = require("../helper")
const config = require("../config")

// async function getAll(page = 1, listPerPage = config.listPerPage) {
//   const offset = helper.getOffset(page, listPerPage)
//   const sql = mysql.format("SELECT * FROM users LIMIT ? OFFSET ?", [
//     parseInt(listPerPage),
//     parseInt(offset),
//   ])
//   const rows = await db.query(sql)
//   const data = helper.emptyOrRows(rows)
//   const meta = { page }

//   return {
//     data,
//     meta,
//   }
// }

module.exports = {
  //getAll,
}
