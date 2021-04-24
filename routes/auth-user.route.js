const express = require("express")
const router = express.Router()
const authUser = require("../services/auth-user")

/* GET users. */
router.get("/", async function (req, res, next) {
  try {
    res.json(await authUser.getAll(req.query.page))
  } catch (err) {
    console.error(`Error while getting users `, err.message)
    next(err)
  }
})

module.exports = router
