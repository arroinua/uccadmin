var http = require('http');
var https = require('https');
var gateway = require('../env/index').gateway;
var url = gateway.split(':');
var debug = require('debug')('admin');
var fs = require('fs');
var ssl = require('../env/index').ssl;
var requestMethod = ssl ? https : http;

module.exports = {

	request: function(req, res, next){
		debug('headers: ', req.headers);
		var headers = req.headers;
		
		debug('request req.body: ', req.body);
		var params = req.body ? JSON.stringify(req.body) : '';
		debug('request params: ', params);

		var options = {
			hostname: url[0],
			port: url[1],
			method: 'POST',
			path: '/customer'+req.originalUrl,
			headers: {
				// 'Content-Type': headers['content-type']
				'Content-Type': 'application/json',
				'Content-Length': params.length
				// 'Content-Length': headers['content-length']
			},
			// auth: server.login+':'+server.password,
			// ca: ca,
			// rejectUnauthorized: true,
			agent: new requestMethod.Agent({keepAlive: true})
		};

		// if(ssl) options.cert = fs.readFileSync(ssl.publicKey);

		if(req.headers['x-access-token']){
			options.headers['x-access-token'] = req.headers['x-access-token'];
		}
		
		debug('post options: ', options);
		var apiRequest = requestMethod.request(options, function (apiResponse){

			apiResponse.setEncoding('utf8');

			var responseStr = '';

			apiResponse.on('data', function(data){
				responseStr += data;
			});

			apiResponse.on('end', function(){
				res.writeHead(
					apiResponse.statusCode,
					apiResponse.headers
				);
				if(!responseStr) {
					res.end();
				} else {
					debug('responseStr', responseStr);
					res.end(responseStr);
				}
				apiResponse.emit('close');
			});
		});

		apiRequest.on('error', function(err){
			next(new Error(err));
		});
		apiRequest.write(params);
		apiRequest.end();
	},

	get: function(req, res, next){
		var options = {
			hostname: url[0],
			port: url[1],
			method: 'GET',
			path: '/customer'+req.originalUrl,
			headers: {},
			// auth: server.login+':'+server.password,
			// ca: ca,
			// rejectUnauthorized: true,
			agent: new requestMethod.Agent({keepAlive: true})
		};

		// if(ssl) options.cert = fs.readFileSync(ssl.publicKey);

		if(req.headers['x-access-token']){
			options.headers['x-access-token'] = req.headers['x-access-token'];
		}
		// debug('get options', options);
		requestMethod.get(options, function (apiResponse){
			
			var responseStr = '';

			apiResponse.on('data', function(data){
				responseStr += data;
			});

			apiResponse.on('end', function(){

				res.writeHead(
					apiResponse.statusCode,
					apiResponse.headers
				);

				if(!responseStr) {
					res.end();
				} else {
					debug('responseStr', responseStr);
					res.write(responseStr);
					res.end();
				}
				apiResponse.emit('close');
			});
		}).on('error', function (e){
			next(new Error(e));
		});
	}
};