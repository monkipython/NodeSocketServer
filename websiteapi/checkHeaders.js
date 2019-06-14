'use strict';
const atob = require('atob');
const btoa = require('btoa');
exports.headerchecking = function (value) {
    
    console.log("value for header", btoa(value));
    // iserveUser:#iserveUserjlksdhkjd
    // aXNlcnZlVXNlcjojaXNlcnZlVXNlcmpsa3NkaGtqZA==
    let tok = atob(value);
    console.log("token", tok);
    // console.log("atob", atob(tok))
    // let token = atob(tok);
    let userName = tok.split(":")[0];
    let password = tok.split(":")[1];
    if (userName === 'iserveUser' && password === '#iserveUserjlksdhkjd') {
        return true;
    }
    else {
        return false;
    }
};