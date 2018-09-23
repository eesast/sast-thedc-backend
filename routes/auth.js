const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const authConfig = require("../config/auth");
const User = require("../models/user");
const DatabaseError = require("../errors/DatabaseError");
const existenceVerifier = require("../helpers/existenceVerifier");

const router = express.Router();

/**
 * POST
 * 登录
 * @returns {String} token
 */
router.post("/", async (req, res) => {
  if (!req.body.username || !req.body.password) {
    res
      .status(422)
      .send("422 Unprocessable Entity: Missing essential post data.");
  } else {
    let user;
    try {
      user = await existenceVerifier(User, { username: req.body.username });
    } catch (e) {
      if (e instanceof DatabaseError) {
        return res.status(500).send("500 Internal Server Error.");
      }
      throw e;
    }
    if (!user) {
      return res.status(404).send("404 Not Found: User does not exist.");
    }

    const isPasswordValid = bcrypt.compareSync(
      req.body.password,
      user.password
    );
    if (!isPasswordValid) {
      return res.status(401).send({ auth: false, token: null });
    }

    const token = jwt.sign({ id: user._id }, authConfig.secret, {
      expiresIn: "1h"
    });
    return res
      .status(200)
      .send({ auth: true, token, id: user._id, username: user.username });
  }
});

module.exports = router;
