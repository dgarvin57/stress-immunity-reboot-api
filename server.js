const express = require("express")
const app = express()
const bodyParser = require("body-parser")
const config = require("./config")

// v0.0 - Initial setup
// *********************************************
// Change log
// 04/23/21: v0.0 - Initial commit
// *********************************************

app.use(bodyParser.json())
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
)

const currDate = new Date()
const port = process.env.PORT !== undefined ? process.env.PORT : 3000

// Default route
app.get(
  "/",
  (req, res) =>
    res.json({
      status: "ok",
      port: port,
      message: "Hi Dan G",
    })
  //res.send(`Hello Dan3! at ${currDate} on port ${port}`)
)

// Database test route
app.get("/dbtest", (req, res) =>
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
