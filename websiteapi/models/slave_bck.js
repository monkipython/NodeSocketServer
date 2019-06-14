var Mongo = require('../databases/UtilityFunc');
var mysqlDb = require('../databases/mysql');
var async = require("async");
var status = require('../statusMsg/status');
var moment = require('moment');
var ObjectID = require('mongodb').ObjectID;
var fs = require('fs');
var md5 = require('js-md5');
var jwt = require('jsonwebtoken');
var userSessionTime = 489800;
var asyncLoop = require('node-async-loop');

// =============== require stripe =================
var stripe = require('stripe')("sk_live_aM2L5OTMkqSgPHTZBGRfoc6g");



// NEW CUSTOMER SIGNUP API
module.exports.signup = function (request, reply) {
    async.waterfall(
            [
                function (firstCall) {
                    request.payload.ent_password = md5(request.payload.ent_password);
                    var Query = "select * from patient where email = '" + request.payload.ent_email + "'";
                    mysqlDb.ExecuteQuery(Query, function (err, userdetails) {
                        if (err) {
                            console.log(err);
                        } else {
                            if (userdetails.flag == 0) {
                                reply(status.status(4, Query));
                            } else {
                                firstCall(null);
                            }
                        }
                    });
                }, function (secondCall) {
                    var Query = "select * from patient where phone = '" + request.payload.ent_mobile + "'";
                    mysqlDb.ExecuteQuery(Query, function (err, userdetails) {
                        if (err) {
                            console.log(err);
                        } else {
                            if (userdetails.flag == 0) {
                                reply(status.status(413, Query));
                            } else {
                                secondCall(null);
                            }
                        }
                    });
                }, function (thirdCall) {
                    var Query = "insert into patient(first_name,last_name,profile_pic,email,password,country_code,phone,status,signup_type)value('" + request.payload.ent_first_name + "','" + request.payload.ent_last_name + "','" + request.payload.ent_profile_pic + "','" + request.payload.ent_email + "','" + request.payload.ent_password + "','" + request.payload.ent_country_code + "','" + request.payload.ent_mobile + "','2','" + request.payload.ent_signup_type + "')";
                    mysqlDb.ExecuteQuery(Query, function (err, userdetails) {
                        if (err) {
                            console.log(err);
                        } else {
                            thirdCall(null);
                        }
                    });
                }, function (forthCall) {
                    var Query = "select * from patient where email = '" + request.payload.ent_email + "'";
                    mysqlDb.ExecuteQuery(Query, function (err, userdetails) {
                        if (err) {
                            console.log(err);
                        } else {
                            if (userdetails.flag == 0) {
                                forthCall(null, userdetails);
                            } else {
                                reply(status.status(413, Query));
                            }
                        }
                    });
                }, function (userdetails, fifthCall) {
                    var mongoData = {
                        cid: userdetails['data'][0]['patient_id'],
                        fname: request.payload.ent_first_name,
                        lname: request.payload.ent_last_name,
                        mobile: request.payload.ent_mobile,
                        email: request.payload.ent_email
                    };
                    Mongo.Insert("customer", mongoData, function (err, lastId) {
                        if (err) {
                            console.log(err);
                        } else {
                            fifthCall(userdetails);
                        }
                    });
                }
            ],
            function (userdetails) {
                var token = jwt.sign({
                    id: userdetails['data'][0]['patient_id'],
                    first_name: request.payload.ent_first_name,
                    last_name: request.payload.ent_last_name,
                    phone: request.payload.ent_mobile,
                    email: request.payload.ent_email
                }, process.env.SECRET_KEY, {
                    expiresIn: userSessionTime
                });
                reply(status.status(5, {
                    id: userdetails['data'][0]['patient_id'],
                    token: token
                }));
            });
}


