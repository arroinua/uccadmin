(function(){

	'use strict';

	angular
		.module('app.layout')
		.controller('SidemenuController', SidemenuController);

	SidemenuController.$inject = ['$rootScope', '$location', '$translate', 'authService', 'errorService', 'utilsService', 'apiService', 'customerService'];

	function SidemenuController($rootScope, $location, $translate, authService, errorService, utilsService, apiService, customerService) {

		var vm = this;
		vm.customer = {};
		vm.customerBalance = null;
		vm.logout = logout;
		
		console.log('SidemenuController: ', vm.customerBalance);
		console.log('SidemenuController isLoggedIn: ', authService.isLoggedIn());

		$rootScope.$on('customer.update', function(event, customer) {
			vm.customer = customer;
		});

		$rootScope.$on('auth.login', function() {
			// getCustomerBalance();
			getCustomer();
		});

		if(authService.isLoggedIn()) {
			// getCustomerBalance();
			getCustomer();
		}

		function stringToFixed(string) {
			return utilsService.stringToFixed(string, 2);
		}

		function getCustomer() {

			apiService.request({
				url: "getCustomer"
			}).then(function(res){
				if(!res.data.success) return errorService.show(res.data.message);
				
				vm.customer = res.data.result;
				// vm.customer.balance = res.data.result;
				vm.customerBalance = stringToFixed(vm.customer.balance);
				customerService.setCustomer(vm.customer);
				customerService.setCustomerBalance(vm.customer.balance);
			}, function(err){
				errorService.show(err);
			});
		}

		// function getCustomerBalance() {
		// 	apiService.request({
		// 		url: "getCustomerBalance"
		// 	}).then(function(res){
		// 		if(!res.data.success) return errorService.show(res.data.message);
				
		// 		vm.customer.balance = res.data.result;
		// 		vm.customerBalance = stringToFixed(res.data.result);
		// 		customerService.setCustomerBalance(res.data.result);
		// 	}, function(err){
		// 		errorService.show(err);
		// 	});
		// }

		function logout() {
			authService.logout();
		}

	}

})();