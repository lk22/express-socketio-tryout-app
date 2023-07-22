const path = require("path");
const express = require("express");
const app = require("express")();
const http = require("http").Server(app);
const io = require("socket.io")(http);
const port = process.env.PORT || 3000;
const bodyParser = require("body-parser");
const session = require("express-session");
const hash = require("pbkdf2-password")();
const cookieParser = require("cookie-parser");

app.use(cookieParser()); // To parse the cookies

app.engine("html", require("ejs").renderFile); // To render the html files

app.set("views", path.join(__dirname, "views")); // To set the folder for the views
app.use(express.static(__dirname + "/public")); // To serve static files in Express, we use the built-in middleware function, express.static

app.use(bodyParser.urlencoded({ extended: true })); // To parse the incoming requests with urlencoded payloads
app.use(express.json()); // To parse the incoming requests with JSON payloads

app.use(
  session({
    resave: false,
    saveUninitialized: true,
    secret: "secret",
  })
);

// middleware for flashing messages
app.use(function (req, res, next) {
  const error = req.session.error;
  const msg = req.session.success;
  delete req.session.error;
  delete req.session.success;
  res.locals.message = "";
  if (error) res.locals.message = '<p class="msg error">' + error + "</p>";
  if (msg) res.locals.message = '<p class="msg success">' + msg + "</p>";
  next();
});

// set the view engine to ejs
app.set("view engine", "html");

const users = [
  { username: "admin", password: "admin", nickname: "Admin", meta: {
    role: "Administrator",
    permissions: ["all"],
    avatar: "https://placehold.co/50x50",
    status: "offline",
    position: "Frontend Engineer"
  }},
  { username: "John Doe", password: "user", nickname: "johndoe", meta: {
    role: "User",
    permissions: ["read", "write"],
    avatar: "https://placehold.co/50x50",
    status: "offline",
    position: "Backend Engineer"
  } },
  { username: "Jane Doe", password: "user", nickname: "janedoe", meta: {
    role: "User",
    permissions: ["read", "write"],
    avatar: "https://placehold.co/50x50",
    status: "offline",
    position: "Design Engineer"
  } },
];

const messages = [];

// define a route handler for the default home page
app.get("/", (req, res) => {
  res.render("home", {
    title: "Home",
  });
});

app.get("/chat", (req, res) => {
  if (!req.cookies.auth) {
    res.redirect("/");
  }
  console.log(req.cookies);
  res.render("chat", {
    title: "Chat",
    room: req.cookies.user.room,
    user: {
      username: req.cookies.user.username,
    },
    messages: messages,
    users: users
  });
});

// define a authentiaction route
app.post("/auth", (req, res) => {
  const user = users.find(
    (user) =>
      user.username === req.body.username || user.password === req.body.password
  );

  if (!user) {
    res.send({
      code: 400,
      message: "User not found",
    });
  }

  res.cookie("auth", true);

  res.cookie("user", {
    username: req.body.username,
    room: req.body.room,
  });

  // get auth cookie value
  const authCookie = req.cookies.auth;
  console.log(authCookie);
  res.send({
    code: 200,
    status: {
      success: true,
    },
    message: "User authenticated successfully",
    cookie: authCookie,
    room: req.body.room,
    user: {
      username: req.body.username,
    },
  });
});

app.post("/logout", (req, res) => {
  res.clearCookie("auth");
  res.clearCookie("user");
  res.send({
    code: 200,
    status: {
      success: true,
    },
    message: "User logged out successfully",
  });
});

io.on("connection", (socket) => {
  // console.log(socket)
  console.log("User: " + socket.id + " " + "connected");

  socket.on("disconnect", () => {
    console.log("User: " + socket.id + " " + "disconnected");
  });

  socket.on("chat message", (msg) => {
    console.log("Newest message:", msg);
    messages.push({
      username: msg.username,
      message: msg,
      room: socket.room,
    });
    io.emit("chat message", msg);
  });
});

http.listen(port, () => {
  console.log(`Socket.IO server running at http://localhost:${port}/`);
});
