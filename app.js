var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var FileStreamRotator = require('file-stream-rotator');
var morgan = require('morgan');
var path = require('path');
var fs = require('fs');
var http = require('http');
var https = require('https');
var config = require('./env/index');
var utils = require('./lib/utils');
var logDir = __dirname + '/log';
var proxy = require('http-proxy-middleware');
var options = {};

// var proxyOptions = {
//   target: (config.ssl ? 'https://' : 'http://') + config.gateway + '/customer', // target host 
//   logLevel: 'debug',
//   onError: function(err, req, res){
//     res.status(err.status || 500);
//     res.render('error', {
//       message: err.message,
//       error: {}
//     });
//   }
// };

// create the proxy 
var subsProxy = proxy('/subscribers', utils.getProxyProps({
  ssl: config.ssl,
  gateway: config.gateway,
  path: 'subscribers'
}));
var apiProxy = proxy('/api', utils.getProxyProps({
  ssl: config.ssl,
  gateway: config.gateway,
  path: 'customer'
}));

// create a rotating write stream 
var accessLogStream = FileStreamRotator.getStream({
  date_format: 'YYYYMMDD',
  filename: logDir + '/access-%DATE%.log',
  frequency: 'daily',
  verbose: false
});

// ensure log directory exists 
fs.existsSync(logDir) || fs.mkdirSync(logDir);

// setup the logger 
app.use(morgan('combined', {stream: accessLogStream}));

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'html');
app.engine('html', require('hbs').__express);

app.use(function(req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type, Authorization');
    next();
});
app.use(express.static(path.join(__dirname, 'client')));

// app.use(bodyParser.json());
// app.use(bodyParser.urlencoded({ extended: true }));

// use Proxy
app.use(subsProxy);
app.use(apiProxy);
// app.use('/api', require('./routes/api'));
app.use('/', require('./routes/index'));

//===============Error handlers================

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
    console.log(err);
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});

//===============Start Server================

http.createServer(app).listen(config.port);
console.log('App is listening at http port %s', config.port);

if(config.ssl) {
  options = {
    key: fs.readFileSync(config.ssl.key),
    cert: fs.readFileSync(config.ssl.cert)
  };

  https.createServer(options, app).listen(config.port+1);
  console.log('App is listening at https port %s', config.port+1);
}
