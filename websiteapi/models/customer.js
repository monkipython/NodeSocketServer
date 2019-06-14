var Mongo = require('../databases/UtilityFunc');
var mysqlDb = require('../databases/mysql');
var async = require("async");
var status = require('../statusMsg/status');
var moment = require('moment');
var ObjectID = require('mongodb').ObjectID;
var fs = require('fs');
var md5 = require('js-md5');

var DEBUG = true;

//================ require crypto module, it is used as JavaScript implementations of standard and secure cryptographic algorithms ==================
var crypto = require('crypto');

var userSessionTime = 489800;
var asyncLoop = require('node-async-loop');




// =============== require stripe =================
var stripe = require('stripe')("sk_live_aM2L5OTMkqSgPHTZBGRfoc6g");

var sendSms = require('../twillotest');

var checkHeader = require('../checkHeaders');

var commonFunc = require('../commonFunction');

var jwtFunctions = require('../jwtCheck');
var conf = require('../config/config.json');
const privateKey = conf.JWTprivateKey;



// NEW CUSTOMER SIGNUP API

/**
 * @api {post} /customer/signup Request for Inserting new customer details  
 * @apiName Add New Customer
 * @apiGroup customer
 *
 * @apiHeaders {authorization} Basic Authorization.
 * 
 * @apiPayload request object
 *
 * @apiSuccess {Object} If the information is inserted successfully then send success message and sigunup jwt token
*/
module.exports.signup = function (request, reply) {

    // CHECKING FOR BASIC AUTHORIZATION   
    var printHeadersBasicAuth = checkHeader.headerchecking(request.headers.authorization);

    // IF HEADER MATCHES    
    if (printHeadersBasicAuth) {

        DEBUG && console.log("hey this is customer")

        var checkEmail = commonFunc.emailChecking(request.payload.email, 1, function (err, result) {
            if (err) {
                DEBUG && console.log(err);
            } else {
                if (result == null) {
                    var checkPhone = commonFunc.mobileChecking(request.payload.mobile, 1, function (err, resultPhone) {
                        if (err) {
                            DEBUG && console.log(err);
                        } else {
                            if (resultPhone == null) {

                                // QUERY FOR LAST ADDED BOOKING
                                var limit = 1;

                                var query = {

                                };

                                // SORTING BY MOST RECENT BOOKING
                                var sort = {
                                    "_id": -1
                                };


                                // SEARCHING FOR LAST CUSTOMER ID
                                Mongo.SelectWithLimitSkipSort('slave', query, limit, 0, sort, function (err, last_slave) {

                                    if (err) {
                                        return reply({ "errFlag": true, "data": { "message": "Bad Quiery" } }).code(400);
                                    } else {

                                        var password = crypto.createHash('md5').update(request.payload.password).digest("hex")
                                        // return reply({"date": (new Date()).toUTCString()}).code(200);  
                                        var d = new Date();
                                        var date;
                                        var month;
                                        var hours;
                                        var minutes;
                                        var seconds;

                                        if (d.getUTCDate() < 10) {
                                            date = "0" + d.getUTCDate()
                                        } else {
                                            date = d.getUTCDate()
                                        }

                                        if ((d.getUTCMonth() + 1) < 10) {
                                            month = "0" + (d.getUTCMonth() + 1)
                                        } else {
                                            month = (d.getUTCMonth() + 1)
                                        }

                                        if (d.getUTCHours() < 10) {
                                            hours = "0" + d.getUTCHours()
                                        } else {
                                            hours = d.getUTCHours()
                                        }

                                        if (d.getUTCMinutes() < 10) {
                                            minutes = "0" + d.getUTCMinutes()
                                        } else {
                                            minutes = d.getUTCMinutes()
                                        }

                                        if (d.getUTCSeconds() < 10) {
                                            seconds = "0" + d.getUTCSeconds()
                                        } else {

                                            seconds = d.getUTCSeconds()
                                        }

                                        //  "2017-01-01 01:01:00"
                                        var date = d.getUTCFullYear() + "-" + date + "-" + month + " " + hours + ":" + minutes + ":" + seconds;

                                        // BUILDING REQUEST BODY
                                        var requestBody;
                                        if (request.payload.signup_type == 1) {
                                            requestBody = {
                                                "_id": last_slave[0]._id + 1,
                                                first_name: request.payload.first_name,
                                                last_name: request.payload.last_name,
                                                email: request.payload.email,
                                                country_code: request.payload.country_code,
                                                mobile: request.payload.mobile,
                                                latitude: request.payload.latitude,
                                                longitude: request.payload.longitude,
                                                device_id: request.payload.device_id,
                                                device_type: request.payload.device_type,
                                                profile_pic: request.payload.profile_pic,
                                                password: password,
                                                zipcode: request.payload.zipcode,
                                                signup_type: request.payload.signup_type,
                                                status: 2,
                                                push_token: null,
                                                stripe_id: null,
                                                resetData: null,
                                                resetFlag: null,
                                                app_Version: 1.0,
                                                coupen: null,
                                                signup_date: date,
                                                last_modified: date
                                            }
                                        } else {
                                            requestBody = {
                                                "_id": last_slave[0]._id + 1,
                                                first_name: request.payload.first_name,
                                                last_name: request.payload.last_name,
                                                email: request.payload.email,
                                                country_code: request.payload.country_code,
                                                mobile: request.payload.mobile,
                                                latitude: request.payload.latitude,
                                                longitude: request.payload.longitude,
                                                device_id: request.payload.device_id,
                                                device_type: request.payload.device_type,
                                                profile_pic: request.payload.profile_pic,
                                                password: password,
                                                zipcode: request.payload.zipcode,
                                                signup_type: request.payload.signup_type,
                                                fb_id: request.payload.fb_id,
                                                status: 2,
                                                push_token: null,
                                                stripe_id: null,
                                                resetData: null,
                                                resetFlag: null,
                                                app_Version: 1.0,
                                                coupen: null,
                                                signup_date: date,
                                                last_modified: date
                                            }

                                        }

                                        Mongo.Insert('slave', requestBody, function (err, insertResult) {
                                            if (err) {
                                                return reply({ "errFlag": true, "data": { "message": "Bad Quiery" } }).code(400);
                                            } else {

                                                jwtFunctions.jwtSign(requestBody._id, function (err, jwtToken) {
                                                    if (err) {
                                                        DEBUG && console.log("There is error");
                                                    } else {

                                                        commonFunc.appConfig(function (err, appConfiguration) {
                                                            if (err) {
                                                                console.log(err);
                                                            } else {

                                                                commonFunc.getAllLanguages(function (err, langList) {
                                                                    if (err) {
                                                                        console.log("err", err);
                                                                    } else {
                                                                        var responseBody = {
                                                                            "coupon": null,
                                                                            "codeErr": null,
                                                                            "token": jwtToken,
                                                                            "CustId": last_slave[0]._id + 1,
                                                                            "stripe_pub_key": appConfiguration.pg_public_key,
                                                                            "currency": appConfiguration.currency,
                                                                            "distance": appConfiguration.distance,
                                                                            "Languages": langList
                                                                        }
                                                                        // LOG IN SUCCESS MESSAGE
                                                                        return reply({ errFlag: false, errNum: 0, errMsg: insertResult, data: responseBody }).code(200);
                                                                    }
                                                                })

                                                            }
                                                        });

                                                    }
                                                })
                                            }
                                        })


                                    }


                                });

                            } else {
                                return reply({ "errFlag": true, "errNo": 1, "data": { "message": "Sorry, this Phone Number is already registered." } }).code(200);
                            }
                        }
                    })

                } else {
                    return reply({ "errFlag": true, "errNo": 1, "data": { "message": "Sorry, this email is already registered." } }).code(200);
                }

            }
        });
        DEBUG && console.log("checkEail", checkEmail);






    } else {

        // IF BASIC AUHTORIZATION FAILS
        return reply({ "errFlag": true, "data": { "message": "Unauthorized Access" } }).code(403);

    }
}

