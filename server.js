const express = require("express")
const app = express()
const bodyParser = require("body-parser")
const authUserRouter = require("./routes/auth-user.route")
const authLoginRouter = require("./routes/auth-login.route")

// v0.0 - Initial setup
// *********************************************
// Change log
// 04/23/21: v0.0 - Initial commit
// 04/29/21: v0.1 - Done with CRUD
// *********************************************

app.use(bodyParser.json())
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
)

// Routes
app.use("/user", authUserRouter)
app.use("/login", authLoginRouter)

const currDate = new Date()
const port = process.env.PORT !== undefined ? process.env.PORT : 3000

// Default route
app.get("/", (req, res) =>
  res.json({
    status: "ok",
    port: port,
    message: "stress-immunity-reboot-api listening...",
  })
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
