var Utility = require("./UtilityFunc");
var ObjectId = require('mongodb').ObjectID;
var dispatcher = require("./dispatcher");
var FCM = require('fcm-push');
var moment = require('moment');

exports.respondToAppointment = function respondToAppointment(args, callback) {
    console.log("Provider Action BID : " + args.bid + " status : " + args.bstatus);
    var io = args.io;
    var socket = args.socket;
    var bstatus = args.bstatus;
    GetAppointmentData(args.bid, function (ferr, bookingData) {
        if (ferr) {
            console.log("Error In GetAppointmentData");
        } else {
            if (bstatus == 2) {
                dispatcher.removeBooking(bookingData.bid, args.proid);
            } else if (bstatus == 3) {
//                console.log("Provider Rejected  BID : " + args.bid);
//                dispatcher.rejectBooking(bookingData.bid);
            }
            var msg = "";
            switch (parseInt(bstatus)) {
                case 2:
                    msg = "Provider Accepted";
                    break;
                case 3:
                    msg = "Provider Rejected";
                    break;
                case 5:
                    msg = "Provider on the way";
                    break;
                case 21:
                    msg = "Provider has arrived!";
                    break;
                case 6:
                    msg = "Job Started!";
                    break;
                case 22:
                    msg = "Raised Invoice!";
                    break;
                case 7:
                    msg = "Job completed";
                    break;
                case 15:
                    msg = "Timer Started";
                    break;
                case 16:
                    msg = "Timer Paused";
                    break;
                case 10 :
                    msg = bookingData.cancel_reason;
                    break;
                default :
                    msg = "Status Not Available";
                    break;
            }
            var socketData = {
                bid: args.bid,
                apntDate: bookingData.appt_date,
                customerFName: bookingData.customer.fname,
                customerLName: bookingData.customer.lname,
                customerPhone: bookingData.customer.mobile,
                ProviderMobile: (typeof bookingData.provider == "undefined") ? "" : bookingData.provider.mobile,
                ProviderId: bookingData.provider_id,
                ProviderFName: bookingData.provider.fname,
                ProviderLName: bookingData.provider.lname,
                cat_name: bookingData.cat_name,
                booking_type: bookingData.booking_type,
                time: (typeof bookingData.time == "undefined") ? "" : bookingData.time,
                status: msg,
                st: bstatus,
                ent_total: bookingData.ent_total,
                bstatus: 102
            }
            bookingData.msg = msg;
            socket.broadcast.emit("LiveBookingClient", socketData);
            if (bstatus != 3)
                GetCustomerData(bookingData.customer.id, function (ferr, customerData) {
                    if (ferr) {
                        console.log("Error In GetCustomerData");
                    } else {
                        try {
                            io.sockets.connected[customerData.socket].emit("CustomerStatus", {
                                bid: bookingData.bid,
                                st: bstatus,
                                proid: args.proid,
                                dt: bookingData.appt_date,
                                alert: msg
                            });
                        } catch (err)
                        {
                            console.log("Error EMit On Customer Socket : " + err.message);
                        }
                    }
                });
        }
    });
};


exports.bookingCreated = function bookingCreated(args, callback) {
    var socket = args.socket;
    GetAppointmentData(args.bid, function (ferr, bookingData) {
        if (ferr) {
            console.log("Error In GetAppointmentData");
        } else {
            var socketData = {
                'bid': bookingData.bid,
                'status': "New Booking Created",
                'customerFName': bookingData.customer.fname,
                'customerLName': bookingData.customer.lname,
                'customerPhone': bookingData.customer.mobile,
                'customerEmail': bookingData.customer.email,
                'customerPic': bookingData.customer.pic,
                'customer_notes': bookingData.customer_notes,
                'time': (typeof bookingData.time == "undefined") ? "" : bookingData.time,
                'services': (typeof bookingData.services == "undefined") ? [] : bookingData.services,
                'cat_id': bookingData.cat_id,
                'cat_name': bookingData.cat_name,
                'apntDate': bookingData.appt_date,
                'address1': bookingData.address1,
                'address2': bookingData.address2,
                'appt_lat': bookingData.appt_lat,
                'appt_long': bookingData.appt_long,
                'st': bookingData.status,
                'booking_type': bookingData.booking_type,
                'ent_total': bookingData.ent_total,
                bstatus: 101
            }
            socket.broadcast.emit("LiveBookingClient", socketData);
        }
    });
};


exports.location = function location(args, callback) {
    var socket = args.socket;
    var bstatus = (typeof args.bstatus == "undefined") ? 103 : 104;
    GetProviderData(args.proId, function (ferr, proData) {
        if (ferr)
            console.log("Error In GetProviderData");
        else {
            if (proData)
            {
                if (proData.login == 2)
                    proData.status = 6;   //  6 =  logout
                if (proData.status == 5)
                    proData.status = 5;
                if (proData.booked == 1)
                    proData.status = 5;   //  5 =  busy                
                var socketData = {
                    '_id': proData._id.toString(),
                    'mas_id': proData.user,
                    'lat': proData.location.latitude,
                    'long': proData.location.longitude,
                    'image': proData.image,
                    'status': proData.status,
                    'booked': proData.booked,
                    'email': proData.email,
                    'lasttime': (typeof proData.lastUpdated == 'undefined') ? "" : proData.lastUpdated,
                    'LastOnline': moment().unix() - proData.lastUpdated,
                    'serverTime': moment().unix(),
                    'name': (typeof proData.name == 'undefined') ? "" : proData.name + " " + proData.lname,
                    'PhoneVersion': (typeof proData.app_version == 'undefined') ? "" : proData.app_version,
                    'batPer': (typeof proData.battery_Per == 'undefined') ? "" : proData.battery_Per,
                    'phone': (typeof proData.mobile == 'undefined') ? "" : proData.mobile,
                    'locationChk': (typeof proData.location_check == 'undefined') ? "" : proData.location_check,
                    'DeviceType': (typeof proData.Device_type_ == 'undefined') ? "" : proData.Device_type_,
                    bstatus: bstatus
                }
                socket.broadcast.emit("locationChn", socketData);
            } else {
                console.log("Error In GetProviderData");
            }
        }
    });
};

