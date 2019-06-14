
var commonFunc = require('../../commonFunction');
var sendsms = require('./sendMessage');

exports.otp = function (data, callback) {
    console.log("came to otp", data);

    commonFunc.generateRandomNumber(4, function (err, randomNumber) {
        if (err) {
            console.log("error", err)
        } else {
            commonFunc.appConfig(function (error, appRes) {
                if (err) {
                    return callback(null, error)
                } else {
                    var sendData = {
                        "body": 'Hello from '+ appRes.app_name + '. Your OTP is ' + randomNumber,
                        "to": data
                    }
                    sendsms.sendSms(sendData, function (err, result) {
                        if (err) {
                            return callback(null, error)
                        } else {
                            result['code'] = randomNumber;
                            return callback(null, result);
                        }
                    });
                }

            });
        }
    });
}