// CUSTOMER LOGIN API
module.exports.login = function (request, reply) {
    async.waterfall(
            [
                function (callback) {
                    request.payload.ent_password = md5(request.payload.ent_password);
                    var Query = "select * from patient where (email = '" + request.payload.ent_email + "' or phone = '" + request.payload.ent_email + "') and password = '" + request.payload.ent_password + "'";
                    mysqlDb.ExecuteQuery(Query, function (err, userdetails) {
                        if (err) {
                            console.log(err);
                        } else {
                            if (userdetails.flag == 0) {
                                callback(userdetails);
                            } else
                                reply(status.status(6, userdetails));
                        }
                    });
                }
            ],
            function (userdetails) {
                var token = jwt.sign({
                    id: userdetails['data'][0]['patient_id'],
                    first_name: userdetails['data'][0]['first_name'],
                    last_name: userdetails['data'][0]['last_name'],
                    phone: userdetails['data'][0]['phone'],
                    email: request.payload.ent_email
                }, process.env.SECRET_KEY, {
                    expiresIn: userSessionTime
                });
                reply(status.status(2, {
                    id: userdetails['data'][0]['patient_id'],
                    profile_pic: userdetails['data'][0]['profile_pic'],
                    token: token
                }));
            });
}


// LIVE BOOKING  API
module.exports.livebooking = function (request, reply) {

    jwt.verify(request.payload.ent_sess_token, process.env.SECRET_KEY, function (err, token) {
        if (err) {
            reply(status.status(7));
        } else {
            async.waterfall(
                    [
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
                                        provider_id: "0",
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
                                            id: token.id.toString(),
                                            fname: token.first_name,
                                            lname: token.last_name,
                                            pic: token.profile_pic,
                                            email: token.email,
                                            mobile: token.mobile
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
                                var requesttp = require('request');
                                if (!(typeof request.payload.ent_pro_id !== 'undefined' && request.payload.ent_pro_id && request.payload.ent_pro_id != ""))
                                {
                                    requesttp("http://goclean-service.com:9999/dispatchbooking?bid=" + args.bid + '&btype=' + request.payload.ent_booking_type, function (err, res, body) {
                                    });
                                } else
                                {
                                    Mongo.Update("bookings", {'bid': args.bid.toString()}, {provider_id: request.payload.ent_pro_id, status: 1}, function (err, bData) {
                                        if (err) {
                                            console.log(err);
                                        } else {
                                            requesttp("http://goclean-service.com:9999/sendBookingFromDispatcher?bid=" + args.bid, function (err, res, body) {
                                            });
                                        }
                                    });
                                }
                                reply(status.status(78, ""));
                            }
                        });
                    });
        }
    });
}



// CANCEL BOOKING  API
module.exports.cancelbooking = function (request, reply) {

    jwt.verify(request.payload.ent_sess_token, process.env.SECRET_KEY, function (err, token) {
        if (err) {
            reply(status.status(7));
        } else {
            var verUpdateData = {
                status: 9
            };
            Mongo.Update("bookings", {bid: request.payload.ent_bid.toString()}, verUpdateData, function (err, res) {
                if (err) {
                    console.log(err);
                } else {
                    reply(status.status(200));
                }
            });
        }
    });
}


//GET ALL CARDS  API
module.exports.card = function (request, reply) {

    jwt.verify(request.params.ent_sess_token, process.env.SECRET_KEY, function (err, token) {
        if (err) {
            reply(status.status(7));
        } else {
            var Query = "select * from patient where patient_id = '" + token.id + "'";
            mysqlDb.ExecuteQuery(Query, function (err, userdetails) {
                if (err) {
                    console.log(err);
                } else {
                    var cardsArr = [];
                    if (userdetails['data'][0]['stripe_id'] == "")
                    {
                        reply(status.status(2, {cardsArr: cardsArr}));
                    } else
                    {
                        stripe.customers.retrieve(
                                userdetails['data'][0]['stripe_id'],
                                function (err, customer) {
                                    if (err) {
                                        reply(status.status(2, {cardsArr: cardsArr}));
                                    }
                                    customer['sources']['data'].forEach(function (appt) {
                                        cardsArr.push({
                                            id: appt['id'],
                                            brand: appt['brand'],
                                            last4: appt['last4'],
                                            exp_month: appt['exp_month'],
                                            exp_year: appt['exp_year']
                                        });
                                    });
                                    reply(status.status(2, {cardsArr: cardsArr}));
                                }
                        );
                    }
                }
            });
        }
    });
}


