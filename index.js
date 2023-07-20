const path = require('path');
const express = require('express');
const app = require('express')();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const port = process.env.PORT || 3000;
const bodyParser = require('body-parser');
const session = require('express-session');
const hash = require('pbkdf2-password')();
const cookieParser = require('cookie-parser');

app.use(cookieParser()); // To parse the cookies

app.engine('html', require('ejs').renderFile); // To render the html files

app.set('views', path.join(__dirname, 'views')); // To set the folder for the views
app.use(express.static(__dirname + '/public')); // To serve static files in Express, we use the built-in middleware function, express.static

app.use(bodyParser.urlencoded({ extended: true })) // To parse the incoming requests with urlencoded payloads
app.use(express.json()) // To parse the incoming requests with JSON payloads

app.use(session({
  resave: false,
  saveUninitialized: true,
  secret: "secret"
}))

// middleware for flashing messages
app.use(function(req, res, next) {
  const error = req.session.error;
  const msg = req.session.success;
  delete req.session.error;
  delete req.session.success;
  res.locals.message = '';
  if (error) res.locals.message = '<p class="msg error">' + error + '</p>';
  if (msg) res.locals.message = '<p class="msg success">' + msg + '</p>';
  next();
})

// set the view engine to ejs
app.set('view engine', 'html');

// define a route handler for the default home page
app.get('/', (req, res) => {
  res.render('home', {
    title: 'Home'
  })
});

app.get('/chat', (req, res) => {
  if (!req.cookies.auth) {
    res.redirect('/');
  }
  res.render('chat', {
    title: 'Chat',
    room: req.cookies.user.room,
    username: req.cookies.user.username
  })
})

// define a authentiaction route
app.post('/auth', (req, res) => {

  if ( !req.body.username || req.body.username === '' ) {
    res.send({
      code: 400,
      message: 'Username is required'
    })
  }

  if ( !req.body.password || req.body.password === '' ) {
    res.send({
      code: 400,
      message: 'Password is required'
    })
  }

  res.cookie('auth', true);
    
  res.cookie('user', {
    username: req.body.username,
    room: req.body.room
  });

  // get auth cookie value
  const authCookie = req.cookies.auth;
  console.log(authCookie)
  res.send({
    code: 200,
    status: {
      success: true
    },
    message: 'User authenticated successfully',
    cookie: authCookie
  })
});

io.on('connection', (socket) => {
  // console.log(socket)
  // console.log('User: ' + socket.id + ' ' + 'connected');

  // socket.on('disconnect', () => {
  //   console.log('User: ' + socket.id + ' ' + 'disconnected');
  // })

  socket.on('chat message room' + socket.room, msg => {
    console.log("Newest message:", msg)
    io.emit('chat message', msg);
  });
});

http.listen(port, () => {
  console.log(`Socket.IO server running at http://localhost:${port}/`);
});
