var Hapi = require('hapi');
server = new Hapi.Server();
var Joi = require('joi');
//var fs = require('fs');

require('./models/bookingActions');
var config = require('./config/config.json');
process.env.SECRET_KEY = "3EMbed007";

//var tls = {
//  key: fs.readFileSync('/etc/ssl/private/ssl-cert-snakeoil.key'),
//  cert: fs.readFileSync('/etc/ssl/certs/ssl-cert-snakeoil.pem')
//};

server.connection({port: 7002, routes: {cors: true} });


//loding swagger
server.register({register: require('hapi-swagger'), options: {apiVersion: "0.0.1"}}, function (err) {
    if (err) {
        server.log(['error'], 'hapi-swagger load error: ' + err)
    } else {
        server.log(['start'], 'hapi-swagger interface loaded')
    }
});

// =============== SLAVE MODULE ========================================================================== //
var slaveModule = require('./models/slave');

server.route({
    method: 'POST', // Methods Type
    path: '/slave/signup', // Url
    config: {// "tags" enable swagger to document API 
        tags: ['api', 'slave'],
        description: 'Slave signup',
        notes: "Slave signup", // We use Joi plugin to validate request 
        plugins: {
            'hapi-swagger': {
                payloadType: 'form'
            },
            responses: {
                '200': {
                    'description': 'Success',
                    'schema': Joi.object({
                        equals: Joi.number(),
                    }).label('Result')
                },
                '400': {'description': 'Bad Request',
                    'schema': Joi.object({
                        equals: Joi.number(),
                    }).label('Result')}
            }
        },
        validate: {
            payload:
                    {
                        ent_first_name: Joi.string().required().description('First Name'),
                        ent_last_name: Joi.string().description('Last Name'),
                        ent_email: Joi.string().required().description('Email'),
                        ent_password: Joi.string().required().description('Password'),
                        ent_country_code: Joi.string().required().description('Country Code'),
                        ent_mobile: Joi.string().required().description('Mobile'),
                        ent_profile_pic: Joi.string().description('Profile Pic'),
                        ent_signup_type: Joi.number().required().description('1-NORMAL, 2-FACEBOOK'),
                        ent_fb_id: Joi.any().description('Facebook ID'),
                        ent_register_date: Joi.any().default('2017-02-05 00:02:54').description('customer registration date')
                    }
        }
    },
    handler: slaveModule.signup
});

// facebook signup and login
server.route({
    method: 'POST', // Methods Type
    path: '/slave/facebooksignup', // Url
    config: {// "tags" enable swagger to document API 
        tags: ['api', 'slave'],
        description: 'Slave signup',
        notes: "Slave signup", // We use Joi plugin to validate request 
        plugins: {
            'hapi-swagger': {
                payloadType: 'form'
            },
            responses: {
                '200': {
                    'description': 'Success',
                    'schema': Joi.object({
                        equals: Joi.number(),
                    }).label('Result')
                },
                '400': {'description': 'Bad Request',
                    'schema': Joi.object({
                        equals: Joi.number(),
                    }).label('Result')}
            }
        },
        validate: {
            payload:
                    {
                        ent_first_name: Joi.string().required().description('First Name'),
                        ent_last_name: Joi.string().description('Last Name'),
                        ent_email: Joi.string().required().description('Email'),
                        ent_fb_id: Joi.string().required().description("facebook id")
                    }
        }
    },
    handler: slaveModule.facebooksignup
});

server.route({
    method: 'POST', // Methods Type
    path: '/slave/login', // Url
    config: {// "tags" enable swagger to document API 
        tags: ['api', 'slave'],
        description: 'Slave Login',
        notes: "Slave Login", // We use Joi plugin to validate request 
        plugins: {
            'hapi-swagger': {
                payloadType: 'form'
            },
            responses: {
                '200': {
                    'description': 'Success',
                    'schema': Joi.object({
                        equals: Joi.number(),
                    }).label('Result')
                },
                '400': {'description': 'Bad Request',
                    'schema': Joi.object({
                        equals: Joi.number(),
                    }).label('Result')}
            }
        },
        validate: {
            payload:
                    {
                        ent_email: Joi.string().required().description('Email'),
                        ent_password: Joi.string().required().description('Password'),
                        ent_signup_type: Joi.string().description('1-NORMAL, 2-FACEBOOK'),
                        ent_fb_id: Joi.string().description('FACEBOOK ID'),
                    }
        }
    },
    handler: slaveModule.login
});


server.route({
    method: 'POST', // Methods Type
    path: '/slave/livebooking', // Url
    config: {// "tags" enable swagger to document API 
        tags: ['api', 'slave'],
        description: 'Booking request',
        notes: "store booking detials in db", // We use Joi plugin to validate request 
        plugins: {
            'hapi-swagger': {
                payloadType: 'form'
            },
            responses: {
                '200': {
                    'description': 'Success',
                    'schema': Joi.object({
                        equals: Joi.number(),
                    }).label('Result')
                },
                '400': {'description': 'Bad Request',
                    'schema': Joi.object({
                        equals: Joi.number(),
                    }).label('Result')}
            }
        },
        validate: {
            payload:
                    {
                        ent_sess_token: Joi.string().required().description('Session token'),
                        ent_dev_id: Joi.string().required().description('entDeviceId'),
                        ent_cust_id: Joi.string().required().description('customer id'),
                        ent_cat_id: Joi.string().required().description('category id'),
                        ent_lat: Joi.number().required().description('job lat'),
                        ent_long: Joi.number().required().description('job long'),
                        ent_appnt_dt: Joi.string().required().description('appointment date YYYY-mm-dd HH:mm:ss'),
                        ent_date_time: Joi.string().required().description('Current Date time YYYY-mm-dd HH:mm:ss'),
                        ent_payment_type: Joi.string().required().description('1-CASH 2-CARD'),
                        ent_booking_type: Joi.string().required().description('1-Now ,2-Latter'),
                        ent_device_type: Joi.string().required().description('1-ANDORID, 2-IOS, 3-WEBSITE, 4-DISPATCHER'),
                        ent_address1: Joi.string().required().description('Address'),
                        ent_pro_id: Joi.any().description('provider id'),
                        ent_slot_id: Joi.any().description('slot id '),
                        ent_services: Joi.any().description('selected services'),
                        ent_coupon: Joi.any().description('coupen code'),
                        ent_card_id: Joi.description('card Token'),
                        ent_job_details: Joi.any().description('customer  note')
                    }
        }
    },
    handler: slaveModule.livebooking
});


server.route({
    method: 'PUT', // Methods Type
    path: '/slave/cancelbooking', // Url
    config: {// "tags" enable swagger to document API 
        tags: ['api', 'slave'],
        description: 'cancenl booking',
        notes: "cancel booking", // We use Joi plugin to validate request 
        plugins: {
            'hapi-swagger': {
                payloadType: 'form'
            },
            responses: {
                '200': {
                    'description': 'Success',
                    'schema': Joi.object({
                        equals: Joi.number(),
                    }).label('Result')
                },
                '400': {'description': 'Bad Request',
                    'schema': Joi.object({
                        equals: Joi.number(),
                    }).label('Result')}
            }
        },
        validate: {
            payload:
                    {
                        ent_sess_token: Joi.string().required().description('Session token'),
                        ent_bid: Joi.string().required().description('booking id')
                    }
        }
    },
    handler: slaveModule.cancelbooking
});

