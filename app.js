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
var helmet = require('helmet');
var cors = require('cors');
var options = {};

app.use(helmet());
app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    styleSrc: ["'self'", "'unsafe-inline'"],
    imgSrc: ["'self'"]
  }
}));

app.use(cors({
  origin: ['https://ringotel.co', /\.ringotel\.co$/],
  methods: ['GET', 'POST'],
  allowHeaders: ['X-Requested-With', 'Content-Type', 'Authorization'],
  optionsSuccessStatus: 200
}));

// create the proxy 
var subsProxy = proxy('/subscribers', utils.getProxyProps({
  ssl: config.ssl,
  gateway: config.gateway,
  path: ''
}));
var resellerProxy = proxy('/reseller', utils.getProxyProps({
  ssl: config.ssl,
  gateway: config.gateway,
  path: ''
}));
var userProxy = proxy('/user', utils.getProxyProps({
  ssl: config.ssl,
  gateway: config.gateway,
  path: ''
}));
var branchProxy = proxy('/branch', utils.getProxyProps({
  ssl: config.ssl,
  gateway: config.gateway,
  path: ''
}));
var apiProxy = proxy('/api', utils.getProxyProps({
  ssl: config.ssl,
  gateway: config.gateway,
  path: ''
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

app.use(express.static(path.join(__dirname, 'client')));

app.use('/', require('./routes/index'));
app.use('/setup', require('./routes/index'));
// use Proxy
app.use(subsProxy);
app.use(resellerProxy);
app.use(userProxy);
app.use(branchProxy);
app.use(apiProxy);

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

  // console.log(fs.readFileSync(config.ssl.cert, { encoding: 'utf8' }));

  options = {
    key: fs.readFileSync(config.ssl.key),
    cert: fs.readFileSync(config.ssl.cert)
  };

  https.createServer(options, app).listen(config.port+1);
  console.log('App is listening at https port %s', config.port+1);
}