//DELETE CARD  API
module.exports.DeleteCard = function (request, reply) {
    jwt.verify(request.payload.ent_sess_token, process.env.SECRET_KEY, function (err, token) {
        if (err) {
            reply(status.status(7));
        } else {
            var Query = "select * from patient where patient_id = '" + token.id + "'";
            mysqlDb.ExecuteQuery(Query, function (err, userdetails) {
                if (err) {
                    console.log(err);
                } else {
                    if (userdetails['data'][0]['stripe_id'] == "")
                    {
                        reply(status.status(200));
                    } else
                    {
                        stripe.customers.deleteCard(
                                userdetails['data'][0]['stripe_id'],
                                request.payload.ent_card_id,
                                function (err, confirmation) {
                                    if (err) {
                                        reply(status.status(412));
                                    }
                                    reply(status.status(200));
                                }
                        );
                    }
                }
            });
        }
    });
}

//ADD CARD  API
module.exports.AddCard = function (request, reply) {
    jwt.verify(request.payload.ent_sess_token, process.env.SECRET_KEY, function (err, token) {
        if (err) {
            reply(status.status(7));
        } else {
            var Query = "select * from patient where patient_id = '" + token.id + "'";
            mysqlDb.ExecuteQuery(Query, function (err, userdetails) {
                if (err) {
                    console.log(err);
                } else {
                    if (userdetails['data'][0]['stripe_id'] == "")
                    {
                        reply(status.status(200));
                    } else
                    {
                        reply(status.status(200));
                    }
                }
            });
        }
    });
}



// checkMobile  API
module.exports.checkMobile = function (request, reply) {

    var Query = "select * from patient where phone = '" + request.params.ent_mobile + "'";
    mysqlDb.ExecuteQuery(Query, function (err, userdetails) {
        if (err) {
            console.log(err);
        } else {
            if (userdetails.flag == 0) {
                reply(status.status(413, Query));
            } else {
                reply(status.status(200, Query));
            }
        }
    });
}

// checkMobile  API
module.exports.checkEmail = function (request, reply) {

    var Query = "select * from patient where email = '" + request.params.ent_email + "'";
    mysqlDb.ExecuteQuery(Query, function (err, userdetails) {
        if (err) {
            console.log(err);
        } else {
            if (userdetails.flag == 0) {
                reply(status.status(414, Query));
            } else {
                reply(status.status(200, Query));
            }
        }
    });
}


// VerificationCode  API
module.exports.VerificationCode = function (request, reply) {
    var verUpdateData = {
        mobile: request.params.ent_mobile,
        code: 1111,
        ts: moment().unix()
    };
    Mongo.SelectOne("verification", {'mobile': request.params.ent_mobile}, function (err, result) {
        if (err) {
            console.log(err);
        } else if (result) {
            Mongo.Update("verification", {mobile: request.params.ent_mobile}, verUpdateData, function (err, res) {
                if (err) {
                    console.log(err);
                } else {
                    reply(status.status(13));
                }
            });
        } else {
            Mongo.Insert("verification", verUpdateData, function (err, res) {
                if (err) {
                    console.log(err);
                } else {
                    reply(status.status(13));
                }
            });
        }
    });
}


