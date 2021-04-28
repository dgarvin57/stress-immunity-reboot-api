const bcrypt = require("bcrypt")
const baseService = require("./base-service")

/***
 * Password is expected to be plain text. This is only ok if using HTTPS
 */
exports.login = async (userid, password) => {
  const userRec = await baseService.getOneByKeyField({
    dbName: "auth",
    tableName: "users",
    fieldName: "user_id",
    fieldValue: userid,
  })
  if (userRec === -1) {
    // No user record matching userid
    return { status: 401, message: "Invalid user id or password" }
  } else if (userRec === -2) {
    // Been deleted
    return { status: 401, message: "User record has been deleted" }
  }
  // Userid is matched...Check password
  const userRecPass = userRec.data[0].password
  const passCompare = await this.comparePassword(password, userRecPass)
  if (!passCompare) {
    // Password doesn't match
    return { status: 401, message: "Invalid user id or password" }
  }
  // Authenticated
  return { status: 200, message: `User ${userid} authenticated` }
}

exports.encryptPasswordMultiple = async (password, passes) => {
  let passEncrypts = ""
  while (passes > 0) {
    passEncrypts = await authLogin.encryptPassword(req.body.password)
    passes--
  }
  return passEncrypts
}

exports.encryptPassword = async password => {
  return await bcrypt.hash(password, 10)
}

// Compare password 1 and password2, both encrypted
exports.comparePassword = async (password1, password2) => {
  return await bcrypt.compare(password1, password2)
}

/**
 * Authenticate access token passed in from client. Any failure to
 * validate token should result in 401 HTTP code, "Not authorized".
 */
exports.authenticateToken = async (req, res, next) => {
  try {
    // const authHeader = req.headers['authorization']
    // const token = authHeader && authHeader.split(' ')[1]
    // if (!token) return res.status(401).send('Access token missing')
    // // Valid token: Check against blacklist in case user logged out
    // // Instantiate BaseController for the token blacklist object
    // const objBase = new BaseController(
    //   req,
    //   res,
    //   'BlacklistToken',
    //   'g3tools',
    //   'auth_tokens_blacklist',
    //   ''
    // )
    // const results = await objBase.getOneByName('token', token)
    // if (results.status !== -1) {
    //   // Token is blacklisted, meaning user has logged out, invalidate
    //   return res.status(401).send('Access token logged out')
    // }
    // // Not logged out: Verify
    // jwt.verify(token, config.accessTokenSecret, (err, user) => {
    //   if (err) return res.status(401).send('Access token expired')
    //   // *****************************
    //   // Verified token
    //   req.user = user
    next()
    // })
  } catch (err) {
    return res.status(401).send(`Unknown access token error: ${err}`)
  }
}
