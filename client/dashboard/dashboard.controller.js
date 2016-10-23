(function(){

	'use strict';

	angular
		.module('app.dashboard')
		.controller('DashboardController', DashboardController);

	DashboardController.$inject = ['$rootScope', 'apiService', 'branchesService', 'notifyService', 'spinnerService', 'customerService', 'errorService'];

	function DashboardController($rootScope, api, branchesService, notifyService, spinner, customerService, errorService) {

		var vm = this;

		vm.instances = [];
		vm.customerRole = customerService.getCustomer().role;

		$rootScope.title = 'DASHBOARD';
		$rootScope.$on('auth.logout', function(){
			branchesService.clear();
		});

		spinner.show('main-spinner');

		getBranches();
		// getPlans();

		function getBranches(){
			var instances = branchesService.getAll();
			if(instances.length) {
				vm.instances = instances;
				spinner.hide('main-spinner');
				console.log('getBranches: ', instances);
			} else {
				loadBranches();
			}
		}

		function loadBranches() {
			api.request({
				url: "getBranches"
			}).then(function(result){
				branchesService.set(result.data.result);
				
				vm.instances = result.data.result;

				spinner.hide('main-spinner');
				console.log('loadBranches result: ', vm.instances);
				// vm.getInstState();
			}, function(err){
				errorService.show(err.data.message);
			});
		}

		// function getPlans() {
		// 	api.request({
		// 		url: 'getPlans'
		// 	}).then(function(res){
		// 		vm.plans = res.data.result;
		// 	}, function(err){
		// 		errorService.show(err.data.message);
		// 	});
		// }

	}

})();