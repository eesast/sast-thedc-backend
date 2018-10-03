const express = require("express");
const _ = require("lodash");
const Team = require("../models/team");
const User = require("../models/user");
const Site = require("../models/site");
const existenceVerifier = require("../helpers/existenceVerifier");
const DatabaseError = require("../errors/DatabaseError");
const verifyToken = require("../middlewares/verifyToken");
const appointmentConfig = require("../config/appointment");

const router = express.Router();

/**
 * GET
 * 获得所有场地，可使用参数过滤。
 * @param {Number} begin 分页用
 * @param {Number} end 分页用
 * @returns {JSON[]} 场地列表
 */
router.get("/", verifyToken, async (req, res) => {
  const begin = req.query.begin || 1;
  const end = req.query.end || Number.MAX_SAFE_INTEGER;

  let query;
  query = Site.find({})
    .skip(begin - 1)
    .limit(end - begin + 1);

  query.exec((err, sites) => {
    if (err) {
      res.status(500).send("500 Internal Server Error.");
    } else {
      const result = sites.map(n => {
        let site = {};
        site.id = n._id;
        site.name = n.name;
        site.description = n.description;
        site.capacity = n.capacity;
        site.minDuration = n.minDuration;
        site.maxDuration = n.maxDuration;
        site.appointments = n.appointments;
        return site;
      });
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.status(200).end(JSON.stringify(result));
    }
  });
});

/**
 * GET
 * 获得特定场地。
 * @param {String} id 场地 ID
 * @returns {JSON} 特定场地
 */
router.get("/:id", verifyToken, async (req, res) => {
  Site.findById(req.params.id, (err, site) => {
    if (err) {
      res.status(500).send("500 Internal Server Error.");
    } else if (!site) {
      res.status(404).send("404 Not Found: Site does not exist.");
    } else {
      let returnedSite = {};
      returnedSite.id = site._id;
      returnedSite.name = site.name;
      returnedSite.description = site.description;
      returnedSite.capacity = site.capacity;
      returnedSite.minDuration = site.minDuration;
      returnedSite.maxDuration = site.maxDuration;
      returnedSite.appointments = site.appointments;
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.status(200).end(JSON.stringify(returnedSite));
    }
  });
});

/**
 * POST
 * 新增场地。
 * @param {Team} req.body
 * @returns {String} Location header.
 */
router.post("/", verifyToken, async (req, res) => {
  try {
    if (!(await existenceVerifier(User, { _id: req.id, group: "admin" }))) {
      // 只有管理员能进行本操作。
      return res
        .status(401)
        .send("401 Unauthorized: Insufficient permissions.");
    }
    if (await existenceVerifier(Site, { name: req.body.name })) {
      res.setHeader("Location", "/sites");
      return res.status(409).send("409 Conflict: Site name already exists.");
    }
  } catch (e) {
    if (e instanceof DatabaseError) {
      return res.status(500).send("500 Internal Server Error.");
    }
    throw e;
  }

  delete req.body.appointments;
  req.body.createdAt = new Date().toISOString();

  const newSite = new Site(req.body);
  newSite.save((err, site) => {
    if (err) {
      if (err.name === "ValidationError") {
        handleValidationError(err, res);
      } else {
        res.status(500).send("500 Internal Server Error.");
      }
    } else {
      res.setHeader("Location", "/sites/" + site._id);
      res.status(201).send("201 Created.");
    }
  });
});

/**
 * PUT
 * 更新场地。
 * @param {String} id 需要更新的场地 ID
 * @returns No Content 或 Not Found
 */
