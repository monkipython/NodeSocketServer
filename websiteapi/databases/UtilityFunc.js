var Utility = module.exports = {};

var config = require('../config/config.json');
var MongoClient = require('mongodb').MongoClient
        , assert = require('assert');
var url = config.url;
var db;
MongoClient.connect(url, function (err, connDB) {
    if (err) {
        console.log('Unable to connect to the mongoDB server. Error:', err);
    } else {
        db = connDB;
    }
});

/**Insert function is use to insert parameters to database.
 * It's a generic function, tablename is use for Tablename in the db.
 * data is array to insert documents in table.
 * if inserted then go callback function else error.
 * **/
Utility.Insert = function (tablename, data, callback) {
    //conn.DbConnection(function (result) {
    //    var db = result;
    var collection = db.collection(tablename);

    collection.insert([data], function (err, result) {
        if (err) {
            console.log(err);
        } else {
            return callback(null, "data Inserted SucessFully");
        }

    });
    //});
};


/**Select function is use to fetch data from database.
 * It's a generic function, tablename is use for Tablename in the db.
 * data is array to provide where condition in table.
 * if success then go callback function else error.
 * Result is use to store all data resulted from select function.
 * **/
Utility.Select = function (tablename, data, callback) {
    var collection = db.collection(tablename);
    collection.find(data).toArray(function (err, result) {
        if (err) {
            console.log(err);
        } else {
            return callback(null, result);
        }
    });
}


/**Select function is use to fetch data from database.
 * It's a generic function, tablename is use for Tablename in the db.
 * data is array to provide where condition in table.
 * if success then go callback function else error.
 * Result is use to store all data resulted from select function.
 * **/
Utility.SelectWithProject = function (tablename, data,project, callback) {
    var collection = db.collection(tablename);
    collection.find(data,project).toArray(function (err, result) {
        if (err) {
            console.log(err);
        } else {
            return callback(null, result);
        }
    });
}

// select with paging,limits and sorting

Utility.SelectWithLimitSkipSort = function (tablename, data, limit,skip,sort, callback) {
    //conn.DbConnection(function (result) {
    //    var db = result;
    var collection = db.collection(tablename);

    collection.find(data).limit(limit).skip(skip).sort(sort).toArray(function (err, result) {
        if (err) {
            console.log(err);
        } else {
            return callback(null, result);
        }
    });
    //});
}


Utility.SelectWIthLimitAndIndex = function (tablename,sort_by, data, pagelimt, callback) {
    //conn.DbConnection(function (result) {
    //    var db = result;
    var collection = db.collection(tablename);

    collection.find(data).sort(sort_by).limit(11).skip(parseInt(pagelimt)).toArray(function (err, result) {
        if (err) {
            console.log(err);
        } else {
            return callback(null, result);
        }
    });
    //});
}

/*
 * 
 * @param {type} tablename
 * @param {type} data
 * @param {type} callback
 * @returns {undefined} 
 * get lastId
 */
Utility.getLastIdInCollection = function (tablename, select_field, sort_by, callback) {
    var collection = db.collection(tablename);
    collection.find({}, select_field).sort(sort_by).limit(1).toArray(function (err, result) {
        if (err) {
            console.log(err);
        } else {
            return callback(null, result);
        }
    });
}



Utility.SelectWithProjection = function (tablename, data, projection, callback) {
    var collection = db.collection(tablename);

    collection.find(data, projection).toArray(function (err, result) {
        if (err) {
            callback(err);
        } else {
            return callback(null, result);
        }
    });
}



Utility.Count = function (tablename, condition, callback) {

    var collection = db.collection(tablename);
    collection.count(condition, function (err, count) {
        if (err) {
            callback(err);
        } else {
            return callback(null, count);
        }
    });
};


/**Select function is use to fetch data from database.
 * It's a generic function, tablename is use for Tablename in the db.
 * data is array to provide where condition in table.
 * if success then go callback function else error.
 * Result is use to store all data resulted from select function.
 * **/
Utility.SelectWithLimit = function (tablename, data, limit, skipCount, callback) {
    //conn.DbConnection(function (result) {
    //    var db = result;
    var collection = db.collection(tablename);

    collection.find(data).limit(limit).skip(skipCount).toArray(function (err, result) {
        if (err) {
            console.log(err);
        } else {
            return callback(null, result);
        }
    });
    //});
}


/**SelectOne function is use to fetch data from database but fetch only one row from table.
 * It's a generic function, tablename is use for Tablename in the db.
 * data is array to provide where condition in table.
 * if success then go callback function else error.
 * Result is use to store all data resulted from select function.
 * **/
Utility.SelectOne = function (tablename, data, callback) {
    //conn.DbConnection(function (result) {
    //    var db = result;
    var collection = db.collection(tablename);

    collection.findOne(data, (function (err, result) {
        if (err) {
            console.log(err);
        } else {
            return callback(null, result);
        }

    }));
    //});
}


Utility.SelectOR = function (tablename, data1, data2, callback) {
    //conn.DbConnection(function (result) {
    //    var db = result;
    var collection = db.collection(tablename);
    collection.findOne({$or: [data1, data2]}, (function (err, result) {
        if (err) {
            console.log(err);
        } else {
            //console.log(result);
            return callback(null, result);
        }

    }));
    //});
}


/**Update function is use to Update parameters to database.
 * It's a generic function, tablename is use for Tablename in the db.
 * data is array to Update documents in table.
 * if Updated then go callback function else error.
 * **/
