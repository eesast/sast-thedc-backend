const express = require("express");
const _ = require("lodash");
const Team = require("../models/team");
const User = require("../models/user");
const existenceVerifier = require("../helpers/existenceVerifier");
const DatabaseError = require("../errors/DatabaseError");
const verifyToken = require("../middlewares/verifyToken");

const router = express.Router();

/**
 * GET
 * 获得所有队伍，可使用参数过滤。
 * @param {String} sort 排序方式
 * @param {Number} begin 分页用
 * @param {Number} end 分页用
 * @returns {JSON[]} 队伍列表
 */
router.get("/", verifyToken, async (req, res) => {
  let isAdmin;
  let memberOf;
  try {
    isAdmin = await existenceVerifier(User, { _id: req.id, group: "admin" });
    memberOf = (await existenceVerifier(Team, { members: { $in: req.id } }))
      ._id;
  } catch (e) {
    if (e instanceof DatabaseError) {
      return res.status(500).send("500 Internal Server Error.");
    }
    throw e;
  }

  const begin = req.query.begin || 1;
  const end = req.query.end || Number.MAX_SAFE_INTEGER;
  const sort = req.query.sort || "ascending";

  let query;
  query = Team.find({})
    .skip(begin - 1)
    .limit(end - begin + 1);

  query.exec((err, teams) => {
    if (err) {
      res.status(500).send("500 Internal Server Error.");
    } else {
      const result = teams.map(n => {
        let team = {};
        team.id = n._id;
        team.name = n.name;
        team.description = n.description;
        team.members = n.members;
        team.captain = n.captain;
        team.createdAt = n.createdAt;
        // 管理员可看到邀请码，自己可以看到自己队的邀请码。
        if (isAdmin || memberOf === n._id) {
          team.inviteCode = n.inviteCode;
        }
        return team;
      });
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.status(200).end(JSON.stringify(result));
    }
  });
});

/**
 * GET
 * 获得特定队伍。
 * @param {String} id 队伍 ID
 * @returns {JSON} 特定文章
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

  Team.findById(req.params.id, (err, team) => {
    if (err) {
      res.status(500).send("500 Internal Server Error.");
    } else if (!team) {
      res.status(404).send("404 Not Found: Team does not exist.");
    } else {
      let returnedTeam = {};
      returnedTeam.id = team._id;
      returnedTeam.name = team.name;
      returnedTeam.description = team.description;
      returnedTeam.members = team.members;
      returnedTeam.captain = team.captain;
      returnedTeam.createdAt = team.createdAt;
      // 管理员可看到邀请码，自己可以看到自己队的邀请码。
      if (isAdmin || team.members.indexOf(req.id) !== -1) {
        returnedTeam.inviteCode = team.inviteCode;
      }
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.status(200).end(JSON.stringify(returnedTeam));
    }
  });
});

/**
 * POST
 * 新增队伍。
 * @param {Team} req.body
 * @returns {String} Location header & Invite code.
 */
router.post("/", verifyToken, async (req, res) => {
  try {
    if (!req.body.name) {
      return res
        .status(422)
        .send("422 Unprocessable Entity: Missing essential post data.");
    }
    if (await existenceVerifier(Team, { name: req.body.name })) {
      res.setHeader("Location", "/teams");
      return res.status(409).send("409 Conflict: Team name already exists.");
    }
    if (await existenceVerifier(Team, { members: { $in: req.id } })) {
      res.setHeader("Location", "/teams");
      return res.status(409).send("409 Conflict: User is already in a team.");
    }
  } catch (e) {
    if (e instanceof DatabaseError) {
      return res.status(500).send("500 Internal Server Error.");
    }
    throw e;
  }

  req.body.members = [req.id];
  req.body.captain = req.id;
  req.body.createdAt = new Date().toISOString();
  // 随机生成 8 位邀请码。
  req.body.inviteCode = Math.random()
    .toString(36)
    .slice(2, 10);

  const newTeam = new Team(req.body);
  newTeam.save((err, team) => {
    if (err) {
      res.status(500).send("500 Internal Server Error.");
    } else {
      res.setHeader("Location", "/teams/" + team._id);
      res.status(201).send({ inviteCode: team.inviteCode });
    }
  });
});

/**
 * PUT
 * 更新队伍。
 * @param {String} id 需要更新的文章 ID
 * @returns {String} Location header 或 空
 */
