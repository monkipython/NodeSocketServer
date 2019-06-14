'use strict';

//================ Requiring JWT token, it defines a compact and self-contained way for securely transmitting information between parties as a JSON object ====================
var jwt = require('jsonwebtoken');
var privateKey = "BbZJjyoXAdr8BUZuiKKARWimKfrSmQ6fv8kZ7OFfc"

exports.jwtSign = function (id, callback) {


    console.log("inside jwtsign");  
    // CREATING UNIQUE TOKEN WITH EXPIRY TIME OF 60 DAYS
    var token = jwt.sign({ accountId: id }, privateKey, { expiresIn: '60 days' });
    return callback(null, token);

};

exports.jwtVerify = function (token) {


};