Utility.Update = function (tablename, condition, data, callback) {
    //conn.DbConnection(function (result) {
    //    var db = result;
    var collection = db.collection(tablename);
    collection.update(condition, {$set: data}, (function (err, result) {
        if (err) {
            console.log(err);
        } else {
            //console.log(result);
            return callback(null, result);
        }

    }));
    //});
}


/**Update function is use to Update parameters to database.
 * It's a generic function, tablename is use for Tablename in the db.
 * data is array to Update documents in table.
 * if Updated then go callback function else error.
 * **/
Utility.UpdatePush = function (tablename, condition, data, callback) {
    var collection = db.collection(tablename);
    collection.update(condition, {$push: data}, (function (err, result) {
        if (err) {
            console.log(err);
        } else {
            return callback(null, result);
        }
    }));
}


/**Update function is use to Update parameters to database.
 * It's a generic function, tablename is use for Tablename in the db.
 * data is array to Update documents in table.
 * if Updated then go callback function else error.
 * **/
Utility.UpdatePull = function (tablename, condition, data, callback) {
    //conn.DbConnection(function (result) {
    //    var db = result;
    var collection = db.collection(tablename);
    collection.update(condition, {$pull: data}, (function (err, result) {
        if (err) {
            console.log(err);
        } else {
            return callback(null, result);
        }

    }));
    //});
}


Utility.UpdateField = function (tablename, condition, data, callback) {
    //conn.DbConnection(function (result) {
    //    var db = result;
    var collection = db.collection(tablename);
    collection.update(condition, {$pull: data}, (function (err, result) {
        if (err) {
            console.log(err);
        } else {
            //console.log(result);
            return callback(null, result);
        }

    }));
    //});

};


Utility.UpdateArray = function (tablename, condition, data, callback) {
    var collection = db.collection(tablename);
    collection.update(condition, {$addToSet: data}, (function (err, result) {
        if (err) {
            console.log(err);
        } else {
            return callback(null, result);
        }
    }));
};


/**This function is use to delete parameters to database.
 * It's a generic function, tablename is use for Tablename in the db.
 * data is array to give the condition.
 * if deleted then go callback function else error.
 * **/
Utility.Delete = function (tablename, condition, callback) {
    //conn.DbConnection(function (result) {
    //    var db = result;
    var collection = db.collection(tablename);
    collection.remove(condition, function (err, numberOfRemovedDocs) {
        if (err) {
            console.log(err);
        } else {
            //console.log(numberOfRemovedDocs);
            return callback(null, numberOfRemovedDocs);
        }
        //assert.equal(null, err);
        //assert.equal(1, numberOfRemovedDocs);
        //db.close();
    });
    //});
};


Utility.GeoNear = function (tablename, condition, location, callback) {
    console.log("$$$$$$", JSON.stringify(condition));
    console.log(tablename);
    console.log(location);
    console.log(condition);
    db.command({
        geoNear: tablename,
        near: {
            longitude: parseFloat(location.lng),
            latitude: parseFloat(location.lat)
        },
        spherical: true,
        maxDistance: 50000 / 6378137,
        distanceMultiplier: 6378137,
        query: condition
    }, function (err, geoResult) {
        if (err) {
            console.log(err);
        } else {
            console.log("georesult");
            return callback(null, geoResult);
        }
    });
};


/*Function to find the documents in a given radious
 * name the distance field and sort the result  */
Utility.GeoNearAggregate = function (tablename, condition, location, callback) {
    var collection = db.collection(tablename);
    collection.aggregate([{
            $geoNear: {
                near: {
                    longitude: parseFloat(location.lng),
                    latitude: parseFloat(location.lat)
                },
                spherical: true,
                distanceField: "distance",
                maxDistance: 10000 / 6378137,
                distanceMultiplier: 6378137,
                query: condition
            }
        }, {
            "$sort": {"distance": 1}
        }], function (geoErr, geoResult) {
        if (geoErr) {
            console.log(geoErr);
        } else {
            return callback(null, geoResult);
        }
    });
};


/*Function to find the documents in a given radious
 * name the distance field and sort according to the result sortQuery  */
Utility.GeoNearAggregateSortQuery = function (tablename, condition, location,sortQuery, callback) {
    var collection = db.collection(tablename);
    collection.aggregate([{
            $geoNear: {
                near: {
                    longitude: parseFloat(location.lng),
                    latitude: parseFloat(location.lat)
                },
                spherical: true,
                distanceField: "distance",
                maxDistance: 10000 / 6378137,
                distanceMultiplier: 6378137,
                query: condition
            }
        }, {
            "$sort": sortQuery
        }], function (geoErr, geoResult) {
        if (geoErr) {
            console.log(geoErr);
        } else {
            return callback(null, geoResult);
        }
    });
};


Utility.count = function (tablename, data, callback) {
    var collection = db.collection(tablename);

    collection.count(data, function (err, numrow) {
        if (err) {
            console.log(err);
        } else {
            return callback(null, numrow);
        }
    });
}


Utility.UpdateUnset = function (tablename, condition, data, callback) {
    var collection = db.collection(tablename);
    collection.update(condition, {$unset: data}, {multi: true}, (function (err, result) {
        if (err) {
            console.log(err);
        } else {
            return callback(null, result);
        }
    }));
};

Utility.aggregate_ = function (tablename, condition, callback) {
    var collection = db.collection(tablename);
    collection.aggregate(condition, (function (err, result) {
        if (err) {
            console.log(err);
        } else {
            return callback(null, result);
        }
    }));
};





