var express = require('express');
var router = express.Router();
var path = require('path');

router.get('/', function(req, res, next){
	res.sendFile(path.resolve('client/index.html'));
});
router.get('/setup', function(req, res, next){
	res.sendFile(path.resolve('client/setup.html'));
});
// router.get('/checkout', function(req, res, next){
// 	res.sendFile(path.resolve('app/checkout.html'));
// });
// router.get('/client', function(req, res, next){
// 	res.sendFile(path.resolve('app/client.html'));
// });

module.exports = router;