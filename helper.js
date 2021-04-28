function getOffset(currentPage = 1, listPerPage) {
  return (currentPage - 1) * [listPerPage]
}

function emptyOrRows(rows) {
  if (!rows) {
    return []
  }
  return rows
}

function isNullOrEmpty(value) {
  return value ? false : true
}

module.exports = {
  getOffset,
  emptyOrRows,
  isNullOrEmpty,
}
