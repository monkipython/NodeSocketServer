var Mongo = require('../databases/UtilityFunc');
var pubnub = require('./pubnub').pubnub;
var config = require('../config/config.json');
var redis = require('redis');
var client = redis.createClient(); //creates a new client
client.auth(config.REDIS_USERNAME);


pubnub.subscribe({
    channel: 'dispatcher_new',
    presence: function (mm) {
    },
    message: function (m) {
        console.log('subscribe');
        switch (m.a) {
            case 1: // new
                client.hmset(m.bid, 'status', 0);
                break;
            case 2: // removebooking
                client.hmset(m.bid, 'status', 2);
//                Application.removeBooking(m.bid, m.user);
                break;
            case 3:
                client.hmset(m.bid, 'status', 3);
//                console.log("rejected By Driver");
//                Application.rejectBooking(m.user, m.bid);
                break;
        }
    }
});


module.exports.makeProviderBusy = function (proid, callback)
{
    Mongo.Update('location', {'user': parseInt(proid)}, {'inBooking': 2}, function (err, result) {
        if (err) {
            return callback(null, err);
        } else {
            return callback(null, result);
        }
    });
}

module.exports.makeProviderFree = function (proid, callback)
{
    Mongo.Update('location', {'user': parseInt(proid)}, {'inBooking': 1}, function (err, result) {
        if (err) {
            return callback(null, err);
        } else {
            return callback(null, result);
        }
    });
}