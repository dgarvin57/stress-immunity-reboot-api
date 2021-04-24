const express = require("express")
const app = express()
const config = require("./config")

// v0.0 - Initial setup
// *********************************************
// Change log
// 04/23/21: v0.0 - Initial commit
// *********************************************

const currDate = new Date()
const port = process.env.PORT !== undefined ? process.env.PORT : 3000

// Default route
app.get("/", (req, res) =>
  res.send(`Hello Dan3! at ${currDate} on port ${port}`)
)

// Start server
app.listen(port, () =>
  console.log(
    `stress-immunity-reboot-api listening on port ${port} at ${currDate}`
  )
)

module.exports = {
  app,
}