server.route({
    method: 'PUT', // Methods Type
    path: '/slave/profile', // Url
    config: {// "tags" enable swagger to document API 
        tags: ['api', 'slave'],
        description: 'profile booking',
        notes: "profile booking", // We use Joi plugin to validate request 
        plugins: {
            'hapi-swagger': {
                payloadType: 'form'
            },
            responses: {
                '200': {
                    'description': 'Success',
                    'schema': Joi.object({
                        equals: Joi.number(),
                    }).label('Result')
                },
                '400': {'description': 'Bad Request',
                    'schema': Joi.object({
                        equals: Joi.number(),
                    }).label('Result')}
            }
        },
        validate: {
            payload:
                    {
                        ent_sess_token: Joi.string().required().description('Session token'),
                        ent_first_name: Joi.string().required().description('first name'),
                        ent_mobile: Joi.string().required().description('mobile'),
                        ent_last_name: Joi.string().description('Last name'),
                    }
        }
    },
    handler: slaveModule.UpdateProfile
});



//get all bookings api
server.route({
    method: 'get', // Methods Type
    path: '/slave/currentbookings/{ent_sess_token}/{ent_page_index}', // Url
    config: {// "tags" enable swagger to document API 
        tags: ['api', 'slave'],
        description: 'get all current Booking',
        notes: "get all current bookings", // We use Joi plugin to validate request 
        plugins: {
            'hapi-swagger': {
                payloadType: 'form'
            },
            responses: {
                '200': {
                    'description': 'Success',
                    'schema': Joi.object({
                        equals: Joi.number(),
                    }).label('Result')
                },
                '400': {'description': 'Bad Request',
                    'schema': Joi.object({
                        equals: Joi.number(),
                    }).label('Result')}
            }
        },
        validate: {
            params:
                    {
                        ent_sess_token: Joi.string().required().description('Session token'),
                        ent_page_index: Joi.number().required().description('page index')
                    },
             query:
                   {
                        ent_status:Joi.number().description('status filter') 
                   }         
        }
    },
    handler: slaveModule.currentbookings
});




//get all tasker by category
server.route({
    method: 'get', // Methods Type
    path: '/slave/tasker/{ent_sess_token}/{ent_lat}/{ent_long}/{ent_cat_id}/{sort}', // Url
    config: {// "tags" enable swagger to document API 
        tags: ['api', 'slave'],
        description: 'get all tasker by category',
        notes: "get all tasker by category", // We use Joi plugin to validate request 
        plugins: {
            'hapi-swagger': {
                payloadType: 'form'
            },
            responses: {
                '200': {
                    'description': 'Success',
                    'schema': Joi.object({
                        equals: Joi.number(),
                    }).label('Result')
                },
                '400': {'description': 'Bad Request',
                    'schema': Joi.object({
                        equals: Joi.number(),
                    }).label('Result')}
            }
        },
        validate: {
            params:
                    {
                        ent_sess_token: Joi.string().required().description('Session token'),
                        ent_lat: Joi.string().required().description('Latitude'),
                        ent_long: Joi.string().required().description('Longitude'),
                        ent_cat_id: Joi.string().required().description('Category Id'),
                        sort:Joi.number().required().description("sorting Query, 0-> random, 1->price(high to low), 2->price(low to high), 3->total reviews,4->avg_rating")
                    }
        }
    },
    handler: slaveModule.tasker
});

//get all taskerForBookLater by category
server.route({
    method: 'get', // Methods Type
    path: '/slave/taskerForBookLater/{ent_sess_token}/{ent_lat}/{ent_long}/{ent_cat_id}/{sort}/{dateTime}', // Url
    config: {// "tags" enable swagger to document API 
        tags: ['api', 'slave'],
        description: 'get all tasker by category',
        notes: "get all tasker by category", // We use Joi plugin to validate request 
        plugins: {
            'hapi-swagger': {
                payloadType: 'form'
            },
            responses: {
                '200': {
                    'description': 'Success',
                    'schema': Joi.object({
                        equals: Joi.number(),
                    }).label('Result')
                },
                '400': {'description': 'Bad Request',
                    'schema': Joi.object({
                        equals: Joi.number(),
                    }).label('Result')}
            }
        },
        validate: {
            params:
                    {
                        ent_sess_token: Joi.string().required().description('Session token'),
                        ent_lat: Joi.string().required().description('Latitude'),
                        ent_long: Joi.string().required().description('Longitude'),
                        ent_cat_id: Joi.string().required().description('Category Id'),
                        sort:Joi.number().required().description("sorting Query, 0-> random, 1->price(high to low), 2->price(low to high), 3->total reviews,4->avg_rating"),
                        dateTime:Joi.string().required().description("booking date -> 2017-05-14 16:00:00")
                    }
        }
    },
    handler: slaveModule.taskerForBookLater
});


//get all slots by provider id, date
server.route({
    method: 'get', // Methods Type
    path: '/slave/slots/{ent_sess_token}/{ent_pro_id}/{dateTime}', // Url
    config: {// "tags" enable swagger to document API 
        tags: ['api', 'slave'],
        description: 'get all slots of a provider by booking date',
        notes: "get all slots of a provider by booking date", // We use Joi plugin to validate request 
        plugins: {
            'hapi-swagger': {
                payloadType: 'form'
            },
            responses: {
                '200': {
                    'description': 'Success',
                    'schema': Joi.object({
                        equals: Joi.number(),
                    }).label('Result')
                },
                '400': {'description': 'Bad Request',
                    'schema': Joi.object({
                        equals: Joi.number(),
                    }).label('Result')}
            }
        },
        validate: {
            params:
                    {
                        ent_sess_token: Joi.string().required().description('Session token'),
                        ent_pro_id: Joi.string().required().description('Provider Id'),
                        dateTime:Joi.string().required().description("booking date -> 2017-05-14 16:00:00")
                    }
        }
    },
    handler: slaveModule.slots
});



//get all Past bookings api
server.route({
    method: 'get', // Methods Type
    // path: '/slave/pastbookings/{ent_sess_token}/{ent_limit}/{ent_skip}/{ent_start_date}/{ent_end_date}/{ent_provider_name}', // Url
    path: '/slave/pastbookings/{ent_sess_token}/{ent_page_index}', 
    // Url
    config: {// "tags" enable swagger to document API 
        tags: ['api', 'slave'],
        description: 'get all past Booking',
        notes: "get all past Bookings", // We use Joi plugin to validate request 
        plugins: {
            'hapi-swagger': {
                payloadType: 'form'
            },
            responses: {
                '200': {
                    'description': 'Success',
                    'schema': Joi.object({
                        equals: Joi.number(),
                    }).label('Result')
                },
                '400': {'description': 'Bad Request',
                    'schema': Joi.object({
                        equals: Joi.number(),
                    }).label('Result')}
            }
        },
        validate: {
            params:
                    {
                        ent_sess_token: Joi.string().required().description('Session token'),
                        ent_page_index: Joi.number().required().description('page index')
                    },
            query:
                   {
                        ent_start_date:Joi.any().description('start date filter'),
                        ent_end_date:Joi.any().description('end date filter'),
                        ent_provider_name:Joi.any().description('by provider name'),
                        ent_status:Joi.any().description('status filter') 
                   }        
        }
    },
    handler: slaveModule.pastbookings
});



