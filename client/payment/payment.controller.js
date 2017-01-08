(function(){

	'use strict';

	angular
		.module('app.payment')
		.controller('PaymentController', PaymentController);

	PaymentController.$inject = ['$q', '$scope', '$http', '$rootScope', '$localStorage', '$location', 'apiService', 'branchesService', 'customerService', 'cartService', 'notifyService', 'errorService', 'spinnerService'];

	function PaymentController($q, $scope, $http, $rootScope, $localStorage, $location, api, branchesService, customerService, cartService, notifyService, errorService, spinnerService) {

		var vm = this;
		
		vm.customer = customerService.getCustomer();
		console.log('vm.customer: ', vm.customer, vm.customer.balance);

		vm.requiredAmount = 20;
		vm.isEnough = false;
		vm.cart = angular.extend( [], cartService.getAll() );
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
		vm.selectMethod = selectMethod;
		vm.proceedPayment = proceedPayment;
		vm.removeCartItem = removeCartItem;
		vm.cancel = cancel;
		if(vm.cart.length && vm.customer.balance < 0) addDebtAmout();
		vm.amount = coutAmount(vm.cart);
		vm.paymentMethod = vm.amount > 0 ? 1 : 0;
		vm.isUnselectableMethod = isUnselectableMethod;


		$rootScope.$on('customer.update', function(event, customer) {
			vm.customer = customer;
			isEnough();
		});

		$scope.$watch(function(){
			return vm.cart.length;
		}, function(val){
			var reqAmount = coutAmount(vm.cart);
			vm.amount = reqAmount;
			if(val) vm.requiredAmount = reqAmount;
		});

		$scope.$watch(function(){
			return vm.amount;
		}, function(val){
			vm.amount = val;
			isEnough();
			// requiredAmount = val;
			// if(vm.customer.balance < requiredAmount || (!val && !vm.cart.length)) vm.isEnough = false;
			// else vm.isEnough = true;
		});

		function isEnough() {
			if((!vm.amount && !vm.cart.length) || vm.amount < vm.requiredAmount) vm.isEnough = false;
			else vm.isEnough = true;
		}

		function isUnselectableMethod(methodObj) {
			return (methodObj.id === 0 && (vm.customer.balance < vm.amount || !vm.cart.length) || methodObj.id !== 0 && !vm.amount);
		}

		function proceedPayment() {

			if(vm.paymentMethod === undefined)
				return errorService.show('CHOOSE_PAYMENT_METHOD');
			if(vm.amount === undefined || vm.amount === null || vm.amount < 0)
				return errorService.show('AMOUNT_NOT_SET');

			// spinnerService.show('main-spinner');

			var order = vm.cart.length ? vm.cart : {
				action: 'addCredits',
				description: 'Ringotel Service Payment',
				amount: vm.amount
			};

			var requestParams = {
				url: 'checkout',
				params: {
					paymentMethod: vm.paymentMethod,
					amount: vm.amount,
					order: order
				}
			};

			api.request(requestParams).then(function(res){
				if(res.data.redirect) {
					window.location.href = res.data.redirect;
				} else {
					if(res.data.success) {
						notifyService.show('ALL_CHANGES_SAVED');

						// update cache
						vm.cart.forEach(function(item){
							if(item.action === 'createSubscription') {
								branchesService.set([]);
							} else if(item.action === 'updateSubscription') {
								branchesService.update(item.data.oid, item.data);
							}
						});

						$location.path('/dashboard'); //TODO

						cartService.clear();

					} else {
						errorService.show(res.data.message);
					}					
				}
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
			var amount = array.length ? 0 : vm.requiredAmount;
			array.forEach(function (item){
				amount += parseFloat(item.amount);
			});
			return amount;
		}

		function addDebtAmout() {
			vm.cart.push({
				edit: false,
				remove: false,
				action: 'addCredits',
				description: 'Ringotel Service Payment',
				amount: (vm.customer.balance * -1)
			});
		}

		function removeCartItem(index) {
			vm.cart.splice(index, 1)
			cartService.remove(index);
		}

		function cancel() {
			$location.path('/dashboard');
		}

	}

})();