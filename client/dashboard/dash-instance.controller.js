(function(){

	'use strict';

	angular
		.module('app.dashboard')
		.controller('DashInstanceController', DashInstanceController);

	DashInstanceController.$inject = ['$rootScope', '$location', '$translate', 'apiService', 'poolSizeServices', 'branchesService', 'cartService', 'utilsService', 'errorService'];

	function DashInstanceController($rootScope, $location, $translate, api, poolSizeServices, branchesService, cart, utils, errorService) {

		var vm = this;
		var diff;

		vm.sub = vm.inst._subscription;
		vm.terminateInstance = terminateInstance;
		vm.renewSubscription = renewSubscription;
		vm.expiresAt = expiresAt;
		vm.canRenew = canRenew;
		vm.parseDate = parseDate;
		vm.stringToFixed = stringToFixed;
		vm.getDifference = utils.getDifference;
		vm.trialExpires = expiresAt(vm.sub.trialExpires);
		vm.expires = vm.sub.billingCyrcles - vm.sub.currentBillingCyrcle;
		vm.expThreshold = 10;

		function terminateInstance(oid) {
			if(!oid) return;
			if(confirm("Do you realy want to terminate instance permanently?")){
				setState('deleteBranch', oid, function (err, response){
					if(err) {
						errorService.show(err);
						return;
					}

					branchesService.remove(oid);
					// getBranches();
				});
			}
		}
		
		function renewSubscription(inst) {
			$translate('DESCRIPTIONS.RENEW_SUBSCRIPTION', {
				planId: inst._subscription.planId,
				users: inst._subscription.quantity,
				company: inst.result.name
			})
			.then(function (description) {
				cart.add({
					action: "renewSubscription",
					description: description,
					amount: inst._subscription.amount,
					data: {
						oid: inst.oid
					}
				});
				$location.path('/payment');
			});
		}

		function expiresAt(lastBillingDate) {
			diff = utils.getDifference(lastBillingDate, moment(), 'days');
			return diff < 0 ? 0 : diff;
		}

		function canRenew(inst) {
			diff = vm.expiresAt(inst);
			return diff <= 10;
		}

		function parseDate(date, format) {
			return utils.parseDate(date, format);
		}

		function stringToFixed(string) {
			return utils.stringToFixed(string, 2);
		}

		function getPoolString(array) {
			return poolSizeServices.poolArrayToString(array);
		}

		function getPoolSize(array) {
			return poolSizeServices.getPoolSize(array);
		}

		function setState(method, oid, callback) {
			api.request({
				url: method,
				params: {
					oid: oid
				}
			}).then(function(result){
				console.log('setState result: ', result);
				callback(null, result.data.result);
			}, function(err){
				callback(err);
			});
		}

	}

})();