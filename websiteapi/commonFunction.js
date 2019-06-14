'use strict';

var mongo = require('./databases/UtilityFunc');

// CHECKING IF EMAIL IS PRESENT IN GIVEN TABLE OR NOT
exports.emailChecking = function (email, val, callback) {
    var table;
    if (val == '1') {
        table = 'slave'
    } else if (val == '2') {
        table = 'location'
    }

    var query = {
        email: email
    }
    var flag;
    mongo.SelectOne(table, query, function (err, data) {
        if (err) {
            // console.log("bad request");
            return callback(err, err);
        } else {
            // console.log("data", data);
            if (data == null) {
                // console.log("hey null", data)
                flag = false;
                return callback(null, data);
            } else {
                // console.log("hey found", data)
                flag = true;
                return callback(null, data);
            }


        }
    })


};

// CHECKING IF PHONE NUMBER IS PRESENT IN GIVEN TABLE OR NOT
exports.mobileChecking = function (mobile, val, callback) {
    var table;
    if (val == '1') {
        table = 'slave'
    } else if (val == '2') {
        table = 'patient'
    }

    var query = {
        mobile: mobile
    }

    mongo.SelectOne(table, query, function (err, data) {
        if (err) {
            console.log("bad request")
        } else {
            //    console.log("data", data);
            if (data == null) {
                return callback(null, data);
            } else {
                return callback(null, data);
            }
        }
    })


};

// GENERATING RANDOM NUMBER OF GIVEN LENGTH
exports.generateRandomNumber = function (numberOfDigits, callback) {

    var length = Math.pow(10, (numberOfDigits - 1));
    //   console.log("length of digits", length) ; 
    var randomNum = Math.floor(length + Math.random() * 9000);
    return callback(null, randomNum);
}

// GETTING APP CONFIGRATION DETAILS
exports.appConfig = function (callback) {

    var query = {
        "_id": 1
    }

    mongo.SelectOne('config', query, function (err, data) {
        if (err) {
            console.log("bad request")
        } else {
            //    console.log("data", data);
            if (data == null) {
                return callback(null, data);
            } else {
                return callback(null, data);
            }
        }
    })


};

//GETTING LANGUAGES LIST
exports.getAllLanguages = function (callback) {

    var project = { lan_id: 1, lan_name: 1, _id: 0 }

    mongo.SelectWithProject('lang_hlp', {}, project, function (err, data) {
        if (err) {
            console.log("bad request")
        } else {
            //    console.log("data", data);
            if (data == null) {
                return callback(null, data);
            } else {
                return callback(null, data);
            }
        }
    })
}

// SELECT SMS PROVIDER
exports.selectMobileCommunicationPlatform = function (platformName, messageType, phoneNumber, callback) {

    switch (platformName) {
        case 'twilio':
            console.log("sendSmssendSmssendSmssendSms", phoneNumber);
            var twilio = require('./smsProvider/twilio/twilio');
            twilio.sendSms(messageType, phoneNumber, function (err, res) {
                // console.log("twilio selected2", res);
                if (err) {
                    return callback(null, err);
                } else {
                    return callback(null, res);
                }
            });
            break;
        default:
            console.log("not matched");
            break;
    }

}

exports.verifyOtp = function (mobile, code, callback) {

    var query = {
        "mobile": mobile
    };

    mongo.Select('verification', query, function (err, verificationResult) {

        if (err) {
            console.log("error", error);
        } else {
            var timeNow = Math.floor((new Date()).getTime() / 1000);
            var t = new Date();
            t.setSeconds(t.getSeconds() + 60);
            var increasedTime = Math.floor(t.getTime() / 1000);

            //INCREASE TIME BY 1 MIN AND CHECK
            var dbTime = verificationResult[0].ts + 600;
            var obj;
            // dbTime.setSeconds(dbTime.getSeconds() + 60);

            if (dbTime >= timeNow) {
                console.log("entered here 1", verificationResult[0].code,"dasdsad ", code);

                if (verificationResult[0].code == code) {

                   obj = {
                        errFlag: false,
                        errNum: 0
                    };

                    return callback(null, obj);
                  
                } else {
                    obj = {
                        errFlag: true,
                        errNum: 1,
                        errMsg: "Invalid OTP"
                    };

                    return callback(null, obj);
                }

            } else {

                obj = {
                    errFlag: true,
                    errNum: 1,
                    errMsg: "OTP expired"
                };
                return callback(null, obj);;
            }

            // return callback(null, timeRes);

            //   verificationResult[0].ts 
        }
    });
}