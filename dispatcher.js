// If  Retry ==  0  then this  Perticular Booking  alreary  showing  POPUP  in any  one Provider APP

// so  dont do  anything  with   this booking and  just return  control  from  there.

// IF  Flag  ==   1  then  that  Booking  comming  FROM CRON JOB else  comming  From App side(First Time Booking)

// If SendNew == 1 then SomeOne Reject So send Booking To Another Provider 

var Utility = require("./UtilityFunc");
var moment = require('moment');
var FCM = require('fcm-push');
var request = require('request');
var ObjectID = require('mongodb').ObjectID;


// Default Second Set Here
global.ProviderQueue = [];
var booking_seconds = 10000;
var booking_seconds_later = 10000;
var pro_wait_seconds_now = 120;
var pro_wait_seconds_later = 120;
var redis = require('redis');
var client = redis.createClient(6379, 'localhost');
client.auth('f4r2kiud!');
var io;
var Application = module.exports = function (redisClient, io_local)
{
//    client = redisClient;
    io = io_local;
}

Application.LaterBooking = function (io, bid) {
    Utility.SelectOne('bookings', {bid: bid.toString()}, function (err, booking) {
        if (err) {
            console.log('Error 1');
        } else {
            Utility.SelectOne('location', {user: parseInt(booking.provider_id)}, function (err, provider) {
                if (err) {
                    console.log(err);
                } else if (provider) {
                    sendLaterBooking(io, booking, provider);
                }
            });
        }
    });
}

Application.LiveBooking = function (io, bid, proid, flg) {
    Utility.SelectOne('bookings', {bid: bid.toString()}, function (err, booking) {
        if (err) {
            console.log('Error 1');
        } else {
            var prolist = [];
            var gl_farncatprolist = [];
            //Get Booking From Redis
            client.hgetall(bid, function (err, object) {
                if (object == null) {
                    client.hmset(bid, 'prolist', proid, 'farncatprolist', "", 'flag', 0, 'btype', booking.booking_type, 'expire_time', booking.appt_expire);
                    if (proid != "") {
                        prolist.push(parseInt(proid));
                    }
                } else {
                    if (flg == 1) {
                        if (object.retry == 0) {
                            return;
                        }
                    }
                    if (proid != "")
                        prolist.push(parseInt(proid));
                    var prostr = object.prolist;

                    if (prostr != "") {
                        var proarr1 = prostr.split(",");
                        var result = proarr1.map(function (x) {
                            return parseInt(x, 10);
                        });
                        if (result.indexOf(parseInt(proid)) !== -1) {
                            return;
                        }
                        prolist = prolist.concat(result);
                    }
                    var prolateststr = prolist.join(",");
                    console.log("BID : " + bid + " BTYPE : " + booking.booking_type + " Sent :  " + prolateststr);
                    client.hmset(bid, 'prolist', prolateststr);

                    if (object.farncatprolist == "")
                    {
                        gl_farncatprolist = [];
                    } else {
                        gl_farncatprolist = object.farncatprolist.split(",");
                    }

                }
                var loc = {lat: booking.appt_lat, lng: booking.appt_long};
//              Find Neares Provider 
                var farncatprolist_prolist = prolist.concat(gl_farncatprolist);
                var farncatprolist_prolist_int = farncatprolist_prolist.map(function (x) {
                    return parseInt(x, 10);
                });

                var cond = {status: {$in: [3, 5]}, user: {$nin: farncatprolist_prolist_int}, booked: 0};
                Utility.GeoNear('location', cond, loc, function (err, res) {
                    if (err) {
                        console.log("Error 3");
                    } else {
                        console.log("Now Online Pro : " + res.results.length);
                        if (res.results.length > 0) {
                            var item = res.results[0];
                            var doc = item.obj;
                            var dist_mile = parseFloat(item.dis) / 1608;
                            doc.radius = parseFloat(doc.radius);

                            var catListArr = [];
                            var catListOb = doc.catlist;
                            if (typeof catListOb === 'object') {
                                catListOb.forEach(function (catr) {
                                    catListArr.push(catr.cid);
                                });
                            }
                            var isCategoryAccepted = 0;
                            if (catListArr.indexOf(String(booking.cat_id)) > -1) {
                                catListOb.forEach(function (catr) {
                                    if (catr.cid == booking.cat_id && catr.status == 1) {
                                        isCategoryAccepted = 1;
                                    }
                                });
                            }

                            if (dist_mile <= doc.radius && isCategoryAccepted == 1 && global.ProviderQueue.indexOf(doc.user) === -1)
                            {
                                global.ProviderQueue.push(doc.user);
                                doc.slotid = "0";
                                client.hmset(bid, 'prolist', prolist.join(","), 'retry', 0, 'sendNew', 0);
                                GetBookingConfigration(function (cerr, cres) {
                                    if (cerr) {
                                        console.log("makeProviderBusy error");
                                    }
                                    sendNowBooking(io, booking, doc);
                                });
                                client.hgetall(bid, function (err, object) {
                                    if (object.farncatprolist != "" && object.farncatprolist) {
                                        client.hmset(bid, 'farncatprolist', "");
                                    }
                                });
                            } else {
                                var farncatprolist = [];
                                farncatprolist.push(doc.user);
                                client.hmset(bid, 'farncatprolist', farncatprolist.join(","));
                                console.log(doc.email + "==  FAR  == NOT In Category == POPUP");
                                client.hmset(bid, 'prolist', prolist.join(","), 'flag', 1, 'retry', 1);
                                Application.LiveBooking(io, bid, doc.user);
                            }
                        } else {
                            client.hgetall(bid, function (err, object) {
                                if (object.flag == 0) {
//                                    First Time No Provider Found For This Booking
                                    //YOu can Notify Here
                                    console.log('First Time No Pro Found');
                                }
                            });
//                          console.log('No driver Found....');
//                            client.hmset(bid, 'prolist', prolist.join(","), 'flag', 1, 'retry', 1);     
                            client.hmset(bid, 'prolist', prolist.join(","), 'farncatprolist', '', 'flag', 1, 'retry', 1);
                            return;
                        }
                    }
                });
            });
        }
    });
}

