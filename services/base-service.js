const db = require("./db")
const mysql = require("mysql2/promise")
const helper = require("../helper")
const config = require("../config")

// Get one record with matching id field
async function getOneById({ ...props }) {
  const { dbName, tableName, idValue } = props
  const sql = mysql.format(
    `SELECT * FROM ${dbName}.${tableName} WHERE id = ?`,
    idValue
  )
  const rows = await db.query(sql)
  const data = [...rows]
  //const data = helper.emptyOrRows(rows)

  if (data.length === 0) {
    // Doesn't exist
    return -1
    // } else if (data[0].deleted) {
    //   // Already deleted
    //   return -2
  } else {
    return {
      data,
    }
  }
}

// Get one record with matching key field
async function getOneByKeyField({ ...props }) {
  const { dbName, tableName, fieldName, fieldValue } = props
  const sql = mysql.format(
    `SELECT * FROM ${dbName}.${tableName} WHERE ${fieldName} = ?`,
    fieldValue
  )
  const rows = await db.query(sql)
  const data = [...rows]
  //const data = helper.emptyOrRows(rows)

  if (data.length === 0) {
    // Doesn't exist
    return -1
    // } else if (data[0].deleted) {
    //   // Already deleted
    //   return -2
  } else {
    return {
      data,
    }
  }
}

// Get all records for given props
async function getAll({ ...props }) {
  const {
    dbName,
    tableName,
    page = 1,
    listPerPage = config.listPerPage,
  } = props
  const offset = helper.getOffset(page, listPerPage)
  const sql = mysql.format(
    `SELECT * FROM ${dbName}.${tableName} LIMIT ? OFFSET ?`,
    [parseInt(listPerPage), parseInt(offset)]
  )
  const rows = await db.query(sql)
  const data = [...rows]
  //const data = helper.emptyOrRows(rows)
  const meta = { page }

  return {
    data,
    meta,
  }
}

// Delete one record by id
async function deleteOneById({ ...props }) {
  const { recordType, dbName, tableName, idValue } = props
  const rec = await checkIfExists({ props })
  if (!rec) {
    // Doesn't exist
    return -1
  }
  const sql = mysql.format(
    `DELETE FROM ${dbName}.${tableName} WHERE id = ?`,
    idValue
  )
  const rows = await db.query(sql)
  const data = helper.emptyOrRows(rows)

  // Log changes
  logChanges("Delete", dbName, tableName, rec.data[0], idValue)

  if (data && data.affectedRows && data.affectedRows > 0) {
    return {
      message: `${recordType} record id ${idValue} successfully deleted`,
    }
  } else {
    return data
  }
}

// Create record
async function create({ ...props }) {
  const { recordType, dbName, tableName, reqBody, showRecord } = props
  const conversion = await parseBody(dbName, tableName, reqBody)
  const sql = mysql.format(
    `INSERT INTO ${dbName}.${tableName} (${conversion.fields}) VALUES(${conversion.values})`
  )
  if (!showRecord) {
    return
  }
  // Create record
  const result = await db.query(sql)
  const newId = result.insertId
  // Log changes
  logChanges("Insert", dbName, tableName, conversion.fieldsChangedJson, newId)
  // Get created record and return
  return getOneById({ dbName: dbName, tableName: tableName, idValue: newId })
}

// Update record
async function update({ ...props }) {
  const { dbName, tableName, reqBody, reqParams } = props
  const currRecId = reqParams.id
  const currRecord = await getOneById({ ...props, idValue: currRecId })
  const conversion = await parseBody(
    dbName,
    tableName,
    reqBody,
    currRecord.data[0]
  )
  if (conversion.fieldsChangedSql.length === 0) {
    return { message: "Nothing to update" }
  }
  const sql = mysql.format(
    `UPDATE ${dbName}.${tableName} SET ${conversion.fieldsChangedSql} WHERE id = ${currRecId}`
  )
  // Update record
  await db.query(sql)
  // Log changes
  logChanges(
    "Update",
    dbName,
    tableName,
    conversion.fieldsChangedJson,
    currRecId
  )
  // Get updated record and return
  return getOneById({
    dbName: dbName,
    tableName: tableName,
    idValue: currRecId,
  })
}

