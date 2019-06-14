process.env.TZ = 'America/Los_Angeles';
var Config = require('config-js');
var config = new Config('./config-js.js');
var Utility = require("./UtilityFunc");
var moment = require('moment');
var async = require("async");
var util = require('util');
var _ = require('underscore');
var validator = require('validator');
var CallLogic = require("./CronJob");

var pubnub = require("pubnub")({
    ssl: config.get('define.bool_'), // <- enable TLS Tunneling over TCP
    publish_key: config.get('define.pulish_key'),
    subscribe_key: config.get('define.subscribe_key')
});
pubnub.subscribe({
    channel: config.get("define.presence_chn"),
    presence: function (m) {
//        console.log(m.uuid + " - " + m.action);
//        console.log(m.action);
        if (typeof m.uuid != 'undefined') {
            var spl = m.uuid.split("_");

            spl[0] = spl[0].toLowerCase();
            if (spl[0] == 'm') {
                console.log(m.uuid + " - " + m.action);
//            console.log('spal : ' + spl[0 ]);
                var status = 4;
                if (m.action === 'join') {
                    status = 3;
                } else if (m.action === 'leave') {
                    status = 4;
                } else if (m.action === 'timeout') {
                    status = 4;
                }


                var cond = {user: parseInt(spl[1]), status: {'$ne': 5}};
                var newdata = {status: parseInt(status)};

                Utility.Update('location', cond, newdata, function (err, result1) {
                    if (err) {
                        console.log("Presence Status Error : ");
                    } else if (result1) {
//                        console.log(result1.result);
                        if(result1.result.nModified > 0){
                            console.log("status updated");
                            var timestamp = moment().unix();
                            var cond = {master: parseInt(spl[1]), status: 3};
                            Utility.SelectOne('statusLog', cond, function (err, logRes) {
                                if (err) {
                                    console.log("Update Status Error : " + err);
                                } else if(logRes){
//                                    console.log(logRes);
                                    if(status == 4){
                                        console.log("status log updated");
                                        var cond = {master: parseInt(spl[1]), status: 3};
                                        var newdata = {status: parseInt(status),
                                            "EndTime" : timestamp, 
                                            'EndTimeGurentee' : timestamp,
                                            'dist' : 0 };
                                        Utility.Update('statusLog', cond, newdata, function (err, result1) {});
                                    }
                                } else if(status == 3){
                                    console.log("new status log");
                                    var ins_arr = {'master' : parseInt(spl[1]), 
                                        'status' : 3, 
                                        'time' : timestamp, 
                                        'startTime' : timestamp, 
                                        "EndTime" : 0, 
                                        'EndTimeGurentee' : timestamp, 
                                        "timeDiff" : 0};
                                    Utility.Insert('statusLog', ins_arr, function (err, result1) {});
                                }
                            });
                        }
                    }
                });

            }
        }

    },
    message: function (m) {
    }
});
//
pubnub.subscribe({
    channel: config.get('define.Server_chn'),
    callback: function (mm) {

        switch (mm.a) {
            case '4':// driver to update his location 
//                 console.log(mm)
                var Inbooking = 1;
                var LastBookingTime;
                var cond = {user: parseInt(mm.mid)};
                var expirytimeforderiver = "";
//                var ZoneCond = {
//                    "polygons": {
//                        $geoIntersects: {
//                            $geometry: {
//                                type: "Point",
//                                coordinates: [
//                                    parseFloat(mm.lg),
//                                    parseFloat(mm.lt)
//                                ]
//                            }
//                        }
//                    }
//
//                };

                async.waterfall(
                        [
                            function (callback) {
                                Utility.Select('config', {}, function (err, result1) {
                                    if (err) {
                                        surg_price = '';
                                        console.log("zone resp" + err);
                                    } else
                                    if (result1) {
                                        expirytimeforderiver = parseInt(result1[0].newBookingPopupTime);
                                    }
                                    callback(null, callback);
                                });
                            },
                            function (arg1, callback) {
                                // no need to wait 
                                Utility.snapshot('statusLog', {'status': 3, master: parseInt(mm.mid)}, {'EndTimeGurentee': moment().unix()}, function (err, result1) {
                                    if (err) {
                                        console.log("statusLog Status Error : " + err);
                                    }
                                });

                                Utility.SelectOne('location', cond, function (err, result1) {
                                    if (err) {
                                        console.log("Update Status Error : " + err);
                                    } else if (result1) {
                                        Inbooking = result1.inBooking;
                                        LastBookingTime = result1.LastBookingTime;

                                        callback(null, callback);

                                    }
                                });




                            },
                            function (arg1, callback) {

                                var newdata = {location: {longitude: parseFloat(mm.lg),
                                        latitude: parseFloat(mm.lt)}, lastTs: moment().unix()};
//                                        latitude: parseFloat(mm.lt)}, lastTs: moment().unix(), 'zoneId': zoneId};
                                if (Inbooking == 2)
                                {
                                    if (moment().unix() - parseInt(LastBookingTime + expirytimeforderiver) > expirytimeforderiver) {
                                        newdata = {location: {longitude: parseFloat(mm.lg),
                                                latitude: parseFloat(mm.lt)}, lastTs: moment().unix(), inBooking: 1};
//                                                latitude: parseFloat(mm.lt)}, lastTs: moment().unix(), inBooking: 1, 'zoneId': zoneId};
                                    }

                                }

                                Utility.Update('location', cond, newdata, function (err, result1) {
                                    if (err) {
                                        console.log("Update Status Error : " + err);
                                    } else {
                                        callback(null, callback);
                                    }
                                });

                            }
                        ],
                        function (callback) {

//                            console.log("Updated " + Inbooking);

                        }
                );


                //  console.log("Updated ");

                break;
            case '11' : // driver upate booking receive booking time

//                 console.log(mm);
                if (typeof parseInt(mm.bid) != 'undefined') {

                    var data = {'BOOKING.$.receiveDt': moment().format("YYYY-MM-DD HH:mm:ss"), 'BOOKING.$.Status': "Received But Didn't Respond"};
                    var return_ = {ackn: 1};
                    async.waterfall(
                            [
                                function (callback) {

//                                    Utility.Update('appointments', {_id: parseInt(mm.bid), "BOOKING.DriverId": parseInt(mm.mid), status: {'$in': [1, 3]}}, data, function (err, result1) {
//                                        if (err) {
//                                            console.log("Booking receiveDt ERROR while inserting: " + err);
//                                        } else {
                                    Utility.SelectOne('appointments', {_id: parseInt(mm.bid)}, function (err, result1) {
                                        if (err) {
                                            console.log("Booking data not found ERROR while inserting: " + err);
                                        } else if (result1) {

                                            var getExpiryTime;

                                            result1.BOOKING.forEach(function (item) {
                                                if (item.DriverId == parseInt(mm.mid)) {
                                                    getExpiryTime = item.ExpiryTime;
                                                }
                                            });

                                            if ((getExpiryTime - (moment().unix())) > 0) {

                                                var return_ = {
                                                    alert: 'You Got New Booking\nPickup Location : ' + result1.appointment_address,
                                                    category: "JobRequest",
                                                    nt: '11',
                                                    ackn: 0,
                                                    a: 15,
                                                    CustomerWalletBalance: result1.CustomerWalletBalance,
                                                    sid: result1.slave_id.slaveId,
                                                    bid: result1._id,
                                                    adr2: result1.appointment_address,
                                                    dist: result1.pickupDistance,
                                                    ETA: result1.pickupETA,
                                                    lt: result1.appointment_location.latitude,
                                                    lg: result1.appointment_location.longitude,
                                                    DropAddress: result1.Drop_address,
                                                    DropLat: result1.Drop_location.latitude,
                                                    DropLong: result1.Drop_location.longitude,
                                                    CutomerBal: result1.CustomerWalletBalance,
                                                    CustomerName: result1.slave_id.SlaveName,
                                                    CustomerPone: result1.slave_id.SlavePone,
                                                    additional_info: result1.additional_info,
                                                    chn: result1.slave_id.SlaveChan,
                                                    dt: result1.appointment_dt,
                                                    iswallet: result1.wallet,
                                                    PayMentType: result1.PayMentType,
                                                    ExpiryTime: moment(mm.receiveDt).unix() + parseInt(result1.ExpiryLimit),
                                                    ExpirySecond: (getExpiryTime - (moment().unix())) > 0 ? (getExpiryTime - (moment().unix())) : 0,
                                                };
                                                //                                                    console.log(return_);
                                                if (mm.chn)
                                                    pubnub.publish({
                                                        channel: mm.chn,
                                                        message: return_,
                                                        callback: function (e) {

                                                            var User_id = [];
                                                            User_id.push(mm.mid);
                                                            var request = require('superagent');
                                                            request.post(config.get('define.serviceUrl') + 'PushNotificationByApp')
                                                                    .send({usertype: 1, User_id: User_id, PushType: 2, 'message': return_, action: 15})
                                                                    .end(function (err, res) {
                                                                        //                                                                            console.log(res.body);
                                                                    });
                                                            //     console.log("SUCCESS!", return_);
                                                        },
                                                        error: function (e) {
                                                            console.log("FAILED! RETRY PUBLISH!", e);
                                                        }
                                                    });

                                                Utility.Update('appointments', {_id: parseInt(mm.bid), "BOOKING.DriverId": parseInt(mm.mid), status: {'$in': [1, 3]}}, data, function (err, result1) {
                                                    if (err) {
                                                        console.log("Booking receiveDt ERROR while inserting: " + err);
                                                    } else {

                                                    }
                                                });
                                            }
                                        }

                                    });
//                                        }
//                                    });
                                }
                            ],
                            // the bonus final callback function
                                    function (err, status) {

                                    }
                            );
                        }

                break;
            case 1: // passanger gets data of vehicleType and driver details surrouning him
//                          console.log(mm);
                var types = [];
                var bookingStatus = 0;
                var driversArr = [];
                var driverdata = {}; //new Array([]);
                var driverdataArr = [];
                var TypeArray = {};
                var surg_price = '';
                var surg_price = '';
                var zoneId = "";
                var driversThreshold = 0;
                var etaThreshold = 0;
                var bookingAmountAllowUpto = 0;
                var versions = {};
//                var ZoneCond = {
//                    "polygons": {
//                        $geoIntersects: {
//                            $geometry: {
//                                type: "Point",
//                                coordinates: [
//                                    parseFloat(mm.lg),
//                                    parseFloat(mm.lt)
//                                ]
//                            }
//                        }
//                    }
//
//                };
                //  console.log("here" + mm.sid);

                async.waterfall(
                        [
                            function (callback) {

                                Utility.Select('config', {}, function (err, result1) {
                                    if (err) {
                                        surg_price = '';
                                        console.log("zone resp" + err);
                                    } else
                                    if (result1) {
//                                        console.log(result1[0].driversThreshold);
                                        versions = result1[0].appVersion;
                                        driversThreshold = parseInt(result1[0].driversThreshold);
                                        etaThreshold = parseInt(result1[0].etaThreshold);
                                        bookingAmountAllowUpto = parseInt(result1[0].maxNegativePassegerBalance);
                                    }
                                    callback(null, callback);
                                });


                            },
                            function (arg1, callback) {
                                Utility.Cmd('vehicleTypes', {long: parseFloat(mm.lg),
                                    lat: parseFloat(mm.lt)}, 0, function (err, result1) {
                                    if (err) {
                                        console.log("Error while getting vehicleTypes");
                                    } else if (result1) {
                                        result1.results.forEach(function (item) {
                                            var data = item.obj;
                                            types.push(data);
                                            TypeArray[parseInt(data.type)] = {
                                                'type_name': data.type_name,
                                                'type_id': data.type,
                                                'max_size': parseInt(data.max_size),
                                                'basefare': parseFloat(data.basefare),
                                                'min_fare': parseFloat(data.min_fare),
                                                'price_per_min': parseFloat(data.price_per_min),
                                                'price_per_km': parseFloat(data.price_per_km),
                                                'type_desc': data.type_desc,
                                                'MapIcon': data.type_map_image,
                                                'vehicle_img': data.type_on_image,
                                                'vehicle_img_off': data.type_off_image,
                                                'surg_price': surg_price,
                                                'order': data.vehicle_order

                                            };
                                        });
                                        callback(null, callback);
                                    }

                                });

                            },
                            function (arg1, callback) {
//console.log("here");
                                Utility.Cmd('location', {long: parseFloat(mm.lg),
                                    lat: parseFloat(mm.lt)}, parseInt(driversThreshold), function (err, result1) {
                                    if (err) {
                                        console.log("Update Status Error : " + err);
                                    } else if (result1) {
                                        result1.results.forEach(function (item) {
                                            var doc = item.obj;
                                            var dis = item.dis;
                                            var typeid = parseInt(doc.type);

//                                            if (zoneId == doc.zoneId && zoneId != "" && doc.zoneId != "") {
                                            if (typeid in driverdata) {
                                                driverdata[typeid].push({lt: doc.location.latitude, lg: doc.location.longitude, loc: doc.location.latitude + "," + doc.location.longitude, mid: doc.user, email: doc.email, chn: doc.chn, d: dis, eta: etaThreshold});
                                            } else
                                                driverdata[typeid] = [{lt: doc.location.latitude, lg: doc.location.longitude, loc: doc.location.latitude + "," + doc.location.longitude, mid: doc.user, email: doc.email, chn: doc.chn, d: dis}]; //[words[i]];
//                                            }

                                        });

//                                        console.log(driverdata);
                                        callback(null, callback);
                                    }
                                });
                            },
                            function (arg1, callback) {

//console.log("here"+mm.sid);
                                Utility.Select('appointments', {'slave_id.slaveId': parseInt(mm.sid), UpdateReview: 1, 'status': {'$in': [6, 7, 8, 2, 9, 11]}}, function (err, result1) {
                                    if (err) {
                                        console.log("error while getting bookingStatus: " + err);
                                    } else if (result1) {
//console.log("here");
//console.log(result1);
                                        if (Object.keys(result1).length > 0)
                                            bookingStatus = 1;

                                        callback(null, callback);
                                    }
                                });
                            },
                        ],
                        // the bonus final callback function
                                function (err, status) {
                                    var masarray = [];
                                    for (var key in TypeArray) {
                                        var ArraryTopush = [];
                                        masarray.push({
                                            tid: key,
                                            mas: (typeof driverdata[parseInt(key)] != 'undefined') ?
                                                    driverdata[parseInt(key)]
                                                    : ArraryTopush

                                        });
                                    }
                                    // console.log(masarray);

                                    masarray = [{
                                        tid: key,
                                        mas: []
                                    }];
                                    var return_ = {};
                                    if (types.length > 0){
                                        return_ = {a: 2,
                                            masArr: masarray,
                                            eta: etaThreshold,
                                            bookingAmountAllowUpto: bookingAmountAllowUpto,
                                            versions: versions,
                                            bookingStatus: bookingStatus,
                                            flag: 0,
                                            types: array_values(TypeArray)
                                        };
//                                        console.log(masarray);
//                                        if(masarray[0].mas.length == 0){
//                                            CallLogic.DriverNotFound(mm, function (err, result1) {
//                                                if (err) {
//                                                    console.log("error while getting bookingStatus: " + err);
//                                                } else {
//                                                    
//                                                }
//                                            });
//                                        }
                                    }else
                                        return_ = {a: 2,
                                            flag: 1,
                                            types: []
                                        };
//                                    console.log(return_);
                                    pubnub.publish({
                                        channel: mm.chn,
                                        message: return_,
                                        callback: function (e) {
//                                            console.log("SUCCESS!", return_);
//                                            console.log("SUCCESS!", mm.chn);
                                        },
                                        error: function (e) {
                                            console.log("FAILED! RETRY PUBLISH!", e);
                                        }
                                    });
                                }
                        );

                        break;
                    case 3: // passaner gets his in booking data 
//                          console.log(mm.sid);
                        Utility.SelectOne('appointments', {'slave_id.slaveId': parseInt(mm.sid), UpdateReview: 1, status: {$in: [6, 7, 8, 9, 11]}}, function (err, result1) {
                            if (err) {
                                console.log("no data found Status Error : " + err);
                            } else if (result1) {
                                if (Object.keys(result1).length > 0 && result1.BOOKING) {
                                    var driverInfo = {};
                                    var invoice = {};

                                    result1.BOOKING.forEach(function (item) {
                                        if (item.DriverId == parseInt(result1.mas_id)) {
                                            driverInfo = {
                                                email: item.email,
                                                pPic: item.pPic,
                                                masChn: item.masChn,
                                                mobile: item.mobile,
                                                fName: item.fName,
                                                lName: item.lName,
                                                rating: item.rating,
                                                mid: item.DriverId
                                            };
                                        }
                                    });
                                    if (result1.status == 9) {
                                        result1.invoice.forEach(function (item) {
                                            if (result1.PayMentType == '1')
                                                item.amount -= item.walletDeducted;
                                            invoice = {
                                                discountType: item.discountType,
                                                discountVal: item.discountVal,
                                                min_fare: result1.vehicleType.minmunfare,
                                                code: result1.code,
                                                tipPercent: result1.tip_percent,
                                                distanceFee: item.TripDistanceFee,
                                                routeImg: result1.routeImg,
                                                timeFee: item.TripTimeFee,
                                                tollFee: 0,
                                                airportFee: item.airportFee,
                                                parkingFee: 0,
                                                tip: item.tip,
                                                Favouritepickup: result1.Favouritepickup,
                                                CashCollected: item.cashCollected,
                                                cardDeduct: item.cardDeduct,
                                                walletDebitCredit: item.walletDebitCredit,
                                                walletbal: (parseInt(item.customerWalletBal) - item.walletDeducted),
                                                Favouritedrop: result1.Favouritedrop,
                                                baseFee: item.baseFare,
                                                waitingFee: item.waitingTimeFee,
                                                waitingTime: (item.waitingTime * 60),
                                                pickupDt: result1.appointment_dt,
                                                dropDt: result1.drop_dt,
                                                dis: item.TripDistance,
                                                dur: (item.TripTime * 60),
                                                walletDeducted: item.walletDeducted,
                                                subTotal: item.subtotal,
                                                sumOfLastDue: result1.slave_id.sumAllEarning,
//                                                duePayment : item.tripamount,
                                                duePayment: (result1.slave_id.sumAllEarning + item.amount),
                                                extraChargeTitle: item.extraChargeTitle,
                                                amount: item.amount,
                                                payType: result1.payment_type,
                                            }

                                        });
                                    }




                                    //   console.log('driverdata' + driverInfo);

                                    var ApptData = {
                                        'pickLat': result1.appointment_location.latitude,
                                        'pickLong': result1.appointment_location.longitude,
                                        'addr1': result1.appointment_address,
                                        'desLat': result1.Drop_location.latitude,
                                        'desLong': result1.Drop_location.longitude,
                                        'dropAddr1': result1.Drop_address,
                                        'apptDt': result1.appointment_dt,
                                        'UpdateReview': result1.UpdateReview,
                                        'email': driverInfo.email,
                                        'bid': result1._id,
                                        'typeId': result1.vehicleType.typeId,
                                        'chn': driverInfo.masChn,
                                        'make': result1.VehicleDetails.make,
                                        'model': result1.VehicleDetails.modal,
                                        'color': result1.VehicleDetails.color,
                                        'plateNo': result1.VehicleDetails.plateNo,
                                        'carMapImage': result1.VehicleDetails.carMapImage,
                                        'carImage': result1.VehicleDetails.carImage,
                                        'r': (driverInfo.rating == 0)?5:driverInfo.rating,
                                        'share': result1.Share,
                                        'pPic': driverInfo.pPic,
                                        'mid': driverInfo.mid,
                                        'mobile': driverInfo.mobile,
                                        'fName': driverInfo.fName,
                                        'lName': driverInfo.lName,
                                        'tipPercent': result1.tipPercent,
                                        'status': (result1.status == 11) ? 8 : result1.status,
                                        'rateStatus': result1.rateStatus,
                                        'Invoice': invoice
                                    };

                                    return_ = {
                                        a: 4,
                                        data: ApptData
                                    };
                                    pubnub.publish({
                                        channel: mm.chn,
                                        message: return_,
                                        callback: function (e) {
//                                            console.log("SUCCESS!", return_);
                                        },
                                        error: function (e) {
                                            console.log("FAILED! RETRY PUBLISH!", e);
                                        }
                                    });
                                }
                            }
                        });
                        break;
                }


    }
});
function array_values(input) {

    var tmpArr = []
    var key = ''

    for (key in input) {
        tmpArr[tmpArr.length] = input[key]
    }

    return tmpArr
}



