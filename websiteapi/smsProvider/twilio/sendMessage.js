
var twilio = require('twilio');

var commonFunc = require('../../commonFunction');

exports.sendSms = function (data, callback) {

    commonFunc.appConfig(function (err, configRes) {
        if (err) {
            console.log("err", err);
        } else {
            console.log(configRes,"dataaaa", data);
            var accountSid = configRes.twilio.accountSid; 
            var authToken = configRes.twilio.authToken;
            var client = new twilio.RestClient(accountSid, authToken); 
            client.messages.create({
                body: data.body,
                to: data.to, // Text this number
                from: configRes.twilio.numberFrom, // From a valid Twilio number
            }, function (err, message) {
                if (!err) {
                    var response = {
                        "errNum": 1016,
                        "errMsg": "Success,OTP Sent."
                    }
                    return callback(null,response);
                } else {
                    var response = {
                        "errNum": 1017,
                        "errMsg": "Sending OTP failed, Please enter valid phone number"
                    }
                    return callback(null,response);
                }
            });
        }
    });

}