//get provider details
server.route({
    method: 'get', // Methods Type
    path: '/slave/ProviderDetail/{ent_sess_token}/{ent_pro_id}/{ent_cat_id}', // Url
    config: {// "tags" enable swagger to document API 
        tags: ['api', 'slave'],
        description: 'get provider details',
        notes: "get provider detials", // We use Joi plugin to validate request 
        plugins: {
            'hapi-swagger': {
                payloadType: 'form'
            },
            responses: {
                '200': {
                    'description': 'Success',
                    'schema': Joi.object({
                        equals: Joi.number(),
                    }).label('Result')
                },
                '400': {'description': 'Bad Request',
                    'schema': Joi.object({
                        equals: Joi.number(),
                    }).label('Result')}
            }
        },
        validate: {
            params:
                    {
                        ent_sess_token: Joi.string().required().description('Session token'),
                        ent_pro_id: Joi.string().required().description('provider id'),
                        ent_cat_id: Joi.string().required().description('category id')
                    }
        }
    },
    handler: slaveModule.ProviderDetail
});
//get provider details
server.route({
    method: 'get', // Methods Type
    path: '/slave/CategoryDetail/{ent_sess_token}/{ent_cat_id}', // Url
    config: {// "tags" enable swagger to document API 
        tags: ['api', 'slave'],
        description: 'get category details',
        notes: "get category detials", // We use Joi plugin to validate request 
        plugins: {
            'hapi-swagger': {
                payloadType: 'form'
            },
            responses: {
                '200': {
                    'description': 'Success',
                    'schema': Joi.object({
                        equals: Joi.number(),
                    }).label('Result')
                },
                '400': {'description': 'Bad Request',
                    'schema': Joi.object({
                        equals: Joi.number(),
                    }).label('Result')}
            }
        },
        validate: {
            params:
                    {
                        ent_sess_token: Joi.string().required().description('Session token'),
                        ent_cat_id: Joi.string().required().description('category id')
                    }
        }
    },
    handler: slaveModule.CategoryDetail
});


//get review list by provider id
server.route({
    method: 'get', // Methods Type
    path: '/slave/reviews/{ent_sess_token}/{ent_pro_id}/{ent_filter_option}/{ent_page_index}', // Url
    config: {// "tags" enable swagger to document API 
        tags: ['api', 'slave'],
        description: 'get category details',
        notes: "get category detials", // We use Joi plugin to validate request 
        plugins: {
            'hapi-swagger': {
                payloadType: 'form'
            },
            responses: {
                '200': {
                    'description': 'Success',
                    'schema': Joi.object({
                        equals: Joi.number(),
                    }).label('Result')
                },
                '400': {'description': 'Bad Request',
                    'schema': Joi.object({
                        equals: Joi.number(),
                    }).label('Result')}
            }
        },
        validate: {
            params:
                    {
                        ent_sess_token: Joi.string().required().description('Session token'),
                        ent_pro_id: Joi.number().required().description('provider id'),
                        ent_filter_option: Joi.number().required().description('filter option,negative-1, poor-2,av-3 , postive-4, excellent-5, all-0'),
                        ent_page_index: Joi.number().required().description('page Index value, starting from 1')
                    }
        }
    },
    handler: slaveModule.reviews
});


//get provider details
server.route({
    method: 'get', // Methods Type
    path: '/slave/BookingDetail/{ent_sess_token}/{ent_bid}', // Url
    config: {// "tags" enable swagger to document API 
        tags: ['api', 'slave'],
        description: 'get booking details',
        notes: "get booking detials", // We use Joi plugin to validate request 
        plugins: {
            'hapi-swagger': {
                payloadType: 'form'
            },
            responses: {
                '200': {
                    'description': 'Success',
                    'schema': Joi.object({
                        equals: Joi.number(),
                    }).label('Result')
                },
                '400': {'description': 'Bad Request',
                    'schema': Joi.object({
                        equals: Joi.number(),
                    }).label('Result')}
            }
        },
        validate: {
            params:
                    {
                        ent_sess_token: Joi.string().required().description('Session token'),
                        ent_bid: Joi.string().required().description('booking id')
                    }
        }
    },
    handler: slaveModule.BookingDetail
});




//get verification code
server.route({
    method: 'get', // Methods Type
    path: '/slave/VerificationCode/{ent_mobile}', // Url
    config: {// "tags" enable swagger to document API 
        tags: ['api', 'slave'],
        description: 'get Verification Code',
        notes: "get Verification Code", // We use Joi plugin to validate request 
        plugins: {
            'hapi-swagger': {
                payloadType: 'form'
            },
            responses: {
                '200': {
                    'description': 'Success',
                    'schema': Joi.object({
                        equals: Joi.number(),
                    }).label('Result')
                },
                '400': {'description': 'Bad Request',
                    'schema': Joi.object({
                        equals: Joi.number(),
                    }).label('Result')}
            }
        },
        validate: {
            params:
                    {
                        ent_mobile: Joi.string().required().description('Mobile Number With Country Code')
                    }
        }
    },
    handler: slaveModule.VerificationCode
});



server.route({
    method: 'get', // Methods Type
    path: '/slave/categoryByCity/{ent_sess_token}/{ent_city_id}', // Url
    config: {// "tags" enable swagger to document API 
        tags: ['api', 'slave'],
        description: 'get category by city',
        notes: "get category by city", // We use Joi plugin to validate request 
        plugins: {
            'hapi-swagger': {
                payloadType: 'form'
            },
            responses: {
                '200': {
                    'description': 'Success',
                    'schema': Joi.object({
                        equals: Joi.number(),
                    }).label('Result')
                },
                '400': {'description': 'Bad Request',
                    'schema': Joi.object({
                        equals: Joi.number(),
                    }).label('Result')}
            }
        },
        validate: {
            params:
                    {
                        ent_sess_token: Joi.string().required().description('Session Token'),
                        ent_city_id: Joi.string().required().description('City Id')
                    }
        }
    },
    handler: slaveModule.categoryByCity
});




server.route({
    method: 'get', // Methods Type
    path: '/slave/card/{ent_sess_token}', // Url
    config: {// "tags" enable swagger to document API 
        tags: ['api', 'slave'],
        description: 'get cards',
        notes: "get cards", // We use Joi plugin to validate request 
        plugins: {
            'hapi-swagger': {
                payloadType: 'form'
            },
            responses: {
                '200': {
                    'description': 'Success',
                    'schema': Joi.object({
                        equals: Joi.number(),
                    }).label('Result')
                },
                '400': {'description': 'Bad Request',
                    'schema': Joi.object({
                        equals: Joi.number(),
                    }).label('Result')}
            }
        },
        validate: {
            params:
                    {
                        ent_sess_token: Joi.string().required().description('Session Token')
                    }
        }
    },
    handler: slaveModule.card
});



server.route({
    method: 'DELETE', // Methods Type
    path: '/slave/card', // Url
    config: {// "tags" enable swagger to document API 
        tags: ['api', 'slave'],
        description: 'delete card',
        notes: "delete card", // We use Joi plugin to validate request 
        plugins: {
            'hapi-swagger': {
                payloadType: 'form'
            },
            responses: {
                '200': {
                    'description': 'Success',
                    'schema': Joi.object({
                        equals: Joi.number(),
                    }).label('Result')
                },
                '400': {'description': 'Bad Request',
                    'schema': Joi.object({
                        equals: Joi.number(),
                    }).label('Result')}
            }
        },
        validate: {
            payload:
                    {
                        ent_sess_token: Joi.string().required().description('Session Token'),
                        ent_card_id: Joi.string().required().description('CARD ID')
                    }
        }
    },
    handler: slaveModule.DeleteCard
});



