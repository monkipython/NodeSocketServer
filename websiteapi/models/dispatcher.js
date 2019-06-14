var Mongo = require('../databases/UtilityFunc');
var mysqlDb = require('../databases/mysql');
var moment = require('moment');
var async = require("async");
var jwt = require('jsonwebtoken');
var status = require('../statusMsg/status');
var config = require('../config/config.json');

var redis = require('redis');
var client = redis.createClient(); //creates a new client
client.auth(config.REDIS_USERNAME);

var userSessionTime = 489800;

var pubnub = require('./pubnub');

module.exports.createDispacher = function (request, reply) {
    async.waterfall(
            [
                function (callback) {
                    Mongo.Select("Dispatchers", {'email': request.payload.ent_email}, function (err, lastId) {
                        if (err) {
                            console.log(err);
                        } else if (lastId.length > 0) {
                            reply(status.status(4));
                        } else {
                            callback(null, lastId);
                        }
                    });
                }
            ],
            function (args) {
                Mongo.Insert("Dispatchers", {'email': request.payload.ent_email, 'pass': request.payload.ent_password, 'phone': request.payload.ent_phone, 'dname': request.payload.ent_name}, function (err, lastId) {
                    if (err) {
                        console.log(err);
                    } else {
                        reply(status.status(5));
                    }
                });

            });
}

module.exports.book = function (request, reply) {
    async.waterfall(
            [
                function (callback) {
                    Mongo.SelectOne("location", {'email': request.payload.ent_email}, function (err, driver) {
                        if (err) {
                            console.log(err);
                        } else if (driver) {
                            callback(null, driver);
                        } else {
                            reply(status.status(8));
                        }
                    });
                }, function (driverdata, latCall) {
                    Mongo.SelectOne("ShipmentDetails", {'order_id': parseInt(request.payload.ent_bid)}, function (err, ShipmentDetails) {
                        if (err) {
                            console.log(err);
                        } else if (ShipmentDetails) {
                            latCall(null, driverdata, ShipmentDetails);
                        } else {
                            reply(status.status(0));
                        }
                    });
                }
            ],
            function (args, driverData, ShipmentDetails) {
                if (moment().unix() < ShipmentDetails.timpeStamp_booking_time) {
                    reply(status.status(10));
                } else {
                    bookNow(driverData, ShipmentDetails);
                    var counter = 1;
                    setTimeout(function wait_me() {
                        client.hgetall(request.payload.ent_bid, function (err, object) {
                            if (object == null) {
                                reply(status.status(10));
                            } else {

                                switch (object.status) {
                                    case "2":
                                        console.log("status update");
                                        console.log(object.status);
                                        reply(status.status(14));
                                        break;
                                    case "3":
                                        reply(status.status(15));
                                        break
                                    default :
                                        if (config.ExpiryTime > counter) {
                                            setTimeout(wait_me, 1000);
                                        } else {
                                            reply(status.status(11));
                                        }
                                        counter++;
                                }
                            }

                        });


                    }, parseInt(1000));

                }

            });
}


function bookNow(driverData, ShipmentDetails) {
    message = "Job:" + ShipmentDetails['slaveName'];
    var pubnubContent = {
        'a': 11,
        'dt': ShipmentDetails['appointment_dt'],
        'pickZone': ShipmentDetails['receivers'][0].zone1,
        'dropZone': ShipmentDetails['receivers'][0].zone2,
        'amount': ShipmentDetails['receivers'][0].Fare,
        'weight': ShipmentDetails['receivers'][0].weight,
        'quantity': ShipmentDetails['receivers'][0].quantity,
        'dropDt': ShipmentDetails['receivers'][0].AproxDropTime,
        'e': ShipmentDetails['slaveEmail'],
        'bid': ShipmentDetails['order_id'],
        'nt': '51',
        'ltg': ShipmentDetails['pickup_location']['latitude'] + ',' + ShipmentDetails['pickup_location']['longitude'],
        'adr1': ShipmentDetails['address_line1'],
        'drop1': ShipmentDetails['drop_addr1'],
        'chn': ShipmentDetails['passanger_chn'],
        'ExpiryTimer': config.ExpiryTime
    };
//    console.log(pubnubContent);
//    console.log(driverData.listner);
    sendPubnubPush(driverData, pubnubContent);
    send_android_ios_push({
        push_token: (typeof driverData.pushToken != 'undefined' ? driverData.pushToken : 0),
        device_type: driverData.DeviceType_,
        msg_type: 0,
        timestamp: 0,
        usertype: 1,
        payload: pubnubContent

    }, function (serr, sres) {
        if (serr) {
            console.log("store appt error");
        } else {
            console.log("push sent");
        }

    });
//    console.log('here');
}

