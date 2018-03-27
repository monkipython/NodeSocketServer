var Utility = require("./UtilityFunc");
var FCM = require('fcm-push');
var moment = require('moment');

module.exports = function (io, socket)
{
    //START CHAT MESSGAGE
    socket.on('Message', function (data) {
        console.log('Message Data: ' + JSON.stringify(data));
        /*  msgtype: 0 - text, 1 - Image, 2 - Video,  3: "location", 4: "contact",5: "audio",6: "sticker", 7: "doodle" */
        /*  msgid: id for each message */
        /*  payload : actual message */
        /*  usertype : User type */
        var mandatoryArr = ['msgtype', 'payload', 'bid', 'msgid', 'usertype', 'currdt'];

        if (!data.msgtype)
        {
            socket.emit("Message", {err: 1, msg: 'Mandatory Message type is Missing.'});
            return false;
        }
        if (!data.payload)
        {
            socket.emit("Message", {err: 1, msg: 'Mandatory message is Missing.'});
            return false;
        }
        if (!data.msgid)
        {
            socket.emit("Message", {err: 1, msg: 'Mandatory message id is Missing.'});
            return false;
        }
        if (!data.usertype)
        {
            socket.emit("Message", {err: 1, msg: 'Mandatory usertype  is Missing.'});
            return false;
        }
        if (!data.currdt)
        {
            socket.emit("Message", {err: 1, msg: 'Mandatory currdt  is Missing.'});
            return false;
        }
        var type = data.msgtype;
        var payload = data.payload;
        var ts = parseInt(moment.utc().format('x'));
        var msgid = data.msgid;
        data.usertype = parseInt(data.usertype);
        var status = 1;
        socket.emit("Message", {msgid: msgid, err: 0, deliver: 1});

        Utility.SelectOne('bookings', {bid: (data.bid).toString()}, function (err, Apptdet) {
            if (err) {
                console.log("Booking Not Found : " + JSON.stringify(err));
                socket.emit("Message", {err: 1, msg: 'Error while processing Booking Data'});
            } else if (Apptdet) {
                var collection = '';
                switch (data.usertype) {
                    case 1:
                        var get_to_user = {cid: parseInt(Apptdet.customer.id)};
                        collection = 'customer';
                        break;
                    case 2:
                        var get_to_user = {user: parseInt(Apptdet.provider.id)};
                        collection = 'location';
                        break;
                    default :
                        console.log("User Type Missing");
                        break;
                }
                console.log(get_to_user);
                Utility.SelectOne(collection, get_to_user, function (err, result) {
                    if (err) {
                        console.log("some error in User Data ");
                        socket.emit("Message", {err: 1, msg: 'Error while processing User Data'});
                    } else if (result)
                    {
                        var typeArr = {0: "message", 1: "image", 2: "video"};
                        if (result.online == 1) {
                            console.log("user is online.");
                            try {
                                io.sockets.connected[result.socket].emit("Message", {
                                    msgtype: type,
                                    bid: data.bid,
                                    pic: Apptdet.customer.pic,
                                    payload: payload,
                                    msgid: msgid,
                                    timestamp: parseFloat(ts),
                                    dt: data.currdt,
                                    usertype: data.usertype,
                                    err: 2,
                                });
                                status = 2;
                                socket.emit("Message", {msgid: msgid, err: 0, deliver: 2});
                            } catch (err) {
                                console.log('invalid socket id - emit failed ONLINE ' + JSON.stringify(err));
                            }
                            try {
                                send_android_ios_push({
                                    push_token: result.push_token,
                                    pic: Apptdet.customer.pic,
                                    name: Apptdet.customer.fname,
                                    device_type: result.device_type,
                                    msg_type: typeArr[type],
                                    timestamp: parseFloat(ts),
                                    payload: payload,
                                    dt: data.currdt,
                                    usertype: data.usertype,
                                    bid: data.bid
                                }, function (err, result) {
                                    if (err) {
                                        console.log(err.message);
                                    } else {
                                        console.log('push success');
                                    }
                                });
                            } catch (exc) {
                                console.log('Push Exception 1');
                            }
                        } else if (result.online == 0 || result.online == 1)
                        {
                            console.log("user is offline");
                            if (result.socket != '') {
                                try {
                                    io.sockets.connected[result.socket].emit("Message", {
                                        msgtype: type,
                                        bid: data.bid,
                                        pic: Apptdet.customer.pic,
                                        name: Apptdet.customer.fname,
                                        payload: payload,
                                        msgid: msgid,
                                        timestamp: parseFloat(ts),
                                        dt: data.currdt,
                                        usertype: data.usertype,
                                        err: 2
                                    });
                                } catch (excc) {
                                    console.log('invalid socket id - emit failed OFFLINE');
                                }
                            }
                            if (result.push_token == '' || result.push_token == null)
                                console.log('Push Token Not Found');
                            else {
                                try {
                                    send_android_ios_push({
                                        push_token: result.push_token,
                                        device_type: result.device_type,
                                        name: Apptdet.customer.fname,
                                        pic: Apptdet.customer.pic,
                                        msg_type: typeArr[type],
                                        timestamp: parseFloat(ts),
                                        payload: payload,
                                        dt: data.currdt,
                                        usertype: data.usertype,
                                        bid: data.bid
                                    }, function (err, result) {
                                        if (err) {
                                            console.log(err.message);
                                        } else {
                                            console.log('push success');
                                        }
                                    });
                                } catch (exc) {
                                    console.log('Push Exception 2');
                                }
                            }

                        }
                        /*  Store this message in user all messages database for recover messages later */
                        var MeesageData = {
                            msgtype: type,
                            payload: payload,
                            msgid: msgid,
                            dt: data.currdt,
                            usertype: data.usertype,
                            status: status,
                            timestamp: parseFloat(ts)
                        };
                        Utility.UpdatePush('bookings', {bid: (data.bid).toString()}, {messages: MeesageData}, function (err, result) {
                            if (err) {
                                console.log("Error Insert Message");
                            } else {
                                console.log("Message inserted");
                            }
                        });
                    } else {
                        socket.emit('Message', {err: 1, msg: 'Recipient Not Found'});
                    }
                });

            }
        });

    });
    //END MESSAGES
}

