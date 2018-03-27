var Utility = require("./UtilityFunc");
var moment = require('moment');
var FCM = require('fcm-push');

module.exports = function (io, socket)
{

    //this  is  for  tracking provider by  customer
    socket.on('track', function (data) {
//        console.log("track Channel");
//        console.log(data);
        if (data.pid == "") {
            console.log("track pid Missing");
            socket.emit("track", {err: 1, msg: 'provider id Missing.'});
        } else
        {
            Utility.SelectOne('location', {user: parseInt(data.pid)}, function (err, item) {
                if (err) {
                    socket.emit("track", {flag: 1, msg: 'track Server Error 3'});
                } else {
                    if (item)
                    {
                        track = {'lt': item.location.latitude,
                            lg: item.location.longitude,
                            e: item.email, i: item.image, n: item.name,
                            pid: item.user, rat: item.rating,
                            d: item.dis};
                        socket.emit("track", {flag: 0, msg: track});
                    } else
                        socket.emit("track", {flag: 0, msg: 'provider not found'});
                }
            });
        }
    });


    //LIVE BOOKING START
    socket.on('LiveBooking', function (data) {
        var mandatoryArr = ['cid', 'bid', 'proid', 'dt', 'btype'];
        var missing = false;
        mandatoryArr.forEach(function (item) {
            if (Object.keys(data).indexOf(item) < 0) {
                missing = true;
            }
        });
        if (missing) {
            console.log("LiveBooking Mandatory Field Missing 1...");
            socket.emit("LiveBooking", {err: 1, msg: 'Mandatory Field Missing.'});
        } else
        {
            if (data.cid == '' || data.bid == '' || data.proid == '') {
                console.log("LiveBooking Mandatory Field Missing 2...");
                socket.emit("LiveBooking", {err: 1, msg: 'Mandatory Field Missing.'});
            } else {
                console.log("LiveBooking Called.");
                GetAppointmentData(data.bid, function (aerr, adata) {
                    if (aerr) {
                        console.log("Error In AppointMent Data");
                    } else {
                        GetProviderData(data.proid, function (ferr, pdata) {
                            if (ferr) {
                                console.log("Error In Provider Data");
                            } else {
                                if (pdata.booked == 1 || pdata.popup == 1) {
                                    socket.emit("LiveBooking", {err: 1, msg: 'Provider is Busy'});
                                    console.log("Now Provider Gone Busy");
                                } else {
                                    var popupetime = moment().unix() + 30;
                                    Utility.Update('location', {user: parseInt(data.proid)}, {popupetime: popupetime, popup: 1}, function (err, result) {
                                        if (err) {
                                            console.log("Error When Provider Make Busy...");
                                        } else {
                                            var BookingData = {
                                                cname: adata.customer.fname + ' ' + adata.customer.lname,
                                                bid: data.bid, cid: data.cid,
                                                pic: adata.customer.pic, email: adata.customer.email,
                                                ph: adata.customer.mobile,
                                                dt: adata.appt_created,
                                                lat: adata.appt_lat, long: adata.appt_long,
                                                catname: adata.cat_name,
                                                btype: data.btype,
                                                add: adata.address1
                                            };
                                            //start push
                                            try {
                                                send_booking_push({
                                                    push_token: pdata.push_token,
                                                    device_type: pdata.device_type,
                                                    BookingData: BookingData
                                                }, function (err, result) {
                                                    if (err) {
                                                        console.log(err.message);
                                                    } else {
                                                        console.log('push success');
                                                    }
                                                });
                                            } catch (exc) {
                                                console.log('SEND Bookign Push Exception');
                                            }
                                            //end push
                                            var b_sent_st = 0;
                                            try {
                                                io.sockets.connected[pdata.socket].emit("LiveBooking", BookingData);
                                                b_sent_st = 1;
                                            } catch (err) {
                                                b_sent_st = 0;
                                                console.log("Error Send Live Booking : " + err.message);
                                            }
                                            var status_msg = "Not Received";
                                            if (b_sent_st == 1) {
                                                status_msg = "Booking Received";
                                            }
                                            var btype = "With Dispatcher";
                                            var dtype = "ANDROID";
                                            if (adata.booking_type == '3')
                                                btype = "WithOut Dispatcher";
                                            if (adata.dtype == '2')
                                                dtype = "IOS";
                                            var DispatchData = {
                                                bid: data.bid,
                                                apntDate: adata.appt_created,
                                                cname: adata.customer.fname + ' ' + adata.customer.lname,
                                                pid: data.proid,
                                                pname: pdata.name,
                                                catname: adata.cat_name,
                                                btype: adata.booking_type,
                                                status: "you got new booking",
                                                bstatus: 102
                                            }
//                                            socket.broadcast.emit("LiveBookingClient", DispatchData);
                                            socket.emit("CustomerStatus", {errFlag: 0, errMsg: 'LiveBooking Sent to provider'});
                                            var bdata = {
                                                pid: (data.proid).toString(),
                                                name: pdata.name,
                                                email: pdata.email,
                                                mobile: pdata.mobile,
                                                sent_dt: data.dt,
                                                status_msg: status_msg,
                                                status: b_sent_st,
                                                res: 0
                                            };
                                            StoreAppointMentStatus(data.bid, bdata, function (serr, sres) {
                                                if (serr) {
                                                    console.log("store appt error");
                                                } else {
                                                }
                                            });
                                        }
                                    });
                                }
                            }
                            //end


                        });
                    }
                });
            }
        }
    });
    //END LIVE BOOKING


    //START Make Free Provider
    socket.on('makefree', function (data) {
        var mandatoryArr = ['proid'];
        var missing = false;
        mandatoryArr.forEach(function (item) {
            if (Object.keys(data).indexOf(item) < 0) {
                missing = true;
            }
        });
        if (missing) {
            console.log("Provider Id Missing");
            socket.emit("makefree", {err: 1, msg: 'Provider Id Field Missing.'});
        } else
        {
            if (data.proid == '') {
                console.log("Provider Id Missing");
                socket.emit("makefree", {err: 1, msg: 'Mandatory Field Missing.'});
            } else {
                Utility.Update('location', {user: parseInt(data.proid)}, {popup: 0}, function (err, result) {
                    if (err) {
                        console.log("Error When Provider Make Offline...");
                    } else {
                        socket.emit("makefree", {err: 0, msg: 'Updated Successfully...'});
                        console.log("makefree Done");
                    }
                });
            }
        }
    });
    //END MAKE FREE PROVIDER
}



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

