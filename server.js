require('dotenv').config({ path: './.env' });
var app = require('./app');
var port = process.env.PORT || 3000;
var ip = process.env.IP || "don't know where";

console.log('In server.js');
var server = app.listen(port, function() {
  console.log('Express server listening on port ' + ip + ":" + port);
});