// CUSTOMER LOGIN API

/**
 * @api {post} /customer/login Request for Logging In after matching details  
 * @apiName Customer Login
 * @apiGroup customer
 *
 * @apiHeaders {authorization} Basic Authorization.
 * 
 * @apiPayload request object
 *
 * @apiSuccess {Object} If the information is inserted successfully then send success message and sigunup jwt token
*/
module.exports.login = function (request, reply) {

    // CHECKING FOR BASIC AUTHORIZATION   
    var printHeadersBasicAuth = checkHeader.headerchecking(request.headers.authorization);

    // IF HEADER MATCHES    
    if (printHeadersBasicAuth) {

        var password = crypto.createHash('md5').update(request.payload.password).digest("hex");
        DEBUG && console.log("email", request.payload.email)

        //   CHECK IF EMAIL OR  PHONE NUMBER IS BLANK
        if (!request.payload.email && !request.payload.mobile) {
            DEBUG && console.log("not present");
            return reply({ "errFlag": true, "data": { "message": "PLease enter email address or phone number" } }).code(400);
        } else {

            if (!request.payload.mobile) {

                var checkEmail = commonFunc.emailChecking(request.payload.email, 1, function (err, resultEmail) {
                    if (err) {
                        DEBUG && console.log(err);
                    } else {
                        if (resultEmail == null) {
                            return reply({ "errFlag": true, "errNo": 1, "data": { "message": "This email is not registered." } }).code(200);
                        } else {
                            if (resultEmail.password == password) {
                                jwtFunctions.jwtSign(resultEmail._id, function (err, jwtToken) {
                                    if (err) {
                                        DEBUG && console.log("jwt error", err);
                                    } else {

                                        commonFunc.appConfig(function (err, appConfiguration) {
                                            if (err) {
                                                console.log(err);
                                            } else {

                                                commonFunc.getAllLanguages(function (err, langList) {
                                                    if (err) {
                                                        console.log("err", err);
                                                    } else {
                                                        var responseBody = {
                                                            "coupon": resultEmail.coupen,
                                                            "codeErr": null,
                                                            "token": jwtToken,
                                                            "CustId": resultEmail._id,
                                                            "stripe_pub_key": appConfiguration.pg_public_key,
                                                            "currency": appConfiguration.currency,
                                                            "distance": appConfiguration.distance,
                                                            "Languages": langList
                                                        }
                                                        // LOG IN SUCCESS MESSAGE
                                                        return reply({ errFlag: false, errNum: 0, errMsg: "Logged In Successfully", data: responseBody }).code(200);
                                                    }
                                                })

                                            }
                                        });

                                    }
                                })

                            } else {
                                return reply({ "errFlag": true, "errNo": 1, "data": { "message": "Password did not match" } }).code(200);
                            }

                        }
                    }
                });
                // return reply({ "message": "at least one peresent EMAIL" });

            } else if (!request.payload.email) {
                // return reply({ "message": "at least one peresent PHONE" });
                var checkPhone = commonFunc.mobileChecking(request.payload.mobile, 1, function (err, resultPhone) {
                    if (err) {
                        DEBUG && console.log(err);
                    } else {
                        if (resultPhone == null) {
                            return reply({ "errFlag": true, "errNo": 1, "data": { "message": "This phone number is not registered." } }).code(200);
                        } else {

                            if (resultPhone.password == password) {
                                jwtFunctions.jwtSign(resultPhone._id, function (err, jwtToken) {
                                    if (err) {
                                        DEBUG && console.log("jwt error", err);
                                    } else {
                                        commonFunc.getAllLanguages(function (err, langList) {
                                            if (err) {
                                                console.log("err", err);
                                            } else {
                                                var responseBody = {
                                                    "coupon": resultPhone.coupen,
                                                    "codeErr": null,
                                                    "token": jwtToken,
                                                    "CustId": resultPhone._id,
                                                    "stripe_pub_key": appConfiguration.pg_public_key,
                                                    "currency": appConfiguration.currency,
                                                    "distance": appConfiguration.distance,
                                                    "Languages": langList
                                                }
                                                // LOG IN SUCCESS MESSAGE
                                                return reply({ errFlag: false, errNum: 0, errMsg: "Logged In Successfully", data: responseBody }).code(200);
                                            }
                                        })
                                    }
                                })
                            } else {
                                return reply({ "errFlag": true, "errNo": 1, "data": { "message": "Password did not match" } }).code(200);
                            }
                        }
                    }
                });
            }
        }

    } else {

        // IF BASIC AUHTORIZATION FAILS
        return reply({ "errFlag": true, "data": { "message": "Unauthorized Access" } }).code(403);

    }
}

