angular.module('app.auth')
.config(['$routeProvider', function($routeProvider){

	$routeProvider
		.when('/account-verification', {
			templateUrl: 'auth/verification.html',
			controller: 'AuthController',
			controllerAs: 'authVm'
		})
		.when('/request-password-reset', {
			templateUrl: 'auth/request-password-reset.html',
			controller: 'AuthController',
			controllerAs: 'authVm'
		})
		.when('/reset-password', {
			templateUrl: 'auth/reset-password.html',
			controller: 'AuthController',
			controllerAs: 'authVm'
		})
		.when('/login',{
			templateUrl: 'auth/login.html',
			controller: 'AuthController',
			controllerAs: 'authVm'
		})
		.when('/signup', {
			templateUrl: 'auth/signup.html',
			controller: 'AuthController',
			controllerAs: 'authVm'
		});

}]);