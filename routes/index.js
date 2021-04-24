const authUserRouter = require("./auth-user.route")

// Use this to identify main routes so the specific route.js files
// don't have to specifiy the base route
module.exports = function (app) {
  app.use("/user", authUserRouter)
}