// TODO: 判断预约中指定 teamId 的队伍是否存在，以及限制预约次数。
// TODO: 更新 appointment 有效性判定规则，使符合新要求（与 POST 一致）。
router.put("/:id", verifyToken, async (req, res) => {
  let site;
  try {
    if (!(await existenceVerifier(User, { _id: req.id, group: "admin" }))) {
      // 只有管理员能进行本操作。
      return res
        .status(401)
        .send("401 Unauthorized: Insufficient permissions.");
    }
    site = await existenceVerifier(Site, { _id: req.params.id });
    if (!site) {
      return res.status(404).send("404 Not Found: Site does not exist.");
    }
    if (
      req.body.name !== site.name &&
      (await existenceVerifier(Site, { name: req.body.name }))
    ) {
      return res.status(409).send("409 Conflict: Site name already exists.");
    }
  } catch (e) {
    if (e instanceof DatabaseError) {
      return res.status(500).send("500 Internal Server Error.");
    }
    throw e;
  }

  if (req.body.appointments) {
    // 若存在 appointments 字段则检验其有效性。
    if (req.body.appointments.length !== 0) {
      req.body.appointments.sort(
        (a, b) => new Date(a.startTime) - new Date(b.startTime)
      );
      // 检验预约时长。
      let duration =
        new Date(req.body.appointments[0].endTime) -
        new Date(req.body.appointments[0].startTime);
      const minDuration = (req.body.minDuration || site.minDuration) * 60000;
      const maxDuration = (req.body.maxDuration || site.maxDuration) * 60000;
      let isAppointmentValid =
        req.body.appointments[0].teamId != undefined &&
        duration >= minDuration &&
        duration <= maxDuration;

      for (let i = 1; i < req.body.appointments.length; ++i) {
        duration =
          new Date(req.body.appointments[i].endTime) -
          new Date(req.body.appointments[i].startTime);
        isAppointmentValid =
          isAppointmentValid &&
          req.body.appointments[i].teamId != undefined &&
          duration >= minDuration &&
          duration <= maxDuration &&
          new Date(req.body.appointments[i - 1].endTime) <=
            new Date(req.body.appointments[i].startTime);
      }
      if (!isAppointmentValid) {
        return res.status(400).send("400 Bad Request: Invalid appointments.");
      }
    } else {
      site.appointments = [];
    }
  }

  delete req.body.createdAt;
  _.merge(site, req.body);
  Object.entries(req.body).forEach(([key]) => site.markModified(key));

  site.save(err => {
    if (err) {
      if (err.name === "ValidationError") {
        handleValidationError(err, res);
      } else {
        res.status(500).send("500 Internal Server Error.");
      }
    } else {
      res.status(204).send("204 No Content.");
    }
  });
});

/**
 * DELETE
 * 删除特定场地。
 * @param {String} id 删除场地的 ID
 * @returns No Content 或 Not Found
 */
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    // 只有管理员能够删除场地。
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

  Site.findByIdAndDelete(req.params.id, (err, site) => {
    if (err) {
      res.status(500).send("500 Internal Server Error.");
    } else if (!site) {
      res.status(404).send("404 Not Found: Site does not exist.");
    } else {
      res.status(204).send("204 No Content.");
    }
  });
});

/**
 * GET
 * 获取特定场地的预约，可使用参数过滤。
 * @param {String} id 场地 ID
 * @param {Date} startTime 起始时间
 * @param {Date} endTime 结束时间
 * @returns {JSON[]} 预约列表
 */
router.get("/:id/appointments/", verifyToken, async (req, res) => {
  let site;
  const startTime = new Date(req.query.startTime || 0);
  const endTime = new Date(req.query.endTime || "2048-12-12");

  // 检查时间是否合法。
  if (!(startTime < endTime)) {
    return res.status(400).send("400 Bad Request: Invalid appointment time.");
  }
  try {
    site = await existenceVerifier(Site, { _id: req.params.id });
  } catch (e) {
    if (e instanceof DatabaseError) {
      return res.status(500).send("500 Internal Server Error.");
    }
    throw e;
  }
  if (!site) {
    return res.status(404).send("404 Not Found: Site does not exist.");
  }

  // 聚合在时间段内的预约记录。
  Site.aggregate(
    [
      {
        $unwind: "$appointments"
      },
      {
        $match: {
          "appointments.startTime": {
            $gt: startTime,
            $lt: endTime
          }
        }
      },
      {
        $group: {
          _id: null,
          appointments: {
            $push: {
              teamId: "$appointments.teamId",
              startTime: "$appointments.startTime",
              endTime: "$appointments.endTime"
            }
          }
        }
      }
    ],
    (err, result) => {
      if (err) {
        res.status(500).send("500 Internal Server Error.");
      } else if (!(result && result[0])) {
        res.status(200).end(JSON.stringify([]));
      } else {
        res.status(200).end(JSON.stringify(result[0].appointments));
      }
    }
  );
});

/**
 * POST
 * 新增预约。
 * @param {String} id 预约场地的 ID
 * @returns {String} Created
 */