//module.exports.livebooking = function (request, reply) {
//
//    mysqlDb.checkSessions(request.payload.ent_sess_token, 2, request.payload.ent_dev_id, function (err, res) {
//        if (err) {
//            console.log(err)
//        } else {
//            if (res.flag == 0) {
//                async.waterfall(
//                        [
//                            function (firstCall) {
//                                console.log('first Block');
//                                if (request.payload.ent_booking_type == 2) {
//                                    if (request.payload.ent_pro_id == "")
//                                        reply(status.status(411));
//                                    else if (request.payload.ent_slot_id == "")
//                                        reply(status.status(411));
//                                    else {
//                                        firstCall(null);
//                                    }
//                                } else if (request.payload.ent_booking_type == 1) {
//                                    firstCall(null);
//                                } else {
//                                    reply(status.status(412));
//                                }
//                            }, function (secondCall) {
//                                console.log('second Block');
//                                Mongo.getLastIdInCollection("bookings", {'_id': 1}, {'_id': -1}, function (err, lastId) {
//                                    if (err) {
//                                        console.log(err);
//                                    } else if (lastId.length > 0) {
//                                        secondCall(null, lastId);
//                                    } else {
//                                        console.log(lastId);
//                                        reply(status.status(38));
//                                    }
//                                });
//                            }, function (lastId, thiredCall) {
//                                console.log('thired Block');
//                                Mongo.SelectOne("Category", {'_id': new ObjectID(request.payload.ent_cat_id)}, function (err, categoryRes) {
//                                    if (err) {
//                                        console.log(err);
//                                    } else if (categoryRes) {
//                                        var booking_id = lastId[0]._id + 1;
//                                        datatoinsert = {
//                                            _id: parseInt(booking_id),
//                                            bid: booking_id.toString(),
//                                            provider_id: "0",
//                                            status: 1,
//                                            appt_created: request.payload.ent_date_time,
//                                            booking_type: request.payload.ent_booking_type,
//                                            cat_id: request.payload.ent_cat_id,
//                                            cat_name: categoryRes.cat_name,
//                                            appt_lat: request.payload.ent_lat,
//                                            appt_long: request.payload.ent_long,
//                                            card_token: request.payload.ent_card_id,
//                                            appt_date: request.payload.ent_appnt_dt,
//                                            device_type: request.payload.ent_device_type,
//                                            customer_notes: request.payload.ent_job_details,
//                                            appt_expire: 1523865560,
//                                            address1: request.payload.ent_address1,
//                                            cancel_amount: categoryRes.can_fees,
//                                            customer: {
//                                                id: res.result[0].entityId.toString(),
//                                                fname: res.result[0].firstName,
//                                                lname: res.result[0].last_name,
//                                                pic: res.result[0].profile_pic,
//                                                email: res.result[0].email,
//                                                mobile: res.result[0].mobile
//                                            }
//                                        };
//                                        thiredCall(datatoinsert);
//                                    } else {
//                                        reply(status.status(38));
//                                    }
//                                });
//                            }
//                        ],
//                        function (args) {
//                            console.log('four Block');
//                            Mongo.Insert("bookings", args, function (err, lastId) {
//                                if (err) {
//                                    console.log(err);
//                                } else {
//                                    var requesttp = require('request');
//                                    requesttp("http://goclean-service.com:9999/dispatchbooking?bid=" + args.bid + '&btype=' + request.payload.ent_booking_type, function (err, res, body) {
//                                    });
//                                    reply(status.status(78, ""));
//                                }
//                            });
//                        });
//            } else {
//                reply(status.status(7));
//            }
//        }
//
//    });
//}


module.exports.currentbookings = function (request, reply) {
    jwt.verify(request.params.ent_sess_token, process.env.SECRET_KEY, function (err, token) {
        if (err) {
            reply(status.status(7));
        } else {
            var current_bookings = [];
            var sort_by = {'_id': -1};
            var cond = {'customer.id': token.id.toString(), 'provider_id': {'$ne': "0"}};
            Mongo.SelectWIthLimitAndIndex("bookings", sort_by, cond, request.params.ent_page_index, function (err, appointments) {
                if (err) {
                    console.log(err);
                } else {
                    appointments.forEach(function (appt) {
                        if (appt['status'] == 2 || appt['status'] == 5 || appt['status'] == 6 || appt['status'] == 21 || appt['status'] == 22)
                        {
                            current_bookings.push({
                                bid: appt['bid'],
                                pro_name: appt['provider']['fname'],
                                pro_profile_pic: appt['provider']['profile_pic'],
                                pro_mobile: appt['provider']['mobile'],
                                pro_email: appt['provider']['email'],
                                appt_date: appt['appt_date'],
                                address1: appt['address1'],
                                status: status.bookingStatus(appt['status'])
                            });
                        }
                    });
                    reply(status.status(2, {
                        current_bookings: current_bookings
                    }));
                }
            });
        }
    });
}



module.exports.pastbookings = function (request, reply) {
    jwt.verify(request.params.ent_sess_token, process.env.SECRET_KEY, function (err, token) {
        if (err) {
            reply(status.status(7));
        } else {
            var past_bookings = [];
            var sort_by = {'_id': -1};
            var cond = {'customer.id': token.id.toString(), 'provider_id': {'$ne': "0"}};
            Mongo.SelectWIthLimitAndIndex("bookings", sort_by, cond, request.params.ent_page_index, function (err, appointments) {
                if (err) {
                    console.log(err);
                } else {
                    appointments.forEach(function (appt) {
                        if (appt['status'] == 3 || appt['status'] == 4 || appt['status'] == 9 || appt['status'] == 10 || appt['status'] == 7)
                        {
                            past_bookings.push({
                                bid: appt['bid'],
                                pro_name: appt['provider']['fname'],
                                pro_profile_pic: appt['provider']['profile_pic'],
                                pro_mobile: appt['provider']['mobile'],
                                pro_email: appt['provider']['email'],
                                appt_date: appt['appt_date'],
                                address1: appt['address1'],
                                status: status.bookingStatus(appt['status'])
                            });
                        }
                    });
                    reply(status.status(2, {
                        past_bookings: past_bookings
                    }));
                }
            });
        }
    });
}


