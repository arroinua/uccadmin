angular.module('app.instance')
.config(['$routeProvider', function($routeProvider){

	$routeProvider
		.when('/instance/:oid', {
			templateUrl: 'instance/instance.html',
			controller: 'InstanceController',
			controllerAs: 'instVm',
			resolve: {
				loggedin: isAuthorized
			}
		});

}]);

isAuthorized.$inject = ['authService'];
function isAuthorized(authService) {
	return authService.isAuthorized();
}