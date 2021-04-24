const express = require("express")
const app = express()
const config = require("./config")

// v0.0 - Initial setup
// *********************************************
// Change log
// 04/23/21: v0.0 - Initial commit
// *********************************************

// Start server
app.listen(3000, () =>
  console.log(`stress-immunity-reboot-api listening on port 3000`)
)

// Default route
app.get("/", (req, res) => res.send("Hello Dan2!"))
