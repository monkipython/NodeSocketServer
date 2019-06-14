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

var sendSms = require('../twillotest');



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
                var Query;

                if (request.payload.ent_signup_type == 2) {
                    console.log("face book id", request.payload.ent_fb_id);
                    Query = "insert into patient(first_name,last_name,profile_pic,email,password,country_code,phone,status,signup_type,fb_id,created_dt)value('" + request.payload.ent_first_name + "','" + request.payload.ent_last_name + "','" + request.payload.ent_profile_pic + "','" + request.payload.ent_email + "','" + request.payload.ent_password + "','" + request.payload.ent_country_code + "','" + request.payload.ent_mobile + "','3','" + request.payload.ent_signup_type + "','" + request.payload.ent_fb_id + "','" + request.payload.ent_register_date + "')";
                } else if (((!request.payload.ent_signup_type) || request.payload.ent_signup_type == 1) && request.payload.ent_fb_id == null) {
                    Query = "insert into patient(first_name,last_name,profile_pic,email,password,country_code,phone,status,signup_type,created_dt)value('" + request.payload.ent_first_name + "','" + request.payload.ent_last_name + "','" + request.payload.ent_profile_pic + "','" + request.payload.ent_email + "','" + request.payload.ent_password + "','" + request.payload.ent_country_code + "','" + request.payload.ent_mobile + "','3','" + request.payload.ent_signup_type + "','" + request.payload.ent_register_date + "')";
                }

                console.log("query", JSON.stringify(Query));

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
                        console.log("userdetails", userdetails);
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


            // var D =new Date();
            // var date1222 = moment().format('YYYY-MM-DD hh:mm:ss a')
            // var date = D.getDate();
            // var month = D.getMonth()+1;
            // var year = D.getFullYear();
            // var hour = D.getHours();
            // var minutes = D.getMinutes();
            // var sec = D.getSeconds();
            // console.log("today's time",date1222, moment.locale());

            var insertQuery = "insert into user_sessions(oid,token,expiry,user_type,type,push_token,create_date,loggedIn,app_version) value('" + userdetails['data'][0]['patient_id'] + "','" + token + "','" + token + "','" + 2 + "','" + 3 + "','" + token + "','" + request.payload.ent_register_date + "','" + 1 + "','" + "0.0.1" + "')";

            mysqlDb.ExecuteQuery(insertQuery, function (err, insertionResult) {
                if (err) {
                    console.log(err);
                } else {

                    console.log("insertionResult.flag", insertionResult.flag);
                    console.log("insertQuery", insertQuery);
                    if (insertionResult.flag == 1) {
                        console.log("insertionResult", insertionResult)
                        reply(status.status(5, {
                            id: userdetails['data'][0]['patient_id'],
                            token: token
                        }));
                    } else {
                        reply(status.status(413, insertQuery));
                        // console.log("insertionResult 000000", insertionResult);
                        // console.log("query", insertQuery);
                    }
                    // ;
                }
            })


        });
}

// NEW CUSTOMER FACEBOOK SIGNUP API AND LOGIN API
module.exports.facebooksignup = function (request, reply) {
    async.waterfall(
        [
            function (firstCall) {
                // request.payload.ent_password = md5(request.payload.ent_password);
                var Query = "select * from patient where fb_id = '" + request.payload.ent_fb_id + "'";
                mysqlDb.ExecuteQuery(Query, function (err, userdetails) {
                    if (err) {
                        console.log(err);
                    } else {
                        if (userdetails.flag == 0) {
                            console.log("already", userdetails);
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
                                token: token,
                                errFlag: 1,
                                message: "loggedin through facebook"
                            }));
                            // reply(status.status(4, userdetails));
                        } else if (userdetails.flag == 1) {
                            console.log("not there", userdetails);

                            reply(status.status(2, {
                                fb_id: request.payload.ent_fb_id,
                                errFlag: 0,
                                message: "please give registeration detailsF"
                            }));
                        }
                    }
                });
            }
        ]
    )
}


// CUSTOMER LOGIN API
module.exports.login = function (request, reply) {
    async.waterfall(
        [
            function (callback) {
                request.payload.ent_password = md5(request.payload.ent_password);
                var Query = "select * from patient where email = '" + request.payload.ent_email + "' or phone = '" + request.payload.ent_email + "'";
                mysqlDb.ExecuteQuery(Query, function (err, userdetails) {
                    if (err) {
                        console.log(err);
                    } else {
                        console.log("user flag", userdetails.flag);
                        if (userdetails.flag == 0) {
                            if (userdetails.data[0].password == request.payload.ent_password) {
                                callback(userdetails);
                            } else {
                                var error = {
                                    "flag": 1,
                                    "message": "The password entered does not match the email/phone number entered , please try again or recover your password using the FORGOT PASSWORD option"
                                };
                                // error.flag = 1;
                                // error["message"] = ;
                                reply(status.status(6, error))
                            }
                            // callback(userdetails);
                        } else {
                            console.log("user flag error @@@@@@@@@@@@@@@@@@@@@", userdetails)
                            userdetails["message"] = "This email id / phone number is not registered with us , please try signing up or try with another email address again";
                            reply(status.status(6, userdetails));
                        }

                    }
                });

                // mysqlDb.ExecuteQuery(Query, function (err, userdetails) {
                //     if (err) {
                //         console.log(err);
                //     } else {
                //         console.log("user flag", userdetails.flag);
                //         if (userdetails.flag == 0) {
                //             callback(userdetails);
                //         } else{
                //             console.log("user flag error", userdetails.flag)
                //             userdetails["message"] = "This email id / phone number is not registered with us , please try signing up or try with another email address again";
                //             reply(status.status(6, userdetails));
                //         }

                //     }
                // });
            }
        ],
        function (userdetails) {
            var token = jwt.sign({
                id: userdetails['data'][0]['patient_id'],
                first_name: userdetails['data'][0]['first_name'],
                last_name: userdetails['data'][0]['last_name'],
                phone: userdetails['data'][0]['phone'],
                profile_pic: userdetails['data'][0]['profile_pic'],
                email: request.payload.ent_email
            }, process.env.SECRET_KEY, {
                    expiresIn: userSessionTime
                });
            console.log("userdetails $$$$$$$$$", userdetails, "token$$$$", token);
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
                        Mongo.getLastIdInCollection("bookings", { '_id': 1 }, { '_id': -1 }, function (err, lastId) {
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
                        Mongo.SelectOne("Category", { '_id': new ObjectID(request.payload.ent_cat_id) }, function (err, categoryRes) {
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
                                    services: request.payload.ent_services,
                                    slot_id: request.payload.ent_slot_id,
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
                                        mobile: token.phone
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
                            if (request.payload.ent_booking_type == 1) {
                                var ubData = {
                                    provider_id: "0",
                                    slot_id: "",
                                    status: 1
                                };
                            } else if (request.payload.ent_booking_type == 2) {
                                var ubData = {
                                    provider_id: request.payload.ent_pro_id.toString(),
                                    slot_id: request.payload.ent_slot_id,
                                    status: 2
                                };
                            } else {
                                console.log("Booking Type Wrong");
                            }
                            Mongo.Update("bookings", { 'bid': args.bid.toString() }, ubData, function (err, bData) {
                                if (err) {
                                    console.log(err);
                                } else {
                                    requesttp("http://goclean-service.com:9999/bookingFromWebsite?bid=" + args.bid + '&btype=' + request.payload.ent_booking_type, function (err, res, body) {
                                    });
                                }
                            });
                            reply(status.status(78, ""));
                        }
                    });
                });
        }
    });
}

// SUPPORT TEXT
module.exports.supportText = function (request, reply) {

    jwt.verify(request.params.ent_sess_token, process.env.SECRET_KEY, function (err, token) {
        if (err) {
            reply(status.status(7));
        } else {
            var Query = {
            };
            Mongo.Select('support_txt', Query, function (err, result) {
                if (err) {
                    console.log("ee", err);
                } else {
                    console.log("response", result);
                    reply(status.status(2, { support_text: result }));
                }
            })

        }
    });
}

