var express = require('express');
var router = express.Router();
var apiGateway = require('../controllers/apiGateway');

router.post('/*', apiGateway.request);
router.get('/*', apiGateway.get);

// router.post('/:method', function (req, res, next){
// 	var method = apiCtrl[req.params.method];
// 	// if(method)
// 		apiGateway({gateway: gateway, method: method, params: req.body}, function (err, result){
// 			if(err){
// 				next(new Error(err));
// 			} else {
// 				res.send(result);
// 			}
// 		});
// 	// else
// 		// next(new Error('Method is not implemented'));
// });

module.exports = router;