exports.unassignedBookingFromDispatcher = function unassignedBookingFromDispatcher(args, callback) {
    var bid_proid = args.bid_proid.split("_");
    var bid = bid_proid[0];
    var proid = bid_proid[1];
    console.log("Dispatcher Action BID_PROID : " + args.bid_proid);
    var io = args.io;
    GetAppointmentData(bid, function (ferr, bookingData) {
        if (ferr) {
            console.log("Error In GetAppointmentData");
        } else {
            GetCustomerData(bookingData.customer.id, function (ferr, customerData) {
                if (ferr)
                    return console.log("Error In GetCustomerData");
                try {
                    io.sockets.connected[customerData.socket].emit("CustomerStatus", {
                        bid: bookingData.bid,
                        a: 5,
                        alert: "your booking has been  unassigned from Dispatcher"
                    });
                } catch (err)
                {
                    console.log("Error EMit On Customer Socket : " + err.message);
                }
            });
            GetProviderData(proid, function (ferr, proData) {
                if (ferr)
                    return console.log("Error In GetProviderData");
                try {
                    io.sockets.connected[proData.socket].emit("LiveBooking", {
                        bid: bookingData.bid,
                        a: 5,
                        alert: "your booking has been  unassigned from Dispatcher"
                    });
                } catch (err)
                {
                    console.log("Error EMit On Customer Socket : " + err.message);
                }
            });
        }
    });
};

function GetAppointmentData(bid, callback)
{
    Utility.SelectOne('bookings', {bid: bid.toString()}, function (err, apptData) {
        if (err) {
            return callback(null, err);
        } else {
            return callback(null, apptData);
        }
    });
}


function GetCustomerData(cid, callback)
{
    var QueryObj = {cid: parseInt(cid)};
    Utility.SelectOne('customer', QueryObj, function (err, result) {
        if (err) {
            return callback(null, err);
        } else {
            return callback(null, result);
        }
    });
}

function GetProviderData(proid, callback)
{
    var QueryObj = {user: parseInt(proid)};
    Utility.SelectOne('location', QueryObj, function (err, result) {
        if (err) {
            return callback(null, err);
        } else {
            return callback(null, result);
        }
    });
}

function GetSlotDetails(slot_id, callback)
{
    var QueryObj = {_id: new ObjectId(slot_id)};
    Utility.SelectOne('slotbooking', QueryObj, function (err, result) {
        if (err) {
            return callback(null, err);
        } else {
            return callback(null, result);
        }
    });
}


exports.cancelByCustomer = function cancelByCustomer(args, callback) {
//    console.log("Customer Canceled : " + args.bid);
    var io = args.io;
    GetAppointmentData(args.bid, function (aerr, adata) {
        if (aerr) {
            console.log("Error In AppointMent Data");
        } else {
            GetProviderData(adata.provider_id, function (ferr, pdata) {
                if (ferr) {
                    console.log("Error In Provider Data");
                } else {
                    var CancelData = {
                        cname: adata.customer.fname,
                        bid: args.bid,
                        dt: adata.appt_created,
                        can_reason: adata.cancel_reason,
                        btype: 4
                    };
                    try {
                        io.sockets.connected[pdata.socket].emit("LiveBooking", CancelData);
                    } catch (err) {
                        console.log("Error Cancel Booking : " + err.message);
                    }
                }
            });

        }
    });
};

exports.laterBookingByCustomer = function laterBookingByCustomer(args, callback) {
    console.log("laterBookingByCustomer : " + args.bid);
    var io = args.io;
    GetAppointmentData(args.bid, function (aerr, adata) {
        if (aerr) {
            console.log("Error In LaterBooking AppointMent Data");
        } else {
            GetProviderData(adata.provider_id, function (ferr, pdata) {
                if (ferr) {
                    console.log("Error In Provider Data");
                } else {
                    GetSlotDetails(adata.slot_id, function (ferr, slotdata) {
                        if (ferr) {
                            console.log("Error In Slot Data");
                        } else {
                            var BookingData = {
                                cname: adata.customer.fname + ' ' + adata.customer.lname,
                                bid: adata.bid, cid: adata.customer.cid,
                                pic: adata.customer.pic, email: adata.customer.email,
                                ph: adata.customer.mobile,
                                dt: adata.appt_created,
                                lat: adata.appt_lat, long: adata.appt_long,
                                catname: adata.cat_name,
                                btype: 2,
                                add: adata.address1,
                                stime: slotdata.start,
                                etime: slotdata.end
                            };
                            try {
                                io.sockets.connected[pdata.socket].emit("LiveBooking", BookingData);
                            } catch (err) {
                                console.log("Error Send Booking : " + err.message);
                            }
                        }
                    });
                }
            });
        }
    });
};
