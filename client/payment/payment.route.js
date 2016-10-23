angular.module('app.payment')
.config(['$routeProvider', function($routeProvider){

	$routeProvider
		.when('/payment', {
			templateUrl: 'payment/payment.html',
			controller: 'PaymentController',
			controllerAs: 'payVm',
			resolve: {
				loggedin: isAuthorized
			}
		});

}]);

isAuthorized.$inject = ['authService'];
function isAuthorized(authService) {
	return authService.isAuthorized();
}