function sendPubnubPush(pdata, pubnubContent) {

    pubnub.publish(pdata.listner, pubnubContent, function () {
        console.log('pubnublished');
    });
}


var FCM = require('fcm-push');
function send_android_ios_push(args, callback) {
    var push_token = args.push_token;
    var device_type = args.device_type;
    var msg_type = args.msg_type;
    var timestamp = args.timestamp;
    var usertype = args.usertype;
    var dt = args.dt;
    var msg = args.payload;
    var payload = {name: args.name, msg: args.payload, bid: args.bid, pic: args.pic};
    var fcm_server_key = "";

    if (usertype == 1) {
        if (device_type == 1) {
            // CUSTOMER IOS
//            fcm_server_key = "AIzaSyBpIl2K-JxZe2jubZmcmsg4kygvgqS5VRg";
            fcm_server_key = "AAAAIMtst-E:APA91bHnO7Y14tOsMh1_ibUYJp3xz9DrCTLDvZ2mAWhsLYxcKauHsieh0hMjaWmnAmC2QhggV2RgFEG8F_Wp69acgwoBwsZxSl8XMWQHelaSkwXOtgiiSwVopInNd1-Fsc_gf8ZuHkcX";
        } else {
            // CUSTOMER ANDROID
            fcm_server_key = "AIzaSyCqd6sbFB-OS3pEg4ihraG0W_imi3fzkL0";
        }
    } else {
        if (device_type == 1) {
            //PROVIDER IOS
            fcm_server_key = "";
        } else {
            //PROVIDER ANDROID
            fcm_server_key = "";
        }
    }


//    console.log("*******************" + fcm_server_key + "************");
//    console.log("*******************" + push_token + "************");
//    console.log("*******************" + device_type + "************");
    var fcm = new FCM(fcm_server_key);

    if (device_type == 2) {
        var messageSend = {timestamp: timestamp, dt: dt, pic: args.pic, name: args.name, bid: args.bid, st: 8, payload: msg};
        var message = {
            to: push_token, // required fill with device token or topics
            collapse_key: 'your_collapse_key',
            priority: 'high',
            "delay_while_idle": true,
            "dry_run": false,
            "time_to_live": 3600,
            "content_available": true,
            data: messageSend
        };

    } else if (device_type == 1) {
        messageSend = {timestamp: timestamp, dt: dt, pic: args.pic, name: args.name, bid: args.bid, st: 8, payload: msg};
        var message = {
            to: push_token, // required fill with device token or topics
            collapse_key: 'your_collapse_key',
            priority: 'high',
            "delay_while_idle": true,
            "dry_run": false,
            "time_to_live": 3600,
            "content_available": true,
            data: messageSend

        };
        message.notification = {
            title: "you got New Booking",
            body: "Rogi Customer Has requested shipment",
            sound: "default"
        };
    }
    fcm.send(message)
            .then(function (response) {
//                console.log("Successfully sent with response: ", response);
            })
            .catch(function (err) {
                console.log("Something has gone wrong!");
                console.error(err);
            })
}


