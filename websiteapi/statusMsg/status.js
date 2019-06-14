module.exports.status = function (successCode, data, language) {
    var return_;
    switch (successCode) {
        case 7:
            return_ = { errNum: 7, errMsg: 'Invalid token, please login or register.', errFlag: 1 };
            break;
        case 38:
            return_ = { errNum: 38, errMsg: 'Category Type Unavailable..', errFlag: 1, data: data };
            break;
        case 39:
            return_ = { errNum: 39, errMsg: 'No slots present..', errFlag: 1, data: data };
            break;
        case 2:
            return_ = { errNum: 200, errMsg: 'Got The Details', errFlag: 0, data: data };
            break;
        case 78:
            return_ = { errNum: 78, errMsg: 'Thanks for the booking ! We will get the best possible provider and send you the booking details shortly !', errFlag: 0, data: data };
            break;
        case 400:
            return_ = { errNum: 400, errMsg: 'Please Provide a file', errFlag: 0, data: data };
            break;
        case 500:
            return_ = { errNum: 500, errMsg: 'Error While Uploading File', errFlag: 0, data: data };
            break;
        case 4:
            return_ = { errNum: 409, errMsg: 'Email is already registered', errFlag: 0, data: data };
            break;
        case 5:
            return_ = { errNum: 201, errMsg: 'User Created Successfully', errFlag: 0, data: data };
            break;
        case 6:
            return_ = { errNum: 401, errMsg: 'Unauthorized User', errFlag: 0, data: data };
            break;
        case 8:
            return_ = { errNum: 404, errMsg: 'Provider not found', errFlag: 1, data: data };
            break;
        case 9:
            return_ = { errNum: 404, errMsg: 'Booking Not Found', errFlag: 1, data: data };
            break;
        case 10:
            return_ = { errNum: 410, errMsg: 'Booking Expired', errFlag: 1, data: data };
            break;
        case 11:
            return_ = { errNum: 200, errMsg: 'Currently all Drivers are busy', errFlag: 0 };
            break;
        case 12:
            return_ = { errNum: 301, errMsg: 'Booking No Longer Available', errFlag: 1 };
            break;
        case 13:
            return_ = { errNum: 200, errMsg: 'OTP SENT', errFlag: 0 };
            break;
        case 14:
            return_ = { errNum: 202, errMsg: 'Provider Accepted', errFlag: 0 };
            break;
        case 15:
            return_ = { errNum: 203, errMsg: 'Provider Rejected', errFlag: 0 };
            break;
        case 16:
            return_ = { errNum: 16, errMsg: 'Customer Not Found', errFlag: 1 };
            break;
        case 17:
            return_ = { errNum: 17, errMsg: 'The verification code entered is incorrect, please try again or try the resend option to send a new code', errFlag: 1 };
            break;
        case 18:
            return_ = { errNum: 18, errMsg: 'Mobile verified successfully', errFlag: 0 };
            break;
        case 19:
            return_ = { errNum: 19, errMsg: 'Reset password instructions are sent to your registered mail, please follow them.', errFlag: 0 };
            break;
        case 20:
            return_ = { errNum: 20, errMsg: 'Provider Not Found.', errFlag: 1 };
            break;
        case 21:
            return_ = { errNum: 21, errMsg: 'Category Not Found.', errFlag: 1 };
            break;
        case 22:
            return_ = { errNum: 22, errMsg: 'Booking Not Found.', errFlag: 1 };
            break;
        case 23:
            return_ = { errNum: 23, errMsg: 'Session expired, Please click on the reset password button to resend the mail', errFlag: 1 };
            break;
        case 24:
            return_ = { errNum: 24, errMsg: 'Password changed successfully, Please login again with new password', errFlag: 1 };
            break;
        case 25:
            return_ = { errNum: 25, errMsg: 'Change password failed', errFlag: 1 };
            break;
        case 26:
            return_ = { errNum: 26, errMsg: 'Current password entered is wrong, Please enter the correct password', errFlag: 1 };
            break;
        case 27:
            return_ = { errNum: 27, errMsg: 'Reset password failed', errFlag: 1 };
            break;
        case 28:
            return_ = { errNum: 28, errMsg: 'Password changed successfully', errFlag: 1 };
            break;
        case 29:
            return_ = { errNum: 29, errMsg: 'Invalid Promo code', errFlag: 1 };
            break;
        case 30:
            return_ = { errNum: 30, errMsg: 'Promo code has expired', errFlag: 1 };
            break;
        case 31:
            return_ = { errNum: 31, errMsg: 'Promo code is invalid, already used', errFlag: 1 };
            break;
        case 32:
            return_ = { errNum: 32, errMsg: 'booking Cancelled', errFlag: 1 };
            break;
        case 33:
            return_ = { errNum: 33, errMsg: 'No bookings made with that id', errFlag: 1 };
            break;
        case 34:
            return_ = { errNum: 34, errMsg: 'No cards added', errFlag: 1 };
            break;
        case 35:
            return_ = { errNum: 35, errMsg: 'No reviews present', errFlag: 1 };
            break;
        case 36:
            return_ = { errNum: 36, errMsg: 'Email address is not registred.', errFlag: 1 };
            break;
        case 37:
            return_ = { errNum: 37, errMsg: 'Phone Number is not registred.', errFlag: 1 };
            break;
        case 79:
             return_ = { errNum: 79, errMsg: 'Redirect to the following link.', errFlag: 0, data: data };
            break;     
        case 411:
            return_ = { errNum: 203, errMsg: 'Missing Slot Id/Provider Id  Missing', errFlag: 1 };
            break;
        case 412:
            return_ = { errNum: 203, errMsg: 'Something Wrong In Request Parameter', errFlag: 1 };
            break;
        case 413:
            return_ = { errNum: 203, errMsg: 'This mobile number is already registered with us, please try with a new one', errFlag: 1, data: data };
            break;
        case 414:
            return_ = { errNum: 414, errMsg: 'This Email is already registered with us, please try with a new one', errFlag: 1, data: data };
            break;
        case 200:
            return_ = { errNum: 200, errMsg: 'success', errFlag: 0, data: data };
            break;
        case 201:
            return_ = { errNum: 200, errMsg: 'Reset Password link send to email, Please check', errFlag: 0, data: data };
            break;
        default:
            return_ = { errNum: 404, errMsg: 'no data', errFlag: 1, 'data': data };

    }
    return return_;

}

module.exports.bookingStatus = function (successCode, language) {
    var return_;
    switch (successCode) {
        case 1:
            return_ = 'Booking requested';
            break;
        case 2:
            return_ = 'Provider accepted.';
            break;
        case 3:
            return_ = 'Provider rejected.';
            break;
        case 4:
            return_ = 'customer has cancelled.';
            break;
        case 5:
            return_ = 'Provider on the way.';
            break;
        case 21:
            return_ = 'Provider Arrived at job location';
            break;
        case 6:
            return_ = 'Job started.';
            break;
        case 22:
            return_ = 'Job Completed and Invoice Pending';
            break;
        case 7:
            return_ = 'Job Completed';
            break;
        case 8:
            return_ = 'Job Timed out.';
            break;
        case 9:
            return_ = 'Job Cancelled with fee.';
            break;
        case 10:
            return_ = 'Provider has cancelled.';
            break;


        default:
            return_ = 'Unassigned.';

    }
    return return_;

}