server.route({
    method: 'POST', // Methods Type
    path: '/slave/card', // Url
    config: {// "tags" enable swagger to document API 
        tags: ['api', 'slave'],
        description: 'Add card',
        notes: "Add card", // We use Joi plugin to validate request 
        plugins: {
            'hapi-swagger': {
                payloadType: 'form'
            },
            responses: {
                '200': {
                    'description': 'Success',
                    'schema': Joi.object({
                        equals: Joi.number(),
                    }).label('Result')
                },
                '400': {'description': 'Bad Request',
                    'schema': Joi.object({
                        equals: Joi.number(),
                    }).label('Result')}
            }
        },
        validate: {
            payload:
                    {
                        ent_sess_token: Joi.string().required().description('Session Token'),
                        ent_expiry_month:Joi.string().required().description('card expiry month, eg: 12'),
                        exp_year:Joi.string().required().description('card expiry year, eg:2028'),
                        number:Joi.number().required().description('card number, eg:4242424242424242'),
                        cvc:Joi.string().required().description('cvc, eg:123')
                        // ent_card_token: Joi.string().required().description('CARD TOKEN')
                    }
        }
    },
    handler: slaveModule.AddCard
});



server.route({
    method: 'get', // Methods Type
    path: '/slave/categoryByLatLong/{ent_sess_token}/{ent_lat}/{ent_long}', // Url
    config: {// "tags" enable swagger to document API 
        tags: ['api', 'slave'],
        description: 'get category by latitude and Latitude',
        notes: "get category by Latitude and Longitude", // We use Joi plugin to validate request 
        plugins: {
            'hapi-swagger': {
                payloadType: 'form'
            },
            responses: {
                '200': {
                    'description': 'Success',
                    'schema': Joi.object({
                        equals: Joi.number(),
                    }).label('Result')
                },
                '400': {'description': 'Bad Request',
                    'schema': Joi.object({
                        equals: Joi.number(),
                    }).label('Result')}
            }
        },
        validate: {
            params:
                    {
                        ent_sess_token: Joi.string().required().description('Session Token'),
                        ent_lat: Joi.string().required().description('Latitude'),
                        ent_long: Joi.string().required().description('Longitude')
                    }
        }
    },
    handler: slaveModule.categoryByLatLong
});


server.route({
    method: 'get', // Methods Type
    path: '/slave/categoryAvailable/{ent_sess_token}/{ent_cat_id}/{ent_lat}/{ent_long}', // Url
    config: {// "tags" enable swagger to document API 
        tags: ['api', 'slave'],
        description: 'check category available or not in perticular location',
        notes: "check category available or not in perticular location", // We use Joi plugin to validate request 
        plugins: {
            'hapi-swagger': {
                payloadType: 'form'
            },
            responses: {
                '200': {
                    'description': 'Success',
                    'schema': Joi.object({
                        equals: Joi.number(),
                    }).label('Result')
                },
                '400': {'description': 'Bad Request',
                    'schema': Joi.object({
                        equals: Joi.number(),
                    }).label('Result')}
            }
        },
        validate: {
            params:
                    {
                        ent_sess_token: Joi.string().required().description('Session Token'),
                        ent_cat_id: Joi.string().required().description('Category Id'),
                        ent_lat: Joi.string().required().description('Latitude'),
                        ent_long: Joi.string().required().description('Longitude')
                    }
        }
    },
    handler: slaveModule.categoryAvailable
});


server.route({
    method: 'get', // Methods Type
    path: '/slave/logout/{ent_sess_token}', // Url
    config: {// "tags" enable swagger to document API 
        tags: ['api', 'slave'],
        description: 'make logout',
        notes: "logout", // We use Joi plugin to validate request 
        plugins: {
            'hapi-swagger': {
                payloadType: 'form'
            },
            responses: {
                '200': {
                    'description': 'Success',
                    'schema': Joi.object({
                        equals: Joi.number(),
                    }).label('Result')
                },
                '400': {'description': 'Bad Request',
                    'schema': Joi.object({
                        equals: Joi.number(),
                    }).label('Result')}
            }
        },
        validate: {
            params:
                    {
                        ent_sess_token: Joi.string().required().description('Session Token')
                    }
        }
    },
    handler: slaveModule.logout
});



server.route({
    method: 'get', // Methods Type
    path: '/slave/checkMobile/{ent_mobile}', // Url
    config: {// "tags" enable swagger to document API 
        tags: ['api', 'slave'],
        description: 'check mobile availabel or not',
        notes: "check mobile availabel or not", // We use Joi plugin to validate request 
        plugins: {
            'hapi-swagger': {
                payloadType: 'form'
            },
            responses: {
                '200': {
                    'description': 'Success',
                    'schema': Joi.object({
                        equals: Joi.number(),
                    }).label('Result')
                },
                '400': {'description': 'Bad Request',
                    'schema': Joi.object({
                        equals: Joi.number(),
                    }).label('Result')}
            }
        },
        validate: {
            params:
                    {
                        ent_mobile: Joi.string().required().description('Mobile Number WithOut Country Code')
                    }
        }
    },
    handler: slaveModule.checkMobile
});


server.route({
    method: 'get', // Methods Type
    path: '/slave/checkEmail/{ent_email}', // Url
    config: {// "tags" enable swagger to document API 
        tags: ['api', 'slave'],
        description: 'check email availabel or not',
        notes: "check email availabel or not", // We use Joi plugin to validate request 
        plugins: {
            'hapi-swagger': {
                payloadType: 'form'
            },
            responses: {
                '200': {
                    'description': 'Success',
                    'schema': Joi.object({
                        equals: Joi.number(),
                    }).label('Result')
                },
                '400': {'description': 'Bad Request',
                    'schema': Joi.object({
                        equals: Joi.number(),
                    }).label('Result')}
            }
        },
        validate: {
            params:
                    {
                        ent_email: Joi.string().required().description('email')
                    }
        }
    },
    handler: slaveModule.checkEmail
});



server.route({
    method: 'get', // Methods Type
    path: '/slave/profile/{ent_sess_token}', // Url
    config: {// "tags" enable swagger to document API 
        tags: ['api', 'slave'],
        description: 'get profile data',
        notes: "get profile data", // We use Joi plugin to validate request 
        plugins: {
            'hapi-swagger': {
                payloadType: 'form'
            },
            responses: {
                '200': {
                    'description': 'Success',
                    'schema': Joi.object({
                        equals: Joi.number(),
                    }).label('Result')
                },
                '400': {'description': 'Bad Request',
                    'schema': Joi.object({
                        equals: Joi.number(),
                    }).label('Result')}
            }
        },
        validate: {
            params:
                    {
                        ent_sess_token: Joi.string().required().description('Session token')
                    }
        }
    },
    handler: slaveModule.profile
});


