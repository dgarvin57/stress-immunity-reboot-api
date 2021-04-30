const db = require("./db")
const mysql = require("mysql2/promise")
const helper = require("./services-helper")

// Get ONE record with matching id field
async function getOneById({ ...props }) {
  const { dbName, tableName, idValue, toCamelCase = true } = props
  const sql = mysql.format(
    `SELECT * FROM ${dbName}.${tableName} WHERE id = ?`,
    idValue
  )
  const rows = await db.query(sql)
  const data = helper.emptyOrRows(rows, toCamelCase)
  // meta
  meta = { totalCount: 1, maxPages: 1, page: 1 }

  if (data.length === 0) {
    // Doesn't exist
    return -1
  } else {
    return { data, meta }
  }
}

// Get ONE record with matching key (unique) field
async function getOneByKeyField({ ...props }) {
  const {
    dbName,
    tableName,
    fieldName,
    fieldValue,
    toCamelCase = true,
    omitId,
  } = props
  let sql = ""
  if (omitId) {
    // Omit passed in record id (usually itself)
    sql = mysql.format(
      `SELECT * FROM ${dbName}.${tableName} WHERE ${fieldName} = ? AND id <> ?`,
      [fieldValue, omitId]
    )
  } else {
    sql = mysql.format(
      `SELECT * FROM ${dbName}.${tableName} WHERE ${fieldName} = ?`,
      fieldValue
    )
  }
  const rows = await db.query(sql)
  const data = helper.emptyOrRows(rows, toCamelCase)
  // meta
  meta = { totalCount: 1, maxPages: 1, page: 1 }

  if (data.length === 0) {
    // Doesn't exist
    return -1
  } else {
    return {
      data,
      meta,
    }
  }
}

// Get SOME or ALL records for given props
// Handles list per page (limit), page number (offset), order by and direction,
// search text, and filter by field
async function getSomeOrAll({ ...props }) {
  const { dbName, tableName, find, req, searchFields } = props

  // Use this same method to also handle searchText and filters

  const {
    page,
    listPerPage,
    orderBy,
    orderDir,
    search,
    filter,
  } = await helper.listControlParameters(find, req, searchFields)

  // Handle search text if exists
  const searchWhere =
    search.searchWhere.length > 0
      ? "AND (" + search.searchWhere.join(" OR ") + ")"
      : ""

  // Handle filter text if exists
  const filterWhere =
    filter.filterWhere.length > 0
      ? "AND " + filter.filterWhere.join(" AND ")
      : ""

  // Get total count (without limit or offset)
  const sqlCount = mysql.format(
    `SELECT COUNT(*) AS count FROM ${dbName}.${tableName} WHERE 1=1 ${searchWhere} ${filterWhere}`,
    [...search.searchArgs, ...filter.filterArgs]
  )
  const rowsCount = await db.query(sqlCount)
  const dataCount = helper.emptyOrRows(rowsCount)
  const count = dataCount[0].count
  const maxPages = Math.ceil(count / listPerPage)
  let usePage = 1
  usePage = page >= 1 ? page : 1
  usePage = usePage <= maxPages ? usePage : maxPages

  // Offset. If requested page is > than max pages, return last page
  let offset = (usePage - 1) * listPerPage
  if (offset > maxPages) {
    offset = count - listPerPage
  }

  // Get actual records
  const sql = mysql.format(
    `SELECT * FROM ${dbName}.${tableName} WHERE 1=1 ${searchWhere} ${filterWhere} ORDER BY ${orderBy} ${orderDir}, id LIMIT ${listPerPage} OFFSET ${offset}`,
    [...search.searchArgs, ...filter.filterArgs]
  )
  //console.log("sql", sql)
  const rows = await db.query(sql)
  const data = helper.emptyOrRows(rows)
  const meta = { totalCount: count, maxPages, page: usePage }

  return {
    data,
    meta,
  }
}

// Delete ONE record by id
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

  // Log changes (no need to record changes)
  await helper.logChanges("Delete", dbName, tableName, "", rec.data[0])

  if (data && data[0] && data[0].affectedrows > 0) {
    return {
      message: `${recordType} record id ${idValue} successfully deleted`,
    }
  } else {
    return data
  }
}