function send_android_ios_push(args, callback) {
    var push_token = args.push_token;
    var device_type = args.device_type;
    var msg_type = args.msg_type;
    var timestamp = args.timestamp;
    var usertype = args.usertype;
    var dt = args.dt;
    var msg = args.payload;
    var payload = {name: args.name, msg: args.payload, bid: args.bid, pic: args.pic};
    var fcm_server_key = "AAAA4X1YHto:APA91bH-srKnhLeLYHrFlDtlK3GfXAORReyYs9T6WNHv_OwXLvNSIdGJD-RE-qzJdi9Lct4-snr92t5gLV15K7zNDB1DYRGZwNTw5eucLY4wmbwstgG02vAhIY5TZjkWUEBbq1EOId1N";
//    if (usertype == 1) {
//        if (device_type == 1) {
//            // CUSTOMER IOS
//            fcm_server_key = "AIzaSyBWT1kv86hTveBwzRyP1sYYvxvI0RUjdCk";
//        } else {
//            // CUSTOMER ANDROID
//            fcm_server_key = "AIzaSyA59rz78fX082cGbzzR5gP7E2xpqc35xzo";
//        }
//    } else {
//        if (device_type == 1) {
//            //PROVIDER IOS
//            fcm_server_key = "AIzaSyApzWaGh0yvnUHpYod42ftrLbPuqkZIUec";
//        } else {
//            //PROVIDER ANDROID
//            fcm_server_key = "AIzaSyBQnsaoxpm71U5jtoWyPisSAIQqWw7k3UQ";
//        }
//    }
//    console.log(fcm_server_key);
//    console.log(push_token);
    console.log("device_type : " + device_type);
//    console.log("usertype" + usertype);
    var fcm = new FCM(fcm_server_key);

    if (device_type == 1) {
        var messageSend = {timestamp: timestamp, dt: dt, pic: args.pic, name: args.name, bid: args.bid, st: 8, payload: msg};
        var message = {
            to: push_token, // required fill with device token or topics
            collapse_key: 'your_collapse_key',
            priority: 'high',
            data: messageSend
        };
        message.notification = {
            title: "you got New " + msg_type,
            body: msg,
            sound: "default"
        };
    } else if (device_type == 2) {
        var messageSend = {st: 8, payload: payload};
        var message = {
            to: push_token, // required fill with device token or topics
            collapse_key: 'your_collapse_key',
            priority: 'high',
            data: messageSend
        };
        message.data.title = msg_type;
//        message.data.body = payload;
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