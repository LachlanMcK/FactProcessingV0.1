//LM fudge assumed globals until get the windows dependency removed
const { addMissingBrowserStuff } = require("./addMissingBrowserStuff");
addMissingBrowserStuff();

var express = require('express');
var app = express();
var fs = require('fs')
var morgan = require('morgan');

// todo: evaluate amdrequire (http://arqex.com/874/reusing-require-js-modules-node-js) or similar vs amd-loader (https://github.com/ajaxorg/node-amd-loader)
// so far picked https://www.npmjs.com/package/amd-loader as more weekly downloads -- moo  https://www.npmjs.com/package/requirejs
// or 'amdefine'

// create a write stream (in append mode)
var accessLogStream = fs.createWriteStream(__dirname + '/access.log', {flags: 'a'})

// setup the logger
// app.use(morgan('combined', {stream: accessLogStream}))
// console.log('Logging to: ' + accessLogStream.path);
app.use(morgan('dev'))

var secureCodingCheck = require('./Security/doSecureCodingChecks');

var checkAuthentication = require('./Security/checkAuthentication');

var checkAuthorisation = require('./Security/checkAuthorisation');

app.disable('x-powered-by')

var db = require('./db');

//var UserController = require('./user/UserController');
var FormController = require('./form/FormController');

var stp = require('./jsre/forms/oTH_PAYROLL_EVENT_CHILDValidate');

var options = function (opt) {
    return function (err,request, response,next){
        next();
    }
}

//this is just me playing around with idea of options
app.use(options({opt:1}));

app.param('ClientIdentifierType', function(req,res, next){
    //todo: dodgy
    // req.Client = {ClientInternalId: 12345};
    // next();
})

console.log('Inside app.js');
//app.use('/users', UserController);

//app.use('/forms', [secureCodingCheck.doCleanInputCheck, checkAuthentication, checkAuthorisation], FormController);

//todo: can't send everything to forms controller
//app.use('/api/v1/Clients', [secureCodingCheck.doCleanInputCheck, checkAuthentication, checkAuthorisation], FormController);
app.use('/api/v1/Clients', FormController);

module.exports = app;