var mongoClient = require('mongodb');
var mongoose = require('mongoose');
console.log('about to connect to ' + process.env.DB);

mongoose.connect(process.env.DB, { useMongoClient: true });