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


//PROVIDER SIGNUP API
module.exports.signup = function (request, reply) {
    async.waterfall(
        [
            function (firstCall) {
                request.payload.ent_password = md5(request.payload.ent_password);
                var Query = "select * from doctor where email = '" + request.payload.ent_email + "'";
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
                var Query = "select * from doctor where mobile = '" + request.payload.ent_mobile + "'";
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
                console.log("request.payload", request.payload);

                var Query = "insert into doctor(first_name,last_name,profile_pic,email,password,country_code,mobile,status,fees_group,city_id,created_dt,medical_license_num)value('" + request.payload.ent_first_name + "','" + request.payload.ent_last_name + "','" + request.payload.ent_profile_pic + "','" + request.payload.ent_email + "','" + request.payload.ent_password + "','" + request.payload.ent_country_code + "','" + request.payload.ent_mobile + "','1' , '" + request.payload.ent_fees_group + "','" + request.payload.ent_city_id + "','" + request.payload.ent_date_time + "','" + request.payload.ent_license + "')";
                mysqlDb.ExecuteQuery(Query, function (err, userdetails) {
                    if (err) {
                        console.log(err);
                    } else {
                        thirdCall(null);
                    }
                });
            }, function (forthCall) {
                var Query = "select * from doctor where email = '" + request.payload.ent_email + "'";
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
                console.log("category id list", request.payload.ent_cat_list);
                var catlistArr = [];
                var catArr = request.payload.ent_cat_list;
                // catArr.forEach(function (catid) {
                //     console.log("category id", catid);
                //     Mongo.SelectOne("Category", {'_id': new ObjectID(catid)}, function (err, categoryRes) {
                //         if (err) {
                //             console.log(err);
                //         } else {
                //             console.log("category response array", categoryRes);    
                //             console.log("category response", categoryRes['_id'].toString())
                //             catlistArr.push({
                //                 cid: categoryRes['_id'].toString(),
                //                 status: 0,
                //                 amount: categoryRes['price_min']
                //             });
                //            console.log("category array1", catlistArr); 
                //         }
                //     });
                // });

                async.each(catArr, function (catid, callback) {
                    console.log("catId", catid);
                    Mongo.SelectOne("Category", { '_id': new ObjectID(catid) }, function (err, categoryRes) {
                        if (err) {
                            console.log(err);
                        } else {
                            console.log("category response array", categoryRes);
                            console.log("category response", categoryRes['_id'].toString())
                            catlistArr.push({
                                cid: categoryRes['_id'].toString(),
                                status: 0,
                                amount: categoryRes['price_min']
                            });
                            console.log("category array1", catlistArr);
                            callback();
                        }
                    });
                }, function (err) {
                    console.log("category array2", catlistArr);
                    var mongoData = {
                        user: parseInt(userdetails['data'][0]['doc_id']),
                        name: request.payload.ent_first_name,
                        lname: request.payload.ent_last_name,
                        mobile: request.payload.ent_mobile,
                        location: {
                            longitude: parseFloat(request.payload.ent_long),
                            latitude: parseFloat(request.payload.ent_lat)
                        },
                        email: request.payload.ent_email,
                        fee_group: request.payload.ent_fees_group,
                        catlist: catlistArr,
                        catlist1: request.payload.ent_cat_list,
                        image: request.payload.ent_profile_pic,
                        login: 1,
                        status: 1,
                        rating: 0,
                        radius: 10,
                        Commission: 10,
                        accepted: 0,
                        later_status: 1,
                        booked: 0,
                        popup: 0
                    };
                    Mongo.Insert("location", mongoData, function (err, lastId) {
                        if (err) {
                            console.log(err);
                        } else {
                            fifthCall(userdetails);
                        }
                    });
                })
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

// CHECK MOBILE  API
module.exports.checkMobile = function (request, reply) {
    var Query = "select * from doctor where mobile = '" + request.params.ent_mobile + "'";
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

// CHECK EMAIL  API
module.exports.checkEmail = function (request, reply) {
    var Query = "select * from doctor where email = '" + request.params.ent_email + "'";
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

// CITY  API
module.exports.city = function (request, reply) {
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

            });
            reply(status.status(2, cityList));
        }
    });
}


module.exports.categoryByCity = function (request, reply) {
    //  {city_id: request.params.ent_city_id},
    // var condition = [{$project : {
    //        cat_name: { $toLower: "$cat_name" },
    //      }},{$sort : {cat_name : 1}}]
    //  Mongo.aggregate_("Category",condition, function (err, categoryRes) {
    //     if (err) {
    //         console.log(err);
    //     } else {
    //         var catList = [];
    //         categoryRes.forEach(function (cat) {
    //             catList.push({ 'city_id': cat['_id'], 'city_name': cat['cat_name'] });
    //         });
    //         reply(status.status(2, catList));
    //     }
    // });


    Mongo.SelectWithLimitSkipSort("Category", { 'city_id': request.params.ent_city_id }, 0, 0, { 'cat_name': 1 }, function (err, categoryRes) {
        if (err) {
            console.log(err);
        } else {
            var catList = [];
            categoryRes.forEach(function (cat) {
                catList.push({ 'city_id': cat['_id'], 'city_name': cat['cat_name'] });
            });
            reply(status.status(2, catList));
        }
    });


    // db.getCollection("Category")     

    // Mongo.Select("Category", { 'city_id': request.params.ent_city_id }, function (err, categoryRes) {
    //     if (err) {
    //         console.log(err);
    //     } else {
    //         var catList = [];
    //         categoryRes.forEach(function (cat) {
    //             catList.push({ 'city_id': cat['_id'], 'city_name': cat['cat_name'] });
    //         });
    //         reply(status.status(2, catList));
    //     }
    // });
}