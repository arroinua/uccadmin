module.exports = {
	extend: function(a, b){
		for( var key in b ) {
		    if( b.hasOwnProperty( key ) ) {
		        a[key] = b[key];
		    }
		}
		return a;
	},

	getProxyProps: function(path, logLevel) {
		target: (config.ssl ? 'https://' : 'http://') + config.gateway + '/' + path, // target host
		logLevel: logLevel,
		onError: function(err, req, res){
			res.status(err.status || 500);
			res.render('error', {
				message: err.message,
				error: {}
			});
		}
	}
};