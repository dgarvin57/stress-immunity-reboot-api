const express = require("express")
const router = express.Router()
const authLogin = require("../services/auth-login")

/*
Login tasks
  1. Admin logs in with admin password (done)
  2. New user logs in from invitation email link




/* POST login */
router.post("/", async function (req, res, next) {
  try {
    const result = await authLogin.login(req.body.userid, req.body.password)
    if (result.status === 401) {
      res.status(401).send({ message: result.message })
    } else {
      res.status(200).send({ message: result.message })
    }
  } catch (err) {
    console.error(`Error while logging on `, err.message)
    next(err)
  }
})

/**
 * Encrypt password a number of times
 * req.query.passes=2 (encrypt 2 times)
 */
router.post("/encrypt-password", async function (req, res, next) {
  try {
    // Number of times to encrypt
    let passes = req.query.passes
    const passEncrypts = await authLogin.encryptPassword(
      req.body.password,
      passes
    )
    res.json(passEncrypts)
  } catch (err) {
    console.error(`Error while encrypting password `, err.message)
    next(err)
  }
})

module.exports = router
