const express = require("express")
const app = express()
const bodyParser = require("body-parser")
const userRouter = require("./routes/auth-user.route")

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

// Routes
require("./routes")(app)

const currDate = new Date()
const port = process.env.PORT !== undefined ? process.env.PORT : 3000

// Default route
app.get(
  "/",
  (req, res) =>
    res.json({
      status: "ok",
      port: port,
      message: "stress-immunity-reboot-api listening...",
    })
  //res.send(`Hello Dan3! at ${currDate} on port ${port}`)
)

/* Error handler middleware */
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500
  console.error(err.message, err.stack)
  res.status(statusCode).json({ message: err.message })
  return
})

// Start server
app.listen(port, () =>
  console.log(
    `stress-immunity-reboot-api listening on port ${port} at ${currDate}`
  )
)

module.exports = {
  app,
}
