const express = require("express");
const _ = require("lodash");
const Article = require("../models/article");
const existenceVerifier = require("../helpers/existenceVerifier");

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
      res.status(500).send("500 Internal server error.");
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
      res.status(500).send("500 Internal server error.");
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
// TODO: Add situation when same ID submit.
router.post("/", async (req, res) => {
  // req.body.createdBy = req.id;
  const newArticle = new Article(req.body);
  newArticle.save((err, article) => {
    if (err) {
      res.status(500).send("500 Internal server error.");
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
router.put("/:id", async (req, res) => {
  const articleExists = await existenceVerifier(Article, {
    _id: req.params.id
  });

  if (articleExists === null) {
    res.status(500).send("500 Internal server error.");
  } else if (articleExists === false) {
    res.status(404).send("404 Not Found: Article does not exist.");
  } else {
    const article = articleExists;
    _.merge(article, req.body);
    Object.entries(req.body).forEach(([key]) => article.markModified(key));
    article.updatedAt = new Date().toISOString();
    // article.updatedBy = req.id;

    article.save(err => {
      if (err) {
        res.status(500).send("500 Internal server error.");
      } else {
        res.status(204).send("204 No Content.");
      }
    });
  }
});

/**
 * DELETE
 * 删除特定文章。
 * @param {String} id 删除文章的 ID
 * @returns No Content 或 Not Found
 */
router.delete("/:id", (req, res) => {
  Article.findByIdAndDelete(req.params.id, (err, article) => {
    if (err) {
      res.status(500).send("500 Internal server error.");
    } else if (!article) {
      res.status(404).send("404 Not Found: Article does not exist.");
    } else {
      res.status(204).send("204 No Content.");
    }
  });
});

module.exports = router;
