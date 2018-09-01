const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const authConfig = require("../config/auth");
const User = require("../models/user");
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
    const userExists = await existenceVerifier(User, {
      username: req.body.username
    });

    if (!userExists) {
      return res.status(404).send("404 Not Found: User does not exist.");
    }

    const isPasswordValid = bcrypt.compareSync(
      req.body.password,
      userExists.password
    );
    if (!isPasswordValid) {
      return res.status(401).send({ auth: false, token: null });
    }

    const token = jwt.sign({ id: userExists._id }, authConfig.secret, {
      expiresIn: "1h"
    });
    return res
      .status(200)
      .send({ auth: true, token, username: userExists.username });
  }
});

module.exports = router;
