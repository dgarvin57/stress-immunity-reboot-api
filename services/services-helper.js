const db = require("./db")
const mysql = require("mysql2/promise")
const config = require("../config")
const utils = require("../utils")

let table_schema = {}

// camelCase: convert from snake to camel case?
function emptyOrRows(rows, camelCase = true) {
  if (!rows) {
    return []
  }
  const objRows = Object.values(JSON.parse(JSON.stringify(rows)))
  // Convert properties from snake to camel
  rows = Array.isArray(rows) ? rows : [rows]
  const newRows = []
  rows.forEach(row => {
    const newRec = {}
    Object.keys(row).forEach(prop => {
      const newProp = camelCase ? toCamelCase(prop) : prop
      newRec[newProp] = row[prop]
    })
    newRows.push(newRec)
  })
  return newRows
}

// Given a field name string in snake, convert to camel
// Go from user_id to userId, by removing and converting the next letter to uppercase
function toCamelCase(value) {
  const snakeToCamel = value
    .toLowerCase()
    .replace(/([-_][a-z])/g, group =>
      group.toUpperCase().replace("-", "").replace("_", "")
    )

  return snakeToCamel
}

// Convert field name as comes from the front end request (camel or pascal)
// to database snake case
function toSnakeCase(value) {
  return value
    .split("")
    .map(character => {
      if (character == character.toUpperCase()) {
        return "_" + character.toLowerCase()
      } else {
        return character
      }
    })
    .join("")
}

async function checkIfDeleted({ props }) {
  const check = await getOneById(props)
  if (check === -2) {
    // Already deleted
    return true
  }
  return false
}

// Construct list control parameters
async function listControlParameters(find, req, searchFields) {
  const page = parseInt(req.query.page || 1)
  const listPerPage = parseInt(req.query.listPerPage || config.listPerPage)
  let orderBy = req.query.orderBy
  if (orderBy) {
    // Use passed in order by
    orderBy = toSnakeCase(orderBy) || "id"
    // } else {
    //   // If not provided, get first unique field from db schema
    //   orderBy = await getSchemaKeyField(dbName, tableName)
  }

  // searchText
  const search = formatSearchText(find, searchFields, req.query.searchText)

  // Filter
  const filter = formatFilterText(find, req.body)

  return {
    page: page,
    listPerPage: listPerPage,
    orderBy: orderBy || "id",
    orderDir: req.query.orderDir || "ASC",
    search,
    filter,
  }
}

function formatSearchText(find, searchFields, searchText) {
  // For each searchField, create a where clause criterion
  const searchWhere = []
  const searchArgs = []
  if (searchText && find) {
    searchFields.forEach(field => {
      searchWhere.push(`${field} LIKE ?`)
      searchArgs.push(`%${searchText}%`)
    })
  }
  return { searchWhere, searchArgs }
}

function formatFilterText(find, body) {
  // For each searchField, create a where clause criterion
  const filterWhere = []
  const filterArgs = []
  if (body && find) {
    Object.keys(body).forEach(term => {
      const dbField = toSnakeCase(term)
      const operator = body[term][0] || "="
      const value = body[term][1] || ""
      filterWhere.push(`${dbField} ${operator} ?`)
      filterArgs.push(operator === "LIKE" ? `%${value}%` : value)
    })
  }
  return { filterWhere, filterArgs }
}

// Log changes to record in database log table
async function logChanges(action, dbName, tableName, changes, record) {
  // Insert into log table
  let objChanges = {}
  // Get key name
  const keyName = await getSchemaKeyField(dbName, tableName)
  if (utils.isObjectEmpty(objChanges)) {
    objChanges[keyName] = record[keyName] || record[toCamelCase(keyName)]
  }
  objChanges = { ...objChanges, ...changes }

  const sql = mysql.format(
    `INSERT INTO ${dbName}.${dbName}_log (table_name, action, record_id, key_name, changes) VALUES(?, ?, ?, ?, ?)`,
    [
      tableName,
      action,
      record.id,
      record[keyName] || record[toCamelCase(keyName)],
      JSON.stringify(objChanges),
    ]
  )
  // Create record
  await db.query(sql)
}

