const DatabaseError = require("../errors/DatabaseError");

/**
 * 判断特定对象是否已存在。
 * @param {Object} ModelType 对象类型
 * @param {JSON} query 查询条件
 * @returns {Object | Boolean} 存在则返回对象，不存在返回 false
 */
const existenceVerifier = (ModelType, query) => {
  return new Promise((resolve, reject) =>
    ModelType.findOne(query, (err, object) => {
      if (err) {
        reject(new DatabaseError());
      } else if (object) {
        resolve(object);
      } else {
        resolve(false);
      }
    })
  );
};

module.exports = existenceVerifier;
