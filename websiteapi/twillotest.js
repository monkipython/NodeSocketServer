var accountSid = 'AC2d4200d61270a58bdd9d12db08c7e69a'; // Your Account SID from www.twilio.com/console
var authToken = '033ecd8df1b113d6fc4f987bb06672b9';   // Your Auth Token from www.twilio.com/console

var twilio = require('twilio');
var client = new twilio.RestClient(accountSid, authToken);

// var client =require('twilio')(accountSid, authToken)


exports.sendsms = function (data, callback) {
    client.messages.create({
        body: 'Hello from iServe. Your OTP is ' + data.code,
        to: data.mobile, // Text this number
        from: '(855) 577-4986' // From a valid Twilio number
    }, function (err, message) {
        if (!err) {
            var response = {
                "errNum": 1016,
                "errMsg": "success"
            }
            return callback(response);
        } else {
            var response = {
                "errNum": 1017,
                "errMsg": "Sending OTP failed, Please enter valid phone number"
            }
            return callback(response);
        }
    });
}



// exports.sendsms = function (data, callback) {
//     client.messages.create({
//         to: data.toNumber,
//         from: config.twilio.TWILIO_NUMBER,
//         body: 'One Time Password for Jaiecom is ' + data.otp + ', Please use this password to login. '
//     }, function (error, message) {
//         if (!error) {
//             var response = {
//                 "errNum": 1016,
//                 "errMsg": "success"
//             }
//             return callback(response);
//         } else {
//             var response = {
//                 "errNum": 1017,
//                 "errMsg": "fail"
//             }
//             return callback(response);
//         }
//     });
// }