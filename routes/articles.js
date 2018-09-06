const express = require("express");
const _ = require("lodash");
const Article = require("../models/article");
const User = require("../models/user");
const existenceVerifier = require("../helpers/existenceVerifier");
const DatabaseError = require("../errors/DatabaseError");
const verifyToken = require("../middlewares/verifyToken");

const router = express.Router();

/**
 * GET
 * 获得所有文章，可使用参数过滤。
 * @param {String} sort 排序方式
 * @param {Number} begin 分页用
 * @param {Number} end 分页用
 * @returns {JSON[]} 文章列表
 */
router.get("/", (req, res) => {
  const begin = req.query.begin || 1;
  const end = req.query.end || Number.MAX_SAFE_INTEGER;
  const sort = req.query.sort || "descending";

  let query;
  query = Article.find({})
    .sort({ createdAt: sort })
    .skip(begin - 1)
    .limit(end - begin + 1);

  query.exec((err, articles) => {
    if (err) {
      res.status(500).send("500 Internal Server Error.");
    } else {
      const result = articles.map(n => {
        let article = {};
        article.id = n._id;
        article.title = n.title;
        article.content = n.content;
        article.attachments = n.attachments;
        article.tags = n.tags;
        article.createdAt = n.createdAt;
        article.createdBy = n.createdBy;
        return article;
      });
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.status(200).end(JSON.stringify(result));
    }
  });
});

/**
 * GET
 * 获得特定文章。
 * @param {String} id 文章 ID
 * @returns {JSON} 特定文章
 */
router.get("/:id", (req, res) => {
  Article.findById(req.params.id, (err, article) => {
    if (err) {
      res.status(500).send("500 Internal Server Error.");
    } else if (!article) {
      res.status(404).send("404 Not Found: article does not exist.");
    } else {
      let returnedArticle = {};
      returnedArticle.id = article._id;
      returnedArticle.title = article.title;
      returnedArticle.content = article.content;
      returnedArticle.attachments = article.attachments;
      returnedArticle.tags = article.tags;
      returnedArticle.createdAt = article.createdAt;
      returnedArticle.createdBy = article.createdBy;

      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.status(200).end(JSON.stringify(returnedArticle));
    }
  });
});

/**
 * POST
 * 新增文章。
 * @param {Article} req.body
 * @returns {String} Location header
 */
router.post("/", verifyToken, async (req, res) => {
  try {
    // 只有管理员能够发布文章。
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

  req.body.createdBy = req.id;
  req.createdAt = new Date().toISOString();
  req.body.updatedBy = req.id;
  req.updatedAt = req.createdAt;
  const newArticle = new Article(req.body);
  newArticle.save((err, article) => {
    if (err) {
      res.status(500).send("500 Internal Server Error.");
    } else {
      res.setHeader("Location", "/articles/" + article._id);
      res.status(201).send("201 Created.");
    }
  });
});

/**
 * PUT
 * 更新文章。
 * @param {String} id 需要更新的文章 ID
 * @returns {String} Location header 或 空
 */
router.put("/:id", verifyToken, async (req, res) => {
  let article;
  try {
    // 只有管理员能够更新文章。
    if (!(await existenceVerifier(User, { _id: req.id, group: "admin" }))) {
      return res
        .status(401)
        .send("401 Unauthorized: Insufficient permissions.");
    }
    article = await existenceVerifier(Article, {
      _id: req.params.id
    });
    if (!article) {
      return res.status(404).send("404 Not Found: Article does not exist.");
    }
  } catch (e) {
    if (e instanceof DatabaseError) {
      return res.status(500).send("500 Internal Server Error.");
    }
    throw e;
  }
  delete req.body.createdBy;
  delete req.body.createdAt;
  req.body.updatedAt = new Date().toISOString();
  req.body.updatedBy = req.id;

  _.merge(article, req.body);
  Object.entries(req.body).forEach(([key]) => article.markModified(key));

  article.save(err => {
    if (err) {
      res.status(500).send("500 Internal Server Error.");
    } else {
      res.status(204).send("204 No Content.");
    }
  });
});

/**
 * DELETE
 * 删除特定文章。
 * @param {String} id 删除文章的 ID
 * @returns No Content 或 Not Found
 */
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    // 只有管理员能够删除文章。
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

  Article.findByIdAndDelete(req.params.id, (err, article) => {
    if (err) {
      res.status(500).send("500 Internal Server Error.");
    } else if (!article) {
      res.status(404).send("404 Not Found: Article does not exist.");
    } else {
      res.status(204).send("204 No Content.");
    }
  });
});

module.exports = router;