module.exports.profile = function (request, reply) {
    jwt.verify(request.params.ent_sess_token, process.env.SECRET_KEY, function (err, token) {
        if (err) {
            reply(status.status(7));
        } else {
            var Query = "select * from patient where patient_id = '" + token.id + "'";
            mysqlDb.ExecuteQuery(Query, function (err, userdetails) {
                if (err) {
                    console.log(err);
                } else {
                    var token = jwt.sign({
                        id: userdetails['data'][0]['patient_id'],
                        first_name: userdetails['data'][0]['first_name'],
                        last_name: userdetails['data'][0]['last_name'],
                        phone: userdetails['data'][0]['phone'],
                        email: userdetails['data'][0]['email']
                    }, process.env.SECRET_KEY, {
                        expiresIn: userSessionTime
                    });
                    reply(status.status(2, {
                        id: userdetails['data'][0]['patient_id'],
                        first_name: userdetails['data'][0]['first_name'],
                        last_name: userdetails['data'][0]['last_name'],
                        profile_pic: userdetails['data'][0]['profile_pic'],
                        country_code: userdetails['data'][0]['country_code'],
                        phone: userdetails['data'][0]['phone'],
                        email: userdetails['data'][0]['email'],
                        token: token
                    }));
                }
            });
        }
    });
}



module.exports.UpdateProfile = function (request, reply) {
    jwt.verify(request.payload.ent_sess_token, process.env.SECRET_KEY, function (err, token) {
        if (err) {
            reply(status.status(7));
        } else {
            var Query = "update patient set first_name = '" + request.payload.ent_first_name + "', last_name = '" + request.payload.ent_last_name + "' , phone = '" + request.payload.ent_mobile + "' where patient_id = '" + token.id + "'";
            mysqlDb.ExecuteQuery(Query, function (err, userdetails) {
                if (err) {
                    console.log(err);
                } else {
                    var updata = {
                        fname: request.payload.ent_first_name,
                        lname: request.payload.ent_last_name
                    }
                    Mongo.Update("customer", {cid: parseInt(token.id)}, updata, function (err, res) {
                        if (err) {
                            console.log(err);
                        } else {
                            var Query = "select * from patient where patient_id = '" + token.id + "'";
                            mysqlDb.ExecuteQuery(Query, function (err, userdetails) {
                                if (err) {
                                    console.log(err);
                                } else {
                                    var token = jwt.sign({
                                        id: userdetails['data'][0]['patient_id'],
                                        first_name: userdetails['data'][0]['first_name'],
                                        last_name: userdetails['data'][0]['last_name'],
                                        phone: userdetails['data'][0]['phone'],
                                        email: userdetails['data'][0]['email']
                                    }, process.env.SECRET_KEY, {
                                        expiresIn: userSessionTime
                                    });
                                    reply(status.status(2, {
                                        token: token
                                    }));
                                }
                            });
                        }
                    });
                }
            });
        }
    });
}