router.post("/:id/appointments/", verifyToken, async (req, res) => {
  let team;
  let site;
  if (!(req.body.startTime && req.body.endTime)) {
    return res
      .status(422)
      .send("422 Unprocessable Entity: Missing essential post data.");
  }

  const startTime = new Date(req.body.startTime);
  const endTime = new Date(req.body.endTime);

  try {
    site = await existenceVerifier(Site, { _id: req.params.id });
    if (!site) {
      return res.status(404).send("404 Not Found: Site does not exist.");
    }

    team = await existenceVerifier(Team, { members: { $in: req.id } });
    if (!team) {
      return res.status(400).send("400 Bad Request: User is not in a team.");
    }
    if (team.captain !== req.id) {
      return res
        .status(401)
        .send("401 Unauthorized: Insufficient permissions.");
    }

    // 检验预约时长。
    const duration = endTime - startTime;
    const minDuration = (req.body.minDuration || site.minDuration) * 60000;
    const maxDuration = (req.body.maxDuration || site.maxDuration) * 60000;
    if (!(duration >= minDuration && duration <= maxDuration)) {
      return res.status(400).send("400 Bad Request: Invalid appointment.");
    }

    // 检验该队伍总有效预约数量是否超出。
    let appointmentCount;
    await Site.aggregate([
      {
        $unwind: "$appointments"
      },
      {
        $match: {
          "appointments.teamId": team._id,
          "appointments.startTime": {
            $gt: new Date()
          }
        }
      },
      {
        $group: {
          _id: null,
          count: { $sum: 1 }
        }
      }
    ]).then(result => {
      if (!(result && result[0])) {
        appointmentCount = 0;
      } else {
        appointmentCount = result[0].count;
      }
    });

    if (appointmentCount >= appointmentConfig.maxAppointments) {
      return res
        .status(403)
        .send("403 Forbidden: The number of appointments exceeds.");
    }

    // 队伍在请求的时间段不应该已经有预约了。
    if (
      await existenceVerifier(Site, {
        $or: [
          {
            "appointments.startTime": {
              $gte: startTime,
              $lt: endTime
            }
          },
          {
            "appointments.endTime": {
              $gt: startTime,
              $lte: endTime
            }
          }
        ]
      })
    ) {
      return res
        .status(409)
        .send(
          "409 Conflict: The team already has an appointment during this period."
        );
    }

    // 统计该场地该时间段内的最大队伍重叠数。
    let maxOverlap = 0;
    // 查找该场地时间段内的所有预约。
    await Site.aggregate([
      {
        $unwind: "$appointments"
      },
      {
        $match: {
          _id: site._id,
          $or: [
            {
              "appointments.startTime": {
                $gte: startTime,
                $lt: endTime
              }
            },
            {
              "appointments.endTime": {
                $gt: startTime,
                $lte: endTime
              }
            }
          ]
        }
      },
      {
        $group: {
          _id: null,
          startTime: { $push: "$appointments.startTime" },
          endTime: { $push: "$appointments.endTime" }
        }
      }
    ]).then(result => {
      if (!(result && result[0])) {
        maxOverlap = 0;
      } else {
        // 求最大重叠数。
        let overlap = 0;
        const teamCount = result[0].startTime.length;
        result[0].startTime.sort();
        result[0].endTime.sort();
        let i = 0,
          j = 0;
        while (i < teamCount && j < teamCount) {
          let tmp = result[0].startTime[i] - result[0].endTime[j];
          if (tmp == 0) {
            ++i;
            ++j;
          } else if (tmp < 0) {
            ++i;
            ++overlap;
          } else {
            ++j;
            --overlap;
          }
          if (overlap > maxOverlap) maxOverlap = overlap;
        }
      }
    });

    // 最大重叠数不应超过场地容纳量。
    if (maxOverlap >= site.capacity) {
      return res
        .status(409)
        .send("409 Conflict: The site has reached its maximum capacity.");
    }
  } catch (e) {
    if (e instanceof DatabaseError) {
      return res.status(500).send("500 Internal Server Error.");
    }
    throw e;
  }

  await Site.update(
    { _id: site._id },
    {
      $push: {
        appointments: {
          teamId: team._id,
          startTime: startTime,
          endTime: endTime
        }
      }
    },
    err => {
      if (err) {
        res.status(500).send("500 Internal Server Error.");
      } else {
        res.status(201).send("201 Created.");
      }
    }
  );
});

/**
 * DELETE
 * 删除预约。
 * @param {Number} id 场地 ID
 * @param {Number} teamId 队伍 ID
 * @param {Date} startTime 要删除的预约的开始时间
 * @returns {String} No Content 或 Not Found
 */
router.delete("/:id/appointments", verifyToken, async (req, res) => {
  let isAdmin;
  let team;

  if (!req.query.startTime || !req.query.teamId) {
    return res
      .status(422)
      .send("422 Unprocessable Entity: Missing essential post data.");
  }
  try {
    site = await existenceVerifier(Site, { _id: req.params.id });
    team = await existenceVerifier(Team, { _id: req.query.teamId });
    isAdmin = await existenceVerifier(User, { _id: req.id, group: "admin" });
    if (!site) {
      return res.status(404).send("404 Not Found: Site does not exist.");
    }
    if (!team) {
      return res.status(404).send("404 Not Found: Team does not exist");
    }
    // 仅有队长或管理员能取消预约。
    if (team.captain !== req.id || !isAdmin) {
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

  await Site.update(
    { _id: req.params.id },
    {
      $pull: {
        appointments: {
          teamId: team._id,
          startTime: new Date(req.query.startTime)
        }
      }
    },
    (err, raw) => {
      if (err) {
        res.status(500).send("500 Internal Server Error.");
      } else if (raw["nModified"] === 0) {
        res.status(404).send("404 Not Found: No such appointment.");
      } else {
        res.status(204).send("204 No Content.");
      }
    }
  );
});

function handleValidationError(err, res) {
  const messages = [];
  for (let field in err.errors) {
    messages.push(err.errors[field].message);
  }
  res.status(422).json({ messages });
}

module.exports = router;
