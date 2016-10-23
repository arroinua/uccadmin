(function(){

	'use strict';

	angular
		.module('app')
		.factory('authService', authService);

	authService.$inject = ['$q', '$timeout', '$location', '$rootScope', '$http', '$localStorage', 'appConfig', 'customerService'];

	function authService($q, $timeout, $location, $rootScope, $http, $localStorage, appConfig, customerService){

		var baseUrl = appConfig.server;
		var init = false;

		return {
			signup: signup,
			login: login,
			requestPasswordReset: requestPasswordReset,
			resetPassword: resetPassword,
			isLoggedIn: isLoggedIn,
			logout: logout,
			isAuthorized: isAuthorized
		};

		function signup(data) {
			return $http.post(baseUrl + '/api/signup', data);
		}

		function login(data) {
			return $http.post(baseUrl + '/api/login', data);
		}

		function requestPasswordReset(data) {
			return  $http.post(baseUrl + '/api/requestPasswordReset', data);
		}

		function resetPassword(data) {
			return $http.post(baseUrl + '/api/resetPassword', data);
		}

		function logout() {
			delete $localStorage.token;

			// Clear authorized customer data
			customerService.clearCurrentCustomer();

			// Emit event when customer logged out to the console
			$rootScope.$emit('auth.logout');

			init = false;

			$location.path('/login');
		}

		function isLoggedIn(){
			return init;
		}

		function loggedIn(data) {
			console.log('loggedIn: ', data);
			// Set authorized customer data
			if(data.customer) {
				customerService.setCustomer(data.customer);
	
				// Emit event when customer data updated
				$rootScope.$emit('customer.update', data.customer);
			}


			if(!init) {
				// Emit event when customer logged in to the console
				$rootScope.$emit('auth.login');
				init = true;
			}
		}

		function isAuthorized() {
			if(customerService.getCustomer()) return;

			var deferred = $q.defer(); // Make an AJAX call to check if the user is logged in 
			$http.get('/api/loggedin').then(function(res){
				loggedIn(res.data);
				deferred.resolve();
			}, function (err){
				deferred.reject();
				logout();
				// $location.path('/login');
			});
			return deferred.promise;
		}

	}

})();