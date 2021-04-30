const mysql = require("mysql2/promise")
const config = require("../config")

// Create the connection pool. The pool-specific settings are the defaults
const configDbParms = {
  ...config.db,
  debug: false,
  typeCast: function castField(field, useDefaultTypeCasting) {
    // We only want to cast bit fields that have a single-bit in them. If the field has more than one bit, then we cannot assume it is supposed to be a Boolean.
    if (field.type === "BIT" && field.length === 1) {
      var bytes = field.buffer()
      // A Buffer in Node represents a collection of 8-bit unsigned integers. Therefore, our single "bit field" comes back as the bits '0000 0001', which is equivalent to the number 1.
      return bytes && bytes[0] === 1
    }
    return useDefaultTypeCasting()
  },
}
const pool = mysql.createPool(configDbParms)

async function query(sql, params) {
  //  const connection = await mysql.createConnection(configDbParms)
  const [results] = await pool.query(sql, params)

  return results
}

async function execute(sql, params) {
  const [results] = await pool.execute(sql, params)

  return results
}

module.exports = {
  query,
  execute,
}