module.exports.bookings = function (request, reply) {
    jwt.verify(request.params.ent_sess_token, process.env.SECRET_KEY, function (err, token) {
        if (err) {
            reply(status.status(7));
        } else {
            var past_bookings = [];
            var current_bookings = [];
            var sort_by = {'_id': -1};
            var cond = {'customer.id': token.id.toString(), 'provider_id': {'$ne': "0"}};
            Mongo.SelectWIthLimitAndIndex("bookings", sort_by, cond, request.params.ent_page_index, function (err, appointments) {
                if (err) {
                    console.log(err);
                } else {
                    appointments.forEach(function (appt) {
                        if (appt['status'] == 3 || appt['status'] == 4 || appt['status'] == 9 || appt['status'] == 10 || appt['status'] == 7)
                        {
                            past_bookings.push({
                                bid: appt['bid'],
                                pro_name: appt['provider']['fname'],
                                pro_profile_pic: appt['provider']['profile_pic'],
                                pro_mobile: appt['provider']['mobile'],
                                pro_email: appt['provider']['email'],
                                appt_date: appt['appt_date'],
                                address1: appt['address1'],
                                status: status.bookingStatus(appt['status'])
                            });
                        } else {
                            current_bookings.push({
                                bid: appt['bid'],
                                pro_name: appt['provider']['fname'],
                                pro_profile_pic: appt['provider']['profile_pic'],
                                pro_mobile: appt['provider']['mobile'],
                                pro_email: appt['provider']['email'],
                                appt_date: appt['appt_date'],
                                address1: appt['address1'],
                                status: status.bookingStatus(appt['status'])
                            });
                        }
                    });
                    reply(status.status(2, {
                        past_bookings: past_bookings,
                        current_bookings: current_bookings
                    }));
                }
            });
        }
    });
}

module.exports.ProviderDetail = function (request, reply) {
    jwt.verify(request.params.ent_sess_token, process.env.SECRET_KEY, function (err, token) {
        if (err) {
            reply(status.status(7));
        } else {
            var Query = "select * from doctor where doc_id = '" + request.params.ent_pro_id + "'";
            mysqlDb.ExecuteQuery(Query, function (err, userdetails) {
                if (err) {
                    console.log(err);
                } else {
                    if (userdetails['flag'] == 1)
                        reply(status.status(20));
                    else {

                        //start review code
                        var Query = "SELECT * FROM doctor_ratings WHERE doc_id = '" + request.params.ent_pro_id + "' order by review_id desc";
                        mysqlDb.ExecuteQuery(Query, function (err, revdetails) {
                            if (err) {
                                console.log(err);
                            } else {
                                var rev_arr = [];
                                if (revdetails['flag'] == 0)
                                {
                                    revdetails['data'].forEach(function (val) {
                                        rev_arr.push(val);
                                    });
                                }
                                reply(status.status(2, {
                                    id: userdetails['data'][0]['doc_id'],
                                    first_name: userdetails['data'][0]['first_name'],
                                    last_name: userdetails['data'][0]['last_name'],
                                    profile_pic: userdetails['data'][0]['profile_pic'],
                                    country_code: userdetails['data'][0]['country_code'],
                                    phone: userdetails['data'][0]['mobile'],
                                    about: userdetails['data'][0]['about'],
                                    expertise: userdetails['data'][0]['expertise'],
                                    email: userdetails['data'][0]['email'],
                                    review: rev_arr
                                }));
                            }
                        });
                        //end review code
                    }
                }
            });
        }
    });
}

module.exports.BookingDetail = function (request, reply) {
    jwt.verify(request.params.ent_sess_token, process.env.SECRET_KEY, function (err, token) {
        if (err) {
            reply(status.status(7));
        } else {
            Mongo.SelectOne("bookings", {'bid': request.params.ent_bid.toString()}, function (err, bookingRes) {
                if (err) {
                    console.log(err);
                } else {
                    if (bookingRes) {
                        reply(status.status(2, {
                            bid: bookingRes['bid'],
                            customer: bookingRes['customer'],
                            provider: bookingRes['provider'],
                            services: bookingRes['services'],
                            booking_type: bookingRes['booking_type'],
                            cat_name: bookingRes['cat_name'],
                            address1: bookingRes['address1'],
                            status: bookingRes['status'],
                            visit_fees: bookingRes['visit_fees'],
                            price_min: bookingRes['price_min']
                        }));
                    } else
                        reply(status.status(22));
                }
            });
        }
    });
}


module.exports.CategoryDetail = function (request, reply) {
    jwt.verify(request.params.ent_sess_token, process.env.SECRET_KEY, function (err, token) {
        if (err) {
            reply(status.status(7));
        } else {
            Mongo.SelectOne("Category", {'_id': new ObjectID(request.params.ent_cat_id)}, function (err, categoryRes) {
                if (err) {
                    console.log(err);
                } else {
                    if (categoryRes) {
                        reply(status.status(2, {
                            cid: categoryRes['_id'].toString(),
                            cat_name: categoryRes['cat_name'],
                            cat_desc: categoryRes['cat_desc'],
                            price_min: categoryRes['price_min'],
                            visit_fees: categoryRes['visit_fees'],
                            banner_img: categoryRes['banner_img']
                        }));
                    } else
                        reply(status.status(21));
                }
            });
        }
    });
}


