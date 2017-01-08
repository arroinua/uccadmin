(function(){

	'use strict';

	angular
		.module('app.profile')
		.controller('ProfileController', ProfileController);

	ProfileController.$inject = ['apiService', 'customerService', 'notifyService', 'errorService'];

	function ProfileController(api, customerService, notifyService, errorService) {

		var vm = this;
		vm.profile = customerService.getCustomer();
		vm.saveProfile = saveProfile;
		vm.confirmPass = '';

		console.log('profile: ', vm.profile);

		function saveProfile() {
			
			var params = {};

			if(!vm.profile.email || !vm.profile.name){
				return errorService.show('MISSING_FIELDS');
			}
			if(vm.profile.password && vm.confirmPass !== vm.profile.password){
				return errorService.show('PASSWORD_NOT_CONFIRMED');
			}

			if(vm.profile.name) params.name = vm.profile.name;
			if(vm.profile.email) params.email = vm.profile.email;
			if(vm.profile.password) params.password = vm.profile.password;

			api.request({
				url: "update/"+vm.profile._id,
				params: params
			}).then(function(res){
				if(!res.data.success) return errorService.show(res.data.message);

				notifyService.show('ALL_CHANGES_SAVED');
				customerService.setCustomer(res.data.result);
				console.log('currentUser: ', res.data.result);
			}, function(err){
				errorService.show(err);
			});
		}

	}

})();