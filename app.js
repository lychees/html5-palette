global.RootDir = __dirname + '/';


/**
 * Module dependencies.
 */

var express = require('express');
var io = require('socket.io');
var routes = require('./routes');
var settings = require('./settings');
var MongoStore = require('connect-mongo')(express);

var app = module.exports = express.createServer();

// Configuration


var drawings = [];

function clear()
{
    drawings = [];
}

function push(x, y, tool, color, size, drag)
{
    drawings.push({

        x:     x,
        y:     x,
        tool:  tool,
        color: color,
        size:  size,
        drag:  drag

    });
}


function start()
{

    app.use(express.static(RootDir + 'public'));
    
    var server = app;
    io = io.listen(server);
    
    app.get('/getdrawings', function(req, res)
    {
        res.send(JSON.stringify(drawings));
    });


    io.sockets.on('connection', function(socket)
    {
        socket.on('push', function(d)
        {
            drawings.push(d);
            socket.broadcast.emit('push', d);
        });

        socket.on('clear', function(d)
        {
            clear();
            socket.broadcast.emit('clear');
        });
    });
}

start();


app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'ejs');
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.cookieParser());
  app.use(express.session({
    secret: settings.cookieSecret,
    store: new MongoStore({
      db: settings.db
    })
  }));
  app.use(express.router(routes));
  app.use(express.static(__dirname + '/public'));
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function(){
  app.use(express.errorHandler());
});

app.dynamicHelpers({
  user: function(req, res) {
    return req.session.user;
  },
  error: function(req, res) {
    var err = req.flash('error');
    if (err.length)
      return err;
    else
      return null;
  },
  success: function(req, res) {
    var succ = req.flash('success');
    if (succ.length)
      return succ;
    else
      return null;
  },
});

app.listen(3000);
console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