server.route({
    method: 'get', // Methods Type
    path: '/slave/city/{ent_sess_token}', // Url
    config: {// "tags" enable swagger to document API 
        tags: ['api', 'slave'],
        description: 'get list of city',
        notes: "get list of city", // We use Joi plugin to validate request 
        plugins: {
            'hapi-swagger': {
                payloadType: 'form'
            },
            responses: {
                '200': {
                    'description': 'Success',
                    'schema': Joi.object({
                        equals: Joi.number(),
                    }).label('Result')
                },
                '400': {'description': 'Bad Request',
                    'schema': Joi.object({
                        equals: Joi.number(),
                    }).label('Result')}
            }
        },
        validate: {
            params:
                    {
                        ent_sess_token: Joi.string().required().description('Session token')
                    }
        }
    },
    handler: slaveModule.city
});

server.route({
    method: 'get', // Methods Type
    path: '/slave/resetWithEmail/{ent_email}', // Url
    config: {// "tags" enable swagger to document API 
        tags: ['api', 'slave'],
        description: 'reset password with Email',
        notes: "reset password with Email", // We use Joi plugin to validate request 
        plugins: {
            'hapi-swagger': {
                payloadType: 'form'
            },
            responses: {
                '200': {
                    'description': 'Success',
                    'schema': Joi.object({
                        equals: Joi.number(),
                    }).label('Result')
                },
                '400': {'description': 'Bad Request',
                    'schema': Joi.object({
                        equals: Joi.number(),
                    }).label('Result')}
            }
        },
        validate: {
            params:
                    {
                        ent_email: Joi.string().required().description('Email iD')
                    }
        }
    },
    handler: slaveModule.resetWithEmail
});


server.route({
    method: 'get', // Methods Type
    path: '/slave/changePassword/{ent_password}/{ent_token}', // Url
    config: {// "tags" enable swagger to document API 
        tags: ['api', 'slave'],
        description: 'reset new password with Email',
        notes: "reset new password with Email", // We use Joi plugin to validate request 
        plugins: {
            'hapi-swagger': {
                payloadType: 'form'
            },
            responses: {
                '200': {
                    'description': 'Success',
                    'schema': Joi.object({
                        equals: Joi.number(),
                    }).label('Result')
                },
                '400': {'description': 'Bad Request',
                    'schema': Joi.object({
                        equals: Joi.number(),
                    }).label('Result')}
            }
        },
        validate: {
            params:
                    {
                        ent_password: Joi.string().required().description('new password'),
                        ent_token:Joi.string().required().description('token generated')
                    }
        }
    },
    handler: slaveModule.changePassword
});

server.route({
    method: 'put', // Methods Type
    path: '/slave/setNewPassword/{ent_token}', // Url
    config: {// "tags" enable swagger to document API 
        tags: ['api', 'slave'],
        description: 'set new password with EmailId',
        notes: "reset new password with Email", // We use Joi plugin to validate request 
        plugins: {
            'hapi-swagger': {
                payloadType: 'form'
            },
            responses: {
                '200': {
                    'description': 'Success',
                    'schema': Joi.object({
                        equals: Joi.number(),
                    }).label('Result')
                },
                '400': {'description': 'Bad Request',
                    'schema': Joi.object({
                        equals: Joi.number(),
                    }).label('Result')}
            }
        },
        validate: {
            params:
                    {
                        ent_token:Joi.string().required().description('token generated')
                    },
            payload:{
                      ent_old_password:Joi.string().required().description('old password'),
                      ent_new_password:Joi.string().required().description('new password')

            }        
        }
    },
    handler: slaveModule.setNewPassword
});

server.route({
    method: 'get', // Methods Type
    path: '/slave/invoice/{ent_bookingId}/{ent_token}', // Url
    config: {// "tags" enable swagger to document API 
        tags: ['api', 'slave'],
        description: 'get invoice details from booking ID',
        notes: "get invoice details from booking ID", // We use Joi plugin to validate request 
        plugins: {
            'hapi-swagger': {
                payloadType: 'form'
            },
            responses: {
                '200': {
                    'description': 'Success',
                    'schema': Joi.object({
                        equals: Joi.number(),
                    }).label('Result')
                },
                '400': {'description': 'Bad Request',
                    'schema': Joi.object({
                        equals: Joi.number(),
                    }).label('Result')}
            }
        },
        validate: {
            params:
                    {
                        ent_bookingId: Joi.any().required().description('bookingId'),
                        ent_token:Joi.string().required().description('token generated')
                    }
        }
    },
    handler: slaveModule.invoice
});

server.route({
    method: 'get', // Methods Type
    path: '/slave/verifyCode/{ent_mobile}/{ent_code}/{ent_service}', // Url
    config: {// "tags" enable swagger to document API 
        tags: ['api', 'slave'],
        description: 'verify Code',
        notes: "Verify Code", // We use Joi plugin to validate request 
        plugins: {
            'hapi-swagger': {
                payloadType: 'form'
            },
            responses: {
                '200': {
                    'description': 'Success',
                    'schema': Joi.object({
                        equals: Joi.number(),
                    }).label('Result')
                },
                '400': {'description': 'Bad Request',
                    'schema': Joi.object({
                        equals: Joi.number(),
                    }).label('Result')}
            }
        },
        validate: {
            params:
                    {
                        ent_mobile: Joi.string().required().description('mobileNo with country code'),
                        ent_code: Joi.string().required().description('otp code'),
                        ent_service: Joi.string().required().description('1-SIGNUP,  2-FORGOT'),
                    }
        }
    },
    handler: slaveModule.verifyCode
});

server.route({
    method: 'put', // Methods Type
    path: '/slave/promoCodeDiscount/{ent_prmoCode}/{ent_token}', // Url
    config: {// "tags" enable swagger to document API 
        tags: ['api', 'slave'],
        description: 'get promo code discount',
        notes: "get promo code discount", // We use Joi plugin to validate request 
        plugins: {
            'hapi-swagger': {
                payloadType: 'form'
            },
            responses: {
                '200': {
                    'description': 'Success',
                    'schema': Joi.object({
                        equals: Joi.number(),
                    }).label('Result')
                },
                '400': {'description': 'Bad Request',
                    'schema': Joi.object({
                        equals: Joi.number(),
                    }).label('Result')}
            }
        },
        validate: {
            params:
                    {
                        ent_prmoCode: Joi.string().required().description('promo code for discount'),
                        ent_token: Joi.string().required().description('session token')
                    },
            payload:
                   {
                     ent_booking_id: Joi.string().description('Job id for which you are applying coupon code'),
                     ent_slave_id:Joi.any().description('customer id')
                   }        
        }
    },
    handler: slaveModule.promoCodeDiscount
});


// =============== DISPATCHER MODULE ========================================================================== //
var dispatcher = require('./models/dispatcher');

server.route({
    method: 'POST', // Methods Type
    path: '/dispatcher/sendBooking', // Url
    config: {// "tags" enable swagger to document API 
        tags: ['api', 'slave'],
        description: 'Send Booking to Provider',
        notes: "store booking detials in db", // We use Joi plugin to validate request 
        plugins: {
            'hapi-swagger': {
                payloadType: 'form'
            },
            responses: {
                '200': {
                    'description': 'Success',
                    'schema': Joi.object({
                        equals: Joi.number(),
                    }).label('Result')
                },
                '400': {'description': 'Bad Request',
                    'schema': Joi.object({
                        equals: Joi.number(),
                    }).label('Result')}
            }
        },
        validate: {
            payload:
                    {
                        ent_bid: Joi.string().required().description('Booking id'),
                        ent_pro_id: Joi.any().required().description('provider id')
                    }
        }
    },
    handler: dispatcher.sendBooking
});