// Create ONE record
async function create({ ...props }) {
  const { recordType, dbName, tableName, reqBody, showRecord } = props
  const conversion = await helper.parseBody(
    "INSERT",
    dbName,
    tableName,
    reqBody
  )
  const sql = mysql.format(
    `INSERT INTO ${dbName}.${tableName} (${conversion.changedFields}) VALUES(${conversion.valuePlaceholders})`,
    conversion.changedValues
  )
  if (!showRecord) {
    return
  }

  try {
    // Create record
    const result = await db.query(sql)
    const newId = result.insertId

    // Get inserted record
    const newRecord = await getOneById({
      dbName: dbName,
      tableName: tableName,
      idValue: newId,
    })

    // Log changes
    await helper.logChanges(
      "Insert",
      dbName,
      tableName,
      conversion.changedJson,
      newRecord.data[0]
    )
    // Get created record and return
    return newRecord
  } catch (err) {
    // Custom error message for duplicate entry
    if (err.message.toLowerCase().includes("duplicate entry")) {
      let newMessage = err.message.split("for key")[0].trim()
      newMessage = newMessage.replace("Duplicate entry", recordType)
      newMessage = `${newMessage} already exists`
      return { error: newMessage }
    } else {
      return { error: err.message }
    }
  }
}

// Update ONE record
async function update({ ...props }) {
  const { recordType, dbName, tableName, reqBody, reqParams } = props
  const currRecId = reqParams.id
  const currRecord = await getOneById({
    ...props,
    idValue: currRecId,
    toCamelCase: false,
  })
  if (currRecord === -1) {
    // Record not found
    return -1
  }

  // Compare passed in record with database version
  const conversion = await helper.parseBody(
    "UPDATE",
    dbName,
    tableName,
    reqBody,
    currRecord
  )
  if (conversion.changedFields.length === 0) {
    return { message: "Nothing to update" }
  }
  // See if record exists for this unique key
  const error = await checkIfUniqueKeyExists({ ...props, currRecId })
  if (error) {
    return error
  }
  const sql = mysql.format(
    `UPDATE ${dbName}.${tableName} SET ${conversion.changedFields} WHERE id = ${currRecId}`,
    conversion.changedValues
  )
  try {
    // Update record
    await db.query(sql)
    // Log changes
    helper.logChanges(
      "Update",
      dbName,
      tableName,
      conversion.changedJson,
      currRecord.data[0]
    )
    // Get updated record and return
    return getOneById({
      dbName: dbName,
      tableName: tableName,
      idValue: currRecId,
    })
  } catch (err) {
    // Custom error message for duplicate entry
    if (err.message.toLowerCase().includes("duplicate entry")) {
      let newMessage = err.message.split("for key")[0].trim()
      newMessage = newMessage.replace("Duplicate entry", recordType)
      newMessage = `${newMessage} already exists and so cannot be updated`
      return { error: newMessage }
    } else {
      return { error: err.message }
    }
  }
}

// See if record with key field exists
async function checkIfUniqueKeyExists({ ...props }) {
  const { recordType, dbName, tableName, reqBody, currRecId } = props

  // Find key field from schema
  const keyField = await helper.getSchemaKeyField(dbName, tableName)
  if (keyField === -1) {
    return null
  }
  // Convert to camel case and find field and its value of req data
  const keyFieldCamel = helper.toCamelCase(keyField)
  const reqValue = reqBody[keyFieldCamel]
  // Use that db key field and req value to search database by key field
  const rec = await getOneByKeyField({
    dbName,
    tableName,
    fieldName: keyField,
    fieldValue: reqValue,
    omitId: currRecId,
  })
  if (rec === -1) {
    // Doesn't exists
    return null
  }
  // Exists: Tell user and stop
  return {
    error: `${recordType} already exists for ${keyFieldCamel} ${reqValue}`,
  }
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
  getAll: getSomeOrAll,
  getOneById,
  deleteOneById,
  create,
  update,
}