module.exports.city = function (request, reply) {
    jwt.verify(request.params.ent_sess_token, process.env.SECRET_KEY, function (err, token) {
        if (err) {
            reply(status.status(7));
        } else {
            var Query = "select * from city_available";
            mysqlDb.ExecuteQuery(Query, function (err, cityData) {
                if (err) {
                    console.log(err);
                } else {
                    var cityList = [];
                    cityData['data'].forEach(function (city) {
                        cityList.push({'city_id': city['City_Id'], 'city_name': city['City_Name']});
                    });
                    reply(status.status(2, cityList));
                }
            });
        }
    });
}

module.exports.verifyCode = function (request, reply) {
    if (request.params.ent_service == 1)
    {
        var code = parseInt(request.params.ent_code);
        Mongo.SelectOne("verification", {mobile: request.params.ent_mobile, code: code}, function (err, codeRes) {
            if (err) {
                console.log(err);
            } else {
                if (codeRes) {
                    reply(status.status(18));
                } else {
                    reply(status.status(17));
                }
            }
        });
    } else if (request.params.ent_service == 2) {
        var Query = "select phone,country_code from patient where  phone = " + request.params.ent_mobile + " limit 0,1";
        mysqlDb.ExecuteQuery(Query, function (err, cData) {
            if (err) {
                console.log(err);
            } else {
                if (cData['flag'] == 1)
                    reply(status.status(16));
                else {
                    var MobileNo = cData['data'][0]['country_code'] + "" + request.params.ent_mobile;
                    var code = parseInt(request.params.ent_code);
                    Mongo.SelectOne("verification", {mobile: MobileNo, code: code}, function (err, codeRes) {
                        if (err) {
                            console.log(err);
                        } else {
                            if (codeRes) {
                                reply(status.status(18));
                            } else {
                                reply(status.status(17));
                            }
                        }
                    });
                }
            }
        });
    } else {
        reply(status.status(17));
    }

}

module.exports.resetWithEmail = function (request, reply) {
    var Query = "select * from patient where email = '" + request.params.ent_email + "'";
    mysqlDb.ExecuteQuery(Query, function (err, cData) {
        if (err) {
            console.log(err);
        } else {
            if (cData['flag'] == 1)
                reply(status.status(16));
            else {
                reply(status.status(19));
            }
        }
    });
}



module.exports.categoryByCity = function (request, reply) {
    jwt.verify(request.params.ent_sess_token, process.env.SECRET_KEY, function (err, token) {
        if (err) {
            reply(status.status(7));
        } else {
            Mongo.Select("Category", {'city_id': request.params.ent_city_id}, function (err, categoryRes) {
                if (err) {
                    console.log(err);
                } else {
                    var Mileage = [];
                    var Hourly = [];
                    var Fixed = [];
                    categoryRes.forEach(function (val) {
                        if (val.fee_type == "Mileage") {
                            Mileage.push({'cat_id': val._id, 'cat_name': val.cat_name, 'cat_img': val.banner_img});
                        }
                        if (val.fee_type == "Hourly") {
                            Hourly.push({'cat_id': val._id, 'cat_name': val.cat_name, 'cat_img': val.banner_img});
                        }
                        if (val.fee_type == "Fixed") {
                            Fixed.push({'cat_id': val._id, 'cat_name': val.cat_name, 'cat_img': val.banner_img});
                        }
                    });
                    reply(status.status(2, {'Fixed': Fixed, 'Hourly': Hourly, 'Mileage': Mileage}));
                }
            });
        }
    });
}