server.route({
    method: 'POST', // Methods Type
    path: '/dispatcher/createBooking', // Url
    config: {// "tags" enable swagger to document API 
        tags: ['api', 'slave'],
        description: 'create Booking to Provider',
        notes: "store booking detials in db", // We use Joi plugin to validate request 
        plugins: {
            'hapi-swagger': {
                payloadType: 'form'
            },
            responses: {
                '200': {
                    'description': 'Success',
                    'schema': Joi.object({
                        equals: Joi.number(),
                    }).label('Result')
                },
                '400': {'description': 'Bad Request',
                    'schema': Joi.object({
                        equals: Joi.number(),
                    }).label('Result')}
            }
        },
        validate: {
            payload:
                    {
                        ent_cust_id: Joi.string().required().description('customer id'),
                        ent_cat_id: Joi.string().required().description('category id'),
                        ent_lat: Joi.number().required().description('job lat'),
                        ent_long: Joi.number().required().description('job long'),
                        ent_appnt_dt: Joi.string().required().description('appointment date YYYY-mm-dd HH:mm:ss'),
                        ent_date_time: Joi.string().required().description('Current Date time YYYY-mm-dd HH:mm:ss'),
                        ent_payment_type: Joi.string().required().description('1-CASH 2-CARD'),
                        ent_booking_type: Joi.string().required().description('1-Now ,2-Latter'),
                        ent_device_type: Joi.string().required().description('1-ANDORID, 2-IOS, 3-WEBSITE, 4-DISPATCHER'),
                        ent_address1: Joi.string().required().description('Address'),
                        ent_pro_id: Joi.any().required().description('provider id'),
                        ent_slot_id: Joi.any().description('slot id '),
                        ent_services: Joi.any().description('selected services'),
                        ent_coupon: Joi.string().description('coupen code'),
                        ent_card_id: Joi.description('card Token'),
                        ent_job_details: Joi.any().description('customer  note'),
                    }
        }
    },
    handler: dispatcher.createBooking
});


