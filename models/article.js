const mongoose = require("mongoose");

const articleSchema = new mongoose.Schema(
  {
    title: String
  },
  {
    collection: "articles"
  }
);

const Article = mongoose.model("Article", articleSchema);

module.exports = Article;
