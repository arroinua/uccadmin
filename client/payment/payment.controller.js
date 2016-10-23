(function(){

	'use strict';

	angular
		.module('app.payment')
		.controller('PaymentController', PaymentController);

	PaymentController.$inject = ['$q', '$scope', '$http', '$rootScope', '$localStorage', '$location', 'apiService', 'branchesService', 'customerService', 'cartService', 'notifyService', 'errorService', 'spinnerService'];

	function PaymentController($q, $scope, $http, $rootScope, $localStorage, $location, api, branchesService, customerService, cart, notifyService, errorService, spinnerService) {

		var vm = this;
		// var requiredAmount = 0;
		
		vm.customer = customerService.getCustomer();
		console.log('vm.customer: ', vm.customer, vm.customer.balance);

		vm.isEnough = false;
		vm.cart = cart.getAll();
		vm.amount = coutAmount(vm.cart);
		vm.paymentMethods = [
			{
				id: 1,
				icon: 'fa fa-credit-card',
				name: 'Credit Card'
			},
			{
				id: 2,
				icon: 'fa fa-paypal',
				name: 'PayPal',
				comingSoon: true
			},
			{
				id: 3,
				icon: 'fa fa-bitcoin',
				name: 'Bitcoin',
				comingSoon: true
			},
			{
				id: 0,
				name: 'Ringotel Balance'
			}
		];
		vm.paymentMethod = vm.amount > 0 ? 1 : 0;
		vm.selectMethod = selectMethod;
		vm.proceedPayment = proceedPayment;
		vm.removeFromArray = removeFromArray;
		vm.cancel = cancel;

		$rootScope.$on('customer.update', function(event, customer) {
			vm.customer = customer;
			isEnough();
		});

		$scope.$watch(function(){
			return vm.cart.length;
		}, function(val){
			vm.amount = coutAmount(vm.cart);
			// if(!val) requiredAmount = 0;
			// else requiredAmount = vm.amount;
		});

		$scope.$watch(function(){
			return vm.amount;
		}, function(val){
			isEnough();
			// requiredAmount = val;
			// if(vm.customer.balance < requiredAmount || (!val && !vm.cart.length)) vm.isEnough = false;
			// else vm.isEnough = true;
		});

		function isEnough() {
			if(vm.customer.balance < vm.amount || (!vm.amount && !vm.cart.length)) vm.isEnough = false;
			else vm.isEnough = true;
		}

		function proceedPayment() {

			if(vm.paymentMethod === undefined)
				return errorService.show('CHOOSE_PAYMENT_METHOD');
			if(vm.amount === undefined || vm.amount === null)
				return errorService.show('AMOUNT_NOT_SET');

			// spinnerService.show('main-spinner');

			//TODO - switch between payment methods
			var requestParams = {
				url: 'checkout',
				params: {
					paymentMethod: vm.paymentMethod,
					amount: vm.amount,
					order: vm.cart
				}
			};

			api.request(requestParams).then(function(result){
				if(result.data.redirect) {
					window.location.href = result.data.redirect;
				} else {
					if(result.success) notifyService.show('ALL_CHANGES_SAVED');

					// update cache
					vm.cart.forEach(function(item){
						if(item.action === 'createSubscription') {
							branchesService.set([]);
						} else if(item.action === 'updateSubscription') {
							branchesService.update(item.data.oid, item.data);
						}
					});

					$location.path('/dashboard'); //TODO
				}
				cart.clear();
				// spinnerService.hide('main-spinner');
			}, function(err){
				errorService.show(err);
				// spinnerService.hide('main-spinner');
			});
		}

		function selectMethod(method) {
			vm.paymentMethod = method;
		}

		function coutAmount(array) {
			//TODO - count min amount based on the currency
			var amount = array.length ? 0 : 20;
			array.forEach(function (item){
				amount += parseFloat(item.amount);
			});
			return amount;
		}

		function removeFromArray(array, index) {
			array.splice(index, 1);
		}

		function cancel() {
			$location.path('/dashboard');
		}

	}

})();