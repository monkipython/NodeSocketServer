var Utility = module.exports = {};
var config = require('../config/config.json');

var mysql = require('mysql');

var connection = mysql.createConnection({
    host: config.MYSQL_HOST,
    user: config.MYSQL_USER,
    password: config.MYSQL_PASS,
    database: config.MYSQL_DB
});

//module.exports = {
//    connection: connection
//}

Utility.checkSessions = function (sessionToken, usertype, deviceId, callback) {
    var Qry = "select  us.oid, us.expiry, us.device, us.type, us.loggedIn, us.sid as entityId,pat.first_name as firstName,pat.last_name,pat.profile_pic,pat.email,pat.stripe_id,pat.phone  as mobile,pat.status from user_sessions us, patient pat where us.oid = pat.patient_id and us.token = '" + sessionToken + "' and us.device = '" + deviceId + "' and us.user_type = '" + usertype + "'";
//    console.log(Qry);
    connection.query(Qry, function (error, results) {
        if (error)
            console.log(error);
        if (results.length > 0) {

            callback(null, {flag: 0, result: results});
        } else {
//            console.log(results);
            callback(null, {flag: 1});
        }
    });
};
Utility.getEntityDetails = function (id, usertype, callback) {
    var Qry = "";
    if (usertype == 1)
        Qry = "select  doc_id as id,first_name,last_name,email,status,country_code, mobile,profile_pic,stripe_id from doctor where doc_id = '" + id + "'";
    else if (usertype == 2)
        Qry = "select  patient_id as id,first_name,last_name,email,status,country_code, phone as mobile,profile_pic,stripe_id from patient_id where patient_id = '" + id + "'";
    else
        callback(null, {flag: 1});

    connection.query(Qry, function (error, results) {
        if (error)
            console.log(error);
        if (results.length > 0) {

            callback(null, {flag: 0, result: results});
        } else {
            callback(null, {flag: 1});
        }
    });
};

Utility.ExecuteQuery = function (Query, callback) {
    connection.query(Query, function (error, results) {
        if (error)
            console.log(error);
        if (results.length > 0) {
            callback(null, {flag: 0, data: results});
        } else {
            callback(null, {flag: 1});
        }
    });

};