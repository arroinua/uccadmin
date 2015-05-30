var express = require('express');
var router = express.Router();
var jwt = require('jsonwebtoken');
var bcrypt = require('bcrypt');
var User = require('../models/users');

var isValidPassword = function(password, hash){
    bcrypt.compare(password, hash, function(err, isMatch){
        if(err) throw err;
        // cb(isMatch);
        return isMatch;
    });
};

module.exports = function(app){

	router.post('/login', function(req, res, next){
		User.findOne({email: req.body.email}, function(err, user){
			if(err){
				res.json({
					success: false,
					message: "Error occured: " + err
				});
			} else {
				if(user){
					if(!isValidPassword(req.body.password, user.password)){
						res.json({
							success: false,
							message: 'Login failed. Invalid email/password.'
						});
					} else {
						var token = jwt.sign(user, app.get('jwtSecret'), {
							expiresInMinutes: 1440 //expires in 24 hours
						});

						res.json({
							success: true,
							data: user,
							token: token
						});
					}
				} else {
					res.json({
						success: false,
						message: "Login failed. Invalid email/password."
					});
				}
			}
		});
	});

	router.post('/signin', function(req, res, next){
		User.findOne({email: req.body.email}, function(err, user){
			if(err){
				res.json({
					success: false,
					message: "Error occured: " + err
				});
			} else {
				if(user){
					res.json({
						success: false,
						message: "User already exists!"
					});
				} else {
					var userModel = new User();
					userModel.email = req.body.email;
					userModel.name = req.body.name;
					userModel.password = req.body.password;
					userModel.created = Date.now();
					userModel.save(function(err, user){
						if (err){
							next(new Error('Error in Saving user: '+err));
						} else {
							var token = jwt.sign(user, app.get('jwtSecret'), {
								expiresInMinutes: 1440 //expires in 24 hours
							});

							res.json({
								success: true,
								data: user,
								token: token
							});
						}
					});
				}
			}
		});
	});

	router.use(function(req, res, next){
		// check header or url parameters or post parameters for token
		var token = req.body.token || req.query.token || req.headers['x-access-token'];

		// decode token
		if (token) {

			// verifies secret and checks exp
			jwt.verify(token, app.get('jwtSecret'), function(err, decoded) {
				if (err) {
					return res.json({ success: false, message: 'Failed to authenticate token.' });
				} else {
				// if everything is good, save to request for use in other routes
					req.decoded = decoded;
					next();
				}
			});
		} else {

			// if there is no token
			// return an error
			return res.status(403).send({
				success: false,
				message: 'No token provided.'
			});
		}
	});

	router.post('/dashboard', function(req, res, next){
		res.json({
			success: true,
			message: "You're in!"
		});
	});

	return router;
};