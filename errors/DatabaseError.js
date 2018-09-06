/**
 * 数据库异常。
 * @param {String} message 异常信息。
 */
function DatabaseError(message) {
  this.name = "DatabaseError";
  this.message = message || "Error occured while querying the database.";
  this.stack = new Error().stack;
}
DatabaseError.prototype = Object.create(Error.prototype);
DatabaseError.prototype.constructor = DatabaseError;

module.exports = DatabaseError;
