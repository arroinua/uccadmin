(function(){

	'use strict';

	angular
		.module('app')
		.factory('customerService', customerService);

	customerService.$inject = ['$rootScope'];

	function customerService($rootScope){

		var currentCustomer = null,
			currentBalance = null;

		return {
			setCustomer: function(params) {
				currentCustomer = angular.extend({}, params);
				$rootScope.$emit('customer.update', currentCustomer);
				return currentCustomer;
			},
			getCustomer: function() {
				return currentCustomer;
			},
			setCustomerBalance: function(balance) {
				currentCustomer = currentCustomer || {};
				currentCustomer.balance = balance;
				currentBalance = balance;
				$rootScope.$emit('customer.update', currentCustomer);
			},
			getCustomerBalance: function() {
				return currentCustomer.balance || currentBalance;
			},
			clearCurrentCustomer: function() {
				currentCustomer = null;
			}
		};

	}

})();