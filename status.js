var Utility = require("./UtilityFunc");
var moment = require('moment');
var forEach = require('async-foreach').forEach;

var socketapi = require('./socketapi.js');

module.exports = function (io, socket)
{
    //START customer status channel
    socket.on('CustomerStatus', function (data) {
        if (!(typeof data.cid !== 'undefined' && data.cid && data.cid != "")) {
            console.log("CustomerStatus : cid Missing");
        } else {
            Utility.Count('customer', {cid: parseInt(data.cid)}, function (err, count) {
                if (err) {
                    socket.emit("CustomerStatus", {err: 1, msg: 'Error: ' + err.message});
                } else {
                    if (count > 0)
                    {
                        update_param = {
                            socket: socket.id,
                            online: 1
                        };
                        Utility.Update('customer', {cid: parseInt(data.cid)}, update_param, function (err, result) {
                            if (err) {
                                socket.emit("CustomerStatus", {err: 1, msg: 'Error: ' + err.message});
                            } else {
//                                console.log("Customer Status Updated...");
                                socket.emit("CustomerStatus", {err: 0, msg: 'Customer Status Updated'});
                            }
                        });

                    } else {
                        console.log("Customer Not Found..." + JSON.stringify(data));
                        socket.emit("CustomerStatus", {err: 1, msg: 'Customer Not Found.'});
                    }
                }
            });
        }
    });
    //END customer status channel



    //START PROVIDER STATUS
    socket.on('ProviderStatus', function (data) {
        if (!(typeof data.pid !== 'undefined' && data.pid && data.pid != "")) {
            console.log("ProviderStatus : pid missing");
            socket.emit("ProviderStatus", {err: 1, msg: 'ProviderStatus : pid missing'});
        } else
        {
            data.pid = parseInt(data.pid);
            Utility.Count('location', {user: data.pid}, function (err, count) {
                if (err) {
                    socket.emit("ProviderStatus", {err: 1, msg: 'Error: ' + err.message});
                } else {
                    if (count > 0)
                    {
                        update_param = {
                            socket: socket.id,
                            online: 1
                        };
                        Utility.Update('location', {user: data.pid}, update_param, function (err, result) {
                            if (err) {
                                socket.emit("ProviderStatus", {err: 1, msg: 'Error: ' + err.message});
                            } else {
                                socket.emit("ProviderStatus", {err: 0, msg: 'Provider Status Updated'});
                            }
                        });
                    } else {
                        console.log("ProviderStatus : Provider Not Found...");
                    }
                }
            });
        }

    });
    //END PROVIDER STATUS



    //START UPDATE CUSTOMER
    socket.on('UpdateCustomer', function (data) {
//        console.log("UpdateCustomer : " + data.email);
        var mandatoryArr = ['email', 'lat', 'long', 'btype'];
        if (!(typeof data.btype !== 'undefined' && data.btype && data.btype != "")) {
            socket.emit("UpdateCustomer", {flag: 1, msg: 'Mandatory Field Type Missing.'});
        } else if (!(typeof data.lat !== 'undefined' && data.lat && data.lat != "")) {
            socket.emit("UpdateCustomer", {flag: 1, msg: 'Mandatory Field Lat Missing.'});
        } else if (!(typeof data.long !== 'undefined' && data.long && data.long != "")) {
            socket.emit("UpdateCustomer", {flag: 1, msg: 'Mandatory Field Long Missing.'});
        } else if (!(typeof data.email !== 'undefined' && data.email && data.email != "")) {
            socket.emit("UpdateCustomer", {flag: 1, msg: 'Mandatory Field Email Missing.'});
        } else
        {
            if (data.btype == 3)
            {
                var loc = {lat: data.lat, lng: data.long};
                
                Utility.SelectAll('Category', function (err, result) {
					console.log(result);
				});
						
                Utility.GeoNear('Category', {}, loc, function (err, result) {
                    if (err) {
                        socket.emit("UpdateCustomer", {flag: 1, msg: 'Server Error 1'});
                    } else {
                        var typesData = [];
                        result.results.forEach(function (res) {
                            var doc = res.obj;
                            var IsGroupContain = 0;
                            if (typeof doc.groups != 'undefined') {
                                if ((doc.groups).length > 0)
                                    IsGroupContain = 1;
                            }
                            var temp = {type_id: doc._id, cat_name: doc.cat_name,
                                cat_desc: doc.cat_desc, ftype: doc.fee_type, cityid: doc.city_id,
                                pay_com: doc.pay_commision,
                                price_set_by: doc.price_set_by,
                                fixed_price: doc.fixed_price,
                                can_fees: doc.can_fees,
                                price_mile: doc.price_mile,
                                price_min: doc.price_min,
                                visit_fees: doc.visit_fees,
                                min_fees: doc.min_fees, base_fees: doc.base_fees,
                                selImg: doc.sel_img, unSelImg: doc.unsel_img,
                                banImg: doc.banner_img, IsGroupContain: IsGroupContain};
                            typesData.push(temp);
                        });
                        Utility.GeoNear('location', {status: {$in: [3, 5]}, online: 1, booked: 0}, loc, function (err, res) {
                            if (err) {
                                socket.emit("UpdateCustomer", {flag: 1, msg: 'Server Error 1'});
                            } else {
                                var respo = [];
                                var track = {};
                                typesData.forEach(function (typ) {
                                    var locarr = [];
                                    res.results.forEach(function (item) {
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
                                        if (catListArr.indexOf(String(typ.type_id)) > -1) {
                                            if (dist_mile <= doc.radius) {
                                                catListOb.forEach(function (catr) {
                                                    if (catr.cid == typ.type_id && catr.status == 1) {

                                                        if (!doc.image)
                                                            doc.image = "";
                                                        var arr = {'lt': doc.location.latitude,
                                                            lg: doc.location.longitude,
                                                            e: doc.email,
                                                            i: doc.image,
                                                            n: doc.name,
                                                            pid: doc.user,
                                                            rat: doc.rating,
                                                            d: item.dis,
                                                            amt: catr.amount};
                                                        locarr.push(arr);
                                                    }
                                                });
                                            }
                                        }

                                    });
                                    var arr1 = {'tid': typ.type_id, 'mas': locarr};
                                    respo.push(arr1);
                                });
                                if (data.pid != null && data.pid != 'undefined' && data.pid != 0)
                                {
                                    Utility.SelectOne('location', {user: parseInt(data.pid)}, function (err, item) {
                                        if (err) {
                                            socket.emit("UpdateCustomer", {flag: 1, msg: 'Server Error 3'});
                                        } else {

                                            track = {'lt': item.location.latitude,
                                                lg: item.location.longitude,
                                                e: item.email, i: item.image, n: item.name,
                                                pid: item.user, rat: item.rating,
                                                d: item.dis};
                                            var masArr = {'masArr': respo, 'types': typesData, 'track': track};
                                            socket.emit("UpdateCustomer", {flag: 0, msg: masArr});
                                        }
                                    });
                                } else {
                                    var masArr = {'masArr': respo, 'types': typesData, 'track': track};
                                    socket.emit("UpdateCustomer", {flag: 0, msg: masArr});
                                }

                            }
                        });
                    }
                });
            }
            if (data.btype == 4)
            {
                var loc = {lat: data.lat, lng: data.long};
//                    data.dt = "2016-09-10 10:00:00";                    
//                    var ts = Date.parse(data.dt) / 1000;
                var pdate = data['dt'].split(" ");
                var pdatets = pdate[0] + "T00:00:00.000Z";
                data.dt = data['dt'].split(" ").join("T");
                data.dt += ".000Z";
                process.env.TZ = 'UTC';
                var pdts_s = Date.parse(new Date(pdatets)) / 1000;
                var pdts_e = pdts_s + 86400;
                var from = Date.parse(new Date(data.dt)) / 1000;
                var to = pdts_e;
                var check = {start: {$gt: from}, end: {$lt: to}, booked: {$in: [1, 2]}};
                Utility.GeoNear('slotbooking', check, loc, function (err, result) {
                    if (err) {
                        socket.emit("UpdateCustomer", {flag: 1, msg: 'Server Error 3'});
                    } else {
                        var providersIdArr = [];
                        var slotData = [];
                        result.results.forEach(function (res) {
                            var slot = res.obj;
                            if (parseFloat((res.dis / 1608)) <= (parseInt(slot.radius)))
                            {
                                if (!(providersIdArr.indexOf(parseInt(slot.doc_id)) > -1)) {
                                    providersIdArr.push(slot.doc_id);
                                    slotData.push({pid: slot.doc_id, data: {dis: res.dis, lt: slot.loc.latitude, lg: slot.loc.longitude}});
                                }
                            }
                        });
                        uniqueProviders = providersIdArr.filter(function (item, pos) {
                            return providersIdArr.indexOf(item) == pos;
                        });
						
                        Utility.GeoNear('Category', {}, loc, function (err, result) {
                            if (err) {
                                socket.emit("UpdateCustomer", {flag: 1, msg: 'Server Error 1'});
                            } else {
                                var typesData = [];
                                result.results.forEach(function (res) {
                                    var doc = res.obj;
                                    var IsGroupContain = 0;
                                    if (typeof doc.groups != 'undefined') {
                                        IsGroupContain = 1;
                                    }
                                    var temp = {type_id: doc._id, cat_name: doc.cat_name,
                                        cat_desc: doc.cat_desc, ftype: doc.fee_type, cityid: doc.city_id,
                                        pay_com: doc.pay_commision, price_set_by: doc.price_set_by,
                                        fixed_price: doc.fixed_price, can_fees: doc.can_fees,
                                        price_mile: doc.price_mile, price_min: doc.price_min,
                                        visit_fees: doc.visit_fees, min_fees: doc.min_fees,
                                        base_fees: doc.base_fees, selImg: doc.sel_img,
                                        unSelImg: doc.unsel_img,
                                        banImg: doc.banner_img, 'IsGroupContain': IsGroupContain};
                                    typesData.push(temp);
                                });
                                var respo = [];
                                Utility.Select('location', {user: {$in: uniqueProviders}}, function (err, pdata1) {
                                    if (err) {
                                    } else {
//                                        console.log('typesData');
//                                        console.log(typesData);
                                        forEach(typesData, function (typ, index, arr) {
                                            var locarr = [];
                                            pdata1.forEach(function (pdata) {
                                                var catListArr = [];
                                                var catListOb = pdata.catlist;
                                                if (typeof catListOb === 'object') {
                                                    catListOb.forEach(function (catr) {
                                                        catListArr.push(catr.cid);
                                                    });
                                                }
                                                if (catListArr.indexOf(String(typ.type_id)) > -1) {
                                                    catListOb.forEach(function (catr) {
                                                        if (catr.cid == typ.type_id && catr.status == 1) {
                                                            if (!pdata.image)
                                                                pdata.image = "";
                                                            var arr = {'lt': pdata.location.latitude,
                                                                'lg': pdata.location.longitude,
                                                                'e': pdata.email, i: pdata.image, n: pdata.name,
                                                                pid: pdata.user, rat: pdata.rating,
                                                                'd': 1, amt: catr.amount};
                                                            locarr.push(arr);
                                                        }
                                                    });

                                                }
                                            });
                                            var arr1 = {'tid': typ.type_id, 'mas': locarr};
                                            respo.push(arr1);
                                        });
                                        var track = {};
                                        var masArr = {'masArr': respo, 'types': typesData, 'track': track};
                                        socket.emit("UpdateCustomer", {flag: 0, msg: masArr});
                                    }
                                });
                            }
                        });
                    }
                });
            }
        }
    });
    //END UPDATE CUSTOMER    



    //START UPDATE PROVIDER
    socket.on('UpdateProvider', function (data) {
        var mandatoryArr = ['pid', 'lat', 'long'];
        if (!(typeof data.pid !== 'undefined' && data.pid && data.pid != "")) {

        } else if (!(typeof data.lat !== 'undefined' && data.lat && data.lat != "")) {

        } else if (!(typeof data.long !== 'undefined' && data.long && data.long != "")) {

        } else
        {
            update_param = {
                location: {
                    longitude: parseFloat(data.long),
                    latitude: parseFloat(data.lat)
                },
                lastUpdated: moment().unix(),
                expire: moment().unix() + 900
            };
            data.pid = parseInt(data.pid);
            Utility.Update('location', {user: data.pid}, update_param, function (err, updateres) {
                if (err) {
                    socket.emit("UpdateProvider", {err: 1, msg: 'Error: ' + err.message});
                } else {

                    socketapi.location({
                        proId: data.pid,
                        socket: socket,
                        bstatus: 104
                    }, function (err, result) {});
                    
                    var currtime = moment().unix();
                    Utility.SelectOne('location', {popupetime: {$lt: currtime}, popup: 1, user: data.pid}, function (err, pdata1) {
                        if (err) {
                            console.log("Error in select ProviderStatus");
                        } else {
                            if (pdata1) {
                                Utility.Update('location', {user: data.pid}, {popup: 0}, function (err, result) {
                                    if (err) {
                                        console.log("auto free error");
                                    } else {
                                        console.log("auto free done");
                                    }
                                });
                            } else {
//                                console.log("alreay Free");
                            }
                        }
                    });

                    Utility.SelectOne('location', {user: data.pid}, function (err, doc) {
                        socket.emit("UpdateProvider", {err: 0, msg: 'Updated Successfully'});
                        if (typeof doc !== 'undefined' && doc) {
                            var GodsViewData = {
                                a: '4',
                                lt: doc.location.latitude,
                                lg: doc.location.longitude,
                                proid: doc.user,
                                e_id: doc.email,
                                driverid: doc._id.toString(),
                                ProfilePic: doc.image,
                                cityid: '',
                                Fname: doc.name,
                                mobileNO: doc.mobile,
                                t: ''
                            };
                            socket.broadcast.emit("godsview_update", GodsViewData);
                        }
                    });
                }
            });
        }
    });
    //END UPDATE PROVIDER


    //start dissconnect socket 
    socket.on('disconnect', function () {
        var verification_param1 = {
            socket: socket.id
        };
        update_param = {
            socket: '',
            online: 0
        };
        Utility.SelectOne('location', {socket: socket.id}, function (err, sockdata) {
            if (err) {
//                socket.emit("UpdateCustomer", {flag: 1, msg: 'Server Error 3'});
            } else {
                Utility.Update('location', verification_param1, update_param, function (err, result) {
                    if (err) {
                        console.log("Disconnected Error : " + err.message);
                    } else {
                        if (sockdata != null) {
//                            console.log("Disconnected Socket" + socket.id);
//                            var data = {
//                                err: 0,
//                                e_id: sockdata.email
//                            };
//                            socket.broadcast.emit("godsview_remove", data);
                        }
                    }
                });
            }
        });
    });
    //END  dissconnect socket 




}