function StoreAppointMentStatus(bid, data, callback)
{
    var acon = {'bid': bid.toString()};
    var acd = {'dispatched': data};
    Utility.UpdatePush('bookings', acon, acd, function (err, result) {
        if (err) {
            return callback(null, err);
        } else {
            return callback(null, result);
        }
    });
}


function send_booking_push(args, callback) {
    var push_token = args.push_token;
    var device_type = args.device_type;
    var payload = {bid: args.bid, btype: 2, status: args.status_msg, payload: args.status_msg};
    var fcm_server_key = "AAAAGg6-E8Y:APA91bHzt0nIdGbFpus0uYfdQHYBVrbZYMbChormW8xDjRoUaqDYXX6JErDmGsIdFQYselNfIGUO_yuIAd6jPogageDEK7eFszaDZt0xvB3BPaEtgZw47v-qMVEeK2mEEUbwJ3T8mQvQ";
    var fcm = new FCM(fcm_server_key);
    if (device_type == 1) {
        var messageSend = {payload: args.BookingData};
        var message = {
            to: push_token, // required fill with device token or topics
            collapse_key: 'your_collapse_key',
            priority: 'high',
            data: messageSend
        };
        message.notification = {
            title: "Booking",
            body: "You Got New Booking",
            sound: "default",
            bid: args.bid,
            cname: args.cname
        };
    } else if (device_type == 2) {
        var messageSend = {st: 2, payload: payload};
        var message = {
            to: push_token, // required fill with device token or topics
            collapse_key: 'your_collapse_key',
            priority: 'high',
            data: messageSend
        };
        message.data.title = "you got new booking";
        message.data.body = payload;
        message.data.sound = "default";
    }
    fcm.send(message, function (err, response) {
        if (err) {
            console.log(err);
            return callback(err);
        } else {
            return callback(null, response);
        }
    });
}