router.put("/:id", verifyToken, async (req, res) => {
  let isAdmin;
  let team;
  try {
    isAdmin = await existenceVerifier(User, { _id: req.id, group: "admin" });
    team = await existenceVerifier(Team, { _id: req.params.id });
  } catch (e) {
    if (e instanceof DatabaseError) {
      return res.status(500).send("500 Internal Server Error.");
    }
    throw e;
  }
  if (!team) {
    return res.status(404).send("404 Not Found: Team does not exist.");
  }

  // 权限检查。
  if (!isAdmin) {
    // 只有管理员能更改队伍名和直接更改队伍成员。
    delete req.body.name;
    delete req.body.members;
    if (req.id !== team.captain) {
      return res
        .status(401)
        .send("401 Unauthorized: Insufficient permissions.");
    }
  }

  // 创建时间和邀请码不可更改。
  delete req.body.createdAt;
  delete req.body.inviteCode;

  try {
    // 成员存在且未加入其他队伍时才合法。
    if (req.body.members) {
      let isMemberValid = req.body.members.length < 5;
      isMemberValid =
        isMemberValid &&
        (await req.body.members.reduce(
          async (prev, cur) =>
            prev &&
            (await existenceVerifier(User, { _id: cur })) &&
            !(await existenceVerifier(
              Team,
              { _id: { $ne: req.params.id } },
              { members: { $in: cur } }
            )),
          true
        ));
      if (!isMemberValid) {
        return res.status(400).send("400 Bad Request: Invalid members.");
      }
    }

    if (
      req.body.name !== team.name &&
      (await existenceVerifier(Team, { name: req.body.name }))
    ) {
      return res.status(409).send("409 Conflict: Team name already exists.");
    }
  } catch (e) {
    if (e instanceof DatabaseError) {
      return res.status(500).send("500 Internal Server Error.");
    }
    throw e;
  }

  // 检验队长是否合法。
  const members = req.body.members || team.members;
  if (members.indexOf(req.body.captain || team.captain) === -1) {
    return res
      .status(400)
      .send("400 Bad Request: Captain is not a member of the team.");
  }

  _.merge(team, req.body);
  Object.entries(req.body).forEach(([key]) => team.markModified(key));

  team.save(err => {
    if (err) {
      res.status(500).send("500 Internal Server Error.");
    } else {
      res.status(204).send("204 No Content.");
    }
  });
});

/**
 * DELETE
 * 删除特定队伍。
 * @param {String} id 删除队伍的 ID
 * @returns No Content 或 Not Found
 */
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    // 只有管理员或队长能够删除队伍。
    const team = await existenceVerifier(Team, { _id: req.params.id });
    if (
      !(
        team.captain === req.id ||
        (await existenceVerifier(User, { _id: req.id, group: "admin" }))
      )
    ) {
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

  Team.deleteOne({ _id: req.params.id }, err => {
    if (err) {
      res.status(500).send("500 Internal Server Error.");
    } else {
      res.status(204).send("204 No Content.");
    }
  });
});

/**
 * GET
 * 获取特定队伍的成员。
 * @param {String} id 队伍 ID
 * @returns {JSON[]} 成员列表
 */
router.get("/:id/members/", verifyToken, async (req, res) => {
  let team;
  try {
    team = await existenceVerifier(Team, { _id: req.params.id });
  } catch (e) {
    if (e instanceof DatabaseError) {
      return res.status(500).send("500 Internal Server Error.");
    }
    throw e;
  }
  if (!team) {
    return res.status(404).send("404 Not Found: Team does not exist.");
  }

  res.status(200).end(JSON.stringify(team.members));
});

/**
 * POST
 * 加入队伍。
 * @param {String} id 请求加入的队伍的 ID
 * @param {String} inviteCode 请求加入的队伍的邀请码
 * @returns {String} Location header
 */
router.post("/:id/members/", verifyToken, async (req, res) => {
  let team;
  let isFree;
  if (!req.query.inviteCode) {
    return res
      .status(422)
      .send("422 Unprocessable Entity: Missing essential post data.");
  }

  try {
    team = await existenceVerifier(Team, { _id: req.params.id });
    isFree = !(await existenceVerifier(Team, { members: { $in: req.id } }));
  } catch (e) {
    if (e instanceof DatabaseError) {
      return res.status(500).send("500 Internal Server Error.");
    }
    throw e;
  }
  if (!team) {
    return res.status(404).send("404 Not Found: Team does not exist.");
  }
  if (team.members.length > 3) {
    return res.status(409).send("409 Conflict: The number of members exceeds.");
  }
  if (!isFree) {
    return res.status(409).send("409 Conflict: User is already in a team.");
  }
  if (team.inviteCode !== req.query.inviteCode) {
    return res.status(403).send("403 Forbidden: Incorrect invite code.");
  }

  team.members.push(req.id);
  team.markModified("members");
  team.save(err => {
    if (err) {
      res.status(500).send("500 Internal Server Error.");
    } else {
      res.setHeader(
        "Location",
        "/teams/" + req.params.id + "/members/" + req.id
      );
      res.status(201).send("201 Created.");
    }
  });
});

/**
 * DELETE
 * 删除队伍成员。
 * @param {Number} id 队伍 ID
 * @param {Number} uid 要删除的成员的 ID
 * @returns {String} No Content 或 Not Found
 */
router.delete("/:id/members/:uid", verifyToken, async (req, res) => {
  let isAdmin;
  let team;
  try {
    isAdmin = await existenceVerifier(User, { _id: req.id, group: "admin" });
    team = await existenceVerifier(Team, { _id: req.params.id });
  } catch (e) {
    if (e instanceof DatabaseError) {
      return res.status(500).send("500 Internal Server Error.");
    }
    throw e;
  }
  const indexOfMember = team.members.indexOf(req.params.uid);
  if (!team) {
    return res.status(404).send("404 Not Found: Team does not exist.");
  }
  if (indexOfMember === -1) {
    return res.status(404).send("404 Not Found: Member does not exist.");
  }
  if (req.params.uid == team.captain) {
    return res.status(400).send("400 Bad Request: Captain cannot be deleted.");
  }
  if (req.id !== team.captain && req.id != req.params.uid && !isAdmin) {
    // 队长、管理员可以移除成员，用户自己可以退出队伍。
    return res.status(401).send("401 Unauthorized: Insufficient permissions.");
  }

  team.members.splice(indexOfMember, 1);
  team.markModified("members");
  team.save(err => {
    if (err) {
      res.status(500).send("500 Internal Server Error.");
    } else {
      res.status(204).send("204 No Content.");
    }
  });
});

module.exports = router;