module.exports.DispacherSignup = function (request, reply) {
    async.waterfall(
            [
                function (callback) {
                    Mongo.Select("Dispatchers", {'email': request.payload.ent_email, 'pass': request.payload.ent_password}, function (err, userdetails) {
                        if (err) {
                            console.log(err);
                        } else if (userdetails.length > 0) {
                            callback(userdetails);
                        } else {
                            reply(status.status(6, userdetails));
                        }
                    });
                }
            ],
            function (userdetails) {
                var token = jwt.sign({"_id": userdetails[0]._id.toString(), 'email': request.payload.ent_email}, process.env.SECRET_KEY, {
                    expiresIn: userSessionTime
                });
                reply(status.status(2, {res: userdetails, 'token': token}));
            });
}

module.exports.findZone = function (request, reply) {
    Mongo.SelectOne("zones", {'polygons': {$geoIntersects: {$geometry: {type: "Point", coordinates: [parseFloat(request.payload.ent_lng), parseFloat(request.payload.ent_lat)]}}}}, function (err, zoneDetails) {
        if (err) {
            console.log(err);
        } else if (zoneDetails) {
            reply(status.status(2, zoneDetails));
        } else {
            reply(status.status(0));
        }
    });

}

module.exports.getallDriverNear = function (request, reply) {

    jwt.verify(request.params.token, process.env.SECRET_KEY, function (err, token) {
        if (err) {
            reply(status.status(7));
        } else {
            var loc = {lat: request.params.latitude, lng: request.params.longitude};
            Mongo.GeoNear('location', {status: 3}, loc, function (err, res) {
                if (err) {
                    console.log("Error 3");
                } else {
                    if (res.results.length > 0) {

                        var drivers = [];

                        for (var key = 0; key < res.results.length; key++) {
                            var dis = res.results[key].dis;
                            var obj = res.results[key].obj;

                            drivers.push({
                                name: obj.name,
                                lname: obj.lname,
                                lastTs: obj.lastTs,
                                mobile: obj.mobile,
                                specilities: obj.specilities,
                                dis: dis,
                                status: obj.status,
                                user: obj.user,
                                email: obj.email,
                                image: obj.image,
                                zones: obj.zones,
                                location: obj.location,
                                chn: obj.listner,
                                DeviceType: obj.DeviceType_,
                                PhoneVersion: obj.PhoneVersion,
                                batPer: obj.batPer

                            });
                        }
                        reply(status.status(2, drivers));

                    } else {
                        reply(status.status(11));
                    }
                }
            });

        }
    });



}

module.exports.bookingConstant = function (request, reply) {

    jwt.verify(request.params.token, process.env.SECRET_KEY, function (err, token) {
        if (err) {
            reply(status.status(7));
        } else {

            async.waterfall(
                    [
                        function (callback) {

                            Mongo.Select("vehicleTypes", {}, function (err, vehicleType) {
                                if (err) {
                                    console.log(err);
                                } else {
                                    var typesData = [];
                                    for (var key = 0; key < vehicleType.length; key++) {
                                        typesData.push({
                                            'type_id': vehicleType[key].type,
                                            'type_name': vehicleType[key].type_name,
                                            'max_size': vehicleType[key].max_size,
                                            'basefare': vehicleType[key].basefare,
                                            'min_fare': vehicleType[key].min_fare,
                                            'price_per_min': vehicleType[key].price_per_min,
                                            'price_per_km': vehicleType[key].price_per_km,
                                            'type_desc': vehicleType[key].type_desc,
                                            'MapIcon': vehicleType[key].MapIcon,
                                            'vehicle_img': vehicleType[key].vehicle_img,
                                            'vehicle_img_off': vehicleType[key].vehicle_img_off
                                        });
                                    }

                                    callback(null, typesData);

                                }
                            });

                        }
                    ],
                    function (data, typesData) {

                        Mongo.Select("Driver_specialities", {}, function (err, specialities) {
                            if (err) {
                                console.log(err);
                            } else {
                                var specialitiesArr = [];
                                for (var key = 0; key < specialities.length; key++) {
                                    specialitiesArr.push(specialities[key]);
                                }
                                reply(status.status(2, {'specialities': specialitiesArr, 'typesData': typesData}));
                            }
                        });

                    });

        }
    });
}