//server.route({
//    method: 'POST', // Methods Type
//    path: '/dispatcher/booking', // Url
//    config: {// "tags" enable swagger to document API 
//        tags: ['api', 'slave'],
//        description: 'get appointment data',
//        notes: "you need to pass  date and page index ", // We use Joi plugin to validate request 
//        plugins: {
//            'hapi-swagger': {
//                payloadType: 'json'
//            },
//            responses: {
//                '200': {
//                    'description': 'Success',
//                    'schema': Joi.object({
//                        equals: Joi.number(),
//                    }).label('Result')
//                },
//                '400': {'description': 'Bad Request',
//                    'schema': Joi.object({
//                        equals: Joi.number(),
//                    }).label('Result')}
//            }
//        },
//        validate: {
//            payload:
//                    {
//                        ent_sess_token: Joi.string().required().description('Session token'),
//                        ent_page_index: Joi.string().required().description('page index'),
//                        ent_end_date: Joi.any().description('end date YYYY-MM-DD'),
//                        ent_start_date: Joi.any().description('start date YYYY-MM-DD'),
//                        ent_lat: Joi.number().description('lat if need drivers'),
//                        ent_long: Joi.number().description('long if need drivers'),
//                        ent_booking_id: Joi.number().description('long if need drivers'),
//                    }
//
//
//        }
//    },
//    handler: dispatcher.appointments
//});
//
//server.route({
//    method: 'POST', // Methods Type
//    path: '/dispatcher/signup', // Url
//    config: {// "tags" enable swagger to document API 
//        tags: ['api', 'slave'],
//        description: 'signup',
//        notes: "signup", // We use Joi plugin to validate request 
//        plugins: {
//            'hapi-swagger': {
//                payloadType: 'form'
//            },
//            responses: {
//                '200': {
//                    'description': 'Success',
//                    'schema': Joi.object({
//                        equals: Joi.number(),
//                    }).label('Result')
//                },
//                '400': {'description': 'Bad Request',
//                    'schema': Joi.object({
//                        equals: Joi.number(),
//                    }).label('Result')}
//            }
//        },
//        validate: {
//            payload:
//                    {
//                        ent_email: Joi.string().email().required().description('email'),
//                        ent_password: Joi.string().required().description('password'),
//                        ent_phone: Joi.string().required().description('phone number'),
//                        ent_name: Joi.string().required().description('name'),
//                    }
//
//
//        }
//    },
//    handler: dispatcher.createDispacher
//});
//
//server.route({
//    method: 'post', // Methods Type
//    path: '/dispatcher/signin', // Url
//    config: {// "tags" enable swagger to document API 
//        tags: ['api', 'slave'],
//        description: 'dispacher signin',
//        notes: "signin", // We use Joi plugin to validate request 
//        plugins: {
//            'hapi-swagger': {
//                payloadType: 'form'
//            },
//            responses: {
//                '200': {
//                    'description': 'Success',
//                    'schema': Joi.object({
//                        equals: Joi.number(),
//                    }).label('Result')
//                },
//                '400': {'description': 'Bad Request',
//                    'schema': Joi.object({
//                        equals: Joi.number(),
//                    }).label('Result')}
//            }
//        },
//        validate: {
//            payload:
//                    {
//                        ent_email: Joi.string().email().required().description('email'),
//                        ent_password: Joi.string().required().description('password')
//                    }
//
//
//        }
//    },
//    handler: dispatcher.DispacherSignup
//});
//
//server.route({
//    method: 'POST', // Methods Type
//    path: '/dispatcher/livebooking', // Url
//    config: {// "tags" enable swagger to document API 
//        tags: ['api', 'slave'],
//        description: 'Booking request',
//        notes: "store booking detials in db", // We use Joi plugin to validate request 
//        plugins: {
//            'hapi-swagger': {
//                payloadType: 'json'
//            },
//            responses: {
//                '200': {
//                    'description': 'Success',
//                    'schema': Joi.object({
//                        equals: Joi.number(),
//                    }).label('Result')
//                },
//                '400': {'description': 'Bad Request',
//                    'schema': Joi.object({
//                        equals: Joi.number(),
//                    }).label('Result')}
//            }
//        },
//        validate: {
//            payload:
//                    {
//                        ent_wrk_type: Joi.string().required().description('Vehicle type'),
//                        ent_addr_line1: Joi.string().required().description('Pickup address'),
//                        ent_lat: Joi.number().required().description('Pickup lat'),
//                        ent_long: Joi.number().required().description('Pickup long'),
//                        ent_date_time: Joi.string().required().description('Date time'),
//                        ent_payment_type: Joi.string().required().description('Payment type'),
//                        ent_zone_pick: Joi.string().required().description('Pickupzone'),
//                        ent_zone_drop: Joi.string().required().description('Dropzone'),
//                        ent_amount: Joi.string().required().description('amount'),
//                        ent_drop_time: Joi.string().required().description('drop time'),
//                        token: Joi.string().required().description('Session token'),
//                        ent_dev_id: Joi.any().description('entDeviceId'),
//                        shipemnt_details: Joi.any().required(),
//                        ent_pas_email: Joi.any().description('user email'),
//                        ent_extra_notes: Joi.description('extra notes'),
//                        ent_appointment_dt: Joi.string().required().description('appointmnet date YYYY-mm-dd HH:ii:ss'),
//                        ent_drop_lat: Joi.string().required().description('drop latitude '),
//                        ent_drop_long: Joi.string().required().description('drop longitude'),
//                        ent_drop_addr_line1: Joi.string().required().description('drop address'),
//                        ent_appt_type: Joi.string().required().description(' 1- now ,2 - latter'),
//                        ent_zoneId_pickup: Joi.string().required().description('pickup zone id'),
//                        ent_zoneId_drop: Joi.string().required().description('drop zone id'),
//                        ent_distance: Joi.string().required().description('approx distance'),
//                        ent_category_id: Joi.string().required().description('category Id'),
//                        ent_category: Joi.string().required().description('category title'),
//                        ent_subcategory: Joi.any().description('subcategory'),
//                        ent_subsubcategory: Joi.any().description('subsubcategory'),
//                        ent_loadtype: Joi.string().required().description('loadtype'),
//                        ent_cutomer_name: Joi.string().required().description('cutomer_name'),
//                        ent_customer_phone: Joi.string().required().description('customer_phone')
//                    }
//        }
//    },
//    handler: dispatcher.livebooking
//});
//
//
//server.route({
//    method: 'POST', // Methods Type
//    path: '/dispatcher/book', // Url
//    config: {// "tags" enable swagger to document API 
//        tags: ['api', 'slave'],
//        description: 'Booking to spacific Driver',
//        notes: "palce booking", // We use Joi plugin to validate request 
//        plugins: {
//            'hapi-swagger': {
//                payloadType: 'json'
//            },
//            responses: {
//                '200': {
//                    'description': 'Success',
//                    'schema': Joi.object({
//                        equals: Joi.number(),
//                    }).label('Result')
//                },
//                '400': {'description': 'Bad Request',
//                    'schema': Joi.object({
//                        equals: Joi.number(),
//                    }).label('Result')}
//            }
//        },
//        validate: {
//            payload:
//                    {
//                        ent_email: Joi.string().required().description('Driver Email'),
//                        ent_bid: Joi.number().required().description('booking id'),
//                        token: Joi.string().required().description('Session token'),
//                    }
//        }
//    },
//    handler: dispatcher.book
//});
//
//server.route({
//    method: 'POST', // Methods Type
//    path: '/dispatcher/zone', // Url
//    config: {// "tags" enable swagger to document API 
//        tags: ['api', 'slave'],
//        description: 'find zone',
//        notes: "do we cover zone, flag 0 : yes and 1 : no", // We use Joi plugin to validate request 
//        plugins: {
//            'hapi-swagger': {
//                payloadType: 'json'
//            },
//            responses: {
//                '200': {
//                    'description': 'Success',
//                    'schema': Joi.object({
//                        equals: Joi.number(),
//                    }).label('Result')
//                },
//                '400': {'description': 'Bad Request',
//                    'schema': Joi.object({
//                        equals: Joi.number(),
//                    }).label('Result')}
//            }
//        },
//        validate: {
//            payload:
//                    {
//                        ent_lng: Joi.number().required().description('longitude'),
//                        ent_lat: Joi.number().required().description('latitude')
//
//                    }
//        }
//    },
//    handler: dispatcher.findZone
//});
//
//server.route({
//    method: 'get', // Methods Type
//    path: '/dispatcher/bookingConstant/{token}', // Url
//    config: {// "tags" enable swagger to document API 
//        tags: ['api', 'slave'],
//        description: 'vehicle type and spacialities',
//        notes: "get all vehicle type ", // We use Joi plugin to validate request 
//        plugins: {
//            'hapi-swagger': {
//                payloadType: 'form'
//            },
//            responses: {
//                '200': {
//                    'description': 'Success',
//                    'schema': Joi.object({
//                        equals: Joi.number(),
//                    }).label('Result')
//                },
//                '400': {'description': 'Bad Request',
//                    'schema': Joi.object({
//                        equals: Joi.number(),
//                    }).label('Result')}
//            }
//
//        }
//        ,
//        validate: {
//            params:
//                    {
//                        token: Joi.string().required().description('ent_sess_token'),
//                    }
//        }
//    },
//    handler: dispatcher.bookingConstant
//});
//server.route({
//    method: 'get', // Methods Type
//    path: '/dispatcher/Drivers/{token}', // Url
//    config: {// "tags" enable swagger to document API 
//        tags: ['api', 'slave'],
//        description: 'get all drivers',
//        notes: " ", // We use Joi plugin to validate request 
//        plugins: {
//            'hapi-swagger': {
//                payloadType: 'form'
//            },
//            responses: {
//                '200': {
//                    'description': 'Success',
//                    'schema': Joi.object({
//                        equals: Joi.number(),
//                    }).label('Result')
//                },
//                '400': {'description': 'Bad Request',
//                    'schema': Joi.object({
//                        equals: Joi.number(),
//                    }).label('Result')}
//            }
//
//        }
//        ,
//        validate: {
//            params:
//                    {
//                        token: Joi.string().required().description('ent_sess_token'),
//                    }
//        }
//    },
//    handler: dispatcher.getDrivers
//});
//
//server.route({
//    method: 'get', // Methods Type
//    path: '/dispatcher/drivers/{token}/{latitude}/{longitude}', // Url
//    config: {// "tags" enable swagger to document API 
//        tags: ['api', 'slave'],
//        description: 'get all the driver near by you',
//        notes: "before dispacheing booking to drivers, this api gives", // We use Joi plugin to validate request 
//        plugins: {
//            'hapi-swagger': {
//                payloadType: 'form'
//            },
//            responses: {
//                '200': {
//                    'description': 'Success',
//                    'schema': Joi.object({
//                        equals: Joi.number(),
//                    }).label('Result')
//                },
//                '400': {'description': 'Bad Request',
//                    'schema': Joi.object({
//                        equals: Joi.number(),
//                    }).label('Result')}
//            }
//
//        }
//        ,
//        validate: {
//            params:
//                    {
//                        latitude: Joi.number().required().description('latitude'),
//                        longitude: Joi.number().required().description('longitude'),
//                        token: Joi.string().required().description('ent_sess_token')
//                    }
//        }
//    },
//    handler: dispatcher.getallDriverNear
//});
//
//server.route({
//    method: 'get', // Methods Type
//    path: '/dispatcher/task/{token}/{mas_id}', // Url
//    config: {// "tags" enable swagger to document API 
//        tags: ['api', 'slave'],
//        description: 'get all the driver near by you',
//        notes: "before dispacheing booking to drivers, this api gives", // We use Joi plugin to validate request 
//        plugins: {
//            'hapi-swagger': {
//                payloadType: 'form'
//            },
//            responses: {
//                '200': {
//                    'description': 'Success',
//                    'schema': Joi.object({
//                        equals: Joi.number(),
//                    }).label('Result')
//                },
//                '400': {'description': 'Bad Request',
//                    'schema': Joi.object({
//                        equals: Joi.number(),
//                    }).label('Result')}
//            }
//
//        }
//        ,
//        validate: {
//            params:
//                    {
//                        mas_id: Joi.number().required().description('driver id'),
//                        token: Joi.string().required().description('ent_sess_token')
//                    }
//        }
//    },
//    handler: dispatcher.task
//});