// CANCEL REASON
module.exports.cancelReason = function (request, reply) {

    jwt.verify(request.params.ent_sess_token, process.env.SECRET_KEY, function (err, token) {
        if (err) {
            reply(status.status(7));
        } else {
            var Query = {
                "res_for": "Passenger"
            };
            Mongo.Select('can_reason', Query, function (err, result) {
                if (err) {
                    console.log("ee", err);
                } else {
                    console.log("response", result);
                    reply(status.status(2, { can_reason: result }));
                }
            })

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
                status: 9,
                cancel_reason: request.payload.ent_reason
            };
            Mongo.Update("bookings", { bid: request.payload.ent_bid.toString() }, verUpdateData, function (err, res) {
                if (err) {
                    console.log(err);
                } else {
                    // console.log()
                    //  Mongo.Update("bookings", { bid: request.payload.ent_bid.toString() }, verUpdateData, function (err, res)

                    Mongo.Select("bookings", { bid: request.payload.ent_bid.toString() }, function (err, bookingDetails) {
                        if (err) {
                            //  console.log("did not find");
                            reply(status.status(33));
                        } else {
                            console.log('bookingDetails[0].provider_id')
                            if (bookingDetails[0].provider_id != "0") {
                                verUpdateData = {
                                    "booked": 0
                                }
                                Mongo.Update("location", { "user": parseInt(bookingDetails[0].provider_id) }, verUpdateData, function (err, res) {
                                    if (err) {
                                        console.log("could not cancel");
                                    } else {
                                        reply(status.status(32));
                                    }
                                });
                            } else if (bookingDetails[0].provider_id == "0") {
                                reply(status.status(32));
                            }

                            //  if()
                        }
                    });

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
                    if (userdetails['data'][0]['stripe_id'] == null) {
                        reply(status.status(34));
                    } else {
                        stripe.customers.retrieve(
                            userdetails['data'][0]['stripe_id'],
                            function (err, customer) {
                                if (err) {
                                    reply(status.status(2, { cardsArr: cardsArr }));
                                } else {
                                    customer['sources']['data'].forEach(function (appt) {
                                        cardsArr.push({
                                            id: appt['id'],
                                            brand: appt['brand'],
                                            last4: appt['last4'],
                                            exp_month: appt['exp_month'],
                                            exp_year: appt['exp_year']
                                        });
                                    });
                                }

                                reply(status.status(2, { cardsArr: cardsArr }));
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
                    if (userdetails['data'][0]['stripe_id'] == "") {
                        reply(status.status(200));
                    } else {
                        console.log("userdetails['data'][0]['stripe_id']", userdetails['data'][0]['stripe_id']);
                        stripe.customers.deleteCard(
                            userdetails['data'][0]['stripe_id'],
                            request.payload.ent_card_id,
                            function (err, confirmation) {
                                if (err) {
                                    reply(status.status(412));
                                } else {
                                    reply(status.status(200));
                                }

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
                    if (userdetails['data'][0]['stripe_id'] == null) {
                        console.log("add customer");
                        stripe.customers.create({
                            description: 'Create CUstomer',
                            source: {
                                object: "card",
                                exp_month: request.payload.ent_expiry_month,
                                exp_year: request.payload.exp_year,
                                number: request.payload.number,
                                cvc: request.payload.cvc
                            }

                        }, function (err, customer) {
                            if (err) {
                                return reply({ errFlag: true, errNo: 1, data: { "message": err } }).code(200);
                            } else {
                                // asynchronously called
                                console.log("customer.id", customer.id);
                                console.log("patient_id", token.id);
                                // var Query = "select * from patient where patient_id = '" + token.id + "'";
                                var updateQuery = "update patient set stripe_id = '" + customer.id + "' where patient_id = '" + parseInt(token.id) + "'";
                                mysqlDb.ExecuteQuery(updateQuery, function (err, userdetails) {
                                    if (err) {
                                        console.log("failed to update");
                                    } else {
                                        reply(userdetails);
                                        //  return reply({ errFlag: false, errNo: 0, data: customer }).code(200);
                                    }
                                });
                                // var Query = "update patient set stripe_id = '" + request.payload.ent_first_name + "', last_name = '" + request.payload.ent_last_name + "' , phone = '" + request.payload.ent_mobile + "' where patient_id = '" + token.id + "'";
                                // mysqlDb.ExecuteQuery(Query, function (err, userdetails) {
                                //     if (err) {
                                //         console.log(err);
                                //     } else {

                                //     }
                                // });

                            }
                        });
                    } else {
                        stripe.customers.createSource(userdetails['data'][0]['stripe_id'], {
                            source: {
                                object: "card",
                                exp_month: request.payload.ent_expiry_month,
                                exp_year: request.payload.exp_year,
                                number: request.payload.number,
                                cvc: request.payload.cvc
                            }
                        }, function (err, customer) {
                            if (err) {
                                return reply({ errFlag: true, errNo: 1, data: { "message": err } }).code(200)
                            } else {
                                return reply({ errFlag: false, errNo: 0, data: customer }).code(200);
                                console.log('token correct result', JSON.stringify(customer));
                            }
                        });


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
            console.log("userdetails.flag", userdetails.flag)
            if (userdetails.flag == 0) {
                reply(status.status(413));
            } else {
                reply(status.status(200));
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
                reply(status.status(414));
            } else {
                reply(status.status(200));
            }
        }
    });
}


// VerificationCode  API
module.exports.VerificationCode = function (request, reply) {

    var randomNumber = Math.floor(1000 + Math.random() * 9000);
    console.log("randomNUmber", randomNumber);

    var verUpdateData = {
        mobile: request.params.ent_mobile,
        code: randomNumber,
        ts: moment().unix()
    };

    console.log("query object", verUpdateData);
    sendSms.sendsms(verUpdateData, function (err, res) {
        if (err) {
            console.log("error", err)
            if (err.errNum == 1016) {
                Mongo.SelectOne("verification", { 'mobile': request.params.ent_mobile }, function (err, result) {
                    if (err) {
                        console.log(err);
                    } else if (result) {
                        Mongo.Update("verification", { 'mobile': request.params.ent_mobile }, verUpdateData, function (err, res) {
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
            } else if (err.errNum == 1017) {
                reply(err);
            }
        } else {
            console.log("res", res);

        }
    })

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
            console.log("token verified");
            var current_bookings = [];
            var sort_by = { 'appt_server_ts': -1 };
            var statusArray;
            if (request.query.ent_status == undefined) {
                statusArray = [1, 2, 21, 6, 5];
            } else {
                statusArray = [parseInt(request.query.ent_status)];
            }
            // var cond = { 'customer.id': token.id.toString(), 'provider_id': { '$ne': "0" } };
            console.log("token.id.toString()", token.id.toString());
            var cond = {
                'customer.id': token.id.toString(),
                'status': { $in: statusArray }
            };
            var skip = (request.params.ent_page_index - 1) * 10;

            var counter = 0;


            Mongo.SelectWithLimitSkipSort("bookings", cond, 10, skip, sort_by, function (err, appointments) {
                if (err) {
                    console.log(err);
                } else {
                    console.log("appointments", appointments.length);
                    Mongo.Count("bookings", cond, function (err, counter) {
                        if (err) {
                            console.log("counting failed");
                        } else {
                            async.each(appointments, function (appt, callback) {
                                var slots;
                                console.log("appt", appt.slot_id);
                                if (appt.slot_id == null || appt.slot_id == undefined || appt.slot_id.length == 0) {
                                    slots = null;
                                    if (appt['provider_id'] == "0" || appt['provider'] == undefined) {

                                        current_bookings.push({
                                            bid: appt['bid'],
                                            appt_date: appt['appt_date'],
                                            address1: appt['address1'],
                                            latitude: appt['appt_lat'],
                                            pid: appt['provider_id'],
                                            longitude: appt['appt_long'],
                                            cat_id: appt['cat_id'],
                                            cat_name: appt['cat_name'],
                                            appt_created: appt['appt_created'],
                                            timer: appt['timer'],
                                            statusText: status.bookingStatus(appt['status']),
                                            statusCode: appt['status'],
                                            bookingType: appt['booking_type'],
                                            desc: appt['customer_notes'],
                                            slots: null
                                        });
                                    } else {

                                        current_bookings.push({
                                            bid: appt['bid'],
                                            pro_fname: appt['provider']['fname'],
                                            pro_lname: appt['provider']['lname'],
                                            pro_profile_pic: appt['provider']['profile_pic'],
                                            pro_mobile: appt['provider']['mobile'],
                                            pro_email: appt['provider']['email'],
                                            pid: appt['provider']['id'],
                                            appt_date: appt['appt_date'],
                                            address1: appt['address1'],
                                            latitude: appt['appt_lat'],
                                            longitude: appt['appt_long'],
                                            cat_id: appt['cat_id'],
                                            cat_name: appt['cat_name'],
                                            appt_created: appt['appt_created'],
                                            timer: appt['timer'],
                                            statusText: status.bookingStatus(appt['status']),
                                            statusCode: appt['status'],
                                            bookingType: appt['booking_type'],
                                            desc: appt['customer_notes'],
                                            slots: null
                                        });
                                    }
                                    callback();
                                }
                                else
                                    if (appt.slot_id !== undefined || appt.slot_id !== null || appt.slot_id.length > 0) {
                                        console.log("booking id error", appt.bid)
                                        console.log("slot_id", appt.slot_id);
                                        var Query = {
                                            _id: new ObjectID(appt.slot_id)
                                        };
                                        console.log("Query", Query);
                                        Mongo.Select('slotbooking', Query, function (err, slot) {
                                            if (err) {
                                                console.log("error in query while finding slot");
                                            } else {
                                                console.log("slots totally inside", slot[0]);
                                                // slots = slot[0];

                                                if (appt['provider_id'] == "0" || appt['provider'] == undefined) {

                                                    current_bookings.push({
                                                        bid: appt['bid'],
                                                        appt_date: appt['appt_date'],
                                                        address1: appt['address1'],
                                                        latitude: appt['appt_lat'],
                                                        longitude: appt['appt_long'],
                                                        cat_id: appt['cat_id'],
                                                        pid: appt['provider_id'],
                                                        cat_name: appt['cat_name'],
                                                        appt_created: appt['appt_created'],
                                                        timer: appt['timer'],
                                                        statusText: status.bookingStatus(appt['status']),
                                                        statusCode: appt['status'],
                                                        bookingType: appt['booking_type'],
                                                        desc: appt['customer_notes'],
                                                        slots: slot[0]
                                                    });
                                                } else {

                                                    current_bookings.push({
                                                        bid: appt['bid'],
                                                        pro_fname: appt['provider']['fname'],
                                                        pro_lname: appt['provider']['lname'],
                                                        pro_profile_pic: appt['provider']['profile_pic'],
                                                        pro_mobile: appt['provider']['mobile'],
                                                        pro_email: appt['provider']['email'],
                                                        appt_date: appt['appt_date'],
                                                        address1: appt['address1'],
                                                        latitude: appt['appt_lat'],
                                                        pid: appt['provider']['id'],
                                                        longitude: appt['appt_long'],
                                                        cat_id: appt['cat_id'],
                                                        cat_name: appt['cat_name'],
                                                        appt_created: appt['appt_created'],
                                                        timer: appt['timer'],
                                                        statusText: status.bookingStatus(appt['status']),
                                                        statusCode: appt['status'],
                                                        bookingType: appt['booking_type'],
                                                        desc: appt['customer_notes'],
                                                        slots: slot[0]
                                                    });
                                                }
                                                callback();
                                            }
                                        });
                                        console.log("slots inside", slots);
                                    } else {
                                        console.log("slot_id_null");
                                        slots = null;
                                        if (appt['provider_id'] == "0" || appt['provider'] == undefined) {

                                            current_bookings.push({
                                                bid: appt['bid'],
                                                appt_date: appt['appt_date'],
                                                address1: appt['address1'],
                                                latitude: appt['appt_lat'],
                                                longitude: appt['appt_long'],
                                                cat_id: appt['cat_id'],
                                                pid: appt['provider_id'],
                                                cat_name: appt['cat_name'],
                                                appt_created: appt['appt_created'],
                                                timer: appt['timer'],
                                                statusText: status.bookingStatus(appt['status']),
                                                statusCode: appt['status'],
                                                bookingType: appt['booking_type'],
                                                desc: appt['customer_notes'],
                                                slots: null
                                            });
                                        } else {

                                            current_bookings.push({
                                                bid: appt['bid'],
                                                pro_fname: appt['provider']['fname'],
                                                pro_lname: appt['provider']['lname'],
                                                pro_profile_pic: appt['provider']['profile_pic'],
                                                pro_mobile: appt['provider']['mobile'],
                                                pro_email: appt['provider']['email'],
                                                appt_date: appt['appt_date'],
                                                pid: appt['provider']['id'],
                                                address1: appt['address1'],
                                                latitude: appt['appt_lat'],
                                                longitude: appt['appt_long'],
                                                cat_id: appt['cat_id'],
                                                cat_name: appt['cat_name'],
                                                appt_created: appt['appt_created'],
                                                timer: appt['timer'],
                                                statusText: status.bookingStatus(appt['status']),
                                                statusCode: appt['status'],
                                                bookingType: appt['booking_type'],
                                                desc: appt['customer_notes'],
                                                slots: null
                                            });
                                        }
                                        callback();
                                    }

                                console.log("slotsssssssssss", appt.slot_id);
                                // current_bookings.push({
                                //     bid: appt.bid,
                                //     slots: slots
                                // });


                            }, function (err) {

                                reply(status.status(2, {
                                    current_bookings: current_bookings,
                                    penCount: counter
                                }));
                                // if (appt['provider_id'] == "0" || appt['provider'] == undefined) {

                                //     current_bookings.push({
                                //         bid: appt['bid'],
                                //         appt_date: appt['appt_date'],
                                //         address1: appt['address1'],
                                //         latitude: appt['appt_lat'],
                                //         longitude: appt['appt_long'],
                                //         cat_id: appt['cat_id'],
                                //         cat_name: appt['cat_name'],
                                //         appt_created: appt['appt_created'],
                                //         timer: appt['timer'],
                                //         statusText: status.bookingStatus(appt['status']),
                                //         statusCode: appt['status'],
                                //         bookingType: appt['booking_type'],
                                //         desc: appt['customer_notes']
                                //     });
                                // } else {

                                //     current_bookings.push({
                                //         bid: appt['bid'],
                                //         pro_fname: appt['provider']['fname'],
                                //         pro_lname: appt['provider']['lname'],
                                //         pro_profile_pic: appt['provider']['profile_pic'],
                                //         pro_mobile: appt['provider']['mobile'],
                                //         pro_email: appt['provider']['email'],
                                //         appt_date: appt['appt_date'],
                                //         address1: appt['address1'],
                                //         latitude: appt['appt_lat'],
                                //         longitude: appt['appt_long'],
                                //         cat_id: appt['cat_id'],
                                //         cat_name: appt['cat_name'],
                                //         appt_created: appt['appt_created'],
                                //         timer: appt['timer'],
                                //         statusText: status.bookingStatus(appt['status']),
                                //         statusCode: appt['status'],
                                //         bookingType: appt['booking_type'],
                                //         desc: appt['customer_notes']
                                //     });
                                // }

                            })
                            // appointments.forEach(function (appt) {

                            //     var slots;

                            //     if ((appt['status'] == 2) && (appt['booking_type'] == 2)) {
                            //         console.log("slot present");
                            //         if (appt['slot_id'] !== null) {
                            //             console.log("slot_id", appt['slot_id']);
                            //             var Query = {
                            //                 _id: new ObjectID(appt['slot_id'])
                            //             };
                            //             console.log("Query", Query);
                            //             Mongo.Select('slotbooking', Query, function (err, slot) {
                            //                 if (err) {
                            //                     console.log("error in query while finding slot");
                            //                 } else {

                            //                     slots = slot[0];
                            //                     console.log("slots totally inside", slots);
                            //                 }
                            //             });
                            //             console.log("slots inside", slots);
                            //         } else {
                            //             console.log("slot_id_null");
                            //             slots = null;
                            //         }
                            //     } else {
                            //         console.log("no slots");
                            //         slots = null;
                            //     }

                            //     console.log("slotsssssssssss", slots);
                            //     if (appt['provider_id'] == "0" || appt['provider'] == undefined) {

                            //         current_bookings.push({
                            //             bid: appt['bid'],
                            //             appt_date: appt['appt_date'],
                            //             address1: appt['address1'],
                            //             latitude: appt['appt_lat'],
                            //             longitude: appt['appt_long'],
                            //             cat_id: appt['cat_id'],
                            //             cat_name: appt['cat_name'],
                            //             appt_created: appt['appt_created'],
                            //             timer: appt['timer'],
                            //             statusText: status.bookingStatus(appt['status']),
                            //             statusCode: appt['status'],
                            //             bookingType: appt['booking_type'],
                            //             desc: appt['customer_notes']
                            //         });
                            //     } else {

                            //         current_bookings.push({
                            //             bid: appt['bid'],
                            //             pro_fname: appt['provider']['fname'],
                            //             pro_lname: appt['provider']['lname'],
                            //             pro_profile_pic: appt['provider']['profile_pic'],
                            //             pro_mobile: appt['provider']['mobile'],
                            //             pro_email: appt['provider']['email'],
                            //             appt_date: appt['appt_date'],
                            //             address1: appt['address1'],
                            //             latitude: appt['appt_lat'],
                            //             longitude: appt['appt_long'],
                            //             cat_id: appt['cat_id'],
                            //             cat_name: appt['cat_name'],
                            //             appt_created: appt['appt_created'],
                            //             timer: appt['timer'],
                            //             statusText: status.bookingStatus(appt['status']),
                            //             statusCode: appt['status'],
                            //             bookingType: appt['booking_type'],
                            //             desc: appt['customer_notes']
                            //         });
                            //     }
                            // });

                        }
                    })


                }
            });


            // Mongo.SelectWIthLimitAndIndex("bookings", sort_by, cond, request.params.ent_page_index, function (err, appointments) {
            //     if (err) {
            //         console.log(err);
            //     } else {
            //         console.log("appointments",  appointments);
            //         appointments.forEach(function (appt) {
            //             console.log("bookings", appt)
            //             if (appt['status'] == 7 || appt['status'] == 22) {
            //                 current_bookings.push({
            //                     bid: appt['bid'],
            //                     pro_name: appt['provider']['fname'],
            //                     pro_profile_pic: appt['provider']['profile_pic'],
            //                     pro_mobile: appt['provider']['mobile'],
            //                     pro_email: appt['provider']['email'],
            //                     appt_date: appt['appt_date'],
            //                     address1: appt['address1'],
            //                     cat_name: appt['cat_name'],
            //                     appt_created: appt['appt_created'],
            //                     timer: appt['timer'],
            //                     status: status.bookingStatus(appt['status'])
            //                 });
            //             }
            //         });
            //         reply(status.status(2, {
            //             current_bookings: current_bookings
            //         }));
            //     }
            // });
        }
    });
}
//module.exports.currentbookings = function (request, reply) {
//    jwt.verify(request.params.ent_sess_token, process.env.SECRET_KEY, function (err, token) {
//        if (err) {
//            reply(status.status(7));
//        } else {
//            console.log("token verified");
//            var current_bookings = [];
//            var sort_by = { 'appt_server_ts': -1 };
//            var statusArray;
//            if (request.query.ent_status == undefined) {
//                statusArray = [1, 2, 21, 6, 5];
//            } else {
//                statusArray = [parseInt(request.query.ent_status)];
//            }
//            // var cond = { 'customer.id': token.id.toString(), 'provider_id': { '$ne': "0" } };
//            console.log("token.id.toString()", token.id.toString());
//            var cond = {
//                'customer.id': token.id.toString(),
//                'status': { $in: statusArray }
//            };
//            var skip = (request.params.ent_page_index - 1) * 10;
//
//            var counter = 0;
//
//
//            Mongo.SelectWithLimitSkipSort("bookings", cond, 10, skip, sort_by, function (err, appointments) {
//                if (err) {
//                    console.log(err);
//                } else {
//                    console.log("appointments", appointments.length);
//                    Mongo.Count("bookings", cond, function (err, counter) {
//                        if (err) {
//                            console.log("counting failed");
//                        } else {
//                            async.each(appointments, function (appt, callback) {
//                                var slots;
//                                console.log("appt", appt.slot_id);
//                                if (appt.slot_id == null || appt.slot_id == undefined || appt.slot_id.length == 0) {
//                                    slots = null;
//                                    if (appt['provider_id'] == "0" || appt['provider'] == undefined) {
//
//                                        current_bookings.push({
//                                            bid: appt['bid'],
//                                            appt_date: appt['appt_date'],
//                                            address1: appt['address1'],
//                                            latitude: appt['appt_lat'],
//                                            longitude: appt['appt_long'],
//                                            cat_id: appt['cat_id'],
//                                            cat_name: appt['cat_name'],
//                                            appt_created: appt['appt_created'],
//                                            timer: appt['timer'],
//                                            statusText: status.bookingStatus(appt['status']),
//                                            statusCode: appt['status'],
//                                            bookingType: appt['booking_type'],
//                                            desc: appt['customer_notes'],
//                                            slots: null
//                                        });
//                                    } else {
//
//                                        current_bookings.push({
//                                            bid: appt['bid'],
//                                            pro_fname: appt['provider']['fname'],
//                                            pro_lname: appt['provider']['lname'],
//                                            pro_profile_pic: appt['provider']['profile_pic'],
//                                            pro_mobile: appt['provider']['mobile'],
//                                            pro_email: appt['provider']['email'],
//                                            appt_date: appt['appt_date'],
//                                            address1: appt['address1'],
//                                            latitude: appt['appt_lat'],
//                                            longitude: appt['appt_long'],
//                                            cat_id: appt['cat_id'],
//                                            cat_name: appt['cat_name'],
//                                            appt_created: appt['appt_created'],
//                                            timer: appt['timer'],
//                                            statusText: status.bookingStatus(appt['status']),
//                                            statusCode: appt['status'],
//                                            bookingType: appt['booking_type'],
//                                            desc: appt['customer_notes'],
//                                            slots: null
//                                        });
//                                    }
//                                    callback();
//                                }
//                                else
//                                    if (appt.slot_id !== undefined || appt.slot_id !== null || appt.slot_id.length > 0) {
//                                        console.log("booking id error", appt.bid)
//                                        console.log("slot_id", appt.slot_id);
//                                        var Query = {
//                                            _id: new ObjectID(appt.slot_id)
//                                        };
//                                        console.log("Query", Query);
//                                        Mongo.Select('slotbooking', Query, function (err, slot) {
//                                            if (err) {
//                                                console.log("error in query while finding slot");
//                                            } else {
//                                                console.log("slots totally inside", slot[0]);
//                                                // slots = slot[0];
//
//                                                if (appt['provider_id'] == "0" || appt['provider'] == undefined) {
//
//                                                    current_bookings.push({
//                                                        bid: appt['bid'],
//                                                        appt_date: appt['appt_date'],
//                                                        address1: appt['address1'],
//                                                        latitude: appt['appt_lat'],
//                                                        longitude: appt['appt_long'],
//                                                        cat_id: appt['cat_id'],
//                                                        cat_name: appt['cat_name'],
//                                                        appt_created: appt['appt_created'],
//                                                        timer: appt['timer'],
//                                                        statusText: status.bookingStatus(appt['status']),
//                                                        statusCode: appt['status'],
//                                                        bookingType: appt['booking_type'],
//                                                        desc: appt['customer_notes'],
//                                                        slots: slot[0]
//                                                    });
//                                                } else {
//
//                                                    current_bookings.push({
//                                                        bid: appt['bid'],
//                                                        pro_fname: appt['provider']['fname'],
//                                                        pro_lname: appt['provider']['lname'],
//                                                        pro_profile_pic: appt['provider']['profile_pic'],
//                                                        pro_mobile: appt['provider']['mobile'],
//                                                        pro_email: appt['provider']['email'],
//                                                        appt_date: appt['appt_date'],
//                                                        address1: appt['address1'],
//                                                        latitude: appt['appt_lat'],
//                                                        longitude: appt['appt_long'],
//                                                        cat_id: appt['cat_id'],
//                                                        cat_name: appt['cat_name'],
//                                                        appt_created: appt['appt_created'],
//                                                        timer: appt['timer'],
//                                                        statusText: status.bookingStatus(appt['status']),
//                                                        statusCode: appt['status'],
//                                                        bookingType: appt['booking_type'],
//                                                        desc: appt['customer_notes'],
//                                                        slots: slot[0]
//                                                    });
//                                                }
//                                                callback();
//                                            }
//                                        });
//                                        console.log("slots inside", slots);
//                                    } else {
//                                        console.log("slot_id_null");
//                                        slots = null;
//                                        if (appt['provider_id'] == "0" || appt['provider'] == undefined) {
//
//                                            current_bookings.push({
//                                                bid: appt['bid'],
//                                                appt_date: appt['appt_date'],
//                                                address1: appt['address1'],
//                                                latitude: appt['appt_lat'],
//                                                longitude: appt['appt_long'],
//                                                cat_id: appt['cat_id'],
//                                                cat_name: appt['cat_name'],
//                                                appt_created: appt['appt_created'],
//                                                timer: appt['timer'],
//                                                statusText: status.bookingStatus(appt['status']),
//                                                statusCode: appt['status'],
//                                                bookingType: appt['booking_type'],
//                                                desc: appt['customer_notes'],
//                                                slots: null
//                                            });
//                                        } else {
//
//                                            current_bookings.push({
//                                                bid: appt['bid'],
//                                                pro_fname: appt['provider']['fname'],
//                                                pro_lname: appt['provider']['lname'],
//                                                pro_profile_pic: appt['provider']['profile_pic'],
//                                                pro_mobile: appt['provider']['mobile'],
//                                                pro_email: appt['provider']['email'],
//                                                appt_date: appt['appt_date'],
//                                                address1: appt['address1'],
//                                                latitude: appt['appt_lat'],
//                                                longitude: appt['appt_long'],
//                                                cat_id: appt['cat_id'],
//                                                cat_name: appt['cat_name'],
//                                                appt_created: appt['appt_created'],
//                                                timer: appt['timer'],
//                                                statusText: status.bookingStatus(appt['status']),
//                                                statusCode: appt['status'],
//                                                bookingType: appt['booking_type'],
//                                                desc: appt['customer_notes'],
//                                                slots: null
//                                            });
//                                        }
//                                        callback();
//                                    }
//
//                                console.log("slotsssssssssss", appt.slot_id);
//                                // current_bookings.push({
//                                //     bid: appt.bid,
//                                //     slots: slots
//                                // });
//
//
//                            }, function (err) {
//
//                                reply(status.status(2, {
//                                    current_bookings: current_bookings,
//                                    penCount: counter
//                                }));
//                                // if (appt['provider_id'] == "0" || appt['provider'] == undefined) {
//
//                                //     current_bookings.push({
//                                //         bid: appt['bid'],
//                                //         appt_date: appt['appt_date'],
//                                //         address1: appt['address1'],
//                                //         latitude: appt['appt_lat'],
//                                //         longitude: appt['appt_long'],
//                                //         cat_id: appt['cat_id'],
//                                //         cat_name: appt['cat_name'],
//                                //         appt_created: appt['appt_created'],
//                                //         timer: appt['timer'],
//                                //         statusText: status.bookingStatus(appt['status']),
//                                //         statusCode: appt['status'],
//                                //         bookingType: appt['booking_type'],
//                                //         desc: appt['customer_notes']
//                                //     });
//                                // } else {
//
//                                //     current_bookings.push({
//                                //         bid: appt['bid'],
//                                //         pro_fname: appt['provider']['fname'],
//                                //         pro_lname: appt['provider']['lname'],
//                                //         pro_profile_pic: appt['provider']['profile_pic'],
//                                //         pro_mobile: appt['provider']['mobile'],
//                                //         pro_email: appt['provider']['email'],
//                                //         appt_date: appt['appt_date'],
//                                //         address1: appt['address1'],
//                                //         latitude: appt['appt_lat'],
//                                //         longitude: appt['appt_long'],
//                                //         cat_id: appt['cat_id'],
//                                //         cat_name: appt['cat_name'],
//                                //         appt_created: appt['appt_created'],
//                                //         timer: appt['timer'],
//                                //         statusText: status.bookingStatus(appt['status']),
//                                //         statusCode: appt['status'],
//                                //         bookingType: appt['booking_type'],
//                                //         desc: appt['customer_notes']
//                                //     });
//                                // }
//
//                            })
//                            // appointments.forEach(function (appt) {
//
//                            //     var slots;
//
//                            //     if ((appt['status'] == 2) && (appt['booking_type'] == 2)) {
//                            //         console.log("slot present");
//                            //         if (appt['slot_id'] !== null) {
//                            //             console.log("slot_id", appt['slot_id']);
//                            //             var Query = {
//                            //                 _id: new ObjectID(appt['slot_id'])
//                            //             };
//                            //             console.log("Query", Query);
//                            //             Mongo.Select('slotbooking', Query, function (err, slot) {
//                            //                 if (err) {
//                            //                     console.log("error in query while finding slot");
//                            //                 } else {
//
//                            //                     slots = slot[0];
//                            //                     console.log("slots totally inside", slots);
//                            //                 }
//                            //             });
//                            //             console.log("slots inside", slots);
//                            //         } else {
//                            //             console.log("slot_id_null");
//                            //             slots = null;
//                            //         }
//                            //     } else {
//                            //         console.log("no slots");
//                            //         slots = null;
//                            //     }
//
//                            //     console.log("slotsssssssssss", slots);
//                            //     if (appt['provider_id'] == "0" || appt['provider'] == undefined) {
//
//                            //         current_bookings.push({
//                            //             bid: appt['bid'],
//                            //             appt_date: appt['appt_date'],
//                            //             address1: appt['address1'],
//                            //             latitude: appt['appt_lat'],
//                            //             longitude: appt['appt_long'],
//                            //             cat_id: appt['cat_id'],
//                            //             cat_name: appt['cat_name'],
//                            //             appt_created: appt['appt_created'],
//                            //             timer: appt['timer'],
//                            //             statusText: status.bookingStatus(appt['status']),
//                            //             statusCode: appt['status'],
//                            //             bookingType: appt['booking_type'],
//                            //             desc: appt['customer_notes']
//                            //         });
//                            //     } else {
//
//                            //         current_bookings.push({
//                            //             bid: appt['bid'],
//                            //             pro_fname: appt['provider']['fname'],
//                            //             pro_lname: appt['provider']['lname'],
//                            //             pro_profile_pic: appt['provider']['profile_pic'],
//                            //             pro_mobile: appt['provider']['mobile'],
//                            //             pro_email: appt['provider']['email'],
//                            //             appt_date: appt['appt_date'],
//                            //             address1: appt['address1'],
//                            //             latitude: appt['appt_lat'],
//                            //             longitude: appt['appt_long'],
//                            //             cat_id: appt['cat_id'],
//                            //             cat_name: appt['cat_name'],
//                            //             appt_created: appt['appt_created'],
//                            //             timer: appt['timer'],
//                            //             statusText: status.bookingStatus(appt['status']),
//                            //             statusCode: appt['status'],
//                            //             bookingType: appt['booking_type'],
//                            //             desc: appt['customer_notes']
//                            //         });
//                            //     }
//                            // });
//
//                        }
//                    })
//
//
//                }
//            });
//
//
//            // Mongo.SelectWIthLimitAndIndex("bookings", sort_by, cond, request.params.ent_page_index, function (err, appointments) {
//            //     if (err) {
//            //         console.log(err);
//            //     } else {
//            //         console.log("appointments",  appointments);
//            //         appointments.forEach(function (appt) {
//            //             console.log("bookings", appt)
//            //             if (appt['status'] == 7 || appt['status'] == 22) {
//            //                 current_bookings.push({
//            //                     bid: appt['bid'],
//            //                     pro_name: appt['provider']['fname'],
//            //                     pro_profile_pic: appt['provider']['profile_pic'],
//            //                     pro_mobile: appt['provider']['mobile'],
//            //                     pro_email: appt['provider']['email'],
//            //                     appt_date: appt['appt_date'],
//            //                     address1: appt['address1'],
//            //                     cat_name: appt['cat_name'],
//            //                     appt_created: appt['appt_created'],
//            //                     timer: appt['timer'],
//            //                     status: status.bookingStatus(appt['status'])
//            //                 });
//            //             }
//            //         });
//            //         reply(status.status(2, {
//            //             current_bookings: current_bookings
//            //         }));
//            //     }
//            // });
//        }
//    });
//}



module.exports.pastbookings = function (request, reply) {
    jwt.verify(request.params.ent_sess_token, process.env.SECRET_KEY, function (err, token) {
        if (err) {
            reply(status.status(7));
        } else {
            var current_bookings = [];
            var sort_by = { 'appt_server_ts': -1 };
            var cond;
            var statusArray;
            if (request.query.ent_status == undefined || request.query.ent_status.length == 0) {
                statusArray = [3, 4, 22, 7, 9, 11];
            } else {
                statusArray = [parseInt(request.query.ent_status)];
            }

            console.log("statusArray", statusArray);
            // var cond = { 'customer.id': token.id.toString(), 'provider_id': { '$ne': "0" } };
            console.log("token.id.toString()", token.id.toString());
            var proName;
            var startDate;
            var endDate;
            if (request.query.ent_start_date == undefined || request.query.ent_start_date.length == 0) {
                startDate = "0000-00-00 00:00:00";
            } else {
                startDate = request.query.ent_start_date + " " + "00:00:00";
            }

            if (request.query.ent_end_date == undefined || request.query.ent_end_date.length == 0) {
                endDate = "9999-12-31 24:00:00";
            } else {
                endDate = request.query.ent_end_date + " " + "23:59:59";
            }

            if (request.query.ent_provider_name == undefined || request.query.ent_provider_name.length == 0) {
                cond = {
                    'customer.id': token.id.toString(),
                    "appt_date": { $gte: startDate, $lte: endDate },
                    'status': { $in: statusArray }
                };
            } else {
                proName = new RegExp('' + request.query.ent_provider_name, 'i');
                cond = {
                    'customer.id': token.id.toString(),
                    "appt_date": { $gte: startDate, $lte: endDate },
                    "provider.fname": proName,
                    'status': { $in: statusArray }
                };
            }

            // cond = {
            //     'customer.id': token.id.toString()
            //     "appt_date": { $gte: request.query.ent_start_date, $lte: request.query.ent_end_date },
            //     "provider.fname": proName
            // };
        }
        console.log("request.query.ent_start_date", request.query.ent_start_date);
        console.log("request.query.ent_end_date", request.query.ent_end_date);
        console.log("provider.fname", proName);

        // if (request.query.ent_provider_name == "all") {
        //     cond = {
        //         'customer.id': token.id.toString(),
        //         "appt_date": { $gte: request.params.ent_start_date, $lte: request.params.ent_end_date }
        //     };
        // }
        // else {
        //     var proName = new RegExp('' + request.params.ent_provider_name, 'i');
        //     cond = {
        //         'customer.id': token.id.toString(),
        //         "appt_date": { $gte: request.params.ent_start_date, $lte: request.params.ent_end_date },
        //         "provider.fname": proName
        //     };
        // }

        console.log("condition", cond);

        var skip = (request.params.ent_page_index - 1) * 10;
        Mongo.SelectWithLimitSkipSort("bookings", cond, 10, skip, sort_by, function (err, appointments) {
            if (err) {
                console.log(err);
            } else {
                // console.log("appointments", appointments);
                Mongo.Count("bookings", cond, function (err, counter) {
                    if (err) {
                        console.log("error found while counting");
                    } else {
                        async.each(appointments, function (appt, callback) {
                            var slots;
                            console.log("appt", appt.bid, appt.slot_id.length);
                            if (appt.slot_id == null) {
                                slots = null;
                                if (appt['provider_id'] == "0" || appt['provider'] == undefined) {

                                    current_bookings.push({
                                        bid: appt['bid'],
                                        appt_date: appt['appt_date'],
                                        address1: appt['address1'],
                                        latitude: appt['appt_lat'],
                                        longitude: appt['appt_long'],
                                        cat_id: appt['cat_id'],
                                        cat_name: appt['cat_name'],
                                        appt_created: appt['appt_created'],
                                        timer: appt['timer'],
                                        statusText: status.bookingStatus(appt['status']),
                                        statusCode: appt['status'],
                                        bookingType: appt['booking_type'],
                                        desc: appt['customer_notes'],
                                        slots: null
                                    });
                                } else {

                                    current_bookings.push({
                                        bid: appt['bid'],
                                        pro_fname: appt['provider']['fname'],
                                        pro_lname: appt['provider']['lname'],
                                        pro_profile_pic: appt['provider']['profile_pic'],
                                        pro_mobile: appt['provider']['mobile'],
                                        pro_email: appt['provider']['email'],
                                        appt_date: appt['appt_date'],
                                        address1: appt['address1'],
                                        latitude: appt['appt_lat'],
                                        longitude: appt['appt_long'],
                                        cat_id: appt['cat_id'],
                                        cat_name: appt['cat_name'],
                                        appt_created: appt['appt_created'],
                                        timer: appt['timer'],
                                        statusText: status.bookingStatus(appt['status']),
                                        statusCode: appt['status'],
                                        bookingType: appt['booking_type'],
                                        desc: appt['customer_notes'],
                                        slots: null
                                    });
                                }
                                callback();
                            }
                            else
                                if (appt.slot_id.length == 0) {
                                    console.log("slot_id_null");
                                    slots = null;
                                    if (appt['provider_id'] == "0" || appt['provider'] == undefined) {

                                        current_bookings.push({
                                            bid: appt['bid'],
                                            appt_date: appt['appt_date'],
                                            address1: appt['address1'],
                                            latitude: appt['appt_lat'],
                                            longitude: appt['appt_long'],
                                            cat_id: appt['cat_id'],
                                            cat_name: appt['cat_name'],
                                            appt_created: appt['appt_created'],
                                            timer: appt['timer'],
                                            statusText: status.bookingStatus(appt['status']),
                                            statusCode: appt['status'],
                                            bookingType: appt['booking_type'],
                                            desc: appt['customer_notes'],
                                            slots: null
                                        });
                                    } else {

                                        current_bookings.push({
                                            bid: appt['bid'],
                                            pro_fname: appt['provider']['fname'],
                                            pro_lname: appt['provider']['lname'],
                                            pro_profile_pic: appt['provider']['profile_pic'],
                                            pro_mobile: appt['provider']['mobile'],
                                            pro_email: appt['provider']['email'],
                                            appt_date: appt['appt_date'],
                                            address1: appt['address1'],
                                            latitude: appt['appt_lat'],
                                            longitude: appt['appt_long'],
                                            cat_id: appt['cat_id'],
                                            cat_name: appt['cat_name'],
                                            appt_created: appt['appt_created'],
                                            timer: appt['timer'],
                                            statusText: status.bookingStatus(appt['status']),
                                            statusCode: appt['status'],
                                            bookingType: appt['booking_type'],
                                            desc: appt['customer_notes'],
                                            slots: null
                                        });
                                    }
                                    callback();
                                }
                                else
                                    if (appt.slot_id !== undefined || appt.slot_id.length > 0) {
                                        console.log("slot_id", appt.slot_id);
                                        var Query = {
                                            _id: new ObjectID(appt.slot_id)
                                        };
                                        console.log("Query", Query);
                                        Mongo.Select('slotbooking', Query, function (err, slot) {
                                            if (err) {
                                                console.log("error in query while finding slot");
                                            } else {
                                                console.log("slots totally inside", slot[0]);
                                                // slots = slot[0];

                                                if (appt['provider_id'] == "0" || appt['provider'] == undefined) {

                                                    current_bookings.push({
                                                        bid: appt['bid'],
                                                        appt_date: appt['appt_date'],
                                                        address1: appt['address1'],
                                                        latitude: appt['appt_lat'],
                                                        longitude: appt['appt_long'],
                                                        cat_id: appt['cat_id'],
                                                        cat_name: appt['cat_name'],
                                                        appt_created: appt['appt_created'],
                                                        timer: appt['timer'],
                                                        statusText: status.bookingStatus(appt['status']),
                                                        statusCode: appt['status'],
                                                        bookingType: appt['booking_type'],
                                                        desc: appt['customer_notes'],
                                                        slots: slot[0]
                                                    });
                                                } else {

                                                    current_bookings.push({
                                                        bid: appt['bid'],
                                                        pro_fname: appt['provider']['fname'],
                                                        pro_lname: appt['provider']['lname'],
                                                        pro_profile_pic: appt['provider']['profile_pic'],
                                                        pro_mobile: appt['provider']['mobile'],
                                                        pro_email: appt['provider']['email'],
                                                        appt_date: appt['appt_date'],
                                                        address1: appt['address1'],
                                                        latitude: appt['appt_lat'],
                                                        longitude: appt['appt_long'],
                                                        cat_id: appt['cat_id'],
                                                        cat_name: appt['cat_name'],
                                                        appt_created: appt['appt_created'],
                                                        timer: appt['timer'],
                                                        statusText: status.bookingStatus(appt['status']),
                                                        statusCode: appt['status'],
                                                        bookingType: appt['booking_type'],
                                                        desc: appt['customer_notes'],
                                                        slots: slot[0]
                                                    });
                                                }
                                                callback();
                                            }
                                        });
                                        console.log("slots inside", slots);
                                    } else {
                                        console.log("slot_id_null");
                                        slots = null;
                                        if (appt['provider_id'] == "0" || appt['provider'] == undefined) {

                                            current_bookings.push({
                                                bid: appt['bid'],
                                                appt_date: appt['appt_date'],
                                                address1: appt['address1'],
                                                latitude: appt['appt_lat'],
                                                longitude: appt['appt_long'],
                                                cat_id: appt['cat_id'],
                                                cat_name: appt['cat_name'],
                                                appt_created: appt['appt_created'],
                                                timer: appt['timer'],
                                                statusText: status.bookingStatus(appt['status']),
                                                statusCode: appt['status'],
                                                bookingType: appt['booking_type'],
                                                desc: appt['customer_notes'],
                                                slots: null
                                            });
                                        } else {

                                            current_bookings.push({
                                                bid: appt['bid'],
                                                pro_fname: appt['provider']['fname'],
                                                pro_lname: appt['provider']['lname'],
                                                pro_profile_pic: appt['provider']['profile_pic'],
                                                pro_mobile: appt['provider']['mobile'],
                                                pro_email: appt['provider']['email'],
                                                appt_date: appt['appt_date'],
                                                address1: appt['address1'],
                                                latitude: appt['appt_lat'],
                                                longitude: appt['appt_long'],
                                                cat_id: appt['cat_id'],
                                                cat_name: appt['cat_name'],
                                                appt_created: appt['appt_created'],
                                                timer: appt['timer'],
                                                statusText: status.bookingStatus(appt['status']),
                                                statusCode: appt['status'],
                                                bookingType: appt['booking_type'],
                                                desc: appt['customer_notes'],
                                                slots: null
                                            });
                                        }
                                        callback();
                                    }

                            console.log("slotsssssssssss", appt.slot_id);
                            // current_bookings.push({
                            //     bid: appt.bid,
                            //     slots: slots
                            // });


                        }, function (err) {

                            reply(status.status(2, {
                                past_bookings: current_bookings,
                                penCount: counter
                            }));
                            // if (appt['provider_id'] == "0" || appt['provider'] == undefined) {

                            //     current_bookings.push({
                            //         bid: appt['bid'],
                            //         appt_date: appt['appt_date'],
                            //         address1: appt['address1'],
                            //         latitude: appt['appt_lat'],
                            //         longitude: appt['appt_long'],
                            //         cat_id: appt['cat_id'],
                            //         cat_name: appt['cat_name'],
                            //         appt_created: appt['appt_created'],
                            //         timer: appt['timer'],
                            //         statusText: status.bookingStatus(appt['status']),
                            //         statusCode: appt['status'],
                            //         bookingType: appt['booking_type'],
                            //         desc: appt['customer_notes']
                            //     });
                            // } else {

                            //     current_bookings.push({
                            //         bid: appt['bid'],
                            //         pro_fname: appt['provider']['fname'],
                            //         pro_lname: appt['provider']['lname'],
                            //         pro_profile_pic: appt['provider']['profile_pic'],
                            //         pro_mobile: appt['provider']['mobile'],
                            //         pro_email: appt['provider']['email'],
                            //         appt_date: appt['appt_date'],
                            //         address1: appt['address1'],
                            //         latitude: appt['appt_lat'],
                            //         longitude: appt['appt_long'],
                            //         cat_id: appt['cat_id'],
                            //         cat_name: appt['cat_name'],
                            //         appt_created: appt['appt_created'],
                            //         timer: appt['timer'],
                            //         statusText: status.bookingStatus(appt['status']),
                            //         statusCode: appt['status'],
                            //         bookingType: appt['booking_type'],
                            //         desc: appt['customer_notes']
                            //     });
                            // }

                        })
                        // appointments.forEach(function (appt) {
                        //     console.log("slot_id_null", appt['slot_id']);
                        //     // if ((appt['status'] == 2) && (appt['booking_type'] == 2)) {
                        //     //     console.log("slot present");
                        //     //     if (appt['slot_id'] !== null) {
                        //     //         console.log("slot_id", appt['slot_id']);
                        //     //     } else {
                        //     //         console.log("slot_id_null", appt['slot_id']);
                        //     //     }
                        //     // } else {
                        //     //     console.log("no slots");
                        //     // }

                        //     if (appt['provider_id'] == 0 || appt['provider'] == undefined) {
                        //         current_bookings.push({
                        //             bid: appt['bid'],
                        //             appt_date: appt['appt_date'],
                        //             address1: appt['address1'],
                        //             latitude: appt['appt_lat'],
                        //             longitude: appt['appt_long'],
                        //             cat_id: appt['cat_id'],
                        //             cat_name: appt['cat_name'],
                        //             appt_created: appt['appt_created'],
                        //             timer: appt['timer'],
                        //             statusText: status.bookingStatus(appt['status']),
                        //             statusCode: appt['status'],
                        //             invoice: appt['invoiceData'],
                        //             bookingType: appt['booking_type'],
                        //             desc: appt['customer_notes']
                        //         });
                        //     } else {
                        //         current_bookings.push({
                        //             bid: appt['bid'],
                        //             pro_fname: appt['provider']['fname'],
                        //             pro_lname: appt['provider']['lname'],
                        //             pro_profile_pic: appt['provider']['profile_pic'],
                        //             pro_mobile: appt['provider']['mobile'],
                        //             pro_email: appt['provider']['email'],
                        //             appt_date: appt['appt_date'],
                        //             address1: appt['address1'],
                        //             latitude: appt['appt_lat'],
                        //             longitude: appt['appt_long'],
                        //             cat_id: appt['cat_id'],
                        //             cat_name: appt['cat_name'],
                        //             appt_created: appt['appt_created'],
                        //             timer: appt['timer'],
                        //             statusText: status.bookingStatus(appt['status']),
                        //             statusCode: appt['status'],
                        //             invoice: appt['invoiceData'],
                        //             bookingType: appt['booking_type'],
                        //             desc: appt['customer_notes']
                        //         });
                        //     }
                        // });
                        // reply(status.status(2, {
                        //     past_bookings: current_bookings,
                        //     penCount: counter
                        // }));
                    }
                })

            }
        });


        // Mongo.SelectWIthLimitAndIndex("bookings", sort_by, cond, request.params.ent_page_index, function (err, appointments) {
        //     if (err) {
        //         console.log(err);
        //     } else {
        //         console.log("appointments",  appointments);
        //         appointments.forEach(function (appt) {
        //             console.log("bookings", appt)
        //             if (appt['status'] == 7 || appt['status'] == 22) {
        //                 current_bookings.push({
        //                     bid: appt['bid'],
        //                     pro_name: appt['provider']['fname'],
        //                     pro_profile_pic: appt['provider']['profile_pic'],
        //                     pro_mobile: appt['provider']['mobile'],
        //                     pro_email: appt['provider']['email'],
        //                     appt_date: appt['appt_date'],
        //                     address1: appt['address1'],
        //                     cat_name: appt['cat_name'],
        //                     appt_created: appt['appt_created'],
        //                     timer: appt['timer'],
        //                     status: status.bookingStatus(appt['status'])
        //                 });
        //             }
        //         });
        //         reply(status.status(2, {
        //             current_bookings: current_bookings
        //         }));
        //     }
        // });
        // }
    });
}


module.exports.profile = function (request, reply) {
    console.log("profile ############", request.params.ent_sess_token);
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
                    Mongo.Update("customer", { cid: parseInt(token.id) }, updata, function (err, res) {
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
            var sort_by = { '_id': -1 };
            var cond = { 'customer.id': token.id.toString(), 'provider_id': { '$ne': "0" } };
            Mongo.SelectWIthLimitAndIndex("bookings", sort_by, cond, request.params.ent_page_index, function (err, appointments) {
                if (err) {
                    console.log(err);
                } else {
                    appointments.forEach(function (appt) {
                        if (appt['status'] == 3 || appt['status'] == 4 || appt['status'] == 9 || appt['status'] == 10 || appt['status'] == 7) {
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
            var catId = request.params.ent_cat_id;
            var Query = "select * from doctor where doc_id = '" + request.params.ent_pro_id + "'";
            mysqlDb.ExecuteQuery(Query, function (err, userdetails) {
                if (err) {
                    console.log(err);
                } else {
                    console.log("userdetails", userdetails);
                    if (userdetails['flag'] == 1)
                        reply(status.status(20));
                    else {
                        var cb_query = "SELECT count(b.bid) as tot_comp FROM bookings b  WHERE  b.pro_id = '" + request.params.ent_pro_id + "'";
                        mysqlDb.ExecuteQuery(cb_query, function (err, cb_res) {
                            if (err) {
                                console.log(err);
                            } else {
                                console.log("cb_res...", cb_res);
                                Mongo.SelectOne("Category", { '_id': new ObjectID(catId) }, function (err, catRes) {

                                    console.log("catRes", catRes);

                                    Mongo.SelectOne("location", { 'user': parseInt(request.params.ent_pro_id) }, function (err, locRes) {
                                        //start review code
                                        console.log("locRes", locRes);
                                        var Query = "SELECT d.review_id,d.doc_id,d.patient_id,d.review_dt,d.star_rating,d.review,d.appointment_id,d.status,p.profile_pic FROM doctor_ratings d , patient p WHERE  p.patient_id = d.patient_id and doc_id = '" + request.params.ent_pro_id + "' order by review_id desc";
                                        mysqlDb.ExecuteQuery(Query, function (err, revdetails) {
                                            if (err) {
                                                console.log(err);
                                            } else {
                                                console.log("revdetails", revdetails)
                                                var rev_arr = [];
                                                if (revdetails['flag'] == 0) {
                                                    console.log("revdetails", revdetails.data);
                                                    asyncLoop(revdetails['data'], function (val, next) {
                                                        //                                    revdetails['data'].forEach(function (val) {
                                                        console.log(val.appointment_id);
                                                        var bid = (val.appointment_id).toString();
                                                        Mongo.SelectOne("bookings", { 'bid': bid }, function (err, bookingRes) {
                                                            if (err) {
                                                                console.log(err);
                                                            } else {
                                                                if (bookingRes) {
                                                                    console.log(bookingRes.cat_name);
                                                                    val.cat_name = bookingRes.cat_name;
                                                                    rev_arr.push(val);
                                                                } else
                                                                    rev_arr.push(val);
                                                                next();
                                                            }


                                                        });
                                                    }, function (err) {
                                                        if (err) {
                                                            console.error('Error: ' + err.message);
                                                            return;
                                                        }

                                                        console.log("catRes.price_min", catRes.price_min);
                                                        console.log("review array", rev_arr[0].star_rating);
                                                        var rev_total = 0;

                                                        for (var i = 0; i < rev_arr.length; i++) {
                                                            rev_total += rev_arr[i].star_rating;
                                                        }
                                                        var rev_avg = (Math.round(((rev_total / rev_arr.length)) * 100) / 100).toFixed(1);
                                                        console.log("average ratting", rev_avg);
                                                        reply(status.status(2, {
                                                            id: userdetails['data'][0]['doc_id'],
                                                            first_name: userdetails['data'][0]['first_name'],
                                                            last_name: userdetails['data'][0]['last_name'],
                                                            profile_pic: userdetails['data'][0]['profile_pic'],
                                                            country_code: userdetails['data'][0]['country_code'],
                                                            created_dt: decodeURIComponent(userdetails['data'][0]['created_dt']),
                                                            category_name: catRes.cat_name,
                                                            category_desc: catRes.cat_desc,
                                                            price: catRes.price_min * 60,
                                                            lastUpdated: locRes.lastUpdated,
                                                            tot_comp: cb_res['data'][0]['tot_comp'],
                                                            phone: userdetails['data'][0]['mobile'],
                                                            about: userdetails['data'][0]['about'],
                                                            expertise: userdetails['data'][0]['expertise'],
                                                            email: userdetails['data'][0]['email'],
                                                            review: rev_arr,
                                                            rev_avg: rev_avg,
                                                            profile_created: userdetails['data'][0]['created_dt'],
                                                            languages: userdetails['data'][0]['languages'],
                                                            expertise: userdetails['data'][0]['expertise'], location: userdetails['data'][0]['address_line1'], last_active_date: userdetails['data'][0]['last_active_dt']

                                                        }));
                                                    });

                                                } else {
                                                    reply(status.status(2, {
                                                        id: userdetails['data'][0]['doc_id'],
                                                        first_name: userdetails['data'][0]['first_name'],
                                                        last_name: userdetails['data'][0]['last_name'],
                                                        profile_pic: userdetails['data'][0]['profile_pic'],
                                                        country_code: userdetails['data'][0]['country_code'],
                                                        created_dt: decodeURIComponent(userdetails['data'][0]['created_dt']),
                                                        category_name: catRes.cat_name,
                                                        category_desc: catRes.cat_desc,
                                                        price: catRes.price_min * 60,
                                                        lastUpdated: locRes.lastUpdated,
                                                        tot_comp: cb_res['data'][0]['tot_comp'],
                                                        phone: userdetails['data'][0]['mobile'],
                                                        about: userdetails['data'][0]['about'],
                                                        expertise: userdetails['data'][0]['expertise'],
                                                        email: userdetails['data'][0]['email'],
                                                        review: [],
                                                        profile_created: userdetails['data'][0]['created_dt'],
                                                        languages: userdetails['data'][0]['languages'],
                                                        expertise: userdetails['data'][0]['expertise'], location: userdetails['data'][0]['address_line1'], last_active_date: userdetails['data'][0]['last_active_dt']

                                                    }));
                                                }

                                            }
                                        });
                                    });
                                });
                                //end review code
                            }
                        });
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
            Mongo.SelectOne("bookings", { 'bid': request.params.ent_bid.toString() }, function (err, bookingRes) {
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
            Mongo.SelectOne("Category", { '_id': new ObjectID(request.params.ent_cat_id) }, function (err, categoryRes) {
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

module.exports.reviews = function (request, reply) {
    jwt.verify(request.params.ent_sess_token, process.env.SECRET_KEY, function (err, token) {
        if (err) {
            reply(status.status(7));
        } else {
            console.log("valid session");
            var skip = (request.params.ent_page_index - 1) * 10;
            // var Query;

            if (request.params.ent_filter_option == 0) {
                Query = "SELECT * FROM doctor_ratings WHERE doc_id = '" + request.params.ent_pro_id + "'order by review_id desc limit 10 offset " + skip;
            } else if (request.params.ent_filter_option == 5) {
                Query = "SELECT * FROM doctor_ratings WHERE doc_id = '" + request.params.ent_pro_id + "' and star_rating = '" + 5 + "'order by review_id desc limit 10 offset " + skip;
            } else if (request.params.ent_filter_option == 4) {
                Query = "SELECT * FROM doctor_ratings WHERE doc_id = '" + request.params.ent_pro_id + "' and star_rating >= '" + 4 + "' and star_rating < '" + 5 + "'order by review_id desc limit 10 offset " + skip;
            } else if (request.params.ent_filter_option == 3) {
                Query = "SELECT * FROM doctor_ratings WHERE doc_id = '" + request.params.ent_pro_id + "' and star_rating >= '" + 3 + "' and star_rating < '" + 4 + "'order by review_id desc limit 10 offset " + skip;
            } else if (request.params.ent_filter_option == 2) {
                Query = "SELECT * FROM doctor_ratings WHERE doc_id = '" + request.params.ent_pro_id + "' and star_rating >= '" + 2 + "' and star_rating < '" + 3 + "'order by review_id desc limit 10 offset " + skip;
            } else if (request.params.ent_filter_option == 1) {
                Query = "SELECT * FROM doctor_ratings WHERE doc_id = '" + request.params.ent_pro_id + "' and star_rating >= '" + 1 + "' and star_rating < '" + 2 + "'order by review_id desc limit 10 offset " + skip;
            }
            // var Query = "SELECT * FROM doctor_ratings WHERE doc_id = '" + request.params.ent_pro_id + "' and star_rating >= '" + 4 + "' and star_rating < '" + 5 + "'order by review_id desc limit 10 offset " + skip ;

            console.log("query", Query);

            mysqlDb.ExecuteQuery(Query, function (err, reviewList) {
                if (err) {
                    console.log("error");
                    reply(err);
                } else {
                    if (reviewList.flag == 0) {
                        // console.log("reviewList", reviewList);
                        var reviewNewList = [];
                        var reviewItem;
                        async.each(reviewList.data, function (item, callback) {
                            // console.log("appointment_id");
                            // console.log("appointment_id", item.appointment_id);
                            var MongoQuery = {
                                "_id": parseInt(item.appointment_id)
                            };

                            Mongo.SelectOne("bookings", MongoQuery, function (err, bookingDetails) {
                                if (err) {
                                    console.log(err);
                                } else {
                                    reviewItem = {
                                        "customer": bookingDetails.customer,
                                        "category_name": bookingDetails.cat_name,
                                        "review_dt": item.review_dt,
                                        "rating": item.star_rating,
                                        "review_comment": item.review
                                    }
                                    // console.log("bookingDetails", bookingDetails);
                                    reviewNewList.push(reviewItem);
                                    callback();

                                }
                            });
                        }, function (err) {
                            reply(status.status(200, reviewNewList));
                        })
                    } else {
                        reply(status.status(35));
                    }


                }
            })
        }
    });
}


module.exports.city = function (request, reply) {
    jwt.verify(request.params.ent_sess_token, process.env.SECRET_KEY, function (err, token) {
        if (err) {
            reply(status.status(7));
        } else {
            var Query = "select * from city_available ORDER BY City_Name";
            mysqlDb.ExecuteQuery(Query, function (err, cityData) {
                if (err) {
                    console.log(err);
                } else {
                    var cityList = [];
                    cityData['data'].forEach(function (city) {
                        if (city['City_Name'].length == 0) {
                            console.log("don't print")
                        } else {
                            var firstCharecter = city['City_Name'][0];
                            var cityName;
                            if (firstCharecter == undefined) {
                                cityName = city['City_Name']
                            } else {
                                var newName = "";
                                for (i = 0; i < city['City_Name'].length; i++) {

                                    if (i == 0) {
                                        newName += (city['City_Name'][i]).toLocaleUpperCase()
                                    }
                                    else if (city['City_Name'][i - 1] == " ") {
                                        newName += (city['City_Name'][i]).toLocaleUpperCase();
                                    } else if (city['City_Name'][i] == " ") {
                                        newName += (city['City_Name'][i]).toLocaleUpperCase();
                                    } else {
                                        newName += (city['City_Name'][i]).toLocaleLowerCase();
                                    }

                                }

                                cityName = newName;
                            }
                            console.log("newName", cityName);
                            cityList.push({ 'city_id': city['City_Id'], 'city_name': cityName });
                        }

                        // cityList.push({ 'city_id': city['City_Id'], 'city_name': city['City_Name'] });
                    });
                    reply(status.status(2, cityList));
                }
            });
        }
    });
}

module.exports.verifyCode = function (request, reply) {
    var phone = request.params.ent_country_code + request.params.ent_mobile;
    if (request.params.ent_service == 1) {
        var code = parseInt(request.params.ent_code);

        Mongo.SelectOne("verification", { mobile: phone, code: code }, function (err, codeRes) {
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
        var code = parseInt(request.params.ent_code);
        Mongo.SelectOne("verification", { mobile: phone, code: code }, function (err, codeRes) {
            if (err) {
                console.log(err);
            } else {

                console.log("codeRes", codeRes);
                if (codeRes) {
                    var token = jwt.sign({ accountId: request.params.ent_mobile }, process.env.SECRET_KEY, { expiresIn: '10 min' });

                    var link = "http://website.goclean-service.com/change-password/?data=" + token;
                    var query = "update patient set resetData = '" + token + "' where  phone = '" + request.params.ent_mobile + "'";
                    // console.log("token present", newPassword);
                    mysqlDb.ExecuteQuery(query, function (err, userdetails) {
                        if (err) {
                            reply(status.status(25));
                        } else {
                            console.log("updated user details", JSON.stringify(userdetails));
                            // reply(status.status(24));
                            reply(status.status(79, link));
                        }
                    });

                } else {
                    reply(status.status(17));
                }
            }
        });
    } else {
        reply(status.status(17));
    }

}

module.exports.resetWithEmail = function (request, reply) {

    var Query = "select * from patient where email = '" + request.params.ent_email + "'";

    mysqlDb.ExecuteQuery(Query, function (err, checkEmail) {
        if (err) {
            console.log(err);
        } else {
            console.log("updated user details", JSON.stringify(checkEmail));
            if (checkEmail.flag == 1) {
                reply(status.status(36));
            } else {
                var token = jwt.sign({ accountId: request.params.ent_email }, process.env.SECRET_KEY, { expiresIn: '10 min' });

                console.log("token", token);

                var api_key = 'key-fdf665bbe4dc0ba130613c95a14ef7b2';
                var domain = 'goclean-service.com';
                var mailgun = require('mailgun-js')({ apiKey: api_key, domain: domain });
                var that = this;
                var data = {
                    from: '<noreply@goclean-service.com>',
                    to: request.params.ent_email,
                    subject: 'Reset your password from Goclean Service',
                    text: 'Testing some Mailgun awesomness!',
                    html: '<b> Hello, </b> <div>We see that you have requested a password reset on Goclean Service , please click on the link below to create a new password.</div>  <p><a href="http://website.goclean-service.com/change-password/?data=' + token + '"' + '>Click</a></p> <p>In case you face any issues please feel free to contact our support team at help@goclean-service.com.</p>'


                };

                console.log("var query data", data.html);
                mailgun.messages().send(data, function (error, body) {
                    console.log("sending mail");
                    if (error) {
                        console.log("mail body error", error);
                    } else {
                        console.log("mail body", body);

                        console.log("toekn genrated", token);
                        var Query = "update patient set resetData = '" + token + "' where email = '" + request.params.ent_email + "'";

                        mysqlDb.ExecuteQuery(Query, function (err, userdetails) {
                            if (err) {
                                console.log(err);
                            } else {
                                console.log("updated user details", JSON.stringify(userdetails));
                                reply(status.status(201));
                            }
                        });
                    }

                });
            }
            // reply(status.status(201));
        }
    });


    // var token = jwt.sign({ accountId: request.params.ent_email }, process.env.SECRET_KEY, { expiresIn: '10 min' });

    // console.log("token", token);

    // var api_key = 'key-fdf665bbe4dc0ba130613c95a14ef7b2';
    // var domain = 'goclean-service.com';
    // var mailgun = require('mailgun-js')({ apiKey: api_key, domain: domain });
    // var that = this;
    // var data = {
    //     from: '<noreply@goclean-service.com>',
    //     to: request.params.ent_email,
    //     subject: 'Reset your password from Goclean Service',
    //     text: 'Testing some Mailgun awesomness!',
    //     html: '<b> Hello, </b> <div>We see that you have requested a password reset on Goclean Service , please click on the link below to create a new password.</div>  <p><a href="http://goclean-service.com/change-password/?data=' + token + '"' + '>Click</a></p> <p>In case you face any issues please feel free to contact our support team at help@goclean-service.com.</p>'


    // };

    // console.log("var query data", data.html);
    // mailgun.messages().send(data, function (error, body) {
    //     console.log("sending mail");
    //     if (error) {
    //         console.log("mail body error", error);
    //     } else {
    //         console.log("mail body", body);

    //         console.log("toekn genrated", token);
    //         var Query = "update patient set resetData = '" + token + "' where email = '" + request.params.ent_email + "'";

    //         mysqlDb.ExecuteQuery(Query, function (err, userdetails) {
    //             if (err) {
    //                 console.log(err);
    //             } else {
    //                 console.log("updated user details", JSON.stringify(userdetails));
    //                 reply(status.status(201));
    //             }
    //         });
    //     }

    // });
}

// resetWithPhone
module.exports.resetWithPhone = function (request, reply) {

    var Query = "select * from patient where phone = '" + request.params.ent_mobile + "'";

    mysqlDb.ExecuteQuery(Query, function (err, checkPhone) {
        if (err) {
            console.log(err);
        } else {
            console.log("updated user details", JSON.stringify(checkPhone));
            if (checkPhone.flag == 1) {
                reply(status.status(37));
            } else {
                var phone = request.params.ent_country_code + request.params.ent_mobile;
                var randomNumber = Math.floor(1000 + Math.random() * 9000);
                console.log("randomNUmber", randomNumber);

                var verUpdateData = {
                    mobile: phone,
                    code: randomNumber,
                    ts: moment().unix()
                };

                console.log("query object", verUpdateData);
                sendSms.sendsms(verUpdateData, function (err, res) {
                    if (err) {
                        console.log("error", err)
                        if (err.errNum == 1016) {
                            Mongo.SelectOne("verification", { 'mobile': phone }, function (err, result) {
                                if (err) {
                                    console.log(err);
                                } else if (result) {
                                    Mongo.Update("verification", { 'mobile': phone }, verUpdateData, function (err, res) {
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
                        } else if (err.errNum == 1017) {
                            reply(err);
                        }
                    } else {
                        console.log("res", res);

                    }
                })
            }
        }
    });


    // var token = jwt.sign({ accountId: request.params.ent_email }, process.env.SECRET_KEY, { expiresIn: '10 min' });

    // console.log("token", token);

    // var api_key = 'key-fdf665bbe4dc0ba130613c95a14ef7b2';
    // var domain = 'goclean-service.com';
    // var mailgun = require('mailgun-js')({ apiKey: api_key, domain: domain });
    // var that = this;
    // var data = {
    //     from: '<noreply@goclean-service.com>',
    //     to: request.params.ent_email,
    //     subject: 'Reset your password from Goclean Service',
    //     text: 'Testing some Mailgun awesomness!',
    //     html: '<b> Hello, </b> <div>We see that you have requested a password reset on Goclean Service , please click on the link below to create a new password.</div>  <p><a href="http://goclean-service.com/change-password/?data=' + token + '"' + '>Click</a></p> <p>In case you face any issues please feel free to contact our support team at help@goclean-service.com.</p>'


    // };

    // console.log("var query data", data.html);
    // mailgun.messages().send(data, function (error, body) {
    //     console.log("sending mail");
    //     if (error) {
    //         console.log("mail body error", error);
    //     } else {
    //         console.log("mail body", body);

    //         console.log("toekn genrated", token);
    //         var Query = "update patient set resetData = '" + token + "' where email = '" + request.params.ent_email + "'";

    //         mysqlDb.ExecuteQuery(Query, function (err, userdetails) {
    //             if (err) {
    //                 console.log(err);
    //             } else {
    //                 console.log("updated user details", JSON.stringify(userdetails));
    //                 reply(status.status(201));
    //             }
    //         });
    //     }

    // });
}

module.exports.forgetPassword = function (request, reply) {
    jwt.verify(request.params.ent_token, process.env.SECRET_KEY, function (err, token) {
        if (err) {
            reply(status.status(23));
        } else {
            var newPassword = md5(request.params.ent_password);
            var query = "update patient set password = '" + newPassword + "' where resetData = '" + request.params.ent_token + "'";
            console.log("token present", newPassword);
            mysqlDb.ExecuteQuery(query, function (err, userdetails) {
                if (err) {
                    reply(status.status(25));
                } else {
                    console.log("updated user details", JSON.stringify(userdetails));
                    reply(status.status(24));
                }
            });


        }
    });


}

module.exports.changePassword = function (request, reply) {

    // ent_old_password
    // ent_new_password
    jwt.verify(request.params.ent_token, process.env.SECRET_KEY, function (err, token) {
        if (err) {
            reply(status.status(23));
        } else {
            //    var oldPassword = md5(request.payload.ent_old_password);
            var id = token.id.toString();
            console.log("token", id, " ", md5(request.payload.ent_old_password));
            var oldPassword = md5(request.payload.ent_old_password);
            console.log("old password", oldPassword);
            var query = "select password from patient where patient_id = '" + id + "'";
            mysqlDb.ExecuteQuery(query, function (err, getPassword) {
                if (err) {
                    reply(status.status(25));
                } else {
                    if (getPassword == 1) {
                        reply("user not found");
                    } else {
                        if (getPassword.data[0].password == oldPassword) {
                            var newPassword = md5(request.payload.ent_new_password);
                            var query = "update patient set password = '" + newPassword + "' where patient_id = '" + id + "'";
                            console.log("token present", newPassword);
                            mysqlDb.ExecuteQuery(query, function (err, userdetails) {
                                if (err) {
                                    reply(status.status(25));
                                } else {
                                    console.log("updated user details", JSON.stringify(userdetails));
                                    reply(status.status(24));
                                }
                            });
                        } else {
                            reply("password did not match");
                        }
                    }

                }
            });


            // var newPassword = md5(request.params.ent_password);
            // var query = "update patient set password = '" + newPassword + "' where resetData = '" + request.params.ent_token + "'";
            // console.log("token present", newPassword);
            // mysqlDb.ExecuteQuery(query, function (err, userdetails) {
            //     if (err) {
            //         reply(status.status(25));
            //     } else {
            //         console.log("updated user details", JSON.stringify(userdetails));
            //         reply(status.status(24));
            //     }
            // });


        }
    });


}


// changePassword
module.exports.setNewPassword = function (request, reply) {
    jwt.verify(request.params.ent_token, process.env.SECRET_KEY, function (err, token) {
        if (err) {
            console.log("invalid token");
            reply(status.status(7));
        } else {
            var oldPassword = md5(request.payload.ent_old_password);
            var newPassword = md5(request.payload.ent_new_password);
            console.log("token.id.toString()", token.id.toString());
            var Query = "select password from patient where patient_id = '" + token.id + "'";
            // var query = "update patient set password = '" + newPassword + "' where resetData = '" + request.params.ent_token + "'";
            // console.log("token present", newPassword);
            mysqlDb.ExecuteQuery(Query, function (err, userdetails) {
                if (err) {
                    reply(status.status(7));
                } else {
                    console.log("updated user details", JSON.stringify(userdetails));
                    console.log("old password", oldPassword)

                    if (userdetails.data[0].password == oldPassword) {
                        var query = "update patient set password = '" + newPassword + "' where patient_id = '" + token.id + "'";
                        mysqlDb.ExecuteQuery(query, function (err, userdetails) {
                            if (err) {
                                reply(status.status(27));
                            } else {
                                reply(status.status(28));
                            }
                        });
                    } else {
                        reply(status.status(26));
                    }
                }
            });


        }
    });


}

module.exports.promoCodeDiscount = function (request, reply) {
    jwt.verify(request.params.ent_token, process.env.SECRET_KEY, function (err, token) {
        if (err) {
            console.log("invalid token");
            reply(status.status(7));
        } else {
            Mongo.Select("coupons", { 'coupon_code': request.params.ent_prmoCode }, function (err, promoCodeDetails) {
                if (err) {
                    console.log(err);
                    console.log("promocode not present");
                } else {
                    if (promoCodeDetails.length == 0) {
                        reply(status.status(29));
                    } else {

                        var todayDate = new Date();
                        var todayTimeStamp = todayDate.getTime();
                        console.log("todayTimeStamp", todayTimeStamp);
                        if (todayTimeStamp > (promoCodeDetails[0].expiry_date * 1000)) {
                            reply(status.status(30));
                        } else {

                            if (promoCodeDetails[0].usage == undefined) {
                                console.log("valid promocode");
                                console.log("promocode present", promoCodeDetails[0].usage);
                                var discountDetails = {
                                    "discount": promoCodeDetails[0].discount,
                                    "discount_type": promoCodeDetails[0].discount_type,
                                    "currency": promoCodeDetails[0].currency
                                }
                                // var usage = [];
                                // var usagedata = {
                                //     "booking_id": request.payload.ent_booking_id,
                                //     "slave_id": request.payload.ent_slave_id,
                                //     "status": 1,
                                //     "discount": parseFloat(promoCodeDetails[0].discount)
                                // }
                                // usage.push(usagedata);
                                // var updateQuery = {
                                //     "usage": usage
                                // }
                                // Mongo.Update("coupons", { '_id': new ObjectID(promoCodeDetails[0]._id) }, updateQuery, function (err, bData) {
                                //     if (err) {
                                //         console.log(err);
                                //     } else {

                                //     }
                                // });
                                reply(discountDetails);

                            } else {
                                reply(status.status(31));
                            }
                        }
                    }
                }
            });
        }
    });


}

module.exports.invoice = function (request, reply) {
    jwt.verify(request.params.ent_token, process.env.SECRET_KEY, function (err, token) {
        if (err) {
            reply(status.status(23));
        } else {
            Mongo.Select("bookings", { '_id': parseInt(request.params.ent_bookingId) }, function (err, invoiceDetails) {
                if (err) {
                    console.log(err);
                } else {
                    console.log("invoiceDetails", invoiceDetails['bid']);
                    console.log("invoiceDetails", invoiceDetails.bid);
                    console.log("invoice", invoiceDetails);


                    var Query = "SELECT * FROM doctor WHERE doc_id = '" + parseInt(invoiceDetails[0].provider.id) + "'";
                    console.log("Query", Query);
                    mysqlDb.ExecuteQuery(Query, function (err, revdetails) {
                        if (err) {
                            console.log(err);
                        } else {
                            console.log(revdetails);
                            var modifiedInvoiceDetails = {
                                "jobId": invoiceDetails[0].bid,
                                "jobStartTime": invoiceDetails[0].job_start_time,
                                "jobEndTime": invoiceDetails[0].job_end_time,
                                "location": {
                                    "latitude": invoiceDetails[0].appt_lat,
                                    "longitude": invoiceDetails[0].appt_long
                                },
                                "providerDetails": invoiceDetails[0].provider,
                                "job_type": invoiceDetails[0].cat_name,
                                "cat_id": invoiceDetails[0].cat_id,
                                "invoiceData": invoiceDetails[0].invoiceData,
                                "comp": invoiceDetails[0].comp,
                                "paymentType": invoiceDetails[0].payment_type,
                                "signature": invoiceDetails[0].comp.sign_url,
                                "services": invoiceDetails[0].services,
                                "hourly_fee": parseInt(invoiceDetails[0].price_min) * 60,
                                "visit_fees": invoiceDetails[0].visit_fees,
                                "coupon_discount": invoiceDetails[0].coupon_discount,
                                "booking_date": invoiceDetails[0].appt_date,
                                "booking_type": invoiceDetails[0].booking_type,
                                "job_description": invoiceDetails[0].customer_notes,
                                "pro_desc": revdetails.data[0].about
                            }

                            console.log("invoiceDetails", modifiedInvoiceDetails);

                            reply(modifiedInvoiceDetails);
                        }
                    });



                }
            });
        }
    });
}

module.exports.categoryByCity = function (request, reply) {
    jwt.verify(request.params.ent_sess_token, process.env.SECRET_KEY, function (err, token) {
        if (err) {
            reply(status.status(7));
        } else {
            Mongo.Select("Category", { 'city_id': request.params.ent_city_id }, function (err, categoryRes) {
                if (err) {
                    console.log(err);
                } else {
                    var Mileage = [];
                    var Hourly = [];
                    var Fixed = [];
                    categoryRes.forEach(function (val) {
                        console.log("http://goclean-service.com/pics/", val.sel_img)
                        var img = "http://goclean-service.com/pics/" + val.sel_img;
                        if (val.fee_type == "Mileage") {
                            Mileage.push({ 'cat_id': val._id, 'cat_name': val.cat_name, 'cat_img': img });
                        }
                        if (val.fee_type == "Hourly") {
                            Hourly.push({ 'cat_id': val._id, 'cat_name': val.cat_name, 'cat_img': img });
                        }
                        if (val.fee_type == "Fixed") {
                            Fixed.push({ 'cat_id': val._id, 'cat_name': val.cat_name, 'cat_img': img });
                        }
                    });

                    reply(status.status(2, { 'Fixed': Fixed, 'Hourly': Hourly, 'Mileage': Mileage }));
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
            var loc = { lat: request.params.ent_lat, lng: request.params.ent_long };
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
                            Mileage.push({ 'cat_id': val._id, 'cat_name': val.cat_name, 'cat_img': val.banner_img });
                        }
                        if (val.fee_type == "Hourly") {
                            Hourly.push({ 'cat_id': val._id, 'cat_name': val.cat_name, 'cat_img': val.banner_img });
                        }
                        if (val.fee_type == "Fixed") {
                            Fixed.push({ 'cat_id': val._id, 'cat_name': val.cat_name, 'cat_img': val.banner_img });
                        }
                    });
                    reply(status.status(2, { 'Fixed': Fixed, 'Hourly': Hourly, 'Mileage': Mileage }));
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
            var loc = { lat: parseFloat(request.params.ent_lat), lng: parseFloat(request.params.ent_long) };
            console.log("sorting query111");
            console.log("sorting query", request.params.sort);
            // var geoNearQuery = {
            //     'catlist.cid': request.params.ent_cat_id,
            //     'status':[3,5],
            //     'online':1,
            //     'booked':0
            // };
            Mongo.GeoNear("location", { 'catlist.cid': request.params.ent_cat_id }, loc, function (err, proRes) {
                if (err) {
                    console.log(err);
                } else {
                    console.log("proRes", proRes);
                    var prolist = [];
                    if (proRes.results.length > 0)
                        asyncLoop(proRes.results, function (item, next) {
                            var provider = item.obj;
                            // console.log("providerrrrrr", provider);
                            var Query = "SELECT * FROM doctor_ratings dr,patient p WHERE doc_id = '" + provider['user'] + "' and dr.patient_id = p.patient_id order by review_id desc limit 1";
                            mysqlDb.ExecuteQuery(Query, function (err, revdetails) {
                                if (err) {
                                    console.log(err);
                                } else {
                                    // calculate avg star_rating
                                    var total_reviews = 0;
                                    var rev_total = 0;
                                    var avg_rev;
                                    var avgRatingQuery = "SELECT * FROM doctor_ratings dr,patient p WHERE doc_id = '" + provider['user'] + "' and dr.patient_id = p.patient_id";
                                    mysqlDb.ExecuteQuery(avgRatingQuery, function (err, revArraydetails) {
                                        if (err) {
                                            console.log(err);
                                        } else {

                                            if (revArraydetails.flag == 0) {
                                                total_reviews = revArraydetails.data.length;
                                                console.log("revArraydetails", revArraydetails);
                                                for (var i = 0; i < revArraydetails.data.length; i++) {
                                                    rev_total += revArraydetails.data[i].star_rating;

                                                }
                                                avg_rev = parseFloat((Math.round(((rev_total / revArraydetails.data.length)) * 100) / 100).toFixed(1));

                                            } else {
                                                avg_rev = 0;
                                            }
                                        }

                                    });



                                    // console.log("revdetails", revdetails);
                                    var cb_query = "SELECT count(b.bid) as tot_comp,d.about as about FROM bookings b ,doctor d WHERE b.pro_id = doc_id and b.pro_id = '" + provider['user'] + "'";
                                    mysqlDb.ExecuteQuery(cb_query, function (err, cb_res) {
                                        if (err) {
                                            console.log(err);
                                        } else {
                                            // console.log("d about",cb_res);
                                            Mongo.SelectOne("Category", { '_id': new ObjectID(request.params.ent_cat_id) }, function (err, categoryRes) {
                                                if (err) {
                                                    console.log(err);
                                                } else {
                                                    // console.log("revdetails.............", revdetails);
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
                                                    // console.log("avg_rev", avg_rev);

                                                    prolist.push({
                                                        'pro_id': provider['user'],
                                                        'name': provider['name'],
                                                        'lname': provider['lname'],
                                                        'image': provider['image'],
                                                        'aboutUs': cb_res['data'][0]['about'],
                                                        'hourl_rate': categoryRes['price_min'] * 60,
                                                        'last_review': l_rev_details,
                                                        'tot_comp': cb_res['data'][0]['tot_comp'],
                                                        "avg_rev": avg_rev,
                                                        "total_reviews": total_reviews
                                                    });

                                                    next();
                                                }
                                            });

                                        }
                                    });
                                }
                            });
                        }, function (err) {
                            if (err) {
                                console.error('Error: ' + err.message);
                                return;
                            } else {
                                if (request.params.sort == 1) {
                                    function sortNumber(a, b) {
                                        return b.hourl_rate - a.hourl_rate;
                                    }
                                    prolist.sort(sortNumber);
                                    reply(status.status(2, prolist));
                                } else if (request.params.sort == 2) {
                                    function sortNumber(a, b) {
                                        return a.hourl_rate - b.hourl_rate;
                                    }
                                    prolist.sort(sortNumber);
                                    reply(status.status(2, prolist));
                                } else if (request.params.sort == 3) {
                                    function sortNumber(a, b) {
                                        return b.tot_comp - a.tot_comp;
                                    }
                                    prolist.sort(sortNumber);
                                    reply(status.status(2, prolist));
                                } else if (request.params.sort == 4) {
                                    function sortNumber(a, b) {
                                        return b.avg_rev - a.avg_rev;
                                    }
                                    prolist.sort(sortNumber);
                                    reply(status.status(2, prolist));
                                } else if (request.params.sort == 0) {
                                    reply(status.status(2, prolist));
                                }

                            }

                        });
                    else
                        reply(status.status(38));
                }
            });
        }
    });
}

// provider list for book now
module.exports.taskerForBookLater = function (request, reply) {

    jwt.verify(request.params.ent_sess_token, process.env.SECRET_KEY, function (err, token) {
        if (err) {
            reply(status.status(7));
        } else {
            var loc = { lat: parseFloat(request.params.ent_lat), lng: parseFloat(request.params.ent_long) };
            // console.log("sorting query111");
            // console.log("sorting query", request.params.sort);
            // var tryingDate = "2017-05-14 16:00:00";
            var tryingDate = request.params.dateTime;
            var splitDate = tryingDate.split(' ')[0];
            var formattedTime = 23 + ":" + 59 + ":" + 59;
            var endDate = splitDate + " " + formattedTime;
            console.log("formatted date end date", endDate)
            var startDate = new Date(tryingDate).getTime();
            // console.log("start date", startDate);
            var expectedProviderDetails = {
                "start_dt": { $gte: tryingDate },
                "end_dt": { $lte: endDate },
                "booked": { $in: [1, 2] }
            }

            console.log("######", JSON.stringify(expectedProviderDetails));

            Mongo.GeoNear('slotbooking', expectedProviderDetails, loc, function (err, result) {
                console.log("location  again")
                // console.log('result: ' + JSON.stringify(result));
                if (err) {
                    return reply({ errFlag: true, errNo: 1, message: err.message }).code(404)
                } else {

                    console.log("result.length", result.results.length);
                    if (result.results.length > 0) {
                        console.log("has length")
                        console.log("::::::", result);
                        var finalArr = [];
                        var slotArray = result.results;

                        var slotArrayDocId = [];
                        console.log("asdsadasdasd", slotArray[0].obj.doc_id)
                        for (var i = 0; i < slotArray.length; i++) {
                            slotArrayDocId.push(slotArray[i].obj.doc_id)
                            // console.log(slotArray[i].obj);
                        }
                        console.log("slot array", slotArrayDocId);

                        var query = {
                            'catlist.cid': request.params.ent_cat_id,
                            'user': { $in: slotArrayDocId }
                        }
                        Mongo.Select("location", query, function (err, proRes) {
                            if (err) {
                                console.log(err);
                            } else {
                                console.log("proRes.results", proRes.length);
                                // console.log("proRes.results", proRes[0]);
                                // console.log("slotArray",slotArray);
                                finalArr = proRes;
                                // console.log("finalArr 1", finalArr);
                                // console.log("proRes", proRes);
                                var prolist = [];
                                if (finalArr.length > 0)
                                    asyncLoop(finalArr, function (item, next) {
                                        var provider = item;
                                        // console.log("providerrrrrr", provider);
                                        var Query = "SELECT * FROM doctor_ratings dr,patient p WHERE doc_id = '" + provider['user'] + "' and dr.patient_id = p.patient_id order by review_id desc limit 1";
                                        mysqlDb.ExecuteQuery(Query, function (err, revdetails) {
                                            if (err) {
                                                console.log(err);
                                            } else {
                                                // calculate avg star_rating
                                                var total_reviews = 0;
                                                var rev_total = 0;
                                                var avg_rev;
                                                var avgRatingQuery = "SELECT * FROM doctor_ratings dr,patient p WHERE doc_id = '" + provider['user'] + "' and dr.patient_id = p.patient_id";
                                                mysqlDb.ExecuteQuery(avgRatingQuery, function (err, revArraydetails) {
                                                    if (err) {
                                                        console.log(err);
                                                    } else {

                                                        if (revArraydetails.flag == 0) {
                                                            total_reviews = revArraydetails.data.length;
                                                            // console.log("revArraydetails", revArraydetails);
                                                            for (var i = 0; i < revArraydetails.data.length; i++) {
                                                                rev_total += revArraydetails.data[i].star_rating;

                                                            }
                                                            avg_rev = parseFloat((Math.round(((rev_total / revArraydetails.data.length)) * 100) / 100).toFixed(1));

                                                        } else {
                                                            avg_rev = 0;
                                                        }
                                                    }

                                                });



                                                // console.log("revdetails", revdetails);
                                                var cb_query = "SELECT count(b.bid) as tot_comp,d.about as about FROM bookings b ,doctor d WHERE b.pro_id = doc_id and b.pro_id = '" + provider['user'] + "'";
                                                mysqlDb.ExecuteQuery(cb_query, function (err, cb_res) {
                                                    if (err) {
                                                        console.log(err);
                                                    } else {
                                                        // console.log("d about",cb_res);
                                                        Mongo.SelectOne("Category", { '_id': new ObjectID(request.params.ent_cat_id) }, function (err, categoryRes) {
                                                            if (err) {
                                                                console.log(err);
                                                            } else {
                                                                console.log("revdetails.............", revdetails);
                                                                var l_rev_details = {};
                                                                if (revdetails['flag'] == 0) {
                                                                    var l_data = {
                                                                        'cust_fname': revdetails['data'][0]['first_name'],
                                                                        'last_fname': revdetails['data'][0]['last_name'],
                                                                        'cust_pic': revdetails['data'][0]['profile_pic'],
                                                                        'review': revdetails['data'][0]['review'],
                                                                        'review_dt': revdetails['data'][0]['review_dt'],
                                                                        'star_rating': revdetails['data'][0]['star_rating']
                                                                    }
                                                                    l_rev_details = l_data;
                                                                }
                                                                // console.log("avg_rev", avg_rev);
                                                                prolist.push({
                                                                    'pro_id': provider['user'],
                                                                    'name': provider['name'],
                                                                    'lname': provider['lname'],
                                                                    'image': provider['image'],
                                                                    'aboutUs': cb_res['data'][0]['about'],
                                                                    'hourl_rate': categoryRes['price_min'] * 60,
                                                                    'last_review': l_rev_details,
                                                                    'tot_comp': cb_res['data'][0]['tot_comp'],
                                                                    "avg_rev": avg_rev,
                                                                    "total_reviews": total_reviews
                                                                });
                                                                next();
                                                            }
                                                        });

                                                    }
                                                });
                                            }
                                        });
                                    }, function (err) {
                                        console.log("final array");
                                        if (err) {
                                            console.error('Error: ' + err.message);
                                            // reply(status.status(38));
                                            return;
                                        } else {

                                            if (request.params.sort == 1) {
                                                function sortNumber(a, b) {
                                                    return b.hourl_rate - a.hourl_rate;
                                                }
                                                prolist.sort(sortNumber);
                                                reply(status.status(2, prolist));
                                            } else if (request.params.sort == 2) {
                                                function sortNumber(a, b) {
                                                    return a.hourl_rate - b.hourl_rate;
                                                }
                                                prolist.sort(sortNumber);
                                                reply(status.status(2, prolist));
                                            } else if (request.params.sort == 3) {
                                                function sortNumber(a, b) {
                                                    return b.total_reviews - a.total_reviews;
                                                }
                                                prolist.sort(sortNumber);
                                                reply(status.status(2, prolist));
                                            } else if (request.params.sort == 4) {
                                                function sortNumber(a, b) {
                                                    return b.avg_rev - a.avg_rev;
                                                }
                                                prolist.sort(sortNumber);
                                                reply(status.status(2, prolist));
                                            } else if (request.params.sort == 0) {
                                                reply(status.status(2, prolist));
                                            }

                                        }

                                    });
                                else
                                    reply(status.status(39));
                            }
                        });
                    } else {
                        console.log("no length");
                        reply(status.status(39));
                    }



                }
            })

        }
    });
}

// Get all the slots
module.exports.slots = function (request, reply) {

    jwt.verify(request.params.ent_sess_token, process.env.SECRET_KEY, function (err, token) {
        if (err) {
            reply(status.status(7));
        } else {

            var tryingDate = request.params.dateTime;
            var splitDate = tryingDate.split(' ')[0];
            var formattedTime = 23 + ":" + 59 + ":" + 59;
            var endDate = splitDate + " " + formattedTime;
            // console.log("formatted date end date", endDate)
            var startDate = new Date(tryingDate).getTime();
            // console.log("start date", startDate);
            var expectedSlotsDetails = {
                "start_dt": { $gte: tryingDate },
                "end_dt": { $lte: endDate },
                "doc_id": parseInt(request.params.ent_pro_id),
                "status": { $ne: 3 }
            }
            console.log("query", expectedSlotsDetails);
            Mongo.Select('slotbooking', expectedSlotsDetails, function (err, slots) {
                if (err) {
                    return reply({ errFlag: true, errNo: 1, message: err.message }).code(404);
                } else {
                    reply(status.status(2, slots));
                }
            })

        }
    });
}

module.exports.categoryAvailable = function (request, reply) {

    jwt.verify(request.params.ent_sess_token, process.env.SECRET_KEY, function (err, token) {
        if (err) {
            reply(status.status(7));
        } else {
            var loc = { lat: request.params.ent_lat, lng: request.params.ent_long };
            Mongo.GeoNear("Category", {}, loc, function (err, categoryRes) {
                if (err) {
                    console.log(err);
                } else {
                    var isAvailable = 0;
                    categoryRes.results.forEach(function (val) {
                        val = val.obj;
                        if (val._id == request.params.ent_cat_id) {
                            isAvailable = 1;
                        }
                    });
                    reply(status.status(2, { isAvailable: isAvailable }));
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

function sortNumber(a, b, sortingFeild, sortingOrder) {
    if (sortingOrder == 1) {
        return b.sortingFeild - a.sortingFeild;
    } else if (sortingOrder == 2) {
        return a.sortingFeild - b.sortingFeild;
    }

}