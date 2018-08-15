const createError = require("http-errors");
const express = require("express");
const cookieParser = require("cookie-parser");
const logger = require("morgan");
const mongoose = require("mongoose");
const autoIncrement = require("mongoose-auto-increment");

/**
 * Open database.
 */
mongoose.connect(
  "mongodb://localhost:27017/sast-app",
  { useNewUrlParser: true }
);
const db = mongoose.connection;
autoIncrement.initialize(db);
db.on("error", console.error.bind(console, "Database connection error: "));
db.once("open", () => {
  console.log("Database connected.");
});

const indexRouter = require("./routes/index");
const usersRouter = require("./routes/users");
const articlesRouter = require("./routes/articles");

const app = express();

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.use("/", indexRouter);
app.use("/users", usersRouter);
app.use("/articles", articlesRouter);

// catch 404 and forward to error handler.
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler.
app.use(function(err, req, res, next) {
  // set locals, only providing error in development.
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page.
  res.status(err.status || 500);
  res.render("error");
});

module.exports = app;
