angular.module('app.routes', [
	'ngRoute'
])
.config(['$routeProvider', function($routeProvider){

	function verifyUser($q, $http, $location) {
		var deferred = $q.defer(); // Make an AJAX call to check if the user is logged in
		var verified = false;
		$http.get('/api/verify?ott='+$location.search().ott).then(function (res){
			if (res.success){ // Authenticated
				deferred.resolve();
				verified = true;
			} else { // Not Authenticated
				deferred.reject();
			}
			$location.url('/account-verification?verified='+verified);
		}, function (err){
			console.log(err);
		});
		return deferred.promise;
	}

	$routeProvider.
		when('/verify', {
			resolve: {
				verified: verifyUser
			}
		}).
		otherwise({
			redirectTo: '/dashboard'
		});
}]);