// send BOOKING  API
module.exports.sendBooking = function (request, reply) {

    Mongo.Update("bookings", {'bid': request.payload.ent_bid.toString()}, {provider_id: request.payload.ent_pro_id.toString(), slot_id: request.payload.ent_slot_id, disp_status: request.payload.ent_status, status: 1}, function (err, bData) {
        if (err) {
            console.log(err);
        } else {
            var requesttp = require('request');
            requesttp("http://goclean-service.com:9999/sendBookingFromDispatcher?bid=" + request.payload.ent_bid, function (err, res, body) {
            });
            reply(status.status(78, ""));
        }
    });
}


// CREATE BOOKING  API
module.exports.createBooking = function (request, reply) {
    var cust_Details;
    async.waterfall(
            [
                function (zeroCall) {
                    var Query = "select * from patient where email = '" + request.payload.ent_cust_id + "'";
                    mysqlDb.ExecuteQuery(Query, function (err, userdetails) {
                        if (err) {
                            console.log(err);
                        } else {
                            if (userdetails.flag == 0) {
                                cust_Details = userdetails;
                                zeroCall(null);
                            } else {
                                reply(status.status(7));
                            }
                        }
                    });
                },
                function (firstCall) {
                    if (request.payload.ent_booking_type == 2) {
                        if (request.payload.ent_pro_id == "")
                            reply(status.status(411));
                        else if (request.payload.ent_slot_id == "")
                            reply(status.status(411));
                        else {
                            firstCall(null);
                        }
                    } else if (request.payload.ent_booking_type == 1) {
                        firstCall(null);
                    } else {
                        reply(status.status(412));
                    }
                }, function (secondCall) {
                    Mongo.getLastIdInCollection("bookings", {'_id': 1}, {'_id': -1}, function (err, lastId) {
                        if (err) {
                            console.log(err);
                        } else if (lastId.length > 0) {
                            secondCall(null, lastId);
                        } else {
                            console.log(lastId);
                            reply(status.status(38));
                        }
                    });
                }, function (lastId, thiredCall) {
                    Mongo.SelectOne("Category", {'_id': new ObjectID(request.payload.ent_cat_id)}, function (err, categoryRes) {
                        if (err) {
                            console.log(err);
                        } else if (categoryRes) {
                            var booking_id = lastId[0]._id + 1;
                            datatoinsert = {
                                _id: parseInt(booking_id),
                                bid: booking_id.toString(),
                                provider_id: request.payload.ent_pro_id,
                                status: 1,
                                appt_created: request.payload.ent_date_time,
                                booking_type: request.payload.ent_booking_type,
                                cat_id: request.payload.ent_cat_id,
                                cat_name: categoryRes.cat_name,
                                appt_lat: request.payload.ent_lat,
                                appt_long: request.payload.ent_long,
                                card_token: request.payload.ent_card_id,
                                appt_date: request.payload.ent_appnt_dt,
                                device_type: request.payload.ent_device_type,
                                customer_notes: request.payload.ent_job_details,
                                appt_expire: 1523865560,
                                address1: request.payload.ent_address1,
                                cancel_amount: categoryRes.can_fees,
                                customer: {
                                    id: cust_Details['data'][0]['patient_id'].toString(),
                                    fname: cust_Details['data'][0]['first_name'],
                                    lname: cust_Details['data'][0]['last_name'],
                                    pic: cust_Details['data'][0]['profile_pic'],
                                    email: cust_Details['data'][0]['email'],
                                    mobile: cust_Details['data'][0]['mobile']
                                }
                            };
                            thiredCall(datatoinsert);
                        } else {
                            reply(status.status(38));
                        }
                    });
                }
            ],
            function (args) {
                Mongo.Insert("bookings", args, function (err, lastId) {
                    if (err) {
                        console.log(err);
                    } else {
                        reply(status.status(78, ""));
                    }
                });
            });
}


