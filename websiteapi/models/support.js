var distance = require('google-distance-matrix');
var jwt = require('jsonwebtoken');
var status = require('../statusMsg/status');
var Mongo = require('../databases/UtilityFunc');
var async = require("async");
var moment = require('moment');

distance.key('AIzaSyCZ5dbMQxFY5NZ3vQ9MPs0N6nP08LEuEWs');
distance.units('imperial');


module.exports.googleMatrix = function (request, reply) {

    jwt.verify(request.payload.token, process.env.SECRET_KEY, function (err, token) {
        if (err) {
            reply(status.status(7));
        } else {

            async.waterfall(
                    [
                        function (callback) {
                            Mongo.Select("vehicleTypes", {'type': parseInt(request.payload.ent_wrk_type)}, function (err, vehicleTypes) {
                                if (err) {
                                    console.log(err);
                                } else if (vehicleTypes.length > 0) {
                                    callback(null, vehicleTypes[0]);
                                } else {
                                    reply(status.status(38));
                                }
                            });
                        }
                    ],
                    function (args, vehicleTypes) {


                        var origins = [request.payload.start_lat_long];
                        var destinations = [request.payload.end_lat_long];
                        distance.matrix(origins, destinations, function (err, distances) {
                            if (err) {
                                console.log(err);
                                //reply(status.status(2, {finalAmt: vehicleTypes.min_fare, 'dis': distance, 'duration': duration}));
                            } else
                            if (!distances) {
                                console.log('no distances');
                                //reply(status.status(2, {finalAmt: vehicleTypes.min_fare, 'dis': distance, 'duration': duration}));
                            } else
                            if (distances.status == 'OK') {
                                for (var i = 0; i < origins.length; i++) {
                                    for (var j = 0; j < destinations.length; j++) {
                                        if (distances.rows[0].elements[j].status == 'OK') {
                                            distance = distances.rows[i].elements[j].distance.value;
                                            duration = distances.rows[i].elements[j].duration.value;

                                            var baseFare = parseFloat(vehicleTypes.b_fare);
                                            var ppk = parseFloat(vehicleTypes.mileage) * (parseInt(distance) / 1000);
                                            var ppm = parseInt(vehicleTypes.price_per_min) * (parseInt(duration) / 60);

                                            var finalAmt = (baseFare + ppk + ppm).toFixed(2);
                                            if (vehicleTypes.min_fare > finalAmt)
                                                finalAmt = vehicleTypes.min_fare;

                                        }
                                    }
                                }
                                reply(status.status(2, {finalAmt: finalAmt, 'dis': (parseInt(distance) / 1000).toFixed(2), 'duration': (parseInt(duration) / 60).toFixed(2)}));
                            }
                        });


                    });
        }
    });
}

module.exports.twillio = function (request, reply) {

    jwt.verify(request.payload.token, process.env.SECRET_KEY, function (err, token) {
        if (err) {
            reply(status.status(7));
        } else {

            Mongo.Select("verification", {'mobile': parseInt(request.payload.mobile)}, function (err, vehicleTypes) {
                if (err) {
                    console.log(err);
                } else if (vehicleTypes.length > 0) {
                    Mongo.update("verification", {'mobile': parseInt(request.payload.mobile)}, {"code": 11111, 'time': moment().unix()}, function (err, vehicleTypes) {
                        if (err) {
                            console.log(err);
                        } else {
                            reply(status.status(13));
                        }
                    });
                    callback(null, 1);
                } else {

                    Mongo.insert("verification", {'mobile': parseInt(request.payload.mobile), "code": 11111, 'time': moment().unix()}, function (err, vehicleTypes) {
                        if (err) {
                            console.log(err);
                        } else {
                            reply(status.status(13));
                        }
                    });
                }
            });

        }
    });
}
    