var CallLogic = require("./CronJob");
var cron = require('node-cron');
//0 0 0


cron.schedule('0 0 0 * * *', function () {
    console.log('running a task midnigh');

////    app.post('/paycycle', function (req, res) {
//    CallLogic.CheckPaymentCycle(null, function (err, result) {
//        if (err) {
//            console.log("error while getting bookingStatus: " + err);
//        } else {
//            var respond = {"timeExecuted": moment().unix(), "CycleData": result};
//            Utility.Insert('cronjobData', respond, function (err, result1) {
////                res.send(respond);
//            });
//        }
//    });
////    });

//    var CallLogic = require("./CronJob");
    CallLogic.ExecuteGuaranteeBonus(null, function (err, result1) {
        if (err) {
            console.log("error while getting bookingStatus: " + err);
        } else {
            Utility.Insert('cronjobData', {"timeExecuted": moment().unix(), 'BonusGuarantee':""}, function (err, result1) {
                if (err) {
                    console.log("dispatchZones" + err);
                }
            });

            //console.log("Executed All Command" + err);
        }
    });

    CallLogic.LogoutDriverIfNotActing(moment().unix() - parseInt(config.get('define.driverTOlogout')), function (err, result1) {
        if (err) {
            console.log("error while getting bookingStatus: " + err);
        } else {
            Utility.Insert('cronjobData', {"timeExecuted": moment().unix(), "LogoutDriverIfNotActing": "1"}, function (err, result1) {
                if (err) {
                    console.log("dispatchZones" + err);
                }
            });
            //console.log("Executed All Command" + err);
        }
    });
});
// 0 */6 * * * -- every 6 hours
cron.schedule('0 0 */6 * * *', function () {
//cron.schedule('*/5 * * * * *', function () {
    console.log('running a task every 6 Hours');

    CallLogic.AutoUnblockDriver(null, function (err, result) {
        if (err) {
            console.log("error while getting bookingStatus: " + err);
        } else {
            Utility.Insert('cronjobData', {"timeExecuted": moment().unix(), "driverUnblocked": result}, function (err, result1) {

            });
        }
    });

});
//0 0 0 * * * - Every Mid Night
cron.schedule('0 0 1 * * *', function () {
    console.log('running a task every Mid Night 1AM');

//    app.post('/paycycle', function (req, res) {
    CallLogic.CheckPaymentCycle(null, function (err, result) {
        if (err) {
            console.log("error while getting bookingStatus: " + err);
        } else {
            var respond = {"timeExecuted": moment().unix(), "CycleData": result};
            Utility.Insert('cronjobData', respond, function (err, result1) {
//                res.send(respond);
            });
        }
    });
//    });
});

