module.exports = {
	extend: function(a, b){
		for( var key in b ) {
		    if( b.hasOwnProperty( key ) ) {
		        a[key] = b[key];
		    }
		}
		return a;
	},

	getProxyProps: function(params) {
		return {
			target: (params.ssl ? 'https://' : 'http://') + params.gateway + '/' + (params.path || ''), // target host
			logLevel: params.logLevel || 'debug',
			onError: function(err, req, res){
				res.status(err.status || 500);
				res.render('error', {
					message: err.message,
					error: {}
				});
			}
		}
	}
};