// CUSTOMER EMAIL VALIDATION API

/**
 * @api {post} /customer/emailValidation Request for email validation, checking if it is already registred   or not  
 * @apiName Customer Email Validation
 * @apiGroup customer
 *
 * @apiHeaders {authorization} Basic Authorization.
 * 
 * @apiPayload request object
 *
 * @apiSuccess {Object} If the information is inserted successfully then send success message and sigunup jwt token
*/
module.exports.emailValidation = function (request, reply) {

    // CHECKING FOR BASIC AUTHORIZATION   
    var printHeadersBasicAuth = checkHeader.headerchecking(request.headers.authorization);

    // IF HEADER MATCHES    
    if (printHeadersBasicAuth) {
        var checkEmail = commonFunc.emailChecking(request.payload.email, 1, function (err, resultEmail) {
            if (err) {

                DEBUG && console.log("err", err);
            } else {
                if (resultEmail == null) {
                    return reply({ "errFlag": false, "errNo": 0, "data": { "message": "Email is not registered" } }).code(200);
                } else {
                    return reply({ "errFlag": true, "errNo": 1, "data": { "message": "Email is already registered" } }).code(200);
                }
            }
        });
    } else {

        // IF BASIC AUHTORIZATION FAILS
        return reply({ "errFlag": true, "data": { "message": "Unauthorized Access" } }).code(403);

    }
}