cron.schedule('0 0 0 * * 0', function () {
//cron.schedule('*/5 * * * * *', function () {
    console.log('running a task every Sunday Midnight');
    CallLogic.AutoBlockDriver(null, function (err, result) {
        if (err) {
            console.log("error while getting bookingStatus: " + err);
        } else {
            Utility.Insert('cronjobData', {"timeExecuted": moment().unix(), "driverBlocked": result}, function (err, result1) {

            });
        }
    });
});



var express = require('express');
var app = express();

app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

app.get('/', function (req, res) {
    res.status(200).send('you will never know who i m...');
});

var bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

var push_service = require('./push.js');


app.post('/paycycle', function (req, res) {
    CallLogic.CheckPaymentCycle(null, function (err, result) {
        if (err) {
            console.log("error while getting bookingStatus: " + err);
        } else {
            var respond = {"timeExecuted": moment().unix(), "CycleData": result};
            Utility.Insert('cronjobData', respond, function (err, result1) {
                res.send(respond);
            });
        }
    });
});
app.post('/execFua', function (req, res) {
    CallLogic.ExecuteGuaranteeBonus(null, function (err, result1) {
        if (err) {
            console.log("error while getting bookingStatus: " + err);
        } else {
            Utility.Insert('cronjobData', {"timeExecuted": moment().unix(), 'BonusGuarantee':""}, function (err, result1) {
                if (err) {
                    console.log("dispatchZones" + err);
                }
            });

            //console.log("Executed All Command" + err);
        }
    });
});
app.post('/triggerGuarantee', function (req, res) {

    if (typeof req.body.ent_guarantee_id != 'undefined') {
//        var CallLogic = require("./CronJob");
        CallLogic.ExecuteGuaranteeBonus(req.body.ent_guarantee_id, function (err, resultData) {
            if (err) {
                console.log("error while getting bookingStatus: " + err);
            } else {
//                Utility.Insert('cronjobData', {"timeExecuted": moment().unix(), 'triggerId': req.body.ent_guarantee_id}, function (err, result1) {
//                    if (err) {
//                        console.log("dispatchZones" + err);
//                    } else {
                console.log("Executed All Command" + err);
//                    }

//                    if (resultData == null)
                res.send({'error': 0});
//                });
            }
        });



    } else
        res.send({'error': 1});

});

