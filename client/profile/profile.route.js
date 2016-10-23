angular.module('app.profile')
.config(['$routeProvider', function($routeProvider){

	$routeProvider
		.when('/profile', {
			templateUrl: 'profile/profile.html',
			controller: 'ProfileController',
			controllerAs: 'profileVm',
			resolve: {
				loggedin: isAuthorized
			}
		});

}]);

isAuthorized.$inject = ['authService'];
function isAuthorized(authService) {
	return authService.isAuthorized();
}