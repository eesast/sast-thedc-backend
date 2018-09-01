/**
  文章示例

  Notice
  {
    title: 'Test',
    content: 'Hello, world!',
    attachments: ['file1.docx', 'file2.docx'],
    tags: ['Tutorials']
    createdAt: '2018-05-16T17:01:42.346Z',
    createdBy: '张三',
    updatedAt: '2018-05-16T17:01:42.346Z',
    updatedBy: '张三'
  }
*/

const mongoose = require("mongoose");
const autoIncrement = require("mongoose-auto-increment");

const articleSchema = new mongoose.Schema(
  {
    title: String,
    content: String,
    attachments: [String],
    tags: [String],
    createdAt: { type: Date, default: Date.now },
    createdBy: Number,
    updatedAt: { type: Date, default: Date.now },
    updatedBy: Number
  },
  {
    collection: "articles"
  }
);

articleSchema.plugin(autoIncrement.plugin, "Article");
const Article = mongoose.model("Article", articleSchema);

module.exports = Article;
