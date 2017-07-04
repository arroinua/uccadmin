(function(){

	'use strict';

	angular
		.module('app.instance')
		.controller('InstanceController', InstanceController);

	InstanceController.$inject = ['$scope', '$routeParams', '$location', '$translate', '$uibModal', 'apiService', 'customerService', 'poolSizeServices', 'branchesService', 'cartService', 'notifyService', 'errorService', 'spinnerService', 'utilsService', 'convertBytesFilter'];

	function InstanceController($scope, $routeParams, $location, $translate, $uibModal, api, customerService, poolSizeServices, branchesService, cart, notifyService, errorService, spinner, utils, convertBytesFilter) {

		var vm = this;
		var oid = $routeParams.oid;
		var cartItem = $routeParams.cart_item;
		var minUsers = 4;
		var minLines = 8;

		vm.customer = customerService.getCustomer();
		vm.minUsers = minUsers;
		vm.minLines = minLines;
		vm.passType = 'password';
		vm.passwordStrength = 0;
		vm.newBranch = true;
		// vm.noTrial = false;
		vm.trial = true;
		vm.noAddons = false;
		vm.plans = [];
		vm.availablePlans = [];
		vm.selectedPlan = {};
		vm.prevPlanId = '';
		vm.sids = [];
		vm.totalAmount = 0;
		vm.totalLines = 0;
		vm.totalStorage = 0;
		vm.numPool = '200-299';
		vm.storages = ['0', '30', '100', '250', '500'];
		vm.lines = ['0', '4', '8', '16', '30', '60', '120', '250', '500'];
		vm.timezones = moment.tz.names();
		vm.languages = [
			{name: 'English', value: 'en'},
			{name: 'Українська', value: 'uk'},
			{name: 'Русский', value: 'ru'}
		];
		vm.addOns = {
			storage: {
				name: 'storage',
				quantity: '0'
			},
			lines: {
				name: 'lines',
				quantity: '0'
			}
		};
		vm.instance = {
			_subscription: {
				planId: '',
				quantity: minUsers,
				addOns: []
			},
			result: {
				lang: 'en',
				maxlines: 8,
				maxusers: minUsers,
				timezone: moment.tz.guess()
			}
		};

		vm.generatePassword = generatePassword;
		vm.revealPassword = revealPassword;
		vm.proceed = proceed;
		vm.update = update;
		vm.selectPlan = selectPlan;
		vm.selectServer = selectServer;
		vm.plusUser = function() {
			return vm.instance._subscription.quantity += 1;
		};
		vm.minusUser = function() {
			if(vm.instance._subscription.quantity > minUsers) {
				vm.instance._subscription.quantity -= 1;
			}
			return vm.instance._subscription.quantity;
		};
		vm.showPlans = function() {
			$uibModal.open({
				templateUrl: 'assets/partials/compare-plans.html',
				size: 'lg'
			});
		};

		$scope.$watch(function() {
			return vm.instance._subscription.quantity;
		}, function(val) {
			
			if(!val) {
				vm.instance._subscription.quantity = minUsers;
			}

			if(vm.selectedPlan.planId === 'trial' || vm.selectedPlan.planId === 'free' || vm.selectedPlan.planId === 'team') {
				vm.instance._subscription.quantity = minUsers;
			}

			totalLines();
			totalStorage();
			totalAmount();
		});
		
		$scope.$watch(function() {
			return vm.addOns.lines.quantity;
		}, function(val) {
			vm.addOns.lines.quantity = vm.addOns.lines.quantity.toString();
			// vm.instance._subscription.addOns.lines.quantity = parseInt(val, 10);
			totalLines();
			totalAmount();
		});

		$scope.$watch(function() {
			return vm.addOns.storage.quantity;
		}, function(val) {
			vm.addOns.storage.quantity = vm.addOns.storage.quantity.toString();
			// vm.instance._subscription.addOns.storage.quantity = parseInt(val, 10);
			totalStorage();
			totalAmount();
		});

		$scope.$watch(function() {
			return vm.instance._subscription.planId;
		}, function(val, prev) {
			vm.plans.forEach(function(item) {
				if(item.planId === vm.instance._subscription.planId) {
					vm.selectedPlan = item;
					if(item.planId === 'trial' || item.planId === 'free' || item.planId === 'team') {
						// vm.trial = true;
						vm.instance._subscription.quantity = minUsers;
						vm.instance.maxlines = minLines;
						vm.addOns.lines.quantity = '0';
						vm.addOns.storage.quantity = '0';
						vm.noAddons = true;
					} else {
						vm.noAddons = false;
					}

					totalAmount();
					totalStorage();
				}
			});
			vm.prevPlanId = prev;
			console.log('prevPlanId: ', vm.prevPlanId);
		});

		$scope.$on('$viewContentLoaded', function(){
			spinner.show('plans-spinner');
			spinner.show('servers-spinner');
		});

		getPlans();
		getServers();

		function getPlans() {
			
			if(branchesService.getPlans().length) {
				console.log('getPlans:', branchesService.getPlans());
				vm.plans = branchesService.getPlans();

				spinner.hide('plans-spinner');
				init();

				return;
			}

			api.request({
				url: 'getPlans'
			}).then(function(res){
				if(!res.data.success) return errorService.show(res.data.message);

				vm.plans = res.data.result;
				vm.plans.forEach(function(item){
					item.addOns = utils.arrayToObject(item.addOns, 'name');
				});
				console.log('getPlans:', vm.plans);

				branchesService.setPlans(vm.plans);

				init();
				
			}, function(err){
				errorService.show(err.data.message);
			});
		}

		function getServers() {

			if(branchesService.getServers().length) {
				vm.sids = branchesService.getServers();
				if(oid === 'new') vm.instance.sid = vm.sids[0]._id;
				spinner.hide('servers-spinner');
				
				return;
			}

			api.request({
				url: 'getServers'
			}).then(function(res){
				if(!res.data.success) return errorService.show(res.data.message);

				console.log('getServers: ', res.data.result);
				vm.sids = res.data.result;
				branchesService.setServers(vm.sids);

				if(oid === 'new') vm.instance.sid = vm.sids[0]._id;
				spinner.hide('servers-spinner');
			}, function(err){
				errorService.show(err);
			});
		}

		function init() {
			if(oid !== 'new'){

				branchesService.get(oid, function (branch){
					if(branch) {
						setBranch(angular.merge({}, branch));
						vm.availablePlans = vm.plans.filter(isPlanAvailable);
					} else {
						api.request({ url: 'getBranch/'+oid }).then(function (res){
							if(!res.data.success) return errorService.show(res.data.message);

							setBranch(res.data.result);
							vm.availablePlans = vm.plans.filter(isPlanAvailable);
						}, function (err){
							errorService.show(err);
						});
					}
					spinner.hide('plans-spinner');
				});

				vm.newBranch = false;

			} else {
				vm.newBranch = true;
				vm.numPool = '200-299';
				vm.instance._subscription.planId = 'standard';
				vm.availablePlans = vm.plans;

				if(cartItem && cart.get(cartItem)) {
					setBranch(cart.get(cartItem).data);
				}

				api.request({
					url: 'canCreateTrialSub'
				}).then(function(res){
					if(!res.data.success) return errorService.show(res.data.message);
					
					if(res.data.result) vm.trial = true;
					else vm.trial = false;
					spinner.hide('plans-spinner');
				}, function(err){
					errorService.show(err.data.message);
				});
			}
		}

		function proceed(action){

			var branchSetts = getBranchSetts();
			console.log('proceed: ', branchSetts, vm.addOns);
			if(!branchSetts) {
				return;
			}

			// Prohibit downgrade if plan's storelimit 
			// is less than branch is already utilized
			if(branchSetts.result.storelimit < branchSetts.result.storesize) {
				$translate('ERRORS.DOWNGRADE_ERROR_STORAGE')
				.then(function(translation){
					alert(translation);
				});
				return;
			}
			// Prohibit downgrade if the new nuber of maxusers 
			// is less than the number of created users in branch
			if(branchSetts._subscription.quantity < branchSetts.result.users) {
				$translate('ERRORS.DOWNGRADE_ERROR_USERS')
				.then(function(translation){
					alert(translation);
				});
				return;
			}

			var actionStr = ''; 
			if(action === 'createSubscription') {
				actionStr = 'NEW_SUBSCRIPTION';
			} else if(action === 'updateSubscription' || action === 'changePlan') {
				actionStr = 'UPDATE_SUBSCRIPTION';
			}

			$translate('DESCRIPTIONS.'+actionStr, {
				planId: branchSetts._subscription.planId,
				users: branchSetts._subscription.quantity,
				maxlines: branchSetts.result.maxlines,
				company: branchSetts.result.name
			})
			.then(function (description) {
				
				branchSetts._subscription.description = description;

				if(cartItem) {
					cart.update(branchSetts.result.prefix, {
						action: action,
						description: description,
						amount: vm.totalAmount,
						data: branchSetts
					});
				} else {
					// cart[(vm.customer.role === 'user' ? 'set' : 'add')]({
					cart.add({
						action: action,
						description: description,
						amount: vm.totalAmount,
						data: branchSetts
					});
				}

				$location.path('/payment');
			});
		}

		function update(){

			var branchSetts = getBranchSetts(),
				balance,
				planPrice,
				planAmount,
				billingCycles;

			console.log('update: ', branchSetts);

			if(!branchSetts) {
				return;
			}

			// Prohibit downgrade if plan's storelimit 
			// is less than branch is already utilized
			if(branchSetts.result.storelimit < branchSetts.result.storesize) {
				$translate('ERRORS.DOWNGRADE_ERROR_STORAGE')
				.then(function(translation){
					alert(translation);
				});
				return;
			}
			// Prohibit downgrade if the new nuber of maxusers 
			// is less than the number of created users in branch
			if(branchSetts._subscription.quantity < branchSetts.result.users) {
				$translate('ERRORS.DOWNGRADE_ERROR_USERS')
				.then(function(translation){
					alert(translation);
				});
				return;
			}

			balance = parseFloat(vm.customer.balance);
			planPrice = parseFloat(vm.selectedPlan.price);
			planAmount = parseFloat(vm.totalAmount);
			billingCycles = branchSetts._subscription.billingCycles;

			if(balance < planAmount || (vm.prevPlanId && branchSetts._subscription.planId !== vm.prevPlanId)) {

				proceed('changePlan');
				return;

			}

			api.request({
				url: 'updateSubscription',
				params: branchSetts
			}).then(function(res){
				if(!res.data.success) {
					if(err.data.message === 'ERRORS.NOT_ENOUGH_CREDITS') proceed('updateSubscription');
					else errorService.show(res.data.message);
					return;
				}

				branchesService.update(branchSetts.oid, branchSetts);
				notifyService.show('ALL_CHANGES_SAVED');
			}, function(err){
				errorService.show(err);
			});
		}
		
		function setBranch(opts) {
			vm.instance = opts;
			vm.initName = opts.result.name;

			if(opts.result.extensions) {
				vm.numPool = poolSizeServices.poolArrayToString(opts.result.extensions);
			}
			
			// if(opts._subscription.planId && opts._subscription.planId !== 'trial' && opts._subscription.planId !== 'free') {
			// 	vm.noTrial = true;
			// }

			if(opts._subscription.addOns.length) {
				vm.addOns = utils.arrayToObject(opts._subscription.addOns, 'name');
			}

			vm.storages.forEach(function(item, index, array){
				if(item !== '0' && parseInt(item, 10) < opts.result.storesize) array.splice(index, 1);
			});

			console.log('setBranch: ', vm.instance);
		}

		function getBranchSetts() {
			var addOns = [];

			if(!vm.instance._subscription.planId || !vm.instance.result.prefix || !vm.numPool || !vm.instance.result.name || (!vm.instance.result.adminpass && vm.newBranch)) {
				errorService.show('MISSING_FIELDS');
				return false;
			}

			console.log('pass: ', vm.instance.result.adminpass, vm.confirmPass);
			if(vm.instance.result.adminpass && (vm.confirmPass !== vm.instance.result.adminpass)){
				errorService.show('PASSWORD_NOT_CONFIRMED');
				return false;
			}

			vm.instance.result.extensions = poolSizeServices.poolStringToObject(vm.numPool);
			vm.instance.result.adminname = vm.instance.result.prefix;
			vm.instance.result.maxlines = parseInt(vm.totalLines, 10);
			vm.instance.result.maxusers = parseInt(vm.instance._subscription.quantity, 10);
			// vm.instance.result.storelimit = convertBytesFilter(vm.totalStorage, 'GB', 'Byte');
			vm.instance.result.storelimit = vm.totalStorage;
			if(oid) vm.instance.oid = oid;

			angular.forEach(vm.addOns, function(addOn){
				if(addOn.quantity) addOn.quantity = parseInt(addOn.quantity);
				addOns.push(addOn);
			});

			vm.instance._subscription.addOns = addOns;

			return vm.instance;
		}

		function selectPlan(plan) {
			vm.instance._subscription.planId = plan.planId;
			vm.instance._subscription.numId = plan.numId;
		}

		function isPlanAvailable(plan) {
			console.log('isPlanAvailable: ', plan.numId >= vm.instance._subscription.numId);
			if(plan.numId >= vm.instance._subscription.numId) {
				return plan;
			}
		}

		function selectServer(sid) {
			vm.instance.sid = sid;
		}

		function totalAmount() {
			var sub = vm.instance._subscription;
			vm.totalAmount = sub.quantity * parseFloat(vm.selectedPlan.price);

			if(vm.selectedPlan.addOns && Object.keys(vm.selectedPlan.addOns).length) {
				vm.totalAmount += vm.addOns.storage.quantity * parseFloat(vm.selectedPlan.addOns.storage.price);
				vm.totalAmount += vm.addOns.lines.quantity * parseFloat(vm.selectedPlan.addOns.lines.price);
			}
			vm.totalAmount = vm.totalAmount.toFixed(2);
		}

		function totalStorage() {
			var sub = vm.instance._subscription;
			if(vm.selectedPlan.customData) {
				vm.totalStorage = sub.quantity * parseFloat(vm.selectedPlan.customData.storageperuser);
			}
			if(vm.addOns.storage) {
				vm.totalStorage += parseInt(vm.addOns.storage.quantity, 10);
			}
		}

		function totalLines() {
			var sub = vm.instance._subscription;
			vm.totalLines = sub.quantity * 2;
			if(vm.addOns.lines) {
				vm.totalLines += parseInt(vm.addOns.lines.quantity, 10);
			}
		}

		function generatePassword(min, max) {
			var newPass = '';
			while(!utils.checkPasswordStrength(newPass)) {
				newPass = utils.generatePassword(min, max);
			}
			vm.instance.result.adminpass = newPass;
			vm.confirmPass = newPass;
		}

		function revealPassword() {
			vm.passType = vm.passType === 'text' ? 'password' : 'text';
		}

	}

})();