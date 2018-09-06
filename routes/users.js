const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const _ = require("lodash");

const User = require("../models/user");
const Team = require("../models/team");
const existenceVerifier = require("../helpers/existenceVerifier");
const DatabaseError = require("../errors/DatabaseError");
const tokenDecoder = require("../helpers/tokenDecoder");
const verifyToken = require("../middlewares/verifyToken");
const authConfig = require("../config/auth");

const router = express.Router();

/**
 * GET
 * 获得所有用户，可使用参数过滤。
 * @param {String} group 用户组
 * @param {String} department 系别
 * @param {String} class 班级
 * @param {Number} begin 分页用
 * @param {Number} end 分页用
 * @returns {JSON[]} 用户列表
 */
router.get("/", verifyToken, async (req, res) => {
  let isAdmin;
  try {
    isAdmin = await existenceVerifier(User, { _id: req.id, group: "admin" });
  } catch (e) {
    if (e instanceof DatabaseError) {
      return res.status(500).send("500 Internal Server Error.");
    }
    throw e;
  }

  const begin = req.query.begin || 1;
  const end = req.query.end || Number.MAX_SAFE_INTEGER;
  delete req.query.begin;
  delete req.query.end;

  Object.keys(req.query).forEach(
    key => req.query[key] == null && delete req.query[key]
  );

  let query;
  query = User.find(req.query)
    .skip(begin - 1)
    .limit(end - begin + 1);

  query.exec(async (err, users) => {
    if (err) {
      res.status(500).send("500 Internal Server Error.");
    } else {
      let result;
      try {
        result = await Promise.all(
          users.map(async n => {
            let user = {};
            user.id = n._id;
            user.username = n.username;
            user.group = n.group;
            user.email = n.email;
            user.department = n.department;
            user.class = n.class;
            // 管理员可看到隐私信息，自己可以看到自己的隐私信息。
            if (isAdmin || req.id === n._id) {
              user.phone = n.phone;
              user.realname = n.realname;
              user.studentId = n.studentId;
            }
            // 队伍信息。
            let team = await existenceVerifier(Team, {
              members: { $in: n._id }
            });
            if (team) {
              user.team = { id: team._id, isCaptain: team.captain === n._id };
            }

            return user;
          })
        );
      } catch (e) {
        if (e instanceof DatabaseError) {
          return res.status(500).send("500 Internal Server Error.");
        }
        throw e;
      }

      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.status(200).end(JSON.stringify(result));
    }
  });
});

/**
 * GET
 * 获得特定用户。
 * @param {String} id 普通用户 ID
 * @returns {JSON} 特定普通用户信息
 */
router.get("/:id", verifyToken, async (req, res) => {
  let isAdmin;
  try {
    isAdmin = await existenceVerifier(User, { _id: req.id, group: "admin" });
  } catch (e) {
    if (e instanceof DatabaseError) {
      return res.status(500).send("500 Internal Server Error.");
    }
    throw e;
  }
  User.findById(req.params.id, async (err, user) => {
    if (err) {
      res.status(500).send("500 Internal Server Error.");
    } else if (!user) {
      res.status(404).send("404 Not Found: User does not exist.");
    } else {
      let returnedUser = {};
      returnedUser.id = user._id;
      returnedUser.username = user.username;
      returnedUser.group = user.group;
      returnedUser.email = user.email;
      returnedUser.department = user.department;
      returnedUser.class = user.class;
      // 管理员可看到隐私信息，自己可以看到自己的隐私信息。
      if (isAdmin || req.id === user._id) {
        returnedUser.phone = user.phone;
        returnedUser.realname = user.realname;
        returnedUser.studentId = user.studentId;
      }
      try {
        // 队伍信息。
        let team = await existenceVerifier(Team, {
          members: { $in: user._id }
        });
        if (team) {
          returnedUser.team = {
            id: team._id,
            isCaptain: team.captain === user._id
          };
        }
      } catch (e) {
        if (e instanceof DatabaseError) {
          return res.status(500).send("500 Internal Server Error.");
        }
        throw e;
      }

      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.status(200).end(JSON.stringify(returnedUser));
    }
  });
});

/**
 * POST
 * 新增用户。
 * @returns {string} Location header
 * @returns {string} token
 */