app.post('/sendpush', function (req, res) {
    console.log(req.body);

    if (req.body.ent_dev_type == '2') {

        push_service.sendGCMPush({
            registration_id: req.body.ent_push_tocken,
            push_data: req.body.ent_message,
            push_type: req.body.ent_message_type,
            payload: {
                type: req.ent_message_type,
                pushMsg: req.body.ent_message
            }
        }, function (err, result) {
            if (err) {
                console.log('error: ' + err.message);
            } else {
                console.log('success');
            }
        });
    } else if (req.body.ent_dev_type == '1') {
//var param = validator.trim(validator.stripLow(req.body.ent_message ? req.body.ent_message : ''))


        push_service.sendIOSPush({
            registration_id: req.body.registrationId,
            user_type: req.body.user_type,
            payload: req.body.payload
        }, function (err, result) {
            if (err) {
                console.log('error: ' + err.message);
            } else {
                console.log('success');
            }
        });

    }
});
app.post('/getBooking', function (req, res) {
    //Driver GOt New Booking
    var mm = req.body;
//    console.log(mm);
    if (typeof parseInt(mm.bid) != 'undefined') {
        var data = {'BOOKING.$.receiveDt': moment().format("YYYY-MM-DD HH:mm:ss"), 'BOOKING.$.Status': "Received But Didn't Respond"};
        Utility.SelectOne('appointments', {_id: parseInt(mm.bid)}, function (err, result1) {
            if (err) {
                console.log("Booking data not found ERROR while inserting: " + err);
            } else if (result1) {
                var getExpiryTime;
                result1.BOOKING.forEach(function (item) {
                    if (item.DriverId == parseInt(mm.mid)) {
                        getExpiryTime = item.ExpiryTime;
                    }
                });
                var maxExpiryTime = (parseInt(result1.ExpiryLimit) * 0.6);
                if ((getExpiryTime - (moment().unix())) > maxExpiryTime && result1.status == 1) {
                    var return_ = {
                        alert: 'You Got New Booking\nPickup Location : ' + result1.appointment_address,
                        category: "JobRequest",
                        nt: '11',
                        ackn: 0,
                        a: 15,
                        CustomerWalletBalance: result1.CustomerWalletBalance,
                        sid: result1.slave_id.slaveId,
                        bid: result1._id,
                        adr2: result1.appointment_address,
                        dist: result1.pickupDistance,
                        ETA: result1.pickupETA,
                        lt: result1.appointment_location.latitude,
                        lg: result1.appointment_location.longitude,
                        DropAddress: result1.Drop_address,
                        DropLat: result1.Drop_location.latitude,
                        DropLong: result1.Drop_location.longitude,
                        CutomerBal: result1.CustomerWalletBalance,
                        CustomerName: result1.slave_id.SlaveName,
                        CustomerPone: result1.slave_id.SlavePone,
                        additional_info: result1.additional_info,
                        chn: result1.slave_id.SlaveChan,
                        dt: result1.appointment_dt,
                        iswallet: result1.wallet,
                        PayMentType: result1.PayMentType,
                        ExpiryTime: moment().unix(mm.receiveDt) + parseInt(result1.ExpiryLimit),
                        ExpirySecond: (getExpiryTime - (moment().unix())) > 0 ? (getExpiryTime - (moment().unix())) : 0,
                    };
                    Utility.Update('appointments', {_id: parseInt(mm.bid), "BOOKING.DriverId": parseInt(mm.mid), status: {'$in': [1, 3]}}, data, function (err, result1) {
                        if (err) {
                            console.log("Booking receiveDt ERROR while inserting: " + err);
                        } else {
//                            console.log({'error': 0, 'data':return_});
                            res.send({'error': 0, 'data': return_});
                        }
                    });
                } else {
//                    console.log({'error': 1, 'msg': 'Booking Expired or Accepted By another'});
                    res.send({'error': 1, 'msg': 'Booking Expired or Accepted By another'});
                }
            } else {
//                console.log({'error': 1, 'msg': 'Booking Not Found'});
                res.send({'error': 1, 'msg': 'Booking Not Found'});
            }
        });
    } else {
//        console.log({'error': 1, 'msg': 'Invalid Call'});
        res.send({'error': 1, 'msg': 'Invalid Call'});
    }
});