module.exports.categoryByLatLong = function (request, reply) {

    jwt.verify(request.params.ent_sess_token, process.env.SECRET_KEY, function (err, token) {
        if (err) {
            reply(status.status(7));
        } else {
            var loc = {lat: request.params.ent_lat, lng: request.params.ent_long};
            Mongo.GeoNear("Category", {}, loc, function (err, categoryRes) {
                if (err) {
                    console.log(err);
                } else {
                    var Mileage = [];
                    var Hourly = [];
                    var Fixed = [];
                    categoryRes.results.forEach(function (val) {
                        val = val.obj;
                        if (val.fee_type == "Mileage") {
                            Mileage.push({'cat_id': val._id, 'cat_name': val.cat_name, 'cat_img': val.banner_img});
                        }
                        if (val.fee_type == "Hourly") {
                            Hourly.push({'cat_id': val._id, 'cat_name': val.cat_name, 'cat_img': val.banner_img});
                        }
                        if (val.fee_type == "Fixed") {
                            Fixed.push({'cat_id': val._id, 'cat_name': val.cat_name, 'cat_img': val.banner_img});
                        }
                    });
                    reply(status.status(2, {'Fixed': Fixed, 'Hourly': Hourly, 'Mileage': Mileage}));
                }
            });
        }
    });
}


module.exports.tasker = function (request, reply) {

    jwt.verify(request.params.ent_sess_token, process.env.SECRET_KEY, function (err, token) {
        if (err) {
            reply(status.status(7));
        } else {
            var loc = {lat: parseFloat(request.params.ent_lat), lng: parseFloat(request.params.ent_long)};
            Mongo.GeoNear("location", {'catlist.cid': request.params.ent_cat_id}, loc, function (err, proRes) {
                if (err) {
                    console.log(err);
                } else {
                    var prolist = [];
                    if (proRes.results.length > 0)
                        asyncLoop(proRes.results, function (item, next)
                        {
                            var provider = item.obj;
                            var Query = "SELECT * FROM doctor_ratings dr,patient p WHERE doc_id = '" + provider['user'] + "' and dr.patient_id = p.patient_id order by review_id desc limit 1";
                            mysqlDb.ExecuteQuery(Query, function (err, revdetails) {
                                if (err) {
                                    console.log(err);
                                } else {

                                    var cb_query = "SELECT count(*) as tot_comp FROM bookings WHERE pro_id = '" + provider['user'] + "'";
                                    mysqlDb.ExecuteQuery(cb_query, function (err, cb_res) {
                                        if (err) {
                                            console.log(err);
                                        } else {
                                            var l_rev_details = {};
                                            if (revdetails['flag'] == 0) {
                                                var l_data = {
                                                    'cust_fname': revdetails['data'][0]['first_name'],
                                                    'last_fname': revdetails['data'][0]['last_name'],
                                                    'cust_pic': revdetails['data'][0]['profile_pic'],
                                                    'review': revdetails['data'][0]['review'],
                                                    'review_dt': revdetails['data'][0]['review_dt']
                                                }
                                                l_rev_details = l_data;
                                            }
                                            prolist.push({
                                                'name': provider['name'],
                                                'lname': provider['lname'],
                                                'image': provider['image'],
                                                'last_review': l_rev_details,   
                                                'tot_comp': cb_res['data'][0]['tot_comp']
                                            });
                                            next();
                                        }
                                    });
                                }
                            });
                        }, function (err)
                        {
                            if (err)
                            {
                                console.error('Error: ' + err.message);
                                return;
                            }
                            reply(status.status(2, prolist));
                        });
                    else
                        reply(status.status(38));
                }
            });
        }
    });
}


module.exports.categoryAvailable = function (request, reply) {

    jwt.verify(request.params.ent_sess_token, process.env.SECRET_KEY, function (err, token) {
        if (err) {
            reply(status.status(7));
        } else {
            var loc = {lat: request.params.ent_lat, lng: request.params.ent_long};
            Mongo.GeoNear("Category", {}, loc, function (err, categoryRes) {
                if (err) {
                    console.log(err);
                } else {
                    var isAvailable = 0;
                    categoryRes.results.forEach(function (val) {
                        val = val.obj;
                        if (val._id == request.params.ent_cat_id)
                        {
                            isAvailable = 1;
                        }
                    });
                    reply(status.status(2, {isAvailable: isAvailable}));
                }
            });
        }
    });
}


module.exports.logout = function (request, reply) {
    jwt.verify(request.params.ent_sess_token, process.env.SECRET_KEY, function (err, token) {
        if (err) {
            reply(status.status(7));
        } else {
            reply(status.status(2));
        }
    });
}