router.post("/", async (req, res) => {
  // 字段完备性检验。
  const isCompleted =
    req.body.username &&
    req.body.password &&
    req.body.email &&
    (req.body.group === "admin" ||
      (req.body.phone &&
        req.body.department &&
        req.body.class &&
        req.body.realname &&
        req.body.studentId));
  if (!isCompleted) {
    return res
      .status(422)
      .send("422 Unprocessable Entity: Missing essential post data.");
  }
  try {
    // 只有管理员能创建管理员账户。
    if (req.body.group === "admin") {
      req.id = await tokenDecoder(req.headers["x-access-token"]);
      if (req.id === undefined) {
        return res.status(401).send("401 Unauthorized: Token required.");
      } else if (req.id === null) {
        return res
          .status(401)
          .send("401 Unauthorized: Invalid or expired token.");
      } else {
        if (!(await existenceVerifier(User, { _id: req.id, group: "admin" }))) {
          return res
            .status(401)
            .send("401 Unauthorized: Insufficient permissions.");
        }
      }
    } else {
      req.body.group = "user";
    }

    // 重复用户检验。
    let message;
    let isDuplicated = true;
    if (await existenceVerifier(User, { username: req.body.username })) {
      message = "Username already exists.";
    } else if (await existenceVerifier(User, { email: req.body.email })) {
      message = "Email already exists.";
    } else if (
      req.body.group === "user" &&
      (await existenceVerifier(User, {
        group: "user",
        studentId: req.body.studentId
      }))
    ) {
      message = "Student ID already exists.";
    } else {
      isDuplicated = false;
    }

    if (isDuplicated) {
      res.setHeader("Location", "/users");
      return res.status(409).send("409 Conflict: " + message);
    }
  } catch (e) {
    if (e instanceof DatabaseError) {
      return res.status(500).send("500 Internal Server Error.");
    }
    throw e;
  }

  const hashedPassword = bcrypt.hashSync(req.body.password);
  req.body.password = hashedPassword;
  req.body.createdAt = new Date().toISOString();

  const newUser = new User(req.body);
  newUser.save((err, user) => {
    if (err) {
      res.status(500).send("500 Internal Server Error.");
    } else {
      const token = jwt.sign({ id: user._id }, authConfig.secret, {
        expiresIn: "1h"
      });

      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.setHeader("Location", "/users/" + user._id);
      res.status(201).send({ auth: true, token });
    }
  });
});

/**
 * PUT
 * 更新用户。
 * @param {String} id 需要更新的用户的 ID
 * @returns {String} Location header 或空
 */
router.put("/:id", verifyToken, async (req, res) => {
  let isAdmin;
  let user;
  try {
    isAdmin = await existenceVerifier(User, { _id: req.id, group: "admin" });
    user = await existenceVerifier(User, { _id: req.params.id });
  } catch (e) {
    if (e instanceof DatabaseError) {
      return res.status(500).send("500 Internal Server Error.");
    }
    throw e;
  }
  if (!user) {
    return res.status(404).send("404 Not Found: User does not exist.");
  }

  req.body.group = req.body.group === "admin" ? "admin" : "user";
  // 当跨用户修改或添加管理员权限时，需要管理员权限。
  // 修改真实姓名和学号也需要管理员权限。
  if (!isAdmin) {
    if (req.id != req.params.id || req.body.group === "admin") {
      return res
        .status(401)
        .send("401 Unauthorized: Insufficient permissions.");
    }
  } else {
    delete req.body.realname;
    delete req.body.studentId;
  }
  // 用户名、邮箱和注册时间不能修改。
  delete req.body.username;
  delete req.body.email;
  delete req.body.createdAt;
  _.merge(user, req.body);
  user.password = bcrypt.hashSync(req.body.password);

  user.save(err => {
    if (err) {
      res.status(500).send("500 Internal Server Error.");
    } else {
      res.setHeader("Location", "/users/" + user._id);
      res.status(204).send("204 No Content.");
    }
  });
});

/**
 * DELETE
 * 删除特定用户。
 * @param {String} id 删除用户的 ID
 * @returns No Content 或 Not Found
 */
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    // 只有管理员能够删除用户。
    if (!(await existenceVerifier(User, { _id: req.id, group: "admin" }))) {
      return res
        .status(401)
        .send("401 Unauthorized: Insufficient permissions.");
    }
  } catch (e) {
    if (e instanceof DatabaseError) {
      return res.status(500).send("500 Internal Server Error.");
    }
    throw e;
  }

  User.findOneAndDelete({ _id: req.params.id }, (err, user) => {
    if (err) {
      res.status(500).send("500 Internal Server Error.");
    } else if (!user) {
      res.status(404).send("404 Not Found: User does not exist.");
    } else {
      res.status(204).send("204 No Content.");
    }
  });
});

module.exports = router;
