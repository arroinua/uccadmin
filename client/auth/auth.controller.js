(function(){

	'use strict';

	angular
		.module('app.auth')
		.controller('AuthController', AuthController);

	AuthController.$inject = ['$rootScope', '$location', '$localStorage', '$translate', 'authService', 'errorService', 'spinnerService'];

	function AuthController($rootScope, $location, $localStorage, $translate, authService, errorService, spinnerService) {

		if($location.path() === '/login')
			$rootScope.title = 'LOGIN';
		else if($location.path() === '/signup')
			$rootScope.title = 'REGISTRATION';
		else if($location.path() === '/account-verification')
			$rootScope.title = 'EMAIL_VERIFICATION';
		else if($location.path() === '/request-password-reset' || $location.path() === '/reset-password')
			$rootScope.title = 'RESET_PASSWORD';

		var vm = this;
		vm.verificationSent = false;
		vm.verified = $location.search().verified === 'true' ? true : false;
		vm.requestSent = false;
		vm.email = '';
		vm.name = '';
		vm.password = '';
		vm.signup = signup;
		vm.login = login;
		vm.requestPasswordReset = requestPasswordReset;
		vm.resetPassword = resetPassword;
		vm.logout = logout;


		function signup() {
			var fdata = {
				email: vm.email,
				name: vm.name,
				password: vm.password,
				lang: $localStorage.NG_TRANSLATE_LANG_KEY || 'en'
			};
			authService.signup(fdata).then(function (res){
				vm.verificationSent = true;
			}, function (err){
				if(err.message === 'MULTIPLE_SIGNUP') {
					$location.path('/resignup');
				}
				errorService.show(err.data.message);
				// $rootScope.error = err;
			});
		}

		function login() {
			var fdata = {
				email: vm.email,
				password: vm.password
			};

			if(!vm.email) {
				return errorService.show('MISSING_FIELDS');
			}


			authService.login(fdata).then(function (res){
				// $localStorage.token = res.data.token;
				$location.path('/dashboard');
			}, function (err){
				errorService.show(err.data.message);
				// $rootScope.error = err;
			});
		}

		function requestPasswordReset() {
			var fdata = {
				email: vm.email
			};

			authService.requestPasswordReset(fdata).then(function (res){
				vm.requestSent = true;
			}, function (err){
				errorService.show(err.data.message);
				// $rootScope.error = err;
			});
		}

		function resetPassword() {
			var fdata = {
				token: $location.search().ott,
				password: vm.password
			};

			authService.resetPassword(fdata).then(function (res){
				$localStorage.token = res.token;
				$location.path('/dashboard');
			}, function (err){
				errorService.show(err.data.message);
				// $rootScope.error = err;
			});
		}

		function logout() {
			authService.logout();
		}

	}

})();