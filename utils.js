exports.isNullOrEmpty = value => {
  return value ? false : true
}

exports.isObjectEmpty = obj => {
  return Object.entries(obj).length === 0
}
