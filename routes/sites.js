const express = require("express");
const _ = require("lodash");
const Team = require("../models/team");
const User = require("../models/user");
const Site = require("../models/site");
const existenceVerifier = require("../helpers/existenceVerifier");
const DatabaseError = require("../errors/DatabaseError");
const verifyToken = require("../middlewares/verifyToken");

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
    if (!req.body.name) {
      return res
        .status(422)
        .send("422 Unprocessable Entity: Missing essential post data.");
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
      res.status(500).send("500 Internal Server Error.");
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
      let duration =
        new Date(req.body.appointments[0].endTime) -
        new Date(req.body.appointments[0].startTime);
      // 预约时长不超过 2 小时。
      let isAppointmentValid =
        req.body.appointments[0].teamId != undefined &&
        duration > 0 &&
        duration <= 7200000;

      for (let i = 1; i < req.body.appointments.length; ++i) {
        duration =
          new Date(req.body.appointments[i].endTime) -
          new Date(req.body.appointments[i].startTime);
        isAppointmentValid =
          isAppointmentValid &&
          req.body.appointments[i].teamId != undefined &&
          duration > 0 &&
          duration <= 7200000 &&
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
      res.status(500).send("500 Internal Server Error.");
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

    let duration = new Date(req.body.endTime) - new Date(req.body.startTime);
    // 预约时长不超过 2 小时。
    let isAppointmentValid = duration > 0 && duration <= 7200000;
    // 与其他预约记录比对时间，检验预约有效性。
    isAppointmentValid =
      isAppointmentValid &&
      !(await existenceVerifier(Site, {
        _id: req.params.id,
        appointments: {
          $elemMatch: {
            startTime: {
              $lt: new Date(req.body.endTime)
            },
            endTime: {
              $gt: new Date(req.body.startTime)
            }
          }
        }
      }));
    if (!isAppointmentValid) {
      return res.status(400).send("400 Bad Request: Invalid appointment.");
    }

    // 每队每天的预约次数不能超过 3 次。
    const appointmentDate = new Date(
      new Date(req.body.startTime).toLocaleDateString()
    );
    let appointmentCount;
    await Site.aggregate([
      {
        $unwind: "$appointments"
      },
      {
        $match: {
          "appointments.teamId": team._id,
          "appointments.startTime": {
            $gt: appointmentDate,
            $lt: new Date(appointmentDate.getTime() + 86400000)
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

    if (appointmentCount > 2) {
      return res
        .status(403)
        .send("403 Forbidden: The number of appointments per day exceeds.");
    }
  } catch (e) {
    if (e instanceof DatabaseError) {
      return res.status(500).send("500 Internal Server Error.");
    }
    throw e;
  }

  site.appointments.push({
    teamId: team._id,
    startTime: req.body.startTime,
    endTime: req.body.endTime
  });
  site.markModified("appointments");
  site.save(err => {
    if (err) {
      res.status(500).send("500 Internal Server Error.");
    } else {
      res.status(201).send("201 Created.");
    }
  });
});

/**
 * DELETE
 * 删除预约。
 * @param {Number} id 场地 ID
 * @param {Date} uid 要删除的预约的开始时间
 * @returns {String} No Content 或 Not Found
 */
router.delete("/:id/appointments", verifyToken, async (req, res) => {
  let isAdmin;
  let team;

  if (!req.query.startTime) {
    return res
      .status(422)
      .send("422 Unprocessable Entity: Missing essential post data.");
  }
  try {
    site = await existenceVerifier(Site, { _id: req.params.id });
    isAdmin = await existenceVerifier(User, { _id: req.id, group: "admin" });
    if (!site) {
      return res.status(404).send("404 Not Found: Site does not exist.");
    }

    team = await existenceVerifier(Team, { members: { $in: req.id } });
    if (!team) {
      return res.status(400).send("400 Bad Request: User is not in a team.");
    }
  } catch (e) {
    if (e instanceof DatabaseError) {
      return res.status(500).send("500 Internal Server Error.");
    }
    throw e;
  }

  // 查找是否有对应预约。
  let isAppointmentFound = false;
  for (let index in site.appointments) {
    if (
      site.appointments[index].startTime - new Date(req.query.startTime) ===
      0
    ) {
      isAppointmentFound = true;
      // 仅有队长或管理员能取消预约。
      if (site.appointments[index].teamId === team._id || isAdmin) {
        site.appointments.splice(index, 1);
      } else {
        return res
          .status(401)
          .send("401 Unauthorized: Insufficient permissions.");
      }
    }
  }
  if (!isAppointmentFound) {
    return res.status(404).send("404 Not Found: Appointment does not exist.");
  }

  site.markModified("appointments");
  site.save(err => {
    if (err) {
      res.status(500).send("500 Internal Server Error.");
    } else {
      res.status(204).send("204 No Content.");
    }
  });
});

module.exports = router;
