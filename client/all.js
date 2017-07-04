angular.module('app', [
	'app.core',
	'app.routes',
	'app.layout',
	'app.auth',
	'app.billing',
	'app.dashboard',
	'app.instance',
	'app.payment',
	'app.profile'
]);
angular.module('app.auth', [
	'app.core'
]);
angular.module('app.billing', [
	'app.core'
]);
angular.module('app')
.value('moment', moment)
.constant('appConfig', {
	server: window.location.protocol + '//' + window.location.host
})
.config(['$httpProvider', function($httpProvider) {
	$httpProvider.interceptors.push(['$q', '$location', '$localStorage', 'customerService', function($q, $location, $localStorage, customerService) {
        return {
			request: function(config) {
				config.headers = config.headers || {};
				if ($localStorage.token) {
					config.headers['x-access-token'] = $localStorage.token;
				}
				return config;
			},
			responseError: function(error) {
				if(error.status === 401 || error.status === 403) {
					console.log('responseError: ', $location.path(), error.status, error);
					$location.path('/login');
				}
				return $q.reject(error);
			},
			response: function(response){
				if(response.data.token) {
					console.log('response: ', response.data);
					$localStorage.token = response.data.token;
				}
				// if(response.data.customer && !customerService.getCustomer()){
				// 	customerService.setCustomer(response.data.customer);
				// }
				return response;
			}
        };
	}]);
}])
.config(['notificationsConfigProvider', function (notificationsConfigProvider) {
    notificationsConfigProvider.setAutoHide(true);
    notificationsConfigProvider.setHideDelay(5000);
    notificationsConfigProvider.setAutoHideAnimation('fadeOutNotifications');
    notificationsConfigProvider.setAutoHideAnimationDelay(500);
	notificationsConfigProvider.setAcceptHTML(true);
}])
.config(['$translateProvider', function($translateProvider) {
	$translateProvider.useStaticFilesLoader({
		prefix: './assets/translations/locale-',
		suffix: '.json'
	});
	$translateProvider.preferredLanguage('en');
	$translateProvider.fallbackLanguage('en');
	$translateProvider.useStorage('storageService');
	$translateProvider.useSanitizeValueStrategy('sanitizeParameters');
	// $translateProvider.useSanitizeValueStrategy('escape');
}])
.config(['tmhDynamicLocaleProvider', function(tmhDynamicLocaleProvider) {
	tmhDynamicLocaleProvider.localeLocationPattern('./lib/i18n/angular-locale_{{locale}}.js');
}]);
angular.module('app.core', [
	// 'ngAnimate',
	'ngMessages',
	'ngStorage',
	'ngSanitize',
	'pascalprecht.translate',
	'ngNotificationsBar',
	'tmh.dynamicLocale',
	'ui.bootstrap'
]);
angular.module('app.dashboard', [
	'app.core'
]);
angular.module('app.instance', [
	'app.core'
]);
angular.module('app.layout', [
	'app.core'
]);
angular.module('app.payment', [
	'app.core'
]);
angular.module('app.profile', [
	'app.core'
]);
angular.module('app.routes', [
	'ngRoute'
])
.config(['$routeProvider', function($routeProvider){

	function verifyUser($q, $http, $location) {
		var deferred = $q.defer(); // Make an AJAX call to check if the user is logged in
		var verified = false;
		$http.get('/api/verify?ott='+$location.search().ott).then(function (res){
			if (res.success){ // Authenticated
				deferred.resolve();
				verified = true;
			} else { // Not Authenticated
				deferred.reject();
			}
			$location.url('/account-verification?verified='+verified);
		}, function (err){
			console.log(err);
		});
		return deferred.promise;
	}

	$routeProvider.
		when('/verify', {
			resolve: {
				verified: verifyUser
			}
		}).
		otherwise({
			redirectTo: '/dashboard'
		});
}]);
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
angular.module('app.auth')
.config(['$routeProvider', function($routeProvider){

	$routeProvider
		.when('/account-verification', {
			templateUrl: 'auth/verification.html',
			controller: 'AuthController',
			controllerAs: 'authVm'
		})
		.when('/request-password-reset', {
			templateUrl: 'auth/request-password-reset.html',
			controller: 'AuthController',
			controllerAs: 'authVm'
		})
		.when('/reset-password', {
			templateUrl: 'auth/reset-password.html',
			controller: 'AuthController',
			controllerAs: 'authVm'
		})
		.when('/login',{
			templateUrl: 'auth/login.html',
			controller: 'AuthController',
			controllerAs: 'authVm'
		})
		.when('/signup', {
			templateUrl: 'auth/signup.html',
			controller: 'AuthController',
			controllerAs: 'authVm'
		});

}]);
(function(){

	'use strict';

	angular
		.module('app.billing')
		.controller('BillingController', BillingController);

	BillingController.$inject = ['$translate', 'utilsService', 'apiService', 'moment', 'customerService', 'spinnerService', 'errorService'];

	function BillingController($translate, utilsService, api, moment, customerService, spinner, errorService) {

		var vm = this;
		// var transactions = [];

		vm.customer = customerService.getCustomer();
		vm.currentBalance = null;
		vm.transactions = [];
		vm.charges = [];
		vm.startBalance = '';
		vm.lastBillingDate = null;
		vm.startDate = moment().subtract(7, 'days').toDate();
		vm.endDate = moment().endOf('day').toDate();
		vm.dateFormat = 'dd MMMM yyyy';
		vm.startDateOptions = {
			// minDate: new Date(2010, 1, 1),
			// maxDate: new Date(vm.endDate),
			showWeeks: false
		};
		vm.endDateOptions = {
			minDate: new Date(vm.startDate),
			showWeeks: false
		};
		vm.parseDate = function(date){
			return utilsService.parseDate(date);
		};
		vm.sumUp = sumUp;
		vm.findRecords = findRecords;

		console.log('customer: ', vm.customer);

		spinner.show('main-spinner');

		getCustomerBalance();
		findRecords();

		function findRecords(){
			getTransactions();
		}

		function getTransactions() {
			api.request({
				url: "transactions",
				params: {
					start: Date.parse(vm.startDate),
					end: Date.parse(vm.endDate)
				}
			}).then(function(res){
				if(!res.data.success) return errorService.show(res.data.message);
				console.log('Transactions: ', res.data.result);

				vm.transactions = res.data.result;

				return api.request({
					url: "charges",
					params: {
						start: Date.parse(vm.startDate),
						end: Date.parse(vm.endDate)
					}
				});
			}).then(function(res) {
				if(!res.data.success) return errorService.show(res.data.message);
				console.log('Charges: ', res.data.result);
				
				vm.charges = res.data.result;
				vm.startBalance = vm.charges.length ? vm.charges[vm.charges.length-1].startBalance : null;
				vm.lastBillingDate = vm.charges.length ? vm.charges[0].to : null;
				vm.totalCharges = vm.charges.length ? getTotalCharges(vm.charges) : 0; 

				// vm.totalCharges = sumUp(vm.totalCharges);
				
				console.log('totalCharges: ', vm.totalCharges);
				
				// vm.totalCharges = vm.charges.length ? (vm.startBalance - vm.customer.balance) : null;
				// vm.transactions = transactions;

				spinner.hide('main-spinner');
				console.log('Final: ', vm.transactions, vm.charges);
			}).catch(function(err) {
				spinner.hide('main-spinner');
				errorService.show(err);
			});
		}

		function getCustomerBalance() {
			api.request({
				url: "getCustomerBalance"
			}).then(function(res){
				if(!res.data.success) {
					spinner.hide('main-spinner');
					return errorService.show(res.data.message);
				}

				vm.customer.balance = res.data.result;
				vm.currentBalance = stringToFixed(res.data.result);
				customerService.setCustomerBalance(res.data.result);
			}, function(err){
				spinner.hide('main-spinner');
				errorService.show(err);
			});
		}

		function stringToFixed(string) {
			return utilsService.stringToFixed(string, 2);
		}

		function getTotalCharges(chargesArray) {
			return sumUp(chargesArray.map(function(item) {
				return item.amount;
			}).reduce(function(prev, next) {
				return prev.concat(next);
			}));
		}

		function sumUp(array) {
			var amount = 0;
			array.forEach(function(item){
				amount += parseFloat(item);
			});
			return amount;
		}

	}

})();
angular.module('app.billing')
.config(['$routeProvider', function($routeProvider){

	$routeProvider
		.when('/billing', {
			templateUrl: 'billing/billing.html',
			controller: 'BillingController',
			controllerAs: 'billVm',
			resolve: {
				loggedin: isAuthorized
			}
		});

}]);

isAuthorized.$inject = ['authService'];
function isAuthorized(authService) {
	return authService.isAuthorized();
}
(function(){

	'use strict';

	angular
		.module('app')
		.directive('isPassword', isPassword);

	isPassword.$inject = ['utils'];

	function isPassword(utils){

		return {
			require: 'ngModel',
			link: link
		};

		function link(scope, el, attrs, ctrl) {

			ctrl.$validators.password = function(modelValue, viewValue) {
				if(ctrl.$isEmpty(modelValue)) {
					return true;
				}

				if(scope.instance) {
					var prefix = scope.instance.result.prefix;
					if(prefix && new RegExp(prefix, 'i').test(modelValue))
						return false;
				}

				if(!utils.checkPasswordStrength(modelValue)) {
					return false;
				}

				return true;
			};
			
		}

	}

})();
(function(){

    'use strict';

    angular
        .module('app.core')
        .directive('password', password);

    password.$inject = ['utilsService'];
    function password(utils){

        return {
            restrict: 'AE',
            require: 'ngModel',
            link: link
        };

        function link(scope, el, attrs, ctrl) {

            ctrl.$validators.password = function(modelValue, viewValue) {
                if(ctrl.$isEmpty(modelValue)) {
                    return true;
                }

                // check if password contains the branch prefix
                if(scope.instVm && scope.instVm.instance) {
                    var prefix = scope.instVm.instance.result.prefix;
                    if(prefix && new RegExp(prefix, 'i').test(modelValue))
                        return false;
                }

                return !!utils.checkPasswordStrength(modelValue);
            };
        }
    }
})();
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
		vm.expires = (vm.sub.billingCycles - vm.sub.currentBillingCycle) + 1;
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
					_id: oid
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
(function(){

	'use strict';

	angular
		.module('app.dashboard')
		.directive('dashInstance', dashInstance);

	function dashInstance(){

		return {
			restrict: 'EA',
			replace: true,
			transclude: true,
			scope: {
				inst: '='
			},
			templateUrl: 'dashboard/dash-instance.html',
			controller: 'DashInstanceController',
			controllerAs: 'dashInstVm',
			bindToController: true
		};

	}

})();
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
			}).then(function(res){
				if(!res.data.success) return errorService.show(res.data.message);

				branchesService.set(res.data.result);
				
				vm.instances = res.data.result;

				spinner.hide('main-spinner');
				console.log('Branches: ', vm.instances);
				// vm.getInstState();
			}, function(err){
				errorService.show(err);
			});
		}

	}

})();
angular.module('app.dashboard')
.config(['$routeProvider', function($routeProvider){

	$routeProvider
		.when('/dashboard', {
			templateUrl: 'dashboard/dashboard.html',
			controller: 'DashboardController',
			controllerAs: 'dashVm',
			resolve: {
				loggedin: isAuthorized
			}
		});

}]);

isAuthorized.$inject = ['authService'];
function isAuthorized(authService) {
	return authService.isAuthorized();
}
(function(){

	'use strict';

	angular
		.module('app.instance')
		.directive('instanceSummary', instanceSummary);

	function instanceSummary(){

		return {
			restrict: 'AE',
			transclude: true,
			scope: {
				plan: '=',
				amount: '=',
				currency: '=',
				maxlines: '=',
				numPool: '=',
				storage: '=',
				instance: '=',
				newBranch: '=',
				update: '&',
				proceed: '&'
			},
			templateUrl: 'instance/instance-summary.html'
		};

	}

})();
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
angular.module('app.instance')
.config(['$routeProvider', function($routeProvider){

	$routeProvider
		.when('/instance/:oid', {
			templateUrl: 'instance/instance.html',
			controller: 'InstanceController',
			controllerAs: 'instVm',
			resolve: {
				loggedin: isAuthorized
			}
		});

}]);

isAuthorized.$inject = ['authService'];
function isAuthorized(authService) {
	return authService.isAuthorized();
}
(function(){

	'use strict';

	angular
		.module('app.instance')
		.directive('planItem', planItem);

	function planItem(){

		return {
			restrict: 'AE',
			transclude: true,
			scope: {
				plan: '=',
				model: '=',
				selectPlan: '&',
				showPlans: '&'
			},
			templateUrl: 'instance/plan.html'
		};

	}

})();
(function(){

	'use strict';

	angular
		.module('app.instance')
		.directive('serverItem', serverItem);

	function serverItem(){

		return {
			restrict: 'AE',
			transclude: true,
			scope: {
				model: '=',
				server: '=',
				newBranch: '=',
				selectServer: '&'
			},
			templateUrl: 'instance/server-item.html'
		};

	}

})();
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
				url: "update",
				params: params
			}).then(function(res){
				if(!res.data.success) return errorService.show(res.data.message);

				notifyService.show('ALL_CHANGES_SAVED');
				customerService.setCustomer(vm.profile);
				console.log('currentUser: ', vm.profile);
			}, function(err){
				errorService.show(err);
			});
		}

	}

})();
angular.module('app.profile')
.config(['$routeProvider', function($routeProvider){

	$routeProvider
		.when('/profile', {
			templateUrl: 'profile/profile.html',
			controller: 'ProfileController',
			controllerAs: 'profileVm',
			resolve: {
				loggedin: isAuthorized
			}
		});

}]);

isAuthorized.$inject = ['authService'];
function isAuthorized(authService) {
	return authService.isAuthorized();
}
angular
.module('app')
.filter('convertBytes', function() {
  return function(integer, fromUnits, toUnits) {
    var coefficients = {
        'Byte': 1,
        'KB': 1000,
        'MB': 1000000,
        'GB': 1000000000
    };
    return integer * coefficients[fromUnits] / coefficients[toUnits];
  };
});
(function(){

	'use strict';

	angular
		.module('app.layout')
		.controller('ContentController', ContentController);

	ContentController.$inject = ['$rootScope'];

	function ContentController($rootScope) {

		var vm = this;
		// vm.fullView = true;

	}

})();
(function(){

	'use strict';

	angular
		.module('app.layout')
		.controller('LayoutController', LayoutController);

	LayoutController.$inject = ['$rootScope'];

	function LayoutController($rootScope) {

		var vm = this;

		vm.fullView = true;
		vm.topbar = false;
		vm.sidemenu = false;
		vm.langmenu = false;
		vm.footer = true;
		vm.triggerSidebar = triggerSidebar;
		vm.triggerLangMenu = triggerLangMenu;

		$rootScope.$on('auth.login', function(e){
			vm.fullView = false;
			vm.topbar = true;
			vm.sidemenu = true;
			vm.footer = false;

			console.log('layout vm.sidemenu: ', vm.sidemenu);
		});

		$rootScope.$on('auth.logout', function(e){
			vm.fullView = true;
			vm.topbar = false;
			vm.sidemenu = false;
			vm.footer = true;

			console.log('layout vm.sidemenu: ', vm.sidemenu);
		});

		function triggerSidebar() {
			console.log('trigger sidebar!');
			vm.sidemenu = !vm.sidemenu;
		};

		function triggerLangMenu() {
			console.log('trigger langmenu!');
			vm.langmenu = !vm.langmenu;
		}

	}

})();
(function(){

	'use strict';

	angular
		.module('app.payment')
		.directive('methodItem', methodItem);

	function methodItem(){

		return {
			restrict: 'AE',
			transclude: true,
			scope: {
				model: '=',
				method: '=',
				unselectable: '=',
				select: '&'
			},
			templateUrl: 'payment/method-item.html'
		};

	}

})();
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
			// {
			// 	id: 2,
			// 	icon: 'fa fa-paypal',
			// 	name: 'PayPal',
			// 	comingSoon: true
			// },
			// {
			// 	id: 3,
			// 	icon: 'fa fa-bitcoin',
			// 	name: 'Bitcoin',
			// 	comingSoon: true
			// },
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

			var order = vm.cart.length ? vm.cart : [{
				action: 'addCredits',
				description: 'Ringotel Service Payment',
				amount: vm.amount
			}];

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
angular.module('app.payment')
.config(['$routeProvider', function($routeProvider){

	$routeProvider
		.when('/payment', {
			templateUrl: 'payment/payment.html',
			controller: 'PaymentController',
			controllerAs: 'payVm',
			resolve: {
				loggedin: isAuthorized
			}
		});

}]);

isAuthorized.$inject = ['authService'];
function isAuthorized(authService) {
	return authService.isAuthorized();
}
(function(){

	'use strict';

	angular
		.module('app.core')
		.factory('apiService', apiService);

	apiService.$inject = ['$http', 'appConfig'];

	function apiService($http, appConfig){

		var baseUrl = appConfig.server + '/reseller/api';
		return {
			request: function(params){
				return $http.post(baseUrl+'/'+params.url, (params.params || {}));
			}
		};

	}

})();
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
			return $http.post(baseUrl + '/reseller/api/signup', data);
		}

		function login(data) {
			return $http.post(baseUrl + '/reseller/api/login', data);
		}

		function requestPasswordReset(data) {
			return  $http.post(baseUrl + '/reseller/api/requestPasswordReset', data);
		}

		function resetPassword(data) {
			return $http.post(baseUrl + '/reseller/api/resetPassword', data);
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
			$http.get('/reseller/api/loggedin').then(function(res){
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
(function(){

	'use strict';

	angular
		.module('app.core')
		.factory('branchesService', branchesService);

	branchesService.$inject = ['poolSizeServices', 'apiService'];

	function branchesService(poolSizeServices, api){

		var branches = [];
		var plans = [];
		var servers = [];

		return {
			add: add,
			set: set,
			update: update,
			get: get,
			getAll: getAll,
			getAllAddons: getAllAddons,
			remove: remove,
			setPlans: setPlans,
			setServers: setServers,
			getPlans: getPlans,
			getServers: getServers,
			clear: clear,
			isPrefixValid: isPrefixValid,
			isPrefixUnique: isPrefixUnique,
			getSubscriptionAmount: getSubscriptionAmount
		};

		function add(item) {
			if(angular.isArray(item)) {
				angular.copy(item, branches);
				// branches = branches.concat(item);
			} else {
				delete item.adminpass;
				branches.push(item);
			}
		}

		function set(array) {
			if(Array.isArray(array)) branches = array;
		}

		function update(oid, data){
			console.log('update branch: ', oid, data);
			if(!oid) return;
			branches.forEach(function(item, index, array){
				if(item.oid === oid) {
					delete item.adminpass;
					angular.merge(item, data);
				}
			});
		}

		function get(oid, cb) {
			var found = null;
			branches.forEach(function (branch){
				if(branch.oid === oid){
					found = branch;
				}
			});
			if(cb) cb(found);
			else return found;
		}

		function getAll() {
			return branches;
		}

		function getAllAddons(params) {
			var addOns = [];
			if(params.extensions !== undefined){
				var poolsize = poolSizeServices.getPoolSize(params.extensions);
				addOns.push({
					name: "User",
					quantity: poolsize
				});
			}

			return addOns;
		}

		function remove(oid) {
			branches.forEach(function(item, index, array){
				if(item.oid && item.oid === oid) {
					array.splice(index, 1);
				}
			});
		}

		function setPlans(array){
			plans = array;
		}

		function getPlans(){
			return plans;
		}

		function setServers(array){
			servers = array;
		}

		function getServers(){
			return servers;
		}

		function clear() {
			branches = [];
			plans = [];
			servers = [];
		}

		function isPrefixValid(prefix) {
			
			var regex = /^[a-zA-Z0-9][a-zA-Z0-9-]{1,62}[a-zA-Z0-9]$/g;
			return prefix.match(regex);

		}

		function isPrefixUnique(prefix) {
			return api.request({
			    url: 'isPrefixValid',
			    params: {
			        prefix: prefix
			    }
			});
		}

		function getSubscriptionAmount(params, cb) {

			api.request({
				url: '/getSubscriptionAmount',
				params: params
			}).then(function(result){
				cb(null, result.data);
			}, function(err){
				cb(err);
			});

		}

	}

})();
(function(){

	'use strict';

	angular
		.module('app.core')
		.factory('cartService', cartService);

	cartService.$inject = ['$rootScope', 'customerService'];

	function cartService($rootScope, customerService) {

		var items = [];
		return {
			add: add,
			update: update,
			get: get,
			set: set,
			remove: remove,
			getAll: getAll,
			clear: clear
		};

		function newItem(params) {
			return {
				edit: params.edit !== undefined ? params.edit : true,
				remove: params.remove !== undefined ? params.remove : true,
				action: params.action,
				description: params.description,
				amount: params.amount,
				currency: customerService.getCustomer().currency,
				data: params.data
			};
		}

		function add(params) {
			// items = []; //comment this line to collect items in the cart, rather than substitute
			items.push(newItem(params));
		}

		function set(params, index) {
			index ? remove(index) : clear();
			index ? items[index] = newItem(params) : items.push(newItem(params));
		}

		function remove(index) {
			items.splice(index, 1);
		}

		function update(prefix, params) {
			var item = items.forEach(function(item, index, array) {
				if(item.data.result.prefix === prefix) array[index] = params;
			});
		}

		function get(prefix) {
			var found;
			items.forEach(function(item) {
				if(item.data.result.prefix === prefix) found = item;
			});
			return found;
		}

		function getAll() {
			return items;
		}
		
		function clear() {
			items.splice(0, items.length);
		}

	}

})();
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
(function(){

	'use strict';

	angular
		.module('app')
		.factory('errorService', errorService);

	errorService.$inject = ['$rootScope', '$translate', 'notifications'];

	function errorService($rootScope, $translate, notifications){

		return {
			show: show
		};

		function show(error){
			$translate('ERRORS.'+error)
			.then(function (translation){
				if('ERRORS.'+error === translation) {
					notifications.showError('ERROR_OCCURRED');
				} else {
					notifications.showError(translation);
				}
			});
		}

	}

})();
(function(){

	'use strict';

	angular
		.module('app')
		.factory('notifyService', notifyService);

	notifyService.$inject = ['$translate', 'notifications'];

	function notifyService($translate, notifications){

		return {
			show: show
		};

		function show(notify){
			$translate('NOTIFY.'+notify)
			.then(function (translation){
				if('NOTIFY.'+notify === translation) {
					return;
				} else {
					notifications.showSuccess(translation);
				}
			});
		}

	}

})();
(function(){

	'use strict';

	angular
		.module('app')
		.factory('poolSizeServices', poolSizeServices);

	poolSizeServices.$inject = ['utilsService'];

	function poolSizeServices(utils){

		return {
			getPoolSize: getPoolSize,
			poolArrayToString: poolArrayToString,
			poolStringToObject: poolStringToObject
		};

		function getPoolSize(arrayOrString) {
			var poolsize = 0;

			if(utils.isArray(arrayOrString)){
				arrayOrString.forEach(function(obj, indx, array){
					poolsize += obj.poolsize;
				});
			} else {
				arrayOrString
				.split(',')
				.map(function(str){
					return str.split('-');
				})
				.forEach(function(array){
					poolsize += parseInt(array[1] ? (array[1] - array[0]+1) : 1, 10);
				});
			}
				
			return poolsize;
		}

		function poolArrayToString(array) {
			var str = '';
			array.forEach(function(obj, indx, array){
				if(indx > 0) str += ',';
				str += obj.firstnumber;
				if(obj.poolsize > 1) str += ('-' + (obj.firstnumber+obj.poolsize-1));
			});
			return str;
		}

		function poolStringToObject(string) {
			var extensions = [];

			string
			.replace(/\s/g, '')
			.split(',')
			.map(function(str){
				return str.split('-');
			})
			.forEach(function(array){
				extensions.push({
					firstnumber: parseInt(array[0], 10),
					poolsize: parseInt(array[1] ? (array[1] - array[0]+1) : 1, 10)
				});
			});
			return extensions;
		}
	}

})();
(function(){

	'use strict';

	angular
		.module('app.core')
		.factory('spinnerService', spinnerService);

	// spinnerService.$inject = [];

	function spinnerService(){

		var spinners = {};
		return {
			_register: _register,
			show: show,
			hide: hide,
			showAll: showAll,
			hideAll: hideAll
		};
		
		function _register(data) {
			if (!data.hasOwnProperty('name')) {
				throw new Error("Spinner must specify a name when registering with the spinner service.");
			}
			if (spinners.hasOwnProperty(data.name)) {
				return false;
				// throw new Error("A spinner with the name '" + data.name + "' has already been registered.");
			}
			spinners[data.name] = data;
		}

		function show(name) {
			var spinner = spinners[name];
			if (!spinner) {
				throw new Error("No spinner named '" + name + "' is registered.");
			}
			spinner.show();
		}

		function hide(name) {
			var spinner = spinners[name];
			if (!spinner) {
				throw new Error("No spinner named '" + name + "' is registered.");
			}
			spinner.hide();
		}

		function showAll() {
			for (var name in spinners) {
				spinners[name].show();
			}
		}

		function hideAll() {
			for (var name in spinners) {
				spinners[name].hide();
			}
		}

	}

})();
(function(){

	'use strict';

	angular
		.module('app')
		.factory('storageService', storageService);

	storageService.$inject = ['$localStorage'];

	function storageService($localStorage){

		return {
			put: function (name, value) {
				$localStorage[name] = value;
			},
			get: function (name) {
				return $localStorage[name];
			}
		};

	}

})();
(function(){

	'use strict';

	angular
		.module('app')
		.factory('utilsService', utilsService);

	utilsService.$inject = ["uibDateParser"];

	function utilsService(uibDateParser){

		return {
			isArray: isArray,
			isString: isString,
			stringToFixed: stringToFixed,
			arrayToObject: arrayToObject,
			parseDate: parseDate,
			getDifference: getDifference,
			checkPasswordStrength: checkPasswordStrength,
			generatePassword: generatePassword
		};

		function isArray(obj) {
			return typeof obj === 'object';
		}

		function isString(obj) {
			return typeof obj === 'string';
		}

		function stringToFixed(string, point) {
			return parseFloat(string).toFixed(point);
		}

		function arrayToObject(array, key) {
			var obj = {}, prop = '';
			array.forEach(function(item){
				prop = item[key];
				obj[prop] = item;
			});
			return obj;
		}

		function parseDate(date, format) {
			return moment(date).format(format || 'DD MMMM YYYY');
			// return new Date(date).toLocaleDateString();
		}

		function getDifference(date1, date2, output) {
			return moment(date1).diff(date2, (output ? output : ''));
		}

		function checkPasswordStrength(string) {
			var strong = new RegExp("^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&\*])(?=.{10,})"),
				middle = new RegExp("^(((?=.*[a-z])(?=.*[A-Z])(?=.*[0-9]))|((?=.*[a-z])(?=.*[A-Z])(?=.*[!@#\$%\^&\*])))(?=.{8,})");
			if(strong.test(string)) {
				return 2;
			} else if(middle.test(string)) {
				return 1;
			} else {
				return 0;
			}
		}


		// TODO: generate password on the server side!!!
		function generatePassword(minlength, maxlength) {
			var chars = "abcdefghijklmnopqrstuvwxyz!@$%^&*_ABCDEFGHIJKLMNOP1234567890",
				passLength = Math.floor(Math.random() * (maxlength - minlength)) + minlength,
				pass = "";
			
			for (var x = 0; x < passLength; x++) {
				var i = Math.floor(Math.random() * chars.length);
				pass += chars.charAt(i);
			}
			return pass;
		}

	}

})();
(function(){

	'use strict';

	angular
		.module('app.core')
		.controller('SpinnerController', SpinnerController);

	SpinnerController.$inject = ['spinnerService'];

	function SpinnerController(spinnerService) {

		var vm = this;

		// Declare a mini-API to hand off to our service so the service
		// doesn't have a direct reference to this directive's scope.
		var api = {
			name: vm.name,
			group: vm.group,
			show: function () {
				vm.show = true;
			},
			hide: function () {
				vm.show = false;
			},
			toggle: function () {
				vm.show = !vm.show;
			}
		};

		// register should be true by default if not specified.
		if (!vm.hasOwnProperty('register')) {
			vm.register = true;
		} else {
			vm.register = vm.register.toLowerCase() === 'false' ? false : true;
		}

		// Register this spinner with the spinner service.
		if (vm.register === true) {
			spinnerService._register(api);
		}

		// If an onShow or onHide expression was provided, register a watcher
		// that will fire the relevant expression when show's value changes.
		if (vm.onShow || vm.onHide) {
			$scope.$watch('show', function (show) {
				if (show && vm.onShow) {
					vm.onShow({ spinnerService: spinnerService, spinnerApi: api });
				} else if (!show && vm.onHide) {
					vm.onHide({ spinnerService: spinnerService, spinnerApi: api });
				}
			});
		}

		// This spinner is good to go. Fire the onLoaded expression.
		if (vm.onLoaded) {
			vm.onLoaded({ spinnerService: spinnerService, spinnerApi: api });
		}

	}

})();
(function(){

	'use strict';

	angular
		.module('app')
		.directive('spinner', spinner);

	function spinner(){

		return {
			restrict: 'AE',
			replace: true,
			transclude: true,
			scope: {
				name: '@?',
				group: '@?',
				show: '=?',
				imgSrc: '@?',
				register: '@?',
				onLoaded: '&?',
				onShow: '&?',
				onHide: '&?'
			},
			template: [
				'<div ng-show="spinnerVm.show">',
				'  <img ng-if="spinnerVm.imgSrc" ng-src="{{spinnerVm.imgSrc}}" />',
				'  <ng-transclude></ng-transclude>',
				'</div>'
			].join(''),
			controller: 'SpinnerController',
			controllerAs: 'spinnerVm',
			bindToController: true
		};

	}

})();
(function(){

	'use strict';

	angular
		.module('app.core')
		.controller('DatePicker', DatePicker);

	DatePicker.$inject = ['utilsService', 'errorService'];

	function DatePicker(utils, errorService) {

		var vm = this;

		vm.opened = false;
		vm.open = function() {
			vm.opened = true;
		};

	}

})();
(function(){

	'use strict';

	angular
		.module('app')
		.directive('datePicker', datePicker);

	datePicker.$inject = ['utilsService'];

	function datePicker(utilsService){

		return {
			restrict: 'AE',
			transclude: true,
			scope: {
				dateFormat: '=',
				dateOptions: '=',
				model: '='
			},
			controller: 'DatePicker',
			controllerAs: 'pickerVm',
			templateUrl: 'components/date-picker/date-picker.html',
			link: link
		};

		function link(scope, el, attrs, ctrl){

			var iconsChanged = false;

			scope.$watch('pickerVm.opened', function (opened) {
				if(opened && !iconsChanged) {
					changeIcons();
					iconsChanged = true;
				}
			});

			function changeIcons(){
				var leftIco = el[0].querySelectorAll('.uib-left');
				var rightIco = el[0].querySelectorAll('.uib-right');

				console.log('changeIcons: ', el[0], leftIco, rightIco);

				// leftIco.className = 'fa fa-chevron-left';
				// rightIco.className = 'fa fa-chevron-right';

			}

		}

	}

})();
'use strict';
angular.module("ngLocale", [], ["$provide", function($provide) {
var PLURAL_CATEGORY = {ZERO: "zero", ONE: "one", TWO: "two", FEW: "few", MANY: "many", OTHER: "other"};
function getDecimals(n) {
  n = n + '';
  var i = n.indexOf('.');
  return (i == -1) ? 0 : n.length - i - 1;
}

function getVF(n, opt_precision) {
  var v = opt_precision;

  if (undefined === v) {
    v = Math.min(getDecimals(n), 3);
  }

  var base = Math.pow(10, v);
  var f = ((n * base) | 0) % base;
  return {v: v, f: f};
}

$provide.value("$locale", {
  "DATETIME_FORMATS": {
    "AMPMS": [
      "AM",
      "PM"
    ],
    "DAY": [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday"
    ],
    "ERANAMES": [
      "Before Christ",
      "Anno Domini"
    ],
    "ERAS": [
      "BC",
      "AD"
    ],
    "FIRSTDAYOFWEEK": 6,
    "MONTH": [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December"
    ],
    "SHORTDAY": [
      "Sun",
      "Mon",
      "Tue",
      "Wed",
      "Thu",
      "Fri",
      "Sat"
    ],
    "SHORTMONTH": [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec"
    ],
    "STANDALONEMONTH": [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December"
    ],
    "WEEKENDRANGE": [
      5,
      6
    ],
    "fullDate": "EEEE, MMMM d, y",
    "longDate": "MMMM d, y",
    "medium": "MMM d, y h:mm:ss a",
    "mediumDate": "MMM d, y",
    "mediumTime": "h:mm:ss a",
    "short": "M/d/yy h:mm a",
    "shortDate": "M/d/yy",
    "shortTime": "h:mm a"
  },
  "NUMBER_FORMATS": {
    "CURRENCY_SYM": "$",
    "DECIMAL_SEP": ".",
    "GROUP_SEP": ",",
    "PATTERNS": [
      {
        "gSize": 3,
        "lgSize": 3,
        "maxFrac": 3,
        "minFrac": 0,
        "minInt": 1,
        "negPre": "-",
        "negSuf": "",
        "posPre": "",
        "posSuf": ""
      },
      {
        "gSize": 3,
        "lgSize": 3,
        "maxFrac": 2,
        "minFrac": 2,
        "minInt": 1,
        "negPre": "-\u00a4",
        "negSuf": "",
        "posPre": "\u00a4",
        "posSuf": ""
      }
    ]
  },
  "id": "en",
  "localeID": "en",
  "pluralCat": function(n, opt_precision) {  var i = n | 0;  var vf = getVF(n, opt_precision);  if (i == 1 && vf.v == 0) {    return PLURAL_CATEGORY.ONE;  }  return PLURAL_CATEGORY.OTHER;}
});
}]);

'use strict';
angular.module("ngLocale", [], ["$provide", function($provide) {
var PLURAL_CATEGORY = {ZERO: "zero", ONE: "one", TWO: "two", FEW: "few", MANY: "many", OTHER: "other"};
function getDecimals(n) {
  n = n + '';
  var i = n.indexOf('.');
  return (i == -1) ? 0 : n.length - i - 1;
}

function getVF(n, opt_precision) {
  var v = opt_precision;

  if (undefined === v) {
    v = Math.min(getDecimals(n), 3);
  }

  var base = Math.pow(10, v);
  var f = ((n * base) | 0) % base;
  return {v: v, f: f};
}

$provide.value("$locale", {
  "DATETIME_FORMATS": {
    "AMPMS": [
      "AM",
      "PM"
    ],
    "DAY": [
      "\u0432\u043e\u0441\u043a\u0440\u0435\u0441\u0435\u043d\u044c\u0435",
      "\u043f\u043e\u043d\u0435\u0434\u0435\u043b\u044c\u043d\u0438\u043a",
      "\u0432\u0442\u043e\u0440\u043d\u0438\u043a",
      "\u0441\u0440\u0435\u0434\u0430",
      "\u0447\u0435\u0442\u0432\u0435\u0440\u0433",
      "\u043f\u044f\u0442\u043d\u0438\u0446\u0430",
      "\u0441\u0443\u0431\u0431\u043e\u0442\u0430"
    ],
    "ERANAMES": [
      "\u0434\u043e \u043d. \u044d.",
      "\u043d. \u044d."
    ],
    "ERAS": [
      "\u0434\u043e \u043d. \u044d.",
      "\u043d. \u044d."
    ],
    "FIRSTDAYOFWEEK": 0,
    "MONTH": [
      "\u044f\u043d\u0432\u0430\u0440\u044f",
      "\u0444\u0435\u0432\u0440\u0430\u043b\u044f",
      "\u043c\u0430\u0440\u0442\u0430",
      "\u0430\u043f\u0440\u0435\u043b\u044f",
      "\u043c\u0430\u044f",
      "\u0438\u044e\u043d\u044f",
      "\u0438\u044e\u043b\u044f",
      "\u0430\u0432\u0433\u0443\u0441\u0442\u0430",
      "\u0441\u0435\u043d\u0442\u044f\u0431\u0440\u044f",
      "\u043e\u043a\u0442\u044f\u0431\u0440\u044f",
      "\u043d\u043e\u044f\u0431\u0440\u044f",
      "\u0434\u0435\u043a\u0430\u0431\u0440\u044f"
    ],
    "SHORTDAY": [
      "\u0432\u0441",
      "\u043f\u043d",
      "\u0432\u0442",
      "\u0441\u0440",
      "\u0447\u0442",
      "\u043f\u0442",
      "\u0441\u0431"
    ],
    "SHORTMONTH": [
      "\u044f\u043d\u0432.",
      "\u0444\u0435\u0432\u0440.",
      "\u043c\u0430\u0440\u0442\u0430",
      "\u0430\u043f\u0440.",
      "\u043c\u0430\u044f",
      "\u0438\u044e\u043d\u044f",
      "\u0438\u044e\u043b\u044f",
      "\u0430\u0432\u0433.",
      "\u0441\u0435\u043d\u0442.",
      "\u043e\u043a\u0442.",
      "\u043d\u043e\u044f\u0431.",
      "\u0434\u0435\u043a."
    ],
    "STANDALONEMONTH": [
      "\u044f\u043d\u0432\u0430\u0440\u044c",
      "\u0444\u0435\u0432\u0440\u0430\u043b\u044c",
      "\u043c\u0430\u0440\u0442",
      "\u0430\u043f\u0440\u0435\u043b\u044c",
      "\u043c\u0430\u0439",
      "\u0438\u044e\u043d\u044c",
      "\u0438\u044e\u043b\u044c",
      "\u0430\u0432\u0433\u0443\u0441\u0442",
      "\u0441\u0435\u043d\u0442\u044f\u0431\u0440\u044c",
      "\u043e\u043a\u0442\u044f\u0431\u0440\u044c",
      "\u043d\u043e\u044f\u0431\u0440\u044c",
      "\u0434\u0435\u043a\u0430\u0431\u0440\u044c"
    ],
    "WEEKENDRANGE": [
      5,
      6
    ],
    "fullDate": "EEEE, d MMMM y '\u0433'.",
    "longDate": "d MMMM y '\u0433'.",
    "medium": "d MMM y '\u0433'. H:mm:ss",
    "mediumDate": "d MMM y '\u0433'.",
    "mediumTime": "H:mm:ss",
    "short": "dd.MM.yy H:mm",
    "shortDate": "dd.MM.yy",
    "shortTime": "H:mm"
  },
  "NUMBER_FORMATS": {
    "CURRENCY_SYM": "\u0440\u0443\u0431.",
    "DECIMAL_SEP": ",",
    "GROUP_SEP": "\u00a0",
    "PATTERNS": [
      {
        "gSize": 3,
        "lgSize": 3,
        "maxFrac": 3,
        "minFrac": 0,
        "minInt": 1,
        "negPre": "-",
        "negSuf": "",
        "posPre": "",
        "posSuf": ""
      },
      {
        "gSize": 3,
        "lgSize": 3,
        "maxFrac": 2,
        "minFrac": 2,
        "minInt": 1,
        "negPre": "-",
        "negSuf": "\u00a0\u00a4",
        "posPre": "",
        "posSuf": "\u00a0\u00a4"
      }
    ]
  },
  "id": "ru-ru",
  "localeID": "ru_RU",
  "pluralCat": function(n, opt_precision) {  var i = n | 0;  var vf = getVF(n, opt_precision);  if (vf.v == 0 && i % 10 == 1 && i % 100 != 11) {    return PLURAL_CATEGORY.ONE;  }  if (vf.v == 0 && i % 10 >= 2 && i % 10 <= 4 && (i % 100 < 12 || i % 100 > 14)) {    return PLURAL_CATEGORY.FEW;  }  if (vf.v == 0 && i % 10 == 0 || vf.v == 0 && i % 10 >= 5 && i % 10 <= 9 || vf.v == 0 && i % 100 >= 11 && i % 100 <= 14) {    return PLURAL_CATEGORY.MANY;  }  return PLURAL_CATEGORY.OTHER;}
});
}]);

'use strict';
angular.module("ngLocale", [], ["$provide", function($provide) {
var PLURAL_CATEGORY = {ZERO: "zero", ONE: "one", TWO: "two", FEW: "few", MANY: "many", OTHER: "other"};
function getDecimals(n) {
  n = n + '';
  var i = n.indexOf('.');
  return (i == -1) ? 0 : n.length - i - 1;
}

function getVF(n, opt_precision) {
  var v = opt_precision;

  if (undefined === v) {
    v = Math.min(getDecimals(n), 3);
  }

  var base = Math.pow(10, v);
  var f = ((n * base) | 0) % base;
  return {v: v, f: f};
}

$provide.value("$locale", {
  "DATETIME_FORMATS": {
    "AMPMS": [
      "AM",
      "PM"
    ],
    "DAY": [
      "\u0432\u043e\u0441\u043a\u0440\u0435\u0441\u0435\u043d\u044c\u0435",
      "\u043f\u043e\u043d\u0435\u0434\u0435\u043b\u044c\u043d\u0438\u043a",
      "\u0432\u0442\u043e\u0440\u043d\u0438\u043a",
      "\u0441\u0440\u0435\u0434\u0430",
      "\u0447\u0435\u0442\u0432\u0435\u0440\u0433",
      "\u043f\u044f\u0442\u043d\u0438\u0446\u0430",
      "\u0441\u0443\u0431\u0431\u043e\u0442\u0430"
    ],
    "ERANAMES": [
      "\u0434\u043e \u043d. \u044d.",
      "\u043d. \u044d."
    ],
    "ERAS": [
      "\u0434\u043e \u043d. \u044d.",
      "\u043d. \u044d."
    ],
    "FIRSTDAYOFWEEK": 0,
    "MONTH": [
      "\u044f\u043d\u0432\u0430\u0440\u044f",
      "\u0444\u0435\u0432\u0440\u0430\u043b\u044f",
      "\u043c\u0430\u0440\u0442\u0430",
      "\u0430\u043f\u0440\u0435\u043b\u044f",
      "\u043c\u0430\u044f",
      "\u0438\u044e\u043d\u044f",
      "\u0438\u044e\u043b\u044f",
      "\u0430\u0432\u0433\u0443\u0441\u0442\u0430",
      "\u0441\u0435\u043d\u0442\u044f\u0431\u0440\u044f",
      "\u043e\u043a\u0442\u044f\u0431\u0440\u044f",
      "\u043d\u043e\u044f\u0431\u0440\u044f",
      "\u0434\u0435\u043a\u0430\u0431\u0440\u044f"
    ],
    "SHORTDAY": [
      "\u0432\u0441",
      "\u043f\u043d",
      "\u0432\u0442",
      "\u0441\u0440",
      "\u0447\u0442",
      "\u043f\u0442",
      "\u0441\u0431"
    ],
    "SHORTMONTH": [
      "\u044f\u043d\u0432.",
      "\u0444\u0435\u0432\u0440.",
      "\u043c\u0430\u0440\u0442\u0430",
      "\u0430\u043f\u0440.",
      "\u043c\u0430\u044f",
      "\u0438\u044e\u043d\u044f",
      "\u0438\u044e\u043b\u044f",
      "\u0430\u0432\u0433.",
      "\u0441\u0435\u043d\u0442.",
      "\u043e\u043a\u0442.",
      "\u043d\u043e\u044f\u0431.",
      "\u0434\u0435\u043a."
    ],
    "STANDALONEMONTH": [
      "\u044f\u043d\u0432\u0430\u0440\u044c",
      "\u0444\u0435\u0432\u0440\u0430\u043b\u044c",
      "\u043c\u0430\u0440\u0442",
      "\u0430\u043f\u0440\u0435\u043b\u044c",
      "\u043c\u0430\u0439",
      "\u0438\u044e\u043d\u044c",
      "\u0438\u044e\u043b\u044c",
      "\u0430\u0432\u0433\u0443\u0441\u0442",
      "\u0441\u0435\u043d\u0442\u044f\u0431\u0440\u044c",
      "\u043e\u043a\u0442\u044f\u0431\u0440\u044c",
      "\u043d\u043e\u044f\u0431\u0440\u044c",
      "\u0434\u0435\u043a\u0430\u0431\u0440\u044c"
    ],
    "WEEKENDRANGE": [
      5,
      6
    ],
    "fullDate": "EEEE, d MMMM y '\u0433'.",
    "longDate": "d MMMM y '\u0433'.",
    "medium": "d MMM y '\u0433'. H:mm:ss",
    "mediumDate": "d MMM y '\u0433'.",
    "mediumTime": "H:mm:ss",
    "short": "dd.MM.yy H:mm",
    "shortDate": "dd.MM.yy",
    "shortTime": "H:mm"
  },
  "NUMBER_FORMATS": {
    "CURRENCY_SYM": "\u0440\u0443\u0431.",
    "DECIMAL_SEP": ",",
    "GROUP_SEP": "\u00a0",
    "PATTERNS": [
      {
        "gSize": 3,
        "lgSize": 3,
        "maxFrac": 3,
        "minFrac": 0,
        "minInt": 1,
        "negPre": "-",
        "negSuf": "",
        "posPre": "",
        "posSuf": ""
      },
      {
        "gSize": 3,
        "lgSize": 3,
        "maxFrac": 2,
        "minFrac": 2,
        "minInt": 1,
        "negPre": "-",
        "negSuf": "\u00a0\u00a4",
        "posPre": "",
        "posSuf": "\u00a0\u00a4"
      }
    ]
  },
  "id": "ru",
  "localeID": "ru",
  "pluralCat": function(n, opt_precision) {  var i = n | 0;  var vf = getVF(n, opt_precision);  if (vf.v == 0 && i % 10 == 1 && i % 100 != 11) {    return PLURAL_CATEGORY.ONE;  }  if (vf.v == 0 && i % 10 >= 2 && i % 10 <= 4 && (i % 100 < 12 || i % 100 > 14)) {    return PLURAL_CATEGORY.FEW;  }  if (vf.v == 0 && i % 10 == 0 || vf.v == 0 && i % 10 >= 5 && i % 10 <= 9 || vf.v == 0 && i % 100 >= 11 && i % 100 <= 14) {    return PLURAL_CATEGORY.MANY;  }  return PLURAL_CATEGORY.OTHER;}
});
}]);

'use strict';
angular.module("ngLocale", [], ["$provide", function($provide) {
var PLURAL_CATEGORY = {ZERO: "zero", ONE: "one", TWO: "two", FEW: "few", MANY: "many", OTHER: "other"};
function getDecimals(n) {
  n = n + '';
  var i = n.indexOf('.');
  return (i == -1) ? 0 : n.length - i - 1;
}

function getVF(n, opt_precision) {
  var v = opt_precision;

  if (undefined === v) {
    v = Math.min(getDecimals(n), 3);
  }

  var base = Math.pow(10, v);
  var f = ((n * base) | 0) % base;
  return {v: v, f: f};
}

$provide.value("$locale", {
  "DATETIME_FORMATS": {
    "AMPMS": [
      "\u0434\u043f",
      "\u043f\u043f"
    ],
    "DAY": [
      "\u043d\u0435\u0434\u0456\u043b\u044f",
      "\u043f\u043e\u043d\u0435\u0434\u0456\u043b\u043e\u043a",
      "\u0432\u0456\u0432\u0442\u043e\u0440\u043e\u043a",
      "\u0441\u0435\u0440\u0435\u0434\u0430",
      "\u0447\u0435\u0442\u0432\u0435\u0440",
      "\u043f\u02bc\u044f\u0442\u043d\u0438\u0446\u044f",
      "\u0441\u0443\u0431\u043e\u0442\u0430"
    ],
    "ERANAMES": [
      "\u0434\u043e \u043d\u0430\u0448\u043e\u0457 \u0435\u0440\u0438",
      "\u043d\u0430\u0448\u043e\u0457 \u0435\u0440\u0438"
    ],
    "ERAS": [
      "\u0434\u043e \u043d.\u0435.",
      "\u043d.\u0435."
    ],
    "FIRSTDAYOFWEEK": 0,
    "MONTH": [
      "\u0441\u0456\u0447\u043d\u044f",
      "\u043b\u044e\u0442\u043e\u0433\u043e",
      "\u0431\u0435\u0440\u0435\u0437\u043d\u044f",
      "\u043a\u0432\u0456\u0442\u043d\u044f",
      "\u0442\u0440\u0430\u0432\u043d\u044f",
      "\u0447\u0435\u0440\u0432\u043d\u044f",
      "\u043b\u0438\u043f\u043d\u044f",
      "\u0441\u0435\u0440\u043f\u043d\u044f",
      "\u0432\u0435\u0440\u0435\u0441\u043d\u044f",
      "\u0436\u043e\u0432\u0442\u043d\u044f",
      "\u043b\u0438\u0441\u0442\u043e\u043f\u0430\u0434\u0430",
      "\u0433\u0440\u0443\u0434\u043d\u044f"
    ],
    "SHORTDAY": [
      "\u041d\u0434",
      "\u041f\u043d",
      "\u0412\u0442",
      "\u0421\u0440",
      "\u0427\u0442",
      "\u041f\u0442",
      "\u0421\u0431"
    ],
    "SHORTMONTH": [
      "\u0441\u0456\u0447.",
      "\u043b\u044e\u0442.",
      "\u0431\u0435\u0440.",
      "\u043a\u0432\u0456\u0442.",
      "\u0442\u0440\u0430\u0432.",
      "\u0447\u0435\u0440\u0432.",
      "\u043b\u0438\u043f.",
      "\u0441\u0435\u0440\u043f.",
      "\u0432\u0435\u0440.",
      "\u0436\u043e\u0432\u0442.",
      "\u043b\u0438\u0441\u0442.",
      "\u0433\u0440\u0443\u0434."
    ],
    "STANDALONEMONTH": [
      "\u0421\u0456\u0447\u0435\u043d\u044c",
      "\u041b\u044e\u0442\u0438\u0439",
      "\u0411\u0435\u0440\u0435\u0437\u0435\u043d\u044c",
      "\u041a\u0432\u0456\u0442\u0435\u043d\u044c",
      "\u0422\u0440\u0430\u0432\u0435\u043d\u044c",
      "\u0427\u0435\u0440\u0432\u0435\u043d\u044c",
      "\u041b\u0438\u043f\u0435\u043d\u044c",
      "\u0421\u0435\u0440\u043f\u0435\u043d\u044c",
      "\u0412\u0435\u0440\u0435\u0441\u0435\u043d\u044c",
      "\u0416\u043e\u0432\u0442\u0435\u043d\u044c",
      "\u041b\u0438\u0441\u0442\u043e\u043f\u0430\u0434",
      "\u0413\u0440\u0443\u0434\u0435\u043d\u044c"
    ],
    "WEEKENDRANGE": [
      5,
      6
    ],
    "fullDate": "EEEE, d MMMM y '\u0440'.",
    "longDate": "d MMMM y '\u0440'.",
    "medium": "d MMM y '\u0440'. HH:mm:ss",
    "mediumDate": "d MMM y '\u0440'.",
    "mediumTime": "HH:mm:ss",
    "short": "dd.MM.yy HH:mm",
    "shortDate": "dd.MM.yy",
    "shortTime": "HH:mm"
  },
  "NUMBER_FORMATS": {
    "CURRENCY_SYM": "\u20b4",
    "DECIMAL_SEP": ",",
    "GROUP_SEP": "\u00a0",
    "PATTERNS": [
      {
        "gSize": 3,
        "lgSize": 3,
        "maxFrac": 3,
        "minFrac": 0,
        "minInt": 1,
        "negPre": "-",
        "negSuf": "",
        "posPre": "",
        "posSuf": ""
      },
      {
        "gSize": 3,
        "lgSize": 3,
        "maxFrac": 2,
        "minFrac": 2,
        "minInt": 1,
        "negPre": "-",
        "negSuf": "\u00a0\u00a4",
        "posPre": "",
        "posSuf": "\u00a0\u00a4"
      }
    ]
  },
  "id": "uk-ua",
  "localeID": "uk_UA",
  "pluralCat": function(n, opt_precision) {  var i = n | 0;  var vf = getVF(n, opt_precision);  if (vf.v == 0 && i % 10 == 1 && i % 100 != 11) {    return PLURAL_CATEGORY.ONE;  }  if (vf.v == 0 && i % 10 >= 2 && i % 10 <= 4 && (i % 100 < 12 || i % 100 > 14)) {    return PLURAL_CATEGORY.FEW;  }  if (vf.v == 0 && i % 10 == 0 || vf.v == 0 && i % 10 >= 5 && i % 10 <= 9 || vf.v == 0 && i % 100 >= 11 && i % 100 <= 14) {    return PLURAL_CATEGORY.MANY;  }  return PLURAL_CATEGORY.OTHER;}
});
}]);

'use strict';
angular.module("ngLocale", [], ["$provide", function($provide) {
var PLURAL_CATEGORY = {ZERO: "zero", ONE: "one", TWO: "two", FEW: "few", MANY: "many", OTHER: "other"};
function getDecimals(n) {
  n = n + '';
  var i = n.indexOf('.');
  return (i == -1) ? 0 : n.length - i - 1;
}

function getVF(n, opt_precision) {
  var v = opt_precision;

  if (undefined === v) {
    v = Math.min(getDecimals(n), 3);
  }

  var base = Math.pow(10, v);
  var f = ((n * base) | 0) % base;
  return {v: v, f: f};
}

$provide.value("$locale", {
  "DATETIME_FORMATS": {
    "AMPMS": [
      "\u0434\u043f",
      "\u043f\u043f"
    ],
    "DAY": [
      "\u043d\u0435\u0434\u0456\u043b\u044f",
      "\u043f\u043e\u043d\u0435\u0434\u0456\u043b\u043e\u043a",
      "\u0432\u0456\u0432\u0442\u043e\u0440\u043e\u043a",
      "\u0441\u0435\u0440\u0435\u0434\u0430",
      "\u0447\u0435\u0442\u0432\u0435\u0440",
      "\u043f\u02bc\u044f\u0442\u043d\u0438\u0446\u044f",
      "\u0441\u0443\u0431\u043e\u0442\u0430"
    ],
    "ERANAMES": [
      "\u0434\u043e \u043d\u0430\u0448\u043e\u0457 \u0435\u0440\u0438",
      "\u043d\u0430\u0448\u043e\u0457 \u0435\u0440\u0438"
    ],
    "ERAS": [
      "\u0434\u043e \u043d.\u0435.",
      "\u043d.\u0435."
    ],
    "FIRSTDAYOFWEEK": 0,
    "MONTH": [
      "\u0441\u0456\u0447\u043d\u044f",
      "\u043b\u044e\u0442\u043e\u0433\u043e",
      "\u0431\u0435\u0440\u0435\u0437\u043d\u044f",
      "\u043a\u0432\u0456\u0442\u043d\u044f",
      "\u0442\u0440\u0430\u0432\u043d\u044f",
      "\u0447\u0435\u0440\u0432\u043d\u044f",
      "\u043b\u0438\u043f\u043d\u044f",
      "\u0441\u0435\u0440\u043f\u043d\u044f",
      "\u0432\u0435\u0440\u0435\u0441\u043d\u044f",
      "\u0436\u043e\u0432\u0442\u043d\u044f",
      "\u043b\u0438\u0441\u0442\u043e\u043f\u0430\u0434\u0430",
      "\u0433\u0440\u0443\u0434\u043d\u044f"
    ],
    "SHORTDAY": [
      "\u041d\u0434",
      "\u041f\u043d",
      "\u0412\u0442",
      "\u0421\u0440",
      "\u0427\u0442",
      "\u041f\u0442",
      "\u0421\u0431"
    ],
    "SHORTMONTH": [
      "\u0441\u0456\u0447.",
      "\u043b\u044e\u0442.",
      "\u0431\u0435\u0440.",
      "\u043a\u0432\u0456\u0442.",
      "\u0442\u0440\u0430\u0432.",
      "\u0447\u0435\u0440\u0432.",
      "\u043b\u0438\u043f.",
      "\u0441\u0435\u0440\u043f.",
      "\u0432\u0435\u0440.",
      "\u0436\u043e\u0432\u0442.",
      "\u043b\u0438\u0441\u0442.",
      "\u0433\u0440\u0443\u0434."
    ],
    "STANDALONEMONTH": [
      "\u0421\u0456\u0447\u0435\u043d\u044c",
      "\u041b\u044e\u0442\u0438\u0439",
      "\u0411\u0435\u0440\u0435\u0437\u0435\u043d\u044c",
      "\u041a\u0432\u0456\u0442\u0435\u043d\u044c",
      "\u0422\u0440\u0430\u0432\u0435\u043d\u044c",
      "\u0427\u0435\u0440\u0432\u0435\u043d\u044c",
      "\u041b\u0438\u043f\u0435\u043d\u044c",
      "\u0421\u0435\u0440\u043f\u0435\u043d\u044c",
      "\u0412\u0435\u0440\u0435\u0441\u0435\u043d\u044c",
      "\u0416\u043e\u0432\u0442\u0435\u043d\u044c",
      "\u041b\u0438\u0441\u0442\u043e\u043f\u0430\u0434",
      "\u0413\u0440\u0443\u0434\u0435\u043d\u044c"
    ],
    "WEEKENDRANGE": [
      5,
      6
    ],
    "fullDate": "EEEE, d MMMM y '\u0440'.",
    "longDate": "d MMMM y '\u0440'.",
    "medium": "d MMM y '\u0440'. HH:mm:ss",
    "mediumDate": "d MMM y '\u0440'.",
    "mediumTime": "HH:mm:ss",
    "short": "dd.MM.yy HH:mm",
    "shortDate": "dd.MM.yy",
    "shortTime": "HH:mm"
  },
  "NUMBER_FORMATS": {
    "CURRENCY_SYM": "\u20b4",
    "DECIMAL_SEP": ",",
    "GROUP_SEP": "\u00a0",
    "PATTERNS": [
      {
        "gSize": 3,
        "lgSize": 3,
        "maxFrac": 3,
        "minFrac": 0,
        "minInt": 1,
        "negPre": "-",
        "negSuf": "",
        "posPre": "",
        "posSuf": ""
      },
      {
        "gSize": 3,
        "lgSize": 3,
        "maxFrac": 2,
        "minFrac": 2,
        "minInt": 1,
        "negPre": "-",
        "negSuf": "\u00a0\u00a4",
        "posPre": "",
        "posSuf": "\u00a0\u00a4"
      }
    ]
  },
  "id": "uk",
  "localeID": "uk",
  "pluralCat": function(n, opt_precision) {  var i = n | 0;  var vf = getVF(n, opt_precision);  if (vf.v == 0 && i % 10 == 1 && i % 100 != 11) {    return PLURAL_CATEGORY.ONE;  }  if (vf.v == 0 && i % 10 >= 2 && i % 10 <= 4 && (i % 100 < 12 || i % 100 > 14)) {    return PLURAL_CATEGORY.FEW;  }  if (vf.v == 0 && i % 10 == 0 || vf.v == 0 && i % 10 >= 5 && i % 10 <= 9 || vf.v == 0 && i % 100 >= 11 && i % 100 <= 14) {    return PLURAL_CATEGORY.MANY;  }  return PLURAL_CATEGORY.OTHER;}
});
}]);

(function(){

	'use strict';

	angular
		.module('app.layout')
		.controller('FooterController', FooterController);

	FooterController.$inject = ['$rootScope'];

	function FooterController($rootScope) {

		var vm = this;
		// vm.footer = true;
		
	}

})();
(function(){

	'use strict';

	angular
		.module('app.layout')
		.directive('footer', footer);

	function footer(){

		return {
			restrict: 'AE',
			transclude: true,
			controller: 'FooterController',
			controllerAs: 'footerVm',
			templateUrl: 'layout/footer/footer.html'
		};

	}

})();
(function(){

	'use strict';

	angular
		.module('app.layout')
		.directive('langNav', langNav);

	function langNav(){

		return {
			restrict: 'AE',
			transclude: true,
			controller: 'LangController',
			controllerAs: 'langVm',
			templateUrl: 'layout/langnav/langnav.html'
		};

	}

})();
(function(){

	'use strict';

	angular
		.module('app.layout')
		.controller('LangController', LangController);

	LangController.$inject = ['$localStorage', '$rootScope', '$scope', '$translate', 'apiService', 'authService', 'tmhDynamicLocale'];

	function LangController($localStorage, $rootScope, $scope, $translate, api, authService, tmhDynamicLocale) {

		var vm = this;
		vm.changeLanguage = changeLanguage;

		tmhDynamicLocale.set($localStorage.NG_TRANSLATE_LANG_KEY || 'en');
		
		function changeLanguage(langKey) {
			$translate.use(langKey);
			if(!authService.isLoggedIn()) {
				$rootScope.$emit('lang.change', { lang: langKey });
				$scope.layoutVm.triggerLangMenu();
			} else {
				api.request({
					url: 'setCustomerLang',
					params: {
						lang: langKey
					}
				}).then(function (res){
					if(!res.data.success) return errorService.show(res.data.message);
					
					$rootScope.$emit('lang.change', { lang: langKey });
					$scope.layoutVm.triggerLangMenu();
				}, function (err){
					errorService.show(err);
				});
			}

			tmhDynamicLocale.set(langKey);
		}

	}

})();
(function(){

	'use strict';

	angular
		.module('app.layout')
		.controller('TopbarController', TopbarController);

	TopbarController.$inject = ['$rootScope', '$scope', '$localStorage', '$translate'];

	function TopbarController($rootScope, $scope, $localStorage, $translate) {

		var vm = this;
		vm.lang = $localStorage.NG_TRANSLATE_LANG_KEY || $translate.use();

		$rootScope.$on('lang.change', function(e, data){
			if(data.lang) vm.lang = data.lang;
		});
		

	}

})();
(function(){

	'use strict';

	angular
		.module('app.layout')
		.directive('topBar', topBar);

	function topBar(){

		return {
			restrict: 'AE',
			transclude: true,
			controller: 'TopbarController',
			controllerAs: 'topbarVm',
			templateUrl: 'layout/topbar/topbar.html',
		};

	}

})();
(function(){

	'use strict';

	angular
		.module('app.core')
		.directive('uniquePrefix', uniquePrefix);

	uniquePrefix.$inject = ['$q', 'branchesService', 'errorService'];
	function uniquePrefix($q, branchesService, errorService){

		return {
			restrict: 'AE',
			require: 'ngModel',
			link: link
		};

		function link(scope, el, attrs, ctrl) {

		    ctrl.$asyncValidators.uniquePrefix = function(modelValue, viewValue) {
		    	if (ctrl.$isEmpty(modelValue)) {
		    	  // consider empty model valid
		    	  return $q.when();
		    	}

		    	var def = $q.defer();

		    	branchesService.isPrefixUnique(modelValue)
		    	.then(function(res){
		    		console.log('uniquePrefix: ', res);
		    	    if(res.data.result) def.resolve();
		    	    else def.reject();
		    	}, function(err){
		    	    errorService.show(err);
		    	    def.reject();
		    	});

		    	return def.promise;
		        
		    };
		}

	}

})();
(function(){

	'use strict';

	angular
		.module('app.core')
		.directive('validName', validName);

	validName.$inject = ['$q', 'apiService', 'errorService'];
	function validName($q, api, errorService){

		return {
			restrict: 'AE',
			require: 'ngModel',
			link: link
		};

		function link(scope, el, attrs, ctrl) {

		    ctrl.$asyncValidators.validName = function(modelValue, viewValue) {
		        if (ctrl.$isEmpty(modelValue)) {
		          // consider empty model valid
		          return $q.when();
		        }

		        var def = $q.defer();

		        api.request({
		            url: 'isNameValid',
		            params: {
		                name: modelValue
		            }
		        }).then(function(res){
		        	console.log('validName: ', res);
		            if(res.data.result) def.resolve();
		            else def.reject();
		        }, function(err){
		            errorService.show(err);
		            def.reject();
		        });

		        return def.promise;
		    };
		}

	}

})();
(function(){

	'use strict';

	angular
		.module('app.core')
		.directive('validPrefix', validPrefix);

	validPrefix.$inject = ['branchesService'];
	function validPrefix(branchesService){

		return {
			restrict: 'AE',
			require: 'ngModel',
			link: link
		};

		function link(scope, el, attrs, ctrl) {

		    el.on('keydown', function (e){
		        if (e.altKey || e.keyCode === 18 || e.keyCode === 32 || (e.keyCode !== 189 && e.keyCode > 90)) {
		            e.preventDefault();
		        }
		    });
		    
		    ctrl.$validators.validPrefix = function(modelValue, viewValue) {
		    	if (ctrl.$isEmpty(modelValue)) {
		    	  // consider empty model valid
		    	  return true;
		    	}

		    	if(branchesService.isPrefixValid(modelValue)) {
		    		return true;
		    	} else {
		    		return false;
		    	}
		        
		    };
		}

	}

})();
(function(){

	'use strict';

	angular
		.module('app.layout')
		.directive('sideMenu', sideMenu);

	function sideMenu(){

		return {
			restrict: 'AE',
			transclude: true,
			controller: 'SidemenuController',
			controllerAs: 'sidemenuVm',
			templateUrl: 'layout/sidemenu/sidemenu.html'
		};

	}

})();
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC5qcyIsImFwcC5hdXRoLmpzIiwiYXBwLmJpbGxpbmcuanMiLCJhcHAuY29uZmlnLmpzIiwiYXBwLmNvcmUuanMiLCJhcHAuZGFzaGJvYXJkLmpzIiwiYXBwLmluc3RhbmNlLmpzIiwiYXBwLmxheW91dC5qcyIsImFwcC5wYXltZW50LmpzIiwiYXBwLnByb2ZpbGUuanMiLCJhcHAucm91dGVzLmpzIiwiYXV0aC9hdXRoLmNvbnRyb2xsZXIuanMiLCJhdXRoL2F1dGgucm91dGUuanMiLCJiaWxsaW5nL2JpbGxpbmcuY29udHJvbGxlci5qcyIsImJpbGxpbmcvYmlsbGluZy5yb3V0ZS5qcyIsImNvbXBvbmVudHMvaXMtcGFzc3dvcmQuZGlyZWN0aXZlLmpzIiwiY29tcG9uZW50cy9wYXNzd29yZC5kaXJlY3RpdmUuanMiLCJkYXNoYm9hcmQvZGFzaC1pbnN0YW5jZS5jb250cm9sbGVyLmpzIiwiZGFzaGJvYXJkL2Rhc2gtaW5zdGFuY2UuZGlyZWN0aXZlLmpzIiwiZGFzaGJvYXJkL2Rhc2hib2FyZC5jb250cm9sbGVyLmpzIiwiZGFzaGJvYXJkL2Rhc2hib2FyZC5yb3V0ZS5qcyIsImluc3RhbmNlL2luc3RhbmNlLXN1bW1hcnkuZGlyZWN0aXZlLmpzIiwiaW5zdGFuY2UvaW5zdGFuY2UuY29udHJvbGxlci5qcyIsImluc3RhbmNlL2luc3RhbmNlLnJvdXRlLmpzIiwiaW5zdGFuY2UvcGxhbi1pdGVtLmRpcmVjdGl2ZS5qcyIsImluc3RhbmNlL3NlcnZlci1pdGVtLmRpcmVjdGl2ZS5qcyIsInByb2ZpbGUvcHJvZmlsZS5jb250cm9sbGVyLmpzIiwicHJvZmlsZS9wcm9maWxlLnJvdXRlLmpzIiwiZmlsdGVycy9maWx0ZXJzLmpzIiwibGF5b3V0L2NvbnRlbnQuY29udHJvbGxlci5qcyIsImxheW91dC9sYXlvdXQuY29udHJvbGxlci5qcyIsInBheW1lbnQvbWV0aG9kLWl0ZW0uZGlyZWN0aXZlLmpzIiwicGF5bWVudC9wYXltZW50LmNvbnRyb2xsZXIuanMiLCJwYXltZW50L3BheW1lbnQucm91dGUuanMiLCJzZXJ2aWNlcy9hcGkuanMiLCJzZXJ2aWNlcy9hdXRoLmpzIiwic2VydmljZXMvYnJhbmNoZXMuanMiLCJzZXJ2aWNlcy9jYXJ0LmpzIiwic2VydmljZXMvY3VzdG9tZXJTZXJ2aWNlLmpzIiwic2VydmljZXMvZXJyb3IuanMiLCJzZXJ2aWNlcy9ub3RpZnkuanMiLCJzZXJ2aWNlcy9wb29sU2l6ZS5qcyIsInNlcnZpY2VzL3NwaW5uZXIuanMiLCJzZXJ2aWNlcy9zdG9yYWdlLmpzIiwic2VydmljZXMvdXRpbHNTZXJ2aWNlLmpzIiwiY29tcG9uZW50cy9zcGlubmVyL3NwaW5uZXIuY29udHJvbGxlci5qcyIsImNvbXBvbmVudHMvc3Bpbm5lci9zcGlubmVyLmRpcmVjdGl2ZS5qcyIsImNvbXBvbmVudHMvZGF0ZS1waWNrZXIvZGF0ZS1waWNrZXIuY29udHJvbGxlci5qcyIsImNvbXBvbmVudHMvZGF0ZS1waWNrZXIvZGF0ZS1waWNrZXIuZGlyZWN0aXZlLmpzIiwibGliL2kxOG4vYW5ndWxhci1sb2NhbGVfZW4uanMiLCJsaWIvaTE4bi9hbmd1bGFyLWxvY2FsZV9ydS1ydS5qcyIsImxpYi9pMThuL2FuZ3VsYXItbG9jYWxlX3J1LmpzIiwibGliL2kxOG4vYW5ndWxhci1sb2NhbGVfdWstdWEuanMiLCJsaWIvaTE4bi9hbmd1bGFyLWxvY2FsZV91ay5qcyIsImxheW91dC9mb290ZXIvZm9vdGVyLmNvbnRyb2xsZXIuanMiLCJsYXlvdXQvZm9vdGVyL2Zvb3Rlci5kaXJlY3RpdmUuanMiLCJsYXlvdXQvbGFuZ25hdi9sYW5nLW5hdi5kaXJlY3RpdmUuanMiLCJsYXlvdXQvbGFuZ25hdi9sYW5nLmNvbnRyb2xsZXIuanMiLCJsYXlvdXQvdG9wYmFyL3RvcC1iYXIuY29udHJvbGxlci5qcyIsImxheW91dC90b3BiYXIvdG9wLWJhci5kaXJlY3RpdmUuanMiLCJpbnN0YW5jZS92YWxpZGF0aW9uLWRpcmVjdGl2ZXMvdW5pcXVlLXByZWZpeC5qcyIsImluc3RhbmNlL3ZhbGlkYXRpb24tZGlyZWN0aXZlcy92YWxpZC1uYW1lLmpzIiwiaW5zdGFuY2UvdmFsaWRhdGlvbi1kaXJlY3RpdmVzL3ZhbGlkLXByZWZpeC5qcyIsImxheW91dC9zaWRlbWVudS9zaWRlLW1lbnUuZGlyZWN0aXZlLmpzIiwibGF5b3V0L3NpZGVtZW51L3NpZGVtZW51LmNvbnRyb2xsZXIuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ1ZBO0FBQ0E7QUFDQTtBQ0ZBO0FBQ0E7QUFDQTtBQ0ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN2REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNUQTtBQUNBO0FBQ0E7QUNGQTtBQUNBO0FBQ0E7QUNGQTtBQUNBO0FBQ0E7QUNGQTtBQUNBO0FBQ0E7QUNGQTtBQUNBO0FBQ0E7QUNGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDL0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzNHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzlCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN0SUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNsQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDekNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ25DQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDdkdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN6QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzFEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2xCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzlCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3hmQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2xCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNsREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNsQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNaQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNqQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3BEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzlLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2xCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3JCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDOUZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNwSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3pFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDeENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzdCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUM3QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDcEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzlEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN2QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNqRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzdEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDckNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDckJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNwREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDL0lBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQy9JQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUMvSUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDL0lBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQy9JQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNqQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDcEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3BCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDM0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN0QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDcEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzVDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUMvQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUMxQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDcEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImFsbC5qcyIsInNvdXJjZXNDb250ZW50IjpbImFuZ3VsYXIubW9kdWxlKCdhcHAnLCBbXG5cdCdhcHAuY29yZScsXG5cdCdhcHAucm91dGVzJyxcblx0J2FwcC5sYXlvdXQnLFxuXHQnYXBwLmF1dGgnLFxuXHQnYXBwLmJpbGxpbmcnLFxuXHQnYXBwLmRhc2hib2FyZCcsXG5cdCdhcHAuaW5zdGFuY2UnLFxuXHQnYXBwLnBheW1lbnQnLFxuXHQnYXBwLnByb2ZpbGUnXG5dKTsiLCJhbmd1bGFyLm1vZHVsZSgnYXBwLmF1dGgnLCBbXG5cdCdhcHAuY29yZSdcbl0pOyIsImFuZ3VsYXIubW9kdWxlKCdhcHAuYmlsbGluZycsIFtcblx0J2FwcC5jb3JlJ1xuXSk7IiwiYW5ndWxhci5tb2R1bGUoJ2FwcCcpXG4udmFsdWUoJ21vbWVudCcsIG1vbWVudClcbi5jb25zdGFudCgnYXBwQ29uZmlnJywge1xuXHRzZXJ2ZXI6IHdpbmRvdy5sb2NhdGlvbi5wcm90b2NvbCArICcvLycgKyB3aW5kb3cubG9jYXRpb24uaG9zdFxufSlcbi5jb25maWcoWyckaHR0cFByb3ZpZGVyJywgZnVuY3Rpb24oJGh0dHBQcm92aWRlcikge1xuXHQkaHR0cFByb3ZpZGVyLmludGVyY2VwdG9ycy5wdXNoKFsnJHEnLCAnJGxvY2F0aW9uJywgJyRsb2NhbFN0b3JhZ2UnLCAnY3VzdG9tZXJTZXJ2aWNlJywgZnVuY3Rpb24oJHEsICRsb2NhdGlvbiwgJGxvY2FsU3RvcmFnZSwgY3VzdG9tZXJTZXJ2aWNlKSB7XG4gICAgICAgIHJldHVybiB7XG5cdFx0XHRyZXF1ZXN0OiBmdW5jdGlvbihjb25maWcpIHtcblx0XHRcdFx0Y29uZmlnLmhlYWRlcnMgPSBjb25maWcuaGVhZGVycyB8fCB7fTtcblx0XHRcdFx0aWYgKCRsb2NhbFN0b3JhZ2UudG9rZW4pIHtcblx0XHRcdFx0XHRjb25maWcuaGVhZGVyc1sneC1hY2Nlc3MtdG9rZW4nXSA9ICRsb2NhbFN0b3JhZ2UudG9rZW47XG5cdFx0XHRcdH1cblx0XHRcdFx0cmV0dXJuIGNvbmZpZztcblx0XHRcdH0sXG5cdFx0XHRyZXNwb25zZUVycm9yOiBmdW5jdGlvbihlcnJvcikge1xuXHRcdFx0XHRpZihlcnJvci5zdGF0dXMgPT09IDQwMSB8fCBlcnJvci5zdGF0dXMgPT09IDQwMykge1xuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdyZXNwb25zZUVycm9yOiAnLCAkbG9jYXRpb24ucGF0aCgpLCBlcnJvci5zdGF0dXMsIGVycm9yKTtcblx0XHRcdFx0XHQkbG9jYXRpb24ucGF0aCgnL2xvZ2luJyk7XG5cdFx0XHRcdH1cblx0XHRcdFx0cmV0dXJuICRxLnJlamVjdChlcnJvcik7XG5cdFx0XHR9LFxuXHRcdFx0cmVzcG9uc2U6IGZ1bmN0aW9uKHJlc3BvbnNlKXtcblx0XHRcdFx0aWYocmVzcG9uc2UuZGF0YS50b2tlbikge1xuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdyZXNwb25zZTogJywgcmVzcG9uc2UuZGF0YSk7XG5cdFx0XHRcdFx0JGxvY2FsU3RvcmFnZS50b2tlbiA9IHJlc3BvbnNlLmRhdGEudG9rZW47XG5cdFx0XHRcdH1cblx0XHRcdFx0Ly8gaWYocmVzcG9uc2UuZGF0YS5jdXN0b21lciAmJiAhY3VzdG9tZXJTZXJ2aWNlLmdldEN1c3RvbWVyKCkpe1xuXHRcdFx0XHQvLyBcdGN1c3RvbWVyU2VydmljZS5zZXRDdXN0b21lcihyZXNwb25zZS5kYXRhLmN1c3RvbWVyKTtcblx0XHRcdFx0Ly8gfVxuXHRcdFx0XHRyZXR1cm4gcmVzcG9uc2U7XG5cdFx0XHR9XG4gICAgICAgIH07XG5cdH1dKTtcbn1dKVxuLmNvbmZpZyhbJ25vdGlmaWNhdGlvbnNDb25maWdQcm92aWRlcicsIGZ1bmN0aW9uIChub3RpZmljYXRpb25zQ29uZmlnUHJvdmlkZXIpIHtcbiAgICBub3RpZmljYXRpb25zQ29uZmlnUHJvdmlkZXIuc2V0QXV0b0hpZGUodHJ1ZSk7XG4gICAgbm90aWZpY2F0aW9uc0NvbmZpZ1Byb3ZpZGVyLnNldEhpZGVEZWxheSg1MDAwKTtcbiAgICBub3RpZmljYXRpb25zQ29uZmlnUHJvdmlkZXIuc2V0QXV0b0hpZGVBbmltYXRpb24oJ2ZhZGVPdXROb3RpZmljYXRpb25zJyk7XG4gICAgbm90aWZpY2F0aW9uc0NvbmZpZ1Byb3ZpZGVyLnNldEF1dG9IaWRlQW5pbWF0aW9uRGVsYXkoNTAwKTtcblx0bm90aWZpY2F0aW9uc0NvbmZpZ1Byb3ZpZGVyLnNldEFjY2VwdEhUTUwodHJ1ZSk7XG59XSlcbi5jb25maWcoWyckdHJhbnNsYXRlUHJvdmlkZXInLCBmdW5jdGlvbigkdHJhbnNsYXRlUHJvdmlkZXIpIHtcblx0JHRyYW5zbGF0ZVByb3ZpZGVyLnVzZVN0YXRpY0ZpbGVzTG9hZGVyKHtcblx0XHRwcmVmaXg6ICcuL2Fzc2V0cy90cmFuc2xhdGlvbnMvbG9jYWxlLScsXG5cdFx0c3VmZml4OiAnLmpzb24nXG5cdH0pO1xuXHQkdHJhbnNsYXRlUHJvdmlkZXIucHJlZmVycmVkTGFuZ3VhZ2UoJ2VuJyk7XG5cdCR0cmFuc2xhdGVQcm92aWRlci5mYWxsYmFja0xhbmd1YWdlKCdlbicpO1xuXHQkdHJhbnNsYXRlUHJvdmlkZXIudXNlU3RvcmFnZSgnc3RvcmFnZVNlcnZpY2UnKTtcblx0JHRyYW5zbGF0ZVByb3ZpZGVyLnVzZVNhbml0aXplVmFsdWVTdHJhdGVneSgnc2FuaXRpemVQYXJhbWV0ZXJzJyk7XG5cdC8vICR0cmFuc2xhdGVQcm92aWRlci51c2VTYW5pdGl6ZVZhbHVlU3RyYXRlZ3koJ2VzY2FwZScpO1xufV0pXG4uY29uZmlnKFsndG1oRHluYW1pY0xvY2FsZVByb3ZpZGVyJywgZnVuY3Rpb24odG1oRHluYW1pY0xvY2FsZVByb3ZpZGVyKSB7XG5cdHRtaER5bmFtaWNMb2NhbGVQcm92aWRlci5sb2NhbGVMb2NhdGlvblBhdHRlcm4oJy4vbGliL2kxOG4vYW5ndWxhci1sb2NhbGVfe3tsb2NhbGV9fS5qcycpO1xufV0pOyIsImFuZ3VsYXIubW9kdWxlKCdhcHAuY29yZScsIFtcblx0Ly8gJ25nQW5pbWF0ZScsXG5cdCduZ01lc3NhZ2VzJyxcblx0J25nU3RvcmFnZScsXG5cdCduZ1Nhbml0aXplJyxcblx0J3Bhc2NhbHByZWNodC50cmFuc2xhdGUnLFxuXHQnbmdOb3RpZmljYXRpb25zQmFyJyxcblx0J3RtaC5keW5hbWljTG9jYWxlJyxcblx0J3VpLmJvb3RzdHJhcCdcbl0pOyIsImFuZ3VsYXIubW9kdWxlKCdhcHAuZGFzaGJvYXJkJywgW1xuXHQnYXBwLmNvcmUnXG5dKTsiLCJhbmd1bGFyLm1vZHVsZSgnYXBwLmluc3RhbmNlJywgW1xuXHQnYXBwLmNvcmUnXG5dKTsiLCJhbmd1bGFyLm1vZHVsZSgnYXBwLmxheW91dCcsIFtcblx0J2FwcC5jb3JlJ1xuXSk7IiwiYW5ndWxhci5tb2R1bGUoJ2FwcC5wYXltZW50JywgW1xuXHQnYXBwLmNvcmUnXG5dKTsiLCJhbmd1bGFyLm1vZHVsZSgnYXBwLnByb2ZpbGUnLCBbXG5cdCdhcHAuY29yZSdcbl0pOyIsImFuZ3VsYXIubW9kdWxlKCdhcHAucm91dGVzJywgW1xuXHQnbmdSb3V0ZSdcbl0pXG4uY29uZmlnKFsnJHJvdXRlUHJvdmlkZXInLCBmdW5jdGlvbigkcm91dGVQcm92aWRlcil7XG5cblx0ZnVuY3Rpb24gdmVyaWZ5VXNlcigkcSwgJGh0dHAsICRsb2NhdGlvbikge1xuXHRcdHZhciBkZWZlcnJlZCA9ICRxLmRlZmVyKCk7IC8vIE1ha2UgYW4gQUpBWCBjYWxsIHRvIGNoZWNrIGlmIHRoZSB1c2VyIGlzIGxvZ2dlZCBpblxuXHRcdHZhciB2ZXJpZmllZCA9IGZhbHNlO1xuXHRcdCRodHRwLmdldCgnL2FwaS92ZXJpZnk/b3R0PScrJGxvY2F0aW9uLnNlYXJjaCgpLm90dCkudGhlbihmdW5jdGlvbiAocmVzKXtcblx0XHRcdGlmIChyZXMuc3VjY2Vzcyl7IC8vIEF1dGhlbnRpY2F0ZWRcblx0XHRcdFx0ZGVmZXJyZWQucmVzb2x2ZSgpO1xuXHRcdFx0XHR2ZXJpZmllZCA9IHRydWU7XG5cdFx0XHR9IGVsc2UgeyAvLyBOb3QgQXV0aGVudGljYXRlZFxuXHRcdFx0XHRkZWZlcnJlZC5yZWplY3QoKTtcblx0XHRcdH1cblx0XHRcdCRsb2NhdGlvbi51cmwoJy9hY2NvdW50LXZlcmlmaWNhdGlvbj92ZXJpZmllZD0nK3ZlcmlmaWVkKTtcblx0XHR9LCBmdW5jdGlvbiAoZXJyKXtcblx0XHRcdGNvbnNvbGUubG9nKGVycik7XG5cdFx0fSk7XG5cdFx0cmV0dXJuIGRlZmVycmVkLnByb21pc2U7XG5cdH1cblxuXHQkcm91dGVQcm92aWRlci5cblx0XHR3aGVuKCcvdmVyaWZ5Jywge1xuXHRcdFx0cmVzb2x2ZToge1xuXHRcdFx0XHR2ZXJpZmllZDogdmVyaWZ5VXNlclxuXHRcdFx0fVxuXHRcdH0pLlxuXHRcdG90aGVyd2lzZSh7XG5cdFx0XHRyZWRpcmVjdFRvOiAnL2Rhc2hib2FyZCdcblx0XHR9KTtcbn1dKTsiLCIoZnVuY3Rpb24oKXtcblxuXHQndXNlIHN0cmljdCc7XG5cblx0YW5ndWxhclxuXHRcdC5tb2R1bGUoJ2FwcC5hdXRoJylcblx0XHQuY29udHJvbGxlcignQXV0aENvbnRyb2xsZXInLCBBdXRoQ29udHJvbGxlcik7XG5cblx0QXV0aENvbnRyb2xsZXIuJGluamVjdCA9IFsnJHJvb3RTY29wZScsICckbG9jYXRpb24nLCAnJGxvY2FsU3RvcmFnZScsICckdHJhbnNsYXRlJywgJ2F1dGhTZXJ2aWNlJywgJ2Vycm9yU2VydmljZScsICdzcGlubmVyU2VydmljZSddO1xuXG5cdGZ1bmN0aW9uIEF1dGhDb250cm9sbGVyKCRyb290U2NvcGUsICRsb2NhdGlvbiwgJGxvY2FsU3RvcmFnZSwgJHRyYW5zbGF0ZSwgYXV0aFNlcnZpY2UsIGVycm9yU2VydmljZSwgc3Bpbm5lclNlcnZpY2UpIHtcblxuXHRcdGlmKCRsb2NhdGlvbi5wYXRoKCkgPT09ICcvbG9naW4nKVxuXHRcdFx0JHJvb3RTY29wZS50aXRsZSA9ICdMT0dJTic7XG5cdFx0ZWxzZSBpZigkbG9jYXRpb24ucGF0aCgpID09PSAnL3NpZ251cCcpXG5cdFx0XHQkcm9vdFNjb3BlLnRpdGxlID0gJ1JFR0lTVFJBVElPTic7XG5cdFx0ZWxzZSBpZigkbG9jYXRpb24ucGF0aCgpID09PSAnL2FjY291bnQtdmVyaWZpY2F0aW9uJylcblx0XHRcdCRyb290U2NvcGUudGl0bGUgPSAnRU1BSUxfVkVSSUZJQ0FUSU9OJztcblx0XHRlbHNlIGlmKCRsb2NhdGlvbi5wYXRoKCkgPT09ICcvcmVxdWVzdC1wYXNzd29yZC1yZXNldCcgfHwgJGxvY2F0aW9uLnBhdGgoKSA9PT0gJy9yZXNldC1wYXNzd29yZCcpXG5cdFx0XHQkcm9vdFNjb3BlLnRpdGxlID0gJ1JFU0VUX1BBU1NXT1JEJztcblxuXHRcdHZhciB2bSA9IHRoaXM7XG5cdFx0dm0udmVyaWZpY2F0aW9uU2VudCA9IGZhbHNlO1xuXHRcdHZtLnZlcmlmaWVkID0gJGxvY2F0aW9uLnNlYXJjaCgpLnZlcmlmaWVkID09PSAndHJ1ZScgPyB0cnVlIDogZmFsc2U7XG5cdFx0dm0ucmVxdWVzdFNlbnQgPSBmYWxzZTtcblx0XHR2bS5lbWFpbCA9ICcnO1xuXHRcdHZtLm5hbWUgPSAnJztcblx0XHR2bS5wYXNzd29yZCA9ICcnO1xuXHRcdHZtLnNpZ251cCA9IHNpZ251cDtcblx0XHR2bS5sb2dpbiA9IGxvZ2luO1xuXHRcdHZtLnJlcXVlc3RQYXNzd29yZFJlc2V0ID0gcmVxdWVzdFBhc3N3b3JkUmVzZXQ7XG5cdFx0dm0ucmVzZXRQYXNzd29yZCA9IHJlc2V0UGFzc3dvcmQ7XG5cdFx0dm0ubG9nb3V0ID0gbG9nb3V0O1xuXG5cblx0XHRmdW5jdGlvbiBzaWdudXAoKSB7XG5cdFx0XHR2YXIgZmRhdGEgPSB7XG5cdFx0XHRcdGVtYWlsOiB2bS5lbWFpbCxcblx0XHRcdFx0bmFtZTogdm0ubmFtZSxcblx0XHRcdFx0cGFzc3dvcmQ6IHZtLnBhc3N3b3JkLFxuXHRcdFx0XHRsYW5nOiAkbG9jYWxTdG9yYWdlLk5HX1RSQU5TTEFURV9MQU5HX0tFWSB8fCAnZW4nXG5cdFx0XHR9O1xuXHRcdFx0YXV0aFNlcnZpY2Uuc2lnbnVwKGZkYXRhKS50aGVuKGZ1bmN0aW9uIChyZXMpe1xuXHRcdFx0XHR2bS52ZXJpZmljYXRpb25TZW50ID0gdHJ1ZTtcblx0XHRcdH0sIGZ1bmN0aW9uIChlcnIpe1xuXHRcdFx0XHRpZihlcnIubWVzc2FnZSA9PT0gJ01VTFRJUExFX1NJR05VUCcpIHtcblx0XHRcdFx0XHQkbG9jYXRpb24ucGF0aCgnL3Jlc2lnbnVwJyk7XG5cdFx0XHRcdH1cblx0XHRcdFx0ZXJyb3JTZXJ2aWNlLnNob3coZXJyLmRhdGEubWVzc2FnZSk7XG5cdFx0XHRcdC8vICRyb290U2NvcGUuZXJyb3IgPSBlcnI7XG5cdFx0XHR9KTtcblx0XHR9XG5cblx0XHRmdW5jdGlvbiBsb2dpbigpIHtcblx0XHRcdHZhciBmZGF0YSA9IHtcblx0XHRcdFx0ZW1haWw6IHZtLmVtYWlsLFxuXHRcdFx0XHRwYXNzd29yZDogdm0ucGFzc3dvcmRcblx0XHRcdH07XG5cblx0XHRcdGlmKCF2bS5lbWFpbCkge1xuXHRcdFx0XHRyZXR1cm4gZXJyb3JTZXJ2aWNlLnNob3coJ01JU1NJTkdfRklFTERTJyk7XG5cdFx0XHR9XG5cblxuXHRcdFx0YXV0aFNlcnZpY2UubG9naW4oZmRhdGEpLnRoZW4oZnVuY3Rpb24gKHJlcyl7XG5cdFx0XHRcdC8vICRsb2NhbFN0b3JhZ2UudG9rZW4gPSByZXMuZGF0YS50b2tlbjtcblx0XHRcdFx0JGxvY2F0aW9uLnBhdGgoJy9kYXNoYm9hcmQnKTtcblx0XHRcdH0sIGZ1bmN0aW9uIChlcnIpe1xuXHRcdFx0XHRlcnJvclNlcnZpY2Uuc2hvdyhlcnIuZGF0YS5tZXNzYWdlKTtcblx0XHRcdFx0Ly8gJHJvb3RTY29wZS5lcnJvciA9IGVycjtcblx0XHRcdH0pO1xuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIHJlcXVlc3RQYXNzd29yZFJlc2V0KCkge1xuXHRcdFx0dmFyIGZkYXRhID0ge1xuXHRcdFx0XHRlbWFpbDogdm0uZW1haWxcblx0XHRcdH07XG5cblx0XHRcdGF1dGhTZXJ2aWNlLnJlcXVlc3RQYXNzd29yZFJlc2V0KGZkYXRhKS50aGVuKGZ1bmN0aW9uIChyZXMpe1xuXHRcdFx0XHR2bS5yZXF1ZXN0U2VudCA9IHRydWU7XG5cdFx0XHR9LCBmdW5jdGlvbiAoZXJyKXtcblx0XHRcdFx0ZXJyb3JTZXJ2aWNlLnNob3coZXJyLmRhdGEubWVzc2FnZSk7XG5cdFx0XHRcdC8vICRyb290U2NvcGUuZXJyb3IgPSBlcnI7XG5cdFx0XHR9KTtcblx0XHR9XG5cblx0XHRmdW5jdGlvbiByZXNldFBhc3N3b3JkKCkge1xuXHRcdFx0dmFyIGZkYXRhID0ge1xuXHRcdFx0XHR0b2tlbjogJGxvY2F0aW9uLnNlYXJjaCgpLm90dCxcblx0XHRcdFx0cGFzc3dvcmQ6IHZtLnBhc3N3b3JkXG5cdFx0XHR9O1xuXG5cdFx0XHRhdXRoU2VydmljZS5yZXNldFBhc3N3b3JkKGZkYXRhKS50aGVuKGZ1bmN0aW9uIChyZXMpe1xuXHRcdFx0XHQkbG9jYWxTdG9yYWdlLnRva2VuID0gcmVzLnRva2VuO1xuXHRcdFx0XHQkbG9jYXRpb24ucGF0aCgnL2Rhc2hib2FyZCcpO1xuXHRcdFx0fSwgZnVuY3Rpb24gKGVycil7XG5cdFx0XHRcdGVycm9yU2VydmljZS5zaG93KGVyci5kYXRhLm1lc3NhZ2UpO1xuXHRcdFx0XHQvLyAkcm9vdFNjb3BlLmVycm9yID0gZXJyO1xuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gbG9nb3V0KCkge1xuXHRcdFx0YXV0aFNlcnZpY2UubG9nb3V0KCk7XG5cdFx0fVxuXG5cdH1cblxufSkoKTsiLCJhbmd1bGFyLm1vZHVsZSgnYXBwLmF1dGgnKVxuLmNvbmZpZyhbJyRyb3V0ZVByb3ZpZGVyJywgZnVuY3Rpb24oJHJvdXRlUHJvdmlkZXIpe1xuXG5cdCRyb3V0ZVByb3ZpZGVyXG5cdFx0LndoZW4oJy9hY2NvdW50LXZlcmlmaWNhdGlvbicsIHtcblx0XHRcdHRlbXBsYXRlVXJsOiAnYXV0aC92ZXJpZmljYXRpb24uaHRtbCcsXG5cdFx0XHRjb250cm9sbGVyOiAnQXV0aENvbnRyb2xsZXInLFxuXHRcdFx0Y29udHJvbGxlckFzOiAnYXV0aFZtJ1xuXHRcdH0pXG5cdFx0LndoZW4oJy9yZXF1ZXN0LXBhc3N3b3JkLXJlc2V0Jywge1xuXHRcdFx0dGVtcGxhdGVVcmw6ICdhdXRoL3JlcXVlc3QtcGFzc3dvcmQtcmVzZXQuaHRtbCcsXG5cdFx0XHRjb250cm9sbGVyOiAnQXV0aENvbnRyb2xsZXInLFxuXHRcdFx0Y29udHJvbGxlckFzOiAnYXV0aFZtJ1xuXHRcdH0pXG5cdFx0LndoZW4oJy9yZXNldC1wYXNzd29yZCcsIHtcblx0XHRcdHRlbXBsYXRlVXJsOiAnYXV0aC9yZXNldC1wYXNzd29yZC5odG1sJyxcblx0XHRcdGNvbnRyb2xsZXI6ICdBdXRoQ29udHJvbGxlcicsXG5cdFx0XHRjb250cm9sbGVyQXM6ICdhdXRoVm0nXG5cdFx0fSlcblx0XHQud2hlbignL2xvZ2luJyx7XG5cdFx0XHR0ZW1wbGF0ZVVybDogJ2F1dGgvbG9naW4uaHRtbCcsXG5cdFx0XHRjb250cm9sbGVyOiAnQXV0aENvbnRyb2xsZXInLFxuXHRcdFx0Y29udHJvbGxlckFzOiAnYXV0aFZtJ1xuXHRcdH0pXG5cdFx0LndoZW4oJy9zaWdudXAnLCB7XG5cdFx0XHR0ZW1wbGF0ZVVybDogJ2F1dGgvc2lnbnVwLmh0bWwnLFxuXHRcdFx0Y29udHJvbGxlcjogJ0F1dGhDb250cm9sbGVyJyxcblx0XHRcdGNvbnRyb2xsZXJBczogJ2F1dGhWbSdcblx0XHR9KTtcblxufV0pOyIsIihmdW5jdGlvbigpe1xuXG5cdCd1c2Ugc3RyaWN0JztcblxuXHRhbmd1bGFyXG5cdFx0Lm1vZHVsZSgnYXBwLmJpbGxpbmcnKVxuXHRcdC5jb250cm9sbGVyKCdCaWxsaW5nQ29udHJvbGxlcicsIEJpbGxpbmdDb250cm9sbGVyKTtcblxuXHRCaWxsaW5nQ29udHJvbGxlci4kaW5qZWN0ID0gWyckdHJhbnNsYXRlJywgJ3V0aWxzU2VydmljZScsICdhcGlTZXJ2aWNlJywgJ21vbWVudCcsICdjdXN0b21lclNlcnZpY2UnLCAnc3Bpbm5lclNlcnZpY2UnLCAnZXJyb3JTZXJ2aWNlJ107XG5cblx0ZnVuY3Rpb24gQmlsbGluZ0NvbnRyb2xsZXIoJHRyYW5zbGF0ZSwgdXRpbHNTZXJ2aWNlLCBhcGksIG1vbWVudCwgY3VzdG9tZXJTZXJ2aWNlLCBzcGlubmVyLCBlcnJvclNlcnZpY2UpIHtcblxuXHRcdHZhciB2bSA9IHRoaXM7XG5cdFx0Ly8gdmFyIHRyYW5zYWN0aW9ucyA9IFtdO1xuXG5cdFx0dm0uY3VzdG9tZXIgPSBjdXN0b21lclNlcnZpY2UuZ2V0Q3VzdG9tZXIoKTtcblx0XHR2bS5jdXJyZW50QmFsYW5jZSA9IG51bGw7XG5cdFx0dm0udHJhbnNhY3Rpb25zID0gW107XG5cdFx0dm0uY2hhcmdlcyA9IFtdO1xuXHRcdHZtLnN0YXJ0QmFsYW5jZSA9ICcnO1xuXHRcdHZtLmxhc3RCaWxsaW5nRGF0ZSA9IG51bGw7XG5cdFx0dm0uc3RhcnREYXRlID0gbW9tZW50KCkuc3VidHJhY3QoNywgJ2RheXMnKS50b0RhdGUoKTtcblx0XHR2bS5lbmREYXRlID0gbW9tZW50KCkuZW5kT2YoJ2RheScpLnRvRGF0ZSgpO1xuXHRcdHZtLmRhdGVGb3JtYXQgPSAnZGQgTU1NTSB5eXl5Jztcblx0XHR2bS5zdGFydERhdGVPcHRpb25zID0ge1xuXHRcdFx0Ly8gbWluRGF0ZTogbmV3IERhdGUoMjAxMCwgMSwgMSksXG5cdFx0XHQvLyBtYXhEYXRlOiBuZXcgRGF0ZSh2bS5lbmREYXRlKSxcblx0XHRcdHNob3dXZWVrczogZmFsc2Vcblx0XHR9O1xuXHRcdHZtLmVuZERhdGVPcHRpb25zID0ge1xuXHRcdFx0bWluRGF0ZTogbmV3IERhdGUodm0uc3RhcnREYXRlKSxcblx0XHRcdHNob3dXZWVrczogZmFsc2Vcblx0XHR9O1xuXHRcdHZtLnBhcnNlRGF0ZSA9IGZ1bmN0aW9uKGRhdGUpe1xuXHRcdFx0cmV0dXJuIHV0aWxzU2VydmljZS5wYXJzZURhdGUoZGF0ZSk7XG5cdFx0fTtcblx0XHR2bS5zdW1VcCA9IHN1bVVwO1xuXHRcdHZtLmZpbmRSZWNvcmRzID0gZmluZFJlY29yZHM7XG5cblx0XHRjb25zb2xlLmxvZygnY3VzdG9tZXI6ICcsIHZtLmN1c3RvbWVyKTtcblxuXHRcdHNwaW5uZXIuc2hvdygnbWFpbi1zcGlubmVyJyk7XG5cblx0XHRnZXRDdXN0b21lckJhbGFuY2UoKTtcblx0XHRmaW5kUmVjb3JkcygpO1xuXG5cdFx0ZnVuY3Rpb24gZmluZFJlY29yZHMoKXtcblx0XHRcdGdldFRyYW5zYWN0aW9ucygpO1xuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIGdldFRyYW5zYWN0aW9ucygpIHtcblx0XHRcdGFwaS5yZXF1ZXN0KHtcblx0XHRcdFx0dXJsOiBcInRyYW5zYWN0aW9uc1wiLFxuXHRcdFx0XHRwYXJhbXM6IHtcblx0XHRcdFx0XHRzdGFydDogRGF0ZS5wYXJzZSh2bS5zdGFydERhdGUpLFxuXHRcdFx0XHRcdGVuZDogRGF0ZS5wYXJzZSh2bS5lbmREYXRlKVxuXHRcdFx0XHR9XG5cdFx0XHR9KS50aGVuKGZ1bmN0aW9uKHJlcyl7XG5cdFx0XHRcdGlmKCFyZXMuZGF0YS5zdWNjZXNzKSByZXR1cm4gZXJyb3JTZXJ2aWNlLnNob3cocmVzLmRhdGEubWVzc2FnZSk7XG5cdFx0XHRcdGNvbnNvbGUubG9nKCdUcmFuc2FjdGlvbnM6ICcsIHJlcy5kYXRhLnJlc3VsdCk7XG5cblx0XHRcdFx0dm0udHJhbnNhY3Rpb25zID0gcmVzLmRhdGEucmVzdWx0O1xuXG5cdFx0XHRcdHJldHVybiBhcGkucmVxdWVzdCh7XG5cdFx0XHRcdFx0dXJsOiBcImNoYXJnZXNcIixcblx0XHRcdFx0XHRwYXJhbXM6IHtcblx0XHRcdFx0XHRcdHN0YXJ0OiBEYXRlLnBhcnNlKHZtLnN0YXJ0RGF0ZSksXG5cdFx0XHRcdFx0XHRlbmQ6IERhdGUucGFyc2Uodm0uZW5kRGF0ZSlcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0pO1xuXHRcdFx0fSkudGhlbihmdW5jdGlvbihyZXMpIHtcblx0XHRcdFx0aWYoIXJlcy5kYXRhLnN1Y2Nlc3MpIHJldHVybiBlcnJvclNlcnZpY2Uuc2hvdyhyZXMuZGF0YS5tZXNzYWdlKTtcblx0XHRcdFx0Y29uc29sZS5sb2coJ0NoYXJnZXM6ICcsIHJlcy5kYXRhLnJlc3VsdCk7XG5cdFx0XHRcdFxuXHRcdFx0XHR2bS5jaGFyZ2VzID0gcmVzLmRhdGEucmVzdWx0O1xuXHRcdFx0XHR2bS5zdGFydEJhbGFuY2UgPSB2bS5jaGFyZ2VzLmxlbmd0aCA/IHZtLmNoYXJnZXNbdm0uY2hhcmdlcy5sZW5ndGgtMV0uc3RhcnRCYWxhbmNlIDogbnVsbDtcblx0XHRcdFx0dm0ubGFzdEJpbGxpbmdEYXRlID0gdm0uY2hhcmdlcy5sZW5ndGggPyB2bS5jaGFyZ2VzWzBdLnRvIDogbnVsbDtcblx0XHRcdFx0dm0udG90YWxDaGFyZ2VzID0gdm0uY2hhcmdlcy5sZW5ndGggPyBnZXRUb3RhbENoYXJnZXModm0uY2hhcmdlcykgOiAwOyBcblxuXHRcdFx0XHQvLyB2bS50b3RhbENoYXJnZXMgPSBzdW1VcCh2bS50b3RhbENoYXJnZXMpO1xuXHRcdFx0XHRcblx0XHRcdFx0Y29uc29sZS5sb2coJ3RvdGFsQ2hhcmdlczogJywgdm0udG90YWxDaGFyZ2VzKTtcblx0XHRcdFx0XG5cdFx0XHRcdC8vIHZtLnRvdGFsQ2hhcmdlcyA9IHZtLmNoYXJnZXMubGVuZ3RoID8gKHZtLnN0YXJ0QmFsYW5jZSAtIHZtLmN1c3RvbWVyLmJhbGFuY2UpIDogbnVsbDtcblx0XHRcdFx0Ly8gdm0udHJhbnNhY3Rpb25zID0gdHJhbnNhY3Rpb25zO1xuXG5cdFx0XHRcdHNwaW5uZXIuaGlkZSgnbWFpbi1zcGlubmVyJyk7XG5cdFx0XHRcdGNvbnNvbGUubG9nKCdGaW5hbDogJywgdm0udHJhbnNhY3Rpb25zLCB2bS5jaGFyZ2VzKTtcblx0XHRcdH0pLmNhdGNoKGZ1bmN0aW9uKGVycikge1xuXHRcdFx0XHRzcGlubmVyLmhpZGUoJ21haW4tc3Bpbm5lcicpO1xuXHRcdFx0XHRlcnJvclNlcnZpY2Uuc2hvdyhlcnIpO1xuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gZ2V0Q3VzdG9tZXJCYWxhbmNlKCkge1xuXHRcdFx0YXBpLnJlcXVlc3Qoe1xuXHRcdFx0XHR1cmw6IFwiZ2V0Q3VzdG9tZXJCYWxhbmNlXCJcblx0XHRcdH0pLnRoZW4oZnVuY3Rpb24ocmVzKXtcblx0XHRcdFx0aWYoIXJlcy5kYXRhLnN1Y2Nlc3MpIHtcblx0XHRcdFx0XHRzcGlubmVyLmhpZGUoJ21haW4tc3Bpbm5lcicpO1xuXHRcdFx0XHRcdHJldHVybiBlcnJvclNlcnZpY2Uuc2hvdyhyZXMuZGF0YS5tZXNzYWdlKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdHZtLmN1c3RvbWVyLmJhbGFuY2UgPSByZXMuZGF0YS5yZXN1bHQ7XG5cdFx0XHRcdHZtLmN1cnJlbnRCYWxhbmNlID0gc3RyaW5nVG9GaXhlZChyZXMuZGF0YS5yZXN1bHQpO1xuXHRcdFx0XHRjdXN0b21lclNlcnZpY2Uuc2V0Q3VzdG9tZXJCYWxhbmNlKHJlcy5kYXRhLnJlc3VsdCk7XG5cdFx0XHR9LCBmdW5jdGlvbihlcnIpe1xuXHRcdFx0XHRzcGlubmVyLmhpZGUoJ21haW4tc3Bpbm5lcicpO1xuXHRcdFx0XHRlcnJvclNlcnZpY2Uuc2hvdyhlcnIpO1xuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gc3RyaW5nVG9GaXhlZChzdHJpbmcpIHtcblx0XHRcdHJldHVybiB1dGlsc1NlcnZpY2Uuc3RyaW5nVG9GaXhlZChzdHJpbmcsIDIpO1xuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIGdldFRvdGFsQ2hhcmdlcyhjaGFyZ2VzQXJyYXkpIHtcblx0XHRcdHJldHVybiBzdW1VcChjaGFyZ2VzQXJyYXkubWFwKGZ1bmN0aW9uKGl0ZW0pIHtcblx0XHRcdFx0cmV0dXJuIGl0ZW0uYW1vdW50O1xuXHRcdFx0fSkucmVkdWNlKGZ1bmN0aW9uKHByZXYsIG5leHQpIHtcblx0XHRcdFx0cmV0dXJuIHByZXYuY29uY2F0KG5leHQpO1xuXHRcdFx0fSkpO1xuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIHN1bVVwKGFycmF5KSB7XG5cdFx0XHR2YXIgYW1vdW50ID0gMDtcblx0XHRcdGFycmF5LmZvckVhY2goZnVuY3Rpb24oaXRlbSl7XG5cdFx0XHRcdGFtb3VudCArPSBwYXJzZUZsb2F0KGl0ZW0pO1xuXHRcdFx0fSk7XG5cdFx0XHRyZXR1cm4gYW1vdW50O1xuXHRcdH1cblxuXHR9XG5cbn0pKCk7IiwiYW5ndWxhci5tb2R1bGUoJ2FwcC5iaWxsaW5nJylcbi5jb25maWcoWyckcm91dGVQcm92aWRlcicsIGZ1bmN0aW9uKCRyb3V0ZVByb3ZpZGVyKXtcblxuXHQkcm91dGVQcm92aWRlclxuXHRcdC53aGVuKCcvYmlsbGluZycsIHtcblx0XHRcdHRlbXBsYXRlVXJsOiAnYmlsbGluZy9iaWxsaW5nLmh0bWwnLFxuXHRcdFx0Y29udHJvbGxlcjogJ0JpbGxpbmdDb250cm9sbGVyJyxcblx0XHRcdGNvbnRyb2xsZXJBczogJ2JpbGxWbScsXG5cdFx0XHRyZXNvbHZlOiB7XG5cdFx0XHRcdGxvZ2dlZGluOiBpc0F1dGhvcml6ZWRcblx0XHRcdH1cblx0XHR9KTtcblxufV0pO1xuXG5pc0F1dGhvcml6ZWQuJGluamVjdCA9IFsnYXV0aFNlcnZpY2UnXTtcbmZ1bmN0aW9uIGlzQXV0aG9yaXplZChhdXRoU2VydmljZSkge1xuXHRyZXR1cm4gYXV0aFNlcnZpY2UuaXNBdXRob3JpemVkKCk7XG59IiwiKGZ1bmN0aW9uKCl7XG5cblx0J3VzZSBzdHJpY3QnO1xuXG5cdGFuZ3VsYXJcblx0XHQubW9kdWxlKCdhcHAnKVxuXHRcdC5kaXJlY3RpdmUoJ2lzUGFzc3dvcmQnLCBpc1Bhc3N3b3JkKTtcblxuXHRpc1Bhc3N3b3JkLiRpbmplY3QgPSBbJ3V0aWxzJ107XG5cblx0ZnVuY3Rpb24gaXNQYXNzd29yZCh1dGlscyl7XG5cblx0XHRyZXR1cm4ge1xuXHRcdFx0cmVxdWlyZTogJ25nTW9kZWwnLFxuXHRcdFx0bGluazogbGlua1xuXHRcdH07XG5cblx0XHRmdW5jdGlvbiBsaW5rKHNjb3BlLCBlbCwgYXR0cnMsIGN0cmwpIHtcblxuXHRcdFx0Y3RybC4kdmFsaWRhdG9ycy5wYXNzd29yZCA9IGZ1bmN0aW9uKG1vZGVsVmFsdWUsIHZpZXdWYWx1ZSkge1xuXHRcdFx0XHRpZihjdHJsLiRpc0VtcHR5KG1vZGVsVmFsdWUpKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRpZihzY29wZS5pbnN0YW5jZSkge1xuXHRcdFx0XHRcdHZhciBwcmVmaXggPSBzY29wZS5pbnN0YW5jZS5yZXN1bHQucHJlZml4O1xuXHRcdFx0XHRcdGlmKHByZWZpeCAmJiBuZXcgUmVnRXhwKHByZWZpeCwgJ2knKS50ZXN0KG1vZGVsVmFsdWUpKVxuXHRcdFx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0aWYoIXV0aWxzLmNoZWNrUGFzc3dvcmRTdHJlbmd0aChtb2RlbFZhbHVlKSkge1xuXHRcdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdHJldHVybiB0cnVlO1xuXHRcdFx0fTtcblx0XHRcdFxuXHRcdH1cblxuXHR9XG5cbn0pKCk7IiwiKGZ1bmN0aW9uKCl7XG5cbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICBhbmd1bGFyXG4gICAgICAgIC5tb2R1bGUoJ2FwcC5jb3JlJylcbiAgICAgICAgLmRpcmVjdGl2ZSgncGFzc3dvcmQnLCBwYXNzd29yZCk7XG5cbiAgICBwYXNzd29yZC4kaW5qZWN0ID0gWyd1dGlsc1NlcnZpY2UnXTtcbiAgICBmdW5jdGlvbiBwYXNzd29yZCh1dGlscyl7XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHJlc3RyaWN0OiAnQUUnLFxuICAgICAgICAgICAgcmVxdWlyZTogJ25nTW9kZWwnLFxuICAgICAgICAgICAgbGluazogbGlua1xuICAgICAgICB9O1xuXG4gICAgICAgIGZ1bmN0aW9uIGxpbmsoc2NvcGUsIGVsLCBhdHRycywgY3RybCkge1xuXG4gICAgICAgICAgICBjdHJsLiR2YWxpZGF0b3JzLnBhc3N3b3JkID0gZnVuY3Rpb24obW9kZWxWYWx1ZSwgdmlld1ZhbHVlKSB7XG4gICAgICAgICAgICAgICAgaWYoY3RybC4kaXNFbXB0eShtb2RlbFZhbHVlKSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBjaGVjayBpZiBwYXNzd29yZCBjb250YWlucyB0aGUgYnJhbmNoIHByZWZpeFxuICAgICAgICAgICAgICAgIGlmKHNjb3BlLmluc3RWbSAmJiBzY29wZS5pbnN0Vm0uaW5zdGFuY2UpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHByZWZpeCA9IHNjb3BlLmluc3RWbS5pbnN0YW5jZS5yZXN1bHQucHJlZml4O1xuICAgICAgICAgICAgICAgICAgICBpZihwcmVmaXggJiYgbmV3IFJlZ0V4cChwcmVmaXgsICdpJykudGVzdChtb2RlbFZhbHVlKSlcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICByZXR1cm4gISF1dGlscy5jaGVja1Bhc3N3b3JkU3RyZW5ndGgobW9kZWxWYWx1ZSk7XG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgfVxufSkoKTsiLCIoZnVuY3Rpb24oKXtcblxuXHQndXNlIHN0cmljdCc7XG5cblx0YW5ndWxhclxuXHRcdC5tb2R1bGUoJ2FwcC5kYXNoYm9hcmQnKVxuXHRcdC5jb250cm9sbGVyKCdEYXNoSW5zdGFuY2VDb250cm9sbGVyJywgRGFzaEluc3RhbmNlQ29udHJvbGxlcik7XG5cblx0RGFzaEluc3RhbmNlQ29udHJvbGxlci4kaW5qZWN0ID0gWyckcm9vdFNjb3BlJywgJyRsb2NhdGlvbicsICckdHJhbnNsYXRlJywgJ2FwaVNlcnZpY2UnLCAncG9vbFNpemVTZXJ2aWNlcycsICdicmFuY2hlc1NlcnZpY2UnLCAnY2FydFNlcnZpY2UnLCAndXRpbHNTZXJ2aWNlJywgJ2Vycm9yU2VydmljZSddO1xuXG5cdGZ1bmN0aW9uIERhc2hJbnN0YW5jZUNvbnRyb2xsZXIoJHJvb3RTY29wZSwgJGxvY2F0aW9uLCAkdHJhbnNsYXRlLCBhcGksIHBvb2xTaXplU2VydmljZXMsIGJyYW5jaGVzU2VydmljZSwgY2FydCwgdXRpbHMsIGVycm9yU2VydmljZSkge1xuXG5cdFx0dmFyIHZtID0gdGhpcztcblx0XHR2YXIgZGlmZjtcblxuXHRcdHZtLnN1YiA9IHZtLmluc3QuX3N1YnNjcmlwdGlvbjtcblx0XHR2bS50ZXJtaW5hdGVJbnN0YW5jZSA9IHRlcm1pbmF0ZUluc3RhbmNlO1xuXHRcdHZtLnJlbmV3U3Vic2NyaXB0aW9uID0gcmVuZXdTdWJzY3JpcHRpb247XG5cdFx0dm0uZXhwaXJlc0F0ID0gZXhwaXJlc0F0O1xuXHRcdHZtLmNhblJlbmV3ID0gY2FuUmVuZXc7XG5cdFx0dm0ucGFyc2VEYXRlID0gcGFyc2VEYXRlO1xuXHRcdHZtLnN0cmluZ1RvRml4ZWQgPSBzdHJpbmdUb0ZpeGVkO1xuXHRcdHZtLmdldERpZmZlcmVuY2UgPSB1dGlscy5nZXREaWZmZXJlbmNlO1xuXHRcdHZtLnRyaWFsRXhwaXJlcyA9IGV4cGlyZXNBdCh2bS5zdWIudHJpYWxFeHBpcmVzKTtcblx0XHR2bS5leHBpcmVzID0gKHZtLnN1Yi5iaWxsaW5nQ3ljbGVzIC0gdm0uc3ViLmN1cnJlbnRCaWxsaW5nQ3ljbGUpICsgMTtcblx0XHR2bS5leHBUaHJlc2hvbGQgPSAxMDtcblxuXHRcdGZ1bmN0aW9uIHRlcm1pbmF0ZUluc3RhbmNlKG9pZCkge1xuXHRcdFx0aWYoIW9pZCkgcmV0dXJuO1xuXHRcdFx0aWYoY29uZmlybShcIkRvIHlvdSByZWFseSB3YW50IHRvIHRlcm1pbmF0ZSBpbnN0YW5jZSBwZXJtYW5lbnRseT9cIikpe1xuXHRcdFx0XHRzZXRTdGF0ZSgnZGVsZXRlQnJhbmNoJywgb2lkLCBmdW5jdGlvbiAoZXJyLCByZXNwb25zZSl7XG5cdFx0XHRcdFx0aWYoZXJyKSB7XG5cdFx0XHRcdFx0XHRlcnJvclNlcnZpY2Uuc2hvdyhlcnIpO1xuXHRcdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdGJyYW5jaGVzU2VydmljZS5yZW1vdmUob2lkKTtcblx0XHRcdFx0XHQvLyBnZXRCcmFuY2hlcygpO1xuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHR9XG5cdFx0XG5cdFx0ZnVuY3Rpb24gcmVuZXdTdWJzY3JpcHRpb24oaW5zdCkge1xuXHRcdFx0JHRyYW5zbGF0ZSgnREVTQ1JJUFRJT05TLlJFTkVXX1NVQlNDUklQVElPTicsIHtcblx0XHRcdFx0cGxhbklkOiBpbnN0Ll9zdWJzY3JpcHRpb24ucGxhbklkLFxuXHRcdFx0XHR1c2VyczogaW5zdC5fc3Vic2NyaXB0aW9uLnF1YW50aXR5LFxuXHRcdFx0XHRjb21wYW55OiBpbnN0LnJlc3VsdC5uYW1lXG5cdFx0XHR9KVxuXHRcdFx0LnRoZW4oZnVuY3Rpb24gKGRlc2NyaXB0aW9uKSB7XG5cdFx0XHRcdGNhcnQuYWRkKHtcblx0XHRcdFx0XHRhY3Rpb246IFwicmVuZXdTdWJzY3JpcHRpb25cIixcblx0XHRcdFx0XHRkZXNjcmlwdGlvbjogZGVzY3JpcHRpb24sXG5cdFx0XHRcdFx0YW1vdW50OiBpbnN0Ll9zdWJzY3JpcHRpb24uYW1vdW50LFxuXHRcdFx0XHRcdGRhdGE6IHtcblx0XHRcdFx0XHRcdG9pZDogaW5zdC5vaWRcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0pO1xuXHRcdFx0XHQkbG9jYXRpb24ucGF0aCgnL3BheW1lbnQnKTtcblx0XHRcdH0pO1xuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIGV4cGlyZXNBdChsYXN0QmlsbGluZ0RhdGUpIHtcblx0XHRcdGRpZmYgPSB1dGlscy5nZXREaWZmZXJlbmNlKGxhc3RCaWxsaW5nRGF0ZSwgbW9tZW50KCksICdkYXlzJyk7XG5cdFx0XHRyZXR1cm4gZGlmZiA8IDAgPyAwIDogZGlmZjtcblx0XHR9XG5cblx0XHRmdW5jdGlvbiBjYW5SZW5ldyhpbnN0KSB7XG5cdFx0XHRkaWZmID0gdm0uZXhwaXJlc0F0KGluc3QpO1xuXHRcdFx0cmV0dXJuIGRpZmYgPD0gMTA7XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gcGFyc2VEYXRlKGRhdGUsIGZvcm1hdCkge1xuXHRcdFx0cmV0dXJuIHV0aWxzLnBhcnNlRGF0ZShkYXRlLCBmb3JtYXQpO1xuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIHN0cmluZ1RvRml4ZWQoc3RyaW5nKSB7XG5cdFx0XHRyZXR1cm4gdXRpbHMuc3RyaW5nVG9GaXhlZChzdHJpbmcsIDIpO1xuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIGdldFBvb2xTdHJpbmcoYXJyYXkpIHtcblx0XHRcdHJldHVybiBwb29sU2l6ZVNlcnZpY2VzLnBvb2xBcnJheVRvU3RyaW5nKGFycmF5KTtcblx0XHR9XG5cblx0XHRmdW5jdGlvbiBnZXRQb29sU2l6ZShhcnJheSkge1xuXHRcdFx0cmV0dXJuIHBvb2xTaXplU2VydmljZXMuZ2V0UG9vbFNpemUoYXJyYXkpO1xuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIHNldFN0YXRlKG1ldGhvZCwgb2lkLCBjYWxsYmFjaykge1xuXHRcdFx0YXBpLnJlcXVlc3Qoe1xuXHRcdFx0XHR1cmw6IG1ldGhvZCxcblx0XHRcdFx0cGFyYW1zOiB7XG5cdFx0XHRcdFx0X2lkOiBvaWRcblx0XHRcdFx0fVxuXHRcdFx0fSkudGhlbihmdW5jdGlvbihyZXN1bHQpe1xuXHRcdFx0XHRjb25zb2xlLmxvZygnc2V0U3RhdGUgcmVzdWx0OiAnLCByZXN1bHQpO1xuXHRcdFx0XHRjYWxsYmFjayhudWxsLCByZXN1bHQuZGF0YS5yZXN1bHQpO1xuXHRcdFx0fSwgZnVuY3Rpb24oZXJyKXtcblx0XHRcdFx0Y2FsbGJhY2soZXJyKTtcblx0XHRcdH0pO1xuXHRcdH1cblxuXHR9XG5cbn0pKCk7IiwiKGZ1bmN0aW9uKCl7XG5cblx0J3VzZSBzdHJpY3QnO1xuXG5cdGFuZ3VsYXJcblx0XHQubW9kdWxlKCdhcHAuZGFzaGJvYXJkJylcblx0XHQuZGlyZWN0aXZlKCdkYXNoSW5zdGFuY2UnLCBkYXNoSW5zdGFuY2UpO1xuXG5cdGZ1bmN0aW9uIGRhc2hJbnN0YW5jZSgpe1xuXG5cdFx0cmV0dXJuIHtcblx0XHRcdHJlc3RyaWN0OiAnRUEnLFxuXHRcdFx0cmVwbGFjZTogdHJ1ZSxcblx0XHRcdHRyYW5zY2x1ZGU6IHRydWUsXG5cdFx0XHRzY29wZToge1xuXHRcdFx0XHRpbnN0OiAnPSdcblx0XHRcdH0sXG5cdFx0XHR0ZW1wbGF0ZVVybDogJ2Rhc2hib2FyZC9kYXNoLWluc3RhbmNlLmh0bWwnLFxuXHRcdFx0Y29udHJvbGxlcjogJ0Rhc2hJbnN0YW5jZUNvbnRyb2xsZXInLFxuXHRcdFx0Y29udHJvbGxlckFzOiAnZGFzaEluc3RWbScsXG5cdFx0XHRiaW5kVG9Db250cm9sbGVyOiB0cnVlXG5cdFx0fTtcblxuXHR9XG5cbn0pKCk7IiwiKGZ1bmN0aW9uKCl7XG5cblx0J3VzZSBzdHJpY3QnO1xuXG5cdGFuZ3VsYXJcblx0XHQubW9kdWxlKCdhcHAuZGFzaGJvYXJkJylcblx0XHQuY29udHJvbGxlcignRGFzaGJvYXJkQ29udHJvbGxlcicsIERhc2hib2FyZENvbnRyb2xsZXIpO1xuXG5cdERhc2hib2FyZENvbnRyb2xsZXIuJGluamVjdCA9IFsnJHJvb3RTY29wZScsICdhcGlTZXJ2aWNlJywgJ2JyYW5jaGVzU2VydmljZScsICdub3RpZnlTZXJ2aWNlJywgJ3NwaW5uZXJTZXJ2aWNlJywgJ2N1c3RvbWVyU2VydmljZScsICdlcnJvclNlcnZpY2UnXTtcblxuXHRmdW5jdGlvbiBEYXNoYm9hcmRDb250cm9sbGVyKCRyb290U2NvcGUsIGFwaSwgYnJhbmNoZXNTZXJ2aWNlLCBub3RpZnlTZXJ2aWNlLCBzcGlubmVyLCBjdXN0b21lclNlcnZpY2UsIGVycm9yU2VydmljZSkge1xuXG5cdFx0dmFyIHZtID0gdGhpcztcblxuXHRcdHZtLmluc3RhbmNlcyA9IFtdO1xuXHRcdHZtLmN1c3RvbWVyUm9sZSA9IGN1c3RvbWVyU2VydmljZS5nZXRDdXN0b21lcigpLnJvbGU7XG5cblx0XHQkcm9vdFNjb3BlLnRpdGxlID0gJ0RBU0hCT0FSRCc7XG5cdFx0JHJvb3RTY29wZS4kb24oJ2F1dGgubG9nb3V0JywgZnVuY3Rpb24oKXtcblx0XHRcdGJyYW5jaGVzU2VydmljZS5jbGVhcigpO1xuXHRcdH0pO1xuXG5cdFx0c3Bpbm5lci5zaG93KCdtYWluLXNwaW5uZXInKTtcblxuXHRcdGdldEJyYW5jaGVzKCk7XG5cdFx0Ly8gZ2V0UGxhbnMoKTtcblxuXHRcdGZ1bmN0aW9uIGdldEJyYW5jaGVzKCl7XG5cdFx0XHR2YXIgaW5zdGFuY2VzID0gYnJhbmNoZXNTZXJ2aWNlLmdldEFsbCgpO1xuXHRcdFx0aWYoaW5zdGFuY2VzLmxlbmd0aCkge1xuXHRcdFx0XHR2bS5pbnN0YW5jZXMgPSBpbnN0YW5jZXM7XG5cdFx0XHRcdHNwaW5uZXIuaGlkZSgnbWFpbi1zcGlubmVyJyk7XG5cdFx0XHRcdGNvbnNvbGUubG9nKCdnZXRCcmFuY2hlczogJywgaW5zdGFuY2VzKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGxvYWRCcmFuY2hlcygpO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIGxvYWRCcmFuY2hlcygpIHtcblx0XHRcdGFwaS5yZXF1ZXN0KHtcblx0XHRcdFx0dXJsOiBcImdldEJyYW5jaGVzXCJcblx0XHRcdH0pLnRoZW4oZnVuY3Rpb24ocmVzKXtcblx0XHRcdFx0aWYoIXJlcy5kYXRhLnN1Y2Nlc3MpIHJldHVybiBlcnJvclNlcnZpY2Uuc2hvdyhyZXMuZGF0YS5tZXNzYWdlKTtcblxuXHRcdFx0XHRicmFuY2hlc1NlcnZpY2Uuc2V0KHJlcy5kYXRhLnJlc3VsdCk7XG5cdFx0XHRcdFxuXHRcdFx0XHR2bS5pbnN0YW5jZXMgPSByZXMuZGF0YS5yZXN1bHQ7XG5cblx0XHRcdFx0c3Bpbm5lci5oaWRlKCdtYWluLXNwaW5uZXInKTtcblx0XHRcdFx0Y29uc29sZS5sb2coJ0JyYW5jaGVzOiAnLCB2bS5pbnN0YW5jZXMpO1xuXHRcdFx0XHQvLyB2bS5nZXRJbnN0U3RhdGUoKTtcblx0XHRcdH0sIGZ1bmN0aW9uKGVycil7XG5cdFx0XHRcdGVycm9yU2VydmljZS5zaG93KGVycik7XG5cdFx0XHR9KTtcblx0XHR9XG5cblx0fVxuXG59KSgpOyIsImFuZ3VsYXIubW9kdWxlKCdhcHAuZGFzaGJvYXJkJylcbi5jb25maWcoWyckcm91dGVQcm92aWRlcicsIGZ1bmN0aW9uKCRyb3V0ZVByb3ZpZGVyKXtcblxuXHQkcm91dGVQcm92aWRlclxuXHRcdC53aGVuKCcvZGFzaGJvYXJkJywge1xuXHRcdFx0dGVtcGxhdGVVcmw6ICdkYXNoYm9hcmQvZGFzaGJvYXJkLmh0bWwnLFxuXHRcdFx0Y29udHJvbGxlcjogJ0Rhc2hib2FyZENvbnRyb2xsZXInLFxuXHRcdFx0Y29udHJvbGxlckFzOiAnZGFzaFZtJyxcblx0XHRcdHJlc29sdmU6IHtcblx0XHRcdFx0bG9nZ2VkaW46IGlzQXV0aG9yaXplZFxuXHRcdFx0fVxuXHRcdH0pO1xuXG59XSk7XG5cbmlzQXV0aG9yaXplZC4kaW5qZWN0ID0gWydhdXRoU2VydmljZSddO1xuZnVuY3Rpb24gaXNBdXRob3JpemVkKGF1dGhTZXJ2aWNlKSB7XG5cdHJldHVybiBhdXRoU2VydmljZS5pc0F1dGhvcml6ZWQoKTtcbn0iLCIoZnVuY3Rpb24oKXtcblxuXHQndXNlIHN0cmljdCc7XG5cblx0YW5ndWxhclxuXHRcdC5tb2R1bGUoJ2FwcC5pbnN0YW5jZScpXG5cdFx0LmRpcmVjdGl2ZSgnaW5zdGFuY2VTdW1tYXJ5JywgaW5zdGFuY2VTdW1tYXJ5KTtcblxuXHRmdW5jdGlvbiBpbnN0YW5jZVN1bW1hcnkoKXtcblxuXHRcdHJldHVybiB7XG5cdFx0XHRyZXN0cmljdDogJ0FFJyxcblx0XHRcdHRyYW5zY2x1ZGU6IHRydWUsXG5cdFx0XHRzY29wZToge1xuXHRcdFx0XHRwbGFuOiAnPScsXG5cdFx0XHRcdGFtb3VudDogJz0nLFxuXHRcdFx0XHRjdXJyZW5jeTogJz0nLFxuXHRcdFx0XHRtYXhsaW5lczogJz0nLFxuXHRcdFx0XHRudW1Qb29sOiAnPScsXG5cdFx0XHRcdHN0b3JhZ2U6ICc9Jyxcblx0XHRcdFx0aW5zdGFuY2U6ICc9Jyxcblx0XHRcdFx0bmV3QnJhbmNoOiAnPScsXG5cdFx0XHRcdHVwZGF0ZTogJyYnLFxuXHRcdFx0XHRwcm9jZWVkOiAnJidcblx0XHRcdH0sXG5cdFx0XHR0ZW1wbGF0ZVVybDogJ2luc3RhbmNlL2luc3RhbmNlLXN1bW1hcnkuaHRtbCdcblx0XHR9O1xuXG5cdH1cblxufSkoKTsiLCIoZnVuY3Rpb24oKXtcblxuXHQndXNlIHN0cmljdCc7XG5cblx0YW5ndWxhclxuXHRcdC5tb2R1bGUoJ2FwcC5pbnN0YW5jZScpXG5cdFx0LmNvbnRyb2xsZXIoJ0luc3RhbmNlQ29udHJvbGxlcicsIEluc3RhbmNlQ29udHJvbGxlcik7XG5cblx0SW5zdGFuY2VDb250cm9sbGVyLiRpbmplY3QgPSBbJyRzY29wZScsICckcm91dGVQYXJhbXMnLCAnJGxvY2F0aW9uJywgJyR0cmFuc2xhdGUnLCAnJHVpYk1vZGFsJywgJ2FwaVNlcnZpY2UnLCAnY3VzdG9tZXJTZXJ2aWNlJywgJ3Bvb2xTaXplU2VydmljZXMnLCAnYnJhbmNoZXNTZXJ2aWNlJywgJ2NhcnRTZXJ2aWNlJywgJ25vdGlmeVNlcnZpY2UnLCAnZXJyb3JTZXJ2aWNlJywgJ3NwaW5uZXJTZXJ2aWNlJywgJ3V0aWxzU2VydmljZScsICdjb252ZXJ0Qnl0ZXNGaWx0ZXInXTtcblxuXHRmdW5jdGlvbiBJbnN0YW5jZUNvbnRyb2xsZXIoJHNjb3BlLCAkcm91dGVQYXJhbXMsICRsb2NhdGlvbiwgJHRyYW5zbGF0ZSwgJHVpYk1vZGFsLCBhcGksIGN1c3RvbWVyU2VydmljZSwgcG9vbFNpemVTZXJ2aWNlcywgYnJhbmNoZXNTZXJ2aWNlLCBjYXJ0LCBub3RpZnlTZXJ2aWNlLCBlcnJvclNlcnZpY2UsIHNwaW5uZXIsIHV0aWxzLCBjb252ZXJ0Qnl0ZXNGaWx0ZXIpIHtcblxuXHRcdHZhciB2bSA9IHRoaXM7XG5cdFx0dmFyIG9pZCA9ICRyb3V0ZVBhcmFtcy5vaWQ7XG5cdFx0dmFyIGNhcnRJdGVtID0gJHJvdXRlUGFyYW1zLmNhcnRfaXRlbTtcblx0XHR2YXIgbWluVXNlcnMgPSA0O1xuXHRcdHZhciBtaW5MaW5lcyA9IDg7XG5cblx0XHR2bS5jdXN0b21lciA9IGN1c3RvbWVyU2VydmljZS5nZXRDdXN0b21lcigpO1xuXHRcdHZtLm1pblVzZXJzID0gbWluVXNlcnM7XG5cdFx0dm0ubWluTGluZXMgPSBtaW5MaW5lcztcblx0XHR2bS5wYXNzVHlwZSA9ICdwYXNzd29yZCc7XG5cdFx0dm0ucGFzc3dvcmRTdHJlbmd0aCA9IDA7XG5cdFx0dm0ubmV3QnJhbmNoID0gdHJ1ZTtcblx0XHQvLyB2bS5ub1RyaWFsID0gZmFsc2U7XG5cdFx0dm0udHJpYWwgPSB0cnVlO1xuXHRcdHZtLm5vQWRkb25zID0gZmFsc2U7XG5cdFx0dm0ucGxhbnMgPSBbXTtcblx0XHR2bS5hdmFpbGFibGVQbGFucyA9IFtdO1xuXHRcdHZtLnNlbGVjdGVkUGxhbiA9IHt9O1xuXHRcdHZtLnByZXZQbGFuSWQgPSAnJztcblx0XHR2bS5zaWRzID0gW107XG5cdFx0dm0udG90YWxBbW91bnQgPSAwO1xuXHRcdHZtLnRvdGFsTGluZXMgPSAwO1xuXHRcdHZtLnRvdGFsU3RvcmFnZSA9IDA7XG5cdFx0dm0ubnVtUG9vbCA9ICcyMDAtMjk5Jztcblx0XHR2bS5zdG9yYWdlcyA9IFsnMCcsICczMCcsICcxMDAnLCAnMjUwJywgJzUwMCddO1xuXHRcdHZtLmxpbmVzID0gWycwJywgJzQnLCAnOCcsICcxNicsICczMCcsICc2MCcsICcxMjAnLCAnMjUwJywgJzUwMCddO1xuXHRcdHZtLnRpbWV6b25lcyA9IG1vbWVudC50ei5uYW1lcygpO1xuXHRcdHZtLmxhbmd1YWdlcyA9IFtcblx0XHRcdHtuYW1lOiAnRW5nbGlzaCcsIHZhbHVlOiAnZW4nfSxcblx0XHRcdHtuYW1lOiAn0KPQutGA0LDRl9C90YHRjNC60LAnLCB2YWx1ZTogJ3VrJ30sXG5cdFx0XHR7bmFtZTogJ9Cg0YPRgdGB0LrQuNC5JywgdmFsdWU6ICdydSd9XG5cdFx0XTtcblx0XHR2bS5hZGRPbnMgPSB7XG5cdFx0XHRzdG9yYWdlOiB7XG5cdFx0XHRcdG5hbWU6ICdzdG9yYWdlJyxcblx0XHRcdFx0cXVhbnRpdHk6ICcwJ1xuXHRcdFx0fSxcblx0XHRcdGxpbmVzOiB7XG5cdFx0XHRcdG5hbWU6ICdsaW5lcycsXG5cdFx0XHRcdHF1YW50aXR5OiAnMCdcblx0XHRcdH1cblx0XHR9O1xuXHRcdHZtLmluc3RhbmNlID0ge1xuXHRcdFx0X3N1YnNjcmlwdGlvbjoge1xuXHRcdFx0XHRwbGFuSWQ6ICcnLFxuXHRcdFx0XHRxdWFudGl0eTogbWluVXNlcnMsXG5cdFx0XHRcdGFkZE9uczogW11cblx0XHRcdH0sXG5cdFx0XHRyZXN1bHQ6IHtcblx0XHRcdFx0bGFuZzogJ2VuJyxcblx0XHRcdFx0bWF4bGluZXM6IDgsXG5cdFx0XHRcdG1heHVzZXJzOiBtaW5Vc2Vycyxcblx0XHRcdFx0dGltZXpvbmU6IG1vbWVudC50ei5ndWVzcygpXG5cdFx0XHR9XG5cdFx0fTtcblxuXHRcdHZtLmdlbmVyYXRlUGFzc3dvcmQgPSBnZW5lcmF0ZVBhc3N3b3JkO1xuXHRcdHZtLnJldmVhbFBhc3N3b3JkID0gcmV2ZWFsUGFzc3dvcmQ7XG5cdFx0dm0ucHJvY2VlZCA9IHByb2NlZWQ7XG5cdFx0dm0udXBkYXRlID0gdXBkYXRlO1xuXHRcdHZtLnNlbGVjdFBsYW4gPSBzZWxlY3RQbGFuO1xuXHRcdHZtLnNlbGVjdFNlcnZlciA9IHNlbGVjdFNlcnZlcjtcblx0XHR2bS5wbHVzVXNlciA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0cmV0dXJuIHZtLmluc3RhbmNlLl9zdWJzY3JpcHRpb24ucXVhbnRpdHkgKz0gMTtcblx0XHR9O1xuXHRcdHZtLm1pbnVzVXNlciA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0aWYodm0uaW5zdGFuY2UuX3N1YnNjcmlwdGlvbi5xdWFudGl0eSA+IG1pblVzZXJzKSB7XG5cdFx0XHRcdHZtLmluc3RhbmNlLl9zdWJzY3JpcHRpb24ucXVhbnRpdHkgLT0gMTtcblx0XHRcdH1cblx0XHRcdHJldHVybiB2bS5pbnN0YW5jZS5fc3Vic2NyaXB0aW9uLnF1YW50aXR5O1xuXHRcdH07XG5cdFx0dm0uc2hvd1BsYW5zID0gZnVuY3Rpb24oKSB7XG5cdFx0XHQkdWliTW9kYWwub3Blbih7XG5cdFx0XHRcdHRlbXBsYXRlVXJsOiAnYXNzZXRzL3BhcnRpYWxzL2NvbXBhcmUtcGxhbnMuaHRtbCcsXG5cdFx0XHRcdHNpemU6ICdsZydcblx0XHRcdH0pO1xuXHRcdH07XG5cblx0XHQkc2NvcGUuJHdhdGNoKGZ1bmN0aW9uKCkge1xuXHRcdFx0cmV0dXJuIHZtLmluc3RhbmNlLl9zdWJzY3JpcHRpb24ucXVhbnRpdHk7XG5cdFx0fSwgZnVuY3Rpb24odmFsKSB7XG5cdFx0XHRcblx0XHRcdGlmKCF2YWwpIHtcblx0XHRcdFx0dm0uaW5zdGFuY2UuX3N1YnNjcmlwdGlvbi5xdWFudGl0eSA9IG1pblVzZXJzO1xuXHRcdFx0fVxuXG5cdFx0XHRpZih2bS5zZWxlY3RlZFBsYW4ucGxhbklkID09PSAndHJpYWwnIHx8IHZtLnNlbGVjdGVkUGxhbi5wbGFuSWQgPT09ICdmcmVlJyB8fCB2bS5zZWxlY3RlZFBsYW4ucGxhbklkID09PSAndGVhbScpIHtcblx0XHRcdFx0dm0uaW5zdGFuY2UuX3N1YnNjcmlwdGlvbi5xdWFudGl0eSA9IG1pblVzZXJzO1xuXHRcdFx0fVxuXG5cdFx0XHR0b3RhbExpbmVzKCk7XG5cdFx0XHR0b3RhbFN0b3JhZ2UoKTtcblx0XHRcdHRvdGFsQW1vdW50KCk7XG5cdFx0fSk7XG5cdFx0XG5cdFx0JHNjb3BlLiR3YXRjaChmdW5jdGlvbigpIHtcblx0XHRcdHJldHVybiB2bS5hZGRPbnMubGluZXMucXVhbnRpdHk7XG5cdFx0fSwgZnVuY3Rpb24odmFsKSB7XG5cdFx0XHR2bS5hZGRPbnMubGluZXMucXVhbnRpdHkgPSB2bS5hZGRPbnMubGluZXMucXVhbnRpdHkudG9TdHJpbmcoKTtcblx0XHRcdC8vIHZtLmluc3RhbmNlLl9zdWJzY3JpcHRpb24uYWRkT25zLmxpbmVzLnF1YW50aXR5ID0gcGFyc2VJbnQodmFsLCAxMCk7XG5cdFx0XHR0b3RhbExpbmVzKCk7XG5cdFx0XHR0b3RhbEFtb3VudCgpO1xuXHRcdH0pO1xuXG5cdFx0JHNjb3BlLiR3YXRjaChmdW5jdGlvbigpIHtcblx0XHRcdHJldHVybiB2bS5hZGRPbnMuc3RvcmFnZS5xdWFudGl0eTtcblx0XHR9LCBmdW5jdGlvbih2YWwpIHtcblx0XHRcdHZtLmFkZE9ucy5zdG9yYWdlLnF1YW50aXR5ID0gdm0uYWRkT25zLnN0b3JhZ2UucXVhbnRpdHkudG9TdHJpbmcoKTtcblx0XHRcdC8vIHZtLmluc3RhbmNlLl9zdWJzY3JpcHRpb24uYWRkT25zLnN0b3JhZ2UucXVhbnRpdHkgPSBwYXJzZUludCh2YWwsIDEwKTtcblx0XHRcdHRvdGFsU3RvcmFnZSgpO1xuXHRcdFx0dG90YWxBbW91bnQoKTtcblx0XHR9KTtcblxuXHRcdCRzY29wZS4kd2F0Y2goZnVuY3Rpb24oKSB7XG5cdFx0XHRyZXR1cm4gdm0uaW5zdGFuY2UuX3N1YnNjcmlwdGlvbi5wbGFuSWQ7XG5cdFx0fSwgZnVuY3Rpb24odmFsLCBwcmV2KSB7XG5cdFx0XHR2bS5wbGFucy5mb3JFYWNoKGZ1bmN0aW9uKGl0ZW0pIHtcblx0XHRcdFx0aWYoaXRlbS5wbGFuSWQgPT09IHZtLmluc3RhbmNlLl9zdWJzY3JpcHRpb24ucGxhbklkKSB7XG5cdFx0XHRcdFx0dm0uc2VsZWN0ZWRQbGFuID0gaXRlbTtcblx0XHRcdFx0XHRpZihpdGVtLnBsYW5JZCA9PT0gJ3RyaWFsJyB8fCBpdGVtLnBsYW5JZCA9PT0gJ2ZyZWUnIHx8IGl0ZW0ucGxhbklkID09PSAndGVhbScpIHtcblx0XHRcdFx0XHRcdC8vIHZtLnRyaWFsID0gdHJ1ZTtcblx0XHRcdFx0XHRcdHZtLmluc3RhbmNlLl9zdWJzY3JpcHRpb24ucXVhbnRpdHkgPSBtaW5Vc2Vycztcblx0XHRcdFx0XHRcdHZtLmluc3RhbmNlLm1heGxpbmVzID0gbWluTGluZXM7XG5cdFx0XHRcdFx0XHR2bS5hZGRPbnMubGluZXMucXVhbnRpdHkgPSAnMCc7XG5cdFx0XHRcdFx0XHR2bS5hZGRPbnMuc3RvcmFnZS5xdWFudGl0eSA9ICcwJztcblx0XHRcdFx0XHRcdHZtLm5vQWRkb25zID0gdHJ1ZTtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0dm0ubm9BZGRvbnMgPSBmYWxzZTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHR0b3RhbEFtb3VudCgpO1xuXHRcdFx0XHRcdHRvdGFsU3RvcmFnZSgpO1xuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblx0XHRcdHZtLnByZXZQbGFuSWQgPSBwcmV2O1xuXHRcdFx0Y29uc29sZS5sb2coJ3ByZXZQbGFuSWQ6ICcsIHZtLnByZXZQbGFuSWQpO1xuXHRcdH0pO1xuXG5cdFx0JHNjb3BlLiRvbignJHZpZXdDb250ZW50TG9hZGVkJywgZnVuY3Rpb24oKXtcblx0XHRcdHNwaW5uZXIuc2hvdygncGxhbnMtc3Bpbm5lcicpO1xuXHRcdFx0c3Bpbm5lci5zaG93KCdzZXJ2ZXJzLXNwaW5uZXInKTtcblx0XHR9KTtcblxuXHRcdGdldFBsYW5zKCk7XG5cdFx0Z2V0U2VydmVycygpO1xuXG5cdFx0ZnVuY3Rpb24gZ2V0UGxhbnMoKSB7XG5cdFx0XHRcblx0XHRcdGlmKGJyYW5jaGVzU2VydmljZS5nZXRQbGFucygpLmxlbmd0aCkge1xuXHRcdFx0XHRjb25zb2xlLmxvZygnZ2V0UGxhbnM6JywgYnJhbmNoZXNTZXJ2aWNlLmdldFBsYW5zKCkpO1xuXHRcdFx0XHR2bS5wbGFucyA9IGJyYW5jaGVzU2VydmljZS5nZXRQbGFucygpO1xuXG5cdFx0XHRcdHNwaW5uZXIuaGlkZSgncGxhbnMtc3Bpbm5lcicpO1xuXHRcdFx0XHRpbml0KCk7XG5cblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0XHRhcGkucmVxdWVzdCh7XG5cdFx0XHRcdHVybDogJ2dldFBsYW5zJ1xuXHRcdFx0fSkudGhlbihmdW5jdGlvbihyZXMpe1xuXHRcdFx0XHRpZighcmVzLmRhdGEuc3VjY2VzcykgcmV0dXJuIGVycm9yU2VydmljZS5zaG93KHJlcy5kYXRhLm1lc3NhZ2UpO1xuXG5cdFx0XHRcdHZtLnBsYW5zID0gcmVzLmRhdGEucmVzdWx0O1xuXHRcdFx0XHR2bS5wbGFucy5mb3JFYWNoKGZ1bmN0aW9uKGl0ZW0pe1xuXHRcdFx0XHRcdGl0ZW0uYWRkT25zID0gdXRpbHMuYXJyYXlUb09iamVjdChpdGVtLmFkZE9ucywgJ25hbWUnKTtcblx0XHRcdFx0fSk7XG5cdFx0XHRcdGNvbnNvbGUubG9nKCdnZXRQbGFuczonLCB2bS5wbGFucyk7XG5cblx0XHRcdFx0YnJhbmNoZXNTZXJ2aWNlLnNldFBsYW5zKHZtLnBsYW5zKTtcblxuXHRcdFx0XHRpbml0KCk7XG5cdFx0XHRcdFxuXHRcdFx0fSwgZnVuY3Rpb24oZXJyKXtcblx0XHRcdFx0ZXJyb3JTZXJ2aWNlLnNob3coZXJyLmRhdGEubWVzc2FnZSk7XG5cdFx0XHR9KTtcblx0XHR9XG5cblx0XHRmdW5jdGlvbiBnZXRTZXJ2ZXJzKCkge1xuXG5cdFx0XHRpZihicmFuY2hlc1NlcnZpY2UuZ2V0U2VydmVycygpLmxlbmd0aCkge1xuXHRcdFx0XHR2bS5zaWRzID0gYnJhbmNoZXNTZXJ2aWNlLmdldFNlcnZlcnMoKTtcblx0XHRcdFx0aWYob2lkID09PSAnbmV3Jykgdm0uaW5zdGFuY2Uuc2lkID0gdm0uc2lkc1swXS5faWQ7XG5cdFx0XHRcdHNwaW5uZXIuaGlkZSgnc2VydmVycy1zcGlubmVyJyk7XG5cdFx0XHRcdFxuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdGFwaS5yZXF1ZXN0KHtcblx0XHRcdFx0dXJsOiAnZ2V0U2VydmVycydcblx0XHRcdH0pLnRoZW4oZnVuY3Rpb24ocmVzKXtcblx0XHRcdFx0aWYoIXJlcy5kYXRhLnN1Y2Nlc3MpIHJldHVybiBlcnJvclNlcnZpY2Uuc2hvdyhyZXMuZGF0YS5tZXNzYWdlKTtcblxuXHRcdFx0XHRjb25zb2xlLmxvZygnZ2V0U2VydmVyczogJywgcmVzLmRhdGEucmVzdWx0KTtcblx0XHRcdFx0dm0uc2lkcyA9IHJlcy5kYXRhLnJlc3VsdDtcblx0XHRcdFx0YnJhbmNoZXNTZXJ2aWNlLnNldFNlcnZlcnModm0uc2lkcyk7XG5cblx0XHRcdFx0aWYob2lkID09PSAnbmV3Jykgdm0uaW5zdGFuY2Uuc2lkID0gdm0uc2lkc1swXS5faWQ7XG5cdFx0XHRcdHNwaW5uZXIuaGlkZSgnc2VydmVycy1zcGlubmVyJyk7XG5cdFx0XHR9LCBmdW5jdGlvbihlcnIpe1xuXHRcdFx0XHRlcnJvclNlcnZpY2Uuc2hvdyhlcnIpO1xuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gaW5pdCgpIHtcblx0XHRcdGlmKG9pZCAhPT0gJ25ldycpe1xuXG5cdFx0XHRcdGJyYW5jaGVzU2VydmljZS5nZXQob2lkLCBmdW5jdGlvbiAoYnJhbmNoKXtcblx0XHRcdFx0XHRpZihicmFuY2gpIHtcblx0XHRcdFx0XHRcdHNldEJyYW5jaChhbmd1bGFyLm1lcmdlKHt9LCBicmFuY2gpKTtcblx0XHRcdFx0XHRcdHZtLmF2YWlsYWJsZVBsYW5zID0gdm0ucGxhbnMuZmlsdGVyKGlzUGxhbkF2YWlsYWJsZSk7XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdGFwaS5yZXF1ZXN0KHsgdXJsOiAnZ2V0QnJhbmNoLycrb2lkIH0pLnRoZW4oZnVuY3Rpb24gKHJlcyl7XG5cdFx0XHRcdFx0XHRcdGlmKCFyZXMuZGF0YS5zdWNjZXNzKSByZXR1cm4gZXJyb3JTZXJ2aWNlLnNob3cocmVzLmRhdGEubWVzc2FnZSk7XG5cblx0XHRcdFx0XHRcdFx0c2V0QnJhbmNoKHJlcy5kYXRhLnJlc3VsdCk7XG5cdFx0XHRcdFx0XHRcdHZtLmF2YWlsYWJsZVBsYW5zID0gdm0ucGxhbnMuZmlsdGVyKGlzUGxhbkF2YWlsYWJsZSk7XG5cdFx0XHRcdFx0XHR9LCBmdW5jdGlvbiAoZXJyKXtcblx0XHRcdFx0XHRcdFx0ZXJyb3JTZXJ2aWNlLnNob3coZXJyKTtcblx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRzcGlubmVyLmhpZGUoJ3BsYW5zLXNwaW5uZXInKTtcblx0XHRcdFx0fSk7XG5cblx0XHRcdFx0dm0ubmV3QnJhbmNoID0gZmFsc2U7XG5cblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHZtLm5ld0JyYW5jaCA9IHRydWU7XG5cdFx0XHRcdHZtLm51bVBvb2wgPSAnMjAwLTI5OSc7XG5cdFx0XHRcdHZtLmluc3RhbmNlLl9zdWJzY3JpcHRpb24ucGxhbklkID0gJ3N0YW5kYXJkJztcblx0XHRcdFx0dm0uYXZhaWxhYmxlUGxhbnMgPSB2bS5wbGFucztcblxuXHRcdFx0XHRpZihjYXJ0SXRlbSAmJiBjYXJ0LmdldChjYXJ0SXRlbSkpIHtcblx0XHRcdFx0XHRzZXRCcmFuY2goY2FydC5nZXQoY2FydEl0ZW0pLmRhdGEpO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0YXBpLnJlcXVlc3Qoe1xuXHRcdFx0XHRcdHVybDogJ2NhbkNyZWF0ZVRyaWFsU3ViJ1xuXHRcdFx0XHR9KS50aGVuKGZ1bmN0aW9uKHJlcyl7XG5cdFx0XHRcdFx0aWYoIXJlcy5kYXRhLnN1Y2Nlc3MpIHJldHVybiBlcnJvclNlcnZpY2Uuc2hvdyhyZXMuZGF0YS5tZXNzYWdlKTtcblx0XHRcdFx0XHRcblx0XHRcdFx0XHRpZihyZXMuZGF0YS5yZXN1bHQpIHZtLnRyaWFsID0gdHJ1ZTtcblx0XHRcdFx0XHRlbHNlIHZtLnRyaWFsID0gZmFsc2U7XG5cdFx0XHRcdFx0c3Bpbm5lci5oaWRlKCdwbGFucy1zcGlubmVyJyk7XG5cdFx0XHRcdH0sIGZ1bmN0aW9uKGVycil7XG5cdFx0XHRcdFx0ZXJyb3JTZXJ2aWNlLnNob3coZXJyLmRhdGEubWVzc2FnZSk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIHByb2NlZWQoYWN0aW9uKXtcblxuXHRcdFx0dmFyIGJyYW5jaFNldHRzID0gZ2V0QnJhbmNoU2V0dHMoKTtcblx0XHRcdGNvbnNvbGUubG9nKCdwcm9jZWVkOiAnLCBicmFuY2hTZXR0cywgdm0uYWRkT25zKTtcblx0XHRcdGlmKCFicmFuY2hTZXR0cykge1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdC8vIFByb2hpYml0IGRvd25ncmFkZSBpZiBwbGFuJ3Mgc3RvcmVsaW1pdCBcblx0XHRcdC8vIGlzIGxlc3MgdGhhbiBicmFuY2ggaXMgYWxyZWFkeSB1dGlsaXplZFxuXHRcdFx0aWYoYnJhbmNoU2V0dHMucmVzdWx0LnN0b3JlbGltaXQgPCBicmFuY2hTZXR0cy5yZXN1bHQuc3RvcmVzaXplKSB7XG5cdFx0XHRcdCR0cmFuc2xhdGUoJ0VSUk9SUy5ET1dOR1JBREVfRVJST1JfU1RPUkFHRScpXG5cdFx0XHRcdC50aGVuKGZ1bmN0aW9uKHRyYW5zbGF0aW9uKXtcblx0XHRcdFx0XHRhbGVydCh0cmFuc2xhdGlvbik7XG5cdFx0XHRcdH0pO1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cdFx0XHQvLyBQcm9oaWJpdCBkb3duZ3JhZGUgaWYgdGhlIG5ldyBudWJlciBvZiBtYXh1c2VycyBcblx0XHRcdC8vIGlzIGxlc3MgdGhhbiB0aGUgbnVtYmVyIG9mIGNyZWF0ZWQgdXNlcnMgaW4gYnJhbmNoXG5cdFx0XHRpZihicmFuY2hTZXR0cy5fc3Vic2NyaXB0aW9uLnF1YW50aXR5IDwgYnJhbmNoU2V0dHMucmVzdWx0LnVzZXJzKSB7XG5cdFx0XHRcdCR0cmFuc2xhdGUoJ0VSUk9SUy5ET1dOR1JBREVfRVJST1JfVVNFUlMnKVxuXHRcdFx0XHQudGhlbihmdW5jdGlvbih0cmFuc2xhdGlvbil7XG5cdFx0XHRcdFx0YWxlcnQodHJhbnNsYXRpb24pO1xuXHRcdFx0XHR9KTtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0XHR2YXIgYWN0aW9uU3RyID0gJyc7IFxuXHRcdFx0aWYoYWN0aW9uID09PSAnY3JlYXRlU3Vic2NyaXB0aW9uJykge1xuXHRcdFx0XHRhY3Rpb25TdHIgPSAnTkVXX1NVQlNDUklQVElPTic7XG5cdFx0XHR9IGVsc2UgaWYoYWN0aW9uID09PSAndXBkYXRlU3Vic2NyaXB0aW9uJyB8fCBhY3Rpb24gPT09ICdjaGFuZ2VQbGFuJykge1xuXHRcdFx0XHRhY3Rpb25TdHIgPSAnVVBEQVRFX1NVQlNDUklQVElPTic7XG5cdFx0XHR9XG5cblx0XHRcdCR0cmFuc2xhdGUoJ0RFU0NSSVBUSU9OUy4nK2FjdGlvblN0ciwge1xuXHRcdFx0XHRwbGFuSWQ6IGJyYW5jaFNldHRzLl9zdWJzY3JpcHRpb24ucGxhbklkLFxuXHRcdFx0XHR1c2VyczogYnJhbmNoU2V0dHMuX3N1YnNjcmlwdGlvbi5xdWFudGl0eSxcblx0XHRcdFx0bWF4bGluZXM6IGJyYW5jaFNldHRzLnJlc3VsdC5tYXhsaW5lcyxcblx0XHRcdFx0Y29tcGFueTogYnJhbmNoU2V0dHMucmVzdWx0Lm5hbWVcblx0XHRcdH0pXG5cdFx0XHQudGhlbihmdW5jdGlvbiAoZGVzY3JpcHRpb24pIHtcblx0XHRcdFx0XG5cdFx0XHRcdGJyYW5jaFNldHRzLl9zdWJzY3JpcHRpb24uZGVzY3JpcHRpb24gPSBkZXNjcmlwdGlvbjtcblxuXHRcdFx0XHRpZihjYXJ0SXRlbSkge1xuXHRcdFx0XHRcdGNhcnQudXBkYXRlKGJyYW5jaFNldHRzLnJlc3VsdC5wcmVmaXgsIHtcblx0XHRcdFx0XHRcdGFjdGlvbjogYWN0aW9uLFxuXHRcdFx0XHRcdFx0ZGVzY3JpcHRpb246IGRlc2NyaXB0aW9uLFxuXHRcdFx0XHRcdFx0YW1vdW50OiB2bS50b3RhbEFtb3VudCxcblx0XHRcdFx0XHRcdGRhdGE6IGJyYW5jaFNldHRzXG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0Ly8gY2FydFsodm0uY3VzdG9tZXIucm9sZSA9PT0gJ3VzZXInID8gJ3NldCcgOiAnYWRkJyldKHtcblx0XHRcdFx0XHRjYXJ0LmFkZCh7XG5cdFx0XHRcdFx0XHRhY3Rpb246IGFjdGlvbixcblx0XHRcdFx0XHRcdGRlc2NyaXB0aW9uOiBkZXNjcmlwdGlvbixcblx0XHRcdFx0XHRcdGFtb3VudDogdm0udG90YWxBbW91bnQsXG5cdFx0XHRcdFx0XHRkYXRhOiBicmFuY2hTZXR0c1xuXHRcdFx0XHRcdH0pO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0JGxvY2F0aW9uLnBhdGgoJy9wYXltZW50Jyk7XG5cdFx0XHR9KTtcblx0XHR9XG5cblx0XHRmdW5jdGlvbiB1cGRhdGUoKXtcblxuXHRcdFx0dmFyIGJyYW5jaFNldHRzID0gZ2V0QnJhbmNoU2V0dHMoKSxcblx0XHRcdFx0YmFsYW5jZSxcblx0XHRcdFx0cGxhblByaWNlLFxuXHRcdFx0XHRwbGFuQW1vdW50LFxuXHRcdFx0XHRiaWxsaW5nQ3ljbGVzO1xuXG5cdFx0XHRjb25zb2xlLmxvZygndXBkYXRlOiAnLCBicmFuY2hTZXR0cyk7XG5cblx0XHRcdGlmKCFicmFuY2hTZXR0cykge1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdC8vIFByb2hpYml0IGRvd25ncmFkZSBpZiBwbGFuJ3Mgc3RvcmVsaW1pdCBcblx0XHRcdC8vIGlzIGxlc3MgdGhhbiBicmFuY2ggaXMgYWxyZWFkeSB1dGlsaXplZFxuXHRcdFx0aWYoYnJhbmNoU2V0dHMucmVzdWx0LnN0b3JlbGltaXQgPCBicmFuY2hTZXR0cy5yZXN1bHQuc3RvcmVzaXplKSB7XG5cdFx0XHRcdCR0cmFuc2xhdGUoJ0VSUk9SUy5ET1dOR1JBREVfRVJST1JfU1RPUkFHRScpXG5cdFx0XHRcdC50aGVuKGZ1bmN0aW9uKHRyYW5zbGF0aW9uKXtcblx0XHRcdFx0XHRhbGVydCh0cmFuc2xhdGlvbik7XG5cdFx0XHRcdH0pO1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cdFx0XHQvLyBQcm9oaWJpdCBkb3duZ3JhZGUgaWYgdGhlIG5ldyBudWJlciBvZiBtYXh1c2VycyBcblx0XHRcdC8vIGlzIGxlc3MgdGhhbiB0aGUgbnVtYmVyIG9mIGNyZWF0ZWQgdXNlcnMgaW4gYnJhbmNoXG5cdFx0XHRpZihicmFuY2hTZXR0cy5fc3Vic2NyaXB0aW9uLnF1YW50aXR5IDwgYnJhbmNoU2V0dHMucmVzdWx0LnVzZXJzKSB7XG5cdFx0XHRcdCR0cmFuc2xhdGUoJ0VSUk9SUy5ET1dOR1JBREVfRVJST1JfVVNFUlMnKVxuXHRcdFx0XHQudGhlbihmdW5jdGlvbih0cmFuc2xhdGlvbil7XG5cdFx0XHRcdFx0YWxlcnQodHJhbnNsYXRpb24pO1xuXHRcdFx0XHR9KTtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0XHRiYWxhbmNlID0gcGFyc2VGbG9hdCh2bS5jdXN0b21lci5iYWxhbmNlKTtcblx0XHRcdHBsYW5QcmljZSA9IHBhcnNlRmxvYXQodm0uc2VsZWN0ZWRQbGFuLnByaWNlKTtcblx0XHRcdHBsYW5BbW91bnQgPSBwYXJzZUZsb2F0KHZtLnRvdGFsQW1vdW50KTtcblx0XHRcdGJpbGxpbmdDeWNsZXMgPSBicmFuY2hTZXR0cy5fc3Vic2NyaXB0aW9uLmJpbGxpbmdDeWNsZXM7XG5cblx0XHRcdGlmKGJhbGFuY2UgPCBwbGFuQW1vdW50IHx8ICh2bS5wcmV2UGxhbklkICYmIGJyYW5jaFNldHRzLl9zdWJzY3JpcHRpb24ucGxhbklkICE9PSB2bS5wcmV2UGxhbklkKSkge1xuXG5cdFx0XHRcdHByb2NlZWQoJ2NoYW5nZVBsYW4nKTtcblx0XHRcdFx0cmV0dXJuO1xuXG5cdFx0XHR9XG5cblx0XHRcdGFwaS5yZXF1ZXN0KHtcblx0XHRcdFx0dXJsOiAndXBkYXRlU3Vic2NyaXB0aW9uJyxcblx0XHRcdFx0cGFyYW1zOiBicmFuY2hTZXR0c1xuXHRcdFx0fSkudGhlbihmdW5jdGlvbihyZXMpe1xuXHRcdFx0XHRpZighcmVzLmRhdGEuc3VjY2Vzcykge1xuXHRcdFx0XHRcdGlmKGVyci5kYXRhLm1lc3NhZ2UgPT09ICdFUlJPUlMuTk9UX0VOT1VHSF9DUkVESVRTJykgcHJvY2VlZCgndXBkYXRlU3Vic2NyaXB0aW9uJyk7XG5cdFx0XHRcdFx0ZWxzZSBlcnJvclNlcnZpY2Uuc2hvdyhyZXMuZGF0YS5tZXNzYWdlKTtcblx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRicmFuY2hlc1NlcnZpY2UudXBkYXRlKGJyYW5jaFNldHRzLm9pZCwgYnJhbmNoU2V0dHMpO1xuXHRcdFx0XHRub3RpZnlTZXJ2aWNlLnNob3coJ0FMTF9DSEFOR0VTX1NBVkVEJyk7XG5cdFx0XHR9LCBmdW5jdGlvbihlcnIpe1xuXHRcdFx0XHRlcnJvclNlcnZpY2Uuc2hvdyhlcnIpO1xuXHRcdFx0fSk7XG5cdFx0fVxuXHRcdFxuXHRcdGZ1bmN0aW9uIHNldEJyYW5jaChvcHRzKSB7XG5cdFx0XHR2bS5pbnN0YW5jZSA9IG9wdHM7XG5cdFx0XHR2bS5pbml0TmFtZSA9IG9wdHMucmVzdWx0Lm5hbWU7XG5cblx0XHRcdGlmKG9wdHMucmVzdWx0LmV4dGVuc2lvbnMpIHtcblx0XHRcdFx0dm0ubnVtUG9vbCA9IHBvb2xTaXplU2VydmljZXMucG9vbEFycmF5VG9TdHJpbmcob3B0cy5yZXN1bHQuZXh0ZW5zaW9ucyk7XG5cdFx0XHR9XG5cdFx0XHRcblx0XHRcdC8vIGlmKG9wdHMuX3N1YnNjcmlwdGlvbi5wbGFuSWQgJiYgb3B0cy5fc3Vic2NyaXB0aW9uLnBsYW5JZCAhPT0gJ3RyaWFsJyAmJiBvcHRzLl9zdWJzY3JpcHRpb24ucGxhbklkICE9PSAnZnJlZScpIHtcblx0XHRcdC8vIFx0dm0ubm9UcmlhbCA9IHRydWU7XG5cdFx0XHQvLyB9XG5cblx0XHRcdGlmKG9wdHMuX3N1YnNjcmlwdGlvbi5hZGRPbnMubGVuZ3RoKSB7XG5cdFx0XHRcdHZtLmFkZE9ucyA9IHV0aWxzLmFycmF5VG9PYmplY3Qob3B0cy5fc3Vic2NyaXB0aW9uLmFkZE9ucywgJ25hbWUnKTtcblx0XHRcdH1cblxuXHRcdFx0dm0uc3RvcmFnZXMuZm9yRWFjaChmdW5jdGlvbihpdGVtLCBpbmRleCwgYXJyYXkpe1xuXHRcdFx0XHRpZihpdGVtICE9PSAnMCcgJiYgcGFyc2VJbnQoaXRlbSwgMTApIDwgb3B0cy5yZXN1bHQuc3RvcmVzaXplKSBhcnJheS5zcGxpY2UoaW5kZXgsIDEpO1xuXHRcdFx0fSk7XG5cblx0XHRcdGNvbnNvbGUubG9nKCdzZXRCcmFuY2g6ICcsIHZtLmluc3RhbmNlKTtcblx0XHR9XG5cblx0XHRmdW5jdGlvbiBnZXRCcmFuY2hTZXR0cygpIHtcblx0XHRcdHZhciBhZGRPbnMgPSBbXTtcblxuXHRcdFx0aWYoIXZtLmluc3RhbmNlLl9zdWJzY3JpcHRpb24ucGxhbklkIHx8ICF2bS5pbnN0YW5jZS5yZXN1bHQucHJlZml4IHx8ICF2bS5udW1Qb29sIHx8ICF2bS5pbnN0YW5jZS5yZXN1bHQubmFtZSB8fCAoIXZtLmluc3RhbmNlLnJlc3VsdC5hZG1pbnBhc3MgJiYgdm0ubmV3QnJhbmNoKSkge1xuXHRcdFx0XHRlcnJvclNlcnZpY2Uuc2hvdygnTUlTU0lOR19GSUVMRFMnKTtcblx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0fVxuXG5cdFx0XHRjb25zb2xlLmxvZygncGFzczogJywgdm0uaW5zdGFuY2UucmVzdWx0LmFkbWlucGFzcywgdm0uY29uZmlybVBhc3MpO1xuXHRcdFx0aWYodm0uaW5zdGFuY2UucmVzdWx0LmFkbWlucGFzcyAmJiAodm0uY29uZmlybVBhc3MgIT09IHZtLmluc3RhbmNlLnJlc3VsdC5hZG1pbnBhc3MpKXtcblx0XHRcdFx0ZXJyb3JTZXJ2aWNlLnNob3coJ1BBU1NXT1JEX05PVF9DT05GSVJNRUQnKTtcblx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0fVxuXG5cdFx0XHR2bS5pbnN0YW5jZS5yZXN1bHQuZXh0ZW5zaW9ucyA9IHBvb2xTaXplU2VydmljZXMucG9vbFN0cmluZ1RvT2JqZWN0KHZtLm51bVBvb2wpO1xuXHRcdFx0dm0uaW5zdGFuY2UucmVzdWx0LmFkbWlubmFtZSA9IHZtLmluc3RhbmNlLnJlc3VsdC5wcmVmaXg7XG5cdFx0XHR2bS5pbnN0YW5jZS5yZXN1bHQubWF4bGluZXMgPSBwYXJzZUludCh2bS50b3RhbExpbmVzLCAxMCk7XG5cdFx0XHR2bS5pbnN0YW5jZS5yZXN1bHQubWF4dXNlcnMgPSBwYXJzZUludCh2bS5pbnN0YW5jZS5fc3Vic2NyaXB0aW9uLnF1YW50aXR5LCAxMCk7XG5cdFx0XHQvLyB2bS5pbnN0YW5jZS5yZXN1bHQuc3RvcmVsaW1pdCA9IGNvbnZlcnRCeXRlc0ZpbHRlcih2bS50b3RhbFN0b3JhZ2UsICdHQicsICdCeXRlJyk7XG5cdFx0XHR2bS5pbnN0YW5jZS5yZXN1bHQuc3RvcmVsaW1pdCA9IHZtLnRvdGFsU3RvcmFnZTtcblx0XHRcdGlmKG9pZCkgdm0uaW5zdGFuY2Uub2lkID0gb2lkO1xuXG5cdFx0XHRhbmd1bGFyLmZvckVhY2godm0uYWRkT25zLCBmdW5jdGlvbihhZGRPbil7XG5cdFx0XHRcdGlmKGFkZE9uLnF1YW50aXR5KSBhZGRPbi5xdWFudGl0eSA9IHBhcnNlSW50KGFkZE9uLnF1YW50aXR5KTtcblx0XHRcdFx0YWRkT25zLnB1c2goYWRkT24pO1xuXHRcdFx0fSk7XG5cblx0XHRcdHZtLmluc3RhbmNlLl9zdWJzY3JpcHRpb24uYWRkT25zID0gYWRkT25zO1xuXG5cdFx0XHRyZXR1cm4gdm0uaW5zdGFuY2U7XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gc2VsZWN0UGxhbihwbGFuKSB7XG5cdFx0XHR2bS5pbnN0YW5jZS5fc3Vic2NyaXB0aW9uLnBsYW5JZCA9IHBsYW4ucGxhbklkO1xuXHRcdFx0dm0uaW5zdGFuY2UuX3N1YnNjcmlwdGlvbi5udW1JZCA9IHBsYW4ubnVtSWQ7XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gaXNQbGFuQXZhaWxhYmxlKHBsYW4pIHtcblx0XHRcdGNvbnNvbGUubG9nKCdpc1BsYW5BdmFpbGFibGU6ICcsIHBsYW4ubnVtSWQgPj0gdm0uaW5zdGFuY2UuX3N1YnNjcmlwdGlvbi5udW1JZCk7XG5cdFx0XHRpZihwbGFuLm51bUlkID49IHZtLmluc3RhbmNlLl9zdWJzY3JpcHRpb24ubnVtSWQpIHtcblx0XHRcdFx0cmV0dXJuIHBsYW47XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gc2VsZWN0U2VydmVyKHNpZCkge1xuXHRcdFx0dm0uaW5zdGFuY2Uuc2lkID0gc2lkO1xuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIHRvdGFsQW1vdW50KCkge1xuXHRcdFx0dmFyIHN1YiA9IHZtLmluc3RhbmNlLl9zdWJzY3JpcHRpb247XG5cdFx0XHR2bS50b3RhbEFtb3VudCA9IHN1Yi5xdWFudGl0eSAqIHBhcnNlRmxvYXQodm0uc2VsZWN0ZWRQbGFuLnByaWNlKTtcblxuXHRcdFx0aWYodm0uc2VsZWN0ZWRQbGFuLmFkZE9ucyAmJiBPYmplY3Qua2V5cyh2bS5zZWxlY3RlZFBsYW4uYWRkT25zKS5sZW5ndGgpIHtcblx0XHRcdFx0dm0udG90YWxBbW91bnQgKz0gdm0uYWRkT25zLnN0b3JhZ2UucXVhbnRpdHkgKiBwYXJzZUZsb2F0KHZtLnNlbGVjdGVkUGxhbi5hZGRPbnMuc3RvcmFnZS5wcmljZSk7XG5cdFx0XHRcdHZtLnRvdGFsQW1vdW50ICs9IHZtLmFkZE9ucy5saW5lcy5xdWFudGl0eSAqIHBhcnNlRmxvYXQodm0uc2VsZWN0ZWRQbGFuLmFkZE9ucy5saW5lcy5wcmljZSk7XG5cdFx0XHR9XG5cdFx0XHR2bS50b3RhbEFtb3VudCA9IHZtLnRvdGFsQW1vdW50LnRvRml4ZWQoMik7XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gdG90YWxTdG9yYWdlKCkge1xuXHRcdFx0dmFyIHN1YiA9IHZtLmluc3RhbmNlLl9zdWJzY3JpcHRpb247XG5cdFx0XHRpZih2bS5zZWxlY3RlZFBsYW4uY3VzdG9tRGF0YSkge1xuXHRcdFx0XHR2bS50b3RhbFN0b3JhZ2UgPSBzdWIucXVhbnRpdHkgKiBwYXJzZUZsb2F0KHZtLnNlbGVjdGVkUGxhbi5jdXN0b21EYXRhLnN0b3JhZ2VwZXJ1c2VyKTtcblx0XHRcdH1cblx0XHRcdGlmKHZtLmFkZE9ucy5zdG9yYWdlKSB7XG5cdFx0XHRcdHZtLnRvdGFsU3RvcmFnZSArPSBwYXJzZUludCh2bS5hZGRPbnMuc3RvcmFnZS5xdWFudGl0eSwgMTApO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIHRvdGFsTGluZXMoKSB7XG5cdFx0XHR2YXIgc3ViID0gdm0uaW5zdGFuY2UuX3N1YnNjcmlwdGlvbjtcblx0XHRcdHZtLnRvdGFsTGluZXMgPSBzdWIucXVhbnRpdHkgKiAyO1xuXHRcdFx0aWYodm0uYWRkT25zLmxpbmVzKSB7XG5cdFx0XHRcdHZtLnRvdGFsTGluZXMgKz0gcGFyc2VJbnQodm0uYWRkT25zLmxpbmVzLnF1YW50aXR5LCAxMCk7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gZ2VuZXJhdGVQYXNzd29yZChtaW4sIG1heCkge1xuXHRcdFx0dmFyIG5ld1Bhc3MgPSAnJztcblx0XHRcdHdoaWxlKCF1dGlscy5jaGVja1Bhc3N3b3JkU3RyZW5ndGgobmV3UGFzcykpIHtcblx0XHRcdFx0bmV3UGFzcyA9IHV0aWxzLmdlbmVyYXRlUGFzc3dvcmQobWluLCBtYXgpO1xuXHRcdFx0fVxuXHRcdFx0dm0uaW5zdGFuY2UucmVzdWx0LmFkbWlucGFzcyA9IG5ld1Bhc3M7XG5cdFx0XHR2bS5jb25maXJtUGFzcyA9IG5ld1Bhc3M7XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gcmV2ZWFsUGFzc3dvcmQoKSB7XG5cdFx0XHR2bS5wYXNzVHlwZSA9IHZtLnBhc3NUeXBlID09PSAndGV4dCcgPyAncGFzc3dvcmQnIDogJ3RleHQnO1xuXHRcdH1cblxuXHR9XG5cbn0pKCk7IiwiYW5ndWxhci5tb2R1bGUoJ2FwcC5pbnN0YW5jZScpXG4uY29uZmlnKFsnJHJvdXRlUHJvdmlkZXInLCBmdW5jdGlvbigkcm91dGVQcm92aWRlcil7XG5cblx0JHJvdXRlUHJvdmlkZXJcblx0XHQud2hlbignL2luc3RhbmNlLzpvaWQnLCB7XG5cdFx0XHR0ZW1wbGF0ZVVybDogJ2luc3RhbmNlL2luc3RhbmNlLmh0bWwnLFxuXHRcdFx0Y29udHJvbGxlcjogJ0luc3RhbmNlQ29udHJvbGxlcicsXG5cdFx0XHRjb250cm9sbGVyQXM6ICdpbnN0Vm0nLFxuXHRcdFx0cmVzb2x2ZToge1xuXHRcdFx0XHRsb2dnZWRpbjogaXNBdXRob3JpemVkXG5cdFx0XHR9XG5cdFx0fSk7XG5cbn1dKTtcblxuaXNBdXRob3JpemVkLiRpbmplY3QgPSBbJ2F1dGhTZXJ2aWNlJ107XG5mdW5jdGlvbiBpc0F1dGhvcml6ZWQoYXV0aFNlcnZpY2UpIHtcblx0cmV0dXJuIGF1dGhTZXJ2aWNlLmlzQXV0aG9yaXplZCgpO1xufSIsIihmdW5jdGlvbigpe1xuXG5cdCd1c2Ugc3RyaWN0JztcblxuXHRhbmd1bGFyXG5cdFx0Lm1vZHVsZSgnYXBwLmluc3RhbmNlJylcblx0XHQuZGlyZWN0aXZlKCdwbGFuSXRlbScsIHBsYW5JdGVtKTtcblxuXHRmdW5jdGlvbiBwbGFuSXRlbSgpe1xuXG5cdFx0cmV0dXJuIHtcblx0XHRcdHJlc3RyaWN0OiAnQUUnLFxuXHRcdFx0dHJhbnNjbHVkZTogdHJ1ZSxcblx0XHRcdHNjb3BlOiB7XG5cdFx0XHRcdHBsYW46ICc9Jyxcblx0XHRcdFx0bW9kZWw6ICc9Jyxcblx0XHRcdFx0c2VsZWN0UGxhbjogJyYnLFxuXHRcdFx0XHRzaG93UGxhbnM6ICcmJ1xuXHRcdFx0fSxcblx0XHRcdHRlbXBsYXRlVXJsOiAnaW5zdGFuY2UvcGxhbi5odG1sJ1xuXHRcdH07XG5cblx0fVxuXG59KSgpOyIsIihmdW5jdGlvbigpe1xuXG5cdCd1c2Ugc3RyaWN0JztcblxuXHRhbmd1bGFyXG5cdFx0Lm1vZHVsZSgnYXBwLmluc3RhbmNlJylcblx0XHQuZGlyZWN0aXZlKCdzZXJ2ZXJJdGVtJywgc2VydmVySXRlbSk7XG5cblx0ZnVuY3Rpb24gc2VydmVySXRlbSgpe1xuXG5cdFx0cmV0dXJuIHtcblx0XHRcdHJlc3RyaWN0OiAnQUUnLFxuXHRcdFx0dHJhbnNjbHVkZTogdHJ1ZSxcblx0XHRcdHNjb3BlOiB7XG5cdFx0XHRcdG1vZGVsOiAnPScsXG5cdFx0XHRcdHNlcnZlcjogJz0nLFxuXHRcdFx0XHRuZXdCcmFuY2g6ICc9Jyxcblx0XHRcdFx0c2VsZWN0U2VydmVyOiAnJidcblx0XHRcdH0sXG5cdFx0XHR0ZW1wbGF0ZVVybDogJ2luc3RhbmNlL3NlcnZlci1pdGVtLmh0bWwnXG5cdFx0fTtcblxuXHR9XG5cbn0pKCk7IiwiKGZ1bmN0aW9uKCl7XG5cblx0J3VzZSBzdHJpY3QnO1xuXG5cdGFuZ3VsYXJcblx0XHQubW9kdWxlKCdhcHAucHJvZmlsZScpXG5cdFx0LmNvbnRyb2xsZXIoJ1Byb2ZpbGVDb250cm9sbGVyJywgUHJvZmlsZUNvbnRyb2xsZXIpO1xuXG5cdFByb2ZpbGVDb250cm9sbGVyLiRpbmplY3QgPSBbJ2FwaVNlcnZpY2UnLCAnY3VzdG9tZXJTZXJ2aWNlJywgJ25vdGlmeVNlcnZpY2UnLCAnZXJyb3JTZXJ2aWNlJ107XG5cblx0ZnVuY3Rpb24gUHJvZmlsZUNvbnRyb2xsZXIoYXBpLCBjdXN0b21lclNlcnZpY2UsIG5vdGlmeVNlcnZpY2UsIGVycm9yU2VydmljZSkge1xuXG5cdFx0dmFyIHZtID0gdGhpcztcblx0XHR2bS5wcm9maWxlID0gY3VzdG9tZXJTZXJ2aWNlLmdldEN1c3RvbWVyKCk7XG5cdFx0dm0uc2F2ZVByb2ZpbGUgPSBzYXZlUHJvZmlsZTtcblx0XHR2bS5jb25maXJtUGFzcyA9ICcnO1xuXG5cdFx0Y29uc29sZS5sb2coJ3Byb2ZpbGU6ICcsIHZtLnByb2ZpbGUpO1xuXG5cdFx0ZnVuY3Rpb24gc2F2ZVByb2ZpbGUoKSB7XG5cdFx0XHRcblx0XHRcdHZhciBwYXJhbXMgPSB7fTtcblxuXHRcdFx0aWYoIXZtLnByb2ZpbGUuZW1haWwgfHwgIXZtLnByb2ZpbGUubmFtZSl7XG5cdFx0XHRcdHJldHVybiBlcnJvclNlcnZpY2Uuc2hvdygnTUlTU0lOR19GSUVMRFMnKTtcblx0XHRcdH1cblx0XHRcdGlmKHZtLnByb2ZpbGUucGFzc3dvcmQgJiYgdm0uY29uZmlybVBhc3MgIT09IHZtLnByb2ZpbGUucGFzc3dvcmQpe1xuXHRcdFx0XHRyZXR1cm4gZXJyb3JTZXJ2aWNlLnNob3coJ1BBU1NXT1JEX05PVF9DT05GSVJNRUQnKTtcblx0XHRcdH1cblxuXHRcdFx0aWYodm0ucHJvZmlsZS5uYW1lKSBwYXJhbXMubmFtZSA9IHZtLnByb2ZpbGUubmFtZTtcblx0XHRcdGlmKHZtLnByb2ZpbGUuZW1haWwpIHBhcmFtcy5lbWFpbCA9IHZtLnByb2ZpbGUuZW1haWw7XG5cdFx0XHRpZih2bS5wcm9maWxlLnBhc3N3b3JkKSBwYXJhbXMucGFzc3dvcmQgPSB2bS5wcm9maWxlLnBhc3N3b3JkO1xuXG5cdFx0XHRhcGkucmVxdWVzdCh7XG5cdFx0XHRcdHVybDogXCJ1cGRhdGVcIixcblx0XHRcdFx0cGFyYW1zOiBwYXJhbXNcblx0XHRcdH0pLnRoZW4oZnVuY3Rpb24ocmVzKXtcblx0XHRcdFx0aWYoIXJlcy5kYXRhLnN1Y2Nlc3MpIHJldHVybiBlcnJvclNlcnZpY2Uuc2hvdyhyZXMuZGF0YS5tZXNzYWdlKTtcblxuXHRcdFx0XHRub3RpZnlTZXJ2aWNlLnNob3coJ0FMTF9DSEFOR0VTX1NBVkVEJyk7XG5cdFx0XHRcdGN1c3RvbWVyU2VydmljZS5zZXRDdXN0b21lcih2bS5wcm9maWxlKTtcblx0XHRcdFx0Y29uc29sZS5sb2coJ2N1cnJlbnRVc2VyOiAnLCB2bS5wcm9maWxlKTtcblx0XHRcdH0sIGZ1bmN0aW9uKGVycil7XG5cdFx0XHRcdGVycm9yU2VydmljZS5zaG93KGVycik7XG5cdFx0XHR9KTtcblx0XHR9XG5cblx0fVxuXG59KSgpOyIsImFuZ3VsYXIubW9kdWxlKCdhcHAucHJvZmlsZScpXG4uY29uZmlnKFsnJHJvdXRlUHJvdmlkZXInLCBmdW5jdGlvbigkcm91dGVQcm92aWRlcil7XG5cblx0JHJvdXRlUHJvdmlkZXJcblx0XHQud2hlbignL3Byb2ZpbGUnLCB7XG5cdFx0XHR0ZW1wbGF0ZVVybDogJ3Byb2ZpbGUvcHJvZmlsZS5odG1sJyxcblx0XHRcdGNvbnRyb2xsZXI6ICdQcm9maWxlQ29udHJvbGxlcicsXG5cdFx0XHRjb250cm9sbGVyQXM6ICdwcm9maWxlVm0nLFxuXHRcdFx0cmVzb2x2ZToge1xuXHRcdFx0XHRsb2dnZWRpbjogaXNBdXRob3JpemVkXG5cdFx0XHR9XG5cdFx0fSk7XG5cbn1dKTtcblxuaXNBdXRob3JpemVkLiRpbmplY3QgPSBbJ2F1dGhTZXJ2aWNlJ107XG5mdW5jdGlvbiBpc0F1dGhvcml6ZWQoYXV0aFNlcnZpY2UpIHtcblx0cmV0dXJuIGF1dGhTZXJ2aWNlLmlzQXV0aG9yaXplZCgpO1xufSIsImFuZ3VsYXJcbi5tb2R1bGUoJ2FwcCcpXG4uZmlsdGVyKCdjb252ZXJ0Qnl0ZXMnLCBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKGludGVnZXIsIGZyb21Vbml0cywgdG9Vbml0cykge1xuICAgIHZhciBjb2VmZmljaWVudHMgPSB7XG4gICAgICAgICdCeXRlJzogMSxcbiAgICAgICAgJ0tCJzogMTAwMCxcbiAgICAgICAgJ01CJzogMTAwMDAwMCxcbiAgICAgICAgJ0dCJzogMTAwMDAwMDAwMFxuICAgIH07XG4gICAgcmV0dXJuIGludGVnZXIgKiBjb2VmZmljaWVudHNbZnJvbVVuaXRzXSAvIGNvZWZmaWNpZW50c1t0b1VuaXRzXTtcbiAgfTtcbn0pOyIsIihmdW5jdGlvbigpe1xuXG5cdCd1c2Ugc3RyaWN0JztcblxuXHRhbmd1bGFyXG5cdFx0Lm1vZHVsZSgnYXBwLmxheW91dCcpXG5cdFx0LmNvbnRyb2xsZXIoJ0NvbnRlbnRDb250cm9sbGVyJywgQ29udGVudENvbnRyb2xsZXIpO1xuXG5cdENvbnRlbnRDb250cm9sbGVyLiRpbmplY3QgPSBbJyRyb290U2NvcGUnXTtcblxuXHRmdW5jdGlvbiBDb250ZW50Q29udHJvbGxlcigkcm9vdFNjb3BlKSB7XG5cblx0XHR2YXIgdm0gPSB0aGlzO1xuXHRcdC8vIHZtLmZ1bGxWaWV3ID0gdHJ1ZTtcblxuXHR9XG5cbn0pKCk7IiwiKGZ1bmN0aW9uKCl7XG5cblx0J3VzZSBzdHJpY3QnO1xuXG5cdGFuZ3VsYXJcblx0XHQubW9kdWxlKCdhcHAubGF5b3V0Jylcblx0XHQuY29udHJvbGxlcignTGF5b3V0Q29udHJvbGxlcicsIExheW91dENvbnRyb2xsZXIpO1xuXG5cdExheW91dENvbnRyb2xsZXIuJGluamVjdCA9IFsnJHJvb3RTY29wZSddO1xuXG5cdGZ1bmN0aW9uIExheW91dENvbnRyb2xsZXIoJHJvb3RTY29wZSkge1xuXG5cdFx0dmFyIHZtID0gdGhpcztcblxuXHRcdHZtLmZ1bGxWaWV3ID0gdHJ1ZTtcblx0XHR2bS50b3BiYXIgPSBmYWxzZTtcblx0XHR2bS5zaWRlbWVudSA9IGZhbHNlO1xuXHRcdHZtLmxhbmdtZW51ID0gZmFsc2U7XG5cdFx0dm0uZm9vdGVyID0gdHJ1ZTtcblx0XHR2bS50cmlnZ2VyU2lkZWJhciA9IHRyaWdnZXJTaWRlYmFyO1xuXHRcdHZtLnRyaWdnZXJMYW5nTWVudSA9IHRyaWdnZXJMYW5nTWVudTtcblxuXHRcdCRyb290U2NvcGUuJG9uKCdhdXRoLmxvZ2luJywgZnVuY3Rpb24oZSl7XG5cdFx0XHR2bS5mdWxsVmlldyA9IGZhbHNlO1xuXHRcdFx0dm0udG9wYmFyID0gdHJ1ZTtcblx0XHRcdHZtLnNpZGVtZW51ID0gdHJ1ZTtcblx0XHRcdHZtLmZvb3RlciA9IGZhbHNlO1xuXG5cdFx0XHRjb25zb2xlLmxvZygnbGF5b3V0IHZtLnNpZGVtZW51OiAnLCB2bS5zaWRlbWVudSk7XG5cdFx0fSk7XG5cblx0XHQkcm9vdFNjb3BlLiRvbignYXV0aC5sb2dvdXQnLCBmdW5jdGlvbihlKXtcblx0XHRcdHZtLmZ1bGxWaWV3ID0gdHJ1ZTtcblx0XHRcdHZtLnRvcGJhciA9IGZhbHNlO1xuXHRcdFx0dm0uc2lkZW1lbnUgPSBmYWxzZTtcblx0XHRcdHZtLmZvb3RlciA9IHRydWU7XG5cblx0XHRcdGNvbnNvbGUubG9nKCdsYXlvdXQgdm0uc2lkZW1lbnU6ICcsIHZtLnNpZGVtZW51KTtcblx0XHR9KTtcblxuXHRcdGZ1bmN0aW9uIHRyaWdnZXJTaWRlYmFyKCkge1xuXHRcdFx0Y29uc29sZS5sb2coJ3RyaWdnZXIgc2lkZWJhciEnKTtcblx0XHRcdHZtLnNpZGVtZW51ID0gIXZtLnNpZGVtZW51O1xuXHRcdH07XG5cblx0XHRmdW5jdGlvbiB0cmlnZ2VyTGFuZ01lbnUoKSB7XG5cdFx0XHRjb25zb2xlLmxvZygndHJpZ2dlciBsYW5nbWVudSEnKTtcblx0XHRcdHZtLmxhbmdtZW51ID0gIXZtLmxhbmdtZW51O1xuXHRcdH1cblxuXHR9XG5cbn0pKCk7IiwiKGZ1bmN0aW9uKCl7XG5cblx0J3VzZSBzdHJpY3QnO1xuXG5cdGFuZ3VsYXJcblx0XHQubW9kdWxlKCdhcHAucGF5bWVudCcpXG5cdFx0LmRpcmVjdGl2ZSgnbWV0aG9kSXRlbScsIG1ldGhvZEl0ZW0pO1xuXG5cdGZ1bmN0aW9uIG1ldGhvZEl0ZW0oKXtcblxuXHRcdHJldHVybiB7XG5cdFx0XHRyZXN0cmljdDogJ0FFJyxcblx0XHRcdHRyYW5zY2x1ZGU6IHRydWUsXG5cdFx0XHRzY29wZToge1xuXHRcdFx0XHRtb2RlbDogJz0nLFxuXHRcdFx0XHRtZXRob2Q6ICc9Jyxcblx0XHRcdFx0dW5zZWxlY3RhYmxlOiAnPScsXG5cdFx0XHRcdHNlbGVjdDogJyYnXG5cdFx0XHR9LFxuXHRcdFx0dGVtcGxhdGVVcmw6ICdwYXltZW50L21ldGhvZC1pdGVtLmh0bWwnXG5cdFx0fTtcblxuXHR9XG5cbn0pKCk7IiwiKGZ1bmN0aW9uKCl7XG5cblx0J3VzZSBzdHJpY3QnO1xuXG5cdGFuZ3VsYXJcblx0XHQubW9kdWxlKCdhcHAucGF5bWVudCcpXG5cdFx0LmNvbnRyb2xsZXIoJ1BheW1lbnRDb250cm9sbGVyJywgUGF5bWVudENvbnRyb2xsZXIpO1xuXG5cdFBheW1lbnRDb250cm9sbGVyLiRpbmplY3QgPSBbJyRxJywgJyRzY29wZScsICckaHR0cCcsICckcm9vdFNjb3BlJywgJyRsb2NhbFN0b3JhZ2UnLCAnJGxvY2F0aW9uJywgJ2FwaVNlcnZpY2UnLCAnYnJhbmNoZXNTZXJ2aWNlJywgJ2N1c3RvbWVyU2VydmljZScsICdjYXJ0U2VydmljZScsICdub3RpZnlTZXJ2aWNlJywgJ2Vycm9yU2VydmljZScsICdzcGlubmVyU2VydmljZSddO1xuXG5cdGZ1bmN0aW9uIFBheW1lbnRDb250cm9sbGVyKCRxLCAkc2NvcGUsICRodHRwLCAkcm9vdFNjb3BlLCAkbG9jYWxTdG9yYWdlLCAkbG9jYXRpb24sIGFwaSwgYnJhbmNoZXNTZXJ2aWNlLCBjdXN0b21lclNlcnZpY2UsIGNhcnRTZXJ2aWNlLCBub3RpZnlTZXJ2aWNlLCBlcnJvclNlcnZpY2UsIHNwaW5uZXJTZXJ2aWNlKSB7XG5cblx0XHR2YXIgdm0gPSB0aGlzO1xuXHRcdFxuXHRcdHZtLmN1c3RvbWVyID0gY3VzdG9tZXJTZXJ2aWNlLmdldEN1c3RvbWVyKCk7XG5cdFx0Y29uc29sZS5sb2coJ3ZtLmN1c3RvbWVyOiAnLCB2bS5jdXN0b21lciwgdm0uY3VzdG9tZXIuYmFsYW5jZSk7XG5cblx0XHR2bS5yZXF1aXJlZEFtb3VudCA9IDIwO1xuXHRcdHZtLmlzRW5vdWdoID0gZmFsc2U7XG5cdFx0dm0uY2FydCA9IGFuZ3VsYXIuZXh0ZW5kKCBbXSwgY2FydFNlcnZpY2UuZ2V0QWxsKCkgKTtcblx0XHR2bS5wYXltZW50TWV0aG9kcyA9IFtcblx0XHRcdHtcblx0XHRcdFx0aWQ6IDEsXG5cdFx0XHRcdGljb246ICdmYSBmYS1jcmVkaXQtY2FyZCcsXG5cdFx0XHRcdG5hbWU6ICdDcmVkaXQgQ2FyZCdcblx0XHRcdH0sXG5cdFx0XHQvLyB7XG5cdFx0XHQvLyBcdGlkOiAyLFxuXHRcdFx0Ly8gXHRpY29uOiAnZmEgZmEtcGF5cGFsJyxcblx0XHRcdC8vIFx0bmFtZTogJ1BheVBhbCcsXG5cdFx0XHQvLyBcdGNvbWluZ1Nvb246IHRydWVcblx0XHRcdC8vIH0sXG5cdFx0XHQvLyB7XG5cdFx0XHQvLyBcdGlkOiAzLFxuXHRcdFx0Ly8gXHRpY29uOiAnZmEgZmEtYml0Y29pbicsXG5cdFx0XHQvLyBcdG5hbWU6ICdCaXRjb2luJyxcblx0XHRcdC8vIFx0Y29taW5nU29vbjogdHJ1ZVxuXHRcdFx0Ly8gfSxcblx0XHRcdHtcblx0XHRcdFx0aWQ6IDAsXG5cdFx0XHRcdG5hbWU6ICdSaW5nb3RlbCBCYWxhbmNlJ1xuXHRcdFx0fVxuXHRcdF07XG5cdFx0dm0uc2VsZWN0TWV0aG9kID0gc2VsZWN0TWV0aG9kO1xuXHRcdHZtLnByb2NlZWRQYXltZW50ID0gcHJvY2VlZFBheW1lbnQ7XG5cdFx0dm0ucmVtb3ZlQ2FydEl0ZW0gPSByZW1vdmVDYXJ0SXRlbTtcblx0XHR2bS5jYW5jZWwgPSBjYW5jZWw7XG5cdFx0aWYodm0uY2FydC5sZW5ndGggJiYgdm0uY3VzdG9tZXIuYmFsYW5jZSA8IDApIGFkZERlYnRBbW91dCgpO1xuXHRcdHZtLmFtb3VudCA9IGNvdXRBbW91bnQodm0uY2FydCk7XG5cdFx0dm0ucGF5bWVudE1ldGhvZCA9IHZtLmFtb3VudCA+IDAgPyAxIDogMDtcblx0XHR2bS5pc1Vuc2VsZWN0YWJsZU1ldGhvZCA9IGlzVW5zZWxlY3RhYmxlTWV0aG9kO1xuXG5cblx0XHQkcm9vdFNjb3BlLiRvbignY3VzdG9tZXIudXBkYXRlJywgZnVuY3Rpb24oZXZlbnQsIGN1c3RvbWVyKSB7XG5cdFx0XHR2bS5jdXN0b21lciA9IGN1c3RvbWVyO1xuXHRcdFx0aXNFbm91Z2goKTtcblx0XHR9KTtcblxuXHRcdCRzY29wZS4kd2F0Y2goZnVuY3Rpb24oKXtcblx0XHRcdHJldHVybiB2bS5jYXJ0Lmxlbmd0aDtcblx0XHR9LCBmdW5jdGlvbih2YWwpe1xuXHRcdFx0dmFyIHJlcUFtb3VudCA9IGNvdXRBbW91bnQodm0uY2FydCk7XG5cdFx0XHR2bS5hbW91bnQgPSByZXFBbW91bnQ7XG5cdFx0XHRpZih2YWwpIHZtLnJlcXVpcmVkQW1vdW50ID0gcmVxQW1vdW50O1xuXHRcdH0pO1xuXG5cdFx0JHNjb3BlLiR3YXRjaChmdW5jdGlvbigpe1xuXHRcdFx0cmV0dXJuIHZtLmFtb3VudDtcblx0XHR9LCBmdW5jdGlvbih2YWwpe1xuXHRcdFx0dm0uYW1vdW50ID0gdmFsO1xuXHRcdFx0aXNFbm91Z2goKTtcblx0XHRcdC8vIHJlcXVpcmVkQW1vdW50ID0gdmFsO1xuXHRcdFx0Ly8gaWYodm0uY3VzdG9tZXIuYmFsYW5jZSA8IHJlcXVpcmVkQW1vdW50IHx8ICghdmFsICYmICF2bS5jYXJ0Lmxlbmd0aCkpIHZtLmlzRW5vdWdoID0gZmFsc2U7XG5cdFx0XHQvLyBlbHNlIHZtLmlzRW5vdWdoID0gdHJ1ZTtcblx0XHR9KTtcblxuXHRcdGZ1bmN0aW9uIGlzRW5vdWdoKCkge1xuXHRcdFx0aWYoKCF2bS5hbW91bnQgJiYgIXZtLmNhcnQubGVuZ3RoKSB8fCB2bS5hbW91bnQgPCB2bS5yZXF1aXJlZEFtb3VudCkgdm0uaXNFbm91Z2ggPSBmYWxzZTtcblx0XHRcdGVsc2Ugdm0uaXNFbm91Z2ggPSB0cnVlO1xuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIGlzVW5zZWxlY3RhYmxlTWV0aG9kKG1ldGhvZE9iaikge1xuXHRcdFx0cmV0dXJuIChtZXRob2RPYmouaWQgPT09IDAgJiYgKHZtLmN1c3RvbWVyLmJhbGFuY2UgPCB2bS5hbW91bnQgfHwgIXZtLmNhcnQubGVuZ3RoKSB8fCBtZXRob2RPYmouaWQgIT09IDAgJiYgIXZtLmFtb3VudCk7XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gcHJvY2VlZFBheW1lbnQoKSB7XG5cblx0XHRcdGlmKHZtLnBheW1lbnRNZXRob2QgPT09IHVuZGVmaW5lZClcblx0XHRcdFx0cmV0dXJuIGVycm9yU2VydmljZS5zaG93KCdDSE9PU0VfUEFZTUVOVF9NRVRIT0QnKTtcblx0XHRcdGlmKHZtLmFtb3VudCA9PT0gdW5kZWZpbmVkIHx8IHZtLmFtb3VudCA9PT0gbnVsbCB8fCB2bS5hbW91bnQgPCAwKVxuXHRcdFx0XHRyZXR1cm4gZXJyb3JTZXJ2aWNlLnNob3coJ0FNT1VOVF9OT1RfU0VUJyk7XG5cblx0XHRcdC8vIHNwaW5uZXJTZXJ2aWNlLnNob3coJ21haW4tc3Bpbm5lcicpO1xuXG5cdFx0XHR2YXIgb3JkZXIgPSB2bS5jYXJ0Lmxlbmd0aCA/IHZtLmNhcnQgOiBbe1xuXHRcdFx0XHRhY3Rpb246ICdhZGRDcmVkaXRzJyxcblx0XHRcdFx0ZGVzY3JpcHRpb246ICdSaW5nb3RlbCBTZXJ2aWNlIFBheW1lbnQnLFxuXHRcdFx0XHRhbW91bnQ6IHZtLmFtb3VudFxuXHRcdFx0fV07XG5cblx0XHRcdHZhciByZXF1ZXN0UGFyYW1zID0ge1xuXHRcdFx0XHR1cmw6ICdjaGVja291dCcsXG5cdFx0XHRcdHBhcmFtczoge1xuXHRcdFx0XHRcdHBheW1lbnRNZXRob2Q6IHZtLnBheW1lbnRNZXRob2QsXG5cdFx0XHRcdFx0YW1vdW50OiB2bS5hbW91bnQsXG5cdFx0XHRcdFx0b3JkZXI6IG9yZGVyXG5cdFx0XHRcdH1cblx0XHRcdH07XG5cblx0XHRcdGFwaS5yZXF1ZXN0KHJlcXVlc3RQYXJhbXMpLnRoZW4oZnVuY3Rpb24ocmVzKXtcblx0XHRcdFx0aWYocmVzLmRhdGEucmVkaXJlY3QpIHtcblx0XHRcdFx0XHR3aW5kb3cubG9jYXRpb24uaHJlZiA9IHJlcy5kYXRhLnJlZGlyZWN0O1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdGlmKHJlcy5kYXRhLnN1Y2Nlc3MpIHtcblx0XHRcdFx0XHRcdG5vdGlmeVNlcnZpY2Uuc2hvdygnQUxMX0NIQU5HRVNfU0FWRUQnKTtcblxuXHRcdFx0XHRcdFx0Ly8gdXBkYXRlIGNhY2hlXG5cdFx0XHRcdFx0XHR2bS5jYXJ0LmZvckVhY2goZnVuY3Rpb24oaXRlbSl7XG5cdFx0XHRcdFx0XHRcdGlmKGl0ZW0uYWN0aW9uID09PSAnY3JlYXRlU3Vic2NyaXB0aW9uJykge1xuXHRcdFx0XHRcdFx0XHRcdGJyYW5jaGVzU2VydmljZS5zZXQoW10pO1xuXHRcdFx0XHRcdFx0XHR9IGVsc2UgaWYoaXRlbS5hY3Rpb24gPT09ICd1cGRhdGVTdWJzY3JpcHRpb24nKSB7XG5cdFx0XHRcdFx0XHRcdFx0YnJhbmNoZXNTZXJ2aWNlLnVwZGF0ZShpdGVtLmRhdGEub2lkLCBpdGVtLmRhdGEpO1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9KTtcblxuXHRcdFx0XHRcdFx0JGxvY2F0aW9uLnBhdGgoJy9kYXNoYm9hcmQnKTsgLy9UT0RPXG5cblx0XHRcdFx0XHRcdGNhcnRTZXJ2aWNlLmNsZWFyKCk7XG5cblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0ZXJyb3JTZXJ2aWNlLnNob3cocmVzLmRhdGEubWVzc2FnZSk7XG5cdFx0XHRcdFx0fVx0XHRcdFx0XHRcblx0XHRcdFx0fVxuXHRcdFx0XHQvLyBzcGlubmVyU2VydmljZS5oaWRlKCdtYWluLXNwaW5uZXInKTtcblx0XHRcdH0sIGZ1bmN0aW9uKGVycil7XG5cdFx0XHRcdGVycm9yU2VydmljZS5zaG93KGVycik7XG5cdFx0XHRcdC8vIHNwaW5uZXJTZXJ2aWNlLmhpZGUoJ21haW4tc3Bpbm5lcicpO1xuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gc2VsZWN0TWV0aG9kKG1ldGhvZCkge1xuXHRcdFx0dm0ucGF5bWVudE1ldGhvZCA9IG1ldGhvZDtcblx0XHR9XG5cblx0XHRmdW5jdGlvbiBjb3V0QW1vdW50KGFycmF5KSB7XG5cdFx0XHQvL1RPRE8gLSBjb3VudCBtaW4gYW1vdW50IGJhc2VkIG9uIHRoZSBjdXJyZW5jeVxuXHRcdFx0dmFyIGFtb3VudCA9IGFycmF5Lmxlbmd0aCA/IDAgOiB2bS5yZXF1aXJlZEFtb3VudDtcblx0XHRcdGFycmF5LmZvckVhY2goZnVuY3Rpb24gKGl0ZW0pe1xuXHRcdFx0XHRhbW91bnQgKz0gcGFyc2VGbG9hdChpdGVtLmFtb3VudCk7XG5cdFx0XHR9KTtcblx0XHRcdHJldHVybiBhbW91bnQ7XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gYWRkRGVidEFtb3V0KCkge1xuXHRcdFx0dm0uY2FydC5wdXNoKHtcblx0XHRcdFx0ZWRpdDogZmFsc2UsXG5cdFx0XHRcdHJlbW92ZTogZmFsc2UsXG5cdFx0XHRcdGFjdGlvbjogJ2FkZENyZWRpdHMnLFxuXHRcdFx0XHRkZXNjcmlwdGlvbjogJ1JpbmdvdGVsIFNlcnZpY2UgUGF5bWVudCcsXG5cdFx0XHRcdGFtb3VudDogKHZtLmN1c3RvbWVyLmJhbGFuY2UgKiAtMSlcblx0XHRcdH0pO1xuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIHJlbW92ZUNhcnRJdGVtKGluZGV4KSB7XG5cdFx0XHR2bS5jYXJ0LnNwbGljZShpbmRleCwgMSlcblx0XHRcdGNhcnRTZXJ2aWNlLnJlbW92ZShpbmRleCk7XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gY2FuY2VsKCkge1xuXHRcdFx0JGxvY2F0aW9uLnBhdGgoJy9kYXNoYm9hcmQnKTtcblx0XHR9XG5cblx0fVxuXG59KSgpOyIsImFuZ3VsYXIubW9kdWxlKCdhcHAucGF5bWVudCcpXG4uY29uZmlnKFsnJHJvdXRlUHJvdmlkZXInLCBmdW5jdGlvbigkcm91dGVQcm92aWRlcil7XG5cblx0JHJvdXRlUHJvdmlkZXJcblx0XHQud2hlbignL3BheW1lbnQnLCB7XG5cdFx0XHR0ZW1wbGF0ZVVybDogJ3BheW1lbnQvcGF5bWVudC5odG1sJyxcblx0XHRcdGNvbnRyb2xsZXI6ICdQYXltZW50Q29udHJvbGxlcicsXG5cdFx0XHRjb250cm9sbGVyQXM6ICdwYXlWbScsXG5cdFx0XHRyZXNvbHZlOiB7XG5cdFx0XHRcdGxvZ2dlZGluOiBpc0F1dGhvcml6ZWRcblx0XHRcdH1cblx0XHR9KTtcblxufV0pO1xuXG5pc0F1dGhvcml6ZWQuJGluamVjdCA9IFsnYXV0aFNlcnZpY2UnXTtcbmZ1bmN0aW9uIGlzQXV0aG9yaXplZChhdXRoU2VydmljZSkge1xuXHRyZXR1cm4gYXV0aFNlcnZpY2UuaXNBdXRob3JpemVkKCk7XG59IiwiKGZ1bmN0aW9uKCl7XG5cblx0J3VzZSBzdHJpY3QnO1xuXG5cdGFuZ3VsYXJcblx0XHQubW9kdWxlKCdhcHAuY29yZScpXG5cdFx0LmZhY3RvcnkoJ2FwaVNlcnZpY2UnLCBhcGlTZXJ2aWNlKTtcblxuXHRhcGlTZXJ2aWNlLiRpbmplY3QgPSBbJyRodHRwJywgJ2FwcENvbmZpZyddO1xuXG5cdGZ1bmN0aW9uIGFwaVNlcnZpY2UoJGh0dHAsIGFwcENvbmZpZyl7XG5cblx0XHR2YXIgYmFzZVVybCA9IGFwcENvbmZpZy5zZXJ2ZXIgKyAnL3Jlc2VsbGVyL2FwaSc7XG5cdFx0cmV0dXJuIHtcblx0XHRcdHJlcXVlc3Q6IGZ1bmN0aW9uKHBhcmFtcyl7XG5cdFx0XHRcdHJldHVybiAkaHR0cC5wb3N0KGJhc2VVcmwrJy8nK3BhcmFtcy51cmwsIChwYXJhbXMucGFyYW1zIHx8IHt9KSk7XG5cdFx0XHR9XG5cdFx0fTtcblxuXHR9XG5cbn0pKCk7IiwiKGZ1bmN0aW9uKCl7XG5cblx0J3VzZSBzdHJpY3QnO1xuXG5cdGFuZ3VsYXJcblx0XHQubW9kdWxlKCdhcHAnKVxuXHRcdC5mYWN0b3J5KCdhdXRoU2VydmljZScsIGF1dGhTZXJ2aWNlKTtcblxuXHRhdXRoU2VydmljZS4kaW5qZWN0ID0gWyckcScsICckdGltZW91dCcsICckbG9jYXRpb24nLCAnJHJvb3RTY29wZScsICckaHR0cCcsICckbG9jYWxTdG9yYWdlJywgJ2FwcENvbmZpZycsICdjdXN0b21lclNlcnZpY2UnXTtcblxuXHRmdW5jdGlvbiBhdXRoU2VydmljZSgkcSwgJHRpbWVvdXQsICRsb2NhdGlvbiwgJHJvb3RTY29wZSwgJGh0dHAsICRsb2NhbFN0b3JhZ2UsIGFwcENvbmZpZywgY3VzdG9tZXJTZXJ2aWNlKXtcblxuXHRcdHZhciBiYXNlVXJsID0gYXBwQ29uZmlnLnNlcnZlcjtcblx0XHR2YXIgaW5pdCA9IGZhbHNlO1xuXG5cdFx0cmV0dXJuIHtcblx0XHRcdHNpZ251cDogc2lnbnVwLFxuXHRcdFx0bG9naW46IGxvZ2luLFxuXHRcdFx0cmVxdWVzdFBhc3N3b3JkUmVzZXQ6IHJlcXVlc3RQYXNzd29yZFJlc2V0LFxuXHRcdFx0cmVzZXRQYXNzd29yZDogcmVzZXRQYXNzd29yZCxcblx0XHRcdGlzTG9nZ2VkSW46IGlzTG9nZ2VkSW4sXG5cdFx0XHRsb2dvdXQ6IGxvZ291dCxcblx0XHRcdGlzQXV0aG9yaXplZDogaXNBdXRob3JpemVkXG5cdFx0fTtcblxuXHRcdGZ1bmN0aW9uIHNpZ251cChkYXRhKSB7XG5cdFx0XHRyZXR1cm4gJGh0dHAucG9zdChiYXNlVXJsICsgJy9yZXNlbGxlci9hcGkvc2lnbnVwJywgZGF0YSk7XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gbG9naW4oZGF0YSkge1xuXHRcdFx0cmV0dXJuICRodHRwLnBvc3QoYmFzZVVybCArICcvcmVzZWxsZXIvYXBpL2xvZ2luJywgZGF0YSk7XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gcmVxdWVzdFBhc3N3b3JkUmVzZXQoZGF0YSkge1xuXHRcdFx0cmV0dXJuICAkaHR0cC5wb3N0KGJhc2VVcmwgKyAnL3Jlc2VsbGVyL2FwaS9yZXF1ZXN0UGFzc3dvcmRSZXNldCcsIGRhdGEpO1xuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIHJlc2V0UGFzc3dvcmQoZGF0YSkge1xuXHRcdFx0cmV0dXJuICRodHRwLnBvc3QoYmFzZVVybCArICcvcmVzZWxsZXIvYXBpL3Jlc2V0UGFzc3dvcmQnLCBkYXRhKTtcblx0XHR9XG5cblx0XHRmdW5jdGlvbiBsb2dvdXQoKSB7XG5cdFx0XHRkZWxldGUgJGxvY2FsU3RvcmFnZS50b2tlbjtcblxuXHRcdFx0Ly8gQ2xlYXIgYXV0aG9yaXplZCBjdXN0b21lciBkYXRhXG5cdFx0XHRjdXN0b21lclNlcnZpY2UuY2xlYXJDdXJyZW50Q3VzdG9tZXIoKTtcblxuXHRcdFx0Ly8gRW1pdCBldmVudCB3aGVuIGN1c3RvbWVyIGxvZ2dlZCBvdXQgdG8gdGhlIGNvbnNvbGVcblx0XHRcdCRyb290U2NvcGUuJGVtaXQoJ2F1dGgubG9nb3V0Jyk7XG5cblx0XHRcdGluaXQgPSBmYWxzZTtcblxuXHRcdFx0JGxvY2F0aW9uLnBhdGgoJy9sb2dpbicpO1xuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIGlzTG9nZ2VkSW4oKXtcblx0XHRcdHJldHVybiBpbml0O1xuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIGxvZ2dlZEluKGRhdGEpIHtcblx0XHRcdGNvbnNvbGUubG9nKCdsb2dnZWRJbjogJywgZGF0YSk7XG5cdFx0XHQvLyBTZXQgYXV0aG9yaXplZCBjdXN0b21lciBkYXRhXG5cdFx0XHRpZihkYXRhLmN1c3RvbWVyKSB7XG5cdFx0XHRcdGN1c3RvbWVyU2VydmljZS5zZXRDdXN0b21lcihkYXRhLmN1c3RvbWVyKTtcblx0XG5cdFx0XHRcdC8vIEVtaXQgZXZlbnQgd2hlbiBjdXN0b21lciBkYXRhIHVwZGF0ZWRcblx0XHRcdFx0JHJvb3RTY29wZS4kZW1pdCgnY3VzdG9tZXIudXBkYXRlJywgZGF0YS5jdXN0b21lcik7XG5cdFx0XHR9XG5cblxuXHRcdFx0aWYoIWluaXQpIHtcblx0XHRcdFx0Ly8gRW1pdCBldmVudCB3aGVuIGN1c3RvbWVyIGxvZ2dlZCBpbiB0byB0aGUgY29uc29sZVxuXHRcdFx0XHQkcm9vdFNjb3BlLiRlbWl0KCdhdXRoLmxvZ2luJyk7XG5cdFx0XHRcdGluaXQgPSB0cnVlO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIGlzQXV0aG9yaXplZCgpIHtcblx0XHRcdGlmKGN1c3RvbWVyU2VydmljZS5nZXRDdXN0b21lcigpKSByZXR1cm47XG5cblx0XHRcdHZhciBkZWZlcnJlZCA9ICRxLmRlZmVyKCk7IC8vIE1ha2UgYW4gQUpBWCBjYWxsIHRvIGNoZWNrIGlmIHRoZSB1c2VyIGlzIGxvZ2dlZCBpbiBcblx0XHRcdCRodHRwLmdldCgnL3Jlc2VsbGVyL2FwaS9sb2dnZWRpbicpLnRoZW4oZnVuY3Rpb24ocmVzKXtcblx0XHRcdFx0bG9nZ2VkSW4ocmVzLmRhdGEpO1xuXHRcdFx0XHRkZWZlcnJlZC5yZXNvbHZlKCk7XG5cdFx0XHR9LCBmdW5jdGlvbiAoZXJyKXtcblx0XHRcdFx0ZGVmZXJyZWQucmVqZWN0KCk7XG5cdFx0XHRcdGxvZ291dCgpO1xuXHRcdFx0XHQvLyAkbG9jYXRpb24ucGF0aCgnL2xvZ2luJyk7XG5cdFx0XHR9KTtcblx0XHRcdHJldHVybiBkZWZlcnJlZC5wcm9taXNlO1xuXHRcdH1cblxuXHR9XG5cbn0pKCk7IiwiKGZ1bmN0aW9uKCl7XG5cblx0J3VzZSBzdHJpY3QnO1xuXG5cdGFuZ3VsYXJcblx0XHQubW9kdWxlKCdhcHAuY29yZScpXG5cdFx0LmZhY3RvcnkoJ2JyYW5jaGVzU2VydmljZScsIGJyYW5jaGVzU2VydmljZSk7XG5cblx0YnJhbmNoZXNTZXJ2aWNlLiRpbmplY3QgPSBbJ3Bvb2xTaXplU2VydmljZXMnLCAnYXBpU2VydmljZSddO1xuXG5cdGZ1bmN0aW9uIGJyYW5jaGVzU2VydmljZShwb29sU2l6ZVNlcnZpY2VzLCBhcGkpe1xuXG5cdFx0dmFyIGJyYW5jaGVzID0gW107XG5cdFx0dmFyIHBsYW5zID0gW107XG5cdFx0dmFyIHNlcnZlcnMgPSBbXTtcblxuXHRcdHJldHVybiB7XG5cdFx0XHRhZGQ6IGFkZCxcblx0XHRcdHNldDogc2V0LFxuXHRcdFx0dXBkYXRlOiB1cGRhdGUsXG5cdFx0XHRnZXQ6IGdldCxcblx0XHRcdGdldEFsbDogZ2V0QWxsLFxuXHRcdFx0Z2V0QWxsQWRkb25zOiBnZXRBbGxBZGRvbnMsXG5cdFx0XHRyZW1vdmU6IHJlbW92ZSxcblx0XHRcdHNldFBsYW5zOiBzZXRQbGFucyxcblx0XHRcdHNldFNlcnZlcnM6IHNldFNlcnZlcnMsXG5cdFx0XHRnZXRQbGFuczogZ2V0UGxhbnMsXG5cdFx0XHRnZXRTZXJ2ZXJzOiBnZXRTZXJ2ZXJzLFxuXHRcdFx0Y2xlYXI6IGNsZWFyLFxuXHRcdFx0aXNQcmVmaXhWYWxpZDogaXNQcmVmaXhWYWxpZCxcblx0XHRcdGlzUHJlZml4VW5pcXVlOiBpc1ByZWZpeFVuaXF1ZSxcblx0XHRcdGdldFN1YnNjcmlwdGlvbkFtb3VudDogZ2V0U3Vic2NyaXB0aW9uQW1vdW50XG5cdFx0fTtcblxuXHRcdGZ1bmN0aW9uIGFkZChpdGVtKSB7XG5cdFx0XHRpZihhbmd1bGFyLmlzQXJyYXkoaXRlbSkpIHtcblx0XHRcdFx0YW5ndWxhci5jb3B5KGl0ZW0sIGJyYW5jaGVzKTtcblx0XHRcdFx0Ly8gYnJhbmNoZXMgPSBicmFuY2hlcy5jb25jYXQoaXRlbSk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRkZWxldGUgaXRlbS5hZG1pbnBhc3M7XG5cdFx0XHRcdGJyYW5jaGVzLnB1c2goaXRlbSk7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gc2V0KGFycmF5KSB7XG5cdFx0XHRpZihBcnJheS5pc0FycmF5KGFycmF5KSkgYnJhbmNoZXMgPSBhcnJheTtcblx0XHR9XG5cblx0XHRmdW5jdGlvbiB1cGRhdGUob2lkLCBkYXRhKXtcblx0XHRcdGNvbnNvbGUubG9nKCd1cGRhdGUgYnJhbmNoOiAnLCBvaWQsIGRhdGEpO1xuXHRcdFx0aWYoIW9pZCkgcmV0dXJuO1xuXHRcdFx0YnJhbmNoZXMuZm9yRWFjaChmdW5jdGlvbihpdGVtLCBpbmRleCwgYXJyYXkpe1xuXHRcdFx0XHRpZihpdGVtLm9pZCA9PT0gb2lkKSB7XG5cdFx0XHRcdFx0ZGVsZXRlIGl0ZW0uYWRtaW5wYXNzO1xuXHRcdFx0XHRcdGFuZ3VsYXIubWVyZ2UoaXRlbSwgZGF0YSk7XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIGdldChvaWQsIGNiKSB7XG5cdFx0XHR2YXIgZm91bmQgPSBudWxsO1xuXHRcdFx0YnJhbmNoZXMuZm9yRWFjaChmdW5jdGlvbiAoYnJhbmNoKXtcblx0XHRcdFx0aWYoYnJhbmNoLm9pZCA9PT0gb2lkKXtcblx0XHRcdFx0XHRmb3VuZCA9IGJyYW5jaDtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0XHRpZihjYikgY2IoZm91bmQpO1xuXHRcdFx0ZWxzZSByZXR1cm4gZm91bmQ7XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gZ2V0QWxsKCkge1xuXHRcdFx0cmV0dXJuIGJyYW5jaGVzO1xuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIGdldEFsbEFkZG9ucyhwYXJhbXMpIHtcblx0XHRcdHZhciBhZGRPbnMgPSBbXTtcblx0XHRcdGlmKHBhcmFtcy5leHRlbnNpb25zICE9PSB1bmRlZmluZWQpe1xuXHRcdFx0XHR2YXIgcG9vbHNpemUgPSBwb29sU2l6ZVNlcnZpY2VzLmdldFBvb2xTaXplKHBhcmFtcy5leHRlbnNpb25zKTtcblx0XHRcdFx0YWRkT25zLnB1c2goe1xuXHRcdFx0XHRcdG5hbWU6IFwiVXNlclwiLFxuXHRcdFx0XHRcdHF1YW50aXR5OiBwb29sc2l6ZVxuXHRcdFx0XHR9KTtcblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIGFkZE9ucztcblx0XHR9XG5cblx0XHRmdW5jdGlvbiByZW1vdmUob2lkKSB7XG5cdFx0XHRicmFuY2hlcy5mb3JFYWNoKGZ1bmN0aW9uKGl0ZW0sIGluZGV4LCBhcnJheSl7XG5cdFx0XHRcdGlmKGl0ZW0ub2lkICYmIGl0ZW0ub2lkID09PSBvaWQpIHtcblx0XHRcdFx0XHRhcnJheS5zcGxpY2UoaW5kZXgsIDEpO1xuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblx0XHR9XG5cblx0XHRmdW5jdGlvbiBzZXRQbGFucyhhcnJheSl7XG5cdFx0XHRwbGFucyA9IGFycmF5O1xuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIGdldFBsYW5zKCl7XG5cdFx0XHRyZXR1cm4gcGxhbnM7XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gc2V0U2VydmVycyhhcnJheSl7XG5cdFx0XHRzZXJ2ZXJzID0gYXJyYXk7XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gZ2V0U2VydmVycygpe1xuXHRcdFx0cmV0dXJuIHNlcnZlcnM7XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gY2xlYXIoKSB7XG5cdFx0XHRicmFuY2hlcyA9IFtdO1xuXHRcdFx0cGxhbnMgPSBbXTtcblx0XHRcdHNlcnZlcnMgPSBbXTtcblx0XHR9XG5cblx0XHRmdW5jdGlvbiBpc1ByZWZpeFZhbGlkKHByZWZpeCkge1xuXHRcdFx0XG5cdFx0XHR2YXIgcmVnZXggPSAvXlthLXpBLVowLTldW2EtekEtWjAtOS1dezEsNjJ9W2EtekEtWjAtOV0kL2c7XG5cdFx0XHRyZXR1cm4gcHJlZml4Lm1hdGNoKHJlZ2V4KTtcblxuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIGlzUHJlZml4VW5pcXVlKHByZWZpeCkge1xuXHRcdFx0cmV0dXJuIGFwaS5yZXF1ZXN0KHtcblx0XHRcdCAgICB1cmw6ICdpc1ByZWZpeFZhbGlkJyxcblx0XHRcdCAgICBwYXJhbXM6IHtcblx0XHRcdCAgICAgICAgcHJlZml4OiBwcmVmaXhcblx0XHRcdCAgICB9XG5cdFx0XHR9KTtcblx0XHR9XG5cblx0XHRmdW5jdGlvbiBnZXRTdWJzY3JpcHRpb25BbW91bnQocGFyYW1zLCBjYikge1xuXG5cdFx0XHRhcGkucmVxdWVzdCh7XG5cdFx0XHRcdHVybDogJy9nZXRTdWJzY3JpcHRpb25BbW91bnQnLFxuXHRcdFx0XHRwYXJhbXM6IHBhcmFtc1xuXHRcdFx0fSkudGhlbihmdW5jdGlvbihyZXN1bHQpe1xuXHRcdFx0XHRjYihudWxsLCByZXN1bHQuZGF0YSk7XG5cdFx0XHR9LCBmdW5jdGlvbihlcnIpe1xuXHRcdFx0XHRjYihlcnIpO1xuXHRcdFx0fSk7XG5cblx0XHR9XG5cblx0fVxuXG59KSgpOyIsIihmdW5jdGlvbigpe1xuXG5cdCd1c2Ugc3RyaWN0JztcblxuXHRhbmd1bGFyXG5cdFx0Lm1vZHVsZSgnYXBwLmNvcmUnKVxuXHRcdC5mYWN0b3J5KCdjYXJ0U2VydmljZScsIGNhcnRTZXJ2aWNlKTtcblxuXHRjYXJ0U2VydmljZS4kaW5qZWN0ID0gWyckcm9vdFNjb3BlJywgJ2N1c3RvbWVyU2VydmljZSddO1xuXG5cdGZ1bmN0aW9uIGNhcnRTZXJ2aWNlKCRyb290U2NvcGUsIGN1c3RvbWVyU2VydmljZSkge1xuXG5cdFx0dmFyIGl0ZW1zID0gW107XG5cdFx0cmV0dXJuIHtcblx0XHRcdGFkZDogYWRkLFxuXHRcdFx0dXBkYXRlOiB1cGRhdGUsXG5cdFx0XHRnZXQ6IGdldCxcblx0XHRcdHNldDogc2V0LFxuXHRcdFx0cmVtb3ZlOiByZW1vdmUsXG5cdFx0XHRnZXRBbGw6IGdldEFsbCxcblx0XHRcdGNsZWFyOiBjbGVhclxuXHRcdH07XG5cblx0XHRmdW5jdGlvbiBuZXdJdGVtKHBhcmFtcykge1xuXHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0ZWRpdDogcGFyYW1zLmVkaXQgIT09IHVuZGVmaW5lZCA/IHBhcmFtcy5lZGl0IDogdHJ1ZSxcblx0XHRcdFx0cmVtb3ZlOiBwYXJhbXMucmVtb3ZlICE9PSB1bmRlZmluZWQgPyBwYXJhbXMucmVtb3ZlIDogdHJ1ZSxcblx0XHRcdFx0YWN0aW9uOiBwYXJhbXMuYWN0aW9uLFxuXHRcdFx0XHRkZXNjcmlwdGlvbjogcGFyYW1zLmRlc2NyaXB0aW9uLFxuXHRcdFx0XHRhbW91bnQ6IHBhcmFtcy5hbW91bnQsXG5cdFx0XHRcdGN1cnJlbmN5OiBjdXN0b21lclNlcnZpY2UuZ2V0Q3VzdG9tZXIoKS5jdXJyZW5jeSxcblx0XHRcdFx0ZGF0YTogcGFyYW1zLmRhdGFcblx0XHRcdH07XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gYWRkKHBhcmFtcykge1xuXHRcdFx0Ly8gaXRlbXMgPSBbXTsgLy9jb21tZW50IHRoaXMgbGluZSB0byBjb2xsZWN0IGl0ZW1zIGluIHRoZSBjYXJ0LCByYXRoZXIgdGhhbiBzdWJzdGl0dXRlXG5cdFx0XHRpdGVtcy5wdXNoKG5ld0l0ZW0ocGFyYW1zKSk7XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gc2V0KHBhcmFtcywgaW5kZXgpIHtcblx0XHRcdGluZGV4ID8gcmVtb3ZlKGluZGV4KSA6IGNsZWFyKCk7XG5cdFx0XHRpbmRleCA/IGl0ZW1zW2luZGV4XSA9IG5ld0l0ZW0ocGFyYW1zKSA6IGl0ZW1zLnB1c2gobmV3SXRlbShwYXJhbXMpKTtcblx0XHR9XG5cblx0XHRmdW5jdGlvbiByZW1vdmUoaW5kZXgpIHtcblx0XHRcdGl0ZW1zLnNwbGljZShpbmRleCwgMSk7XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gdXBkYXRlKHByZWZpeCwgcGFyYW1zKSB7XG5cdFx0XHR2YXIgaXRlbSA9IGl0ZW1zLmZvckVhY2goZnVuY3Rpb24oaXRlbSwgaW5kZXgsIGFycmF5KSB7XG5cdFx0XHRcdGlmKGl0ZW0uZGF0YS5yZXN1bHQucHJlZml4ID09PSBwcmVmaXgpIGFycmF5W2luZGV4XSA9IHBhcmFtcztcblx0XHRcdH0pO1xuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIGdldChwcmVmaXgpIHtcblx0XHRcdHZhciBmb3VuZDtcblx0XHRcdGl0ZW1zLmZvckVhY2goZnVuY3Rpb24oaXRlbSkge1xuXHRcdFx0XHRpZihpdGVtLmRhdGEucmVzdWx0LnByZWZpeCA9PT0gcHJlZml4KSBmb3VuZCA9IGl0ZW07XG5cdFx0XHR9KTtcblx0XHRcdHJldHVybiBmb3VuZDtcblx0XHR9XG5cblx0XHRmdW5jdGlvbiBnZXRBbGwoKSB7XG5cdFx0XHRyZXR1cm4gaXRlbXM7XG5cdFx0fVxuXHRcdFxuXHRcdGZ1bmN0aW9uIGNsZWFyKCkge1xuXHRcdFx0aXRlbXMuc3BsaWNlKDAsIGl0ZW1zLmxlbmd0aCk7XG5cdFx0fVxuXG5cdH1cblxufSkoKTsiLCIoZnVuY3Rpb24oKXtcblxuXHQndXNlIHN0cmljdCc7XG5cblx0YW5ndWxhclxuXHRcdC5tb2R1bGUoJ2FwcCcpXG5cdFx0LmZhY3RvcnkoJ2N1c3RvbWVyU2VydmljZScsIGN1c3RvbWVyU2VydmljZSk7XG5cblx0Y3VzdG9tZXJTZXJ2aWNlLiRpbmplY3QgPSBbJyRyb290U2NvcGUnXTtcblxuXHRmdW5jdGlvbiBjdXN0b21lclNlcnZpY2UoJHJvb3RTY29wZSl7XG5cblx0XHR2YXIgY3VycmVudEN1c3RvbWVyID0gbnVsbCxcblx0XHRcdGN1cnJlbnRCYWxhbmNlID0gbnVsbDtcblxuXHRcdHJldHVybiB7XG5cdFx0XHRzZXRDdXN0b21lcjogZnVuY3Rpb24ocGFyYW1zKSB7XG5cdFx0XHRcdGN1cnJlbnRDdXN0b21lciA9IGFuZ3VsYXIuZXh0ZW5kKHt9LCBwYXJhbXMpO1xuXHRcdFx0XHQkcm9vdFNjb3BlLiRlbWl0KCdjdXN0b21lci51cGRhdGUnLCBjdXJyZW50Q3VzdG9tZXIpO1xuXHRcdFx0XHRyZXR1cm4gY3VycmVudEN1c3RvbWVyO1xuXHRcdFx0fSxcblx0XHRcdGdldEN1c3RvbWVyOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0cmV0dXJuIGN1cnJlbnRDdXN0b21lcjtcblx0XHRcdH0sXG5cdFx0XHRzZXRDdXN0b21lckJhbGFuY2U6IGZ1bmN0aW9uKGJhbGFuY2UpIHtcblx0XHRcdFx0Y3VycmVudEN1c3RvbWVyID0gY3VycmVudEN1c3RvbWVyIHx8IHt9O1xuXHRcdFx0XHRjdXJyZW50Q3VzdG9tZXIuYmFsYW5jZSA9IGJhbGFuY2U7XG5cdFx0XHRcdGN1cnJlbnRCYWxhbmNlID0gYmFsYW5jZTtcblx0XHRcdFx0JHJvb3RTY29wZS4kZW1pdCgnY3VzdG9tZXIudXBkYXRlJywgY3VycmVudEN1c3RvbWVyKTtcblx0XHRcdH0sXG5cdFx0XHRnZXRDdXN0b21lckJhbGFuY2U6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRyZXR1cm4gY3VycmVudEN1c3RvbWVyLmJhbGFuY2UgfHwgY3VycmVudEJhbGFuY2U7XG5cdFx0XHR9LFxuXHRcdFx0Y2xlYXJDdXJyZW50Q3VzdG9tZXI6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRjdXJyZW50Q3VzdG9tZXIgPSBudWxsO1xuXHRcdFx0fVxuXHRcdH07XG5cblx0fVxuXG59KSgpOyIsIihmdW5jdGlvbigpe1xuXG5cdCd1c2Ugc3RyaWN0JztcblxuXHRhbmd1bGFyXG5cdFx0Lm1vZHVsZSgnYXBwJylcblx0XHQuZmFjdG9yeSgnZXJyb3JTZXJ2aWNlJywgZXJyb3JTZXJ2aWNlKTtcblxuXHRlcnJvclNlcnZpY2UuJGluamVjdCA9IFsnJHJvb3RTY29wZScsICckdHJhbnNsYXRlJywgJ25vdGlmaWNhdGlvbnMnXTtcblxuXHRmdW5jdGlvbiBlcnJvclNlcnZpY2UoJHJvb3RTY29wZSwgJHRyYW5zbGF0ZSwgbm90aWZpY2F0aW9ucyl7XG5cblx0XHRyZXR1cm4ge1xuXHRcdFx0c2hvdzogc2hvd1xuXHRcdH07XG5cblx0XHRmdW5jdGlvbiBzaG93KGVycm9yKXtcblx0XHRcdCR0cmFuc2xhdGUoJ0VSUk9SUy4nK2Vycm9yKVxuXHRcdFx0LnRoZW4oZnVuY3Rpb24gKHRyYW5zbGF0aW9uKXtcblx0XHRcdFx0aWYoJ0VSUk9SUy4nK2Vycm9yID09PSB0cmFuc2xhdGlvbikge1xuXHRcdFx0XHRcdG5vdGlmaWNhdGlvbnMuc2hvd0Vycm9yKCdFUlJPUl9PQ0NVUlJFRCcpO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdG5vdGlmaWNhdGlvbnMuc2hvd0Vycm9yKHRyYW5zbGF0aW9uKTtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdH1cblxufSkoKTsiLCIoZnVuY3Rpb24oKXtcblxuXHQndXNlIHN0cmljdCc7XG5cblx0YW5ndWxhclxuXHRcdC5tb2R1bGUoJ2FwcCcpXG5cdFx0LmZhY3RvcnkoJ25vdGlmeVNlcnZpY2UnLCBub3RpZnlTZXJ2aWNlKTtcblxuXHRub3RpZnlTZXJ2aWNlLiRpbmplY3QgPSBbJyR0cmFuc2xhdGUnLCAnbm90aWZpY2F0aW9ucyddO1xuXG5cdGZ1bmN0aW9uIG5vdGlmeVNlcnZpY2UoJHRyYW5zbGF0ZSwgbm90aWZpY2F0aW9ucyl7XG5cblx0XHRyZXR1cm4ge1xuXHRcdFx0c2hvdzogc2hvd1xuXHRcdH07XG5cblx0XHRmdW5jdGlvbiBzaG93KG5vdGlmeSl7XG5cdFx0XHQkdHJhbnNsYXRlKCdOT1RJRlkuJytub3RpZnkpXG5cdFx0XHQudGhlbihmdW5jdGlvbiAodHJhbnNsYXRpb24pe1xuXHRcdFx0XHRpZignTk9USUZZLicrbm90aWZ5ID09PSB0cmFuc2xhdGlvbikge1xuXHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRub3RpZmljYXRpb25zLnNob3dTdWNjZXNzKHRyYW5zbGF0aW9uKTtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdH1cblxufSkoKTsiLCIoZnVuY3Rpb24oKXtcblxuXHQndXNlIHN0cmljdCc7XG5cblx0YW5ndWxhclxuXHRcdC5tb2R1bGUoJ2FwcCcpXG5cdFx0LmZhY3RvcnkoJ3Bvb2xTaXplU2VydmljZXMnLCBwb29sU2l6ZVNlcnZpY2VzKTtcblxuXHRwb29sU2l6ZVNlcnZpY2VzLiRpbmplY3QgPSBbJ3V0aWxzU2VydmljZSddO1xuXG5cdGZ1bmN0aW9uIHBvb2xTaXplU2VydmljZXModXRpbHMpe1xuXG5cdFx0cmV0dXJuIHtcblx0XHRcdGdldFBvb2xTaXplOiBnZXRQb29sU2l6ZSxcblx0XHRcdHBvb2xBcnJheVRvU3RyaW5nOiBwb29sQXJyYXlUb1N0cmluZyxcblx0XHRcdHBvb2xTdHJpbmdUb09iamVjdDogcG9vbFN0cmluZ1RvT2JqZWN0XG5cdFx0fTtcblxuXHRcdGZ1bmN0aW9uIGdldFBvb2xTaXplKGFycmF5T3JTdHJpbmcpIHtcblx0XHRcdHZhciBwb29sc2l6ZSA9IDA7XG5cblx0XHRcdGlmKHV0aWxzLmlzQXJyYXkoYXJyYXlPclN0cmluZykpe1xuXHRcdFx0XHRhcnJheU9yU3RyaW5nLmZvckVhY2goZnVuY3Rpb24ob2JqLCBpbmR4LCBhcnJheSl7XG5cdFx0XHRcdFx0cG9vbHNpemUgKz0gb2JqLnBvb2xzaXplO1xuXHRcdFx0XHR9KTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGFycmF5T3JTdHJpbmdcblx0XHRcdFx0LnNwbGl0KCcsJylcblx0XHRcdFx0Lm1hcChmdW5jdGlvbihzdHIpe1xuXHRcdFx0XHRcdHJldHVybiBzdHIuc3BsaXQoJy0nKTtcblx0XHRcdFx0fSlcblx0XHRcdFx0LmZvckVhY2goZnVuY3Rpb24oYXJyYXkpe1xuXHRcdFx0XHRcdHBvb2xzaXplICs9IHBhcnNlSW50KGFycmF5WzFdID8gKGFycmF5WzFdIC0gYXJyYXlbMF0rMSkgOiAxLCAxMCk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXHRcdFx0XHRcblx0XHRcdHJldHVybiBwb29sc2l6ZTtcblx0XHR9XG5cblx0XHRmdW5jdGlvbiBwb29sQXJyYXlUb1N0cmluZyhhcnJheSkge1xuXHRcdFx0dmFyIHN0ciA9ICcnO1xuXHRcdFx0YXJyYXkuZm9yRWFjaChmdW5jdGlvbihvYmosIGluZHgsIGFycmF5KXtcblx0XHRcdFx0aWYoaW5keCA+IDApIHN0ciArPSAnLCc7XG5cdFx0XHRcdHN0ciArPSBvYmouZmlyc3RudW1iZXI7XG5cdFx0XHRcdGlmKG9iai5wb29sc2l6ZSA+IDEpIHN0ciArPSAoJy0nICsgKG9iai5maXJzdG51bWJlcitvYmoucG9vbHNpemUtMSkpO1xuXHRcdFx0fSk7XG5cdFx0XHRyZXR1cm4gc3RyO1xuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIHBvb2xTdHJpbmdUb09iamVjdChzdHJpbmcpIHtcblx0XHRcdHZhciBleHRlbnNpb25zID0gW107XG5cblx0XHRcdHN0cmluZ1xuXHRcdFx0LnJlcGxhY2UoL1xccy9nLCAnJylcblx0XHRcdC5zcGxpdCgnLCcpXG5cdFx0XHQubWFwKGZ1bmN0aW9uKHN0cil7XG5cdFx0XHRcdHJldHVybiBzdHIuc3BsaXQoJy0nKTtcblx0XHRcdH0pXG5cdFx0XHQuZm9yRWFjaChmdW5jdGlvbihhcnJheSl7XG5cdFx0XHRcdGV4dGVuc2lvbnMucHVzaCh7XG5cdFx0XHRcdFx0Zmlyc3RudW1iZXI6IHBhcnNlSW50KGFycmF5WzBdLCAxMCksXG5cdFx0XHRcdFx0cG9vbHNpemU6IHBhcnNlSW50KGFycmF5WzFdID8gKGFycmF5WzFdIC0gYXJyYXlbMF0rMSkgOiAxLCAxMClcblx0XHRcdFx0fSk7XG5cdFx0XHR9KTtcblx0XHRcdHJldHVybiBleHRlbnNpb25zO1xuXHRcdH1cblx0fVxuXG59KSgpOyIsIihmdW5jdGlvbigpe1xuXG5cdCd1c2Ugc3RyaWN0JztcblxuXHRhbmd1bGFyXG5cdFx0Lm1vZHVsZSgnYXBwLmNvcmUnKVxuXHRcdC5mYWN0b3J5KCdzcGlubmVyU2VydmljZScsIHNwaW5uZXJTZXJ2aWNlKTtcblxuXHQvLyBzcGlubmVyU2VydmljZS4kaW5qZWN0ID0gW107XG5cblx0ZnVuY3Rpb24gc3Bpbm5lclNlcnZpY2UoKXtcblxuXHRcdHZhciBzcGlubmVycyA9IHt9O1xuXHRcdHJldHVybiB7XG5cdFx0XHRfcmVnaXN0ZXI6IF9yZWdpc3Rlcixcblx0XHRcdHNob3c6IHNob3csXG5cdFx0XHRoaWRlOiBoaWRlLFxuXHRcdFx0c2hvd0FsbDogc2hvd0FsbCxcblx0XHRcdGhpZGVBbGw6IGhpZGVBbGxcblx0XHR9O1xuXHRcdFxuXHRcdGZ1bmN0aW9uIF9yZWdpc3RlcihkYXRhKSB7XG5cdFx0XHRpZiAoIWRhdGEuaGFzT3duUHJvcGVydHkoJ25hbWUnKSkge1xuXHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJTcGlubmVyIG11c3Qgc3BlY2lmeSBhIG5hbWUgd2hlbiByZWdpc3RlcmluZyB3aXRoIHRoZSBzcGlubmVyIHNlcnZpY2UuXCIpO1xuXHRcdFx0fVxuXHRcdFx0aWYgKHNwaW5uZXJzLmhhc093blByb3BlcnR5KGRhdGEubmFtZSkpIHtcblx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0XHQvLyB0aHJvdyBuZXcgRXJyb3IoXCJBIHNwaW5uZXIgd2l0aCB0aGUgbmFtZSAnXCIgKyBkYXRhLm5hbWUgKyBcIicgaGFzIGFscmVhZHkgYmVlbiByZWdpc3RlcmVkLlwiKTtcblx0XHRcdH1cblx0XHRcdHNwaW5uZXJzW2RhdGEubmFtZV0gPSBkYXRhO1xuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIHNob3cobmFtZSkge1xuXHRcdFx0dmFyIHNwaW5uZXIgPSBzcGlubmVyc1tuYW1lXTtcblx0XHRcdGlmICghc3Bpbm5lcikge1xuXHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJObyBzcGlubmVyIG5hbWVkICdcIiArIG5hbWUgKyBcIicgaXMgcmVnaXN0ZXJlZC5cIik7XG5cdFx0XHR9XG5cdFx0XHRzcGlubmVyLnNob3coKTtcblx0XHR9XG5cblx0XHRmdW5jdGlvbiBoaWRlKG5hbWUpIHtcblx0XHRcdHZhciBzcGlubmVyID0gc3Bpbm5lcnNbbmFtZV07XG5cdFx0XHRpZiAoIXNwaW5uZXIpIHtcblx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiTm8gc3Bpbm5lciBuYW1lZCAnXCIgKyBuYW1lICsgXCInIGlzIHJlZ2lzdGVyZWQuXCIpO1xuXHRcdFx0fVxuXHRcdFx0c3Bpbm5lci5oaWRlKCk7XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gc2hvd0FsbCgpIHtcblx0XHRcdGZvciAodmFyIG5hbWUgaW4gc3Bpbm5lcnMpIHtcblx0XHRcdFx0c3Bpbm5lcnNbbmFtZV0uc2hvdygpO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIGhpZGVBbGwoKSB7XG5cdFx0XHRmb3IgKHZhciBuYW1lIGluIHNwaW5uZXJzKSB7XG5cdFx0XHRcdHNwaW5uZXJzW25hbWVdLmhpZGUoKTtcblx0XHRcdH1cblx0XHR9XG5cblx0fVxuXG59KSgpOyIsIihmdW5jdGlvbigpe1xuXG5cdCd1c2Ugc3RyaWN0JztcblxuXHRhbmd1bGFyXG5cdFx0Lm1vZHVsZSgnYXBwJylcblx0XHQuZmFjdG9yeSgnc3RvcmFnZVNlcnZpY2UnLCBzdG9yYWdlU2VydmljZSk7XG5cblx0c3RvcmFnZVNlcnZpY2UuJGluamVjdCA9IFsnJGxvY2FsU3RvcmFnZSddO1xuXG5cdGZ1bmN0aW9uIHN0b3JhZ2VTZXJ2aWNlKCRsb2NhbFN0b3JhZ2Upe1xuXG5cdFx0cmV0dXJuIHtcblx0XHRcdHB1dDogZnVuY3Rpb24gKG5hbWUsIHZhbHVlKSB7XG5cdFx0XHRcdCRsb2NhbFN0b3JhZ2VbbmFtZV0gPSB2YWx1ZTtcblx0XHRcdH0sXG5cdFx0XHRnZXQ6IGZ1bmN0aW9uIChuYW1lKSB7XG5cdFx0XHRcdHJldHVybiAkbG9jYWxTdG9yYWdlW25hbWVdO1xuXHRcdFx0fVxuXHRcdH07XG5cblx0fVxuXG59KSgpOyIsIihmdW5jdGlvbigpe1xuXG5cdCd1c2Ugc3RyaWN0JztcblxuXHRhbmd1bGFyXG5cdFx0Lm1vZHVsZSgnYXBwJylcblx0XHQuZmFjdG9yeSgndXRpbHNTZXJ2aWNlJywgdXRpbHNTZXJ2aWNlKTtcblxuXHR1dGlsc1NlcnZpY2UuJGluamVjdCA9IFtcInVpYkRhdGVQYXJzZXJcIl07XG5cblx0ZnVuY3Rpb24gdXRpbHNTZXJ2aWNlKHVpYkRhdGVQYXJzZXIpe1xuXG5cdFx0cmV0dXJuIHtcblx0XHRcdGlzQXJyYXk6IGlzQXJyYXksXG5cdFx0XHRpc1N0cmluZzogaXNTdHJpbmcsXG5cdFx0XHRzdHJpbmdUb0ZpeGVkOiBzdHJpbmdUb0ZpeGVkLFxuXHRcdFx0YXJyYXlUb09iamVjdDogYXJyYXlUb09iamVjdCxcblx0XHRcdHBhcnNlRGF0ZTogcGFyc2VEYXRlLFxuXHRcdFx0Z2V0RGlmZmVyZW5jZTogZ2V0RGlmZmVyZW5jZSxcblx0XHRcdGNoZWNrUGFzc3dvcmRTdHJlbmd0aDogY2hlY2tQYXNzd29yZFN0cmVuZ3RoLFxuXHRcdFx0Z2VuZXJhdGVQYXNzd29yZDogZ2VuZXJhdGVQYXNzd29yZFxuXHRcdH07XG5cblx0XHRmdW5jdGlvbiBpc0FycmF5KG9iaikge1xuXHRcdFx0cmV0dXJuIHR5cGVvZiBvYmogPT09ICdvYmplY3QnO1xuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIGlzU3RyaW5nKG9iaikge1xuXHRcdFx0cmV0dXJuIHR5cGVvZiBvYmogPT09ICdzdHJpbmcnO1xuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIHN0cmluZ1RvRml4ZWQoc3RyaW5nLCBwb2ludCkge1xuXHRcdFx0cmV0dXJuIHBhcnNlRmxvYXQoc3RyaW5nKS50b0ZpeGVkKHBvaW50KTtcblx0XHR9XG5cblx0XHRmdW5jdGlvbiBhcnJheVRvT2JqZWN0KGFycmF5LCBrZXkpIHtcblx0XHRcdHZhciBvYmogPSB7fSwgcHJvcCA9ICcnO1xuXHRcdFx0YXJyYXkuZm9yRWFjaChmdW5jdGlvbihpdGVtKXtcblx0XHRcdFx0cHJvcCA9IGl0ZW1ba2V5XTtcblx0XHRcdFx0b2JqW3Byb3BdID0gaXRlbTtcblx0XHRcdH0pO1xuXHRcdFx0cmV0dXJuIG9iajtcblx0XHR9XG5cblx0XHRmdW5jdGlvbiBwYXJzZURhdGUoZGF0ZSwgZm9ybWF0KSB7XG5cdFx0XHRyZXR1cm4gbW9tZW50KGRhdGUpLmZvcm1hdChmb3JtYXQgfHwgJ0REIE1NTU0gWVlZWScpO1xuXHRcdFx0Ly8gcmV0dXJuIG5ldyBEYXRlKGRhdGUpLnRvTG9jYWxlRGF0ZVN0cmluZygpO1xuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIGdldERpZmZlcmVuY2UoZGF0ZTEsIGRhdGUyLCBvdXRwdXQpIHtcblx0XHRcdHJldHVybiBtb21lbnQoZGF0ZTEpLmRpZmYoZGF0ZTIsIChvdXRwdXQgPyBvdXRwdXQgOiAnJykpO1xuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIGNoZWNrUGFzc3dvcmRTdHJlbmd0aChzdHJpbmcpIHtcblx0XHRcdHZhciBzdHJvbmcgPSBuZXcgUmVnRXhwKFwiXig/PS4qW2Etel0pKD89LipbQS1aXSkoPz0uKlswLTldKSg/PS4qWyFAI1xcJCVcXF4mXFwqXSkoPz0uezEwLH0pXCIpLFxuXHRcdFx0XHRtaWRkbGUgPSBuZXcgUmVnRXhwKFwiXigoKD89LipbYS16XSkoPz0uKltBLVpdKSg/PS4qWzAtOV0pKXwoKD89LipbYS16XSkoPz0uKltBLVpdKSg/PS4qWyFAI1xcJCVcXF4mXFwqXSkpKSg/PS57OCx9KVwiKTtcblx0XHRcdGlmKHN0cm9uZy50ZXN0KHN0cmluZykpIHtcblx0XHRcdFx0cmV0dXJuIDI7XG5cdFx0XHR9IGVsc2UgaWYobWlkZGxlLnRlc3Qoc3RyaW5nKSkge1xuXHRcdFx0XHRyZXR1cm4gMTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHJldHVybiAwO1xuXHRcdFx0fVxuXHRcdH1cblxuXG5cdFx0Ly8gVE9ETzogZ2VuZXJhdGUgcGFzc3dvcmQgb24gdGhlIHNlcnZlciBzaWRlISEhXG5cdFx0ZnVuY3Rpb24gZ2VuZXJhdGVQYXNzd29yZChtaW5sZW5ndGgsIG1heGxlbmd0aCkge1xuXHRcdFx0dmFyIGNoYXJzID0gXCJhYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5eiFAJCVeJipfQUJDREVGR0hJSktMTU5PUDEyMzQ1Njc4OTBcIixcblx0XHRcdFx0cGFzc0xlbmd0aCA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIChtYXhsZW5ndGggLSBtaW5sZW5ndGgpKSArIG1pbmxlbmd0aCxcblx0XHRcdFx0cGFzcyA9IFwiXCI7XG5cdFx0XHRcblx0XHRcdGZvciAodmFyIHggPSAwOyB4IDwgcGFzc0xlbmd0aDsgeCsrKSB7XG5cdFx0XHRcdHZhciBpID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogY2hhcnMubGVuZ3RoKTtcblx0XHRcdFx0cGFzcyArPSBjaGFycy5jaGFyQXQoaSk7XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gcGFzcztcblx0XHR9XG5cblx0fVxuXG59KSgpOyIsIihmdW5jdGlvbigpe1xuXG5cdCd1c2Ugc3RyaWN0JztcblxuXHRhbmd1bGFyXG5cdFx0Lm1vZHVsZSgnYXBwLmNvcmUnKVxuXHRcdC5jb250cm9sbGVyKCdTcGlubmVyQ29udHJvbGxlcicsIFNwaW5uZXJDb250cm9sbGVyKTtcblxuXHRTcGlubmVyQ29udHJvbGxlci4kaW5qZWN0ID0gWydzcGlubmVyU2VydmljZSddO1xuXG5cdGZ1bmN0aW9uIFNwaW5uZXJDb250cm9sbGVyKHNwaW5uZXJTZXJ2aWNlKSB7XG5cblx0XHR2YXIgdm0gPSB0aGlzO1xuXG5cdFx0Ly8gRGVjbGFyZSBhIG1pbmktQVBJIHRvIGhhbmQgb2ZmIHRvIG91ciBzZXJ2aWNlIHNvIHRoZSBzZXJ2aWNlXG5cdFx0Ly8gZG9lc24ndCBoYXZlIGEgZGlyZWN0IHJlZmVyZW5jZSB0byB0aGlzIGRpcmVjdGl2ZSdzIHNjb3BlLlxuXHRcdHZhciBhcGkgPSB7XG5cdFx0XHRuYW1lOiB2bS5uYW1lLFxuXHRcdFx0Z3JvdXA6IHZtLmdyb3VwLFxuXHRcdFx0c2hvdzogZnVuY3Rpb24gKCkge1xuXHRcdFx0XHR2bS5zaG93ID0gdHJ1ZTtcblx0XHRcdH0sXG5cdFx0XHRoaWRlOiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdHZtLnNob3cgPSBmYWxzZTtcblx0XHRcdH0sXG5cdFx0XHR0b2dnbGU6IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0dm0uc2hvdyA9ICF2bS5zaG93O1xuXHRcdFx0fVxuXHRcdH07XG5cblx0XHQvLyByZWdpc3RlciBzaG91bGQgYmUgdHJ1ZSBieSBkZWZhdWx0IGlmIG5vdCBzcGVjaWZpZWQuXG5cdFx0aWYgKCF2bS5oYXNPd25Qcm9wZXJ0eSgncmVnaXN0ZXInKSkge1xuXHRcdFx0dm0ucmVnaXN0ZXIgPSB0cnVlO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHR2bS5yZWdpc3RlciA9IHZtLnJlZ2lzdGVyLnRvTG93ZXJDYXNlKCkgPT09ICdmYWxzZScgPyBmYWxzZSA6IHRydWU7XG5cdFx0fVxuXG5cdFx0Ly8gUmVnaXN0ZXIgdGhpcyBzcGlubmVyIHdpdGggdGhlIHNwaW5uZXIgc2VydmljZS5cblx0XHRpZiAodm0ucmVnaXN0ZXIgPT09IHRydWUpIHtcblx0XHRcdHNwaW5uZXJTZXJ2aWNlLl9yZWdpc3RlcihhcGkpO1xuXHRcdH1cblxuXHRcdC8vIElmIGFuIG9uU2hvdyBvciBvbkhpZGUgZXhwcmVzc2lvbiB3YXMgcHJvdmlkZWQsIHJlZ2lzdGVyIGEgd2F0Y2hlclxuXHRcdC8vIHRoYXQgd2lsbCBmaXJlIHRoZSByZWxldmFudCBleHByZXNzaW9uIHdoZW4gc2hvdydzIHZhbHVlIGNoYW5nZXMuXG5cdFx0aWYgKHZtLm9uU2hvdyB8fCB2bS5vbkhpZGUpIHtcblx0XHRcdCRzY29wZS4kd2F0Y2goJ3Nob3cnLCBmdW5jdGlvbiAoc2hvdykge1xuXHRcdFx0XHRpZiAoc2hvdyAmJiB2bS5vblNob3cpIHtcblx0XHRcdFx0XHR2bS5vblNob3coeyBzcGlubmVyU2VydmljZTogc3Bpbm5lclNlcnZpY2UsIHNwaW5uZXJBcGk6IGFwaSB9KTtcblx0XHRcdFx0fSBlbHNlIGlmICghc2hvdyAmJiB2bS5vbkhpZGUpIHtcblx0XHRcdFx0XHR2bS5vbkhpZGUoeyBzcGlubmVyU2VydmljZTogc3Bpbm5lclNlcnZpY2UsIHNwaW5uZXJBcGk6IGFwaSB9KTtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0Ly8gVGhpcyBzcGlubmVyIGlzIGdvb2QgdG8gZ28uIEZpcmUgdGhlIG9uTG9hZGVkIGV4cHJlc3Npb24uXG5cdFx0aWYgKHZtLm9uTG9hZGVkKSB7XG5cdFx0XHR2bS5vbkxvYWRlZCh7IHNwaW5uZXJTZXJ2aWNlOiBzcGlubmVyU2VydmljZSwgc3Bpbm5lckFwaTogYXBpIH0pO1xuXHRcdH1cblxuXHR9XG5cbn0pKCk7IiwiKGZ1bmN0aW9uKCl7XG5cblx0J3VzZSBzdHJpY3QnO1xuXG5cdGFuZ3VsYXJcblx0XHQubW9kdWxlKCdhcHAnKVxuXHRcdC5kaXJlY3RpdmUoJ3NwaW5uZXInLCBzcGlubmVyKTtcblxuXHRmdW5jdGlvbiBzcGlubmVyKCl7XG5cblx0XHRyZXR1cm4ge1xuXHRcdFx0cmVzdHJpY3Q6ICdBRScsXG5cdFx0XHRyZXBsYWNlOiB0cnVlLFxuXHRcdFx0dHJhbnNjbHVkZTogdHJ1ZSxcblx0XHRcdHNjb3BlOiB7XG5cdFx0XHRcdG5hbWU6ICdAPycsXG5cdFx0XHRcdGdyb3VwOiAnQD8nLFxuXHRcdFx0XHRzaG93OiAnPT8nLFxuXHRcdFx0XHRpbWdTcmM6ICdAPycsXG5cdFx0XHRcdHJlZ2lzdGVyOiAnQD8nLFxuXHRcdFx0XHRvbkxvYWRlZDogJyY/Jyxcblx0XHRcdFx0b25TaG93OiAnJj8nLFxuXHRcdFx0XHRvbkhpZGU6ICcmPydcblx0XHRcdH0sXG5cdFx0XHR0ZW1wbGF0ZTogW1xuXHRcdFx0XHQnPGRpdiBuZy1zaG93PVwic3Bpbm5lclZtLnNob3dcIj4nLFxuXHRcdFx0XHQnICA8aW1nIG5nLWlmPVwic3Bpbm5lclZtLmltZ1NyY1wiIG5nLXNyYz1cInt7c3Bpbm5lclZtLmltZ1NyY319XCIgLz4nLFxuXHRcdFx0XHQnICA8bmctdHJhbnNjbHVkZT48L25nLXRyYW5zY2x1ZGU+Jyxcblx0XHRcdFx0JzwvZGl2Pidcblx0XHRcdF0uam9pbignJyksXG5cdFx0XHRjb250cm9sbGVyOiAnU3Bpbm5lckNvbnRyb2xsZXInLFxuXHRcdFx0Y29udHJvbGxlckFzOiAnc3Bpbm5lclZtJyxcblx0XHRcdGJpbmRUb0NvbnRyb2xsZXI6IHRydWVcblx0XHR9O1xuXG5cdH1cblxufSkoKTsiLCIoZnVuY3Rpb24oKXtcblxuXHQndXNlIHN0cmljdCc7XG5cblx0YW5ndWxhclxuXHRcdC5tb2R1bGUoJ2FwcC5jb3JlJylcblx0XHQuY29udHJvbGxlcignRGF0ZVBpY2tlcicsIERhdGVQaWNrZXIpO1xuXG5cdERhdGVQaWNrZXIuJGluamVjdCA9IFsndXRpbHNTZXJ2aWNlJywgJ2Vycm9yU2VydmljZSddO1xuXG5cdGZ1bmN0aW9uIERhdGVQaWNrZXIodXRpbHMsIGVycm9yU2VydmljZSkge1xuXG5cdFx0dmFyIHZtID0gdGhpcztcblxuXHRcdHZtLm9wZW5lZCA9IGZhbHNlO1xuXHRcdHZtLm9wZW4gPSBmdW5jdGlvbigpIHtcblx0XHRcdHZtLm9wZW5lZCA9IHRydWU7XG5cdFx0fTtcblxuXHR9XG5cbn0pKCk7IiwiKGZ1bmN0aW9uKCl7XG5cblx0J3VzZSBzdHJpY3QnO1xuXG5cdGFuZ3VsYXJcblx0XHQubW9kdWxlKCdhcHAnKVxuXHRcdC5kaXJlY3RpdmUoJ2RhdGVQaWNrZXInLCBkYXRlUGlja2VyKTtcblxuXHRkYXRlUGlja2VyLiRpbmplY3QgPSBbJ3V0aWxzU2VydmljZSddO1xuXG5cdGZ1bmN0aW9uIGRhdGVQaWNrZXIodXRpbHNTZXJ2aWNlKXtcblxuXHRcdHJldHVybiB7XG5cdFx0XHRyZXN0cmljdDogJ0FFJyxcblx0XHRcdHRyYW5zY2x1ZGU6IHRydWUsXG5cdFx0XHRzY29wZToge1xuXHRcdFx0XHRkYXRlRm9ybWF0OiAnPScsXG5cdFx0XHRcdGRhdGVPcHRpb25zOiAnPScsXG5cdFx0XHRcdG1vZGVsOiAnPSdcblx0XHRcdH0sXG5cdFx0XHRjb250cm9sbGVyOiAnRGF0ZVBpY2tlcicsXG5cdFx0XHRjb250cm9sbGVyQXM6ICdwaWNrZXJWbScsXG5cdFx0XHR0ZW1wbGF0ZVVybDogJ2NvbXBvbmVudHMvZGF0ZS1waWNrZXIvZGF0ZS1waWNrZXIuaHRtbCcsXG5cdFx0XHRsaW5rOiBsaW5rXG5cdFx0fTtcblxuXHRcdGZ1bmN0aW9uIGxpbmsoc2NvcGUsIGVsLCBhdHRycywgY3RybCl7XG5cblx0XHRcdHZhciBpY29uc0NoYW5nZWQgPSBmYWxzZTtcblxuXHRcdFx0c2NvcGUuJHdhdGNoKCdwaWNrZXJWbS5vcGVuZWQnLCBmdW5jdGlvbiAob3BlbmVkKSB7XG5cdFx0XHRcdGlmKG9wZW5lZCAmJiAhaWNvbnNDaGFuZ2VkKSB7XG5cdFx0XHRcdFx0Y2hhbmdlSWNvbnMoKTtcblx0XHRcdFx0XHRpY29uc0NoYW5nZWQgPSB0cnVlO1xuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblxuXHRcdFx0ZnVuY3Rpb24gY2hhbmdlSWNvbnMoKXtcblx0XHRcdFx0dmFyIGxlZnRJY28gPSBlbFswXS5xdWVyeVNlbGVjdG9yQWxsKCcudWliLWxlZnQnKTtcblx0XHRcdFx0dmFyIHJpZ2h0SWNvID0gZWxbMF0ucXVlcnlTZWxlY3RvckFsbCgnLnVpYi1yaWdodCcpO1xuXG5cdFx0XHRcdGNvbnNvbGUubG9nKCdjaGFuZ2VJY29uczogJywgZWxbMF0sIGxlZnRJY28sIHJpZ2h0SWNvKTtcblxuXHRcdFx0XHQvLyBsZWZ0SWNvLmNsYXNzTmFtZSA9ICdmYSBmYS1jaGV2cm9uLWxlZnQnO1xuXHRcdFx0XHQvLyByaWdodEljby5jbGFzc05hbWUgPSAnZmEgZmEtY2hldnJvbi1yaWdodCc7XG5cblx0XHRcdH1cblxuXHRcdH1cblxuXHR9XG5cbn0pKCk7IiwiJ3VzZSBzdHJpY3QnO1xuYW5ndWxhci5tb2R1bGUoXCJuZ0xvY2FsZVwiLCBbXSwgW1wiJHByb3ZpZGVcIiwgZnVuY3Rpb24oJHByb3ZpZGUpIHtcbnZhciBQTFVSQUxfQ0FURUdPUlkgPSB7WkVSTzogXCJ6ZXJvXCIsIE9ORTogXCJvbmVcIiwgVFdPOiBcInR3b1wiLCBGRVc6IFwiZmV3XCIsIE1BTlk6IFwibWFueVwiLCBPVEhFUjogXCJvdGhlclwifTtcbmZ1bmN0aW9uIGdldERlY2ltYWxzKG4pIHtcbiAgbiA9IG4gKyAnJztcbiAgdmFyIGkgPSBuLmluZGV4T2YoJy4nKTtcbiAgcmV0dXJuIChpID09IC0xKSA/IDAgOiBuLmxlbmd0aCAtIGkgLSAxO1xufVxuXG5mdW5jdGlvbiBnZXRWRihuLCBvcHRfcHJlY2lzaW9uKSB7XG4gIHZhciB2ID0gb3B0X3ByZWNpc2lvbjtcblxuICBpZiAodW5kZWZpbmVkID09PSB2KSB7XG4gICAgdiA9IE1hdGgubWluKGdldERlY2ltYWxzKG4pLCAzKTtcbiAgfVxuXG4gIHZhciBiYXNlID0gTWF0aC5wb3coMTAsIHYpO1xuICB2YXIgZiA9ICgobiAqIGJhc2UpIHwgMCkgJSBiYXNlO1xuICByZXR1cm4ge3Y6IHYsIGY6IGZ9O1xufVxuXG4kcHJvdmlkZS52YWx1ZShcIiRsb2NhbGVcIiwge1xuICBcIkRBVEVUSU1FX0ZPUk1BVFNcIjoge1xuICAgIFwiQU1QTVNcIjogW1xuICAgICAgXCJBTVwiLFxuICAgICAgXCJQTVwiXG4gICAgXSxcbiAgICBcIkRBWVwiOiBbXG4gICAgICBcIlN1bmRheVwiLFxuICAgICAgXCJNb25kYXlcIixcbiAgICAgIFwiVHVlc2RheVwiLFxuICAgICAgXCJXZWRuZXNkYXlcIixcbiAgICAgIFwiVGh1cnNkYXlcIixcbiAgICAgIFwiRnJpZGF5XCIsXG4gICAgICBcIlNhdHVyZGF5XCJcbiAgICBdLFxuICAgIFwiRVJBTkFNRVNcIjogW1xuICAgICAgXCJCZWZvcmUgQ2hyaXN0XCIsXG4gICAgICBcIkFubm8gRG9taW5pXCJcbiAgICBdLFxuICAgIFwiRVJBU1wiOiBbXG4gICAgICBcIkJDXCIsXG4gICAgICBcIkFEXCJcbiAgICBdLFxuICAgIFwiRklSU1REQVlPRldFRUtcIjogNixcbiAgICBcIk1PTlRIXCI6IFtcbiAgICAgIFwiSmFudWFyeVwiLFxuICAgICAgXCJGZWJydWFyeVwiLFxuICAgICAgXCJNYXJjaFwiLFxuICAgICAgXCJBcHJpbFwiLFxuICAgICAgXCJNYXlcIixcbiAgICAgIFwiSnVuZVwiLFxuICAgICAgXCJKdWx5XCIsXG4gICAgICBcIkF1Z3VzdFwiLFxuICAgICAgXCJTZXB0ZW1iZXJcIixcbiAgICAgIFwiT2N0b2JlclwiLFxuICAgICAgXCJOb3ZlbWJlclwiLFxuICAgICAgXCJEZWNlbWJlclwiXG4gICAgXSxcbiAgICBcIlNIT1JUREFZXCI6IFtcbiAgICAgIFwiU3VuXCIsXG4gICAgICBcIk1vblwiLFxuICAgICAgXCJUdWVcIixcbiAgICAgIFwiV2VkXCIsXG4gICAgICBcIlRodVwiLFxuICAgICAgXCJGcmlcIixcbiAgICAgIFwiU2F0XCJcbiAgICBdLFxuICAgIFwiU0hPUlRNT05USFwiOiBbXG4gICAgICBcIkphblwiLFxuICAgICAgXCJGZWJcIixcbiAgICAgIFwiTWFyXCIsXG4gICAgICBcIkFwclwiLFxuICAgICAgXCJNYXlcIixcbiAgICAgIFwiSnVuXCIsXG4gICAgICBcIkp1bFwiLFxuICAgICAgXCJBdWdcIixcbiAgICAgIFwiU2VwXCIsXG4gICAgICBcIk9jdFwiLFxuICAgICAgXCJOb3ZcIixcbiAgICAgIFwiRGVjXCJcbiAgICBdLFxuICAgIFwiU1RBTkRBTE9ORU1PTlRIXCI6IFtcbiAgICAgIFwiSmFudWFyeVwiLFxuICAgICAgXCJGZWJydWFyeVwiLFxuICAgICAgXCJNYXJjaFwiLFxuICAgICAgXCJBcHJpbFwiLFxuICAgICAgXCJNYXlcIixcbiAgICAgIFwiSnVuZVwiLFxuICAgICAgXCJKdWx5XCIsXG4gICAgICBcIkF1Z3VzdFwiLFxuICAgICAgXCJTZXB0ZW1iZXJcIixcbiAgICAgIFwiT2N0b2JlclwiLFxuICAgICAgXCJOb3ZlbWJlclwiLFxuICAgICAgXCJEZWNlbWJlclwiXG4gICAgXSxcbiAgICBcIldFRUtFTkRSQU5HRVwiOiBbXG4gICAgICA1LFxuICAgICAgNlxuICAgIF0sXG4gICAgXCJmdWxsRGF0ZVwiOiBcIkVFRUUsIE1NTU0gZCwgeVwiLFxuICAgIFwibG9uZ0RhdGVcIjogXCJNTU1NIGQsIHlcIixcbiAgICBcIm1lZGl1bVwiOiBcIk1NTSBkLCB5IGg6bW06c3MgYVwiLFxuICAgIFwibWVkaXVtRGF0ZVwiOiBcIk1NTSBkLCB5XCIsXG4gICAgXCJtZWRpdW1UaW1lXCI6IFwiaDptbTpzcyBhXCIsXG4gICAgXCJzaG9ydFwiOiBcIk0vZC95eSBoOm1tIGFcIixcbiAgICBcInNob3J0RGF0ZVwiOiBcIk0vZC95eVwiLFxuICAgIFwic2hvcnRUaW1lXCI6IFwiaDptbSBhXCJcbiAgfSxcbiAgXCJOVU1CRVJfRk9STUFUU1wiOiB7XG4gICAgXCJDVVJSRU5DWV9TWU1cIjogXCIkXCIsXG4gICAgXCJERUNJTUFMX1NFUFwiOiBcIi5cIixcbiAgICBcIkdST1VQX1NFUFwiOiBcIixcIixcbiAgICBcIlBBVFRFUk5TXCI6IFtcbiAgICAgIHtcbiAgICAgICAgXCJnU2l6ZVwiOiAzLFxuICAgICAgICBcImxnU2l6ZVwiOiAzLFxuICAgICAgICBcIm1heEZyYWNcIjogMyxcbiAgICAgICAgXCJtaW5GcmFjXCI6IDAsXG4gICAgICAgIFwibWluSW50XCI6IDEsXG4gICAgICAgIFwibmVnUHJlXCI6IFwiLVwiLFxuICAgICAgICBcIm5lZ1N1ZlwiOiBcIlwiLFxuICAgICAgICBcInBvc1ByZVwiOiBcIlwiLFxuICAgICAgICBcInBvc1N1ZlwiOiBcIlwiXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBcImdTaXplXCI6IDMsXG4gICAgICAgIFwibGdTaXplXCI6IDMsXG4gICAgICAgIFwibWF4RnJhY1wiOiAyLFxuICAgICAgICBcIm1pbkZyYWNcIjogMixcbiAgICAgICAgXCJtaW5JbnRcIjogMSxcbiAgICAgICAgXCJuZWdQcmVcIjogXCItXFx1MDBhNFwiLFxuICAgICAgICBcIm5lZ1N1ZlwiOiBcIlwiLFxuICAgICAgICBcInBvc1ByZVwiOiBcIlxcdTAwYTRcIixcbiAgICAgICAgXCJwb3NTdWZcIjogXCJcIlxuICAgICAgfVxuICAgIF1cbiAgfSxcbiAgXCJpZFwiOiBcImVuXCIsXG4gIFwibG9jYWxlSURcIjogXCJlblwiLFxuICBcInBsdXJhbENhdFwiOiBmdW5jdGlvbihuLCBvcHRfcHJlY2lzaW9uKSB7ICB2YXIgaSA9IG4gfCAwOyAgdmFyIHZmID0gZ2V0VkYobiwgb3B0X3ByZWNpc2lvbik7ICBpZiAoaSA9PSAxICYmIHZmLnYgPT0gMCkgeyAgICByZXR1cm4gUExVUkFMX0NBVEVHT1JZLk9ORTsgIH0gIHJldHVybiBQTFVSQUxfQ0FURUdPUlkuT1RIRVI7fVxufSk7XG59XSk7XG4iLCIndXNlIHN0cmljdCc7XG5hbmd1bGFyLm1vZHVsZShcIm5nTG9jYWxlXCIsIFtdLCBbXCIkcHJvdmlkZVwiLCBmdW5jdGlvbigkcHJvdmlkZSkge1xudmFyIFBMVVJBTF9DQVRFR09SWSA9IHtaRVJPOiBcInplcm9cIiwgT05FOiBcIm9uZVwiLCBUV086IFwidHdvXCIsIEZFVzogXCJmZXdcIiwgTUFOWTogXCJtYW55XCIsIE9USEVSOiBcIm90aGVyXCJ9O1xuZnVuY3Rpb24gZ2V0RGVjaW1hbHMobikge1xuICBuID0gbiArICcnO1xuICB2YXIgaSA9IG4uaW5kZXhPZignLicpO1xuICByZXR1cm4gKGkgPT0gLTEpID8gMCA6IG4ubGVuZ3RoIC0gaSAtIDE7XG59XG5cbmZ1bmN0aW9uIGdldFZGKG4sIG9wdF9wcmVjaXNpb24pIHtcbiAgdmFyIHYgPSBvcHRfcHJlY2lzaW9uO1xuXG4gIGlmICh1bmRlZmluZWQgPT09IHYpIHtcbiAgICB2ID0gTWF0aC5taW4oZ2V0RGVjaW1hbHMobiksIDMpO1xuICB9XG5cbiAgdmFyIGJhc2UgPSBNYXRoLnBvdygxMCwgdik7XG4gIHZhciBmID0gKChuICogYmFzZSkgfCAwKSAlIGJhc2U7XG4gIHJldHVybiB7djogdiwgZjogZn07XG59XG5cbiRwcm92aWRlLnZhbHVlKFwiJGxvY2FsZVwiLCB7XG4gIFwiREFURVRJTUVfRk9STUFUU1wiOiB7XG4gICAgXCJBTVBNU1wiOiBbXG4gICAgICBcIkFNXCIsXG4gICAgICBcIlBNXCJcbiAgICBdLFxuICAgIFwiREFZXCI6IFtcbiAgICAgIFwiXFx1MDQzMlxcdTA0M2VcXHUwNDQxXFx1MDQzYVxcdTA0NDBcXHUwNDM1XFx1MDQ0MVxcdTA0MzVcXHUwNDNkXFx1MDQ0Y1xcdTA0MzVcIixcbiAgICAgIFwiXFx1MDQzZlxcdTA0M2VcXHUwNDNkXFx1MDQzNVxcdTA0MzRcXHUwNDM1XFx1MDQzYlxcdTA0NGNcXHUwNDNkXFx1MDQzOFxcdTA0M2FcIixcbiAgICAgIFwiXFx1MDQzMlxcdTA0NDJcXHUwNDNlXFx1MDQ0MFxcdTA0M2RcXHUwNDM4XFx1MDQzYVwiLFxuICAgICAgXCJcXHUwNDQxXFx1MDQ0MFxcdTA0MzVcXHUwNDM0XFx1MDQzMFwiLFxuICAgICAgXCJcXHUwNDQ3XFx1MDQzNVxcdTA0NDJcXHUwNDMyXFx1MDQzNVxcdTA0NDBcXHUwNDMzXCIsXG4gICAgICBcIlxcdTA0M2ZcXHUwNDRmXFx1MDQ0MlxcdTA0M2RcXHUwNDM4XFx1MDQ0NlxcdTA0MzBcIixcbiAgICAgIFwiXFx1MDQ0MVxcdTA0NDNcXHUwNDMxXFx1MDQzMVxcdTA0M2VcXHUwNDQyXFx1MDQzMFwiXG4gICAgXSxcbiAgICBcIkVSQU5BTUVTXCI6IFtcbiAgICAgIFwiXFx1MDQzNFxcdTA0M2UgXFx1MDQzZC4gXFx1MDQ0ZC5cIixcbiAgICAgIFwiXFx1MDQzZC4gXFx1MDQ0ZC5cIlxuICAgIF0sXG4gICAgXCJFUkFTXCI6IFtcbiAgICAgIFwiXFx1MDQzNFxcdTA0M2UgXFx1MDQzZC4gXFx1MDQ0ZC5cIixcbiAgICAgIFwiXFx1MDQzZC4gXFx1MDQ0ZC5cIlxuICAgIF0sXG4gICAgXCJGSVJTVERBWU9GV0VFS1wiOiAwLFxuICAgIFwiTU9OVEhcIjogW1xuICAgICAgXCJcXHUwNDRmXFx1MDQzZFxcdTA0MzJcXHUwNDMwXFx1MDQ0MFxcdTA0NGZcIixcbiAgICAgIFwiXFx1MDQ0NFxcdTA0MzVcXHUwNDMyXFx1MDQ0MFxcdTA0MzBcXHUwNDNiXFx1MDQ0ZlwiLFxuICAgICAgXCJcXHUwNDNjXFx1MDQzMFxcdTA0NDBcXHUwNDQyXFx1MDQzMFwiLFxuICAgICAgXCJcXHUwNDMwXFx1MDQzZlxcdTA0NDBcXHUwNDM1XFx1MDQzYlxcdTA0NGZcIixcbiAgICAgIFwiXFx1MDQzY1xcdTA0MzBcXHUwNDRmXCIsXG4gICAgICBcIlxcdTA0MzhcXHUwNDRlXFx1MDQzZFxcdTA0NGZcIixcbiAgICAgIFwiXFx1MDQzOFxcdTA0NGVcXHUwNDNiXFx1MDQ0ZlwiLFxuICAgICAgXCJcXHUwNDMwXFx1MDQzMlxcdTA0MzNcXHUwNDQzXFx1MDQ0MVxcdTA0NDJcXHUwNDMwXCIsXG4gICAgICBcIlxcdTA0NDFcXHUwNDM1XFx1MDQzZFxcdTA0NDJcXHUwNDRmXFx1MDQzMVxcdTA0NDBcXHUwNDRmXCIsXG4gICAgICBcIlxcdTA0M2VcXHUwNDNhXFx1MDQ0MlxcdTA0NGZcXHUwNDMxXFx1MDQ0MFxcdTA0NGZcIixcbiAgICAgIFwiXFx1MDQzZFxcdTA0M2VcXHUwNDRmXFx1MDQzMVxcdTA0NDBcXHUwNDRmXCIsXG4gICAgICBcIlxcdTA0MzRcXHUwNDM1XFx1MDQzYVxcdTA0MzBcXHUwNDMxXFx1MDQ0MFxcdTA0NGZcIlxuICAgIF0sXG4gICAgXCJTSE9SVERBWVwiOiBbXG4gICAgICBcIlxcdTA0MzJcXHUwNDQxXCIsXG4gICAgICBcIlxcdTA0M2ZcXHUwNDNkXCIsXG4gICAgICBcIlxcdTA0MzJcXHUwNDQyXCIsXG4gICAgICBcIlxcdTA0NDFcXHUwNDQwXCIsXG4gICAgICBcIlxcdTA0NDdcXHUwNDQyXCIsXG4gICAgICBcIlxcdTA0M2ZcXHUwNDQyXCIsXG4gICAgICBcIlxcdTA0NDFcXHUwNDMxXCJcbiAgICBdLFxuICAgIFwiU0hPUlRNT05USFwiOiBbXG4gICAgICBcIlxcdTA0NGZcXHUwNDNkXFx1MDQzMi5cIixcbiAgICAgIFwiXFx1MDQ0NFxcdTA0MzVcXHUwNDMyXFx1MDQ0MC5cIixcbiAgICAgIFwiXFx1MDQzY1xcdTA0MzBcXHUwNDQwXFx1MDQ0MlxcdTA0MzBcIixcbiAgICAgIFwiXFx1MDQzMFxcdTA0M2ZcXHUwNDQwLlwiLFxuICAgICAgXCJcXHUwNDNjXFx1MDQzMFxcdTA0NGZcIixcbiAgICAgIFwiXFx1MDQzOFxcdTA0NGVcXHUwNDNkXFx1MDQ0ZlwiLFxuICAgICAgXCJcXHUwNDM4XFx1MDQ0ZVxcdTA0M2JcXHUwNDRmXCIsXG4gICAgICBcIlxcdTA0MzBcXHUwNDMyXFx1MDQzMy5cIixcbiAgICAgIFwiXFx1MDQ0MVxcdTA0MzVcXHUwNDNkXFx1MDQ0Mi5cIixcbiAgICAgIFwiXFx1MDQzZVxcdTA0M2FcXHUwNDQyLlwiLFxuICAgICAgXCJcXHUwNDNkXFx1MDQzZVxcdTA0NGZcXHUwNDMxLlwiLFxuICAgICAgXCJcXHUwNDM0XFx1MDQzNVxcdTA0M2EuXCJcbiAgICBdLFxuICAgIFwiU1RBTkRBTE9ORU1PTlRIXCI6IFtcbiAgICAgIFwiXFx1MDQ0ZlxcdTA0M2RcXHUwNDMyXFx1MDQzMFxcdTA0NDBcXHUwNDRjXCIsXG4gICAgICBcIlxcdTA0NDRcXHUwNDM1XFx1MDQzMlxcdTA0NDBcXHUwNDMwXFx1MDQzYlxcdTA0NGNcIixcbiAgICAgIFwiXFx1MDQzY1xcdTA0MzBcXHUwNDQwXFx1MDQ0MlwiLFxuICAgICAgXCJcXHUwNDMwXFx1MDQzZlxcdTA0NDBcXHUwNDM1XFx1MDQzYlxcdTA0NGNcIixcbiAgICAgIFwiXFx1MDQzY1xcdTA0MzBcXHUwNDM5XCIsXG4gICAgICBcIlxcdTA0MzhcXHUwNDRlXFx1MDQzZFxcdTA0NGNcIixcbiAgICAgIFwiXFx1MDQzOFxcdTA0NGVcXHUwNDNiXFx1MDQ0Y1wiLFxuICAgICAgXCJcXHUwNDMwXFx1MDQzMlxcdTA0MzNcXHUwNDQzXFx1MDQ0MVxcdTA0NDJcIixcbiAgICAgIFwiXFx1MDQ0MVxcdTA0MzVcXHUwNDNkXFx1MDQ0MlxcdTA0NGZcXHUwNDMxXFx1MDQ0MFxcdTA0NGNcIixcbiAgICAgIFwiXFx1MDQzZVxcdTA0M2FcXHUwNDQyXFx1MDQ0ZlxcdTA0MzFcXHUwNDQwXFx1MDQ0Y1wiLFxuICAgICAgXCJcXHUwNDNkXFx1MDQzZVxcdTA0NGZcXHUwNDMxXFx1MDQ0MFxcdTA0NGNcIixcbiAgICAgIFwiXFx1MDQzNFxcdTA0MzVcXHUwNDNhXFx1MDQzMFxcdTA0MzFcXHUwNDQwXFx1MDQ0Y1wiXG4gICAgXSxcbiAgICBcIldFRUtFTkRSQU5HRVwiOiBbXG4gICAgICA1LFxuICAgICAgNlxuICAgIF0sXG4gICAgXCJmdWxsRGF0ZVwiOiBcIkVFRUUsIGQgTU1NTSB5ICdcXHUwNDMzJy5cIixcbiAgICBcImxvbmdEYXRlXCI6IFwiZCBNTU1NIHkgJ1xcdTA0MzMnLlwiLFxuICAgIFwibWVkaXVtXCI6IFwiZCBNTU0geSAnXFx1MDQzMycuIEg6bW06c3NcIixcbiAgICBcIm1lZGl1bURhdGVcIjogXCJkIE1NTSB5ICdcXHUwNDMzJy5cIixcbiAgICBcIm1lZGl1bVRpbWVcIjogXCJIOm1tOnNzXCIsXG4gICAgXCJzaG9ydFwiOiBcImRkLk1NLnl5IEg6bW1cIixcbiAgICBcInNob3J0RGF0ZVwiOiBcImRkLk1NLnl5XCIsXG4gICAgXCJzaG9ydFRpbWVcIjogXCJIOm1tXCJcbiAgfSxcbiAgXCJOVU1CRVJfRk9STUFUU1wiOiB7XG4gICAgXCJDVVJSRU5DWV9TWU1cIjogXCJcXHUwNDQwXFx1MDQ0M1xcdTA0MzEuXCIsXG4gICAgXCJERUNJTUFMX1NFUFwiOiBcIixcIixcbiAgICBcIkdST1VQX1NFUFwiOiBcIlxcdTAwYTBcIixcbiAgICBcIlBBVFRFUk5TXCI6IFtcbiAgICAgIHtcbiAgICAgICAgXCJnU2l6ZVwiOiAzLFxuICAgICAgICBcImxnU2l6ZVwiOiAzLFxuICAgICAgICBcIm1heEZyYWNcIjogMyxcbiAgICAgICAgXCJtaW5GcmFjXCI6IDAsXG4gICAgICAgIFwibWluSW50XCI6IDEsXG4gICAgICAgIFwibmVnUHJlXCI6IFwiLVwiLFxuICAgICAgICBcIm5lZ1N1ZlwiOiBcIlwiLFxuICAgICAgICBcInBvc1ByZVwiOiBcIlwiLFxuICAgICAgICBcInBvc1N1ZlwiOiBcIlwiXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBcImdTaXplXCI6IDMsXG4gICAgICAgIFwibGdTaXplXCI6IDMsXG4gICAgICAgIFwibWF4RnJhY1wiOiAyLFxuICAgICAgICBcIm1pbkZyYWNcIjogMixcbiAgICAgICAgXCJtaW5JbnRcIjogMSxcbiAgICAgICAgXCJuZWdQcmVcIjogXCItXCIsXG4gICAgICAgIFwibmVnU3VmXCI6IFwiXFx1MDBhMFxcdTAwYTRcIixcbiAgICAgICAgXCJwb3NQcmVcIjogXCJcIixcbiAgICAgICAgXCJwb3NTdWZcIjogXCJcXHUwMGEwXFx1MDBhNFwiXG4gICAgICB9XG4gICAgXVxuICB9LFxuICBcImlkXCI6IFwicnUtcnVcIixcbiAgXCJsb2NhbGVJRFwiOiBcInJ1X1JVXCIsXG4gIFwicGx1cmFsQ2F0XCI6IGZ1bmN0aW9uKG4sIG9wdF9wcmVjaXNpb24pIHsgIHZhciBpID0gbiB8IDA7ICB2YXIgdmYgPSBnZXRWRihuLCBvcHRfcHJlY2lzaW9uKTsgIGlmICh2Zi52ID09IDAgJiYgaSAlIDEwID09IDEgJiYgaSAlIDEwMCAhPSAxMSkgeyAgICByZXR1cm4gUExVUkFMX0NBVEVHT1JZLk9ORTsgIH0gIGlmICh2Zi52ID09IDAgJiYgaSAlIDEwID49IDIgJiYgaSAlIDEwIDw9IDQgJiYgKGkgJSAxMDAgPCAxMiB8fCBpICUgMTAwID4gMTQpKSB7ICAgIHJldHVybiBQTFVSQUxfQ0FURUdPUlkuRkVXOyAgfSAgaWYgKHZmLnYgPT0gMCAmJiBpICUgMTAgPT0gMCB8fCB2Zi52ID09IDAgJiYgaSAlIDEwID49IDUgJiYgaSAlIDEwIDw9IDkgfHwgdmYudiA9PSAwICYmIGkgJSAxMDAgPj0gMTEgJiYgaSAlIDEwMCA8PSAxNCkgeyAgICByZXR1cm4gUExVUkFMX0NBVEVHT1JZLk1BTlk7ICB9ICByZXR1cm4gUExVUkFMX0NBVEVHT1JZLk9USEVSO31cbn0pO1xufV0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuYW5ndWxhci5tb2R1bGUoXCJuZ0xvY2FsZVwiLCBbXSwgW1wiJHByb3ZpZGVcIiwgZnVuY3Rpb24oJHByb3ZpZGUpIHtcbnZhciBQTFVSQUxfQ0FURUdPUlkgPSB7WkVSTzogXCJ6ZXJvXCIsIE9ORTogXCJvbmVcIiwgVFdPOiBcInR3b1wiLCBGRVc6IFwiZmV3XCIsIE1BTlk6IFwibWFueVwiLCBPVEhFUjogXCJvdGhlclwifTtcbmZ1bmN0aW9uIGdldERlY2ltYWxzKG4pIHtcbiAgbiA9IG4gKyAnJztcbiAgdmFyIGkgPSBuLmluZGV4T2YoJy4nKTtcbiAgcmV0dXJuIChpID09IC0xKSA/IDAgOiBuLmxlbmd0aCAtIGkgLSAxO1xufVxuXG5mdW5jdGlvbiBnZXRWRihuLCBvcHRfcHJlY2lzaW9uKSB7XG4gIHZhciB2ID0gb3B0X3ByZWNpc2lvbjtcblxuICBpZiAodW5kZWZpbmVkID09PSB2KSB7XG4gICAgdiA9IE1hdGgubWluKGdldERlY2ltYWxzKG4pLCAzKTtcbiAgfVxuXG4gIHZhciBiYXNlID0gTWF0aC5wb3coMTAsIHYpO1xuICB2YXIgZiA9ICgobiAqIGJhc2UpIHwgMCkgJSBiYXNlO1xuICByZXR1cm4ge3Y6IHYsIGY6IGZ9O1xufVxuXG4kcHJvdmlkZS52YWx1ZShcIiRsb2NhbGVcIiwge1xuICBcIkRBVEVUSU1FX0ZPUk1BVFNcIjoge1xuICAgIFwiQU1QTVNcIjogW1xuICAgICAgXCJBTVwiLFxuICAgICAgXCJQTVwiXG4gICAgXSxcbiAgICBcIkRBWVwiOiBbXG4gICAgICBcIlxcdTA0MzJcXHUwNDNlXFx1MDQ0MVxcdTA0M2FcXHUwNDQwXFx1MDQzNVxcdTA0NDFcXHUwNDM1XFx1MDQzZFxcdTA0NGNcXHUwNDM1XCIsXG4gICAgICBcIlxcdTA0M2ZcXHUwNDNlXFx1MDQzZFxcdTA0MzVcXHUwNDM0XFx1MDQzNVxcdTA0M2JcXHUwNDRjXFx1MDQzZFxcdTA0MzhcXHUwNDNhXCIsXG4gICAgICBcIlxcdTA0MzJcXHUwNDQyXFx1MDQzZVxcdTA0NDBcXHUwNDNkXFx1MDQzOFxcdTA0M2FcIixcbiAgICAgIFwiXFx1MDQ0MVxcdTA0NDBcXHUwNDM1XFx1MDQzNFxcdTA0MzBcIixcbiAgICAgIFwiXFx1MDQ0N1xcdTA0MzVcXHUwNDQyXFx1MDQzMlxcdTA0MzVcXHUwNDQwXFx1MDQzM1wiLFxuICAgICAgXCJcXHUwNDNmXFx1MDQ0ZlxcdTA0NDJcXHUwNDNkXFx1MDQzOFxcdTA0NDZcXHUwNDMwXCIsXG4gICAgICBcIlxcdTA0NDFcXHUwNDQzXFx1MDQzMVxcdTA0MzFcXHUwNDNlXFx1MDQ0MlxcdTA0MzBcIlxuICAgIF0sXG4gICAgXCJFUkFOQU1FU1wiOiBbXG4gICAgICBcIlxcdTA0MzRcXHUwNDNlIFxcdTA0M2QuIFxcdTA0NGQuXCIsXG4gICAgICBcIlxcdTA0M2QuIFxcdTA0NGQuXCJcbiAgICBdLFxuICAgIFwiRVJBU1wiOiBbXG4gICAgICBcIlxcdTA0MzRcXHUwNDNlIFxcdTA0M2QuIFxcdTA0NGQuXCIsXG4gICAgICBcIlxcdTA0M2QuIFxcdTA0NGQuXCJcbiAgICBdLFxuICAgIFwiRklSU1REQVlPRldFRUtcIjogMCxcbiAgICBcIk1PTlRIXCI6IFtcbiAgICAgIFwiXFx1MDQ0ZlxcdTA0M2RcXHUwNDMyXFx1MDQzMFxcdTA0NDBcXHUwNDRmXCIsXG4gICAgICBcIlxcdTA0NDRcXHUwNDM1XFx1MDQzMlxcdTA0NDBcXHUwNDMwXFx1MDQzYlxcdTA0NGZcIixcbiAgICAgIFwiXFx1MDQzY1xcdTA0MzBcXHUwNDQwXFx1MDQ0MlxcdTA0MzBcIixcbiAgICAgIFwiXFx1MDQzMFxcdTA0M2ZcXHUwNDQwXFx1MDQzNVxcdTA0M2JcXHUwNDRmXCIsXG4gICAgICBcIlxcdTA0M2NcXHUwNDMwXFx1MDQ0ZlwiLFxuICAgICAgXCJcXHUwNDM4XFx1MDQ0ZVxcdTA0M2RcXHUwNDRmXCIsXG4gICAgICBcIlxcdTA0MzhcXHUwNDRlXFx1MDQzYlxcdTA0NGZcIixcbiAgICAgIFwiXFx1MDQzMFxcdTA0MzJcXHUwNDMzXFx1MDQ0M1xcdTA0NDFcXHUwNDQyXFx1MDQzMFwiLFxuICAgICAgXCJcXHUwNDQxXFx1MDQzNVxcdTA0M2RcXHUwNDQyXFx1MDQ0ZlxcdTA0MzFcXHUwNDQwXFx1MDQ0ZlwiLFxuICAgICAgXCJcXHUwNDNlXFx1MDQzYVxcdTA0NDJcXHUwNDRmXFx1MDQzMVxcdTA0NDBcXHUwNDRmXCIsXG4gICAgICBcIlxcdTA0M2RcXHUwNDNlXFx1MDQ0ZlxcdTA0MzFcXHUwNDQwXFx1MDQ0ZlwiLFxuICAgICAgXCJcXHUwNDM0XFx1MDQzNVxcdTA0M2FcXHUwNDMwXFx1MDQzMVxcdTA0NDBcXHUwNDRmXCJcbiAgICBdLFxuICAgIFwiU0hPUlREQVlcIjogW1xuICAgICAgXCJcXHUwNDMyXFx1MDQ0MVwiLFxuICAgICAgXCJcXHUwNDNmXFx1MDQzZFwiLFxuICAgICAgXCJcXHUwNDMyXFx1MDQ0MlwiLFxuICAgICAgXCJcXHUwNDQxXFx1MDQ0MFwiLFxuICAgICAgXCJcXHUwNDQ3XFx1MDQ0MlwiLFxuICAgICAgXCJcXHUwNDNmXFx1MDQ0MlwiLFxuICAgICAgXCJcXHUwNDQxXFx1MDQzMVwiXG4gICAgXSxcbiAgICBcIlNIT1JUTU9OVEhcIjogW1xuICAgICAgXCJcXHUwNDRmXFx1MDQzZFxcdTA0MzIuXCIsXG4gICAgICBcIlxcdTA0NDRcXHUwNDM1XFx1MDQzMlxcdTA0NDAuXCIsXG4gICAgICBcIlxcdTA0M2NcXHUwNDMwXFx1MDQ0MFxcdTA0NDJcXHUwNDMwXCIsXG4gICAgICBcIlxcdTA0MzBcXHUwNDNmXFx1MDQ0MC5cIixcbiAgICAgIFwiXFx1MDQzY1xcdTA0MzBcXHUwNDRmXCIsXG4gICAgICBcIlxcdTA0MzhcXHUwNDRlXFx1MDQzZFxcdTA0NGZcIixcbiAgICAgIFwiXFx1MDQzOFxcdTA0NGVcXHUwNDNiXFx1MDQ0ZlwiLFxuICAgICAgXCJcXHUwNDMwXFx1MDQzMlxcdTA0MzMuXCIsXG4gICAgICBcIlxcdTA0NDFcXHUwNDM1XFx1MDQzZFxcdTA0NDIuXCIsXG4gICAgICBcIlxcdTA0M2VcXHUwNDNhXFx1MDQ0Mi5cIixcbiAgICAgIFwiXFx1MDQzZFxcdTA0M2VcXHUwNDRmXFx1MDQzMS5cIixcbiAgICAgIFwiXFx1MDQzNFxcdTA0MzVcXHUwNDNhLlwiXG4gICAgXSxcbiAgICBcIlNUQU5EQUxPTkVNT05USFwiOiBbXG4gICAgICBcIlxcdTA0NGZcXHUwNDNkXFx1MDQzMlxcdTA0MzBcXHUwNDQwXFx1MDQ0Y1wiLFxuICAgICAgXCJcXHUwNDQ0XFx1MDQzNVxcdTA0MzJcXHUwNDQwXFx1MDQzMFxcdTA0M2JcXHUwNDRjXCIsXG4gICAgICBcIlxcdTA0M2NcXHUwNDMwXFx1MDQ0MFxcdTA0NDJcIixcbiAgICAgIFwiXFx1MDQzMFxcdTA0M2ZcXHUwNDQwXFx1MDQzNVxcdTA0M2JcXHUwNDRjXCIsXG4gICAgICBcIlxcdTA0M2NcXHUwNDMwXFx1MDQzOVwiLFxuICAgICAgXCJcXHUwNDM4XFx1MDQ0ZVxcdTA0M2RcXHUwNDRjXCIsXG4gICAgICBcIlxcdTA0MzhcXHUwNDRlXFx1MDQzYlxcdTA0NGNcIixcbiAgICAgIFwiXFx1MDQzMFxcdTA0MzJcXHUwNDMzXFx1MDQ0M1xcdTA0NDFcXHUwNDQyXCIsXG4gICAgICBcIlxcdTA0NDFcXHUwNDM1XFx1MDQzZFxcdTA0NDJcXHUwNDRmXFx1MDQzMVxcdTA0NDBcXHUwNDRjXCIsXG4gICAgICBcIlxcdTA0M2VcXHUwNDNhXFx1MDQ0MlxcdTA0NGZcXHUwNDMxXFx1MDQ0MFxcdTA0NGNcIixcbiAgICAgIFwiXFx1MDQzZFxcdTA0M2VcXHUwNDRmXFx1MDQzMVxcdTA0NDBcXHUwNDRjXCIsXG4gICAgICBcIlxcdTA0MzRcXHUwNDM1XFx1MDQzYVxcdTA0MzBcXHUwNDMxXFx1MDQ0MFxcdTA0NGNcIlxuICAgIF0sXG4gICAgXCJXRUVLRU5EUkFOR0VcIjogW1xuICAgICAgNSxcbiAgICAgIDZcbiAgICBdLFxuICAgIFwiZnVsbERhdGVcIjogXCJFRUVFLCBkIE1NTU0geSAnXFx1MDQzMycuXCIsXG4gICAgXCJsb25nRGF0ZVwiOiBcImQgTU1NTSB5ICdcXHUwNDMzJy5cIixcbiAgICBcIm1lZGl1bVwiOiBcImQgTU1NIHkgJ1xcdTA0MzMnLiBIOm1tOnNzXCIsXG4gICAgXCJtZWRpdW1EYXRlXCI6IFwiZCBNTU0geSAnXFx1MDQzMycuXCIsXG4gICAgXCJtZWRpdW1UaW1lXCI6IFwiSDptbTpzc1wiLFxuICAgIFwic2hvcnRcIjogXCJkZC5NTS55eSBIOm1tXCIsXG4gICAgXCJzaG9ydERhdGVcIjogXCJkZC5NTS55eVwiLFxuICAgIFwic2hvcnRUaW1lXCI6IFwiSDptbVwiXG4gIH0sXG4gIFwiTlVNQkVSX0ZPUk1BVFNcIjoge1xuICAgIFwiQ1VSUkVOQ1lfU1lNXCI6IFwiXFx1MDQ0MFxcdTA0NDNcXHUwNDMxLlwiLFxuICAgIFwiREVDSU1BTF9TRVBcIjogXCIsXCIsXG4gICAgXCJHUk9VUF9TRVBcIjogXCJcXHUwMGEwXCIsXG4gICAgXCJQQVRURVJOU1wiOiBbXG4gICAgICB7XG4gICAgICAgIFwiZ1NpemVcIjogMyxcbiAgICAgICAgXCJsZ1NpemVcIjogMyxcbiAgICAgICAgXCJtYXhGcmFjXCI6IDMsXG4gICAgICAgIFwibWluRnJhY1wiOiAwLFxuICAgICAgICBcIm1pbkludFwiOiAxLFxuICAgICAgICBcIm5lZ1ByZVwiOiBcIi1cIixcbiAgICAgICAgXCJuZWdTdWZcIjogXCJcIixcbiAgICAgICAgXCJwb3NQcmVcIjogXCJcIixcbiAgICAgICAgXCJwb3NTdWZcIjogXCJcIlxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgXCJnU2l6ZVwiOiAzLFxuICAgICAgICBcImxnU2l6ZVwiOiAzLFxuICAgICAgICBcIm1heEZyYWNcIjogMixcbiAgICAgICAgXCJtaW5GcmFjXCI6IDIsXG4gICAgICAgIFwibWluSW50XCI6IDEsXG4gICAgICAgIFwibmVnUHJlXCI6IFwiLVwiLFxuICAgICAgICBcIm5lZ1N1ZlwiOiBcIlxcdTAwYTBcXHUwMGE0XCIsXG4gICAgICAgIFwicG9zUHJlXCI6IFwiXCIsXG4gICAgICAgIFwicG9zU3VmXCI6IFwiXFx1MDBhMFxcdTAwYTRcIlxuICAgICAgfVxuICAgIF1cbiAgfSxcbiAgXCJpZFwiOiBcInJ1XCIsXG4gIFwibG9jYWxlSURcIjogXCJydVwiLFxuICBcInBsdXJhbENhdFwiOiBmdW5jdGlvbihuLCBvcHRfcHJlY2lzaW9uKSB7ICB2YXIgaSA9IG4gfCAwOyAgdmFyIHZmID0gZ2V0VkYobiwgb3B0X3ByZWNpc2lvbik7ICBpZiAodmYudiA9PSAwICYmIGkgJSAxMCA9PSAxICYmIGkgJSAxMDAgIT0gMTEpIHsgICAgcmV0dXJuIFBMVVJBTF9DQVRFR09SWS5PTkU7ICB9ICBpZiAodmYudiA9PSAwICYmIGkgJSAxMCA+PSAyICYmIGkgJSAxMCA8PSA0ICYmIChpICUgMTAwIDwgMTIgfHwgaSAlIDEwMCA+IDE0KSkgeyAgICByZXR1cm4gUExVUkFMX0NBVEVHT1JZLkZFVzsgIH0gIGlmICh2Zi52ID09IDAgJiYgaSAlIDEwID09IDAgfHwgdmYudiA9PSAwICYmIGkgJSAxMCA+PSA1ICYmIGkgJSAxMCA8PSA5IHx8IHZmLnYgPT0gMCAmJiBpICUgMTAwID49IDExICYmIGkgJSAxMDAgPD0gMTQpIHsgICAgcmV0dXJuIFBMVVJBTF9DQVRFR09SWS5NQU5ZOyAgfSAgcmV0dXJuIFBMVVJBTF9DQVRFR09SWS5PVEhFUjt9XG59KTtcbn1dKTtcbiIsIid1c2Ugc3RyaWN0JztcbmFuZ3VsYXIubW9kdWxlKFwibmdMb2NhbGVcIiwgW10sIFtcIiRwcm92aWRlXCIsIGZ1bmN0aW9uKCRwcm92aWRlKSB7XG52YXIgUExVUkFMX0NBVEVHT1JZID0ge1pFUk86IFwiemVyb1wiLCBPTkU6IFwib25lXCIsIFRXTzogXCJ0d29cIiwgRkVXOiBcImZld1wiLCBNQU5ZOiBcIm1hbnlcIiwgT1RIRVI6IFwib3RoZXJcIn07XG5mdW5jdGlvbiBnZXREZWNpbWFscyhuKSB7XG4gIG4gPSBuICsgJyc7XG4gIHZhciBpID0gbi5pbmRleE9mKCcuJyk7XG4gIHJldHVybiAoaSA9PSAtMSkgPyAwIDogbi5sZW5ndGggLSBpIC0gMTtcbn1cblxuZnVuY3Rpb24gZ2V0VkYobiwgb3B0X3ByZWNpc2lvbikge1xuICB2YXIgdiA9IG9wdF9wcmVjaXNpb247XG5cbiAgaWYgKHVuZGVmaW5lZCA9PT0gdikge1xuICAgIHYgPSBNYXRoLm1pbihnZXREZWNpbWFscyhuKSwgMyk7XG4gIH1cblxuICB2YXIgYmFzZSA9IE1hdGgucG93KDEwLCB2KTtcbiAgdmFyIGYgPSAoKG4gKiBiYXNlKSB8IDApICUgYmFzZTtcbiAgcmV0dXJuIHt2OiB2LCBmOiBmfTtcbn1cblxuJHByb3ZpZGUudmFsdWUoXCIkbG9jYWxlXCIsIHtcbiAgXCJEQVRFVElNRV9GT1JNQVRTXCI6IHtcbiAgICBcIkFNUE1TXCI6IFtcbiAgICAgIFwiXFx1MDQzNFxcdTA0M2ZcIixcbiAgICAgIFwiXFx1MDQzZlxcdTA0M2ZcIlxuICAgIF0sXG4gICAgXCJEQVlcIjogW1xuICAgICAgXCJcXHUwNDNkXFx1MDQzNVxcdTA0MzRcXHUwNDU2XFx1MDQzYlxcdTA0NGZcIixcbiAgICAgIFwiXFx1MDQzZlxcdTA0M2VcXHUwNDNkXFx1MDQzNVxcdTA0MzRcXHUwNDU2XFx1MDQzYlxcdTA0M2VcXHUwNDNhXCIsXG4gICAgICBcIlxcdTA0MzJcXHUwNDU2XFx1MDQzMlxcdTA0NDJcXHUwNDNlXFx1MDQ0MFxcdTA0M2VcXHUwNDNhXCIsXG4gICAgICBcIlxcdTA0NDFcXHUwNDM1XFx1MDQ0MFxcdTA0MzVcXHUwNDM0XFx1MDQzMFwiLFxuICAgICAgXCJcXHUwNDQ3XFx1MDQzNVxcdTA0NDJcXHUwNDMyXFx1MDQzNVxcdTA0NDBcIixcbiAgICAgIFwiXFx1MDQzZlxcdTAyYmNcXHUwNDRmXFx1MDQ0MlxcdTA0M2RcXHUwNDM4XFx1MDQ0NlxcdTA0NGZcIixcbiAgICAgIFwiXFx1MDQ0MVxcdTA0NDNcXHUwNDMxXFx1MDQzZVxcdTA0NDJcXHUwNDMwXCJcbiAgICBdLFxuICAgIFwiRVJBTkFNRVNcIjogW1xuICAgICAgXCJcXHUwNDM0XFx1MDQzZSBcXHUwNDNkXFx1MDQzMFxcdTA0NDhcXHUwNDNlXFx1MDQ1NyBcXHUwNDM1XFx1MDQ0MFxcdTA0MzhcIixcbiAgICAgIFwiXFx1MDQzZFxcdTA0MzBcXHUwNDQ4XFx1MDQzZVxcdTA0NTcgXFx1MDQzNVxcdTA0NDBcXHUwNDM4XCJcbiAgICBdLFxuICAgIFwiRVJBU1wiOiBbXG4gICAgICBcIlxcdTA0MzRcXHUwNDNlIFxcdTA0M2QuXFx1MDQzNS5cIixcbiAgICAgIFwiXFx1MDQzZC5cXHUwNDM1LlwiXG4gICAgXSxcbiAgICBcIkZJUlNUREFZT0ZXRUVLXCI6IDAsXG4gICAgXCJNT05USFwiOiBbXG4gICAgICBcIlxcdTA0NDFcXHUwNDU2XFx1MDQ0N1xcdTA0M2RcXHUwNDRmXCIsXG4gICAgICBcIlxcdTA0M2JcXHUwNDRlXFx1MDQ0MlxcdTA0M2VcXHUwNDMzXFx1MDQzZVwiLFxuICAgICAgXCJcXHUwNDMxXFx1MDQzNVxcdTA0NDBcXHUwNDM1XFx1MDQzN1xcdTA0M2RcXHUwNDRmXCIsXG4gICAgICBcIlxcdTA0M2FcXHUwNDMyXFx1MDQ1NlxcdTA0NDJcXHUwNDNkXFx1MDQ0ZlwiLFxuICAgICAgXCJcXHUwNDQyXFx1MDQ0MFxcdTA0MzBcXHUwNDMyXFx1MDQzZFxcdTA0NGZcIixcbiAgICAgIFwiXFx1MDQ0N1xcdTA0MzVcXHUwNDQwXFx1MDQzMlxcdTA0M2RcXHUwNDRmXCIsXG4gICAgICBcIlxcdTA0M2JcXHUwNDM4XFx1MDQzZlxcdTA0M2RcXHUwNDRmXCIsXG4gICAgICBcIlxcdTA0NDFcXHUwNDM1XFx1MDQ0MFxcdTA0M2ZcXHUwNDNkXFx1MDQ0ZlwiLFxuICAgICAgXCJcXHUwNDMyXFx1MDQzNVxcdTA0NDBcXHUwNDM1XFx1MDQ0MVxcdTA0M2RcXHUwNDRmXCIsXG4gICAgICBcIlxcdTA0MzZcXHUwNDNlXFx1MDQzMlxcdTA0NDJcXHUwNDNkXFx1MDQ0ZlwiLFxuICAgICAgXCJcXHUwNDNiXFx1MDQzOFxcdTA0NDFcXHUwNDQyXFx1MDQzZVxcdTA0M2ZcXHUwNDMwXFx1MDQzNFxcdTA0MzBcIixcbiAgICAgIFwiXFx1MDQzM1xcdTA0NDBcXHUwNDQzXFx1MDQzNFxcdTA0M2RcXHUwNDRmXCJcbiAgICBdLFxuICAgIFwiU0hPUlREQVlcIjogW1xuICAgICAgXCJcXHUwNDFkXFx1MDQzNFwiLFxuICAgICAgXCJcXHUwNDFmXFx1MDQzZFwiLFxuICAgICAgXCJcXHUwNDEyXFx1MDQ0MlwiLFxuICAgICAgXCJcXHUwNDIxXFx1MDQ0MFwiLFxuICAgICAgXCJcXHUwNDI3XFx1MDQ0MlwiLFxuICAgICAgXCJcXHUwNDFmXFx1MDQ0MlwiLFxuICAgICAgXCJcXHUwNDIxXFx1MDQzMVwiXG4gICAgXSxcbiAgICBcIlNIT1JUTU9OVEhcIjogW1xuICAgICAgXCJcXHUwNDQxXFx1MDQ1NlxcdTA0NDcuXCIsXG4gICAgICBcIlxcdTA0M2JcXHUwNDRlXFx1MDQ0Mi5cIixcbiAgICAgIFwiXFx1MDQzMVxcdTA0MzVcXHUwNDQwLlwiLFxuICAgICAgXCJcXHUwNDNhXFx1MDQzMlxcdTA0NTZcXHUwNDQyLlwiLFxuICAgICAgXCJcXHUwNDQyXFx1MDQ0MFxcdTA0MzBcXHUwNDMyLlwiLFxuICAgICAgXCJcXHUwNDQ3XFx1MDQzNVxcdTA0NDBcXHUwNDMyLlwiLFxuICAgICAgXCJcXHUwNDNiXFx1MDQzOFxcdTA0M2YuXCIsXG4gICAgICBcIlxcdTA0NDFcXHUwNDM1XFx1MDQ0MFxcdTA0M2YuXCIsXG4gICAgICBcIlxcdTA0MzJcXHUwNDM1XFx1MDQ0MC5cIixcbiAgICAgIFwiXFx1MDQzNlxcdTA0M2VcXHUwNDMyXFx1MDQ0Mi5cIixcbiAgICAgIFwiXFx1MDQzYlxcdTA0MzhcXHUwNDQxXFx1MDQ0Mi5cIixcbiAgICAgIFwiXFx1MDQzM1xcdTA0NDBcXHUwNDQzXFx1MDQzNC5cIlxuICAgIF0sXG4gICAgXCJTVEFOREFMT05FTU9OVEhcIjogW1xuICAgICAgXCJcXHUwNDIxXFx1MDQ1NlxcdTA0NDdcXHUwNDM1XFx1MDQzZFxcdTA0NGNcIixcbiAgICAgIFwiXFx1MDQxYlxcdTA0NGVcXHUwNDQyXFx1MDQzOFxcdTA0MzlcIixcbiAgICAgIFwiXFx1MDQxMVxcdTA0MzVcXHUwNDQwXFx1MDQzNVxcdTA0MzdcXHUwNDM1XFx1MDQzZFxcdTA0NGNcIixcbiAgICAgIFwiXFx1MDQxYVxcdTA0MzJcXHUwNDU2XFx1MDQ0MlxcdTA0MzVcXHUwNDNkXFx1MDQ0Y1wiLFxuICAgICAgXCJcXHUwNDIyXFx1MDQ0MFxcdTA0MzBcXHUwNDMyXFx1MDQzNVxcdTA0M2RcXHUwNDRjXCIsXG4gICAgICBcIlxcdTA0MjdcXHUwNDM1XFx1MDQ0MFxcdTA0MzJcXHUwNDM1XFx1MDQzZFxcdTA0NGNcIixcbiAgICAgIFwiXFx1MDQxYlxcdTA0MzhcXHUwNDNmXFx1MDQzNVxcdTA0M2RcXHUwNDRjXCIsXG4gICAgICBcIlxcdTA0MjFcXHUwNDM1XFx1MDQ0MFxcdTA0M2ZcXHUwNDM1XFx1MDQzZFxcdTA0NGNcIixcbiAgICAgIFwiXFx1MDQxMlxcdTA0MzVcXHUwNDQwXFx1MDQzNVxcdTA0NDFcXHUwNDM1XFx1MDQzZFxcdTA0NGNcIixcbiAgICAgIFwiXFx1MDQxNlxcdTA0M2VcXHUwNDMyXFx1MDQ0MlxcdTA0MzVcXHUwNDNkXFx1MDQ0Y1wiLFxuICAgICAgXCJcXHUwNDFiXFx1MDQzOFxcdTA0NDFcXHUwNDQyXFx1MDQzZVxcdTA0M2ZcXHUwNDMwXFx1MDQzNFwiLFxuICAgICAgXCJcXHUwNDEzXFx1MDQ0MFxcdTA0NDNcXHUwNDM0XFx1MDQzNVxcdTA0M2RcXHUwNDRjXCJcbiAgICBdLFxuICAgIFwiV0VFS0VORFJBTkdFXCI6IFtcbiAgICAgIDUsXG4gICAgICA2XG4gICAgXSxcbiAgICBcImZ1bGxEYXRlXCI6IFwiRUVFRSwgZCBNTU1NIHkgJ1xcdTA0NDAnLlwiLFxuICAgIFwibG9uZ0RhdGVcIjogXCJkIE1NTU0geSAnXFx1MDQ0MCcuXCIsXG4gICAgXCJtZWRpdW1cIjogXCJkIE1NTSB5ICdcXHUwNDQwJy4gSEg6bW06c3NcIixcbiAgICBcIm1lZGl1bURhdGVcIjogXCJkIE1NTSB5ICdcXHUwNDQwJy5cIixcbiAgICBcIm1lZGl1bVRpbWVcIjogXCJISDptbTpzc1wiLFxuICAgIFwic2hvcnRcIjogXCJkZC5NTS55eSBISDptbVwiLFxuICAgIFwic2hvcnREYXRlXCI6IFwiZGQuTU0ueXlcIixcbiAgICBcInNob3J0VGltZVwiOiBcIkhIOm1tXCJcbiAgfSxcbiAgXCJOVU1CRVJfRk9STUFUU1wiOiB7XG4gICAgXCJDVVJSRU5DWV9TWU1cIjogXCJcXHUyMGI0XCIsXG4gICAgXCJERUNJTUFMX1NFUFwiOiBcIixcIixcbiAgICBcIkdST1VQX1NFUFwiOiBcIlxcdTAwYTBcIixcbiAgICBcIlBBVFRFUk5TXCI6IFtcbiAgICAgIHtcbiAgICAgICAgXCJnU2l6ZVwiOiAzLFxuICAgICAgICBcImxnU2l6ZVwiOiAzLFxuICAgICAgICBcIm1heEZyYWNcIjogMyxcbiAgICAgICAgXCJtaW5GcmFjXCI6IDAsXG4gICAgICAgIFwibWluSW50XCI6IDEsXG4gICAgICAgIFwibmVnUHJlXCI6IFwiLVwiLFxuICAgICAgICBcIm5lZ1N1ZlwiOiBcIlwiLFxuICAgICAgICBcInBvc1ByZVwiOiBcIlwiLFxuICAgICAgICBcInBvc1N1ZlwiOiBcIlwiXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBcImdTaXplXCI6IDMsXG4gICAgICAgIFwibGdTaXplXCI6IDMsXG4gICAgICAgIFwibWF4RnJhY1wiOiAyLFxuICAgICAgICBcIm1pbkZyYWNcIjogMixcbiAgICAgICAgXCJtaW5JbnRcIjogMSxcbiAgICAgICAgXCJuZWdQcmVcIjogXCItXCIsXG4gICAgICAgIFwibmVnU3VmXCI6IFwiXFx1MDBhMFxcdTAwYTRcIixcbiAgICAgICAgXCJwb3NQcmVcIjogXCJcIixcbiAgICAgICAgXCJwb3NTdWZcIjogXCJcXHUwMGEwXFx1MDBhNFwiXG4gICAgICB9XG4gICAgXVxuICB9LFxuICBcImlkXCI6IFwidWstdWFcIixcbiAgXCJsb2NhbGVJRFwiOiBcInVrX1VBXCIsXG4gIFwicGx1cmFsQ2F0XCI6IGZ1bmN0aW9uKG4sIG9wdF9wcmVjaXNpb24pIHsgIHZhciBpID0gbiB8IDA7ICB2YXIgdmYgPSBnZXRWRihuLCBvcHRfcHJlY2lzaW9uKTsgIGlmICh2Zi52ID09IDAgJiYgaSAlIDEwID09IDEgJiYgaSAlIDEwMCAhPSAxMSkgeyAgICByZXR1cm4gUExVUkFMX0NBVEVHT1JZLk9ORTsgIH0gIGlmICh2Zi52ID09IDAgJiYgaSAlIDEwID49IDIgJiYgaSAlIDEwIDw9IDQgJiYgKGkgJSAxMDAgPCAxMiB8fCBpICUgMTAwID4gMTQpKSB7ICAgIHJldHVybiBQTFVSQUxfQ0FURUdPUlkuRkVXOyAgfSAgaWYgKHZmLnYgPT0gMCAmJiBpICUgMTAgPT0gMCB8fCB2Zi52ID09IDAgJiYgaSAlIDEwID49IDUgJiYgaSAlIDEwIDw9IDkgfHwgdmYudiA9PSAwICYmIGkgJSAxMDAgPj0gMTEgJiYgaSAlIDEwMCA8PSAxNCkgeyAgICByZXR1cm4gUExVUkFMX0NBVEVHT1JZLk1BTlk7ICB9ICByZXR1cm4gUExVUkFMX0NBVEVHT1JZLk9USEVSO31cbn0pO1xufV0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuYW5ndWxhci5tb2R1bGUoXCJuZ0xvY2FsZVwiLCBbXSwgW1wiJHByb3ZpZGVcIiwgZnVuY3Rpb24oJHByb3ZpZGUpIHtcbnZhciBQTFVSQUxfQ0FURUdPUlkgPSB7WkVSTzogXCJ6ZXJvXCIsIE9ORTogXCJvbmVcIiwgVFdPOiBcInR3b1wiLCBGRVc6IFwiZmV3XCIsIE1BTlk6IFwibWFueVwiLCBPVEhFUjogXCJvdGhlclwifTtcbmZ1bmN0aW9uIGdldERlY2ltYWxzKG4pIHtcbiAgbiA9IG4gKyAnJztcbiAgdmFyIGkgPSBuLmluZGV4T2YoJy4nKTtcbiAgcmV0dXJuIChpID09IC0xKSA/IDAgOiBuLmxlbmd0aCAtIGkgLSAxO1xufVxuXG5mdW5jdGlvbiBnZXRWRihuLCBvcHRfcHJlY2lzaW9uKSB7XG4gIHZhciB2ID0gb3B0X3ByZWNpc2lvbjtcblxuICBpZiAodW5kZWZpbmVkID09PSB2KSB7XG4gICAgdiA9IE1hdGgubWluKGdldERlY2ltYWxzKG4pLCAzKTtcbiAgfVxuXG4gIHZhciBiYXNlID0gTWF0aC5wb3coMTAsIHYpO1xuICB2YXIgZiA9ICgobiAqIGJhc2UpIHwgMCkgJSBiYXNlO1xuICByZXR1cm4ge3Y6IHYsIGY6IGZ9O1xufVxuXG4kcHJvdmlkZS52YWx1ZShcIiRsb2NhbGVcIiwge1xuICBcIkRBVEVUSU1FX0ZPUk1BVFNcIjoge1xuICAgIFwiQU1QTVNcIjogW1xuICAgICAgXCJcXHUwNDM0XFx1MDQzZlwiLFxuICAgICAgXCJcXHUwNDNmXFx1MDQzZlwiXG4gICAgXSxcbiAgICBcIkRBWVwiOiBbXG4gICAgICBcIlxcdTA0M2RcXHUwNDM1XFx1MDQzNFxcdTA0NTZcXHUwNDNiXFx1MDQ0ZlwiLFxuICAgICAgXCJcXHUwNDNmXFx1MDQzZVxcdTA0M2RcXHUwNDM1XFx1MDQzNFxcdTA0NTZcXHUwNDNiXFx1MDQzZVxcdTA0M2FcIixcbiAgICAgIFwiXFx1MDQzMlxcdTA0NTZcXHUwNDMyXFx1MDQ0MlxcdTA0M2VcXHUwNDQwXFx1MDQzZVxcdTA0M2FcIixcbiAgICAgIFwiXFx1MDQ0MVxcdTA0MzVcXHUwNDQwXFx1MDQzNVxcdTA0MzRcXHUwNDMwXCIsXG4gICAgICBcIlxcdTA0NDdcXHUwNDM1XFx1MDQ0MlxcdTA0MzJcXHUwNDM1XFx1MDQ0MFwiLFxuICAgICAgXCJcXHUwNDNmXFx1MDJiY1xcdTA0NGZcXHUwNDQyXFx1MDQzZFxcdTA0MzhcXHUwNDQ2XFx1MDQ0ZlwiLFxuICAgICAgXCJcXHUwNDQxXFx1MDQ0M1xcdTA0MzFcXHUwNDNlXFx1MDQ0MlxcdTA0MzBcIlxuICAgIF0sXG4gICAgXCJFUkFOQU1FU1wiOiBbXG4gICAgICBcIlxcdTA0MzRcXHUwNDNlIFxcdTA0M2RcXHUwNDMwXFx1MDQ0OFxcdTA0M2VcXHUwNDU3IFxcdTA0MzVcXHUwNDQwXFx1MDQzOFwiLFxuICAgICAgXCJcXHUwNDNkXFx1MDQzMFxcdTA0NDhcXHUwNDNlXFx1MDQ1NyBcXHUwNDM1XFx1MDQ0MFxcdTA0MzhcIlxuICAgIF0sXG4gICAgXCJFUkFTXCI6IFtcbiAgICAgIFwiXFx1MDQzNFxcdTA0M2UgXFx1MDQzZC5cXHUwNDM1LlwiLFxuICAgICAgXCJcXHUwNDNkLlxcdTA0MzUuXCJcbiAgICBdLFxuICAgIFwiRklSU1REQVlPRldFRUtcIjogMCxcbiAgICBcIk1PTlRIXCI6IFtcbiAgICAgIFwiXFx1MDQ0MVxcdTA0NTZcXHUwNDQ3XFx1MDQzZFxcdTA0NGZcIixcbiAgICAgIFwiXFx1MDQzYlxcdTA0NGVcXHUwNDQyXFx1MDQzZVxcdTA0MzNcXHUwNDNlXCIsXG4gICAgICBcIlxcdTA0MzFcXHUwNDM1XFx1MDQ0MFxcdTA0MzVcXHUwNDM3XFx1MDQzZFxcdTA0NGZcIixcbiAgICAgIFwiXFx1MDQzYVxcdTA0MzJcXHUwNDU2XFx1MDQ0MlxcdTA0M2RcXHUwNDRmXCIsXG4gICAgICBcIlxcdTA0NDJcXHUwNDQwXFx1MDQzMFxcdTA0MzJcXHUwNDNkXFx1MDQ0ZlwiLFxuICAgICAgXCJcXHUwNDQ3XFx1MDQzNVxcdTA0NDBcXHUwNDMyXFx1MDQzZFxcdTA0NGZcIixcbiAgICAgIFwiXFx1MDQzYlxcdTA0MzhcXHUwNDNmXFx1MDQzZFxcdTA0NGZcIixcbiAgICAgIFwiXFx1MDQ0MVxcdTA0MzVcXHUwNDQwXFx1MDQzZlxcdTA0M2RcXHUwNDRmXCIsXG4gICAgICBcIlxcdTA0MzJcXHUwNDM1XFx1MDQ0MFxcdTA0MzVcXHUwNDQxXFx1MDQzZFxcdTA0NGZcIixcbiAgICAgIFwiXFx1MDQzNlxcdTA0M2VcXHUwNDMyXFx1MDQ0MlxcdTA0M2RcXHUwNDRmXCIsXG4gICAgICBcIlxcdTA0M2JcXHUwNDM4XFx1MDQ0MVxcdTA0NDJcXHUwNDNlXFx1MDQzZlxcdTA0MzBcXHUwNDM0XFx1MDQzMFwiLFxuICAgICAgXCJcXHUwNDMzXFx1MDQ0MFxcdTA0NDNcXHUwNDM0XFx1MDQzZFxcdTA0NGZcIlxuICAgIF0sXG4gICAgXCJTSE9SVERBWVwiOiBbXG4gICAgICBcIlxcdTA0MWRcXHUwNDM0XCIsXG4gICAgICBcIlxcdTA0MWZcXHUwNDNkXCIsXG4gICAgICBcIlxcdTA0MTJcXHUwNDQyXCIsXG4gICAgICBcIlxcdTA0MjFcXHUwNDQwXCIsXG4gICAgICBcIlxcdTA0MjdcXHUwNDQyXCIsXG4gICAgICBcIlxcdTA0MWZcXHUwNDQyXCIsXG4gICAgICBcIlxcdTA0MjFcXHUwNDMxXCJcbiAgICBdLFxuICAgIFwiU0hPUlRNT05USFwiOiBbXG4gICAgICBcIlxcdTA0NDFcXHUwNDU2XFx1MDQ0Ny5cIixcbiAgICAgIFwiXFx1MDQzYlxcdTA0NGVcXHUwNDQyLlwiLFxuICAgICAgXCJcXHUwNDMxXFx1MDQzNVxcdTA0NDAuXCIsXG4gICAgICBcIlxcdTA0M2FcXHUwNDMyXFx1MDQ1NlxcdTA0NDIuXCIsXG4gICAgICBcIlxcdTA0NDJcXHUwNDQwXFx1MDQzMFxcdTA0MzIuXCIsXG4gICAgICBcIlxcdTA0NDdcXHUwNDM1XFx1MDQ0MFxcdTA0MzIuXCIsXG4gICAgICBcIlxcdTA0M2JcXHUwNDM4XFx1MDQzZi5cIixcbiAgICAgIFwiXFx1MDQ0MVxcdTA0MzVcXHUwNDQwXFx1MDQzZi5cIixcbiAgICAgIFwiXFx1MDQzMlxcdTA0MzVcXHUwNDQwLlwiLFxuICAgICAgXCJcXHUwNDM2XFx1MDQzZVxcdTA0MzJcXHUwNDQyLlwiLFxuICAgICAgXCJcXHUwNDNiXFx1MDQzOFxcdTA0NDFcXHUwNDQyLlwiLFxuICAgICAgXCJcXHUwNDMzXFx1MDQ0MFxcdTA0NDNcXHUwNDM0LlwiXG4gICAgXSxcbiAgICBcIlNUQU5EQUxPTkVNT05USFwiOiBbXG4gICAgICBcIlxcdTA0MjFcXHUwNDU2XFx1MDQ0N1xcdTA0MzVcXHUwNDNkXFx1MDQ0Y1wiLFxuICAgICAgXCJcXHUwNDFiXFx1MDQ0ZVxcdTA0NDJcXHUwNDM4XFx1MDQzOVwiLFxuICAgICAgXCJcXHUwNDExXFx1MDQzNVxcdTA0NDBcXHUwNDM1XFx1MDQzN1xcdTA0MzVcXHUwNDNkXFx1MDQ0Y1wiLFxuICAgICAgXCJcXHUwNDFhXFx1MDQzMlxcdTA0NTZcXHUwNDQyXFx1MDQzNVxcdTA0M2RcXHUwNDRjXCIsXG4gICAgICBcIlxcdTA0MjJcXHUwNDQwXFx1MDQzMFxcdTA0MzJcXHUwNDM1XFx1MDQzZFxcdTA0NGNcIixcbiAgICAgIFwiXFx1MDQyN1xcdTA0MzVcXHUwNDQwXFx1MDQzMlxcdTA0MzVcXHUwNDNkXFx1MDQ0Y1wiLFxuICAgICAgXCJcXHUwNDFiXFx1MDQzOFxcdTA0M2ZcXHUwNDM1XFx1MDQzZFxcdTA0NGNcIixcbiAgICAgIFwiXFx1MDQyMVxcdTA0MzVcXHUwNDQwXFx1MDQzZlxcdTA0MzVcXHUwNDNkXFx1MDQ0Y1wiLFxuICAgICAgXCJcXHUwNDEyXFx1MDQzNVxcdTA0NDBcXHUwNDM1XFx1MDQ0MVxcdTA0MzVcXHUwNDNkXFx1MDQ0Y1wiLFxuICAgICAgXCJcXHUwNDE2XFx1MDQzZVxcdTA0MzJcXHUwNDQyXFx1MDQzNVxcdTA0M2RcXHUwNDRjXCIsXG4gICAgICBcIlxcdTA0MWJcXHUwNDM4XFx1MDQ0MVxcdTA0NDJcXHUwNDNlXFx1MDQzZlxcdTA0MzBcXHUwNDM0XCIsXG4gICAgICBcIlxcdTA0MTNcXHUwNDQwXFx1MDQ0M1xcdTA0MzRcXHUwNDM1XFx1MDQzZFxcdTA0NGNcIlxuICAgIF0sXG4gICAgXCJXRUVLRU5EUkFOR0VcIjogW1xuICAgICAgNSxcbiAgICAgIDZcbiAgICBdLFxuICAgIFwiZnVsbERhdGVcIjogXCJFRUVFLCBkIE1NTU0geSAnXFx1MDQ0MCcuXCIsXG4gICAgXCJsb25nRGF0ZVwiOiBcImQgTU1NTSB5ICdcXHUwNDQwJy5cIixcbiAgICBcIm1lZGl1bVwiOiBcImQgTU1NIHkgJ1xcdTA0NDAnLiBISDptbTpzc1wiLFxuICAgIFwibWVkaXVtRGF0ZVwiOiBcImQgTU1NIHkgJ1xcdTA0NDAnLlwiLFxuICAgIFwibWVkaXVtVGltZVwiOiBcIkhIOm1tOnNzXCIsXG4gICAgXCJzaG9ydFwiOiBcImRkLk1NLnl5IEhIOm1tXCIsXG4gICAgXCJzaG9ydERhdGVcIjogXCJkZC5NTS55eVwiLFxuICAgIFwic2hvcnRUaW1lXCI6IFwiSEg6bW1cIlxuICB9LFxuICBcIk5VTUJFUl9GT1JNQVRTXCI6IHtcbiAgICBcIkNVUlJFTkNZX1NZTVwiOiBcIlxcdTIwYjRcIixcbiAgICBcIkRFQ0lNQUxfU0VQXCI6IFwiLFwiLFxuICAgIFwiR1JPVVBfU0VQXCI6IFwiXFx1MDBhMFwiLFxuICAgIFwiUEFUVEVSTlNcIjogW1xuICAgICAge1xuICAgICAgICBcImdTaXplXCI6IDMsXG4gICAgICAgIFwibGdTaXplXCI6IDMsXG4gICAgICAgIFwibWF4RnJhY1wiOiAzLFxuICAgICAgICBcIm1pbkZyYWNcIjogMCxcbiAgICAgICAgXCJtaW5JbnRcIjogMSxcbiAgICAgICAgXCJuZWdQcmVcIjogXCItXCIsXG4gICAgICAgIFwibmVnU3VmXCI6IFwiXCIsXG4gICAgICAgIFwicG9zUHJlXCI6IFwiXCIsXG4gICAgICAgIFwicG9zU3VmXCI6IFwiXCJcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIFwiZ1NpemVcIjogMyxcbiAgICAgICAgXCJsZ1NpemVcIjogMyxcbiAgICAgICAgXCJtYXhGcmFjXCI6IDIsXG4gICAgICAgIFwibWluRnJhY1wiOiAyLFxuICAgICAgICBcIm1pbkludFwiOiAxLFxuICAgICAgICBcIm5lZ1ByZVwiOiBcIi1cIixcbiAgICAgICAgXCJuZWdTdWZcIjogXCJcXHUwMGEwXFx1MDBhNFwiLFxuICAgICAgICBcInBvc1ByZVwiOiBcIlwiLFxuICAgICAgICBcInBvc1N1ZlwiOiBcIlxcdTAwYTBcXHUwMGE0XCJcbiAgICAgIH1cbiAgICBdXG4gIH0sXG4gIFwiaWRcIjogXCJ1a1wiLFxuICBcImxvY2FsZUlEXCI6IFwidWtcIixcbiAgXCJwbHVyYWxDYXRcIjogZnVuY3Rpb24obiwgb3B0X3ByZWNpc2lvbikgeyAgdmFyIGkgPSBuIHwgMDsgIHZhciB2ZiA9IGdldFZGKG4sIG9wdF9wcmVjaXNpb24pOyAgaWYgKHZmLnYgPT0gMCAmJiBpICUgMTAgPT0gMSAmJiBpICUgMTAwICE9IDExKSB7ICAgIHJldHVybiBQTFVSQUxfQ0FURUdPUlkuT05FOyAgfSAgaWYgKHZmLnYgPT0gMCAmJiBpICUgMTAgPj0gMiAmJiBpICUgMTAgPD0gNCAmJiAoaSAlIDEwMCA8IDEyIHx8IGkgJSAxMDAgPiAxNCkpIHsgICAgcmV0dXJuIFBMVVJBTF9DQVRFR09SWS5GRVc7ICB9ICBpZiAodmYudiA9PSAwICYmIGkgJSAxMCA9PSAwIHx8IHZmLnYgPT0gMCAmJiBpICUgMTAgPj0gNSAmJiBpICUgMTAgPD0gOSB8fCB2Zi52ID09IDAgJiYgaSAlIDEwMCA+PSAxMSAmJiBpICUgMTAwIDw9IDE0KSB7ICAgIHJldHVybiBQTFVSQUxfQ0FURUdPUlkuTUFOWTsgIH0gIHJldHVybiBQTFVSQUxfQ0FURUdPUlkuT1RIRVI7fVxufSk7XG59XSk7XG4iLCIoZnVuY3Rpb24oKXtcblxuXHQndXNlIHN0cmljdCc7XG5cblx0YW5ndWxhclxuXHRcdC5tb2R1bGUoJ2FwcC5sYXlvdXQnKVxuXHRcdC5jb250cm9sbGVyKCdGb290ZXJDb250cm9sbGVyJywgRm9vdGVyQ29udHJvbGxlcik7XG5cblx0Rm9vdGVyQ29udHJvbGxlci4kaW5qZWN0ID0gWyckcm9vdFNjb3BlJ107XG5cblx0ZnVuY3Rpb24gRm9vdGVyQ29udHJvbGxlcigkcm9vdFNjb3BlKSB7XG5cblx0XHR2YXIgdm0gPSB0aGlzO1xuXHRcdC8vIHZtLmZvb3RlciA9IHRydWU7XG5cdFx0XG5cdH1cblxufSkoKTsiLCIoZnVuY3Rpb24oKXtcblxuXHQndXNlIHN0cmljdCc7XG5cblx0YW5ndWxhclxuXHRcdC5tb2R1bGUoJ2FwcC5sYXlvdXQnKVxuXHRcdC5kaXJlY3RpdmUoJ2Zvb3RlcicsIGZvb3Rlcik7XG5cblx0ZnVuY3Rpb24gZm9vdGVyKCl7XG5cblx0XHRyZXR1cm4ge1xuXHRcdFx0cmVzdHJpY3Q6ICdBRScsXG5cdFx0XHR0cmFuc2NsdWRlOiB0cnVlLFxuXHRcdFx0Y29udHJvbGxlcjogJ0Zvb3RlckNvbnRyb2xsZXInLFxuXHRcdFx0Y29udHJvbGxlckFzOiAnZm9vdGVyVm0nLFxuXHRcdFx0dGVtcGxhdGVVcmw6ICdsYXlvdXQvZm9vdGVyL2Zvb3Rlci5odG1sJ1xuXHRcdH07XG5cblx0fVxuXG59KSgpOyIsIihmdW5jdGlvbigpe1xuXG5cdCd1c2Ugc3RyaWN0JztcblxuXHRhbmd1bGFyXG5cdFx0Lm1vZHVsZSgnYXBwLmxheW91dCcpXG5cdFx0LmRpcmVjdGl2ZSgnbGFuZ05hdicsIGxhbmdOYXYpO1xuXG5cdGZ1bmN0aW9uIGxhbmdOYXYoKXtcblxuXHRcdHJldHVybiB7XG5cdFx0XHRyZXN0cmljdDogJ0FFJyxcblx0XHRcdHRyYW5zY2x1ZGU6IHRydWUsXG5cdFx0XHRjb250cm9sbGVyOiAnTGFuZ0NvbnRyb2xsZXInLFxuXHRcdFx0Y29udHJvbGxlckFzOiAnbGFuZ1ZtJyxcblx0XHRcdHRlbXBsYXRlVXJsOiAnbGF5b3V0L2xhbmduYXYvbGFuZ25hdi5odG1sJ1xuXHRcdH07XG5cblx0fVxuXG59KSgpOyIsIihmdW5jdGlvbigpe1xuXG5cdCd1c2Ugc3RyaWN0JztcblxuXHRhbmd1bGFyXG5cdFx0Lm1vZHVsZSgnYXBwLmxheW91dCcpXG5cdFx0LmNvbnRyb2xsZXIoJ0xhbmdDb250cm9sbGVyJywgTGFuZ0NvbnRyb2xsZXIpO1xuXG5cdExhbmdDb250cm9sbGVyLiRpbmplY3QgPSBbJyRsb2NhbFN0b3JhZ2UnLCAnJHJvb3RTY29wZScsICckc2NvcGUnLCAnJHRyYW5zbGF0ZScsICdhcGlTZXJ2aWNlJywgJ2F1dGhTZXJ2aWNlJywgJ3RtaER5bmFtaWNMb2NhbGUnXTtcblxuXHRmdW5jdGlvbiBMYW5nQ29udHJvbGxlcigkbG9jYWxTdG9yYWdlLCAkcm9vdFNjb3BlLCAkc2NvcGUsICR0cmFuc2xhdGUsIGFwaSwgYXV0aFNlcnZpY2UsIHRtaER5bmFtaWNMb2NhbGUpIHtcblxuXHRcdHZhciB2bSA9IHRoaXM7XG5cdFx0dm0uY2hhbmdlTGFuZ3VhZ2UgPSBjaGFuZ2VMYW5ndWFnZTtcblxuXHRcdHRtaER5bmFtaWNMb2NhbGUuc2V0KCRsb2NhbFN0b3JhZ2UuTkdfVFJBTlNMQVRFX0xBTkdfS0VZIHx8ICdlbicpO1xuXHRcdFxuXHRcdGZ1bmN0aW9uIGNoYW5nZUxhbmd1YWdlKGxhbmdLZXkpIHtcblx0XHRcdCR0cmFuc2xhdGUudXNlKGxhbmdLZXkpO1xuXHRcdFx0aWYoIWF1dGhTZXJ2aWNlLmlzTG9nZ2VkSW4oKSkge1xuXHRcdFx0XHQkcm9vdFNjb3BlLiRlbWl0KCdsYW5nLmNoYW5nZScsIHsgbGFuZzogbGFuZ0tleSB9KTtcblx0XHRcdFx0JHNjb3BlLmxheW91dFZtLnRyaWdnZXJMYW5nTWVudSgpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0YXBpLnJlcXVlc3Qoe1xuXHRcdFx0XHRcdHVybDogJ3NldEN1c3RvbWVyTGFuZycsXG5cdFx0XHRcdFx0cGFyYW1zOiB7XG5cdFx0XHRcdFx0XHRsYW5nOiBsYW5nS2V5XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9KS50aGVuKGZ1bmN0aW9uIChyZXMpe1xuXHRcdFx0XHRcdGlmKCFyZXMuZGF0YS5zdWNjZXNzKSByZXR1cm4gZXJyb3JTZXJ2aWNlLnNob3cocmVzLmRhdGEubWVzc2FnZSk7XG5cdFx0XHRcdFx0XG5cdFx0XHRcdFx0JHJvb3RTY29wZS4kZW1pdCgnbGFuZy5jaGFuZ2UnLCB7IGxhbmc6IGxhbmdLZXkgfSk7XG5cdFx0XHRcdFx0JHNjb3BlLmxheW91dFZtLnRyaWdnZXJMYW5nTWVudSgpO1xuXHRcdFx0XHR9LCBmdW5jdGlvbiAoZXJyKXtcblx0XHRcdFx0XHRlcnJvclNlcnZpY2Uuc2hvdyhlcnIpO1xuXHRcdFx0XHR9KTtcblx0XHRcdH1cblxuXHRcdFx0dG1oRHluYW1pY0xvY2FsZS5zZXQobGFuZ0tleSk7XG5cdFx0fVxuXG5cdH1cblxufSkoKTsiLCIoZnVuY3Rpb24oKXtcblxuXHQndXNlIHN0cmljdCc7XG5cblx0YW5ndWxhclxuXHRcdC5tb2R1bGUoJ2FwcC5sYXlvdXQnKVxuXHRcdC5jb250cm9sbGVyKCdUb3BiYXJDb250cm9sbGVyJywgVG9wYmFyQ29udHJvbGxlcik7XG5cblx0VG9wYmFyQ29udHJvbGxlci4kaW5qZWN0ID0gWyckcm9vdFNjb3BlJywgJyRzY29wZScsICckbG9jYWxTdG9yYWdlJywgJyR0cmFuc2xhdGUnXTtcblxuXHRmdW5jdGlvbiBUb3BiYXJDb250cm9sbGVyKCRyb290U2NvcGUsICRzY29wZSwgJGxvY2FsU3RvcmFnZSwgJHRyYW5zbGF0ZSkge1xuXG5cdFx0dmFyIHZtID0gdGhpcztcblx0XHR2bS5sYW5nID0gJGxvY2FsU3RvcmFnZS5OR19UUkFOU0xBVEVfTEFOR19LRVkgfHwgJHRyYW5zbGF0ZS51c2UoKTtcblxuXHRcdCRyb290U2NvcGUuJG9uKCdsYW5nLmNoYW5nZScsIGZ1bmN0aW9uKGUsIGRhdGEpe1xuXHRcdFx0aWYoZGF0YS5sYW5nKSB2bS5sYW5nID0gZGF0YS5sYW5nO1xuXHRcdH0pO1xuXHRcdFxuXG5cdH1cblxufSkoKTsiLCIoZnVuY3Rpb24oKXtcblxuXHQndXNlIHN0cmljdCc7XG5cblx0YW5ndWxhclxuXHRcdC5tb2R1bGUoJ2FwcC5sYXlvdXQnKVxuXHRcdC5kaXJlY3RpdmUoJ3RvcEJhcicsIHRvcEJhcik7XG5cblx0ZnVuY3Rpb24gdG9wQmFyKCl7XG5cblx0XHRyZXR1cm4ge1xuXHRcdFx0cmVzdHJpY3Q6ICdBRScsXG5cdFx0XHR0cmFuc2NsdWRlOiB0cnVlLFxuXHRcdFx0Y29udHJvbGxlcjogJ1RvcGJhckNvbnRyb2xsZXInLFxuXHRcdFx0Y29udHJvbGxlckFzOiAndG9wYmFyVm0nLFxuXHRcdFx0dGVtcGxhdGVVcmw6ICdsYXlvdXQvdG9wYmFyL3RvcGJhci5odG1sJyxcblx0XHR9O1xuXG5cdH1cblxufSkoKTsiLCIoZnVuY3Rpb24oKXtcblxuXHQndXNlIHN0cmljdCc7XG5cblx0YW5ndWxhclxuXHRcdC5tb2R1bGUoJ2FwcC5jb3JlJylcblx0XHQuZGlyZWN0aXZlKCd1bmlxdWVQcmVmaXgnLCB1bmlxdWVQcmVmaXgpO1xuXG5cdHVuaXF1ZVByZWZpeC4kaW5qZWN0ID0gWyckcScsICdicmFuY2hlc1NlcnZpY2UnLCAnZXJyb3JTZXJ2aWNlJ107XG5cdGZ1bmN0aW9uIHVuaXF1ZVByZWZpeCgkcSwgYnJhbmNoZXNTZXJ2aWNlLCBlcnJvclNlcnZpY2Upe1xuXG5cdFx0cmV0dXJuIHtcblx0XHRcdHJlc3RyaWN0OiAnQUUnLFxuXHRcdFx0cmVxdWlyZTogJ25nTW9kZWwnLFxuXHRcdFx0bGluazogbGlua1xuXHRcdH07XG5cblx0XHRmdW5jdGlvbiBsaW5rKHNjb3BlLCBlbCwgYXR0cnMsIGN0cmwpIHtcblxuXHRcdCAgICBjdHJsLiRhc3luY1ZhbGlkYXRvcnMudW5pcXVlUHJlZml4ID0gZnVuY3Rpb24obW9kZWxWYWx1ZSwgdmlld1ZhbHVlKSB7XG5cdFx0ICAgIFx0aWYgKGN0cmwuJGlzRW1wdHkobW9kZWxWYWx1ZSkpIHtcblx0XHQgICAgXHQgIC8vIGNvbnNpZGVyIGVtcHR5IG1vZGVsIHZhbGlkXG5cdFx0ICAgIFx0ICByZXR1cm4gJHEud2hlbigpO1xuXHRcdCAgICBcdH1cblxuXHRcdCAgICBcdHZhciBkZWYgPSAkcS5kZWZlcigpO1xuXG5cdFx0ICAgIFx0YnJhbmNoZXNTZXJ2aWNlLmlzUHJlZml4VW5pcXVlKG1vZGVsVmFsdWUpXG5cdFx0ICAgIFx0LnRoZW4oZnVuY3Rpb24ocmVzKXtcblx0XHQgICAgXHRcdGNvbnNvbGUubG9nKCd1bmlxdWVQcmVmaXg6ICcsIHJlcyk7XG5cdFx0ICAgIFx0ICAgIGlmKHJlcy5kYXRhLnJlc3VsdCkgZGVmLnJlc29sdmUoKTtcblx0XHQgICAgXHQgICAgZWxzZSBkZWYucmVqZWN0KCk7XG5cdFx0ICAgIFx0fSwgZnVuY3Rpb24oZXJyKXtcblx0XHQgICAgXHQgICAgZXJyb3JTZXJ2aWNlLnNob3coZXJyKTtcblx0XHQgICAgXHQgICAgZGVmLnJlamVjdCgpO1xuXHRcdCAgICBcdH0pO1xuXG5cdFx0ICAgIFx0cmV0dXJuIGRlZi5wcm9taXNlO1xuXHRcdCAgICAgICAgXG5cdFx0ICAgIH07XG5cdFx0fVxuXG5cdH1cblxufSkoKTsiLCIoZnVuY3Rpb24oKXtcblxuXHQndXNlIHN0cmljdCc7XG5cblx0YW5ndWxhclxuXHRcdC5tb2R1bGUoJ2FwcC5jb3JlJylcblx0XHQuZGlyZWN0aXZlKCd2YWxpZE5hbWUnLCB2YWxpZE5hbWUpO1xuXG5cdHZhbGlkTmFtZS4kaW5qZWN0ID0gWyckcScsICdhcGlTZXJ2aWNlJywgJ2Vycm9yU2VydmljZSddO1xuXHRmdW5jdGlvbiB2YWxpZE5hbWUoJHEsIGFwaSwgZXJyb3JTZXJ2aWNlKXtcblxuXHRcdHJldHVybiB7XG5cdFx0XHRyZXN0cmljdDogJ0FFJyxcblx0XHRcdHJlcXVpcmU6ICduZ01vZGVsJyxcblx0XHRcdGxpbms6IGxpbmtcblx0XHR9O1xuXG5cdFx0ZnVuY3Rpb24gbGluayhzY29wZSwgZWwsIGF0dHJzLCBjdHJsKSB7XG5cblx0XHQgICAgY3RybC4kYXN5bmNWYWxpZGF0b3JzLnZhbGlkTmFtZSA9IGZ1bmN0aW9uKG1vZGVsVmFsdWUsIHZpZXdWYWx1ZSkge1xuXHRcdCAgICAgICAgaWYgKGN0cmwuJGlzRW1wdHkobW9kZWxWYWx1ZSkpIHtcblx0XHQgICAgICAgICAgLy8gY29uc2lkZXIgZW1wdHkgbW9kZWwgdmFsaWRcblx0XHQgICAgICAgICAgcmV0dXJuICRxLndoZW4oKTtcblx0XHQgICAgICAgIH1cblxuXHRcdCAgICAgICAgdmFyIGRlZiA9ICRxLmRlZmVyKCk7XG5cblx0XHQgICAgICAgIGFwaS5yZXF1ZXN0KHtcblx0XHQgICAgICAgICAgICB1cmw6ICdpc05hbWVWYWxpZCcsXG5cdFx0ICAgICAgICAgICAgcGFyYW1zOiB7XG5cdFx0ICAgICAgICAgICAgICAgIG5hbWU6IG1vZGVsVmFsdWVcblx0XHQgICAgICAgICAgICB9XG5cdFx0ICAgICAgICB9KS50aGVuKGZ1bmN0aW9uKHJlcyl7XG5cdFx0ICAgICAgICBcdGNvbnNvbGUubG9nKCd2YWxpZE5hbWU6ICcsIHJlcyk7XG5cdFx0ICAgICAgICAgICAgaWYocmVzLmRhdGEucmVzdWx0KSBkZWYucmVzb2x2ZSgpO1xuXHRcdCAgICAgICAgICAgIGVsc2UgZGVmLnJlamVjdCgpO1xuXHRcdCAgICAgICAgfSwgZnVuY3Rpb24oZXJyKXtcblx0XHQgICAgICAgICAgICBlcnJvclNlcnZpY2Uuc2hvdyhlcnIpO1xuXHRcdCAgICAgICAgICAgIGRlZi5yZWplY3QoKTtcblx0XHQgICAgICAgIH0pO1xuXG5cdFx0ICAgICAgICByZXR1cm4gZGVmLnByb21pc2U7XG5cdFx0ICAgIH07XG5cdFx0fVxuXG5cdH1cblxufSkoKTsiLCIoZnVuY3Rpb24oKXtcblxuXHQndXNlIHN0cmljdCc7XG5cblx0YW5ndWxhclxuXHRcdC5tb2R1bGUoJ2FwcC5jb3JlJylcblx0XHQuZGlyZWN0aXZlKCd2YWxpZFByZWZpeCcsIHZhbGlkUHJlZml4KTtcblxuXHR2YWxpZFByZWZpeC4kaW5qZWN0ID0gWydicmFuY2hlc1NlcnZpY2UnXTtcblx0ZnVuY3Rpb24gdmFsaWRQcmVmaXgoYnJhbmNoZXNTZXJ2aWNlKXtcblxuXHRcdHJldHVybiB7XG5cdFx0XHRyZXN0cmljdDogJ0FFJyxcblx0XHRcdHJlcXVpcmU6ICduZ01vZGVsJyxcblx0XHRcdGxpbms6IGxpbmtcblx0XHR9O1xuXG5cdFx0ZnVuY3Rpb24gbGluayhzY29wZSwgZWwsIGF0dHJzLCBjdHJsKSB7XG5cblx0XHQgICAgZWwub24oJ2tleWRvd24nLCBmdW5jdGlvbiAoZSl7XG5cdFx0ICAgICAgICBpZiAoZS5hbHRLZXkgfHwgZS5rZXlDb2RlID09PSAxOCB8fCBlLmtleUNvZGUgPT09IDMyIHx8IChlLmtleUNvZGUgIT09IDE4OSAmJiBlLmtleUNvZGUgPiA5MCkpIHtcblx0XHQgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG5cdFx0ICAgICAgICB9XG5cdFx0ICAgIH0pO1xuXHRcdCAgICBcblx0XHQgICAgY3RybC4kdmFsaWRhdG9ycy52YWxpZFByZWZpeCA9IGZ1bmN0aW9uKG1vZGVsVmFsdWUsIHZpZXdWYWx1ZSkge1xuXHRcdCAgICBcdGlmIChjdHJsLiRpc0VtcHR5KG1vZGVsVmFsdWUpKSB7XG5cdFx0ICAgIFx0ICAvLyBjb25zaWRlciBlbXB0eSBtb2RlbCB2YWxpZFxuXHRcdCAgICBcdCAgcmV0dXJuIHRydWU7XG5cdFx0ICAgIFx0fVxuXG5cdFx0ICAgIFx0aWYoYnJhbmNoZXNTZXJ2aWNlLmlzUHJlZml4VmFsaWQobW9kZWxWYWx1ZSkpIHtcblx0XHQgICAgXHRcdHJldHVybiB0cnVlO1xuXHRcdCAgICBcdH0gZWxzZSB7XG5cdFx0ICAgIFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0ICAgIFx0fVxuXHRcdCAgICAgICAgXG5cdFx0ICAgIH07XG5cdFx0fVxuXG5cdH1cblxufSkoKTsiLCIoZnVuY3Rpb24oKXtcblxuXHQndXNlIHN0cmljdCc7XG5cblx0YW5ndWxhclxuXHRcdC5tb2R1bGUoJ2FwcC5sYXlvdXQnKVxuXHRcdC5kaXJlY3RpdmUoJ3NpZGVNZW51Jywgc2lkZU1lbnUpO1xuXG5cdGZ1bmN0aW9uIHNpZGVNZW51KCl7XG5cblx0XHRyZXR1cm4ge1xuXHRcdFx0cmVzdHJpY3Q6ICdBRScsXG5cdFx0XHR0cmFuc2NsdWRlOiB0cnVlLFxuXHRcdFx0Y29udHJvbGxlcjogJ1NpZGVtZW51Q29udHJvbGxlcicsXG5cdFx0XHRjb250cm9sbGVyQXM6ICdzaWRlbWVudVZtJyxcblx0XHRcdHRlbXBsYXRlVXJsOiAnbGF5b3V0L3NpZGVtZW51L3NpZGVtZW51Lmh0bWwnXG5cdFx0fTtcblxuXHR9XG5cbn0pKCk7IiwiKGZ1bmN0aW9uKCl7XG5cblx0J3VzZSBzdHJpY3QnO1xuXG5cdGFuZ3VsYXJcblx0XHQubW9kdWxlKCdhcHAubGF5b3V0Jylcblx0XHQuY29udHJvbGxlcignU2lkZW1lbnVDb250cm9sbGVyJywgU2lkZW1lbnVDb250cm9sbGVyKTtcblxuXHRTaWRlbWVudUNvbnRyb2xsZXIuJGluamVjdCA9IFsnJHJvb3RTY29wZScsICckbG9jYXRpb24nLCAnJHRyYW5zbGF0ZScsICdhdXRoU2VydmljZScsICdlcnJvclNlcnZpY2UnLCAndXRpbHNTZXJ2aWNlJywgJ2FwaVNlcnZpY2UnLCAnY3VzdG9tZXJTZXJ2aWNlJ107XG5cblx0ZnVuY3Rpb24gU2lkZW1lbnVDb250cm9sbGVyKCRyb290U2NvcGUsICRsb2NhdGlvbiwgJHRyYW5zbGF0ZSwgYXV0aFNlcnZpY2UsIGVycm9yU2VydmljZSwgdXRpbHNTZXJ2aWNlLCBhcGlTZXJ2aWNlLCBjdXN0b21lclNlcnZpY2UpIHtcblxuXHRcdHZhciB2bSA9IHRoaXM7XG5cdFx0dm0uY3VzdG9tZXIgPSB7fTtcblx0XHR2bS5jdXN0b21lckJhbGFuY2UgPSBudWxsO1xuXHRcdHZtLmxvZ291dCA9IGxvZ291dDtcblx0XHRcblx0XHRjb25zb2xlLmxvZygnU2lkZW1lbnVDb250cm9sbGVyOiAnLCB2bS5jdXN0b21lckJhbGFuY2UpO1xuXHRcdGNvbnNvbGUubG9nKCdTaWRlbWVudUNvbnRyb2xsZXIgaXNMb2dnZWRJbjogJywgYXV0aFNlcnZpY2UuaXNMb2dnZWRJbigpKTtcblxuXHRcdCRyb290U2NvcGUuJG9uKCdjdXN0b21lci51cGRhdGUnLCBmdW5jdGlvbihldmVudCwgY3VzdG9tZXIpIHtcblx0XHRcdHZtLmN1c3RvbWVyID0gY3VzdG9tZXI7XG5cdFx0fSk7XG5cblx0XHQkcm9vdFNjb3BlLiRvbignYXV0aC5sb2dpbicsIGZ1bmN0aW9uKCkge1xuXHRcdFx0Ly8gZ2V0Q3VzdG9tZXJCYWxhbmNlKCk7XG5cdFx0XHRnZXRDdXN0b21lcigpO1xuXHRcdH0pO1xuXG5cdFx0aWYoYXV0aFNlcnZpY2UuaXNMb2dnZWRJbigpKSB7XG5cdFx0XHQvLyBnZXRDdXN0b21lckJhbGFuY2UoKTtcblx0XHRcdGdldEN1c3RvbWVyKCk7XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gc3RyaW5nVG9GaXhlZChzdHJpbmcpIHtcblx0XHRcdHJldHVybiB1dGlsc1NlcnZpY2Uuc3RyaW5nVG9GaXhlZChzdHJpbmcsIDIpO1xuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIGdldEN1c3RvbWVyKCkge1xuXG5cdFx0XHRhcGlTZXJ2aWNlLnJlcXVlc3Qoe1xuXHRcdFx0XHR1cmw6IFwiZ2V0Q3VzdG9tZXJcIlxuXHRcdFx0fSkudGhlbihmdW5jdGlvbihyZXMpe1xuXHRcdFx0XHRpZighcmVzLmRhdGEuc3VjY2VzcykgcmV0dXJuIGVycm9yU2VydmljZS5zaG93KHJlcy5kYXRhLm1lc3NhZ2UpO1xuXHRcdFx0XHRcblx0XHRcdFx0dm0uY3VzdG9tZXIgPSByZXMuZGF0YS5yZXN1bHQ7XG5cdFx0XHRcdC8vIHZtLmN1c3RvbWVyLmJhbGFuY2UgPSByZXMuZGF0YS5yZXN1bHQ7XG5cdFx0XHRcdHZtLmN1c3RvbWVyQmFsYW5jZSA9IHN0cmluZ1RvRml4ZWQodm0uY3VzdG9tZXIuYmFsYW5jZSk7XG5cdFx0XHRcdGN1c3RvbWVyU2VydmljZS5zZXRDdXN0b21lcih2bS5jdXN0b21lcik7XG5cdFx0XHRcdGN1c3RvbWVyU2VydmljZS5zZXRDdXN0b21lckJhbGFuY2Uodm0uY3VzdG9tZXIuYmFsYW5jZSk7XG5cdFx0XHR9LCBmdW5jdGlvbihlcnIpe1xuXHRcdFx0XHRlcnJvclNlcnZpY2Uuc2hvdyhlcnIpO1xuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0Ly8gZnVuY3Rpb24gZ2V0Q3VzdG9tZXJCYWxhbmNlKCkge1xuXHRcdC8vIFx0YXBpU2VydmljZS5yZXF1ZXN0KHtcblx0XHQvLyBcdFx0dXJsOiBcImdldEN1c3RvbWVyQmFsYW5jZVwiXG5cdFx0Ly8gXHR9KS50aGVuKGZ1bmN0aW9uKHJlcyl7XG5cdFx0Ly8gXHRcdGlmKCFyZXMuZGF0YS5zdWNjZXNzKSByZXR1cm4gZXJyb3JTZXJ2aWNlLnNob3cocmVzLmRhdGEubWVzc2FnZSk7XG5cdFx0XHRcdFxuXHRcdC8vIFx0XHR2bS5jdXN0b21lci5iYWxhbmNlID0gcmVzLmRhdGEucmVzdWx0O1xuXHRcdC8vIFx0XHR2bS5jdXN0b21lckJhbGFuY2UgPSBzdHJpbmdUb0ZpeGVkKHJlcy5kYXRhLnJlc3VsdCk7XG5cdFx0Ly8gXHRcdGN1c3RvbWVyU2VydmljZS5zZXRDdXN0b21lckJhbGFuY2UocmVzLmRhdGEucmVzdWx0KTtcblx0XHQvLyBcdH0sIGZ1bmN0aW9uKGVycil7XG5cdFx0Ly8gXHRcdGVycm9yU2VydmljZS5zaG93KGVycik7XG5cdFx0Ly8gXHR9KTtcblx0XHQvLyB9XG5cblx0XHRmdW5jdGlvbiBsb2dvdXQoKSB7XG5cdFx0XHRhdXRoU2VydmljZS5sb2dvdXQoKTtcblx0XHR9XG5cblx0fVxuXG59KSgpOyJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==