module.exports.appointments = function (request, reply) {

    jwt.verify(request.payload.ent_sess_token, process.env.SECRET_KEY, function (err, token) {
        if (err) {
            reply(status.status(7));
        } else {
            var condition = {};
            console.log(request.payload.ent_booking_id);
            if (typeof request.payload.ent_booking_id != 'undefined') {
                condition = {'order_id': parseInt(request.payload.ent_booking_id)};
            } else if (request.payload.ent_start_date != '' && request.payload.ent_end_date != '') {
                var startTime = moment(request.payload.ent_start_date).unix();
                var EndTime = moment(request.payload.ent_end_date).unix();
                condition = {'status': {$in: [9, 4, 5]}, 'timpeStamp_appointment_date': {
                        '$gte': startTime,
                        '$lte': EndTime
                    }};
            } else {
                condition = {};
            }

            var mararray = [];
            var appointment = [];
            async.waterfall(
                    [
                        function (callback) {

                            Mongo.SelectWIthLimitAndIndex("ShipmentDetails", condition, parseInt(request.payload.ent_page_index), function (err, booking) {
                                if (err) {
                                    console.log(err);
                                } else {
                                    callback(null, booking);
                                }
                            });
                        }, function (booking, callback) {

                            if (typeof request.payload.ent_lat != 'undefined' && typeof request.payload.ent_long != 'undefined') {
                                var loc = {lat: request.payload.ent_lat, lng: request.payload.ent_long};

                                Mongo.GeoNear('location', {status: 3}, loc, function (err, res) {
                                    if (err) {
                                        console.log("Error 3");
                                    } else {
                                        if (res.results.length > 0) {
                                            for (var key = 0; key < res.results.length; key++) {
                                                mararray.push({
                                                    '_id': res.results[key].obj._id.toString(),
                                                    'lat': res.results[key].obj.location.latitude,
                                                    'long': res.results[key].obj.location.longitude,
                                                    'image': res.results[key].obj.image,
                                                    'status': res.results[key].obj.status,
                                                    'email': res.results[key].obj.email,
                                                    'lasttime': res.results[key].obj.lastTs,
                                                    'name': res.results[key].obj.name,
                                                    'PhoneVersion': res.results[key].obj.PhoneVersion,
                                                    'batPer': res.results[key].obj.batPer,
                                                    'serverTime': moment().unix(),
                                                    'phone': res.results[key].obj.mobile,
                                                    'locationChk': 0,
                                                    'DeviceType': res.results[key].obj.DeviceType_

                                                });
                                            }
                                            callback(null, booking, mararray);
                                        } else {
//                                            console.log('no drivers');
                                            callback(null, booking, mararray);
                                        }
                                    }
                                });

                            } else {
                                callback(null, booking, mararray);
                            }

                        }
                    ],
                    function (tag, booking, mararray) {
//                        console.log('***********3**************');
//                        console.log(mararray);
//                        console.log(booking);

                        for (var key = 0; key < booking.length; key++) {
                            var demail = '';
                            if (status > 2) {
                                demail :  booking[key].dispatched.email;
                            }

                            if (booking[key].receivers.length > 0)
                                appointment.push({
                                    'apntDt': booking[key].appointment_dt,
                                    'email': demail,
                                    'status': status.bookingStatus(booking[key].status),
                                    'customerName': booking[key].slaveName,
                                    'customerPhone': booking[key].slavemobile,
                                    'customerEmail': booking[key].slaveEmail,
                                    'bid': booking[key].order_id,
                                    'drop_dt': booking[key].receivers[0].AproxDropTime,
                                    'extraNotes': booking[key].extra_notes,
                                    'apntDate': booking[key].appointment_dt,
                                    'addrLine1': booking[key].address_line1,
                                    'dropLine1': booking[key].drop_addr1,
                                    'dorpzoneId': booking[key].dorpzoneId,
                                    'pickup_ltg': booking[key].pickup_location.latitude + ',' + booking[key].pickup_location.longitude,
                                    'drop_ltg': booking[key].drop_location.latitude + ',' + booking[key].drop_location.longitude,
                                    'shipemntDetails': booking[key].receivers,
                                    'DriverName': booking[key].driverDetails.firstName,
                                    'DriverPhone': booking[key].driverDetails.mobile,
                                    'DriverEmail': booking[key].driverDetails.email,
                                    'DriverPhoto': booking[key].driverDetails.firstName,
                                    'DriverChn': 'qd_' + booking[key].driverDetails.entityId,
                                    'vehicleType': booking[key].vehicleType.type_name,
                                    'vehicleID': booking[key].vehicleType.type_id,
                                    'vehicleImg': booking[key].vehicleType.vehicle_img,
                                    'vehicleMake': booking[key].vehicleData.vehicle_type,
                                    'vehicleModel': booking[key].vehicleData.vehicle_model,
                                    'vehicleColor': booking[key].vehicleData.Vehicle_Color,
                                    'plateno': booking[key].vehicleData.License_Plate_No,
                                    'battery': booking[key].driverDetails.battery,
                                    'rating': booking[key].driverDetails.rating,
                                    'version': booking[key].driverDetails.version,
                                    'devType': booking[key].driverDetails.deviceType,
                                    'driverId': booking[key].driverDetails.DriverId,
                                    'booking_time': booking[key].booking_time,
                                });

                        }
                        reply(status.status(2, {appointments: appointment, 'masArr': mararray}));
                    });
        }
    });

}