// Send Booking To Provider
function sendNowBooking(io, adata, pdata) {
    // send Booking TO Provider
    var currTime = moment.unix(moment().utc().format('X')).format("YYYY-MM-DD HH:MM:SS");
    var wait_seconds;
    var pro_wait_seconds;
    if (adata.booking_type == 2) {
        wait_seconds = booking_seconds_later;
        pro_wait_seconds = pro_wait_seconds_later;
    } else {
        wait_seconds = booking_seconds;
        pro_wait_seconds = pro_wait_seconds_now;
    }
    var BookingData = {
        cname: adata.customer.fname + ' ' + adata.customer.lname,
        bid: adata.bid,
        cust_job_start: adata.cust_job_start,
        cust_job_end: adata.cust_job_end,
        cust_job_minut_amt: adata.cust_total,
        cid: adata.customer.id,
        pic: adata.customer.pic,
        email: adata.customer.email,
        ph: adata.customer.mobile,
        dt: adata.appt_created,
        lat: adata.appt_lat,
        long: adata.appt_long,
        catname: adata.cat_name,
        btype: adata.booking_type,
        add: adata.address1,
        address2: adata.address2,
        wait_seconds: pro_wait_seconds
    };
    var b_sent_st = 0;
    try {
        console.log(' ******* Booking sent To : ' + pdata.email + " : " + adata.bid);
        io.sockets.connected[pdata.socket].emit("LiveBooking", BookingData);
        b_sent_st = 1;
    } catch (err) {
        b_sent_st = 0;
        console.log("Provider Socket :  " + pdata.socket);
        console.log("Error Send Booking : " + err.message);
    }
    //start push
    try {
        send_booking_push({
            push_token: pdata.push_token,
            device_type: pdata.device_type,
            title_msg: "You Got New Booking",
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


    var status_msg = "Not Received";
    if (b_sent_st == 1) {
        status_msg = "Booking Ignored";
        makeProviderBusy(pdata.user, function (serr, sres) {
            if (serr) {
                console.log("makeProviderBusy error");
            }
        });
    }
    var DispatchData = {
        bid: adata.bid,
        apntDate: adata.appt_date,
        customerFName: adata.customer.fname,
        customerLName: adata.customer.lname,
        customerPhone: adata.customer.mobile,
        ProviderMobile: (typeof adata.provider == "undefined") ? "" : adata.provider.mobile,                        
        ProviderId: pdata.user,
        ProviderFName: pdata.name,
        ProviderLName: pdata.lname,
        cat_name: adata.cat_name,
        booking_type: adata.booking_type,
        time: (typeof adata.time == "undefined") ? "" : adata.time,
        status: "you got new booking",
        'ent_total': adata.ent_total,
        st: '',
        bstatus: 101
    }
    io.sockets.emit("LiveBookingClient", DispatchData);
    // store appointment status
    var bdata = {
        pid: (pdata.user).toString(),
        name: pdata.name,
        email: pdata.email,
        mobile: pdata.mobile,
        sent_dt: currTime,
        status_msg: status_msg,
        status: b_sent_st,
        res: 0
    };
    StoreAppointMentStatus(adata.bid, bdata, pdata.slotid, function (serr, sres) {
        if (serr) {
            console.log("store appt error");
        } else {
//            console.log("Booking data stored success");
        }
    });

    var counter = 1;
    setTimeout(function wait_me() {
        client.hgetall(adata.bid, function (err, object) {
            if (object == null) {
                return;
            } else {
                if (object.sendNew == '1') {
                    // SomeOne Reject So send Booking To Another Provider

                    var index = global.ProviderQueue.indexOf(pdata.user);
                    if (index != -1)
                        global.ProviderQueue.splice(index, 1);
                    makeProviderFree(pdata.user, function (serr, sres) {
                        if (serr) {
                            console.log("store appt error");
                        } else {
                            if (object.btype == 2) {
                                Application.LaterBooking(io, adata.bid, pdata.user);
                            } else {
                                Application.LiveBooking(io, adata.bid, pdata.user);
                            }
                        }
                    });
                } else {
                    if (counter == 12) {
                        // SomeOne Ignored Nooking So send Booking To Another Provider
                        var index = global.ProviderQueue.indexOf(pdata.user);
                        if (index != -1)
                            global.ProviderQueue.splice(index, 1);

                        console.log(pdata.user + " Ignored Booking So send Booking To Next Provider");
                        makeProviderFree(pdata.user, function (serr, sres) {
                            if (serr) {
                                console.log("store appt error");
                            } else {
                                if (object.btype == 2) {
                                    Application.LaterBooking(io, adata.bid, pdata.user);
                                } else {
                                    Application.LiveBooking(io, adata.bid, pdata.user);
                                }
                            }
                        });
                    } else {
                        counter++;
                        // Still Not Respond So Wait Some More Time
                        console.log(pdata.user + " Still Not Respond for BID : " + adata.bid);
                        setTimeout(wait_me, wait_seconds);
                    }
                }
            }
        });
    }, wait_seconds);
}



// Send Booking To Provider
function sendLaterBooking(io, adata, pdata) {
    // send Booking TO Provider
    var currTime = moment.unix(moment().utc().format('X')).format("YYYY-MM-DD HH:MM:SS");
    var BookingData = {
        cname: adata.customer.fname + ' ' + adata.customer.lname,
        bid: adata.bid,
        cust_job_start: adata.cust_job_start,
        cust_job_end: adata.cust_job_end,
        cust_job_minut_amt: adata.cust_total,
        cid: adata.customer.id,
        pic: adata.customer.pic,
        email: adata.customer.email,
        ph: adata.customer.mobile,
        dt: adata.appt_created,
        lat: adata.appt_lat,
        long: adata.appt_long,
        catname: adata.cat_name,
        btype: adata.booking_type,
        add: adata.address1,
        address2: adata.address2
    };
    var b_sent_st = 0;
    try {
        console.log(' ******* Booking sent To : ' + pdata.email + " : " + adata.bid);
        io.sockets.connected[pdata.socket].emit("LiveBooking", BookingData);
        b_sent_st = 1;
    } catch (err) {
        b_sent_st = 0;
        console.log("Provider Socket :  " + pdata.socket);
        console.log("Error Send Booking : " + err.message);
    }
    //start push
    try {
        send_booking_push({
            push_token: pdata.push_token,
            device_type: pdata.device_type,
            title_msg: "You Got New Later Booking",
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

    var status_msg = "Received";
    var DispatchData = {
        bid: adata.bid,
        apntDate: adata.appt_date,
        customerFName: adata.customer.fname,
        customerLName: adata.customer.lname,
        customerPhone: adata.customer.mobile,
        ProviderMobile: (typeof adata.provider == "undefined") ? "" : adata.provider.mobile,               
        ProviderId: pdata.user,
        ProviderFName: pdata.name,
        ProviderLName: pdata.lname,
        cat_name: adata.cat_name,
        booking_type: adata.booking_type,
        time: (typeof adata.time == "undefined") ? "" : adata.time,
        status: "you got new booking",
        'ent_total': adata.ent_total,
        st: '',
        bstatus: 101
    }
    io.sockets.emit("LiveBookingClient", DispatchData);
    // store appointment status
    var bdata = {
        pid: (pdata.user).toString(),
        name: pdata.name,
        email: pdata.email,
        mobile: pdata.mobile,
        sent_dt: currTime,
        status_msg: status_msg,
        status: b_sent_st,
        res: 0
    };
    StoreAppointMentStatus(adata.bid, bdata, pdata.slotid, function (serr, sres) {
        if (serr) {
            console.log("StoreAppointMentStatus error");
        } else {
        }
    });
    var providerData = {
        id: parseInt(pdata.user),
        fname: pdata.name,
        lname: pdata.lname,
        pic: pdata.image,
        email: pdata.email,
        mobile: pdata.mobile
    };
    updateAsConfirmBooking(adata, providerData, function (serr, sres) {
        if (serr) {
            console.log("updateBooking error");
        } else {
        }
    });
}


// Send Booking To Provider
function BookingFromDispatcher(io, adata, pdata) {
    var currTime = moment.unix(moment().utc().format('X')).format("YYYY-MM-DD HH:MM:SS");
    var BookingData = {
        cname: adata.customer.fname + ' ' + adata.customer.lname,
        bid: adata.bid,
        cid: adata.customer.id,
        pic: adata.customer.pic,
        email: adata.customer.email,
        ph: adata.customer.mobile,
        dt: adata.appt_created,
        lat: adata.appt_lat,
        long: adata.appt_long,
        catname: adata.cat_name,
//        btype: adata.booking_type,
        btype: adata.disp_status,
        add: adata.address1,
        address2: adata.address2
    };
    var b_sent_st = 0;
    try {
        console.log(' ******* Booking sent To : ' + pdata.email + " : " + adata.bid);
        io.sockets.connected[pdata.socket].emit("LiveBooking", BookingData);
        b_sent_st = 1;
    } catch (err) {
        b_sent_st = 0;
        console.log("Error Send Booking : " + err.message);
    }
    //start push
    try {
        send_booking_push({
            push_token: pdata.push_token,
            device_type: pdata.device_type,
            title_msg: "You Got New Booking",
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

    var status_msg = "Received";
    var bstatus = 101;
    var st = 1;
    var msg = "you got new booking";
    if (adata.disp_status == 2)
    {
        bstatus = 102;
        st = 2;
        msg = "Provider accepted booking";
    }
    var DispatchData = {
        bid: adata.bid,
        apntDate: adata.appt_date,
        customerFName: adata.customer.fname,
        customerLName: adata.customer.lname,
        customerPhone: adata.customer.mobile,
        ProviderMobile: (typeof adata.provider == "undefined") ? "" : adata.provider.mobile,       
        ProviderId: pdata.user,
        ProviderFName: pdata.name,
        ProviderLName: pdata.lname,
        cat_name: adata.cat_name,
        booking_type: adata.booking_type,
        time: (typeof adata.time == "undefined") ? "" : adata.time,
        status: msg,
        ent_total: adata.ent_total,
        st: st,
        bstatus: bstatus
    }
    if (adata.disp_status == 2) {
         io.sockets.emit("LiveBookingClient", DispatchData);   
    }
    // store appointment status
    var bdata = {
        pid: (pdata.user).toString(),
        name: pdata.name,
        email: pdata.email,
        mobile: pdata.mobile,
        sent_dt: currTime,
        status_msg: status_msg,
        status: b_sent_st,
        res: 0
    };
    StoreAppointMentStatus(adata.bid, bdata, pdata.slotid, function (serr, sres) {
        if (serr) {
            console.log("store appt error");
        } else {
        }
    });
    if (adata.disp_status == 2) {
        var providerData = {
            id: parseInt(pdata.user),
            fname: pdata.name,
            lname: pdata.lname,
            pic: pdata.image,
            email: pdata.email,
            mobile: pdata.mobile
        };
        updateAsConfirmBooking(adata, providerData, function (serr, sres) {
            if (serr) {
                console.log("updateBooking error");
            } else {
            }
        });
    }
}


function StoreAppointMentStatus(bid, data, slot_id, callback)
{
    Utility.UpdatePush('bookings', {'bid': bid.toString()}, {'dispatched': data}, function (err, result) {
        if (err) {
            return callback(null, err);
        } else {
            return callback(null, result);
        }
    });
}

function updateAsConfirmBooking(adata, providerData, callback)
{
    Utility.Update('bookings', {'bid': adata.bid.toString()}, {status: 2, provider_id: providerData.id.toString(), provider: providerData}, function (err, result) {
        if (err) {
            return callback(null, err);
        } else {
            if (adata.booking_type == 2)
            {
                Utility.SelectOne('slotbooking', {'_id': new ObjectID(adata.slot_id)}, function (err, slotData) {
                    if (err) {
                        return callback(null, err);
                    } else {
                        Utility.Update('bookings', {'bid': adata.bid.toString()}, {appt_date: slotData.start_dt}, function (err, result) {
                            if (err) {
                                return callback(null, err);
                            } else {
                                Utility.Update('slotbooking', {'_id': new ObjectID(adata.slot_id)}, {status: 3, booked: 3}, function (err, result) {
                                    if (err) {
                                        return callback(null, err);
                                    } else {
                                        return callback(null, result);
                                    }
                                });
                            }
                        });

                    }
                });
            }
        }
    });
}


function makeProviderBusy(proid, callback)
{
    Utility.Update('location', {'user': parseInt(proid)}, {'popup': 1}, function (err, result) {
        if (err) {
            return callback(null, err);
        } else {
            return callback(null, result);
        }
    });
}

function makeProviderFree(proid, callback)
{
    Utility.Update('location', {'user': parseInt(proid)}, {'popup': 0}, function (err, result) {
        if (err) {
            return callback(null, err);
        } else {
            return callback(null, result);
        }
    });
}

//Remove Booking When SomeOne Accepted Booking
Application.removeBooking = function (bid, proid) {
    client.del(bid, function (err, reply) {
        if (err)
            console.log(err);
        else {

            var rempro = global.ProviderQueue.indexOf(parseInt(proid));
            if (rempro != -1) {
                global.ProviderQueue.splice(rempro, 1);
            }
            console.log("Booking Deleted From Redis Beacuse Accepted" + bid + proid);
        }
    });
}

//Remove Booking When Customer Cancell Booking
Application.removeCancelledBooking = function (bid) {
    client.del(bid, function (err, reply) {
        if (err)
            console.log(err);
        else {
            console.log("Booking Deleted From Redis Beacuse Customer Cancelled" + bid);
        }
    });
}

//Send Booking TO Other Provider When SomeOne Reject
Application.rejectBooking = function (bid) {
    client.hmset(bid, 'sendNew', 1);
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

function GetProviderData(pid, callback)
{
    var QueryObj = {user: parseInt(pid)};
    Utility.SelectOne('location', QueryObj, function (err, result) {
        if (err) {
            return callback(null, err);
        } else {
            return callback(null, result);
        }
    });
}

function GetBookingData(bid, callback)
{
    var QueryObj = {bid: bid.toString};
    Utility.SelectOne('bookings', QueryObj, function (err, result) {
        if (err) {
            return callback(null, err);
        } else {
            return callback(null, result);
        }
    });
}

function GetBookingConfigration(callback)
{
    Utility.SelectOne('config', {_id: 1}, function (err, config) {
        if (err) {
            console.log("Error In Config");
            booking_seconds = 10000;
            booking_seconds_later = 10000;
            return callback(null, err);
        } else {
            booking_seconds = (parseInt(config.booking_seconds) / 12) * 1000;
            pro_wait_seconds_now = parseInt(config.booking_seconds);
            booking_seconds = booking_seconds + 2;
            booking_seconds_later = (parseInt(config.booking_seconds_later) / 12) * 1000;
            pro_wait_seconds_later = parseInt(config.booking_seconds_later);
            booking_seconds_later = booking_seconds_later + 2;
            return callback(null, config);
        }
    });
}

function takeActionExpiredBooking(bid, callback)
{
    // start booking expired so  send push notification to customer                                   
    Utility.Update('bookings', {'bid': bid.toString()}, {'status': 11}, function (err, result) {
        if (err) {
            return callback(null, err);
        } else {

        }
    });
    request('http://serveus-1698520487.us-west-1.elb.amazonaws.com/refundexpire.php?bid=' + bid, function (error, response, body) {
//            console.log(body);
    });
    GetBookingData(bid, function (ferr, bookingdata) {
        if (ferr) {
            console.log("Error In GetBookingData");
        } else {
            GetCustomerData(parseInt(bookingdata.customer.id), function (ferr, cdata) {
                if (ferr) {
                    console.log("Error In GetCustomerData");
                } else {
                    send_expire_push({
                        bid: bookingdata.bid,
                        push_token: cdata.push_token,
                        device_type: cdata.device_type,
                        title_msg: "No Provider Found",
                        st_msg: "Sorry! We currently don't have an available provider to fill your shift. Please try again soon!"
                    }, function (err, result) {
                        if (err) {
                            console.log(err.message);
                        } else {
                            console.log('push success');
                        }
                    });
                }
            });
        }
    });
    // start booking expired so  send push notification to customer
}

function send_booking_push(args, callback) {
    var push_token = args.push_token;
    var device_type = args.device_type;
    var title_msg = args.title_msg;
    var bid = args.BookingData.bid;
    var fcm_server_key = "AAAA4X1YHto:APA91bH-srKnhLeLYHrFlDtlK3GfXAORReyYs9T6WNHv_OwXLvNSIdGJD-RE-qzJdi9Lct4-snr92t5gLV15K7zNDB1DYRGZwNTw5eucLY4wmbwstgG02vAhIY5TZjkWUEBbq1EOId1N";

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
            body: title_msg,
            sound: "default",
            bid: args.bid,
            cname: args.cname
        };
    } else if (device_type == 2) {
        var messageSend = {bid: bid, st: 9, payload: args.BookingData};
        var message = {
            to: push_token, // required fill with device token or topics
            collapse_key: 'your_collapse_key',
            priority: 'high',
            data: messageSend
        };
        message.data.title = title_msg;
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

function send_expire_push(args, callback) {
    var push_token = args.push_token;
    var device_type = args.device_type;
    var title_msg = args.title_msg;
    var bid = args.bid;
    var st_msg = args.st_msg;
    var fcm_server_key = "AAAA4X1YHto:APA91bH-srKnhLeLYHrFlDtlK3GfXAORReyYs9T6WNHv_OwXLvNSIdGJD-RE-qzJdi9Lct4-snr92t5gLV15K7zNDB1DYRGZwNTw5eucLY4wmbwstgG02vAhIY5TZjkWUEBbq1EOId1N";

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
            body: title_msg,
            sound: "default",
            bid: args.bid,
            cname: args.cname
        };
    } else if (device_type == 2) {
        var messageSend = {bid: bid, st: 2, payload: st_msg};
        var message = {
            to: push_token, // required fill with device token or topics
            collapse_key: 'your_collapse_key',
            priority: 'high',
            data: messageSend
        };
        message.data.title = title_msg;
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

//BOOKING FROM sendBookingFromDispatcher
Application.sendBookingFromDispatcher = function (io, bid) {
    Utility.SelectOne('bookings', {bid: bid.toString()}, function (err, bookingdata) {
        if (err) {
            return callback(null, err);
        } else {
            GetProviderData(bookingdata.provider_id, function (ferr, proData) {
                if (ferr) {
                    console.log("Error In GetProviderData");
                } else {
                    BookingFromDispatcher(io, bookingdata, proData);
                }
            });
        }
    });
}