var support = require('./models/support');
//
//server.route({
//    method: 'POST', // Methods Type
//    path: '/thirdParty/google', // Url
//    config: {// "tags" enable swagger to document API 
//        tags: ['api', 'slave'],
//        description: 'pass lat long and vehicle type id and get aprox fare',
//        notes: "getting distance and time", // We use Joi plugin to validate request 
//        plugins: {
//            'hapi-swagger': {
//                payloadType: 'form'
//            },
//            responses: {
//                '200': {
//                    'description': 'Success',
//                    'schema': Joi.object({
//                        equals: Joi.number(),
//                    }).label('Result')
//                },
//                '400': {'description': 'Bad Request',
//                    'schema': Joi.object({
//                        equals: Joi.number(),
//                    }).label('Result')}
//            }
//        },
//        validate: {
//            payload:
//                    {
//                        ent_wrk_type: Joi.string().required().description('Vehicle type'),
//                        token: Joi.string().required().description('token'),
//                        start_lat_long: Joi.string().required().description('13.0287036895752,77.5895080566406'),
//                        end_lat_long: Joi.string().required().description('13.0287036895752,77.5895080566406'),
//                    }
//
//
//        }
//    },
//    handler: support.googleMatrix
//});
//
//server.route({
//    method: 'POST', // Methods Type
//    path: '/thirdParty/twillio', // Url
//    config: {// "tags" enable swagger to document API 
//        tags: ['api', 'slave'],
//        description: 'pass lat long and vehicle type id and get aprox fare',
//        notes: "getting distance and time", // We use Joi plugin to validate request 
//        plugins: {
//            'hapi-swagger': {
//                payloadType: 'form'
//            },
//            responses: {
//                '200': {
//                    'description': 'Success',
//                    'schema': Joi.object({
//                        equals: Joi.number(),
//                    }).label('Result')
//                },
//                '400': {'description': 'Bad Request',
//                    'schema': Joi.object({
//                        equals: Joi.number(),
//                    }).label('Result')}
//            }
//        },
//        validate: {
//            payload:
//                    {
//                        mobile: Joi.string().required().description('proivde mobile number with country code'),
//                        token: Joi.string().required().description('token')
//                    }
//
//
//        }
//    },
//    handler: support.twillio
//});


// =============== MASTER MODULE ========================================================================== //
var masterModule = require('./models/master');

server.route({
    method: 'POST', // Methods Type
    path: '/master/signup', // Url
    config: {// "tags" enable swagger to document API 
        tags: ['api', 'slave'],
        description: 'Master signup',
        notes: "Master signup", // We use Joi plugin to validate request 
        plugins: {
            'hapi-swagger': {
                payloadType: 'form'
            },
            responses: {
                '200': {
                    'description': 'Success',
                    'schema': Joi.object({
                        equals: Joi.number(),
                    }).label('Result')
                },
                '400': {'description': 'Bad Request',
                    'schema': Joi.object({
                        equals: Joi.number(),
                    }).label('Result')}
            }
        },
        validate: {
            payload:
                    {
                        ent_first_name: Joi.string().required().description('First Name'),
                        ent_last_name: Joi.string().description('Last Name'),
                        ent_email: Joi.string().required().description('Email'),
                        ent_password: Joi.string().required().description('Password'),
                        ent_country_code: Joi.string().required().description('Country Code'),
                        ent_mobile: Joi.string().required().description('Mobile'),
                        ent_profile_pic: Joi.string().description('Profile Pic'),
                        ent_fees_group: Joi.string().required().description('1-MILAGE, 2-HOURLY, 3-FIXED'),
                        ent_city_id: Joi.string().required().description('CITY ID'),
                        ent_long: Joi.string().required().description('LONGITUDE'),
                        ent_lat: Joi.string().required().description('LATITUDE'),
                        ent_cat_list: Joi.any().required().description('CATEGORY LIST ARRAY'),
                        ent_date_time: Joi.string().required().description('Current Date time YYYY-mm-dd HH:mm:ss'),
                        ent_license: Joi.string().required().description('License Number')
                    }
        }
    },
    handler: masterModule.signup
});

server.route({
    method: 'get', // Methods Type
    path: '/master/checkMobile/{ent_mobile}', // Url
    config: {// "tags" enable swagger to document API 
        tags: ['api', 'slave'],
        description: 'check mobile availabel or not',
        notes: "check mobile availabel or not", // We use Joi plugin to validate request 
        plugins: {
            'hapi-swagger': {
                payloadType: 'form'
            },
            responses: {
                '200': {
                    'description': 'Success',
                    'schema': Joi.object({
                        equals: Joi.number(),
                    }).label('Result')
                },
                '400': {'description': 'Bad Request',
                    'schema': Joi.object({
                        equals: Joi.number(),
                    }).label('Result')}
            }
        },
        validate: {
            params:
                    {
                        ent_mobile: Joi.string().required().description('Mobile Number WithOut Country Code')
                    }
        }
    },
    handler: masterModule.checkMobile
});



server.route({
    method: 'get', // Methods Type
    path: '/master/checkEmail/{ent_email}', // Url
    config: {// "tags" enable swagger to document API 
        tags: ['api', 'slave'],
        description: 'check email availabel or not',
        notes: "check email availabel or not", // We use Joi plugin to validate request 
        plugins: {
            'hapi-swagger': {
                payloadType: 'form'
            },
            responses: {
                '200': {
                    'description': 'Success',
                    'schema': Joi.object({
                        equals: Joi.number(),
                    }).label('Result')
                },
                '400': {'description': 'Bad Request',
                    'schema': Joi.object({
                        equals: Joi.number(),
                    }).label('Result')}
            }
        },
        validate: {
            params:
                    {
                        ent_email: Joi.string().required().description('email')
                    }
        }
    },
    handler: masterModule.checkEmail
});


server.route({
    method: 'get', // Methods Type
    path: '/master/categoryByCity/{ent_city_id}', // Url
    config: {// "tags" enable swagger to document API 
        tags: ['api', 'slave'],
        description: 'get category by city',
        notes: "get category by city", // We use Joi plugin to validate request 
        plugins: {
            'hapi-swagger': {
                payloadType: 'form'
            },
            responses: {
                '200': {
                    'description': 'Success',
                    'schema': Joi.object({
                        equals: Joi.number(),
                    }).label('Result')
                },
                '400': {'description': 'Bad Request',
                    'schema': Joi.object({
                        equals: Joi.number(),
                    }).label('Result')}
            }
        },
        validate: {
            params:
                    {
                        ent_city_id: Joi.string().required().description('City Id')
                    }
        }
    },
    handler: masterModule.categoryByCity
});

server.route({
    method: 'get', // Methods Type
    path: '/master/city', // Url
    config: {// "tags" enable swagger to document API 
        tags: ['api', 'slave'],
        description: 'get list of city',
        notes: "get list of city", // We use Joi plugin to validate request 
        plugins: {
            'hapi-swagger': {
                payloadType: 'form'
            },
            responses: {
                '200': {
                    'description': 'Success',
                    'schema': Joi.object({
                        equals: Joi.number(),
                    }).label('Result')
                },
                '400': {'description': 'Bad Request',
                    'schema': Joi.object({
                        equals: Joi.number(),
                    }).label('Result')}
            }
        },
        validate: {
            params:
                    {
                    }
        }
    },
    handler: masterModule.city
});



// =============== Start our Server ======================================================== // Lets start the server 
server.start(function () {
    console.log('Server running at:', server.info.uri);
});