module.exports.getDrivers = function (request, reply) {

    jwt.verify(request.params.token, process.env.SECRET_KEY, function (err, token) {
        if (err) {
            reply(status.status(7));
        } else {
            Mongo.Select('location', {"status": {"$in": [3, 4, 5]}}, function (err, res) {
                if (err) {
                    console.log("Error 3");
                } else {
                    var mararray = [];
                    var MasIds = [];
                    var bookngs = [];
                    if (res.length > 0) {
                        for (var key = 0; key < res.length; key++) {
                            MasIds.push(parseInt(res[key].user));
                            mararray.push({
                                '_id': res[key]._id.toString(),
                                'mas_id': res[key].user,
                                'lat': res[key].location.latitude,
                                'long': res[key].location.longitude,
                                'image': res[key].image,
                                'status': res[key].status,
                                'email': res[key].email,
                                'lasttime': res[key].lastTs,
                                'name': res[key].name,
                                'PhoneVersion': (res[key].PhoneVersion == 'undefined') ? "" : res[key].PhoneVersion,
                                'batPer': (res[key].batPer == 'undefined') ? "" : res[key].batPer,
                                'serverTime': moment().unix(),
                                'phone': (res[key].mobile == 'undefined') ? "" : res[key].mobile,
                                'locationChk': 0,
                                'DeviceType': (res[key].DeviceType_ == 'undefined') ? "" : res[key].DeviceType_
                            });
                        }
                    }

                    console.log("here");
                    Mongo.aggregate_('ShipmentDetails', [{"$match": {"mas_id": {"$in": MasIds}, "status": {"$in": [6, 2, 7, 8]}}}, {
                            $group: {
                                "_id": "$mas_id",
                                total: {
                                    $sum: 1
                                }

                            }
                        }], function (err, res) {
                        if (err) {
                            console.log("Error 3");
                        } else {

                            reply(status.status(2, {mas: mararray, task: res}));

                        }
                    });




                }
            });
        }
    });


}

module.exports.task = function (request, reply) {

    jwt.verify(request.params.token, process.env.SECRET_KEY, function (err, token) {
        if (err) {
            reply(status.status(7));
        } else {
            Mongo.aggregate_('ShipmentDetails', [{"$match": {"mas_id": {"$in": [parseInt(request.params.mas_id)]}, "status": {"$in": [6, 2, 7, 8]}}}, {
                    "$group": {"_id": {
                            "mas_id": "$_id",
                            "zone1": "$receivers.zone1",
                            "zone2": "$receivers.zone2",
                            'pickupdate': "$appointment_dt",
                            'status': "$status",
                            "DropDate": "$receivers.AproxDropTime"
                        }}}], function (err, res) {
                if (err) {
                    console.log("Error 3");
                } else {
                    reply(status.status(2, {task: res}));
                }
            });
        }
    });


}



