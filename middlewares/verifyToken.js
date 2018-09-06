/**
 * 验证用户中间件。
 * @param {String} token
 */

const tokenDecoder = require("../helpers/tokenDecoder");

const verifyToken = async (req, res, next) => {
  req.id = await tokenDecoder(req.headers["x-access-token"]);
  if (req.id === undefined) {
    res.status(401).send("401 Unauthorized: Token required.");
  } else if (req.id === null) {
    res.status(401).send("401 Unauthorized: Invalid or expired token.");
  } else {
    next();
  }
};

module.exports = verifyToken;
