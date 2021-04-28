function handleResponse(
  recordType,
  results,
  req,
  res,
  deleteVerbage,
  removeFieldName
) {
  if (results === -1) {
    // Doesn't exist
    res.status(404).send({
      message: `${recordType} record id ${req.params.id} not found`,
    })
  } else if (results === -2) {
    // Already deleted
    res.status(200).send({
      message: `${recordType} record id ${req.params.id} ${
        deleteVerbage
          ? "has already been deleted"
          : "exists but has been deleted"
      }`,
    })
  } else {
    if (removeFieldName) {
      //      console.log("handlResponse:", results)
      res.json(removeField(results, removeFieldName))
    } else {
      res.json(results)
    }
  }
}

function removeField(records, field) {
  const cleanRecords = records.data.map(record => {
    const cleanRecord = {}
    for (var key of Object.keys(record)) {
      if (key.toLowerCase() !== field) {
        cleanRecord[key] = record[key]
      }
    }
    return cleanRecord
  })
  return { data: cleanRecords, meta: records.meta }
}

module.exports = { handleResponse, removeField }
