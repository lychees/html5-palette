global.RootDir = __dirname + '/';

var io = require('socket.io');
var express = require('express');
var http = require('http');
var app = express();


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
    
    var server = http.createServer(app);
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

    server.listen(8888);
}

start();