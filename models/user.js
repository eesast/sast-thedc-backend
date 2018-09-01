/**
 * 用户
 */

/**
  用户示例

  User
  {
    group: 'user'
    username: 'piglet',
    password: '7ads21Adsa', // MD5 哈希
    email: 'zhangsan16@mails.tsinghua.edu.cn',
    phone: 15600000000,

    realname: '张三',
    studentId: 2016011000,
    department: '电子系'
    class: '无61',

    createdAt: '2018-05-16T17:01:42.346Z',
  }
*/

const mongoose = require("mongoose");
const autoIncrement = require("mongoose-auto-increment");

const userSchema = new mongoose.Schema(
  {
    username: String,
    group: { type: String, default: "user" },
    password: String,
    email: String,
    phone: Number,

    department: String,
    class: String,
    realname: String,
    studentId: Number,

    createdAt: { type: Date, default: Date.now }
  },
  {
    collection: "users"
  }
);

userSchema.plugin(autoIncrement.plugin, "User");
const User = mongoose.model("User", userSchema);

module.exports = User;
