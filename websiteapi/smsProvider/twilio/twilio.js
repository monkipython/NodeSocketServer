// var accountSid = 'AC2d4200d61270a58bdd9d12db08c7e69a'; // Your Account SID from www.twilio.com/console
// var authToken = '033ecd8df1b113d6fc4f987bb06672b9';   // Your Auth Token from www.twilio.com/console

// var twilio = require('twilio');
// var client = new twilio.RestClient(accountSid, authToken);


// var commonFunc = require('../commonFunction');
var messageFunc = require('./message');

// var client =require('twilio')(accountSid, authToken)
exports.sendSms = function (messageType, phoneNumber, callback) {
    console.log("selecting message type", messageType, phoneNumber);
    switch (messageType) {
        case 'otp':
            messageFunc.otp(phoneNumber, function (err, data) {
                console.log("data111", data);
                if(err){
                    return callback(null,err);
                }else{
                    return callback(null, data);
                }
            });
            break;
        default:
            console.log("failed to send message type");
    }
}