// ###############################
// Helper Functions

// Changes in js object
async function logChanges(action, dbName, tableName, changes, id) {
  // Insert into log table
  let objChanges = {}
  if (Array.isArray(changes)) {
    // Consolidate changes array into a json object
    for (let i = 0; i < changes.length; i++) {
      objChanges = { ...objChanges, ...changes[i] }
    }
  } else {
    objChanges = changes
  }
  const sql = mysql.format(
    `INSERT INTO ${dbName}.${dbName}_log (table_name, action, id, changes) VALUES(?, ?, ?, ?)`,
    [tableName, action, id, JSON.stringify(objChanges)]
  )
  // Create record
  await db.query(sql)
}

// Construct field list, value list, and for updates, fields changed
async function parseBody(dbName, tableName, reqBody, currRecord = {}) {
  const fields = []
  const values = []
  const fieldsChangedSql = []
  const fieldsChangedJson = []
  const schema = await getSchema(dbName, tableName)

  // Iterate over reqBody JSON object
  for (var key of Object.keys(reqBody)) {
    const snakeKey = convertCamelToSnakeCase(key)
    const newKey = "`" + snakeKey + "`"
    const newData = quoteData(schema, snakeKey, reqBody[key])
    fields.push(newKey)
    values.push(newData)
    const changedFields = isChanged(
      schema,
      key,
      reqBody[key],
      currRecord,
      snakeKey,
      newData
    )
    // Accumulate
    if (
      changedFields &&
      changedFields.changedSql &&
      changedFields.changedSql.length > 0
    ) {
      fieldsChangedSql.push(changedFields.changedSql)
    }
    fieldsChangedJson.push(changedFields.changedJson)
  }
  const finalJson = fieldsChangedJson.filter(
    el => el != null && Object.keys(el).length
  )

  return {
    fields: fields,
    values: values,
    fieldsChangedSql: fieldsChangedSql,
    fieldsChangedJson: finalJson,
  }
}

// See what fields are being changed compared to database record
function isChanged(schema, key, reqData, currRecord, newKey, newData) {
  // Find key in passed in and database records
  const currData = currRecord[newKey]
  let changedSql = {}
  let changedJson = {}
  if (currData !== null) {
    if (getSchemaType(schema, newKey).includes("date")) {
      // Compare dates
      const reqDataDate = Date.parse(reqData)
      const currDataDate = Date.parse(currData)
      if (reqDataDate !== currDataDate) {
        changedJson[newKey] = reqData
        changedSql = `\`${newKey}\`=${newData}`
      }
    } else {
      // Compare non-dates
      if (reqData !== currData) {
        changedJson[newKey] = reqData
        changedSql = `\`${newKey}\`=${newData}`
      }
    }
    return { changedSql, changedJson }
  }
}

// Put quotes around value of db schema field is varchar
function quoteData(schema, key, value) {
  // Find key in schema and get type
  const renderedField = RenderField(value, getSchemaType(schema, key))
  return renderedField
}

// Return schema db type for this field
function getSchemaType(schema, field) {
  const found = schema.filter(item => item.Field === field)
  if (found !== undefined) {
    return found[0].Type
  } else {
    return -1
  }
}

function RenderField(fieldValue, fieldType) {
  // Null check
  if (helper.isNullOrEmpty(fieldValue)) {
    // Not there
    return "NULL"
  }

  // Find type
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

// Get schema from database for a given table
async function getSchema(dbName, tableName) {
  const sql = mysql.format(
    `DESCRIBE \`${dbName}\`.\`${tableName}\``,
    dbName,
    tableName
  )
  const rows = await db.query(sql)
  const data = [...rows]
  //const data = helper.emptyOrRows(rows)
  return data
}

// Convert field name as comes from the front end request (camel or pascal)
// to database snake case
function convertCamelToSnakeCase(value) {
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

// See if record id exists
async function checkIfExists({ props }) {
  const rec = await getOneById(props)
  if (rec === -1) {
    // Doesn't exists
    return false
  }
  return rec
}

module.exports = {
  getOneByKeyField,
  getAll,
  getOneById,
  deleteOneById,
  create,
  update,
}
