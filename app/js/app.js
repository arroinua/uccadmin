var dashApp = angular.module('dashApp', [
	'ngRoute',
	'ngStorage',
	'ngSanitize',
	'pascalprecht.translate',
	'angularModalService',
	'tc.chartjs',
	'ngNotificationsBar',
	'720kb.datepicker'
])
.constant('appConfig', {
	server: window.location.protocol + '//' + window.location.host
})
.config(['$routeProvider', function($routeProvider){

	var verifyUser = function($q, $http, $location){
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
	};

	var checkLoggedin = function($q, $timeout, $http, $location, $rootScope){
		var deferred = $q.defer(); // Make an AJAX call to check if the user is logged in 
		$http.get('/api/loggedin').then(function(res){
			deferred.resolve();
		}, function (err){
			deferred.reject();
			$location.path('/login');
		});
		return deferred.promise;
	};

	$routeProvider.
		when('/verify', {
			resolve: {
				verified: verifyUser
			}
		}).
		when('/account-verification', {
			templateUrl: 'views/verification.html',
			controller: 'VerifyController'
		}).
		when('/request-password-reset', {
			templateUrl: 'views/request-password-reset.html',
			controller: 'AuthController'
		}).
		when('/reset-password', {
			templateUrl: 'views/reset-password.html',
			controller: 'AuthController'
		}).
		when('/login',{
			templateUrl: 'views/login.html',
			controller: 'AuthController'
		}).
		when('/signup', {
			templateUrl: 'views/signup.html',
			controller: 'AuthController'
		}).
		when('/dashboard', {
			templateUrl: 'views/dashboard.html',
			controller: 'DashController',
			resolve: {
				loggedin: checkLoggedin
			}
		}).
		when('/instance/:oid', {
			templateUrl: 'views/instance.html',
			controller: 'InstanceController',
			resolve: {
				loggedin: checkLoggedin
			}
		}).
		when('/instances', {
			templateUrl: 'views/instances.html',
			controller: 'InstsController',
			resolve: {
				loggedin: checkLoggedin
			}
		}).
		when('/profile/:id', {
			templateUrl: 'views/profile.html',
			controller: 'ProfileController',
			resolve: {
				loggedin: checkLoggedin
			}
		}).
		when('/payment', {
			templateUrl: 'views/payment.html',
			controller: 'PaymentController',
			resolve: {
				loggedin: checkLoggedin
			}
		}).
		when('/transactions', {
			templateUrl: 'views/transactions.html',
			controller: 'TransactionsController',
			resolve: {
				loggedin: checkLoggedin
			}
		}).
		when('/charges', {
			templateUrl: 'views/charges.html',
			controller: 'ChargesController',
			resolve: {
				loggedin: checkLoggedin
			}
		}).
		otherwise({
			redirectTo: '/dashboard'
		});
}])
.config(['$httpProvider', function($httpProvider) {
	$httpProvider.interceptors.push(['$q', '$rootScope', '$location', '$localStorage', function($q, $rootScope, $location, $localStorage) {
        return {
			request: function(config) {
				config.headers = config.headers || {};
				if ($localStorage.token) {
					config.headers['x-access-token'] = $localStorage.token;
				}
				return config;
			},
			responseError: function(error) {
				if(error.status === 401 || error.status === 403) {
					$location.path('/login');
				}
				return $q.reject(error);
			},
			response: function(response){
				if(response.data.customer && !$rootScope.currentUser){
					$rootScope.currentUser = response.data.customer;
				}
				return response;
			}
        };
	}]);
}])
.config(['notificationsConfigProvider', function (notificationsConfigProvider) {
    notificationsConfigProvider.setAutoHide(true);
    notificationsConfigProvider.setHideDelay(5000);
    notificationsConfigProvider.setAutoHideAnimation('fadeOutNotifications');
    notificationsConfigProvider.setAutoHideAnimationDelay(500);
	notificationsConfigProvider.setAcceptHTML(true);
}])
.config(['$translateProvider', function($translateProvider) {
	$translateProvider.useStaticFilesLoader({
		prefix: '/translations/locale-',
		suffix: '.json'
	});
	$translateProvider.preferredLanguage('en');
	$translateProvider.fallbackLanguage('en');
	$translateProvider.useStorage('storage');
	$translateProvider.useSanitizeValueStrategy('sanitize');
}]);