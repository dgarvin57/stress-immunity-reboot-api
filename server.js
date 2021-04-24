const express = require("express")
const app = express()
const config = require("./config")

// v0.0 - Initial setup
// *********************************************
// Change log
// 04/23/21: v0.0 - Initial commit
// *********************************************

// Default route
app.get("/", (req, res) => res.send(`Hello Dan3! at ${currDate}`))

// Start server
const currDate = new Date()
app.listen(process.env.PORT || 3000, () =>
  console.log(
    `stress-immunity-reboot-api listening on port ${process.env.PORT} || 3000 at ${currDate}`
  )
)