// CUSTOMER'S PHONE NUMBER VALIDATION API

/**
 * @api {post} /customer/phoneValidation Request for phone validation, checking if it is already registred   or not 
 * @apiName Customer Phone Validation
 * @apiGroup customer
 *
 * @apiHeaders {authorization} Basic Authorization.
 * 
 * @apiPayload request object
 *
 * @apiSuccess {Object} If the information is inserted successfully then send success message and sigunup jwt token
*/
module.exports.phoneNumberValidation = function (request, reply) {

    // CHECKING FOR BASIC AUTHORIZATION   
    var printHeadersBasicAuth = checkHeader.headerchecking(request.headers.authorization);

    // IF HEADER MATCHES    
    if (printHeadersBasicAuth) {
        var checkPhone = commonFunc.mobileChecking(request.payload.mobile, 1, function (err, resultPhone) {
            if (err) {

                DEBUG && console.log("err", err);
            } else {
                if (resultPhone == null) {
                    return reply({ "errFlag": false, "errNo": 0, "data": { "message": "Mobile number is not registered" } }).code(200);
                } else {
                    return reply({ "errFlag": true, "errNo": 1, "data": { "message": "Mobile number is already registered" } }).code(200);
                }
            }
        });
    } else {

        // IF BASIC AUHTORIZATION FAILS
        return reply({ "errFlag": true, "data": { "message": "Unauthorized Access" } }).code(403);

    }
}

// CUSTOMER SEND OTP API