// Construct field list, value list, and for updates, fields changed
async function parseBody(method, dbName, tableName, reqBody, currRecord = {}) {
  const changedFields = []
  const changedValues = []
  const valuePlaceholders = []
  const changedJson = {}
  table_schema = await getSchema(dbName, tableName)

  // Iterate over request body payload
  for (var key of Object.keys(reqBody)) {
    const reqValue = reqBody[key]
    const dbField = toSnakeCase(key)
    const dbValue =
      (currRecord && currRecord.data && currRecord.data[0][dbField]) || null

    // See if field has changed from db version
    if (isChanged(reqValue, dbField, dbValue) || dbValue == null) {
      // Field has changed
      if (method === "INSERT") {
        // Insert; INSERT INTO (field1, field2) VALUES(?, ?), [value1, value2]
        changedFields.push(`\`${dbField}\``)
        valuePlaceholders.push("?")
        changedValues.push(reqValue)
        changedJson[dbField] = reqValue
      } else {
        // UPDATE; UPDATE <table> SET field1 = ?, field2 = ?, [value1, value2]
        changedFields.push(`\`${dbField}\` = ?`)
        changedValues.push(reqValue)
        changedJson[dbField] = reqValue
      }
    }
  }

  return {
    changedFields,
    changedValues,
    valuePlaceholders,
    changedJson,
  }
}

// See if passed in values from request body and from db are different
function isChanged(reqValue, dbField, dbValue) {
  // Find key in passed in and database records
  if (reqValue && dbValue) {
    if (getSchemaType(dbField) === "date") {
      // Compare dates
      const reqValueParse = Date.parse(
        new Date(reqValue).toISOString().substr(0, 10)
      )
      const dbValueParse = Date.parse(dbValue.toISOString().substr(0, 10))
      if (reqValueParse !== dbValueParse) {
        return true
      }
    } else if (getSchemaType(dbField).includes("date")) {
      // Compare dates
      const reqValueParse = Date.parse(new Date(reqValue).toISOString())
      const dbValueParse = Date.parse(dbValue.toISOString())
      if (reqValueParse !== dbValueParse) {
        return true
      }
    } else {
      // Compare non-dates
      if (reqValue !== dbValue) {
        return true
      }
    }
    return false
  }
}

// Put quotes around value of db schema field is varchar
function quoteData(key, value) {
  // Find key in schema and get type
  const renderedField = RenderField(key, value)
  return renderedField
}

function RenderField(key, fieldValue) {
  // Null check
  if (utils.isNullOrEmpty(fieldValue)) {
    // Not there
    return "NULL"
  }

  // Find type
  const fieldType = getSchemaType(key)
  if (
    fieldType.toLowerCase().includes("char") ||
    fieldType.toLowerCase().includes("text") ||
    fieldType.toLowerCase().includes("binary")
  ) {
    // String: quotes
    return `'${fieldValue.trim()}'`
  } else if (
    fieldType.toLowerCase().includes("bit") ||
    fieldType.toLowerCase().includes("int") ||
    fieldType.toLowerCase().includes("decimal") ||
    fieldType.toLowerCase().includes("double") ||
    fieldType.toLowerCase().includes("float") ||
    fieldType.toLowerCase().includes("numeric") ||
    fieldType.toLowerCase().includes("money") ||
    fieldType.toLowerCase().includes("real")
  ) {
    // Numeric: No quotes
    return `${fieldValue}`
  } else if (
    fieldType.toLowerCase().includes("date") ||
    fieldType.toLowerCase().includes("time")
  ) {
    // Date or DateTime: Quotes
    return `'${new Date(fieldValue.trim()).toISOString()}'`
  } else {
    // Unknown, return in quotes for safety
    return `'${fieldValue.trim()}'`
  }
}

// ########### SCHEMA UTILS ############
// Get schema from database for a given table
async function getSchema(dbName, tableName) {
  const sql = mysql.format(
    `DESCRIBE \`${dbName}\`.\`${tableName}\``,
    dbName,
    tableName
  )
  const rows = await db.query(sql)
  const data = emptyOrRows(rows)
  return data
}

// Return schema db type for this field
function getSchemaType(field) {
  const found = table_schema.filter(item => item.field === field)
  if (found) {
    return found[0].type
  } else {
    return -1
  }
}

/**
 * Find first field with a unique index after id. Or, if none, return the second field. Key field is used for logging.
 * @param {string} dbName
 * @param {string} tableName
 */
async function getSchemaKeyField(dbName, tableName) {
  // If no schema, get it
  table_schema = await getSchema(dbName, tableName)
  const keyField = table_schema.filter(x => x.key === "UNI")
  if (Array.isArray(keyField) && keyField.length > 1) {
    // More than one unique key; don't attempt
    return -1
  }
  if (keyField) {
    return keyField[0].field
  } else {
    // Get second field of schema
    const secondField = table_schema[1]
    return secondField[0].Field
  }
}

module.exports = {
  checkIfDeleted,
  emptyOrRows,
  getSchema,
  getSchemaKeyField,
  getSchemaType,
  listControlParameters,
  logChanges,
  parseBody,
  toCamelCase,
  toSnakeCase,
}
