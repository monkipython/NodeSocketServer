var express = require('express');
var app = express();

//var fs = require('fs');

//var tls = {
//  key: fs.readFileSync('/etc/ssl/private/ssl-cert-snakeoil.key'),
//  cert: fs.readFileSync('/etc/ssl/certs/ssl-cert-snakeoil.pem')
//};


var server = require('http').createServer(app).listen(9999, '::');
// var https  = require('https').createServer(app).listen(9990);
var io = require('socket.io').listen(server);

var bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

console.log("Server started on port 9999");
var sockgods;
var socketapi;
io.on('connection', function (socket) {
    var status = require("./status")(io, socket);
    var booking = require("./booking")(io, socket);
    var chat = require("./chat")(io, socket);
    sockgods = socket;
    socketapi = require('./socketapi.js');
});

//START Mongo Trigger
var MongoStream = require('mongo-trigger');
var watcher = new MongoStream({username: 'username', password: 'password', authdb: 'databasename'});
watcher.watch('iserve.location', function (event) {
//    console.log('location');
    sockgods.broadcast.emit("godzviewChn", event);
});

app.post('/respondToAppointment', function (req, res) {
    socketapi.respondToAppointment({
        bid: req.body.bid,
        proid: req.body.proid,
        bstatus: req.body.bstatus,
        io: io,
        socket: sockgods
    }, function (err, result) {
        if (err) {
            console.log('error: ' + err.message);
        } else {
        }
    });
});



app.post('/bookingCreated', function (req, res) {
    socketapi.bookingCreated({
        bid: req.body.bid,
        socket: sockgods
    }, function (err, result) {});
});

app.get('/bookingCreated', function (req, res) {
    socketapi.bookingCreated({
        bid: req.query.bid,
        socket: sockgods
    }, function (err, result) {});
});

app.post('/location', function (req, res) {
    socketapi.location({
        proId: req.body.proId,
        socket: sockgods
    }, function (err, result) {});
});


app.post('/laterBookingByCustomer', function (req, res) {
    socketapi.laterBookingByCustomer({
        bid: req.body.bid,
        io: io
    }, function (err, result) {
        if (err) {
            console.log('error: ' + err.message);
        } else {
//            console.log('success laterBookingByCustomer');
        }
    });
});

app.post('/cancelByCustomer', function (req, res) {
    socketapi.cancelByCustomer({
        bid: req.body.bid,
        io: io
    }, function (err, result) {
        if (err) {
            console.log('error: ' + err.message);
        } else {
//            console.log('success cancelByCustomer');
        }
    });
});


// START REDIS  CODE HERE
var redis = require('redis');
var redisClient = redis.createClient(6379, 'localhost');
redisClient.auth('password');
redisClient.on('connect', function () {
    console.log('Redis Connected');
});
redisClient.on("error", function (err) {
    console.log("Error " + err);
});
// END REDIS CODE HERE

app.get('/bookingFromWebsite', function (req, res) {
    var dispatcher = require("./dispatcher")(redisClient, io);
    var disp = require("./dispatcher");
    if (req.query.btype == 2)
    {
        disp.LaterBooking(io, req.query.bid);
    } else
    {
        disp.LiveBooking(io, req.query.bid, "");
    }
});


app.get('/sendBookingFromDispatcher', function (req, res) {
    var dispatcher = require("./dispatcher")(redisClient, io);
    var disp = require("./dispatcher");
    disp.sendBookingFromDispatcher(io, req.query.bid);
});

app.get('/unassignedBookingFromDispatcher', function (req, res) {
    socketapi.unassignedBookingFromDispatcher({
        bid_proid: req.query.bid_proid,
        io: io
    }, function (err, result) {
        if (err) {
            console.log('error: ' + err.message);
        } else {
//            console.log('success unassignedBookingFromDispatcher');
        }
    });
});

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/index.html');
});
