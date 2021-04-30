const bcrypt = require("bcrypt")
const baseService = require("./base-service")
const jwt = require("jsonwebtoken")
const config = require("../config")

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
  const userRecId = userRec.data[0].userId
  const userRecPass = userRec.data[0].password
  const passCompare = await this.comparePassword(password, userRecPass)
  if (!passCompare) {
    // Password doesn't match
    return { status: 401, message: "Invalid user id or password" }
  }
  // Authenticated
  // Generate refresh JWT

  const expiryDate = new Date(
    new Date().setHours(
      new Date().getHours() + config.refreshTokenExpiresInHours
    )
  )

  const refreshJwt = generateRefreshToken({ userId: userRecId })
  // console.log(refreshJwt)

  return {
    status: 200,
    message: `User ${userid} authenticated`,
    token: refreshJwt,
    expiration: expiryDate,
  }
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
    // http only cookie (refresh)
    const refreshToken = req.headers.cookie
    // const authHeader = req.headers['authorization']
    // const token = authHeader && authHeader.split(' ')[1]
    if (!refreshToken) return res.status(401).send("Token missing")
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
    // Refresh token not black-listed: Now verify token
    const token = refreshToken.split("token=")[1]
    jwt.verify(token, config.refreshTokenSecret, (err, user) => {
      if (err) return res.status(401).send({ error: err.message }) //"Access token expired")
      // *****************************
      // Verified token
      req.user = user
      next()
    })
  } catch (err) {
    return res.status(401).send(`Unknown token error: ${err}`)
  }
}
function generateAccessToken(user) {
  // Create json web token to return to user to be used for future authentication
  return jwt.sign(user, config.accessTokenSecret, {
    expiresIn: `${config.accessTokenExpiresInMinutes}m`,
  })
}

function generateRefreshToken(user) {
  // Create json web token to return to user to be used for future authentication
  const token = jwt.sign(user, config.refreshTokenSecret, {
    expiresIn: `${config.refreshTokenExpiresInHours}h`,
  })
  return token
}

exports.pruneExpiredTokens = async function () {
  //await app.runMiddleware('/tokens/pruneZzi39', function (code, body, headers) {
  //  console.log(`${new Date()} - ${body}`);
  //})
  // Create request and response object to simulate an actual request/response
  const req = { query: {}, params: {} }
  const res = {}
  const authToken = new AuthToken(req, res)
  const result = await authToken.pruneExpiredTokens()
  console.log(`${new Date()} - ${result}`)
}