pubnub.subscribe({
    channel: config.get('define.bookingChn'),
    callback: function (mm) {

        if (["6", "7", "8"].indexOf(mm.a) > -1) {
//            console.log('update' + JSON.stringify(mm));
            async.waterfall(
                    [
                        function (callback) {
                            var cond = {user: parseInt(mm.driverid)};
//                            var newdata = {status: parseInt(status)};
                            var newdata = {location: {longitude: parseFloat(mm.lg),
                                    latitude: parseFloat(mm.lt)}, lastTs: moment().unix()};

                            Utility.Update('location', cond, newdata, function (err, result1) {
                                if (err) {
                                    console.log("Presence Status Error : ");
                                } else if (result1) {
                                    if (typeof mm.bid != 'undefined' && parseInt(mm.bid) > 0) {
                                        var data = {route: {longitude: parseFloat(mm.lg), latitude: parseFloat(mm.lt)}};
                                        Utility.SelectOne('booking_route', {bid: mm.bid}, function (err, result1) {
                                            if (err) {
//                                                console.log("Update Status Error : " + err);
                                            } else if (result1) {
//                                                console.log("inserting 1 ");
                                                if (Object.keys(result1).length > 0) {
//                                                    console.log("inserting 2 ");
                                                    Utility.UpdatePush('booking_route', {bid: mm.bid}, data, function (err, result1) {
                                                        if (err) {
                                                            console.log("booking_route Not Pushed : " + err);
                                                        }
                                                    });
                                                } else {
//                                                    console.log("inserting 3  ");
                                                    Utility.Insert('booking_route', {bid: mm.bid, route: [{longitude: parseFloat(mm.lg), latitude: parseFloat(mm.lt)}]}, function (err, result1) {
                                                        if (err) {
                                                            console.log("Booking Route Not inserted: " + err);
                                                        }
                                                    });
                                                }

//                                                
                                            } else {
                                                Utility.Insert('booking_route', {bid: mm.bid, route: [{longitude: parseFloat(mm.lg), latitude: parseFloat(mm.lt)}]}, function (err, result1) {
                                                    if (err) {
                                                        console.log("Booking Route Not inserted: " + err);
                                                    }
                                                });
                                            }
                                            callback(null, callback);
                                        });
                                    }


                                }
                            });

                        }], function (err, status) {

//                console.log('updated');
            }
            );

        }


    }
});


var port = process.env.PORT || 2040;
var httpServer = require('http').createServer(app);
httpServer.listen(port, function () {
    console.log('server is running ' + port + '.');
});


//pubnub.subscribe({
//    channel: 'godzviewChn',
//    callback: function (m) {
//        console.log('something changed:', m);
//    }
//});

var MongoStream = require('mongo-trigger');
//var MongoStream = require('mongo-watch');
//
//var watcher = new MongoStream({format: 'pretty'});
var watcher = new MongoStream({username: config.get('define.MongoDBUser'), password: config.get('define.MongoDBPass'), authdb: config.get('define.MongoDBName'), useMasterOplog: true});

watcher.watch(config.get('define.MongoDBName') + '.location', function (event) {
//    console.log('something changed:', event);
//event.data._id
    pubnub.here_now({
        channel: 'godzviewChn',
        callback: function (m) {
//            console.log('something changed:', m.occupancy);
            if (m.occupancy >= 1)
            {
                pubnub.publish({
                    channel: 'godzviewChn',
                    message: event,
                    callback: function (e) {

                        console.log('published');
                    },
                    error: function (e) {
                        console.log("FAILED! RETRY PUBLISH!", e);
                    }
                });
            }
        }
    });
});