/**
 * @api {post} /customer/sendOtp Request for phone validation, checking if it is already registred   or not 
 * @apiName Customer Phone Validation
 * @apiGroup customer
 *
 * @apiHeaders {authorization} Basic Authorization.
 * 
 * @apiPayload request object
 *
 * @apiSuccess {Object} If the phone number is valid, OTP goes to the phone number requested for and the verification table is updated with the code and if the phone entry is not in table then it is inserted in the table.
*/
module.exports.sendOtp = function (request, reply) {

    // CHECKING FOR BASIC AUTHORIZATION   
    var printHeadersBasicAuth = checkHeader.headerchecking(request.headers.authorization);

    // IF HEADER MATCHES    
    if (printHeadersBasicAuth) {
        console.log("selecting provider");
        var phone = request.payload.country_code + request.payload.mobile;
        commonFunc.selectMobileCommunicationPlatform('twilio', 'otp', phone, function (err, providerResult) {

            if (providerResult.errNum == 1016) {

                var query = {
                    "mobile": phone
                }
                Mongo.Select('verification', query, function (err, varificationData) {
                    if (err) {
                        return reply({ "errFlag": true, "errNum": 1, "errMsg": "Failed to send OTP" }).code(200);
                    } else {
                        console.log("varificationData", varificationData[0]);
                        if (varificationData[0]) {
                            var updateQuery = {
                                "code": providerResult.code,
                                "ts": Math.floor((new Date()).getTime() / 1000)
                            }
                            var query = {
                                "mobile": phone
                            }

                            Mongo.Update('verification', query, updateQuery, function (err, updatedData) {
                                if (err) {
                                    console.log("err", err);
                                } else {
                                    return reply({ "errFlag": false, "errNum": 0, "errMsg": providerResult.errMsg }).code(200);
                                }
                            })
                            console.log("is present");
                        } else {

                            var data = {
                                "mobile": phone,
                                "code": providerResult.code,
                                "ts": Math.floor((new Date()).getTime() / 1000)
                            }

                            Mongo.Insert('verification', data, function (err, data) {
                                if (err) {
                                    console.log("err", err)
                                } else {
                                    return reply({ "errFlag": false, "errNum": 0, "errMsg": providerResult.errMsg }).code(200);
                                }
                            });
                            console.log("is absent");
                        }
                    }
                });
                // return reply({"errFlag": false,"errNum":0,"errMsg":providerResult.errMsg}).code(200);
            } else if (providerResult.errNum == 1017) {
                return reply({ "errFlag": true, "errNum": 1, "errMsg": providerResult.errMsg }).code(200);
            } else {
                return reply({ "errFlag": true, "errNum": 1, "errMsg": "Failed to send OTP" }).code(200);
            }
        })
    } else {

        // IF BASIC AUHTORIZATION FAILS
        return reply({ "errFlag": true, "data": { "message": "Unauthorized Access" } }).code(403);

    }
}

// VERIFY OTP API FOR SIGNUP AND FORGETPASSWORD

/**
 * @api {post} /customer/verifyOtp Request for verifying OTP for signup and forget password 
 * @apiName Customer OTP Verification
 * @apiGroup customer
 *
 * @apiHeaders {authorization} Basic Authorization.
 * 
 * @apiPayload request object
 *
 * @apiSuccess {Object} If the information is inserted successfully then send success message and sigunup jwt token
*/
module.exports.verifyOtp = function (request, reply) {

    // CHECKING FOR BASIC AUTHORIZATION   
    var printHeadersBasicAuth = checkHeader.headerchecking(request.headers.authorization);

    // IF HEADER MATCHES 
    if (printHeadersBasicAuth) {

        var phone = request.payload.country_code + request.payload.mobile;

        var query = {
            'mobile': phone
        }
        var verificationVar = commonFunc.verifyOtp(phone, request.payload.code, function (err, verifyResult) {
            if (err) {
                console.log("error", err);
            } else {
                //    return reply({"data": result}).code(200);
                if (verifyResult.errNum == 1) {

                    return reply({ "errFlag": verifyResult.errFlag, "errNum": verifyResult.errNum, "errMsg": verifyResult.errMsg }).code(200);
                } else if (verifyResult.errNum == 0) {

                    if (request.payload.verificationType == 1) {

                        return reply({ "errFlag": verifyResult.errFlag, "errNum": verifyResult.errNum, "errMsg": "Mobile number verified" }).code(200);
                    } else {

                        commonFunc.mobileChecking(request.payload.mobile, '1', function (err, res) {
                            if (err) {

                                console.log("error", err);
                            } else {

                                if (res == null) {

                                    return reply({ "errFlag": true, errNum: 1, errMsg: "OTP Sending failed" }).code(200);
                                } else {

                                    var acc_id = res._id;
                                    jwtFunctions.jwtSign(acc_id, function (err, jwtRes) {

                                        return reply({ "errFlag": false, "errNum": 0, "errMsg": "Token generated", "token": jwtRes });
                                    })
                                }
                            }
                        });
                    }
                }

            }
        });
    } else {

        // IF BASIC AUHTORIZATION FAILS
        return reply({ "errFlag": true, "data": { "message": "Unauthorized Access" } }).code(403);

    }

}

// FORGET PASSWORD API FOR CUSTOMER

