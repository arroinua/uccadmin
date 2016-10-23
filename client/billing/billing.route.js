angular.module('app.billing')
.config(['$routeProvider', function($routeProvider){

	$routeProvider
		.when('/billing', {
			templateUrl: 'billing/billing.html',
			controller: 'BillingController',
			controllerAs: 'billVm',
			resolve: {
				loggedin: isAuthorized
			}
		});

}]);

isAuthorized.$inject = ['authService'];
function isAuthorized(authService) {
	return authService.isAuthorized();
}