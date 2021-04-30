const express = require("express")
const router = express.Router()
const baseService = require("../services/base-service")
const baseRouter = require("./base-router")
const { authenticateToken } = require("../services/auth-login")
const { body, check, validationResult } = require("express-validator")

// Fields to search on for searchText find (use database snake case)
const searchFields = [
  "user_id",
  "first_name",
  "last_name",
  "phone_number",
  "organization_name",
]
const validate = [
  body("phoneNumber", `Phone number is required`)
    .exists()
    .not()
    .isEmpty()
    .trim()
    .unescape(),
  body("firstName", `First name is required`)
    .exists()
    .not()
    .isEmpty()
    .trim()
    .unescape(),
  body("lastName", `Last name is required`)
    .exists()
    .not()
    .isEmpty()
    .trim()
    .unescape(),
  body("userId", `User id s required and must be a valid email`)
    .exists()
    .not()
    .isEmpty()
    .trim()
    .unescape()
    .isEmail(),
  (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty())
      return res.status(422).json({ errors: errors.array() })
    next()
  },
]

/* GET all users. */
router.get("/", authenticateToken, async (req, res, next) => {
  try {
    const records = await baseService.getAll({
      dbName: "auth",
      tableName: "users",
      req: req,
    })
    // Remove passwords
    res.json(baseRouter.removeField(records, "password"))
  } catch (err) {
    console.error(`Error getting users `, err.message)
    next(err)
  }
})

// Find users record by searchText filter
router.get("/find", async (req, res, next) => {
  try {
    const results = await baseService.getAll({
      dbName: "auth",
      tableName: "users",
      find: true,
      req: req,
      searchFields,
    })
    baseRouter.handleResponse("User", results, req, res, false, "password")
  } catch (e) {
    next(e)
  }
})

// Get one user record by id
router.get("/:id", async (req, res, next) => {
  try {
    const results = await baseService.getOneById({
      dbName: "auth",
      tableName: "users",
      idValue: req.params.id,
    })
    baseRouter.handleResponse("User", results, req, res, false, "password")
  } catch (e) {
    next(e)
  }
})

// Delete one user record by id
router.delete("/:id", async (req, res, next) => {
  try {
    const results = await baseService.deleteOneById({
      recordType: "User",
      dbName: "auth",
      tableName: "users",
      idValue: req.params.id,
    })
    baseRouter.handleResponse("User", results, req, res, true)
  } catch (e) {
    next(e)
  }
})

// Create a user record
router.post("/", authenticateToken, validate, async (req, res, next) => {
  try {
    const results = await baseService.create({
      recordType: "User",
      dbName: "auth",
      tableName: "users",
      reqBody: req.body,
      showRecord: true,
    })
    res.json(baseRouter.removeField(results, "password"))
  } catch (e) {
    next(e)
  }
})

// Update a user record
router.put("/:id", authenticateToken, validate, async (req, res, next) => {
  try {
    const results = await baseService.update({
      recordType: "User",
      dbName: "auth",
      tableName: "users",
      reqBody: req.body,
      reqParams: req.params,
    })
    //res.json(results)
    baseRouter.handleResponse("User", results, req, res, false, "password")
    //    res.json(baseRouter.removeField(results, "password"))
  } catch (e) {
    next(e)
    throw e
  }
})

// ####################################
// Helper methods for routing

module.exports = router
