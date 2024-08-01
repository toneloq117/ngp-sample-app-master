var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");
const session = require("express-session");

const indexRouter = require("./routes/index");
const loginRouter = require("./routes/login");
const productRouter = require("./routes/products");
const settingsRouter = require("./routes/settings");
const cartRouter = require("./routes/cart");
const logoutRouter = require("./routes/logout");
const orderRouter = require("./routes/order");
const { isPrefDataInCookie } = require("./utils/settingsUtils");

var app = express();

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.use(express.static(path.join(__dirname, "public")));

app.use(
  session({
    secret: process.env.SESSION_SECRET || "S3CRE7",
    cookie: { secure: true },
    resave: false,
    saveUninitialized: false
  })
);

const isLoggedIn = (req, res, next) => {
  if (!req.cookies.accessToken) {
    console.log('No accessToken. Will try refreshing');
    res.redirect('/login/refresh');
  } else {
    next();
  }
}

app.use((req, res, next) => {
  console.log(`Processing path: ${req.path}`)
  if (req.path.startsWith('/login') || req.path.startsWith('/favicon.ico')) {
    console.log(`Skipping login check`);
    next();
  } else {
    isLoggedIn(req, res, next);
  }
});

app.use((req, res, next) => {
  res.handleFetchError = (error) => {
    if (error.response && error.response.status === 401) {
      console.log('Session Expired. Trying to refresh token');
      res.cookie('accessToken', '');
      res.cookie('issuedAt', '');
      res.redirect('/login/refresh');
    } else {
      console.log(`Internal error occurred ${error}`);
      res.status(500).send('Internal error occurred');
    };
  };

  res.handleFetchErrorReturn = (error) => {
    if (error.response && error.response.status === 401) {
      console.log('Session Expired. Trying to refresh token');
      res.cookie('accessToken', '');
      res.cookie('issuedAt', '');
      res.redirect('/login/refresh');
    } else {
      console.log(`Internal error occurred ${error}`);
    };
  }

  next();
});

app.use(function (err, req, res, next) {
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  res.status(err.status || 500);
  res.render("error");
});

/**
 * To be used in home, product detail, and cart pages
 */
app.use(async (req, res, next) => {
  if (req.path.startsWith('/login') 
      || req.path.startsWith('/logout')
      || req.path.startsWith('/favicon.ico')
      || req.path.startsWith('/settings')
      ) {
    next();
  } else {
    if (!isPrefDataInCookie(req, res)) {
      console.log('Preferences not found in cookie');
      res.redirect('/settings');
    } else {
      next();
    }
  }
});

app.use("/", indexRouter);
app.use("/login", loginRouter);
app.use("/product", productRouter);
app.use("/settings", settingsRouter);
app.use("/cart", cartRouter);
app.use("/logout", logoutRouter);
app.use("/order", orderRouter);

module.exports = app;