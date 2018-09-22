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

const articlesRouter = require("./routes/articles");
const authRouter = require("./routes/auth");
const indexRouter = require("./routes/index");
const teamsRouter = require("./routes/teams");
const usersRouter = require("./routes/users");
const sitesRouter = require("./routes/sites");

const app = express();

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.use("/", indexRouter);
app.use("/api/articles", articlesRouter);
app.use("/api/auth", authRouter);
app.use("/api/users", usersRouter);
app.use("/api/teams", teamsRouter);
app.use("/api/sites", sitesRouter);

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
