const jwt = require("jsonwebtoken");
const authConfig = require("../config/auth");

/**
 * 解析 token.
 * @param {String} token
 * @returns {Number} 返回解析 token 获得的用户 ID
 */
const tokenDecoder = token => {
  return new Promise(resolve => {
    if (!token) {
      resolve(undefined);
    } else {
      jwt.verify(token, authConfig.secret, (err, decoded) => {
        if (err) {
          resolve(null);
        } else {
          resolve(decoded.id);
        }
      });
    }
  });
};

module.exports = tokenDecoder;