/**
 * @api {post} /customer/forgetPassword Request for sending instructions for resetting password 
 * @apiName Customer Forget Password API
 * @apiGroup customer
 *
 * @apiHeaders {authorization} Basic Authorization.
 * 
 * @apiPayload request object
 *
 * @apiSuccess {Object} If the information is inserted successfully then send success message and sigunup jwt token
*/
module.exports.forgetPassword = function (request, reply) {

    // CHECKING FOR BASIC AUTHORIZATION   
    var printHeadersBasicAuth = checkHeader.headerchecking(request.headers.authorization);

    // IF HEADER MATCHES 
    if (printHeadersBasicAuth) {

        //   CHECK IF EMAIL OR  PHONE NUMBER IS BLANK
        if (!request.payload.email && !request.payload.mobile) {
            DEBUG && console.log("not present");
            return reply({ "errFlag": true, "data": { "message": "PLease enter email address or phone number" } }).code(400);
        } else {

            if (!request.payload.mobile) {

                var checkEmail = commonFunc.emailChecking(request.payload.email, 1, function (err, resultEmail) {
                    if (err) {
                        DEBUG && console.log(err);
                    } else {
                        if (resultEmail == null) {
                            return reply({ "errFlag": true, "errNo": 1, "data": { "message": "This email is not registered." } }).code(200);
                        } else {
                            return reply({ "msg": "email is registered" }).code(200);

                        }
                    }
                });
                // return reply({ "message": "at least one peresent EMAIL" });

            } else if (!request.payload.email) {
                // return reply({ "message": "at least one peresent PHONE" });
                var checkPhone = commonFunc.mobileChecking(request.payload.mobile, 1, function (err, resultPhone) {
                    if (err) {
                        DEBUG && console.log(err);
                    } else {
                        if (resultPhone == null) {
                            return reply({ "errFlag": true, "errNo": 1, "data": { "message": "This phone number is not registered." } }).code(200);
                        } else {

                            // var phone = resultPhone.country_code + request.payload.mobile;
                            // commonFunc.selectMobileCommunicationPlatform('twilio', 'otp', phone, function (err, providerResult) {

                            //     if (providerResult.errNum == 1016) {

                            //         var query = {
                            //             "mobile": phone
                            //         }
                            //         Mongo.Select('verification', query, function (err, varificationData) {
                            //             if (err) {
                            //                 return reply({ "errFlag": true, "errNum": 1, "errMsg": "Failed to send OTP" }).code(200);
                            //             } else {
                            //                 console.log("varificationData", varificationData[0]);
                            //                 if (varificationData[0]) {
                            //                     var updateQuery = {
                            //                         "code": providerResult.code,
                            //                         "ts": Math.floor((new Date()).getTime() / 1000)
                            //                     }
                            //                     var query = {
                            //                         "mobile": phone
                            //                     }

                            //                     Mongo.Update('verification', query, updateQuery, function (err, updatedData) {
                            //                         if (err) {
                            //                             console.log("err", err);
                            //                         } else {
                            //                             return reply({ "errFlag": false, "errNum": 0, "errMsg": providerResult.errMsg }).code(200);
                            //                         }
                            //                     })
                            //                     console.log("is present");
                            //                 } else {

                            //                     var data = {
                            //                         "mobile": phone,
                            //                         "code": providerResult.code,
                            //                         "ts": Math.floor((new Date()).getTime() / 1000)
                            //                     }

                            //                     Mongo.Insert('verification', data, function (err, data) {
                            //                         if (err) {
                            //                             console.log("err", err)
                            //                         } else {
                            //                             return reply({ "errFlag": false, "errNum": 0, "errMsg": providerResult.errMsg }).code(200);
                            //                         }
                            //                     });
                            //                     console.log("is absent");
                            //                 }
                            //             }
                            //         });
                            //         // return reply({"errFlag": false,"errNum":0,"errMsg":providerResult.errMsg}).code(200);
                            //     } else if (providerResult.errNum == 1017) {
                            //         return reply({ "errFlag": true, "errNum": 1, "errMsg": providerResult.errMsg }).code(200);
                            //     } else {
                            //         return reply({ "errFlag": true, "errNum": 1, "errMsg": "Failed to send OTP" }).code(200);
                            //     }
                            // })
                            return reply({ "msg": "email is registered" }).code(200)
                        }
                    }
                });
            }
        }

    } else {

        // IF BASIC AUHTORIZATION FAILS
        return reply({ "errFlag": true, "data": { "message": "Unauthorized Access" } }).code(403);

    }

}














































































