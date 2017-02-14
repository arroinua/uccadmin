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
				vm.totalCharges = vm.charges.length ? (vm.startBalance - vm.customer.balance) : null;
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
				maxusers: minUsers
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

			if(vm.selectedPlan.planId === 'trial' || vm.selectedPlan.planId === 'free') {
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
					if(item.planId === 'trial' || item.planId === 'free') {
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
				billingCyrcles;


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
			billingCyrcles = branchSetts._subscription.billingCyrcles;

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
			vm.instance.result.storelimit = convertBytesFilter(vm.totalStorage, 'GB', 'Byte');
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
(function(){

	'use strict';

	angular
		.module('app.core')
		.factory('apiService', apiService);

	apiService.$inject = ['$http', 'appConfig'];

	function apiService($http, appConfig){

		var baseUrl = appConfig.server + '/api';
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
			return $http.post(baseUrl + '/api/signup', data);
		}

		function login(data) {
			return $http.post(baseUrl + '/api/login', data);
		}

		function requestPasswordReset(data) {
			return  $http.post(baseUrl + '/api/requestPasswordReset', data);
		}

		function resetPassword(data) {
			return $http.post(baseUrl + '/api/resetPassword', data);
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
			$http.get('/api/loggedin').then(function(res){
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

		$rootScope.$on('customer.update', function(event, customer) {
			vm.customer = customer;
		});

		$rootScope.$on('auth.login', function() {
			getCustomerBalance();
		});

		function stringToFixed(string) {
			return utilsService.stringToFixed(string, 2);
		}

		function getCustomerBalance() {
			apiService.request({
				url: "getCustomerBalance"
			}).then(function(res){
				if(!res.data.success) return errorService.show(res.data.message);
				
				vm.customer.balance = res.data.result;
				vm.customerBalance = stringToFixed(res.data.result);
				customerService.setCustomerBalance(res.data.result);
			}, function(err){
				errorService.show(err);
			});
		}

		function logout() {
			authService.logout();
		}

	}

})();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC5qcyIsImFwcC5hdXRoLmpzIiwiYXBwLmJpbGxpbmcuanMiLCJhcHAuY29uZmlnLmpzIiwiYXBwLmNvcmUuanMiLCJhcHAuZGFzaGJvYXJkLmpzIiwiYXBwLmluc3RhbmNlLmpzIiwiYXBwLmxheW91dC5qcyIsImFwcC5wYXltZW50LmpzIiwiYXBwLnByb2ZpbGUuanMiLCJhcHAucm91dGVzLmpzIiwiYmlsbGluZy9iaWxsaW5nLmNvbnRyb2xsZXIuanMiLCJiaWxsaW5nL2JpbGxpbmcucm91dGUuanMiLCJhdXRoL2F1dGguY29udHJvbGxlci5qcyIsImF1dGgvYXV0aC5yb3V0ZS5qcyIsImNvbXBvbmVudHMvaXMtcGFzc3dvcmQuZGlyZWN0aXZlLmpzIiwiY29tcG9uZW50cy9wYXNzd29yZC5kaXJlY3RpdmUuanMiLCJmaWx0ZXJzL2ZpbHRlcnMuanMiLCJkYXNoYm9hcmQvZGFzaC1pbnN0YW5jZS5jb250cm9sbGVyLmpzIiwiZGFzaGJvYXJkL2Rhc2gtaW5zdGFuY2UuZGlyZWN0aXZlLmpzIiwiZGFzaGJvYXJkL2Rhc2hib2FyZC5jb250cm9sbGVyLmpzIiwiZGFzaGJvYXJkL2Rhc2hib2FyZC5yb3V0ZS5qcyIsImluc3RhbmNlL2luc3RhbmNlLXN1bW1hcnkuZGlyZWN0aXZlLmpzIiwiaW5zdGFuY2UvaW5zdGFuY2UuY29udHJvbGxlci5qcyIsImluc3RhbmNlL2luc3RhbmNlLnJvdXRlLmpzIiwiaW5zdGFuY2UvcGxhbi1pdGVtLmRpcmVjdGl2ZS5qcyIsImluc3RhbmNlL3NlcnZlci1pdGVtLmRpcmVjdGl2ZS5qcyIsImxheW91dC9jb250ZW50LmNvbnRyb2xsZXIuanMiLCJsYXlvdXQvbGF5b3V0LmNvbnRyb2xsZXIuanMiLCJwYXltZW50L21ldGhvZC1pdGVtLmRpcmVjdGl2ZS5qcyIsInBheW1lbnQvcGF5bWVudC5jb250cm9sbGVyLmpzIiwicGF5bWVudC9wYXltZW50LnJvdXRlLmpzIiwicHJvZmlsZS9wcm9maWxlLmNvbnRyb2xsZXIuanMiLCJwcm9maWxlL3Byb2ZpbGUucm91dGUuanMiLCJzZXJ2aWNlcy9hcGkuanMiLCJzZXJ2aWNlcy9hdXRoLmpzIiwic2VydmljZXMvYnJhbmNoZXMuanMiLCJzZXJ2aWNlcy9jYXJ0LmpzIiwic2VydmljZXMvY3VzdG9tZXJTZXJ2aWNlLmpzIiwic2VydmljZXMvZXJyb3IuanMiLCJzZXJ2aWNlcy9ub3RpZnkuanMiLCJzZXJ2aWNlcy9wb29sU2l6ZS5qcyIsInNlcnZpY2VzL3NwaW5uZXIuanMiLCJzZXJ2aWNlcy9zdG9yYWdlLmpzIiwic2VydmljZXMvdXRpbHNTZXJ2aWNlLmpzIiwiY29tcG9uZW50cy9zcGlubmVyL3NwaW5uZXIuY29udHJvbGxlci5qcyIsImNvbXBvbmVudHMvc3Bpbm5lci9zcGlubmVyLmRpcmVjdGl2ZS5qcyIsImNvbXBvbmVudHMvZGF0ZS1waWNrZXIvZGF0ZS1waWNrZXIuY29udHJvbGxlci5qcyIsImNvbXBvbmVudHMvZGF0ZS1waWNrZXIvZGF0ZS1waWNrZXIuZGlyZWN0aXZlLmpzIiwiaW5zdGFuY2UvdmFsaWRhdGlvbi1kaXJlY3RpdmVzL3VuaXF1ZS1wcmVmaXguanMiLCJpbnN0YW5jZS92YWxpZGF0aW9uLWRpcmVjdGl2ZXMvdmFsaWQtbmFtZS5qcyIsImluc3RhbmNlL3ZhbGlkYXRpb24tZGlyZWN0aXZlcy92YWxpZC1wcmVmaXguanMiLCJsYXlvdXQvZm9vdGVyL2Zvb3Rlci5jb250cm9sbGVyLmpzIiwibGF5b3V0L2Zvb3Rlci9mb290ZXIuZGlyZWN0aXZlLmpzIiwibGF5b3V0L2xhbmduYXYvbGFuZy1uYXYuZGlyZWN0aXZlLmpzIiwibGF5b3V0L2xhbmduYXYvbGFuZy5jb250cm9sbGVyLmpzIiwibGliL2kxOG4vYW5ndWxhci1sb2NhbGVfZW4uanMiLCJsaWIvaTE4bi9hbmd1bGFyLWxvY2FsZV9ydS1ydS5qcyIsImxpYi9pMThuL2FuZ3VsYXItbG9jYWxlX3J1LmpzIiwibGliL2kxOG4vYW5ndWxhci1sb2NhbGVfdWstdWEuanMiLCJsaWIvaTE4bi9hbmd1bGFyLWxvY2FsZV91ay5qcyIsImxheW91dC90b3BiYXIvdG9wLWJhci5jb250cm9sbGVyLmpzIiwibGF5b3V0L3RvcGJhci90b3AtYmFyLmRpcmVjdGl2ZS5qcyIsImxheW91dC9zaWRlbWVudS9zaWRlLW1lbnUuZGlyZWN0aXZlLmpzIiwibGF5b3V0L3NpZGVtZW51L3NpZGVtZW51LmNvbnRyb2xsZXIuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ1ZBO0FBQ0E7QUFDQTtBQ0ZBO0FBQ0E7QUFDQTtBQ0ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN2REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNUQTtBQUNBO0FBQ0E7QUNGQTtBQUNBO0FBQ0E7QUNGQTtBQUNBO0FBQ0E7QUNGQTtBQUNBO0FBQ0E7QUNGQTtBQUNBO0FBQ0E7QUNGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDL0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDeEhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDbEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzNHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzlCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN6Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDbkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDWkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3ZHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDekJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUMxREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNsQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUM5QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDcGZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDbEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDeEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDeEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2pCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDcERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDeEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDOUtBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDbEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2xEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2xCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3JCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDOUZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNwSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3pFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDeENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzdCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUM3QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDcEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzlEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN2QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNqRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzdEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDckNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDckJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNwREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDNUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQy9DQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNqQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDcEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3BCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDM0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQy9JQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUMvSUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDL0lBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQy9JQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUMvSUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3RCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNwQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDcEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImFsbC5qcyIsInNvdXJjZXNDb250ZW50IjpbImFuZ3VsYXIubW9kdWxlKCdhcHAnLCBbXG5cdCdhcHAuY29yZScsXG5cdCdhcHAucm91dGVzJyxcblx0J2FwcC5sYXlvdXQnLFxuXHQnYXBwLmF1dGgnLFxuXHQnYXBwLmJpbGxpbmcnLFxuXHQnYXBwLmRhc2hib2FyZCcsXG5cdCdhcHAuaW5zdGFuY2UnLFxuXHQnYXBwLnBheW1lbnQnLFxuXHQnYXBwLnByb2ZpbGUnXG5dKTsiLCJhbmd1bGFyLm1vZHVsZSgnYXBwLmF1dGgnLCBbXG5cdCdhcHAuY29yZSdcbl0pOyIsImFuZ3VsYXIubW9kdWxlKCdhcHAuYmlsbGluZycsIFtcblx0J2FwcC5jb3JlJ1xuXSk7IiwiYW5ndWxhci5tb2R1bGUoJ2FwcCcpXG4udmFsdWUoJ21vbWVudCcsIG1vbWVudClcbi5jb25zdGFudCgnYXBwQ29uZmlnJywge1xuXHRzZXJ2ZXI6IHdpbmRvdy5sb2NhdGlvbi5wcm90b2NvbCArICcvLycgKyB3aW5kb3cubG9jYXRpb24uaG9zdFxufSlcbi5jb25maWcoWyckaHR0cFByb3ZpZGVyJywgZnVuY3Rpb24oJGh0dHBQcm92aWRlcikge1xuXHQkaHR0cFByb3ZpZGVyLmludGVyY2VwdG9ycy5wdXNoKFsnJHEnLCAnJGxvY2F0aW9uJywgJyRsb2NhbFN0b3JhZ2UnLCAnY3VzdG9tZXJTZXJ2aWNlJywgZnVuY3Rpb24oJHEsICRsb2NhdGlvbiwgJGxvY2FsU3RvcmFnZSwgY3VzdG9tZXJTZXJ2aWNlKSB7XG4gICAgICAgIHJldHVybiB7XG5cdFx0XHRyZXF1ZXN0OiBmdW5jdGlvbihjb25maWcpIHtcblx0XHRcdFx0Y29uZmlnLmhlYWRlcnMgPSBjb25maWcuaGVhZGVycyB8fCB7fTtcblx0XHRcdFx0aWYgKCRsb2NhbFN0b3JhZ2UudG9rZW4pIHtcblx0XHRcdFx0XHRjb25maWcuaGVhZGVyc1sneC1hY2Nlc3MtdG9rZW4nXSA9ICRsb2NhbFN0b3JhZ2UudG9rZW47XG5cdFx0XHRcdH1cblx0XHRcdFx0cmV0dXJuIGNvbmZpZztcblx0XHRcdH0sXG5cdFx0XHRyZXNwb25zZUVycm9yOiBmdW5jdGlvbihlcnJvcikge1xuXHRcdFx0XHRpZihlcnJvci5zdGF0dXMgPT09IDQwMSB8fCBlcnJvci5zdGF0dXMgPT09IDQwMykge1xuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdyZXNwb25zZUVycm9yOiAnLCAkbG9jYXRpb24ucGF0aCgpLCBlcnJvci5zdGF0dXMsIGVycm9yKTtcblx0XHRcdFx0XHQkbG9jYXRpb24ucGF0aCgnL2xvZ2luJyk7XG5cdFx0XHRcdH1cblx0XHRcdFx0cmV0dXJuICRxLnJlamVjdChlcnJvcik7XG5cdFx0XHR9LFxuXHRcdFx0cmVzcG9uc2U6IGZ1bmN0aW9uKHJlc3BvbnNlKXtcblx0XHRcdFx0aWYocmVzcG9uc2UuZGF0YS50b2tlbikge1xuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdyZXNwb25zZTogJywgcmVzcG9uc2UuZGF0YSk7XG5cdFx0XHRcdFx0JGxvY2FsU3RvcmFnZS50b2tlbiA9IHJlc3BvbnNlLmRhdGEudG9rZW47XG5cdFx0XHRcdH1cblx0XHRcdFx0Ly8gaWYocmVzcG9uc2UuZGF0YS5jdXN0b21lciAmJiAhY3VzdG9tZXJTZXJ2aWNlLmdldEN1c3RvbWVyKCkpe1xuXHRcdFx0XHQvLyBcdGN1c3RvbWVyU2VydmljZS5zZXRDdXN0b21lcihyZXNwb25zZS5kYXRhLmN1c3RvbWVyKTtcblx0XHRcdFx0Ly8gfVxuXHRcdFx0XHRyZXR1cm4gcmVzcG9uc2U7XG5cdFx0XHR9XG4gICAgICAgIH07XG5cdH1dKTtcbn1dKVxuLmNvbmZpZyhbJ25vdGlmaWNhdGlvbnNDb25maWdQcm92aWRlcicsIGZ1bmN0aW9uIChub3RpZmljYXRpb25zQ29uZmlnUHJvdmlkZXIpIHtcbiAgICBub3RpZmljYXRpb25zQ29uZmlnUHJvdmlkZXIuc2V0QXV0b0hpZGUodHJ1ZSk7XG4gICAgbm90aWZpY2F0aW9uc0NvbmZpZ1Byb3ZpZGVyLnNldEhpZGVEZWxheSg1MDAwKTtcbiAgICBub3RpZmljYXRpb25zQ29uZmlnUHJvdmlkZXIuc2V0QXV0b0hpZGVBbmltYXRpb24oJ2ZhZGVPdXROb3RpZmljYXRpb25zJyk7XG4gICAgbm90aWZpY2F0aW9uc0NvbmZpZ1Byb3ZpZGVyLnNldEF1dG9IaWRlQW5pbWF0aW9uRGVsYXkoNTAwKTtcblx0bm90aWZpY2F0aW9uc0NvbmZpZ1Byb3ZpZGVyLnNldEFjY2VwdEhUTUwodHJ1ZSk7XG59XSlcbi5jb25maWcoWyckdHJhbnNsYXRlUHJvdmlkZXInLCBmdW5jdGlvbigkdHJhbnNsYXRlUHJvdmlkZXIpIHtcblx0JHRyYW5zbGF0ZVByb3ZpZGVyLnVzZVN0YXRpY0ZpbGVzTG9hZGVyKHtcblx0XHRwcmVmaXg6ICcuL2Fzc2V0cy90cmFuc2xhdGlvbnMvbG9jYWxlLScsXG5cdFx0c3VmZml4OiAnLmpzb24nXG5cdH0pO1xuXHQkdHJhbnNsYXRlUHJvdmlkZXIucHJlZmVycmVkTGFuZ3VhZ2UoJ2VuJyk7XG5cdCR0cmFuc2xhdGVQcm92aWRlci5mYWxsYmFja0xhbmd1YWdlKCdlbicpO1xuXHQkdHJhbnNsYXRlUHJvdmlkZXIudXNlU3RvcmFnZSgnc3RvcmFnZVNlcnZpY2UnKTtcblx0JHRyYW5zbGF0ZVByb3ZpZGVyLnVzZVNhbml0aXplVmFsdWVTdHJhdGVneSgnc2FuaXRpemVQYXJhbWV0ZXJzJyk7XG5cdC8vICR0cmFuc2xhdGVQcm92aWRlci51c2VTYW5pdGl6ZVZhbHVlU3RyYXRlZ3koJ2VzY2FwZScpO1xufV0pXG4uY29uZmlnKFsndG1oRHluYW1pY0xvY2FsZVByb3ZpZGVyJywgZnVuY3Rpb24odG1oRHluYW1pY0xvY2FsZVByb3ZpZGVyKSB7XG5cdHRtaER5bmFtaWNMb2NhbGVQcm92aWRlci5sb2NhbGVMb2NhdGlvblBhdHRlcm4oJy4vbGliL2kxOG4vYW5ndWxhci1sb2NhbGVfe3tsb2NhbGV9fS5qcycpO1xufV0pOyIsImFuZ3VsYXIubW9kdWxlKCdhcHAuY29yZScsIFtcblx0Ly8gJ25nQW5pbWF0ZScsXG5cdCduZ01lc3NhZ2VzJyxcblx0J25nU3RvcmFnZScsXG5cdCduZ1Nhbml0aXplJyxcblx0J3Bhc2NhbHByZWNodC50cmFuc2xhdGUnLFxuXHQnbmdOb3RpZmljYXRpb25zQmFyJyxcblx0J3RtaC5keW5hbWljTG9jYWxlJyxcblx0J3VpLmJvb3RzdHJhcCdcbl0pOyIsImFuZ3VsYXIubW9kdWxlKCdhcHAuZGFzaGJvYXJkJywgW1xuXHQnYXBwLmNvcmUnXG5dKTsiLCJhbmd1bGFyLm1vZHVsZSgnYXBwLmluc3RhbmNlJywgW1xuXHQnYXBwLmNvcmUnXG5dKTsiLCJhbmd1bGFyLm1vZHVsZSgnYXBwLmxheW91dCcsIFtcblx0J2FwcC5jb3JlJ1xuXSk7IiwiYW5ndWxhci5tb2R1bGUoJ2FwcC5wYXltZW50JywgW1xuXHQnYXBwLmNvcmUnXG5dKTsiLCJhbmd1bGFyLm1vZHVsZSgnYXBwLnByb2ZpbGUnLCBbXG5cdCdhcHAuY29yZSdcbl0pOyIsImFuZ3VsYXIubW9kdWxlKCdhcHAucm91dGVzJywgW1xuXHQnbmdSb3V0ZSdcbl0pXG4uY29uZmlnKFsnJHJvdXRlUHJvdmlkZXInLCBmdW5jdGlvbigkcm91dGVQcm92aWRlcil7XG5cblx0ZnVuY3Rpb24gdmVyaWZ5VXNlcigkcSwgJGh0dHAsICRsb2NhdGlvbikge1xuXHRcdHZhciBkZWZlcnJlZCA9ICRxLmRlZmVyKCk7IC8vIE1ha2UgYW4gQUpBWCBjYWxsIHRvIGNoZWNrIGlmIHRoZSB1c2VyIGlzIGxvZ2dlZCBpblxuXHRcdHZhciB2ZXJpZmllZCA9IGZhbHNlO1xuXHRcdCRodHRwLmdldCgnL2FwaS92ZXJpZnk/b3R0PScrJGxvY2F0aW9uLnNlYXJjaCgpLm90dCkudGhlbihmdW5jdGlvbiAocmVzKXtcblx0XHRcdGlmIChyZXMuc3VjY2Vzcyl7IC8vIEF1dGhlbnRpY2F0ZWRcblx0XHRcdFx0ZGVmZXJyZWQucmVzb2x2ZSgpO1xuXHRcdFx0XHR2ZXJpZmllZCA9IHRydWU7XG5cdFx0XHR9IGVsc2UgeyAvLyBOb3QgQXV0aGVudGljYXRlZFxuXHRcdFx0XHRkZWZlcnJlZC5yZWplY3QoKTtcblx0XHRcdH1cblx0XHRcdCRsb2NhdGlvbi51cmwoJy9hY2NvdW50LXZlcmlmaWNhdGlvbj92ZXJpZmllZD0nK3ZlcmlmaWVkKTtcblx0XHR9LCBmdW5jdGlvbiAoZXJyKXtcblx0XHRcdGNvbnNvbGUubG9nKGVycik7XG5cdFx0fSk7XG5cdFx0cmV0dXJuIGRlZmVycmVkLnByb21pc2U7XG5cdH1cblxuXHQkcm91dGVQcm92aWRlci5cblx0XHR3aGVuKCcvdmVyaWZ5Jywge1xuXHRcdFx0cmVzb2x2ZToge1xuXHRcdFx0XHR2ZXJpZmllZDogdmVyaWZ5VXNlclxuXHRcdFx0fVxuXHRcdH0pLlxuXHRcdG90aGVyd2lzZSh7XG5cdFx0XHRyZWRpcmVjdFRvOiAnL2Rhc2hib2FyZCdcblx0XHR9KTtcbn1dKTsiLCIoZnVuY3Rpb24oKXtcblxuXHQndXNlIHN0cmljdCc7XG5cblx0YW5ndWxhclxuXHRcdC5tb2R1bGUoJ2FwcC5iaWxsaW5nJylcblx0XHQuY29udHJvbGxlcignQmlsbGluZ0NvbnRyb2xsZXInLCBCaWxsaW5nQ29udHJvbGxlcik7XG5cblx0QmlsbGluZ0NvbnRyb2xsZXIuJGluamVjdCA9IFsnJHRyYW5zbGF0ZScsICd1dGlsc1NlcnZpY2UnLCAnYXBpU2VydmljZScsICdtb21lbnQnLCAnY3VzdG9tZXJTZXJ2aWNlJywgJ3NwaW5uZXJTZXJ2aWNlJywgJ2Vycm9yU2VydmljZSddO1xuXG5cdGZ1bmN0aW9uIEJpbGxpbmdDb250cm9sbGVyKCR0cmFuc2xhdGUsIHV0aWxzU2VydmljZSwgYXBpLCBtb21lbnQsIGN1c3RvbWVyU2VydmljZSwgc3Bpbm5lciwgZXJyb3JTZXJ2aWNlKSB7XG5cblx0XHR2YXIgdm0gPSB0aGlzO1xuXHRcdC8vIHZhciB0cmFuc2FjdGlvbnMgPSBbXTtcblxuXHRcdHZtLmN1c3RvbWVyID0gY3VzdG9tZXJTZXJ2aWNlLmdldEN1c3RvbWVyKCk7XG5cdFx0dm0uY3VycmVudEJhbGFuY2UgPSBudWxsO1xuXHRcdHZtLnRyYW5zYWN0aW9ucyA9IFtdO1xuXHRcdHZtLmNoYXJnZXMgPSBbXTtcblx0XHR2bS5zdGFydEJhbGFuY2UgPSAnJztcblx0XHR2bS5sYXN0QmlsbGluZ0RhdGUgPSBudWxsO1xuXHRcdHZtLnN0YXJ0RGF0ZSA9IG1vbWVudCgpLnN1YnRyYWN0KDcsICdkYXlzJykudG9EYXRlKCk7XG5cdFx0dm0uZW5kRGF0ZSA9IG1vbWVudCgpLmVuZE9mKCdkYXknKS50b0RhdGUoKTtcblx0XHR2bS5kYXRlRm9ybWF0ID0gJ2RkIE1NTU0geXl5eSc7XG5cdFx0dm0uc3RhcnREYXRlT3B0aW9ucyA9IHtcblx0XHRcdC8vIG1pbkRhdGU6IG5ldyBEYXRlKDIwMTAsIDEsIDEpLFxuXHRcdFx0Ly8gbWF4RGF0ZTogbmV3IERhdGUodm0uZW5kRGF0ZSksXG5cdFx0XHRzaG93V2Vla3M6IGZhbHNlXG5cdFx0fTtcblx0XHR2bS5lbmREYXRlT3B0aW9ucyA9IHtcblx0XHRcdG1pbkRhdGU6IG5ldyBEYXRlKHZtLnN0YXJ0RGF0ZSksXG5cdFx0XHRzaG93V2Vla3M6IGZhbHNlXG5cdFx0fTtcblx0XHR2bS5wYXJzZURhdGUgPSBmdW5jdGlvbihkYXRlKXtcblx0XHRcdHJldHVybiB1dGlsc1NlcnZpY2UucGFyc2VEYXRlKGRhdGUpO1xuXHRcdH07XG5cdFx0dm0uc3VtVXAgPSBzdW1VcDtcblx0XHR2bS5maW5kUmVjb3JkcyA9IGZpbmRSZWNvcmRzO1xuXG5cdFx0Y29uc29sZS5sb2coJ2N1c3RvbWVyOiAnLCB2bS5jdXN0b21lcik7XG5cblx0XHRzcGlubmVyLnNob3coJ21haW4tc3Bpbm5lcicpO1xuXG5cdFx0Z2V0Q3VzdG9tZXJCYWxhbmNlKCk7XG5cdFx0ZmluZFJlY29yZHMoKTtcblxuXHRcdGZ1bmN0aW9uIGZpbmRSZWNvcmRzKCl7XG5cdFx0XHRnZXRUcmFuc2FjdGlvbnMoKTtcblx0XHR9XG5cblx0XHRmdW5jdGlvbiBnZXRUcmFuc2FjdGlvbnMoKSB7XG5cdFx0XHRhcGkucmVxdWVzdCh7XG5cdFx0XHRcdHVybDogXCJ0cmFuc2FjdGlvbnNcIixcblx0XHRcdFx0cGFyYW1zOiB7XG5cdFx0XHRcdFx0c3RhcnQ6IERhdGUucGFyc2Uodm0uc3RhcnREYXRlKSxcblx0XHRcdFx0XHRlbmQ6IERhdGUucGFyc2Uodm0uZW5kRGF0ZSlcblx0XHRcdFx0fVxuXHRcdFx0fSkudGhlbihmdW5jdGlvbihyZXMpe1xuXHRcdFx0XHRpZighcmVzLmRhdGEuc3VjY2VzcykgcmV0dXJuIGVycm9yU2VydmljZS5zaG93KHJlcy5kYXRhLm1lc3NhZ2UpO1xuXHRcdFx0XHRjb25zb2xlLmxvZygnVHJhbnNhY3Rpb25zOiAnLCByZXMuZGF0YS5yZXN1bHQpO1xuXG5cdFx0XHRcdHZtLnRyYW5zYWN0aW9ucyA9IHJlcy5kYXRhLnJlc3VsdDtcblxuXHRcdFx0XHRyZXR1cm4gYXBpLnJlcXVlc3Qoe1xuXHRcdFx0XHRcdHVybDogXCJjaGFyZ2VzXCIsXG5cdFx0XHRcdFx0cGFyYW1zOiB7XG5cdFx0XHRcdFx0XHRzdGFydDogRGF0ZS5wYXJzZSh2bS5zdGFydERhdGUpLFxuXHRcdFx0XHRcdFx0ZW5kOiBEYXRlLnBhcnNlKHZtLmVuZERhdGUpXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9KTtcblx0XHRcdH0pLnRoZW4oZnVuY3Rpb24ocmVzKSB7XG5cdFx0XHRcdGlmKCFyZXMuZGF0YS5zdWNjZXNzKSByZXR1cm4gZXJyb3JTZXJ2aWNlLnNob3cocmVzLmRhdGEubWVzc2FnZSk7XG5cdFx0XHRcdGNvbnNvbGUubG9nKCdDaGFyZ2VzOiAnLCByZXMuZGF0YS5yZXN1bHQpO1xuXHRcdFx0XHRcblx0XHRcdFx0dm0uY2hhcmdlcyA9IHJlcy5kYXRhLnJlc3VsdDtcblx0XHRcdFx0dm0uc3RhcnRCYWxhbmNlID0gdm0uY2hhcmdlcy5sZW5ndGggPyB2bS5jaGFyZ2VzW3ZtLmNoYXJnZXMubGVuZ3RoLTFdLnN0YXJ0QmFsYW5jZSA6IG51bGw7XG5cdFx0XHRcdHZtLmxhc3RCaWxsaW5nRGF0ZSA9IHZtLmNoYXJnZXMubGVuZ3RoID8gdm0uY2hhcmdlc1swXS50byA6IG51bGw7XG5cdFx0XHRcdHZtLnRvdGFsQ2hhcmdlcyA9IHZtLmNoYXJnZXMubGVuZ3RoID8gKHZtLnN0YXJ0QmFsYW5jZSAtIHZtLmN1c3RvbWVyLmJhbGFuY2UpIDogbnVsbDtcblx0XHRcdFx0Ly8gdm0udHJhbnNhY3Rpb25zID0gdHJhbnNhY3Rpb25zO1xuXG5cdFx0XHRcdHNwaW5uZXIuaGlkZSgnbWFpbi1zcGlubmVyJyk7XG5cdFx0XHRcdGNvbnNvbGUubG9nKCdGaW5hbDogJywgdm0udHJhbnNhY3Rpb25zLCB2bS5jaGFyZ2VzKTtcblx0XHRcdH0pLmNhdGNoKGZ1bmN0aW9uKGVycikge1xuXHRcdFx0XHRzcGlubmVyLmhpZGUoJ21haW4tc3Bpbm5lcicpO1xuXHRcdFx0XHRlcnJvclNlcnZpY2Uuc2hvdyhlcnIpO1xuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gZ2V0Q3VzdG9tZXJCYWxhbmNlKCkge1xuXHRcdFx0YXBpLnJlcXVlc3Qoe1xuXHRcdFx0XHR1cmw6IFwiZ2V0Q3VzdG9tZXJCYWxhbmNlXCJcblx0XHRcdH0pLnRoZW4oZnVuY3Rpb24ocmVzKXtcblx0XHRcdFx0aWYoIXJlcy5kYXRhLnN1Y2Nlc3MpIHtcblx0XHRcdFx0XHRzcGlubmVyLmhpZGUoJ21haW4tc3Bpbm5lcicpO1xuXHRcdFx0XHRcdHJldHVybiBlcnJvclNlcnZpY2Uuc2hvdyhyZXMuZGF0YS5tZXNzYWdlKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdHZtLmN1c3RvbWVyLmJhbGFuY2UgPSByZXMuZGF0YS5yZXN1bHQ7XG5cdFx0XHRcdHZtLmN1cnJlbnRCYWxhbmNlID0gc3RyaW5nVG9GaXhlZChyZXMuZGF0YS5yZXN1bHQpO1xuXHRcdFx0XHRjdXN0b21lclNlcnZpY2Uuc2V0Q3VzdG9tZXJCYWxhbmNlKHJlcy5kYXRhLnJlc3VsdCk7XG5cdFx0XHR9LCBmdW5jdGlvbihlcnIpe1xuXHRcdFx0XHRzcGlubmVyLmhpZGUoJ21haW4tc3Bpbm5lcicpO1xuXHRcdFx0XHRlcnJvclNlcnZpY2Uuc2hvdyhlcnIpO1xuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gc3RyaW5nVG9GaXhlZChzdHJpbmcpIHtcblx0XHRcdHJldHVybiB1dGlsc1NlcnZpY2Uuc3RyaW5nVG9GaXhlZChzdHJpbmcsIDIpO1xuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIHN1bVVwKGFycmF5KSB7XG5cdFx0XHR2YXIgYW1vdW50ID0gMDtcblx0XHRcdGFycmF5LmZvckVhY2goZnVuY3Rpb24oaXRlbSl7XG5cdFx0XHRcdGFtb3VudCArPSBwYXJzZUZsb2F0KGl0ZW0pO1xuXHRcdFx0fSk7XG5cdFx0XHRyZXR1cm4gYW1vdW50O1xuXHRcdH1cblxuXHR9XG5cbn0pKCk7IiwiYW5ndWxhci5tb2R1bGUoJ2FwcC5iaWxsaW5nJylcbi5jb25maWcoWyckcm91dGVQcm92aWRlcicsIGZ1bmN0aW9uKCRyb3V0ZVByb3ZpZGVyKXtcblxuXHQkcm91dGVQcm92aWRlclxuXHRcdC53aGVuKCcvYmlsbGluZycsIHtcblx0XHRcdHRlbXBsYXRlVXJsOiAnYmlsbGluZy9iaWxsaW5nLmh0bWwnLFxuXHRcdFx0Y29udHJvbGxlcjogJ0JpbGxpbmdDb250cm9sbGVyJyxcblx0XHRcdGNvbnRyb2xsZXJBczogJ2JpbGxWbScsXG5cdFx0XHRyZXNvbHZlOiB7XG5cdFx0XHRcdGxvZ2dlZGluOiBpc0F1dGhvcml6ZWRcblx0XHRcdH1cblx0XHR9KTtcblxufV0pO1xuXG5pc0F1dGhvcml6ZWQuJGluamVjdCA9IFsnYXV0aFNlcnZpY2UnXTtcbmZ1bmN0aW9uIGlzQXV0aG9yaXplZChhdXRoU2VydmljZSkge1xuXHRyZXR1cm4gYXV0aFNlcnZpY2UuaXNBdXRob3JpemVkKCk7XG59IiwiKGZ1bmN0aW9uKCl7XG5cblx0J3VzZSBzdHJpY3QnO1xuXG5cdGFuZ3VsYXJcblx0XHQubW9kdWxlKCdhcHAuYXV0aCcpXG5cdFx0LmNvbnRyb2xsZXIoJ0F1dGhDb250cm9sbGVyJywgQXV0aENvbnRyb2xsZXIpO1xuXG5cdEF1dGhDb250cm9sbGVyLiRpbmplY3QgPSBbJyRyb290U2NvcGUnLCAnJGxvY2F0aW9uJywgJyRsb2NhbFN0b3JhZ2UnLCAnJHRyYW5zbGF0ZScsICdhdXRoU2VydmljZScsICdlcnJvclNlcnZpY2UnLCAnc3Bpbm5lclNlcnZpY2UnXTtcblxuXHRmdW5jdGlvbiBBdXRoQ29udHJvbGxlcigkcm9vdFNjb3BlLCAkbG9jYXRpb24sICRsb2NhbFN0b3JhZ2UsICR0cmFuc2xhdGUsIGF1dGhTZXJ2aWNlLCBlcnJvclNlcnZpY2UsIHNwaW5uZXJTZXJ2aWNlKSB7XG5cblx0XHRpZigkbG9jYXRpb24ucGF0aCgpID09PSAnL2xvZ2luJylcblx0XHRcdCRyb290U2NvcGUudGl0bGUgPSAnTE9HSU4nO1xuXHRcdGVsc2UgaWYoJGxvY2F0aW9uLnBhdGgoKSA9PT0gJy9zaWdudXAnKVxuXHRcdFx0JHJvb3RTY29wZS50aXRsZSA9ICdSRUdJU1RSQVRJT04nO1xuXHRcdGVsc2UgaWYoJGxvY2F0aW9uLnBhdGgoKSA9PT0gJy9hY2NvdW50LXZlcmlmaWNhdGlvbicpXG5cdFx0XHQkcm9vdFNjb3BlLnRpdGxlID0gJ0VNQUlMX1ZFUklGSUNBVElPTic7XG5cdFx0ZWxzZSBpZigkbG9jYXRpb24ucGF0aCgpID09PSAnL3JlcXVlc3QtcGFzc3dvcmQtcmVzZXQnIHx8ICRsb2NhdGlvbi5wYXRoKCkgPT09ICcvcmVzZXQtcGFzc3dvcmQnKVxuXHRcdFx0JHJvb3RTY29wZS50aXRsZSA9ICdSRVNFVF9QQVNTV09SRCc7XG5cblx0XHR2YXIgdm0gPSB0aGlzO1xuXHRcdHZtLnZlcmlmaWNhdGlvblNlbnQgPSBmYWxzZTtcblx0XHR2bS52ZXJpZmllZCA9ICRsb2NhdGlvbi5zZWFyY2goKS52ZXJpZmllZCA9PT0gJ3RydWUnID8gdHJ1ZSA6IGZhbHNlO1xuXHRcdHZtLnJlcXVlc3RTZW50ID0gZmFsc2U7XG5cdFx0dm0uZW1haWwgPSAnJztcblx0XHR2bS5uYW1lID0gJyc7XG5cdFx0dm0ucGFzc3dvcmQgPSAnJztcblx0XHR2bS5zaWdudXAgPSBzaWdudXA7XG5cdFx0dm0ubG9naW4gPSBsb2dpbjtcblx0XHR2bS5yZXF1ZXN0UGFzc3dvcmRSZXNldCA9IHJlcXVlc3RQYXNzd29yZFJlc2V0O1xuXHRcdHZtLnJlc2V0UGFzc3dvcmQgPSByZXNldFBhc3N3b3JkO1xuXHRcdHZtLmxvZ291dCA9IGxvZ291dDtcblxuXG5cdFx0ZnVuY3Rpb24gc2lnbnVwKCkge1xuXHRcdFx0dmFyIGZkYXRhID0ge1xuXHRcdFx0XHRlbWFpbDogdm0uZW1haWwsXG5cdFx0XHRcdG5hbWU6IHZtLm5hbWUsXG5cdFx0XHRcdHBhc3N3b3JkOiB2bS5wYXNzd29yZCxcblx0XHRcdFx0bGFuZzogJGxvY2FsU3RvcmFnZS5OR19UUkFOU0xBVEVfTEFOR19LRVkgfHwgJ2VuJ1xuXHRcdFx0fTtcblx0XHRcdGF1dGhTZXJ2aWNlLnNpZ251cChmZGF0YSkudGhlbihmdW5jdGlvbiAocmVzKXtcblx0XHRcdFx0dm0udmVyaWZpY2F0aW9uU2VudCA9IHRydWU7XG5cdFx0XHR9LCBmdW5jdGlvbiAoZXJyKXtcblx0XHRcdFx0aWYoZXJyLm1lc3NhZ2UgPT09ICdNVUxUSVBMRV9TSUdOVVAnKSB7XG5cdFx0XHRcdFx0JGxvY2F0aW9uLnBhdGgoJy9yZXNpZ251cCcpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGVycm9yU2VydmljZS5zaG93KGVyci5kYXRhLm1lc3NhZ2UpO1xuXHRcdFx0XHQvLyAkcm9vdFNjb3BlLmVycm9yID0gZXJyO1xuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gbG9naW4oKSB7XG5cdFx0XHR2YXIgZmRhdGEgPSB7XG5cdFx0XHRcdGVtYWlsOiB2bS5lbWFpbCxcblx0XHRcdFx0cGFzc3dvcmQ6IHZtLnBhc3N3b3JkXG5cdFx0XHR9O1xuXG5cdFx0XHRpZighdm0uZW1haWwpIHtcblx0XHRcdFx0cmV0dXJuIGVycm9yU2VydmljZS5zaG93KCdNSVNTSU5HX0ZJRUxEUycpO1xuXHRcdFx0fVxuXG5cblx0XHRcdGF1dGhTZXJ2aWNlLmxvZ2luKGZkYXRhKS50aGVuKGZ1bmN0aW9uIChyZXMpe1xuXHRcdFx0XHQvLyAkbG9jYWxTdG9yYWdlLnRva2VuID0gcmVzLmRhdGEudG9rZW47XG5cdFx0XHRcdCRsb2NhdGlvbi5wYXRoKCcvZGFzaGJvYXJkJyk7XG5cdFx0XHR9LCBmdW5jdGlvbiAoZXJyKXtcblx0XHRcdFx0ZXJyb3JTZXJ2aWNlLnNob3coZXJyLmRhdGEubWVzc2FnZSk7XG5cdFx0XHRcdC8vICRyb290U2NvcGUuZXJyb3IgPSBlcnI7XG5cdFx0XHR9KTtcblx0XHR9XG5cblx0XHRmdW5jdGlvbiByZXF1ZXN0UGFzc3dvcmRSZXNldCgpIHtcblx0XHRcdHZhciBmZGF0YSA9IHtcblx0XHRcdFx0ZW1haWw6IHZtLmVtYWlsXG5cdFx0XHR9O1xuXG5cdFx0XHRhdXRoU2VydmljZS5yZXF1ZXN0UGFzc3dvcmRSZXNldChmZGF0YSkudGhlbihmdW5jdGlvbiAocmVzKXtcblx0XHRcdFx0dm0ucmVxdWVzdFNlbnQgPSB0cnVlO1xuXHRcdFx0fSwgZnVuY3Rpb24gKGVycil7XG5cdFx0XHRcdGVycm9yU2VydmljZS5zaG93KGVyci5kYXRhLm1lc3NhZ2UpO1xuXHRcdFx0XHQvLyAkcm9vdFNjb3BlLmVycm9yID0gZXJyO1xuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gcmVzZXRQYXNzd29yZCgpIHtcblx0XHRcdHZhciBmZGF0YSA9IHtcblx0XHRcdFx0dG9rZW46ICRsb2NhdGlvbi5zZWFyY2goKS5vdHQsXG5cdFx0XHRcdHBhc3N3b3JkOiB2bS5wYXNzd29yZFxuXHRcdFx0fTtcblxuXHRcdFx0YXV0aFNlcnZpY2UucmVzZXRQYXNzd29yZChmZGF0YSkudGhlbihmdW5jdGlvbiAocmVzKXtcblx0XHRcdFx0JGxvY2FsU3RvcmFnZS50b2tlbiA9IHJlcy50b2tlbjtcblx0XHRcdFx0JGxvY2F0aW9uLnBhdGgoJy9kYXNoYm9hcmQnKTtcblx0XHRcdH0sIGZ1bmN0aW9uIChlcnIpe1xuXHRcdFx0XHRlcnJvclNlcnZpY2Uuc2hvdyhlcnIuZGF0YS5tZXNzYWdlKTtcblx0XHRcdFx0Ly8gJHJvb3RTY29wZS5lcnJvciA9IGVycjtcblx0XHRcdH0pO1xuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIGxvZ291dCgpIHtcblx0XHRcdGF1dGhTZXJ2aWNlLmxvZ291dCgpO1xuXHRcdH1cblxuXHR9XG5cbn0pKCk7IiwiYW5ndWxhci5tb2R1bGUoJ2FwcC5hdXRoJylcbi5jb25maWcoWyckcm91dGVQcm92aWRlcicsIGZ1bmN0aW9uKCRyb3V0ZVByb3ZpZGVyKXtcblxuXHQkcm91dGVQcm92aWRlclxuXHRcdC53aGVuKCcvYWNjb3VudC12ZXJpZmljYXRpb24nLCB7XG5cdFx0XHR0ZW1wbGF0ZVVybDogJ2F1dGgvdmVyaWZpY2F0aW9uLmh0bWwnLFxuXHRcdFx0Y29udHJvbGxlcjogJ0F1dGhDb250cm9sbGVyJyxcblx0XHRcdGNvbnRyb2xsZXJBczogJ2F1dGhWbSdcblx0XHR9KVxuXHRcdC53aGVuKCcvcmVxdWVzdC1wYXNzd29yZC1yZXNldCcsIHtcblx0XHRcdHRlbXBsYXRlVXJsOiAnYXV0aC9yZXF1ZXN0LXBhc3N3b3JkLXJlc2V0Lmh0bWwnLFxuXHRcdFx0Y29udHJvbGxlcjogJ0F1dGhDb250cm9sbGVyJyxcblx0XHRcdGNvbnRyb2xsZXJBczogJ2F1dGhWbSdcblx0XHR9KVxuXHRcdC53aGVuKCcvcmVzZXQtcGFzc3dvcmQnLCB7XG5cdFx0XHR0ZW1wbGF0ZVVybDogJ2F1dGgvcmVzZXQtcGFzc3dvcmQuaHRtbCcsXG5cdFx0XHRjb250cm9sbGVyOiAnQXV0aENvbnRyb2xsZXInLFxuXHRcdFx0Y29udHJvbGxlckFzOiAnYXV0aFZtJ1xuXHRcdH0pXG5cdFx0LndoZW4oJy9sb2dpbicse1xuXHRcdFx0dGVtcGxhdGVVcmw6ICdhdXRoL2xvZ2luLmh0bWwnLFxuXHRcdFx0Y29udHJvbGxlcjogJ0F1dGhDb250cm9sbGVyJyxcblx0XHRcdGNvbnRyb2xsZXJBczogJ2F1dGhWbSdcblx0XHR9KVxuXHRcdC53aGVuKCcvc2lnbnVwJywge1xuXHRcdFx0dGVtcGxhdGVVcmw6ICdhdXRoL3NpZ251cC5odG1sJyxcblx0XHRcdGNvbnRyb2xsZXI6ICdBdXRoQ29udHJvbGxlcicsXG5cdFx0XHRjb250cm9sbGVyQXM6ICdhdXRoVm0nXG5cdFx0fSk7XG5cbn1dKTsiLCIoZnVuY3Rpb24oKXtcblxuXHQndXNlIHN0cmljdCc7XG5cblx0YW5ndWxhclxuXHRcdC5tb2R1bGUoJ2FwcCcpXG5cdFx0LmRpcmVjdGl2ZSgnaXNQYXNzd29yZCcsIGlzUGFzc3dvcmQpO1xuXG5cdGlzUGFzc3dvcmQuJGluamVjdCA9IFsndXRpbHMnXTtcblxuXHRmdW5jdGlvbiBpc1Bhc3N3b3JkKHV0aWxzKXtcblxuXHRcdHJldHVybiB7XG5cdFx0XHRyZXF1aXJlOiAnbmdNb2RlbCcsXG5cdFx0XHRsaW5rOiBsaW5rXG5cdFx0fTtcblxuXHRcdGZ1bmN0aW9uIGxpbmsoc2NvcGUsIGVsLCBhdHRycywgY3RybCkge1xuXG5cdFx0XHRjdHJsLiR2YWxpZGF0b3JzLnBhc3N3b3JkID0gZnVuY3Rpb24obW9kZWxWYWx1ZSwgdmlld1ZhbHVlKSB7XG5cdFx0XHRcdGlmKGN0cmwuJGlzRW1wdHkobW9kZWxWYWx1ZSkpIHtcblx0XHRcdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGlmKHNjb3BlLmluc3RhbmNlKSB7XG5cdFx0XHRcdFx0dmFyIHByZWZpeCA9IHNjb3BlLmluc3RhbmNlLnJlc3VsdC5wcmVmaXg7XG5cdFx0XHRcdFx0aWYocHJlZml4ICYmIG5ldyBSZWdFeHAocHJlZml4LCAnaScpLnRlc3QobW9kZWxWYWx1ZSkpXG5cdFx0XHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRpZighdXRpbHMuY2hlY2tQYXNzd29yZFN0cmVuZ3RoKG1vZGVsVmFsdWUpKSB7XG5cdFx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0XHR9O1xuXHRcdFx0XG5cdFx0fVxuXG5cdH1cblxufSkoKTsiLCIoZnVuY3Rpb24oKXtcblxuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIGFuZ3VsYXJcbiAgICAgICAgLm1vZHVsZSgnYXBwLmNvcmUnKVxuICAgICAgICAuZGlyZWN0aXZlKCdwYXNzd29yZCcsIHBhc3N3b3JkKTtcblxuICAgIHBhc3N3b3JkLiRpbmplY3QgPSBbJ3V0aWxzU2VydmljZSddO1xuICAgIGZ1bmN0aW9uIHBhc3N3b3JkKHV0aWxzKXtcblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgcmVzdHJpY3Q6ICdBRScsXG4gICAgICAgICAgICByZXF1aXJlOiAnbmdNb2RlbCcsXG4gICAgICAgICAgICBsaW5rOiBsaW5rXG4gICAgICAgIH07XG5cbiAgICAgICAgZnVuY3Rpb24gbGluayhzY29wZSwgZWwsIGF0dHJzLCBjdHJsKSB7XG5cbiAgICAgICAgICAgIGN0cmwuJHZhbGlkYXRvcnMucGFzc3dvcmQgPSBmdW5jdGlvbihtb2RlbFZhbHVlLCB2aWV3VmFsdWUpIHtcbiAgICAgICAgICAgICAgICBpZihjdHJsLiRpc0VtcHR5KG1vZGVsVmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIGNoZWNrIGlmIHBhc3N3b3JkIGNvbnRhaW5zIHRoZSBicmFuY2ggcHJlZml4XG4gICAgICAgICAgICAgICAgaWYoc2NvcGUuaW5zdFZtICYmIHNjb3BlLmluc3RWbS5pbnN0YW5jZSkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgcHJlZml4ID0gc2NvcGUuaW5zdFZtLmluc3RhbmNlLnJlc3VsdC5wcmVmaXg7XG4gICAgICAgICAgICAgICAgICAgIGlmKHByZWZpeCAmJiBuZXcgUmVnRXhwKHByZWZpeCwgJ2knKS50ZXN0KG1vZGVsVmFsdWUpKVxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHJldHVybiAhIXV0aWxzLmNoZWNrUGFzc3dvcmRTdHJlbmd0aChtb2RlbFZhbHVlKTtcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICB9XG59KSgpOyIsImFuZ3VsYXJcbi5tb2R1bGUoJ2FwcCcpXG4uZmlsdGVyKCdjb252ZXJ0Qnl0ZXMnLCBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKGludGVnZXIsIGZyb21Vbml0cywgdG9Vbml0cykge1xuICAgIHZhciBjb2VmZmljaWVudHMgPSB7XG4gICAgICAgICdCeXRlJzogMSxcbiAgICAgICAgJ0tCJzogMTAwMCxcbiAgICAgICAgJ01CJzogMTAwMDAwMCxcbiAgICAgICAgJ0dCJzogMTAwMDAwMDAwMFxuICAgIH07XG4gICAgcmV0dXJuIGludGVnZXIgKiBjb2VmZmljaWVudHNbZnJvbVVuaXRzXSAvIGNvZWZmaWNpZW50c1t0b1VuaXRzXTtcbiAgfTtcbn0pOyIsIihmdW5jdGlvbigpe1xuXG5cdCd1c2Ugc3RyaWN0JztcblxuXHRhbmd1bGFyXG5cdFx0Lm1vZHVsZSgnYXBwLmRhc2hib2FyZCcpXG5cdFx0LmNvbnRyb2xsZXIoJ0Rhc2hJbnN0YW5jZUNvbnRyb2xsZXInLCBEYXNoSW5zdGFuY2VDb250cm9sbGVyKTtcblxuXHREYXNoSW5zdGFuY2VDb250cm9sbGVyLiRpbmplY3QgPSBbJyRyb290U2NvcGUnLCAnJGxvY2F0aW9uJywgJyR0cmFuc2xhdGUnLCAnYXBpU2VydmljZScsICdwb29sU2l6ZVNlcnZpY2VzJywgJ2JyYW5jaGVzU2VydmljZScsICdjYXJ0U2VydmljZScsICd1dGlsc1NlcnZpY2UnLCAnZXJyb3JTZXJ2aWNlJ107XG5cblx0ZnVuY3Rpb24gRGFzaEluc3RhbmNlQ29udHJvbGxlcigkcm9vdFNjb3BlLCAkbG9jYXRpb24sICR0cmFuc2xhdGUsIGFwaSwgcG9vbFNpemVTZXJ2aWNlcywgYnJhbmNoZXNTZXJ2aWNlLCBjYXJ0LCB1dGlscywgZXJyb3JTZXJ2aWNlKSB7XG5cblx0XHR2YXIgdm0gPSB0aGlzO1xuXHRcdHZhciBkaWZmO1xuXG5cdFx0dm0uc3ViID0gdm0uaW5zdC5fc3Vic2NyaXB0aW9uO1xuXHRcdHZtLnRlcm1pbmF0ZUluc3RhbmNlID0gdGVybWluYXRlSW5zdGFuY2U7XG5cdFx0dm0ucmVuZXdTdWJzY3JpcHRpb24gPSByZW5ld1N1YnNjcmlwdGlvbjtcblx0XHR2bS5leHBpcmVzQXQgPSBleHBpcmVzQXQ7XG5cdFx0dm0uY2FuUmVuZXcgPSBjYW5SZW5ldztcblx0XHR2bS5wYXJzZURhdGUgPSBwYXJzZURhdGU7XG5cdFx0dm0uc3RyaW5nVG9GaXhlZCA9IHN0cmluZ1RvRml4ZWQ7XG5cdFx0dm0uZ2V0RGlmZmVyZW5jZSA9IHV0aWxzLmdldERpZmZlcmVuY2U7XG5cdFx0dm0udHJpYWxFeHBpcmVzID0gZXhwaXJlc0F0KHZtLnN1Yi50cmlhbEV4cGlyZXMpO1xuXHRcdHZtLmV4cGlyZXMgPSB2bS5zdWIuYmlsbGluZ0N5cmNsZXMgLSB2bS5zdWIuY3VycmVudEJpbGxpbmdDeXJjbGU7XG5cdFx0dm0uZXhwVGhyZXNob2xkID0gMTA7XG5cblx0XHRmdW5jdGlvbiB0ZXJtaW5hdGVJbnN0YW5jZShvaWQpIHtcblx0XHRcdGlmKCFvaWQpIHJldHVybjtcblx0XHRcdGlmKGNvbmZpcm0oXCJEbyB5b3UgcmVhbHkgd2FudCB0byB0ZXJtaW5hdGUgaW5zdGFuY2UgcGVybWFuZW50bHk/XCIpKXtcblx0XHRcdFx0c2V0U3RhdGUoJ2RlbGV0ZUJyYW5jaCcsIG9pZCwgZnVuY3Rpb24gKGVyciwgcmVzcG9uc2Upe1xuXHRcdFx0XHRcdGlmKGVycikge1xuXHRcdFx0XHRcdFx0ZXJyb3JTZXJ2aWNlLnNob3coZXJyKTtcblx0XHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRicmFuY2hlc1NlcnZpY2UucmVtb3ZlKG9pZCk7XG5cdFx0XHRcdFx0Ly8gZ2V0QnJhbmNoZXMoKTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdFxuXHRcdGZ1bmN0aW9uIHJlbmV3U3Vic2NyaXB0aW9uKGluc3QpIHtcblx0XHRcdCR0cmFuc2xhdGUoJ0RFU0NSSVBUSU9OUy5SRU5FV19TVUJTQ1JJUFRJT04nLCB7XG5cdFx0XHRcdHBsYW5JZDogaW5zdC5fc3Vic2NyaXB0aW9uLnBsYW5JZCxcblx0XHRcdFx0dXNlcnM6IGluc3QuX3N1YnNjcmlwdGlvbi5xdWFudGl0eSxcblx0XHRcdFx0Y29tcGFueTogaW5zdC5yZXN1bHQubmFtZVxuXHRcdFx0fSlcblx0XHRcdC50aGVuKGZ1bmN0aW9uIChkZXNjcmlwdGlvbikge1xuXHRcdFx0XHRjYXJ0LmFkZCh7XG5cdFx0XHRcdFx0YWN0aW9uOiBcInJlbmV3U3Vic2NyaXB0aW9uXCIsXG5cdFx0XHRcdFx0ZGVzY3JpcHRpb246IGRlc2NyaXB0aW9uLFxuXHRcdFx0XHRcdGFtb3VudDogaW5zdC5fc3Vic2NyaXB0aW9uLmFtb3VudCxcblx0XHRcdFx0XHRkYXRhOiB7XG5cdFx0XHRcdFx0XHRvaWQ6IGluc3Qub2lkXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9KTtcblx0XHRcdFx0JGxvY2F0aW9uLnBhdGgoJy9wYXltZW50Jyk7XG5cdFx0XHR9KTtcblx0XHR9XG5cblx0XHRmdW5jdGlvbiBleHBpcmVzQXQobGFzdEJpbGxpbmdEYXRlKSB7XG5cdFx0XHRkaWZmID0gdXRpbHMuZ2V0RGlmZmVyZW5jZShsYXN0QmlsbGluZ0RhdGUsIG1vbWVudCgpLCAnZGF5cycpO1xuXHRcdFx0cmV0dXJuIGRpZmYgPCAwID8gMCA6IGRpZmY7XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gY2FuUmVuZXcoaW5zdCkge1xuXHRcdFx0ZGlmZiA9IHZtLmV4cGlyZXNBdChpbnN0KTtcblx0XHRcdHJldHVybiBkaWZmIDw9IDEwO1xuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIHBhcnNlRGF0ZShkYXRlLCBmb3JtYXQpIHtcblx0XHRcdHJldHVybiB1dGlscy5wYXJzZURhdGUoZGF0ZSwgZm9ybWF0KTtcblx0XHR9XG5cblx0XHRmdW5jdGlvbiBzdHJpbmdUb0ZpeGVkKHN0cmluZykge1xuXHRcdFx0cmV0dXJuIHV0aWxzLnN0cmluZ1RvRml4ZWQoc3RyaW5nLCAyKTtcblx0XHR9XG5cblx0XHRmdW5jdGlvbiBnZXRQb29sU3RyaW5nKGFycmF5KSB7XG5cdFx0XHRyZXR1cm4gcG9vbFNpemVTZXJ2aWNlcy5wb29sQXJyYXlUb1N0cmluZyhhcnJheSk7XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gZ2V0UG9vbFNpemUoYXJyYXkpIHtcblx0XHRcdHJldHVybiBwb29sU2l6ZVNlcnZpY2VzLmdldFBvb2xTaXplKGFycmF5KTtcblx0XHR9XG5cblx0XHRmdW5jdGlvbiBzZXRTdGF0ZShtZXRob2QsIG9pZCwgY2FsbGJhY2spIHtcblx0XHRcdGFwaS5yZXF1ZXN0KHtcblx0XHRcdFx0dXJsOiBtZXRob2QsXG5cdFx0XHRcdHBhcmFtczoge1xuXHRcdFx0XHRcdG9pZDogb2lkXG5cdFx0XHRcdH1cblx0XHRcdH0pLnRoZW4oZnVuY3Rpb24ocmVzdWx0KXtcblx0XHRcdFx0Y29uc29sZS5sb2coJ3NldFN0YXRlIHJlc3VsdDogJywgcmVzdWx0KTtcblx0XHRcdFx0Y2FsbGJhY2sobnVsbCwgcmVzdWx0LmRhdGEucmVzdWx0KTtcblx0XHRcdH0sIGZ1bmN0aW9uKGVycil7XG5cdFx0XHRcdGNhbGxiYWNrKGVycik7XG5cdFx0XHR9KTtcblx0XHR9XG5cblx0fVxuXG59KSgpOyIsIihmdW5jdGlvbigpe1xuXG5cdCd1c2Ugc3RyaWN0JztcblxuXHRhbmd1bGFyXG5cdFx0Lm1vZHVsZSgnYXBwLmRhc2hib2FyZCcpXG5cdFx0LmRpcmVjdGl2ZSgnZGFzaEluc3RhbmNlJywgZGFzaEluc3RhbmNlKTtcblxuXHRmdW5jdGlvbiBkYXNoSW5zdGFuY2UoKXtcblxuXHRcdHJldHVybiB7XG5cdFx0XHRyZXN0cmljdDogJ0VBJyxcblx0XHRcdHJlcGxhY2U6IHRydWUsXG5cdFx0XHR0cmFuc2NsdWRlOiB0cnVlLFxuXHRcdFx0c2NvcGU6IHtcblx0XHRcdFx0aW5zdDogJz0nXG5cdFx0XHR9LFxuXHRcdFx0dGVtcGxhdGVVcmw6ICdkYXNoYm9hcmQvZGFzaC1pbnN0YW5jZS5odG1sJyxcblx0XHRcdGNvbnRyb2xsZXI6ICdEYXNoSW5zdGFuY2VDb250cm9sbGVyJyxcblx0XHRcdGNvbnRyb2xsZXJBczogJ2Rhc2hJbnN0Vm0nLFxuXHRcdFx0YmluZFRvQ29udHJvbGxlcjogdHJ1ZVxuXHRcdH07XG5cblx0fVxuXG59KSgpOyIsIihmdW5jdGlvbigpe1xuXG5cdCd1c2Ugc3RyaWN0JztcblxuXHRhbmd1bGFyXG5cdFx0Lm1vZHVsZSgnYXBwLmRhc2hib2FyZCcpXG5cdFx0LmNvbnRyb2xsZXIoJ0Rhc2hib2FyZENvbnRyb2xsZXInLCBEYXNoYm9hcmRDb250cm9sbGVyKTtcblxuXHREYXNoYm9hcmRDb250cm9sbGVyLiRpbmplY3QgPSBbJyRyb290U2NvcGUnLCAnYXBpU2VydmljZScsICdicmFuY2hlc1NlcnZpY2UnLCAnbm90aWZ5U2VydmljZScsICdzcGlubmVyU2VydmljZScsICdjdXN0b21lclNlcnZpY2UnLCAnZXJyb3JTZXJ2aWNlJ107XG5cblx0ZnVuY3Rpb24gRGFzaGJvYXJkQ29udHJvbGxlcigkcm9vdFNjb3BlLCBhcGksIGJyYW5jaGVzU2VydmljZSwgbm90aWZ5U2VydmljZSwgc3Bpbm5lciwgY3VzdG9tZXJTZXJ2aWNlLCBlcnJvclNlcnZpY2UpIHtcblxuXHRcdHZhciB2bSA9IHRoaXM7XG5cblx0XHR2bS5pbnN0YW5jZXMgPSBbXTtcblx0XHR2bS5jdXN0b21lclJvbGUgPSBjdXN0b21lclNlcnZpY2UuZ2V0Q3VzdG9tZXIoKS5yb2xlO1xuXG5cdFx0JHJvb3RTY29wZS50aXRsZSA9ICdEQVNIQk9BUkQnO1xuXHRcdCRyb290U2NvcGUuJG9uKCdhdXRoLmxvZ291dCcsIGZ1bmN0aW9uKCl7XG5cdFx0XHRicmFuY2hlc1NlcnZpY2UuY2xlYXIoKTtcblx0XHR9KTtcblxuXHRcdHNwaW5uZXIuc2hvdygnbWFpbi1zcGlubmVyJyk7XG5cblx0XHRnZXRCcmFuY2hlcygpO1xuXHRcdC8vIGdldFBsYW5zKCk7XG5cblx0XHRmdW5jdGlvbiBnZXRCcmFuY2hlcygpe1xuXHRcdFx0dmFyIGluc3RhbmNlcyA9IGJyYW5jaGVzU2VydmljZS5nZXRBbGwoKTtcblx0XHRcdGlmKGluc3RhbmNlcy5sZW5ndGgpIHtcblx0XHRcdFx0dm0uaW5zdGFuY2VzID0gaW5zdGFuY2VzO1xuXHRcdFx0XHRzcGlubmVyLmhpZGUoJ21haW4tc3Bpbm5lcicpO1xuXHRcdFx0XHRjb25zb2xlLmxvZygnZ2V0QnJhbmNoZXM6ICcsIGluc3RhbmNlcyk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRsb2FkQnJhbmNoZXMoKTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRmdW5jdGlvbiBsb2FkQnJhbmNoZXMoKSB7XG5cdFx0XHRhcGkucmVxdWVzdCh7XG5cdFx0XHRcdHVybDogXCJnZXRCcmFuY2hlc1wiXG5cdFx0XHR9KS50aGVuKGZ1bmN0aW9uKHJlcyl7XG5cdFx0XHRcdGlmKCFyZXMuZGF0YS5zdWNjZXNzKSByZXR1cm4gZXJyb3JTZXJ2aWNlLnNob3cocmVzLmRhdGEubWVzc2FnZSk7XG5cblx0XHRcdFx0YnJhbmNoZXNTZXJ2aWNlLnNldChyZXMuZGF0YS5yZXN1bHQpO1xuXHRcdFx0XHRcblx0XHRcdFx0dm0uaW5zdGFuY2VzID0gcmVzLmRhdGEucmVzdWx0O1xuXG5cdFx0XHRcdHNwaW5uZXIuaGlkZSgnbWFpbi1zcGlubmVyJyk7XG5cdFx0XHRcdGNvbnNvbGUubG9nKCdCcmFuY2hlczogJywgdm0uaW5zdGFuY2VzKTtcblx0XHRcdFx0Ly8gdm0uZ2V0SW5zdFN0YXRlKCk7XG5cdFx0XHR9LCBmdW5jdGlvbihlcnIpe1xuXHRcdFx0XHRlcnJvclNlcnZpY2Uuc2hvdyhlcnIpO1xuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdH1cblxufSkoKTsiLCJhbmd1bGFyLm1vZHVsZSgnYXBwLmRhc2hib2FyZCcpXG4uY29uZmlnKFsnJHJvdXRlUHJvdmlkZXInLCBmdW5jdGlvbigkcm91dGVQcm92aWRlcil7XG5cblx0JHJvdXRlUHJvdmlkZXJcblx0XHQud2hlbignL2Rhc2hib2FyZCcsIHtcblx0XHRcdHRlbXBsYXRlVXJsOiAnZGFzaGJvYXJkL2Rhc2hib2FyZC5odG1sJyxcblx0XHRcdGNvbnRyb2xsZXI6ICdEYXNoYm9hcmRDb250cm9sbGVyJyxcblx0XHRcdGNvbnRyb2xsZXJBczogJ2Rhc2hWbScsXG5cdFx0XHRyZXNvbHZlOiB7XG5cdFx0XHRcdGxvZ2dlZGluOiBpc0F1dGhvcml6ZWRcblx0XHRcdH1cblx0XHR9KTtcblxufV0pO1xuXG5pc0F1dGhvcml6ZWQuJGluamVjdCA9IFsnYXV0aFNlcnZpY2UnXTtcbmZ1bmN0aW9uIGlzQXV0aG9yaXplZChhdXRoU2VydmljZSkge1xuXHRyZXR1cm4gYXV0aFNlcnZpY2UuaXNBdXRob3JpemVkKCk7XG59IiwiKGZ1bmN0aW9uKCl7XG5cblx0J3VzZSBzdHJpY3QnO1xuXG5cdGFuZ3VsYXJcblx0XHQubW9kdWxlKCdhcHAuaW5zdGFuY2UnKVxuXHRcdC5kaXJlY3RpdmUoJ2luc3RhbmNlU3VtbWFyeScsIGluc3RhbmNlU3VtbWFyeSk7XG5cblx0ZnVuY3Rpb24gaW5zdGFuY2VTdW1tYXJ5KCl7XG5cblx0XHRyZXR1cm4ge1xuXHRcdFx0cmVzdHJpY3Q6ICdBRScsXG5cdFx0XHR0cmFuc2NsdWRlOiB0cnVlLFxuXHRcdFx0c2NvcGU6IHtcblx0XHRcdFx0cGxhbjogJz0nLFxuXHRcdFx0XHRhbW91bnQ6ICc9Jyxcblx0XHRcdFx0Y3VycmVuY3k6ICc9Jyxcblx0XHRcdFx0bWF4bGluZXM6ICc9Jyxcblx0XHRcdFx0bnVtUG9vbDogJz0nLFxuXHRcdFx0XHRzdG9yYWdlOiAnPScsXG5cdFx0XHRcdGluc3RhbmNlOiAnPScsXG5cdFx0XHRcdG5ld0JyYW5jaDogJz0nLFxuXHRcdFx0XHR1cGRhdGU6ICcmJyxcblx0XHRcdFx0cHJvY2VlZDogJyYnXG5cdFx0XHR9LFxuXHRcdFx0dGVtcGxhdGVVcmw6ICdpbnN0YW5jZS9pbnN0YW5jZS1zdW1tYXJ5Lmh0bWwnXG5cdFx0fTtcblxuXHR9XG5cbn0pKCk7IiwiKGZ1bmN0aW9uKCl7XG5cblx0J3VzZSBzdHJpY3QnO1xuXG5cdGFuZ3VsYXJcblx0XHQubW9kdWxlKCdhcHAuaW5zdGFuY2UnKVxuXHRcdC5jb250cm9sbGVyKCdJbnN0YW5jZUNvbnRyb2xsZXInLCBJbnN0YW5jZUNvbnRyb2xsZXIpO1xuXG5cdEluc3RhbmNlQ29udHJvbGxlci4kaW5qZWN0ID0gWyckc2NvcGUnLCAnJHJvdXRlUGFyYW1zJywgJyRsb2NhdGlvbicsICckdHJhbnNsYXRlJywgJyR1aWJNb2RhbCcsICdhcGlTZXJ2aWNlJywgJ2N1c3RvbWVyU2VydmljZScsICdwb29sU2l6ZVNlcnZpY2VzJywgJ2JyYW5jaGVzU2VydmljZScsICdjYXJ0U2VydmljZScsICdub3RpZnlTZXJ2aWNlJywgJ2Vycm9yU2VydmljZScsICdzcGlubmVyU2VydmljZScsICd1dGlsc1NlcnZpY2UnLCAnY29udmVydEJ5dGVzRmlsdGVyJ107XG5cblx0ZnVuY3Rpb24gSW5zdGFuY2VDb250cm9sbGVyKCRzY29wZSwgJHJvdXRlUGFyYW1zLCAkbG9jYXRpb24sICR0cmFuc2xhdGUsICR1aWJNb2RhbCwgYXBpLCBjdXN0b21lclNlcnZpY2UsIHBvb2xTaXplU2VydmljZXMsIGJyYW5jaGVzU2VydmljZSwgY2FydCwgbm90aWZ5U2VydmljZSwgZXJyb3JTZXJ2aWNlLCBzcGlubmVyLCB1dGlscywgY29udmVydEJ5dGVzRmlsdGVyKSB7XG5cblx0XHR2YXIgdm0gPSB0aGlzO1xuXHRcdHZhciBvaWQgPSAkcm91dGVQYXJhbXMub2lkO1xuXHRcdHZhciBjYXJ0SXRlbSA9ICRyb3V0ZVBhcmFtcy5jYXJ0X2l0ZW07XG5cdFx0dmFyIG1pblVzZXJzID0gNDtcblx0XHR2YXIgbWluTGluZXMgPSA4O1xuXG5cdFx0dm0uY3VzdG9tZXIgPSBjdXN0b21lclNlcnZpY2UuZ2V0Q3VzdG9tZXIoKTtcblx0XHR2bS5taW5Vc2VycyA9IG1pblVzZXJzO1xuXHRcdHZtLm1pbkxpbmVzID0gbWluTGluZXM7XG5cdFx0dm0ucGFzc1R5cGUgPSAncGFzc3dvcmQnO1xuXHRcdHZtLnBhc3N3b3JkU3RyZW5ndGggPSAwO1xuXHRcdHZtLm5ld0JyYW5jaCA9IHRydWU7XG5cdFx0Ly8gdm0ubm9UcmlhbCA9IGZhbHNlO1xuXHRcdHZtLnRyaWFsID0gdHJ1ZTtcblx0XHR2bS5ub0FkZG9ucyA9IGZhbHNlO1xuXHRcdHZtLnBsYW5zID0gW107XG5cdFx0dm0uYXZhaWxhYmxlUGxhbnMgPSBbXTtcblx0XHR2bS5zZWxlY3RlZFBsYW4gPSB7fTtcblx0XHR2bS5wcmV2UGxhbklkID0gJyc7XG5cdFx0dm0uc2lkcyA9IFtdO1xuXHRcdHZtLnRvdGFsQW1vdW50ID0gMDtcblx0XHR2bS50b3RhbExpbmVzID0gMDtcblx0XHR2bS50b3RhbFN0b3JhZ2UgPSAwO1xuXHRcdHZtLm51bVBvb2wgPSAnMjAwLTI5OSc7XG5cdFx0dm0uc3RvcmFnZXMgPSBbJzAnLCAnMzAnLCAnMTAwJywgJzI1MCcsICc1MDAnXTtcblx0XHR2bS5saW5lcyA9IFsnMCcsICc0JywgJzgnLCAnMTYnLCAnMzAnLCAnNjAnLCAnMTIwJywgJzI1MCcsICc1MDAnXTtcblx0XHR2bS5sYW5ndWFnZXMgPSBbXG5cdFx0XHR7bmFtZTogJ0VuZ2xpc2gnLCB2YWx1ZTogJ2VuJ30sXG5cdFx0XHR7bmFtZTogJ9Cj0LrRgNCw0ZfQvdGB0YzQutCwJywgdmFsdWU6ICd1ayd9LFxuXHRcdFx0e25hbWU6ICfQoNGD0YHRgdC60LjQuScsIHZhbHVlOiAncnUnfVxuXHRcdF07XG5cdFx0dm0uYWRkT25zID0ge1xuXHRcdFx0c3RvcmFnZToge1xuXHRcdFx0XHRuYW1lOiAnc3RvcmFnZScsXG5cdFx0XHRcdHF1YW50aXR5OiAnMCdcblx0XHRcdH0sXG5cdFx0XHRsaW5lczoge1xuXHRcdFx0XHRuYW1lOiAnbGluZXMnLFxuXHRcdFx0XHRxdWFudGl0eTogJzAnXG5cdFx0XHR9XG5cdFx0fTtcblx0XHR2bS5pbnN0YW5jZSA9IHtcblx0XHRcdF9zdWJzY3JpcHRpb246IHtcblx0XHRcdFx0cGxhbklkOiAnJyxcblx0XHRcdFx0cXVhbnRpdHk6IG1pblVzZXJzLFxuXHRcdFx0XHRhZGRPbnM6IFtdXG5cdFx0XHR9LFxuXHRcdFx0cmVzdWx0OiB7XG5cdFx0XHRcdGxhbmc6ICdlbicsXG5cdFx0XHRcdG1heGxpbmVzOiA4LFxuXHRcdFx0XHRtYXh1c2VyczogbWluVXNlcnNcblx0XHRcdH1cblx0XHR9O1xuXG5cdFx0dm0uZ2VuZXJhdGVQYXNzd29yZCA9IGdlbmVyYXRlUGFzc3dvcmQ7XG5cdFx0dm0ucmV2ZWFsUGFzc3dvcmQgPSByZXZlYWxQYXNzd29yZDtcblx0XHR2bS5wcm9jZWVkID0gcHJvY2VlZDtcblx0XHR2bS51cGRhdGUgPSB1cGRhdGU7XG5cdFx0dm0uc2VsZWN0UGxhbiA9IHNlbGVjdFBsYW47XG5cdFx0dm0uc2VsZWN0U2VydmVyID0gc2VsZWN0U2VydmVyO1xuXHRcdHZtLnBsdXNVc2VyID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRyZXR1cm4gdm0uaW5zdGFuY2UuX3N1YnNjcmlwdGlvbi5xdWFudGl0eSArPSAxO1xuXHRcdH07XG5cdFx0dm0ubWludXNVc2VyID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRpZih2bS5pbnN0YW5jZS5fc3Vic2NyaXB0aW9uLnF1YW50aXR5ID4gbWluVXNlcnMpIHtcblx0XHRcdFx0dm0uaW5zdGFuY2UuX3N1YnNjcmlwdGlvbi5xdWFudGl0eSAtPSAxO1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIHZtLmluc3RhbmNlLl9zdWJzY3JpcHRpb24ucXVhbnRpdHk7XG5cdFx0fTtcblx0XHR2bS5zaG93UGxhbnMgPSBmdW5jdGlvbigpIHtcblx0XHRcdCR1aWJNb2RhbC5vcGVuKHtcblx0XHRcdFx0dGVtcGxhdGVVcmw6ICdhc3NldHMvcGFydGlhbHMvY29tcGFyZS1wbGFucy5odG1sJyxcblx0XHRcdFx0c2l6ZTogJ2xnJ1xuXHRcdFx0fSk7XG5cdFx0fTtcblxuXHRcdCRzY29wZS4kd2F0Y2goZnVuY3Rpb24oKSB7XG5cdFx0XHRyZXR1cm4gdm0uaW5zdGFuY2UuX3N1YnNjcmlwdGlvbi5xdWFudGl0eTtcblx0XHR9LCBmdW5jdGlvbih2YWwpIHtcblx0XHRcdFxuXHRcdFx0aWYoIXZhbCkge1xuXHRcdFx0XHR2bS5pbnN0YW5jZS5fc3Vic2NyaXB0aW9uLnF1YW50aXR5ID0gbWluVXNlcnM7XG5cdFx0XHR9XG5cblx0XHRcdGlmKHZtLnNlbGVjdGVkUGxhbi5wbGFuSWQgPT09ICd0cmlhbCcgfHwgdm0uc2VsZWN0ZWRQbGFuLnBsYW5JZCA9PT0gJ2ZyZWUnKSB7XG5cdFx0XHRcdHZtLmluc3RhbmNlLl9zdWJzY3JpcHRpb24ucXVhbnRpdHkgPSBtaW5Vc2Vycztcblx0XHRcdH1cblxuXHRcdFx0dG90YWxMaW5lcygpO1xuXHRcdFx0dG90YWxTdG9yYWdlKCk7XG5cdFx0XHR0b3RhbEFtb3VudCgpO1xuXHRcdH0pO1xuXHRcdFxuXHRcdCRzY29wZS4kd2F0Y2goZnVuY3Rpb24oKSB7XG5cdFx0XHRyZXR1cm4gdm0uYWRkT25zLmxpbmVzLnF1YW50aXR5O1xuXHRcdH0sIGZ1bmN0aW9uKHZhbCkge1xuXHRcdFx0dm0uYWRkT25zLmxpbmVzLnF1YW50aXR5ID0gdm0uYWRkT25zLmxpbmVzLnF1YW50aXR5LnRvU3RyaW5nKCk7XG5cdFx0XHQvLyB2bS5pbnN0YW5jZS5fc3Vic2NyaXB0aW9uLmFkZE9ucy5saW5lcy5xdWFudGl0eSA9IHBhcnNlSW50KHZhbCwgMTApO1xuXHRcdFx0dG90YWxMaW5lcygpO1xuXHRcdFx0dG90YWxBbW91bnQoKTtcblx0XHR9KTtcblxuXHRcdCRzY29wZS4kd2F0Y2goZnVuY3Rpb24oKSB7XG5cdFx0XHRyZXR1cm4gdm0uYWRkT25zLnN0b3JhZ2UucXVhbnRpdHk7XG5cdFx0fSwgZnVuY3Rpb24odmFsKSB7XG5cdFx0XHR2bS5hZGRPbnMuc3RvcmFnZS5xdWFudGl0eSA9IHZtLmFkZE9ucy5zdG9yYWdlLnF1YW50aXR5LnRvU3RyaW5nKCk7XG5cdFx0XHQvLyB2bS5pbnN0YW5jZS5fc3Vic2NyaXB0aW9uLmFkZE9ucy5zdG9yYWdlLnF1YW50aXR5ID0gcGFyc2VJbnQodmFsLCAxMCk7XG5cdFx0XHR0b3RhbFN0b3JhZ2UoKTtcblx0XHRcdHRvdGFsQW1vdW50KCk7XG5cdFx0fSk7XG5cblx0XHQkc2NvcGUuJHdhdGNoKGZ1bmN0aW9uKCkge1xuXHRcdFx0cmV0dXJuIHZtLmluc3RhbmNlLl9zdWJzY3JpcHRpb24ucGxhbklkO1xuXHRcdH0sIGZ1bmN0aW9uKHZhbCwgcHJldikge1xuXHRcdFx0dm0ucGxhbnMuZm9yRWFjaChmdW5jdGlvbihpdGVtKSB7XG5cdFx0XHRcdGlmKGl0ZW0ucGxhbklkID09PSB2bS5pbnN0YW5jZS5fc3Vic2NyaXB0aW9uLnBsYW5JZCkge1xuXHRcdFx0XHRcdHZtLnNlbGVjdGVkUGxhbiA9IGl0ZW07XG5cdFx0XHRcdFx0aWYoaXRlbS5wbGFuSWQgPT09ICd0cmlhbCcgfHwgaXRlbS5wbGFuSWQgPT09ICdmcmVlJykge1xuXHRcdFx0XHRcdFx0Ly8gdm0udHJpYWwgPSB0cnVlO1xuXHRcdFx0XHRcdFx0dm0uaW5zdGFuY2UuX3N1YnNjcmlwdGlvbi5xdWFudGl0eSA9IG1pblVzZXJzO1xuXHRcdFx0XHRcdFx0dm0uaW5zdGFuY2UubWF4bGluZXMgPSBtaW5MaW5lcztcblx0XHRcdFx0XHRcdHZtLmFkZE9ucy5saW5lcy5xdWFudGl0eSA9ICcwJztcblx0XHRcdFx0XHRcdHZtLmFkZE9ucy5zdG9yYWdlLnF1YW50aXR5ID0gJzAnO1xuXHRcdFx0XHRcdFx0dm0ubm9BZGRvbnMgPSB0cnVlO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHR2bS5ub0FkZG9ucyA9IGZhbHNlO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdHRvdGFsQW1vdW50KCk7XG5cdFx0XHRcdFx0dG90YWxTdG9yYWdlKCk7XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXHRcdFx0dm0ucHJldlBsYW5JZCA9IHByZXY7XG5cdFx0XHRjb25zb2xlLmxvZygncHJldlBsYW5JZDogJywgdm0ucHJldlBsYW5JZCk7XG5cdFx0fSk7XG5cblx0XHQkc2NvcGUuJG9uKCckdmlld0NvbnRlbnRMb2FkZWQnLCBmdW5jdGlvbigpe1xuXHRcdFx0c3Bpbm5lci5zaG93KCdwbGFucy1zcGlubmVyJyk7XG5cdFx0XHRzcGlubmVyLnNob3coJ3NlcnZlcnMtc3Bpbm5lcicpO1xuXHRcdH0pO1xuXG5cdFx0Z2V0UGxhbnMoKTtcblx0XHRnZXRTZXJ2ZXJzKCk7XG5cblx0XHRmdW5jdGlvbiBnZXRQbGFucygpIHtcblx0XHRcdFxuXHRcdFx0aWYoYnJhbmNoZXNTZXJ2aWNlLmdldFBsYW5zKCkubGVuZ3RoKSB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKCdnZXRQbGFuczonLCBicmFuY2hlc1NlcnZpY2UuZ2V0UGxhbnMoKSk7XG5cdFx0XHRcdHZtLnBsYW5zID0gYnJhbmNoZXNTZXJ2aWNlLmdldFBsYW5zKCk7XG5cblx0XHRcdFx0c3Bpbm5lci5oaWRlKCdwbGFucy1zcGlubmVyJyk7XG5cdFx0XHRcdGluaXQoKTtcblxuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdGFwaS5yZXF1ZXN0KHtcblx0XHRcdFx0dXJsOiAnZ2V0UGxhbnMnXG5cdFx0XHR9KS50aGVuKGZ1bmN0aW9uKHJlcyl7XG5cdFx0XHRcdGlmKCFyZXMuZGF0YS5zdWNjZXNzKSByZXR1cm4gZXJyb3JTZXJ2aWNlLnNob3cocmVzLmRhdGEubWVzc2FnZSk7XG5cblx0XHRcdFx0dm0ucGxhbnMgPSByZXMuZGF0YS5yZXN1bHQ7XG5cdFx0XHRcdHZtLnBsYW5zLmZvckVhY2goZnVuY3Rpb24oaXRlbSl7XG5cdFx0XHRcdFx0aXRlbS5hZGRPbnMgPSB1dGlscy5hcnJheVRvT2JqZWN0KGl0ZW0uYWRkT25zLCAnbmFtZScpO1xuXHRcdFx0XHR9KTtcblx0XHRcdFx0Y29uc29sZS5sb2coJ2dldFBsYW5zOicsIHZtLnBsYW5zKTtcblxuXHRcdFx0XHRicmFuY2hlc1NlcnZpY2Uuc2V0UGxhbnModm0ucGxhbnMpO1xuXG5cdFx0XHRcdGluaXQoKTtcblx0XHRcdFx0XG5cdFx0XHR9LCBmdW5jdGlvbihlcnIpe1xuXHRcdFx0XHRlcnJvclNlcnZpY2Uuc2hvdyhlcnIuZGF0YS5tZXNzYWdlKTtcblx0XHRcdH0pO1xuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIGdldFNlcnZlcnMoKSB7XG5cblx0XHRcdGlmKGJyYW5jaGVzU2VydmljZS5nZXRTZXJ2ZXJzKCkubGVuZ3RoKSB7XG5cdFx0XHRcdHZtLnNpZHMgPSBicmFuY2hlc1NlcnZpY2UuZ2V0U2VydmVycygpO1xuXHRcdFx0XHRpZihvaWQgPT09ICduZXcnKSB2bS5pbnN0YW5jZS5zaWQgPSB2bS5zaWRzWzBdLl9pZDtcblx0XHRcdFx0c3Bpbm5lci5oaWRlKCdzZXJ2ZXJzLXNwaW5uZXInKTtcblx0XHRcdFx0XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0YXBpLnJlcXVlc3Qoe1xuXHRcdFx0XHR1cmw6ICdnZXRTZXJ2ZXJzJ1xuXHRcdFx0fSkudGhlbihmdW5jdGlvbihyZXMpe1xuXHRcdFx0XHRpZighcmVzLmRhdGEuc3VjY2VzcykgcmV0dXJuIGVycm9yU2VydmljZS5zaG93KHJlcy5kYXRhLm1lc3NhZ2UpO1xuXG5cdFx0XHRcdGNvbnNvbGUubG9nKCdnZXRTZXJ2ZXJzOiAnLCByZXMuZGF0YS5yZXN1bHQpO1xuXHRcdFx0XHR2bS5zaWRzID0gcmVzLmRhdGEucmVzdWx0O1xuXHRcdFx0XHRicmFuY2hlc1NlcnZpY2Uuc2V0U2VydmVycyh2bS5zaWRzKTtcblxuXHRcdFx0XHRpZihvaWQgPT09ICduZXcnKSB2bS5pbnN0YW5jZS5zaWQgPSB2bS5zaWRzWzBdLl9pZDtcblx0XHRcdFx0c3Bpbm5lci5oaWRlKCdzZXJ2ZXJzLXNwaW5uZXInKTtcblx0XHRcdH0sIGZ1bmN0aW9uKGVycil7XG5cdFx0XHRcdGVycm9yU2VydmljZS5zaG93KGVycik7XG5cdFx0XHR9KTtcblx0XHR9XG5cblx0XHRmdW5jdGlvbiBpbml0KCkge1xuXHRcdFx0aWYob2lkICE9PSAnbmV3Jyl7XG5cblx0XHRcdFx0YnJhbmNoZXNTZXJ2aWNlLmdldChvaWQsIGZ1bmN0aW9uIChicmFuY2gpe1xuXHRcdFx0XHRcdGlmKGJyYW5jaCkge1xuXHRcdFx0XHRcdFx0c2V0QnJhbmNoKGFuZ3VsYXIubWVyZ2Uoe30sIGJyYW5jaCkpO1xuXHRcdFx0XHRcdFx0dm0uYXZhaWxhYmxlUGxhbnMgPSB2bS5wbGFucy5maWx0ZXIoaXNQbGFuQXZhaWxhYmxlKTtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0YXBpLnJlcXVlc3QoeyB1cmw6ICdnZXRCcmFuY2gvJytvaWQgfSkudGhlbihmdW5jdGlvbiAocmVzKXtcblx0XHRcdFx0XHRcdFx0aWYoIXJlcy5kYXRhLnN1Y2Nlc3MpIHJldHVybiBlcnJvclNlcnZpY2Uuc2hvdyhyZXMuZGF0YS5tZXNzYWdlKTtcblxuXHRcdFx0XHRcdFx0XHRzZXRCcmFuY2gocmVzLmRhdGEucmVzdWx0KTtcblx0XHRcdFx0XHRcdFx0dm0uYXZhaWxhYmxlUGxhbnMgPSB2bS5wbGFucy5maWx0ZXIoaXNQbGFuQXZhaWxhYmxlKTtcblx0XHRcdFx0XHRcdH0sIGZ1bmN0aW9uIChlcnIpe1xuXHRcdFx0XHRcdFx0XHRlcnJvclNlcnZpY2Uuc2hvdyhlcnIpO1xuXHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdHNwaW5uZXIuaGlkZSgncGxhbnMtc3Bpbm5lcicpO1xuXHRcdFx0XHR9KTtcblxuXHRcdFx0XHR2bS5uZXdCcmFuY2ggPSBmYWxzZTtcblxuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0dm0ubmV3QnJhbmNoID0gdHJ1ZTtcblx0XHRcdFx0dm0ubnVtUG9vbCA9ICcyMDAtMjk5Jztcblx0XHRcdFx0dm0uaW5zdGFuY2UuX3N1YnNjcmlwdGlvbi5wbGFuSWQgPSAnc3RhbmRhcmQnO1xuXHRcdFx0XHR2bS5hdmFpbGFibGVQbGFucyA9IHZtLnBsYW5zO1xuXG5cdFx0XHRcdGlmKGNhcnRJdGVtICYmIGNhcnQuZ2V0KGNhcnRJdGVtKSkge1xuXHRcdFx0XHRcdHNldEJyYW5jaChjYXJ0LmdldChjYXJ0SXRlbSkuZGF0YSk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRhcGkucmVxdWVzdCh7XG5cdFx0XHRcdFx0dXJsOiAnY2FuQ3JlYXRlVHJpYWxTdWInXG5cdFx0XHRcdH0pLnRoZW4oZnVuY3Rpb24ocmVzKXtcblx0XHRcdFx0XHRpZighcmVzLmRhdGEuc3VjY2VzcykgcmV0dXJuIGVycm9yU2VydmljZS5zaG93KHJlcy5kYXRhLm1lc3NhZ2UpO1xuXHRcdFx0XHRcdFxuXHRcdFx0XHRcdGlmKHJlcy5kYXRhLnJlc3VsdCkgdm0udHJpYWwgPSB0cnVlO1xuXHRcdFx0XHRcdGVsc2Ugdm0udHJpYWwgPSBmYWxzZTtcblx0XHRcdFx0XHRzcGlubmVyLmhpZGUoJ3BsYW5zLXNwaW5uZXInKTtcblx0XHRcdFx0fSwgZnVuY3Rpb24oZXJyKXtcblx0XHRcdFx0XHRlcnJvclNlcnZpY2Uuc2hvdyhlcnIuZGF0YS5tZXNzYWdlKTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gcHJvY2VlZChhY3Rpb24pe1xuXG5cdFx0XHR2YXIgYnJhbmNoU2V0dHMgPSBnZXRCcmFuY2hTZXR0cygpO1xuXHRcdFx0Y29uc29sZS5sb2coJ3Byb2NlZWQ6ICcsIGJyYW5jaFNldHRzLCB2bS5hZGRPbnMpO1xuXHRcdFx0aWYoIWJyYW5jaFNldHRzKSB7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0Ly8gUHJvaGliaXQgZG93bmdyYWRlIGlmIHBsYW4ncyBzdG9yZWxpbWl0IFxuXHRcdFx0Ly8gaXMgbGVzcyB0aGFuIGJyYW5jaCBpcyBhbHJlYWR5IHV0aWxpemVkXG5cdFx0XHRpZihicmFuY2hTZXR0cy5yZXN1bHQuc3RvcmVsaW1pdCA8IGJyYW5jaFNldHRzLnJlc3VsdC5zdG9yZXNpemUpIHtcblx0XHRcdFx0JHRyYW5zbGF0ZSgnRVJST1JTLkRPV05HUkFERV9FUlJPUl9TVE9SQUdFJylcblx0XHRcdFx0LnRoZW4oZnVuY3Rpb24odHJhbnNsYXRpb24pe1xuXHRcdFx0XHRcdGFsZXJ0KHRyYW5zbGF0aW9uKTtcblx0XHRcdFx0fSk7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblx0XHRcdC8vIFByb2hpYml0IGRvd25ncmFkZSBpZiB0aGUgbmV3IG51YmVyIG9mIG1heHVzZXJzIFxuXHRcdFx0Ly8gaXMgbGVzcyB0aGFuIHRoZSBudW1iZXIgb2YgY3JlYXRlZCB1c2VycyBpbiBicmFuY2hcblx0XHRcdGlmKGJyYW5jaFNldHRzLl9zdWJzY3JpcHRpb24ucXVhbnRpdHkgPCBicmFuY2hTZXR0cy5yZXN1bHQudXNlcnMpIHtcblx0XHRcdFx0JHRyYW5zbGF0ZSgnRVJST1JTLkRPV05HUkFERV9FUlJPUl9VU0VSUycpXG5cdFx0XHRcdC50aGVuKGZ1bmN0aW9uKHRyYW5zbGF0aW9uKXtcblx0XHRcdFx0XHRhbGVydCh0cmFuc2xhdGlvbik7XG5cdFx0XHRcdH0pO1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdHZhciBhY3Rpb25TdHIgPSAnJzsgXG5cdFx0XHRpZihhY3Rpb24gPT09ICdjcmVhdGVTdWJzY3JpcHRpb24nKSB7XG5cdFx0XHRcdGFjdGlvblN0ciA9ICdORVdfU1VCU0NSSVBUSU9OJztcblx0XHRcdH0gZWxzZSBpZihhY3Rpb24gPT09ICd1cGRhdGVTdWJzY3JpcHRpb24nIHx8IGFjdGlvbiA9PT0gJ2NoYW5nZVBsYW4nKSB7XG5cdFx0XHRcdGFjdGlvblN0ciA9ICdVUERBVEVfU1VCU0NSSVBUSU9OJztcblx0XHRcdH1cblxuXHRcdFx0JHRyYW5zbGF0ZSgnREVTQ1JJUFRJT05TLicrYWN0aW9uU3RyLCB7XG5cdFx0XHRcdHBsYW5JZDogYnJhbmNoU2V0dHMuX3N1YnNjcmlwdGlvbi5wbGFuSWQsXG5cdFx0XHRcdHVzZXJzOiBicmFuY2hTZXR0cy5fc3Vic2NyaXB0aW9uLnF1YW50aXR5LFxuXHRcdFx0XHRtYXhsaW5lczogYnJhbmNoU2V0dHMucmVzdWx0Lm1heGxpbmVzLFxuXHRcdFx0XHRjb21wYW55OiBicmFuY2hTZXR0cy5yZXN1bHQubmFtZVxuXHRcdFx0fSlcblx0XHRcdC50aGVuKGZ1bmN0aW9uIChkZXNjcmlwdGlvbikge1xuXHRcdFx0XHRcblx0XHRcdFx0YnJhbmNoU2V0dHMuX3N1YnNjcmlwdGlvbi5kZXNjcmlwdGlvbiA9IGRlc2NyaXB0aW9uO1xuXG5cdFx0XHRcdGlmKGNhcnRJdGVtKSB7XG5cdFx0XHRcdFx0Y2FydC51cGRhdGUoYnJhbmNoU2V0dHMucmVzdWx0LnByZWZpeCwge1xuXHRcdFx0XHRcdFx0YWN0aW9uOiBhY3Rpb24sXG5cdFx0XHRcdFx0XHRkZXNjcmlwdGlvbjogZGVzY3JpcHRpb24sXG5cdFx0XHRcdFx0XHRhbW91bnQ6IHZtLnRvdGFsQW1vdW50LFxuXHRcdFx0XHRcdFx0ZGF0YTogYnJhbmNoU2V0dHNcblx0XHRcdFx0XHR9KTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHQvLyBjYXJ0Wyh2bS5jdXN0b21lci5yb2xlID09PSAndXNlcicgPyAnc2V0JyA6ICdhZGQnKV0oe1xuXHRcdFx0XHRcdGNhcnQuYWRkKHtcblx0XHRcdFx0XHRcdGFjdGlvbjogYWN0aW9uLFxuXHRcdFx0XHRcdFx0ZGVzY3JpcHRpb246IGRlc2NyaXB0aW9uLFxuXHRcdFx0XHRcdFx0YW1vdW50OiB2bS50b3RhbEFtb3VudCxcblx0XHRcdFx0XHRcdGRhdGE6IGJyYW5jaFNldHRzXG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHQkbG9jYXRpb24ucGF0aCgnL3BheW1lbnQnKTtcblx0XHRcdH0pO1xuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIHVwZGF0ZSgpe1xuXG5cdFx0XHR2YXIgYnJhbmNoU2V0dHMgPSBnZXRCcmFuY2hTZXR0cygpLFxuXHRcdFx0XHRiYWxhbmNlLFxuXHRcdFx0XHRwbGFuUHJpY2UsXG5cdFx0XHRcdHBsYW5BbW91bnQsXG5cdFx0XHRcdGJpbGxpbmdDeXJjbGVzO1xuXG5cblx0XHRcdGlmKCFicmFuY2hTZXR0cykge1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdC8vIFByb2hpYml0IGRvd25ncmFkZSBpZiBwbGFuJ3Mgc3RvcmVsaW1pdCBcblx0XHRcdC8vIGlzIGxlc3MgdGhhbiBicmFuY2ggaXMgYWxyZWFkeSB1dGlsaXplZFxuXHRcdFx0aWYoYnJhbmNoU2V0dHMucmVzdWx0LnN0b3JlbGltaXQgPCBicmFuY2hTZXR0cy5yZXN1bHQuc3RvcmVzaXplKSB7XG5cdFx0XHRcdCR0cmFuc2xhdGUoJ0VSUk9SUy5ET1dOR1JBREVfRVJST1JfU1RPUkFHRScpXG5cdFx0XHRcdC50aGVuKGZ1bmN0aW9uKHRyYW5zbGF0aW9uKXtcblx0XHRcdFx0XHRhbGVydCh0cmFuc2xhdGlvbik7XG5cdFx0XHRcdH0pO1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cdFx0XHQvLyBQcm9oaWJpdCBkb3duZ3JhZGUgaWYgdGhlIG5ldyBudWJlciBvZiBtYXh1c2VycyBcblx0XHRcdC8vIGlzIGxlc3MgdGhhbiB0aGUgbnVtYmVyIG9mIGNyZWF0ZWQgdXNlcnMgaW4gYnJhbmNoXG5cdFx0XHRpZihicmFuY2hTZXR0cy5fc3Vic2NyaXB0aW9uLnF1YW50aXR5IDwgYnJhbmNoU2V0dHMucmVzdWx0LnVzZXJzKSB7XG5cdFx0XHRcdCR0cmFuc2xhdGUoJ0VSUk9SUy5ET1dOR1JBREVfRVJST1JfVVNFUlMnKVxuXHRcdFx0XHQudGhlbihmdW5jdGlvbih0cmFuc2xhdGlvbil7XG5cdFx0XHRcdFx0YWxlcnQodHJhbnNsYXRpb24pO1xuXHRcdFx0XHR9KTtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0XHRiYWxhbmNlID0gcGFyc2VGbG9hdCh2bS5jdXN0b21lci5iYWxhbmNlKTtcblx0XHRcdHBsYW5QcmljZSA9IHBhcnNlRmxvYXQodm0uc2VsZWN0ZWRQbGFuLnByaWNlKTtcblx0XHRcdHBsYW5BbW91bnQgPSBwYXJzZUZsb2F0KHZtLnRvdGFsQW1vdW50KTtcblx0XHRcdGJpbGxpbmdDeXJjbGVzID0gYnJhbmNoU2V0dHMuX3N1YnNjcmlwdGlvbi5iaWxsaW5nQ3lyY2xlcztcblxuXHRcdFx0aWYoYmFsYW5jZSA8IHBsYW5BbW91bnQgfHwgKHZtLnByZXZQbGFuSWQgJiYgYnJhbmNoU2V0dHMuX3N1YnNjcmlwdGlvbi5wbGFuSWQgIT09IHZtLnByZXZQbGFuSWQpKSB7XG5cblx0XHRcdFx0cHJvY2VlZCgnY2hhbmdlUGxhbicpO1xuXHRcdFx0XHRyZXR1cm47XG5cblx0XHRcdH1cblxuXHRcdFx0YXBpLnJlcXVlc3Qoe1xuXHRcdFx0XHR1cmw6ICd1cGRhdGVTdWJzY3JpcHRpb24nLFxuXHRcdFx0XHRwYXJhbXM6IGJyYW5jaFNldHRzXG5cdFx0XHR9KS50aGVuKGZ1bmN0aW9uKHJlcyl7XG5cdFx0XHRcdGlmKCFyZXMuZGF0YS5zdWNjZXNzKSB7XG5cdFx0XHRcdFx0aWYoZXJyLmRhdGEubWVzc2FnZSA9PT0gJ0VSUk9SUy5OT1RfRU5PVUdIX0NSRURJVFMnKSBwcm9jZWVkKCd1cGRhdGVTdWJzY3JpcHRpb24nKTtcblx0XHRcdFx0XHRlbHNlIGVycm9yU2VydmljZS5zaG93KHJlcy5kYXRhLm1lc3NhZ2UpO1xuXHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGJyYW5jaGVzU2VydmljZS51cGRhdGUoYnJhbmNoU2V0dHMub2lkLCBicmFuY2hTZXR0cyk7XG5cdFx0XHRcdG5vdGlmeVNlcnZpY2Uuc2hvdygnQUxMX0NIQU5HRVNfU0FWRUQnKTtcblx0XHRcdH0sIGZ1bmN0aW9uKGVycil7XG5cdFx0XHRcdGVycm9yU2VydmljZS5zaG93KGVycik7XG5cdFx0XHR9KTtcblx0XHR9XG5cdFx0XG5cdFx0ZnVuY3Rpb24gc2V0QnJhbmNoKG9wdHMpIHtcblx0XHRcdHZtLmluc3RhbmNlID0gb3B0cztcblx0XHRcdHZtLmluaXROYW1lID0gb3B0cy5yZXN1bHQubmFtZTtcblxuXHRcdFx0aWYob3B0cy5yZXN1bHQuZXh0ZW5zaW9ucykge1xuXHRcdFx0XHR2bS5udW1Qb29sID0gcG9vbFNpemVTZXJ2aWNlcy5wb29sQXJyYXlUb1N0cmluZyhvcHRzLnJlc3VsdC5leHRlbnNpb25zKTtcblx0XHRcdH1cblx0XHRcdFxuXHRcdFx0Ly8gaWYob3B0cy5fc3Vic2NyaXB0aW9uLnBsYW5JZCAmJiBvcHRzLl9zdWJzY3JpcHRpb24ucGxhbklkICE9PSAndHJpYWwnICYmIG9wdHMuX3N1YnNjcmlwdGlvbi5wbGFuSWQgIT09ICdmcmVlJykge1xuXHRcdFx0Ly8gXHR2bS5ub1RyaWFsID0gdHJ1ZTtcblx0XHRcdC8vIH1cblxuXHRcdFx0aWYob3B0cy5fc3Vic2NyaXB0aW9uLmFkZE9ucy5sZW5ndGgpIHtcblx0XHRcdFx0dm0uYWRkT25zID0gdXRpbHMuYXJyYXlUb09iamVjdChvcHRzLl9zdWJzY3JpcHRpb24uYWRkT25zLCAnbmFtZScpO1xuXHRcdFx0fVxuXG5cdFx0XHR2bS5zdG9yYWdlcy5mb3JFYWNoKGZ1bmN0aW9uKGl0ZW0sIGluZGV4LCBhcnJheSl7XG5cdFx0XHRcdGlmKGl0ZW0gIT09ICcwJyAmJiBwYXJzZUludChpdGVtLCAxMCkgPCBvcHRzLnJlc3VsdC5zdG9yZXNpemUpIGFycmF5LnNwbGljZShpbmRleCwgMSk7XG5cdFx0XHR9KTtcblxuXHRcdFx0Y29uc29sZS5sb2coJ3NldEJyYW5jaDogJywgdm0uaW5zdGFuY2UpO1xuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIGdldEJyYW5jaFNldHRzKCkge1xuXHRcdFx0dmFyIGFkZE9ucyA9IFtdO1xuXG5cdFx0XHRpZighdm0uaW5zdGFuY2UuX3N1YnNjcmlwdGlvbi5wbGFuSWQgfHwgIXZtLmluc3RhbmNlLnJlc3VsdC5wcmVmaXggfHwgIXZtLm51bVBvb2wgfHwgIXZtLmluc3RhbmNlLnJlc3VsdC5uYW1lIHx8ICghdm0uaW5zdGFuY2UucmVzdWx0LmFkbWlucGFzcyAmJiB2bS5uZXdCcmFuY2gpKSB7XG5cdFx0XHRcdGVycm9yU2VydmljZS5zaG93KCdNSVNTSU5HX0ZJRUxEUycpO1xuXHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0XHR9XG5cblx0XHRcdGNvbnNvbGUubG9nKCdwYXNzOiAnLCB2bS5pbnN0YW5jZS5yZXN1bHQuYWRtaW5wYXNzLCB2bS5jb25maXJtUGFzcyk7XG5cdFx0XHRpZih2bS5pbnN0YW5jZS5yZXN1bHQuYWRtaW5wYXNzICYmICh2bS5jb25maXJtUGFzcyAhPT0gdm0uaW5zdGFuY2UucmVzdWx0LmFkbWlucGFzcykpe1xuXHRcdFx0XHRlcnJvclNlcnZpY2Uuc2hvdygnUEFTU1dPUkRfTk9UX0NPTkZJUk1FRCcpO1xuXHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0XHR9XG5cblx0XHRcdHZtLmluc3RhbmNlLnJlc3VsdC5leHRlbnNpb25zID0gcG9vbFNpemVTZXJ2aWNlcy5wb29sU3RyaW5nVG9PYmplY3Qodm0ubnVtUG9vbCk7XG5cdFx0XHR2bS5pbnN0YW5jZS5yZXN1bHQuYWRtaW5uYW1lID0gdm0uaW5zdGFuY2UucmVzdWx0LnByZWZpeDtcblx0XHRcdHZtLmluc3RhbmNlLnJlc3VsdC5tYXhsaW5lcyA9IHBhcnNlSW50KHZtLnRvdGFsTGluZXMsIDEwKTtcblx0XHRcdHZtLmluc3RhbmNlLnJlc3VsdC5tYXh1c2VycyA9IHBhcnNlSW50KHZtLmluc3RhbmNlLl9zdWJzY3JpcHRpb24ucXVhbnRpdHksIDEwKTtcblx0XHRcdHZtLmluc3RhbmNlLnJlc3VsdC5zdG9yZWxpbWl0ID0gY29udmVydEJ5dGVzRmlsdGVyKHZtLnRvdGFsU3RvcmFnZSwgJ0dCJywgJ0J5dGUnKTtcblx0XHRcdGlmKG9pZCkgdm0uaW5zdGFuY2Uub2lkID0gb2lkO1xuXG5cdFx0XHRhbmd1bGFyLmZvckVhY2godm0uYWRkT25zLCBmdW5jdGlvbihhZGRPbil7XG5cdFx0XHRcdGlmKGFkZE9uLnF1YW50aXR5KSBhZGRPbi5xdWFudGl0eSA9IHBhcnNlSW50KGFkZE9uLnF1YW50aXR5KTtcblx0XHRcdFx0YWRkT25zLnB1c2goYWRkT24pO1xuXHRcdFx0fSk7XG5cblx0XHRcdHZtLmluc3RhbmNlLl9zdWJzY3JpcHRpb24uYWRkT25zID0gYWRkT25zO1xuXG5cdFx0XHRyZXR1cm4gdm0uaW5zdGFuY2U7XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gc2VsZWN0UGxhbihwbGFuKSB7XG5cdFx0XHR2bS5pbnN0YW5jZS5fc3Vic2NyaXB0aW9uLnBsYW5JZCA9IHBsYW4ucGxhbklkO1xuXHRcdFx0dm0uaW5zdGFuY2UuX3N1YnNjcmlwdGlvbi5udW1JZCA9IHBsYW4ubnVtSWQ7XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gaXNQbGFuQXZhaWxhYmxlKHBsYW4pIHtcblx0XHRcdGNvbnNvbGUubG9nKCdpc1BsYW5BdmFpbGFibGU6ICcsIHBsYW4ubnVtSWQgPj0gdm0uaW5zdGFuY2UuX3N1YnNjcmlwdGlvbi5udW1JZCk7XG5cdFx0XHRpZihwbGFuLm51bUlkID49IHZtLmluc3RhbmNlLl9zdWJzY3JpcHRpb24ubnVtSWQpIHtcblx0XHRcdFx0cmV0dXJuIHBsYW47XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gc2VsZWN0U2VydmVyKHNpZCkge1xuXHRcdFx0dm0uaW5zdGFuY2Uuc2lkID0gc2lkO1xuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIHRvdGFsQW1vdW50KCkge1xuXHRcdFx0dmFyIHN1YiA9IHZtLmluc3RhbmNlLl9zdWJzY3JpcHRpb247XG5cdFx0XHR2bS50b3RhbEFtb3VudCA9IHN1Yi5xdWFudGl0eSAqIHBhcnNlRmxvYXQodm0uc2VsZWN0ZWRQbGFuLnByaWNlKTtcblxuXHRcdFx0aWYodm0uc2VsZWN0ZWRQbGFuLmFkZE9ucyAmJiBPYmplY3Qua2V5cyh2bS5zZWxlY3RlZFBsYW4uYWRkT25zKS5sZW5ndGgpIHtcblx0XHRcdFx0dm0udG90YWxBbW91bnQgKz0gdm0uYWRkT25zLnN0b3JhZ2UucXVhbnRpdHkgKiBwYXJzZUZsb2F0KHZtLnNlbGVjdGVkUGxhbi5hZGRPbnMuc3RvcmFnZS5wcmljZSk7XG5cdFx0XHRcdHZtLnRvdGFsQW1vdW50ICs9IHZtLmFkZE9ucy5saW5lcy5xdWFudGl0eSAqIHBhcnNlRmxvYXQodm0uc2VsZWN0ZWRQbGFuLmFkZE9ucy5saW5lcy5wcmljZSk7XG5cdFx0XHR9XG5cdFx0XHR2bS50b3RhbEFtb3VudCA9IHZtLnRvdGFsQW1vdW50LnRvRml4ZWQoMik7XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gdG90YWxTdG9yYWdlKCkge1xuXHRcdFx0dmFyIHN1YiA9IHZtLmluc3RhbmNlLl9zdWJzY3JpcHRpb247XG5cdFx0XHRpZih2bS5zZWxlY3RlZFBsYW4uY3VzdG9tRGF0YSkge1xuXHRcdFx0XHR2bS50b3RhbFN0b3JhZ2UgPSBzdWIucXVhbnRpdHkgKiBwYXJzZUZsb2F0KHZtLnNlbGVjdGVkUGxhbi5jdXN0b21EYXRhLnN0b3JhZ2VwZXJ1c2VyKTtcblx0XHRcdH1cblx0XHRcdGlmKHZtLmFkZE9ucy5zdG9yYWdlKSB7XG5cdFx0XHRcdHZtLnRvdGFsU3RvcmFnZSArPSBwYXJzZUludCh2bS5hZGRPbnMuc3RvcmFnZS5xdWFudGl0eSwgMTApO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIHRvdGFsTGluZXMoKSB7XG5cdFx0XHR2YXIgc3ViID0gdm0uaW5zdGFuY2UuX3N1YnNjcmlwdGlvbjtcblx0XHRcdHZtLnRvdGFsTGluZXMgPSBzdWIucXVhbnRpdHkgKiAyO1xuXHRcdFx0aWYodm0uYWRkT25zLmxpbmVzKSB7XG5cdFx0XHRcdHZtLnRvdGFsTGluZXMgKz0gcGFyc2VJbnQodm0uYWRkT25zLmxpbmVzLnF1YW50aXR5LCAxMCk7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gZ2VuZXJhdGVQYXNzd29yZChtaW4sIG1heCkge1xuXHRcdFx0dmFyIG5ld1Bhc3MgPSAnJztcblx0XHRcdHdoaWxlKCF1dGlscy5jaGVja1Bhc3N3b3JkU3RyZW5ndGgobmV3UGFzcykpIHtcblx0XHRcdFx0bmV3UGFzcyA9IHV0aWxzLmdlbmVyYXRlUGFzc3dvcmQobWluLCBtYXgpO1xuXHRcdFx0fVxuXHRcdFx0dm0uaW5zdGFuY2UucmVzdWx0LmFkbWlucGFzcyA9IG5ld1Bhc3M7XG5cdFx0XHR2bS5jb25maXJtUGFzcyA9IG5ld1Bhc3M7XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gcmV2ZWFsUGFzc3dvcmQoKSB7XG5cdFx0XHR2bS5wYXNzVHlwZSA9IHZtLnBhc3NUeXBlID09PSAndGV4dCcgPyAncGFzc3dvcmQnIDogJ3RleHQnO1xuXHRcdH1cblxuXHR9XG5cbn0pKCk7IiwiYW5ndWxhci5tb2R1bGUoJ2FwcC5pbnN0YW5jZScpXG4uY29uZmlnKFsnJHJvdXRlUHJvdmlkZXInLCBmdW5jdGlvbigkcm91dGVQcm92aWRlcil7XG5cblx0JHJvdXRlUHJvdmlkZXJcblx0XHQud2hlbignL2luc3RhbmNlLzpvaWQnLCB7XG5cdFx0XHR0ZW1wbGF0ZVVybDogJ2luc3RhbmNlL2luc3RhbmNlLmh0bWwnLFxuXHRcdFx0Y29udHJvbGxlcjogJ0luc3RhbmNlQ29udHJvbGxlcicsXG5cdFx0XHRjb250cm9sbGVyQXM6ICdpbnN0Vm0nLFxuXHRcdFx0cmVzb2x2ZToge1xuXHRcdFx0XHRsb2dnZWRpbjogaXNBdXRob3JpemVkXG5cdFx0XHR9XG5cdFx0fSk7XG5cbn1dKTtcblxuaXNBdXRob3JpemVkLiRpbmplY3QgPSBbJ2F1dGhTZXJ2aWNlJ107XG5mdW5jdGlvbiBpc0F1dGhvcml6ZWQoYXV0aFNlcnZpY2UpIHtcblx0cmV0dXJuIGF1dGhTZXJ2aWNlLmlzQXV0aG9yaXplZCgpO1xufSIsIihmdW5jdGlvbigpe1xuXG5cdCd1c2Ugc3RyaWN0JztcblxuXHRhbmd1bGFyXG5cdFx0Lm1vZHVsZSgnYXBwLmluc3RhbmNlJylcblx0XHQuZGlyZWN0aXZlKCdwbGFuSXRlbScsIHBsYW5JdGVtKTtcblxuXHRmdW5jdGlvbiBwbGFuSXRlbSgpe1xuXG5cdFx0cmV0dXJuIHtcblx0XHRcdHJlc3RyaWN0OiAnQUUnLFxuXHRcdFx0dHJhbnNjbHVkZTogdHJ1ZSxcblx0XHRcdHNjb3BlOiB7XG5cdFx0XHRcdHBsYW46ICc9Jyxcblx0XHRcdFx0bW9kZWw6ICc9Jyxcblx0XHRcdFx0c2VsZWN0UGxhbjogJyYnLFxuXHRcdFx0XHRzaG93UGxhbnM6ICcmJ1xuXHRcdFx0fSxcblx0XHRcdHRlbXBsYXRlVXJsOiAnaW5zdGFuY2UvcGxhbi5odG1sJ1xuXHRcdH07XG5cblx0fVxuXG59KSgpOyIsIihmdW5jdGlvbigpe1xuXG5cdCd1c2Ugc3RyaWN0JztcblxuXHRhbmd1bGFyXG5cdFx0Lm1vZHVsZSgnYXBwLmluc3RhbmNlJylcblx0XHQuZGlyZWN0aXZlKCdzZXJ2ZXJJdGVtJywgc2VydmVySXRlbSk7XG5cblx0ZnVuY3Rpb24gc2VydmVySXRlbSgpe1xuXG5cdFx0cmV0dXJuIHtcblx0XHRcdHJlc3RyaWN0OiAnQUUnLFxuXHRcdFx0dHJhbnNjbHVkZTogdHJ1ZSxcblx0XHRcdHNjb3BlOiB7XG5cdFx0XHRcdG1vZGVsOiAnPScsXG5cdFx0XHRcdHNlcnZlcjogJz0nLFxuXHRcdFx0XHRuZXdCcmFuY2g6ICc9Jyxcblx0XHRcdFx0c2VsZWN0U2VydmVyOiAnJidcblx0XHRcdH0sXG5cdFx0XHR0ZW1wbGF0ZVVybDogJ2luc3RhbmNlL3NlcnZlci1pdGVtLmh0bWwnXG5cdFx0fTtcblxuXHR9XG5cbn0pKCk7IiwiKGZ1bmN0aW9uKCl7XG5cblx0J3VzZSBzdHJpY3QnO1xuXG5cdGFuZ3VsYXJcblx0XHQubW9kdWxlKCdhcHAubGF5b3V0Jylcblx0XHQuY29udHJvbGxlcignQ29udGVudENvbnRyb2xsZXInLCBDb250ZW50Q29udHJvbGxlcik7XG5cblx0Q29udGVudENvbnRyb2xsZXIuJGluamVjdCA9IFsnJHJvb3RTY29wZSddO1xuXG5cdGZ1bmN0aW9uIENvbnRlbnRDb250cm9sbGVyKCRyb290U2NvcGUpIHtcblxuXHRcdHZhciB2bSA9IHRoaXM7XG5cdFx0Ly8gdm0uZnVsbFZpZXcgPSB0cnVlO1xuXG5cdH1cblxufSkoKTsiLCIoZnVuY3Rpb24oKXtcblxuXHQndXNlIHN0cmljdCc7XG5cblx0YW5ndWxhclxuXHRcdC5tb2R1bGUoJ2FwcC5sYXlvdXQnKVxuXHRcdC5jb250cm9sbGVyKCdMYXlvdXRDb250cm9sbGVyJywgTGF5b3V0Q29udHJvbGxlcik7XG5cblx0TGF5b3V0Q29udHJvbGxlci4kaW5qZWN0ID0gWyckcm9vdFNjb3BlJ107XG5cblx0ZnVuY3Rpb24gTGF5b3V0Q29udHJvbGxlcigkcm9vdFNjb3BlKSB7XG5cblx0XHR2YXIgdm0gPSB0aGlzO1xuXG5cdFx0dm0uZnVsbFZpZXcgPSB0cnVlO1xuXHRcdHZtLnRvcGJhciA9IGZhbHNlO1xuXHRcdHZtLnNpZGVtZW51ID0gZmFsc2U7XG5cdFx0dm0ubGFuZ21lbnUgPSBmYWxzZTtcblx0XHR2bS5mb290ZXIgPSB0cnVlO1xuXHRcdHZtLnRyaWdnZXJTaWRlYmFyID0gdHJpZ2dlclNpZGViYXI7XG5cdFx0dm0udHJpZ2dlckxhbmdNZW51ID0gdHJpZ2dlckxhbmdNZW51O1xuXG5cdFx0JHJvb3RTY29wZS4kb24oJ2F1dGgubG9naW4nLCBmdW5jdGlvbihlKXtcblx0XHRcdHZtLmZ1bGxWaWV3ID0gZmFsc2U7XG5cdFx0XHR2bS50b3BiYXIgPSB0cnVlO1xuXHRcdFx0dm0uc2lkZW1lbnUgPSB0cnVlO1xuXHRcdFx0dm0uZm9vdGVyID0gZmFsc2U7XG5cblx0XHRcdGNvbnNvbGUubG9nKCdsYXlvdXQgdm0uc2lkZW1lbnU6ICcsIHZtLnNpZGVtZW51KTtcblx0XHR9KTtcblxuXHRcdCRyb290U2NvcGUuJG9uKCdhdXRoLmxvZ291dCcsIGZ1bmN0aW9uKGUpe1xuXHRcdFx0dm0uZnVsbFZpZXcgPSB0cnVlO1xuXHRcdFx0dm0udG9wYmFyID0gZmFsc2U7XG5cdFx0XHR2bS5zaWRlbWVudSA9IGZhbHNlO1xuXHRcdFx0dm0uZm9vdGVyID0gdHJ1ZTtcblxuXHRcdFx0Y29uc29sZS5sb2coJ2xheW91dCB2bS5zaWRlbWVudTogJywgdm0uc2lkZW1lbnUpO1xuXHRcdH0pO1xuXG5cdFx0ZnVuY3Rpb24gdHJpZ2dlclNpZGViYXIoKSB7XG5cdFx0XHRjb25zb2xlLmxvZygndHJpZ2dlciBzaWRlYmFyIScpO1xuXHRcdFx0dm0uc2lkZW1lbnUgPSAhdm0uc2lkZW1lbnU7XG5cdFx0fTtcblxuXHRcdGZ1bmN0aW9uIHRyaWdnZXJMYW5nTWVudSgpIHtcblx0XHRcdGNvbnNvbGUubG9nKCd0cmlnZ2VyIGxhbmdtZW51IScpO1xuXHRcdFx0dm0ubGFuZ21lbnUgPSAhdm0ubGFuZ21lbnU7XG5cdFx0fVxuXG5cdH1cblxufSkoKTsiLCIoZnVuY3Rpb24oKXtcblxuXHQndXNlIHN0cmljdCc7XG5cblx0YW5ndWxhclxuXHRcdC5tb2R1bGUoJ2FwcC5wYXltZW50Jylcblx0XHQuZGlyZWN0aXZlKCdtZXRob2RJdGVtJywgbWV0aG9kSXRlbSk7XG5cblx0ZnVuY3Rpb24gbWV0aG9kSXRlbSgpe1xuXG5cdFx0cmV0dXJuIHtcblx0XHRcdHJlc3RyaWN0OiAnQUUnLFxuXHRcdFx0dHJhbnNjbHVkZTogdHJ1ZSxcblx0XHRcdHNjb3BlOiB7XG5cdFx0XHRcdG1vZGVsOiAnPScsXG5cdFx0XHRcdG1ldGhvZDogJz0nLFxuXHRcdFx0XHR1bnNlbGVjdGFibGU6ICc9Jyxcblx0XHRcdFx0c2VsZWN0OiAnJidcblx0XHRcdH0sXG5cdFx0XHR0ZW1wbGF0ZVVybDogJ3BheW1lbnQvbWV0aG9kLWl0ZW0uaHRtbCdcblx0XHR9O1xuXG5cdH1cblxufSkoKTsiLCIoZnVuY3Rpb24oKXtcblxuXHQndXNlIHN0cmljdCc7XG5cblx0YW5ndWxhclxuXHRcdC5tb2R1bGUoJ2FwcC5wYXltZW50Jylcblx0XHQuY29udHJvbGxlcignUGF5bWVudENvbnRyb2xsZXInLCBQYXltZW50Q29udHJvbGxlcik7XG5cblx0UGF5bWVudENvbnRyb2xsZXIuJGluamVjdCA9IFsnJHEnLCAnJHNjb3BlJywgJyRodHRwJywgJyRyb290U2NvcGUnLCAnJGxvY2FsU3RvcmFnZScsICckbG9jYXRpb24nLCAnYXBpU2VydmljZScsICdicmFuY2hlc1NlcnZpY2UnLCAnY3VzdG9tZXJTZXJ2aWNlJywgJ2NhcnRTZXJ2aWNlJywgJ25vdGlmeVNlcnZpY2UnLCAnZXJyb3JTZXJ2aWNlJywgJ3NwaW5uZXJTZXJ2aWNlJ107XG5cblx0ZnVuY3Rpb24gUGF5bWVudENvbnRyb2xsZXIoJHEsICRzY29wZSwgJGh0dHAsICRyb290U2NvcGUsICRsb2NhbFN0b3JhZ2UsICRsb2NhdGlvbiwgYXBpLCBicmFuY2hlc1NlcnZpY2UsIGN1c3RvbWVyU2VydmljZSwgY2FydFNlcnZpY2UsIG5vdGlmeVNlcnZpY2UsIGVycm9yU2VydmljZSwgc3Bpbm5lclNlcnZpY2UpIHtcblxuXHRcdHZhciB2bSA9IHRoaXM7XG5cdFx0XG5cdFx0dm0uY3VzdG9tZXIgPSBjdXN0b21lclNlcnZpY2UuZ2V0Q3VzdG9tZXIoKTtcblx0XHRjb25zb2xlLmxvZygndm0uY3VzdG9tZXI6ICcsIHZtLmN1c3RvbWVyLCB2bS5jdXN0b21lci5iYWxhbmNlKTtcblxuXHRcdHZtLnJlcXVpcmVkQW1vdW50ID0gMjA7XG5cdFx0dm0uaXNFbm91Z2ggPSBmYWxzZTtcblx0XHR2bS5jYXJ0ID0gYW5ndWxhci5leHRlbmQoIFtdLCBjYXJ0U2VydmljZS5nZXRBbGwoKSApO1xuXHRcdHZtLnBheW1lbnRNZXRob2RzID0gW1xuXHRcdFx0e1xuXHRcdFx0XHRpZDogMSxcblx0XHRcdFx0aWNvbjogJ2ZhIGZhLWNyZWRpdC1jYXJkJyxcblx0XHRcdFx0bmFtZTogJ0NyZWRpdCBDYXJkJ1xuXHRcdFx0fSxcblx0XHRcdC8vIHtcblx0XHRcdC8vIFx0aWQ6IDIsXG5cdFx0XHQvLyBcdGljb246ICdmYSBmYS1wYXlwYWwnLFxuXHRcdFx0Ly8gXHRuYW1lOiAnUGF5UGFsJyxcblx0XHRcdC8vIFx0Y29taW5nU29vbjogdHJ1ZVxuXHRcdFx0Ly8gfSxcblx0XHRcdC8vIHtcblx0XHRcdC8vIFx0aWQ6IDMsXG5cdFx0XHQvLyBcdGljb246ICdmYSBmYS1iaXRjb2luJyxcblx0XHRcdC8vIFx0bmFtZTogJ0JpdGNvaW4nLFxuXHRcdFx0Ly8gXHRjb21pbmdTb29uOiB0cnVlXG5cdFx0XHQvLyB9LFxuXHRcdFx0e1xuXHRcdFx0XHRpZDogMCxcblx0XHRcdFx0bmFtZTogJ1JpbmdvdGVsIEJhbGFuY2UnXG5cdFx0XHR9XG5cdFx0XTtcblx0XHR2bS5zZWxlY3RNZXRob2QgPSBzZWxlY3RNZXRob2Q7XG5cdFx0dm0ucHJvY2VlZFBheW1lbnQgPSBwcm9jZWVkUGF5bWVudDtcblx0XHR2bS5yZW1vdmVDYXJ0SXRlbSA9IHJlbW92ZUNhcnRJdGVtO1xuXHRcdHZtLmNhbmNlbCA9IGNhbmNlbDtcblx0XHRpZih2bS5jYXJ0Lmxlbmd0aCAmJiB2bS5jdXN0b21lci5iYWxhbmNlIDwgMCkgYWRkRGVidEFtb3V0KCk7XG5cdFx0dm0uYW1vdW50ID0gY291dEFtb3VudCh2bS5jYXJ0KTtcblx0XHR2bS5wYXltZW50TWV0aG9kID0gdm0uYW1vdW50ID4gMCA/IDEgOiAwO1xuXHRcdHZtLmlzVW5zZWxlY3RhYmxlTWV0aG9kID0gaXNVbnNlbGVjdGFibGVNZXRob2Q7XG5cblxuXHRcdCRyb290U2NvcGUuJG9uKCdjdXN0b21lci51cGRhdGUnLCBmdW5jdGlvbihldmVudCwgY3VzdG9tZXIpIHtcblx0XHRcdHZtLmN1c3RvbWVyID0gY3VzdG9tZXI7XG5cdFx0XHRpc0Vub3VnaCgpO1xuXHRcdH0pO1xuXG5cdFx0JHNjb3BlLiR3YXRjaChmdW5jdGlvbigpe1xuXHRcdFx0cmV0dXJuIHZtLmNhcnQubGVuZ3RoO1xuXHRcdH0sIGZ1bmN0aW9uKHZhbCl7XG5cdFx0XHR2YXIgcmVxQW1vdW50ID0gY291dEFtb3VudCh2bS5jYXJ0KTtcblx0XHRcdHZtLmFtb3VudCA9IHJlcUFtb3VudDtcblx0XHRcdGlmKHZhbCkgdm0ucmVxdWlyZWRBbW91bnQgPSByZXFBbW91bnQ7XG5cdFx0fSk7XG5cblx0XHQkc2NvcGUuJHdhdGNoKGZ1bmN0aW9uKCl7XG5cdFx0XHRyZXR1cm4gdm0uYW1vdW50O1xuXHRcdH0sIGZ1bmN0aW9uKHZhbCl7XG5cdFx0XHR2bS5hbW91bnQgPSB2YWw7XG5cdFx0XHRpc0Vub3VnaCgpO1xuXHRcdFx0Ly8gcmVxdWlyZWRBbW91bnQgPSB2YWw7XG5cdFx0XHQvLyBpZih2bS5jdXN0b21lci5iYWxhbmNlIDwgcmVxdWlyZWRBbW91bnQgfHwgKCF2YWwgJiYgIXZtLmNhcnQubGVuZ3RoKSkgdm0uaXNFbm91Z2ggPSBmYWxzZTtcblx0XHRcdC8vIGVsc2Ugdm0uaXNFbm91Z2ggPSB0cnVlO1xuXHRcdH0pO1xuXG5cdFx0ZnVuY3Rpb24gaXNFbm91Z2goKSB7XG5cdFx0XHRpZigoIXZtLmFtb3VudCAmJiAhdm0uY2FydC5sZW5ndGgpIHx8IHZtLmFtb3VudCA8IHZtLnJlcXVpcmVkQW1vdW50KSB2bS5pc0Vub3VnaCA9IGZhbHNlO1xuXHRcdFx0ZWxzZSB2bS5pc0Vub3VnaCA9IHRydWU7XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gaXNVbnNlbGVjdGFibGVNZXRob2QobWV0aG9kT2JqKSB7XG5cdFx0XHRyZXR1cm4gKG1ldGhvZE9iai5pZCA9PT0gMCAmJiAodm0uY3VzdG9tZXIuYmFsYW5jZSA8IHZtLmFtb3VudCB8fCAhdm0uY2FydC5sZW5ndGgpIHx8IG1ldGhvZE9iai5pZCAhPT0gMCAmJiAhdm0uYW1vdW50KTtcblx0XHR9XG5cblx0XHRmdW5jdGlvbiBwcm9jZWVkUGF5bWVudCgpIHtcblxuXHRcdFx0aWYodm0ucGF5bWVudE1ldGhvZCA9PT0gdW5kZWZpbmVkKVxuXHRcdFx0XHRyZXR1cm4gZXJyb3JTZXJ2aWNlLnNob3coJ0NIT09TRV9QQVlNRU5UX01FVEhPRCcpO1xuXHRcdFx0aWYodm0uYW1vdW50ID09PSB1bmRlZmluZWQgfHwgdm0uYW1vdW50ID09PSBudWxsIHx8IHZtLmFtb3VudCA8IDApXG5cdFx0XHRcdHJldHVybiBlcnJvclNlcnZpY2Uuc2hvdygnQU1PVU5UX05PVF9TRVQnKTtcblxuXHRcdFx0Ly8gc3Bpbm5lclNlcnZpY2Uuc2hvdygnbWFpbi1zcGlubmVyJyk7XG5cblx0XHRcdHZhciBvcmRlciA9IHZtLmNhcnQubGVuZ3RoID8gdm0uY2FydCA6IFt7XG5cdFx0XHRcdGFjdGlvbjogJ2FkZENyZWRpdHMnLFxuXHRcdFx0XHRkZXNjcmlwdGlvbjogJ1JpbmdvdGVsIFNlcnZpY2UgUGF5bWVudCcsXG5cdFx0XHRcdGFtb3VudDogdm0uYW1vdW50XG5cdFx0XHR9XTtcblxuXHRcdFx0dmFyIHJlcXVlc3RQYXJhbXMgPSB7XG5cdFx0XHRcdHVybDogJ2NoZWNrb3V0Jyxcblx0XHRcdFx0cGFyYW1zOiB7XG5cdFx0XHRcdFx0cGF5bWVudE1ldGhvZDogdm0ucGF5bWVudE1ldGhvZCxcblx0XHRcdFx0XHRhbW91bnQ6IHZtLmFtb3VudCxcblx0XHRcdFx0XHRvcmRlcjogb3JkZXJcblx0XHRcdFx0fVxuXHRcdFx0fTtcblxuXHRcdFx0YXBpLnJlcXVlc3QocmVxdWVzdFBhcmFtcykudGhlbihmdW5jdGlvbihyZXMpe1xuXHRcdFx0XHRpZihyZXMuZGF0YS5yZWRpcmVjdCkge1xuXHRcdFx0XHRcdHdpbmRvdy5sb2NhdGlvbi5ocmVmID0gcmVzLmRhdGEucmVkaXJlY3Q7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0aWYocmVzLmRhdGEuc3VjY2Vzcykge1xuXHRcdFx0XHRcdFx0bm90aWZ5U2VydmljZS5zaG93KCdBTExfQ0hBTkdFU19TQVZFRCcpO1xuXG5cdFx0XHRcdFx0XHQvLyB1cGRhdGUgY2FjaGVcblx0XHRcdFx0XHRcdHZtLmNhcnQuZm9yRWFjaChmdW5jdGlvbihpdGVtKXtcblx0XHRcdFx0XHRcdFx0aWYoaXRlbS5hY3Rpb24gPT09ICdjcmVhdGVTdWJzY3JpcHRpb24nKSB7XG5cdFx0XHRcdFx0XHRcdFx0YnJhbmNoZXNTZXJ2aWNlLnNldChbXSk7XG5cdFx0XHRcdFx0XHRcdH0gZWxzZSBpZihpdGVtLmFjdGlvbiA9PT0gJ3VwZGF0ZVN1YnNjcmlwdGlvbicpIHtcblx0XHRcdFx0XHRcdFx0XHRicmFuY2hlc1NlcnZpY2UudXBkYXRlKGl0ZW0uZGF0YS5vaWQsIGl0ZW0uZGF0YSk7XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH0pO1xuXG5cdFx0XHRcdFx0XHQkbG9jYXRpb24ucGF0aCgnL2Rhc2hib2FyZCcpOyAvL1RPRE9cblxuXHRcdFx0XHRcdFx0Y2FydFNlcnZpY2UuY2xlYXIoKTtcblxuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRlcnJvclNlcnZpY2Uuc2hvdyhyZXMuZGF0YS5tZXNzYWdlKTtcblx0XHRcdFx0XHR9XHRcdFx0XHRcdFxuXHRcdFx0XHR9XG5cdFx0XHRcdC8vIHNwaW5uZXJTZXJ2aWNlLmhpZGUoJ21haW4tc3Bpbm5lcicpO1xuXHRcdFx0fSwgZnVuY3Rpb24oZXJyKXtcblx0XHRcdFx0ZXJyb3JTZXJ2aWNlLnNob3coZXJyKTtcblx0XHRcdFx0Ly8gc3Bpbm5lclNlcnZpY2UuaGlkZSgnbWFpbi1zcGlubmVyJyk7XG5cdFx0XHR9KTtcblx0XHR9XG5cblx0XHRmdW5jdGlvbiBzZWxlY3RNZXRob2QobWV0aG9kKSB7XG5cdFx0XHR2bS5wYXltZW50TWV0aG9kID0gbWV0aG9kO1xuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIGNvdXRBbW91bnQoYXJyYXkpIHtcblx0XHRcdC8vVE9ETyAtIGNvdW50IG1pbiBhbW91bnQgYmFzZWQgb24gdGhlIGN1cnJlbmN5XG5cdFx0XHR2YXIgYW1vdW50ID0gYXJyYXkubGVuZ3RoID8gMCA6IHZtLnJlcXVpcmVkQW1vdW50O1xuXHRcdFx0YXJyYXkuZm9yRWFjaChmdW5jdGlvbiAoaXRlbSl7XG5cdFx0XHRcdGFtb3VudCArPSBwYXJzZUZsb2F0KGl0ZW0uYW1vdW50KTtcblx0XHRcdH0pO1xuXHRcdFx0cmV0dXJuIGFtb3VudDtcblx0XHR9XG5cblx0XHRmdW5jdGlvbiBhZGREZWJ0QW1vdXQoKSB7XG5cdFx0XHR2bS5jYXJ0LnB1c2goe1xuXHRcdFx0XHRlZGl0OiBmYWxzZSxcblx0XHRcdFx0cmVtb3ZlOiBmYWxzZSxcblx0XHRcdFx0YWN0aW9uOiAnYWRkQ3JlZGl0cycsXG5cdFx0XHRcdGRlc2NyaXB0aW9uOiAnUmluZ290ZWwgU2VydmljZSBQYXltZW50Jyxcblx0XHRcdFx0YW1vdW50OiAodm0uY3VzdG9tZXIuYmFsYW5jZSAqIC0xKVxuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gcmVtb3ZlQ2FydEl0ZW0oaW5kZXgpIHtcblx0XHRcdHZtLmNhcnQuc3BsaWNlKGluZGV4LCAxKVxuXHRcdFx0Y2FydFNlcnZpY2UucmVtb3ZlKGluZGV4KTtcblx0XHR9XG5cblx0XHRmdW5jdGlvbiBjYW5jZWwoKSB7XG5cdFx0XHQkbG9jYXRpb24ucGF0aCgnL2Rhc2hib2FyZCcpO1xuXHRcdH1cblxuXHR9XG5cbn0pKCk7IiwiYW5ndWxhci5tb2R1bGUoJ2FwcC5wYXltZW50Jylcbi5jb25maWcoWyckcm91dGVQcm92aWRlcicsIGZ1bmN0aW9uKCRyb3V0ZVByb3ZpZGVyKXtcblxuXHQkcm91dGVQcm92aWRlclxuXHRcdC53aGVuKCcvcGF5bWVudCcsIHtcblx0XHRcdHRlbXBsYXRlVXJsOiAncGF5bWVudC9wYXltZW50Lmh0bWwnLFxuXHRcdFx0Y29udHJvbGxlcjogJ1BheW1lbnRDb250cm9sbGVyJyxcblx0XHRcdGNvbnRyb2xsZXJBczogJ3BheVZtJyxcblx0XHRcdHJlc29sdmU6IHtcblx0XHRcdFx0bG9nZ2VkaW46IGlzQXV0aG9yaXplZFxuXHRcdFx0fVxuXHRcdH0pO1xuXG59XSk7XG5cbmlzQXV0aG9yaXplZC4kaW5qZWN0ID0gWydhdXRoU2VydmljZSddO1xuZnVuY3Rpb24gaXNBdXRob3JpemVkKGF1dGhTZXJ2aWNlKSB7XG5cdHJldHVybiBhdXRoU2VydmljZS5pc0F1dGhvcml6ZWQoKTtcbn0iLCIoZnVuY3Rpb24oKXtcblxuXHQndXNlIHN0cmljdCc7XG5cblx0YW5ndWxhclxuXHRcdC5tb2R1bGUoJ2FwcC5wcm9maWxlJylcblx0XHQuY29udHJvbGxlcignUHJvZmlsZUNvbnRyb2xsZXInLCBQcm9maWxlQ29udHJvbGxlcik7XG5cblx0UHJvZmlsZUNvbnRyb2xsZXIuJGluamVjdCA9IFsnYXBpU2VydmljZScsICdjdXN0b21lclNlcnZpY2UnLCAnbm90aWZ5U2VydmljZScsICdlcnJvclNlcnZpY2UnXTtcblxuXHRmdW5jdGlvbiBQcm9maWxlQ29udHJvbGxlcihhcGksIGN1c3RvbWVyU2VydmljZSwgbm90aWZ5U2VydmljZSwgZXJyb3JTZXJ2aWNlKSB7XG5cblx0XHR2YXIgdm0gPSB0aGlzO1xuXHRcdHZtLnByb2ZpbGUgPSBjdXN0b21lclNlcnZpY2UuZ2V0Q3VzdG9tZXIoKTtcblx0XHR2bS5zYXZlUHJvZmlsZSA9IHNhdmVQcm9maWxlO1xuXHRcdHZtLmNvbmZpcm1QYXNzID0gJyc7XG5cblx0XHRjb25zb2xlLmxvZygncHJvZmlsZTogJywgdm0ucHJvZmlsZSk7XG5cblx0XHRmdW5jdGlvbiBzYXZlUHJvZmlsZSgpIHtcblx0XHRcdFxuXHRcdFx0dmFyIHBhcmFtcyA9IHt9O1xuXG5cdFx0XHRpZighdm0ucHJvZmlsZS5lbWFpbCB8fCAhdm0ucHJvZmlsZS5uYW1lKXtcblx0XHRcdFx0cmV0dXJuIGVycm9yU2VydmljZS5zaG93KCdNSVNTSU5HX0ZJRUxEUycpO1xuXHRcdFx0fVxuXHRcdFx0aWYodm0ucHJvZmlsZS5wYXNzd29yZCAmJiB2bS5jb25maXJtUGFzcyAhPT0gdm0ucHJvZmlsZS5wYXNzd29yZCl7XG5cdFx0XHRcdHJldHVybiBlcnJvclNlcnZpY2Uuc2hvdygnUEFTU1dPUkRfTk9UX0NPTkZJUk1FRCcpO1xuXHRcdFx0fVxuXG5cdFx0XHRpZih2bS5wcm9maWxlLm5hbWUpIHBhcmFtcy5uYW1lID0gdm0ucHJvZmlsZS5uYW1lO1xuXHRcdFx0aWYodm0ucHJvZmlsZS5lbWFpbCkgcGFyYW1zLmVtYWlsID0gdm0ucHJvZmlsZS5lbWFpbDtcblx0XHRcdGlmKHZtLnByb2ZpbGUucGFzc3dvcmQpIHBhcmFtcy5wYXNzd29yZCA9IHZtLnByb2ZpbGUucGFzc3dvcmQ7XG5cblx0XHRcdGFwaS5yZXF1ZXN0KHtcblx0XHRcdFx0dXJsOiBcInVwZGF0ZS9cIit2bS5wcm9maWxlLl9pZCxcblx0XHRcdFx0cGFyYW1zOiBwYXJhbXNcblx0XHRcdH0pLnRoZW4oZnVuY3Rpb24ocmVzKXtcblx0XHRcdFx0aWYoIXJlcy5kYXRhLnN1Y2Nlc3MpIHJldHVybiBlcnJvclNlcnZpY2Uuc2hvdyhyZXMuZGF0YS5tZXNzYWdlKTtcblxuXHRcdFx0XHRub3RpZnlTZXJ2aWNlLnNob3coJ0FMTF9DSEFOR0VTX1NBVkVEJyk7XG5cdFx0XHRcdGN1c3RvbWVyU2VydmljZS5zZXRDdXN0b21lcihyZXMuZGF0YS5yZXN1bHQpO1xuXHRcdFx0XHRjb25zb2xlLmxvZygnY3VycmVudFVzZXI6ICcsIHJlcy5kYXRhLnJlc3VsdCk7XG5cdFx0XHR9LCBmdW5jdGlvbihlcnIpe1xuXHRcdFx0XHRlcnJvclNlcnZpY2Uuc2hvdyhlcnIpO1xuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdH1cblxufSkoKTsiLCJhbmd1bGFyLm1vZHVsZSgnYXBwLnByb2ZpbGUnKVxuLmNvbmZpZyhbJyRyb3V0ZVByb3ZpZGVyJywgZnVuY3Rpb24oJHJvdXRlUHJvdmlkZXIpe1xuXG5cdCRyb3V0ZVByb3ZpZGVyXG5cdFx0LndoZW4oJy9wcm9maWxlJywge1xuXHRcdFx0dGVtcGxhdGVVcmw6ICdwcm9maWxlL3Byb2ZpbGUuaHRtbCcsXG5cdFx0XHRjb250cm9sbGVyOiAnUHJvZmlsZUNvbnRyb2xsZXInLFxuXHRcdFx0Y29udHJvbGxlckFzOiAncHJvZmlsZVZtJyxcblx0XHRcdHJlc29sdmU6IHtcblx0XHRcdFx0bG9nZ2VkaW46IGlzQXV0aG9yaXplZFxuXHRcdFx0fVxuXHRcdH0pO1xuXG59XSk7XG5cbmlzQXV0aG9yaXplZC4kaW5qZWN0ID0gWydhdXRoU2VydmljZSddO1xuZnVuY3Rpb24gaXNBdXRob3JpemVkKGF1dGhTZXJ2aWNlKSB7XG5cdHJldHVybiBhdXRoU2VydmljZS5pc0F1dGhvcml6ZWQoKTtcbn0iLCIoZnVuY3Rpb24oKXtcblxuXHQndXNlIHN0cmljdCc7XG5cblx0YW5ndWxhclxuXHRcdC5tb2R1bGUoJ2FwcC5jb3JlJylcblx0XHQuZmFjdG9yeSgnYXBpU2VydmljZScsIGFwaVNlcnZpY2UpO1xuXG5cdGFwaVNlcnZpY2UuJGluamVjdCA9IFsnJGh0dHAnLCAnYXBwQ29uZmlnJ107XG5cblx0ZnVuY3Rpb24gYXBpU2VydmljZSgkaHR0cCwgYXBwQ29uZmlnKXtcblxuXHRcdHZhciBiYXNlVXJsID0gYXBwQ29uZmlnLnNlcnZlciArICcvYXBpJztcblx0XHRyZXR1cm4ge1xuXHRcdFx0cmVxdWVzdDogZnVuY3Rpb24ocGFyYW1zKXtcblx0XHRcdFx0cmV0dXJuICRodHRwLnBvc3QoYmFzZVVybCsnLycrcGFyYW1zLnVybCwgKHBhcmFtcy5wYXJhbXMgfHwge30pKTtcblx0XHRcdH1cblx0XHR9O1xuXG5cdH1cblxufSkoKTsiLCIoZnVuY3Rpb24oKXtcblxuXHQndXNlIHN0cmljdCc7XG5cblx0YW5ndWxhclxuXHRcdC5tb2R1bGUoJ2FwcCcpXG5cdFx0LmZhY3RvcnkoJ2F1dGhTZXJ2aWNlJywgYXV0aFNlcnZpY2UpO1xuXG5cdGF1dGhTZXJ2aWNlLiRpbmplY3QgPSBbJyRxJywgJyR0aW1lb3V0JywgJyRsb2NhdGlvbicsICckcm9vdFNjb3BlJywgJyRodHRwJywgJyRsb2NhbFN0b3JhZ2UnLCAnYXBwQ29uZmlnJywgJ2N1c3RvbWVyU2VydmljZSddO1xuXG5cdGZ1bmN0aW9uIGF1dGhTZXJ2aWNlKCRxLCAkdGltZW91dCwgJGxvY2F0aW9uLCAkcm9vdFNjb3BlLCAkaHR0cCwgJGxvY2FsU3RvcmFnZSwgYXBwQ29uZmlnLCBjdXN0b21lclNlcnZpY2Upe1xuXG5cdFx0dmFyIGJhc2VVcmwgPSBhcHBDb25maWcuc2VydmVyO1xuXHRcdHZhciBpbml0ID0gZmFsc2U7XG5cblx0XHRyZXR1cm4ge1xuXHRcdFx0c2lnbnVwOiBzaWdudXAsXG5cdFx0XHRsb2dpbjogbG9naW4sXG5cdFx0XHRyZXF1ZXN0UGFzc3dvcmRSZXNldDogcmVxdWVzdFBhc3N3b3JkUmVzZXQsXG5cdFx0XHRyZXNldFBhc3N3b3JkOiByZXNldFBhc3N3b3JkLFxuXHRcdFx0aXNMb2dnZWRJbjogaXNMb2dnZWRJbixcblx0XHRcdGxvZ291dDogbG9nb3V0LFxuXHRcdFx0aXNBdXRob3JpemVkOiBpc0F1dGhvcml6ZWRcblx0XHR9O1xuXG5cdFx0ZnVuY3Rpb24gc2lnbnVwKGRhdGEpIHtcblx0XHRcdHJldHVybiAkaHR0cC5wb3N0KGJhc2VVcmwgKyAnL2FwaS9zaWdudXAnLCBkYXRhKTtcblx0XHR9XG5cblx0XHRmdW5jdGlvbiBsb2dpbihkYXRhKSB7XG5cdFx0XHRyZXR1cm4gJGh0dHAucG9zdChiYXNlVXJsICsgJy9hcGkvbG9naW4nLCBkYXRhKTtcblx0XHR9XG5cblx0XHRmdW5jdGlvbiByZXF1ZXN0UGFzc3dvcmRSZXNldChkYXRhKSB7XG5cdFx0XHRyZXR1cm4gICRodHRwLnBvc3QoYmFzZVVybCArICcvYXBpL3JlcXVlc3RQYXNzd29yZFJlc2V0JywgZGF0YSk7XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gcmVzZXRQYXNzd29yZChkYXRhKSB7XG5cdFx0XHRyZXR1cm4gJGh0dHAucG9zdChiYXNlVXJsICsgJy9hcGkvcmVzZXRQYXNzd29yZCcsIGRhdGEpO1xuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIGxvZ291dCgpIHtcblx0XHRcdGRlbGV0ZSAkbG9jYWxTdG9yYWdlLnRva2VuO1xuXG5cdFx0XHQvLyBDbGVhciBhdXRob3JpemVkIGN1c3RvbWVyIGRhdGFcblx0XHRcdGN1c3RvbWVyU2VydmljZS5jbGVhckN1cnJlbnRDdXN0b21lcigpO1xuXG5cdFx0XHQvLyBFbWl0IGV2ZW50IHdoZW4gY3VzdG9tZXIgbG9nZ2VkIG91dCB0byB0aGUgY29uc29sZVxuXHRcdFx0JHJvb3RTY29wZS4kZW1pdCgnYXV0aC5sb2dvdXQnKTtcblxuXHRcdFx0aW5pdCA9IGZhbHNlO1xuXG5cdFx0XHQkbG9jYXRpb24ucGF0aCgnL2xvZ2luJyk7XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gaXNMb2dnZWRJbigpe1xuXHRcdFx0cmV0dXJuIGluaXQ7XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gbG9nZ2VkSW4oZGF0YSkge1xuXHRcdFx0Y29uc29sZS5sb2coJ2xvZ2dlZEluOiAnLCBkYXRhKTtcblx0XHRcdC8vIFNldCBhdXRob3JpemVkIGN1c3RvbWVyIGRhdGFcblx0XHRcdGlmKGRhdGEuY3VzdG9tZXIpIHtcblx0XHRcdFx0Y3VzdG9tZXJTZXJ2aWNlLnNldEN1c3RvbWVyKGRhdGEuY3VzdG9tZXIpO1xuXHRcblx0XHRcdFx0Ly8gRW1pdCBldmVudCB3aGVuIGN1c3RvbWVyIGRhdGEgdXBkYXRlZFxuXHRcdFx0XHQkcm9vdFNjb3BlLiRlbWl0KCdjdXN0b21lci51cGRhdGUnLCBkYXRhLmN1c3RvbWVyKTtcblx0XHRcdH1cblxuXG5cdFx0XHRpZighaW5pdCkge1xuXHRcdFx0XHQvLyBFbWl0IGV2ZW50IHdoZW4gY3VzdG9tZXIgbG9nZ2VkIGluIHRvIHRoZSBjb25zb2xlXG5cdFx0XHRcdCRyb290U2NvcGUuJGVtaXQoJ2F1dGgubG9naW4nKTtcblx0XHRcdFx0aW5pdCA9IHRydWU7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gaXNBdXRob3JpemVkKCkge1xuXHRcdFx0aWYoY3VzdG9tZXJTZXJ2aWNlLmdldEN1c3RvbWVyKCkpIHJldHVybjtcblxuXHRcdFx0dmFyIGRlZmVycmVkID0gJHEuZGVmZXIoKTsgLy8gTWFrZSBhbiBBSkFYIGNhbGwgdG8gY2hlY2sgaWYgdGhlIHVzZXIgaXMgbG9nZ2VkIGluIFxuXHRcdFx0JGh0dHAuZ2V0KCcvYXBpL2xvZ2dlZGluJykudGhlbihmdW5jdGlvbihyZXMpe1xuXHRcdFx0XHRsb2dnZWRJbihyZXMuZGF0YSk7XG5cdFx0XHRcdGRlZmVycmVkLnJlc29sdmUoKTtcblx0XHRcdH0sIGZ1bmN0aW9uIChlcnIpe1xuXHRcdFx0XHRkZWZlcnJlZC5yZWplY3QoKTtcblx0XHRcdFx0bG9nb3V0KCk7XG5cdFx0XHRcdC8vICRsb2NhdGlvbi5wYXRoKCcvbG9naW4nKTtcblx0XHRcdH0pO1xuXHRcdFx0cmV0dXJuIGRlZmVycmVkLnByb21pc2U7XG5cdFx0fVxuXG5cdH1cblxufSkoKTsiLCIoZnVuY3Rpb24oKXtcblxuXHQndXNlIHN0cmljdCc7XG5cblx0YW5ndWxhclxuXHRcdC5tb2R1bGUoJ2FwcC5jb3JlJylcblx0XHQuZmFjdG9yeSgnYnJhbmNoZXNTZXJ2aWNlJywgYnJhbmNoZXNTZXJ2aWNlKTtcblxuXHRicmFuY2hlc1NlcnZpY2UuJGluamVjdCA9IFsncG9vbFNpemVTZXJ2aWNlcycsICdhcGlTZXJ2aWNlJ107XG5cblx0ZnVuY3Rpb24gYnJhbmNoZXNTZXJ2aWNlKHBvb2xTaXplU2VydmljZXMsIGFwaSl7XG5cblx0XHR2YXIgYnJhbmNoZXMgPSBbXTtcblx0XHR2YXIgcGxhbnMgPSBbXTtcblx0XHR2YXIgc2VydmVycyA9IFtdO1xuXG5cdFx0cmV0dXJuIHtcblx0XHRcdGFkZDogYWRkLFxuXHRcdFx0c2V0OiBzZXQsXG5cdFx0XHR1cGRhdGU6IHVwZGF0ZSxcblx0XHRcdGdldDogZ2V0LFxuXHRcdFx0Z2V0QWxsOiBnZXRBbGwsXG5cdFx0XHRnZXRBbGxBZGRvbnM6IGdldEFsbEFkZG9ucyxcblx0XHRcdHJlbW92ZTogcmVtb3ZlLFxuXHRcdFx0c2V0UGxhbnM6IHNldFBsYW5zLFxuXHRcdFx0c2V0U2VydmVyczogc2V0U2VydmVycyxcblx0XHRcdGdldFBsYW5zOiBnZXRQbGFucyxcblx0XHRcdGdldFNlcnZlcnM6IGdldFNlcnZlcnMsXG5cdFx0XHRjbGVhcjogY2xlYXIsXG5cdFx0XHRpc1ByZWZpeFZhbGlkOiBpc1ByZWZpeFZhbGlkLFxuXHRcdFx0aXNQcmVmaXhVbmlxdWU6IGlzUHJlZml4VW5pcXVlLFxuXHRcdFx0Z2V0U3Vic2NyaXB0aW9uQW1vdW50OiBnZXRTdWJzY3JpcHRpb25BbW91bnRcblx0XHR9O1xuXG5cdFx0ZnVuY3Rpb24gYWRkKGl0ZW0pIHtcblx0XHRcdGlmKGFuZ3VsYXIuaXNBcnJheShpdGVtKSkge1xuXHRcdFx0XHRhbmd1bGFyLmNvcHkoaXRlbSwgYnJhbmNoZXMpO1xuXHRcdFx0XHQvLyBicmFuY2hlcyA9IGJyYW5jaGVzLmNvbmNhdChpdGVtKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGRlbGV0ZSBpdGVtLmFkbWlucGFzcztcblx0XHRcdFx0YnJhbmNoZXMucHVzaChpdGVtKTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRmdW5jdGlvbiBzZXQoYXJyYXkpIHtcblx0XHRcdGlmKEFycmF5LmlzQXJyYXkoYXJyYXkpKSBicmFuY2hlcyA9IGFycmF5O1xuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIHVwZGF0ZShvaWQsIGRhdGEpe1xuXHRcdFx0Y29uc29sZS5sb2coJ3VwZGF0ZSBicmFuY2g6ICcsIG9pZCwgZGF0YSk7XG5cdFx0XHRpZighb2lkKSByZXR1cm47XG5cdFx0XHRicmFuY2hlcy5mb3JFYWNoKGZ1bmN0aW9uKGl0ZW0sIGluZGV4LCBhcnJheSl7XG5cdFx0XHRcdGlmKGl0ZW0ub2lkID09PSBvaWQpIHtcblx0XHRcdFx0XHRkZWxldGUgaXRlbS5hZG1pbnBhc3M7XG5cdFx0XHRcdFx0YW5ndWxhci5tZXJnZShpdGVtLCBkYXRhKTtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gZ2V0KG9pZCwgY2IpIHtcblx0XHRcdHZhciBmb3VuZCA9IG51bGw7XG5cdFx0XHRicmFuY2hlcy5mb3JFYWNoKGZ1bmN0aW9uIChicmFuY2gpe1xuXHRcdFx0XHRpZihicmFuY2gub2lkID09PSBvaWQpe1xuXHRcdFx0XHRcdGZvdW5kID0gYnJhbmNoO1xuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblx0XHRcdGlmKGNiKSBjYihmb3VuZCk7XG5cdFx0XHRlbHNlIHJldHVybiBmb3VuZDtcblx0XHR9XG5cblx0XHRmdW5jdGlvbiBnZXRBbGwoKSB7XG5cdFx0XHRyZXR1cm4gYnJhbmNoZXM7XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gZ2V0QWxsQWRkb25zKHBhcmFtcykge1xuXHRcdFx0dmFyIGFkZE9ucyA9IFtdO1xuXHRcdFx0aWYocGFyYW1zLmV4dGVuc2lvbnMgIT09IHVuZGVmaW5lZCl7XG5cdFx0XHRcdHZhciBwb29sc2l6ZSA9IHBvb2xTaXplU2VydmljZXMuZ2V0UG9vbFNpemUocGFyYW1zLmV4dGVuc2lvbnMpO1xuXHRcdFx0XHRhZGRPbnMucHVzaCh7XG5cdFx0XHRcdFx0bmFtZTogXCJVc2VyXCIsXG5cdFx0XHRcdFx0cXVhbnRpdHk6IHBvb2xzaXplXG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4gYWRkT25zO1xuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIHJlbW92ZShvaWQpIHtcblx0XHRcdGJyYW5jaGVzLmZvckVhY2goZnVuY3Rpb24oaXRlbSwgaW5kZXgsIGFycmF5KXtcblx0XHRcdFx0aWYoaXRlbS5vaWQgJiYgaXRlbS5vaWQgPT09IG9pZCkge1xuXHRcdFx0XHRcdGFycmF5LnNwbGljZShpbmRleCwgMSk7XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIHNldFBsYW5zKGFycmF5KXtcblx0XHRcdHBsYW5zID0gYXJyYXk7XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gZ2V0UGxhbnMoKXtcblx0XHRcdHJldHVybiBwbGFucztcblx0XHR9XG5cblx0XHRmdW5jdGlvbiBzZXRTZXJ2ZXJzKGFycmF5KXtcblx0XHRcdHNlcnZlcnMgPSBhcnJheTtcblx0XHR9XG5cblx0XHRmdW5jdGlvbiBnZXRTZXJ2ZXJzKCl7XG5cdFx0XHRyZXR1cm4gc2VydmVycztcblx0XHR9XG5cblx0XHRmdW5jdGlvbiBjbGVhcigpIHtcblx0XHRcdGJyYW5jaGVzID0gW107XG5cdFx0XHRwbGFucyA9IFtdO1xuXHRcdFx0c2VydmVycyA9IFtdO1xuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIGlzUHJlZml4VmFsaWQocHJlZml4KSB7XG5cdFx0XHRcblx0XHRcdHZhciByZWdleCA9IC9eW2EtekEtWjAtOV1bYS16QS1aMC05LV17MSw2Mn1bYS16QS1aMC05XSQvZztcblx0XHRcdHJldHVybiBwcmVmaXgubWF0Y2gocmVnZXgpO1xuXG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gaXNQcmVmaXhVbmlxdWUocHJlZml4KSB7XG5cdFx0XHRyZXR1cm4gYXBpLnJlcXVlc3Qoe1xuXHRcdFx0ICAgIHVybDogJ2lzUHJlZml4VmFsaWQnLFxuXHRcdFx0ICAgIHBhcmFtczoge1xuXHRcdFx0ICAgICAgICBwcmVmaXg6IHByZWZpeFxuXHRcdFx0ICAgIH1cblx0XHRcdH0pO1xuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIGdldFN1YnNjcmlwdGlvbkFtb3VudChwYXJhbXMsIGNiKSB7XG5cblx0XHRcdGFwaS5yZXF1ZXN0KHtcblx0XHRcdFx0dXJsOiAnL2dldFN1YnNjcmlwdGlvbkFtb3VudCcsXG5cdFx0XHRcdHBhcmFtczogcGFyYW1zXG5cdFx0XHR9KS50aGVuKGZ1bmN0aW9uKHJlc3VsdCl7XG5cdFx0XHRcdGNiKG51bGwsIHJlc3VsdC5kYXRhKTtcblx0XHRcdH0sIGZ1bmN0aW9uKGVycil7XG5cdFx0XHRcdGNiKGVycik7XG5cdFx0XHR9KTtcblxuXHRcdH1cblxuXHR9XG5cbn0pKCk7IiwiKGZ1bmN0aW9uKCl7XG5cblx0J3VzZSBzdHJpY3QnO1xuXG5cdGFuZ3VsYXJcblx0XHQubW9kdWxlKCdhcHAuY29yZScpXG5cdFx0LmZhY3RvcnkoJ2NhcnRTZXJ2aWNlJywgY2FydFNlcnZpY2UpO1xuXG5cdGNhcnRTZXJ2aWNlLiRpbmplY3QgPSBbJyRyb290U2NvcGUnLCAnY3VzdG9tZXJTZXJ2aWNlJ107XG5cblx0ZnVuY3Rpb24gY2FydFNlcnZpY2UoJHJvb3RTY29wZSwgY3VzdG9tZXJTZXJ2aWNlKSB7XG5cblx0XHR2YXIgaXRlbXMgPSBbXTtcblx0XHRyZXR1cm4ge1xuXHRcdFx0YWRkOiBhZGQsXG5cdFx0XHR1cGRhdGU6IHVwZGF0ZSxcblx0XHRcdGdldDogZ2V0LFxuXHRcdFx0c2V0OiBzZXQsXG5cdFx0XHRyZW1vdmU6IHJlbW92ZSxcblx0XHRcdGdldEFsbDogZ2V0QWxsLFxuXHRcdFx0Y2xlYXI6IGNsZWFyXG5cdFx0fTtcblxuXHRcdGZ1bmN0aW9uIG5ld0l0ZW0ocGFyYW1zKSB7XG5cdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRlZGl0OiBwYXJhbXMuZWRpdCAhPT0gdW5kZWZpbmVkID8gcGFyYW1zLmVkaXQgOiB0cnVlLFxuXHRcdFx0XHRyZW1vdmU6IHBhcmFtcy5yZW1vdmUgIT09IHVuZGVmaW5lZCA/IHBhcmFtcy5yZW1vdmUgOiB0cnVlLFxuXHRcdFx0XHRhY3Rpb246IHBhcmFtcy5hY3Rpb24sXG5cdFx0XHRcdGRlc2NyaXB0aW9uOiBwYXJhbXMuZGVzY3JpcHRpb24sXG5cdFx0XHRcdGFtb3VudDogcGFyYW1zLmFtb3VudCxcblx0XHRcdFx0Y3VycmVuY3k6IGN1c3RvbWVyU2VydmljZS5nZXRDdXN0b21lcigpLmN1cnJlbmN5LFxuXHRcdFx0XHRkYXRhOiBwYXJhbXMuZGF0YVxuXHRcdFx0fTtcblx0XHR9XG5cblx0XHRmdW5jdGlvbiBhZGQocGFyYW1zKSB7XG5cdFx0XHQvLyBpdGVtcyA9IFtdOyAvL2NvbW1lbnQgdGhpcyBsaW5lIHRvIGNvbGxlY3QgaXRlbXMgaW4gdGhlIGNhcnQsIHJhdGhlciB0aGFuIHN1YnN0aXR1dGVcblx0XHRcdGl0ZW1zLnB1c2gobmV3SXRlbShwYXJhbXMpKTtcblx0XHR9XG5cblx0XHRmdW5jdGlvbiBzZXQocGFyYW1zLCBpbmRleCkge1xuXHRcdFx0aW5kZXggPyByZW1vdmUoaW5kZXgpIDogY2xlYXIoKTtcblx0XHRcdGluZGV4ID8gaXRlbXNbaW5kZXhdID0gbmV3SXRlbShwYXJhbXMpIDogaXRlbXMucHVzaChuZXdJdGVtKHBhcmFtcykpO1xuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIHJlbW92ZShpbmRleCkge1xuXHRcdFx0aXRlbXMuc3BsaWNlKGluZGV4LCAxKTtcblx0XHR9XG5cblx0XHRmdW5jdGlvbiB1cGRhdGUocHJlZml4LCBwYXJhbXMpIHtcblx0XHRcdHZhciBpdGVtID0gaXRlbXMuZm9yRWFjaChmdW5jdGlvbihpdGVtLCBpbmRleCwgYXJyYXkpIHtcblx0XHRcdFx0aWYoaXRlbS5kYXRhLnJlc3VsdC5wcmVmaXggPT09IHByZWZpeCkgYXJyYXlbaW5kZXhdID0gcGFyYW1zO1xuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gZ2V0KHByZWZpeCkge1xuXHRcdFx0dmFyIGZvdW5kO1xuXHRcdFx0aXRlbXMuZm9yRWFjaChmdW5jdGlvbihpdGVtKSB7XG5cdFx0XHRcdGlmKGl0ZW0uZGF0YS5yZXN1bHQucHJlZml4ID09PSBwcmVmaXgpIGZvdW5kID0gaXRlbTtcblx0XHRcdH0pO1xuXHRcdFx0cmV0dXJuIGZvdW5kO1xuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIGdldEFsbCgpIHtcblx0XHRcdHJldHVybiBpdGVtcztcblx0XHR9XG5cdFx0XG5cdFx0ZnVuY3Rpb24gY2xlYXIoKSB7XG5cdFx0XHRpdGVtcy5zcGxpY2UoMCwgaXRlbXMubGVuZ3RoKTtcblx0XHR9XG5cblx0fVxuXG59KSgpOyIsIihmdW5jdGlvbigpe1xuXG5cdCd1c2Ugc3RyaWN0JztcblxuXHRhbmd1bGFyXG5cdFx0Lm1vZHVsZSgnYXBwJylcblx0XHQuZmFjdG9yeSgnY3VzdG9tZXJTZXJ2aWNlJywgY3VzdG9tZXJTZXJ2aWNlKTtcblxuXHRjdXN0b21lclNlcnZpY2UuJGluamVjdCA9IFsnJHJvb3RTY29wZSddO1xuXG5cdGZ1bmN0aW9uIGN1c3RvbWVyU2VydmljZSgkcm9vdFNjb3BlKXtcblxuXHRcdHZhciBjdXJyZW50Q3VzdG9tZXIgPSBudWxsLFxuXHRcdFx0Y3VycmVudEJhbGFuY2UgPSBudWxsO1xuXG5cdFx0cmV0dXJuIHtcblx0XHRcdHNldEN1c3RvbWVyOiBmdW5jdGlvbihwYXJhbXMpIHtcblx0XHRcdFx0Y3VycmVudEN1c3RvbWVyID0gYW5ndWxhci5leHRlbmQoe30sIHBhcmFtcyk7XG5cdFx0XHRcdCRyb290U2NvcGUuJGVtaXQoJ2N1c3RvbWVyLnVwZGF0ZScsIGN1cnJlbnRDdXN0b21lcik7XG5cdFx0XHRcdHJldHVybiBjdXJyZW50Q3VzdG9tZXI7XG5cdFx0XHR9LFxuXHRcdFx0Z2V0Q3VzdG9tZXI6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRyZXR1cm4gY3VycmVudEN1c3RvbWVyO1xuXHRcdFx0fSxcblx0XHRcdHNldEN1c3RvbWVyQmFsYW5jZTogZnVuY3Rpb24oYmFsYW5jZSkge1xuXHRcdFx0XHRjdXJyZW50Q3VzdG9tZXIgPSBjdXJyZW50Q3VzdG9tZXIgfHwge307XG5cdFx0XHRcdGN1cnJlbnRDdXN0b21lci5iYWxhbmNlID0gYmFsYW5jZTtcblx0XHRcdFx0Y3VycmVudEJhbGFuY2UgPSBiYWxhbmNlO1xuXHRcdFx0XHQkcm9vdFNjb3BlLiRlbWl0KCdjdXN0b21lci51cGRhdGUnLCBjdXJyZW50Q3VzdG9tZXIpO1xuXHRcdFx0fSxcblx0XHRcdGdldEN1c3RvbWVyQmFsYW5jZTogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHJldHVybiBjdXJyZW50Q3VzdG9tZXIuYmFsYW5jZSB8fCBjdXJyZW50QmFsYW5jZTtcblx0XHRcdH0sXG5cdFx0XHRjbGVhckN1cnJlbnRDdXN0b21lcjogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdGN1cnJlbnRDdXN0b21lciA9IG51bGw7XG5cdFx0XHR9XG5cdFx0fTtcblxuXHR9XG5cbn0pKCk7IiwiKGZ1bmN0aW9uKCl7XG5cblx0J3VzZSBzdHJpY3QnO1xuXG5cdGFuZ3VsYXJcblx0XHQubW9kdWxlKCdhcHAnKVxuXHRcdC5mYWN0b3J5KCdlcnJvclNlcnZpY2UnLCBlcnJvclNlcnZpY2UpO1xuXG5cdGVycm9yU2VydmljZS4kaW5qZWN0ID0gWyckcm9vdFNjb3BlJywgJyR0cmFuc2xhdGUnLCAnbm90aWZpY2F0aW9ucyddO1xuXG5cdGZ1bmN0aW9uIGVycm9yU2VydmljZSgkcm9vdFNjb3BlLCAkdHJhbnNsYXRlLCBub3RpZmljYXRpb25zKXtcblxuXHRcdHJldHVybiB7XG5cdFx0XHRzaG93OiBzaG93XG5cdFx0fTtcblxuXHRcdGZ1bmN0aW9uIHNob3coZXJyb3Ipe1xuXHRcdFx0JHRyYW5zbGF0ZSgnRVJST1JTLicrZXJyb3IpXG5cdFx0XHQudGhlbihmdW5jdGlvbiAodHJhbnNsYXRpb24pe1xuXHRcdFx0XHRpZignRVJST1JTLicrZXJyb3IgPT09IHRyYW5zbGF0aW9uKSB7XG5cdFx0XHRcdFx0bm90aWZpY2F0aW9ucy5zaG93RXJyb3IoJ0VSUk9SX09DQ1VSUkVEJyk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0bm90aWZpY2F0aW9ucy5zaG93RXJyb3IodHJhbnNsYXRpb24pO1xuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblx0XHR9XG5cblx0fVxuXG59KSgpOyIsIihmdW5jdGlvbigpe1xuXG5cdCd1c2Ugc3RyaWN0JztcblxuXHRhbmd1bGFyXG5cdFx0Lm1vZHVsZSgnYXBwJylcblx0XHQuZmFjdG9yeSgnbm90aWZ5U2VydmljZScsIG5vdGlmeVNlcnZpY2UpO1xuXG5cdG5vdGlmeVNlcnZpY2UuJGluamVjdCA9IFsnJHRyYW5zbGF0ZScsICdub3RpZmljYXRpb25zJ107XG5cblx0ZnVuY3Rpb24gbm90aWZ5U2VydmljZSgkdHJhbnNsYXRlLCBub3RpZmljYXRpb25zKXtcblxuXHRcdHJldHVybiB7XG5cdFx0XHRzaG93OiBzaG93XG5cdFx0fTtcblxuXHRcdGZ1bmN0aW9uIHNob3cobm90aWZ5KXtcblx0XHRcdCR0cmFuc2xhdGUoJ05PVElGWS4nK25vdGlmeSlcblx0XHRcdC50aGVuKGZ1bmN0aW9uICh0cmFuc2xhdGlvbil7XG5cdFx0XHRcdGlmKCdOT1RJRlkuJytub3RpZnkgPT09IHRyYW5zbGF0aW9uKSB7XG5cdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdG5vdGlmaWNhdGlvbnMuc2hvd1N1Y2Nlc3ModHJhbnNsYXRpb24pO1xuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblx0XHR9XG5cblx0fVxuXG59KSgpOyIsIihmdW5jdGlvbigpe1xuXG5cdCd1c2Ugc3RyaWN0JztcblxuXHRhbmd1bGFyXG5cdFx0Lm1vZHVsZSgnYXBwJylcblx0XHQuZmFjdG9yeSgncG9vbFNpemVTZXJ2aWNlcycsIHBvb2xTaXplU2VydmljZXMpO1xuXG5cdHBvb2xTaXplU2VydmljZXMuJGluamVjdCA9IFsndXRpbHNTZXJ2aWNlJ107XG5cblx0ZnVuY3Rpb24gcG9vbFNpemVTZXJ2aWNlcyh1dGlscyl7XG5cblx0XHRyZXR1cm4ge1xuXHRcdFx0Z2V0UG9vbFNpemU6IGdldFBvb2xTaXplLFxuXHRcdFx0cG9vbEFycmF5VG9TdHJpbmc6IHBvb2xBcnJheVRvU3RyaW5nLFxuXHRcdFx0cG9vbFN0cmluZ1RvT2JqZWN0OiBwb29sU3RyaW5nVG9PYmplY3Rcblx0XHR9O1xuXG5cdFx0ZnVuY3Rpb24gZ2V0UG9vbFNpemUoYXJyYXlPclN0cmluZykge1xuXHRcdFx0dmFyIHBvb2xzaXplID0gMDtcblxuXHRcdFx0aWYodXRpbHMuaXNBcnJheShhcnJheU9yU3RyaW5nKSl7XG5cdFx0XHRcdGFycmF5T3JTdHJpbmcuZm9yRWFjaChmdW5jdGlvbihvYmosIGluZHgsIGFycmF5KXtcblx0XHRcdFx0XHRwb29sc2l6ZSArPSBvYmoucG9vbHNpemU7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0YXJyYXlPclN0cmluZ1xuXHRcdFx0XHQuc3BsaXQoJywnKVxuXHRcdFx0XHQubWFwKGZ1bmN0aW9uKHN0cil7XG5cdFx0XHRcdFx0cmV0dXJuIHN0ci5zcGxpdCgnLScpO1xuXHRcdFx0XHR9KVxuXHRcdFx0XHQuZm9yRWFjaChmdW5jdGlvbihhcnJheSl7XG5cdFx0XHRcdFx0cG9vbHNpemUgKz0gcGFyc2VJbnQoYXJyYXlbMV0gPyAoYXJyYXlbMV0gLSBhcnJheVswXSsxKSA6IDEsIDEwKTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cdFx0XHRcdFxuXHRcdFx0cmV0dXJuIHBvb2xzaXplO1xuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIHBvb2xBcnJheVRvU3RyaW5nKGFycmF5KSB7XG5cdFx0XHR2YXIgc3RyID0gJyc7XG5cdFx0XHRhcnJheS5mb3JFYWNoKGZ1bmN0aW9uKG9iaiwgaW5keCwgYXJyYXkpe1xuXHRcdFx0XHRpZihpbmR4ID4gMCkgc3RyICs9ICcsJztcblx0XHRcdFx0c3RyICs9IG9iai5maXJzdG51bWJlcjtcblx0XHRcdFx0aWYob2JqLnBvb2xzaXplID4gMSkgc3RyICs9ICgnLScgKyAob2JqLmZpcnN0bnVtYmVyK29iai5wb29sc2l6ZS0xKSk7XG5cdFx0XHR9KTtcblx0XHRcdHJldHVybiBzdHI7XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gcG9vbFN0cmluZ1RvT2JqZWN0KHN0cmluZykge1xuXHRcdFx0dmFyIGV4dGVuc2lvbnMgPSBbXTtcblxuXHRcdFx0c3RyaW5nXG5cdFx0XHQucmVwbGFjZSgvXFxzL2csICcnKVxuXHRcdFx0LnNwbGl0KCcsJylcblx0XHRcdC5tYXAoZnVuY3Rpb24oc3RyKXtcblx0XHRcdFx0cmV0dXJuIHN0ci5zcGxpdCgnLScpO1xuXHRcdFx0fSlcblx0XHRcdC5mb3JFYWNoKGZ1bmN0aW9uKGFycmF5KXtcblx0XHRcdFx0ZXh0ZW5zaW9ucy5wdXNoKHtcblx0XHRcdFx0XHRmaXJzdG51bWJlcjogcGFyc2VJbnQoYXJyYXlbMF0sIDEwKSxcblx0XHRcdFx0XHRwb29sc2l6ZTogcGFyc2VJbnQoYXJyYXlbMV0gPyAoYXJyYXlbMV0gLSBhcnJheVswXSsxKSA6IDEsIDEwKVxuXHRcdFx0XHR9KTtcblx0XHRcdH0pO1xuXHRcdFx0cmV0dXJuIGV4dGVuc2lvbnM7XG5cdFx0fVxuXHR9XG5cbn0pKCk7IiwiKGZ1bmN0aW9uKCl7XG5cblx0J3VzZSBzdHJpY3QnO1xuXG5cdGFuZ3VsYXJcblx0XHQubW9kdWxlKCdhcHAuY29yZScpXG5cdFx0LmZhY3RvcnkoJ3NwaW5uZXJTZXJ2aWNlJywgc3Bpbm5lclNlcnZpY2UpO1xuXG5cdC8vIHNwaW5uZXJTZXJ2aWNlLiRpbmplY3QgPSBbXTtcblxuXHRmdW5jdGlvbiBzcGlubmVyU2VydmljZSgpe1xuXG5cdFx0dmFyIHNwaW5uZXJzID0ge307XG5cdFx0cmV0dXJuIHtcblx0XHRcdF9yZWdpc3RlcjogX3JlZ2lzdGVyLFxuXHRcdFx0c2hvdzogc2hvdyxcblx0XHRcdGhpZGU6IGhpZGUsXG5cdFx0XHRzaG93QWxsOiBzaG93QWxsLFxuXHRcdFx0aGlkZUFsbDogaGlkZUFsbFxuXHRcdH07XG5cdFx0XG5cdFx0ZnVuY3Rpb24gX3JlZ2lzdGVyKGRhdGEpIHtcblx0XHRcdGlmICghZGF0YS5oYXNPd25Qcm9wZXJ0eSgnbmFtZScpKSB7XG5cdFx0XHRcdHRocm93IG5ldyBFcnJvcihcIlNwaW5uZXIgbXVzdCBzcGVjaWZ5IGEgbmFtZSB3aGVuIHJlZ2lzdGVyaW5nIHdpdGggdGhlIHNwaW5uZXIgc2VydmljZS5cIik7XG5cdFx0XHR9XG5cdFx0XHRpZiAoc3Bpbm5lcnMuaGFzT3duUHJvcGVydHkoZGF0YS5uYW1lKSkge1xuXHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0XHRcdC8vIHRocm93IG5ldyBFcnJvcihcIkEgc3Bpbm5lciB3aXRoIHRoZSBuYW1lICdcIiArIGRhdGEubmFtZSArIFwiJyBoYXMgYWxyZWFkeSBiZWVuIHJlZ2lzdGVyZWQuXCIpO1xuXHRcdFx0fVxuXHRcdFx0c3Bpbm5lcnNbZGF0YS5uYW1lXSA9IGRhdGE7XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gc2hvdyhuYW1lKSB7XG5cdFx0XHR2YXIgc3Bpbm5lciA9IHNwaW5uZXJzW25hbWVdO1xuXHRcdFx0aWYgKCFzcGlubmVyKSB7XG5cdFx0XHRcdHRocm93IG5ldyBFcnJvcihcIk5vIHNwaW5uZXIgbmFtZWQgJ1wiICsgbmFtZSArIFwiJyBpcyByZWdpc3RlcmVkLlwiKTtcblx0XHRcdH1cblx0XHRcdHNwaW5uZXIuc2hvdygpO1xuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIGhpZGUobmFtZSkge1xuXHRcdFx0dmFyIHNwaW5uZXIgPSBzcGlubmVyc1tuYW1lXTtcblx0XHRcdGlmICghc3Bpbm5lcikge1xuXHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJObyBzcGlubmVyIG5hbWVkICdcIiArIG5hbWUgKyBcIicgaXMgcmVnaXN0ZXJlZC5cIik7XG5cdFx0XHR9XG5cdFx0XHRzcGlubmVyLmhpZGUoKTtcblx0XHR9XG5cblx0XHRmdW5jdGlvbiBzaG93QWxsKCkge1xuXHRcdFx0Zm9yICh2YXIgbmFtZSBpbiBzcGlubmVycykge1xuXHRcdFx0XHRzcGlubmVyc1tuYW1lXS5zaG93KCk7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gaGlkZUFsbCgpIHtcblx0XHRcdGZvciAodmFyIG5hbWUgaW4gc3Bpbm5lcnMpIHtcblx0XHRcdFx0c3Bpbm5lcnNbbmFtZV0uaGlkZSgpO1xuXHRcdFx0fVxuXHRcdH1cblxuXHR9XG5cbn0pKCk7IiwiKGZ1bmN0aW9uKCl7XG5cblx0J3VzZSBzdHJpY3QnO1xuXG5cdGFuZ3VsYXJcblx0XHQubW9kdWxlKCdhcHAnKVxuXHRcdC5mYWN0b3J5KCdzdG9yYWdlU2VydmljZScsIHN0b3JhZ2VTZXJ2aWNlKTtcblxuXHRzdG9yYWdlU2VydmljZS4kaW5qZWN0ID0gWyckbG9jYWxTdG9yYWdlJ107XG5cblx0ZnVuY3Rpb24gc3RvcmFnZVNlcnZpY2UoJGxvY2FsU3RvcmFnZSl7XG5cblx0XHRyZXR1cm4ge1xuXHRcdFx0cHV0OiBmdW5jdGlvbiAobmFtZSwgdmFsdWUpIHtcblx0XHRcdFx0JGxvY2FsU3RvcmFnZVtuYW1lXSA9IHZhbHVlO1xuXHRcdFx0fSxcblx0XHRcdGdldDogZnVuY3Rpb24gKG5hbWUpIHtcblx0XHRcdFx0cmV0dXJuICRsb2NhbFN0b3JhZ2VbbmFtZV07XG5cdFx0XHR9XG5cdFx0fTtcblxuXHR9XG5cbn0pKCk7IiwiKGZ1bmN0aW9uKCl7XG5cblx0J3VzZSBzdHJpY3QnO1xuXG5cdGFuZ3VsYXJcblx0XHQubW9kdWxlKCdhcHAnKVxuXHRcdC5mYWN0b3J5KCd1dGlsc1NlcnZpY2UnLCB1dGlsc1NlcnZpY2UpO1xuXG5cdHV0aWxzU2VydmljZS4kaW5qZWN0ID0gW1widWliRGF0ZVBhcnNlclwiXTtcblxuXHRmdW5jdGlvbiB1dGlsc1NlcnZpY2UodWliRGF0ZVBhcnNlcil7XG5cblx0XHRyZXR1cm4ge1xuXHRcdFx0aXNBcnJheTogaXNBcnJheSxcblx0XHRcdGlzU3RyaW5nOiBpc1N0cmluZyxcblx0XHRcdHN0cmluZ1RvRml4ZWQ6IHN0cmluZ1RvRml4ZWQsXG5cdFx0XHRhcnJheVRvT2JqZWN0OiBhcnJheVRvT2JqZWN0LFxuXHRcdFx0cGFyc2VEYXRlOiBwYXJzZURhdGUsXG5cdFx0XHRnZXREaWZmZXJlbmNlOiBnZXREaWZmZXJlbmNlLFxuXHRcdFx0Y2hlY2tQYXNzd29yZFN0cmVuZ3RoOiBjaGVja1Bhc3N3b3JkU3RyZW5ndGgsXG5cdFx0XHRnZW5lcmF0ZVBhc3N3b3JkOiBnZW5lcmF0ZVBhc3N3b3JkXG5cdFx0fTtcblxuXHRcdGZ1bmN0aW9uIGlzQXJyYXkob2JqKSB7XG5cdFx0XHRyZXR1cm4gdHlwZW9mIG9iaiA9PT0gJ29iamVjdCc7XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gaXNTdHJpbmcob2JqKSB7XG5cdFx0XHRyZXR1cm4gdHlwZW9mIG9iaiA9PT0gJ3N0cmluZyc7XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gc3RyaW5nVG9GaXhlZChzdHJpbmcsIHBvaW50KSB7XG5cdFx0XHRyZXR1cm4gcGFyc2VGbG9hdChzdHJpbmcpLnRvRml4ZWQocG9pbnQpO1xuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIGFycmF5VG9PYmplY3QoYXJyYXksIGtleSkge1xuXHRcdFx0dmFyIG9iaiA9IHt9LCBwcm9wID0gJyc7XG5cdFx0XHRhcnJheS5mb3JFYWNoKGZ1bmN0aW9uKGl0ZW0pe1xuXHRcdFx0XHRwcm9wID0gaXRlbVtrZXldO1xuXHRcdFx0XHRvYmpbcHJvcF0gPSBpdGVtO1xuXHRcdFx0fSk7XG5cdFx0XHRyZXR1cm4gb2JqO1xuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIHBhcnNlRGF0ZShkYXRlLCBmb3JtYXQpIHtcblx0XHRcdHJldHVybiBtb21lbnQoZGF0ZSkuZm9ybWF0KGZvcm1hdCB8fCAnREQgTU1NTSBZWVlZJyk7XG5cdFx0XHQvLyByZXR1cm4gbmV3IERhdGUoZGF0ZSkudG9Mb2NhbGVEYXRlU3RyaW5nKCk7XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gZ2V0RGlmZmVyZW5jZShkYXRlMSwgZGF0ZTIsIG91dHB1dCkge1xuXHRcdFx0cmV0dXJuIG1vbWVudChkYXRlMSkuZGlmZihkYXRlMiwgKG91dHB1dCA/IG91dHB1dCA6ICcnKSk7XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gY2hlY2tQYXNzd29yZFN0cmVuZ3RoKHN0cmluZykge1xuXHRcdFx0dmFyIHN0cm9uZyA9IG5ldyBSZWdFeHAoXCJeKD89LipbYS16XSkoPz0uKltBLVpdKSg/PS4qWzAtOV0pKD89LipbIUAjXFwkJVxcXiZcXCpdKSg/PS57MTAsfSlcIiksXG5cdFx0XHRcdG1pZGRsZSA9IG5ldyBSZWdFeHAoXCJeKCgoPz0uKlthLXpdKSg/PS4qW0EtWl0pKD89LipbMC05XSkpfCgoPz0uKlthLXpdKSg/PS4qW0EtWl0pKD89LipbIUAjXFwkJVxcXiZcXCpdKSkpKD89Lns4LH0pXCIpO1xuXHRcdFx0aWYoc3Ryb25nLnRlc3Qoc3RyaW5nKSkge1xuXHRcdFx0XHRyZXR1cm4gMjtcblx0XHRcdH0gZWxzZSBpZihtaWRkbGUudGVzdChzdHJpbmcpKSB7XG5cdFx0XHRcdHJldHVybiAxO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0cmV0dXJuIDA7XG5cdFx0XHR9XG5cdFx0fVxuXG5cblx0XHQvLyBUT0RPOiBnZW5lcmF0ZSBwYXNzd29yZCBvbiB0aGUgc2VydmVyIHNpZGUhISFcblx0XHRmdW5jdGlvbiBnZW5lcmF0ZVBhc3N3b3JkKG1pbmxlbmd0aCwgbWF4bGVuZ3RoKSB7XG5cdFx0XHR2YXIgY2hhcnMgPSBcImFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6IUAkJV4mKl9BQkNERUZHSElKS0xNTk9QMTIzNDU2Nzg5MFwiLFxuXHRcdFx0XHRwYXNzTGVuZ3RoID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogKG1heGxlbmd0aCAtIG1pbmxlbmd0aCkpICsgbWlubGVuZ3RoLFxuXHRcdFx0XHRwYXNzID0gXCJcIjtcblx0XHRcdFxuXHRcdFx0Zm9yICh2YXIgeCA9IDA7IHggPCBwYXNzTGVuZ3RoOyB4KyspIHtcblx0XHRcdFx0dmFyIGkgPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiBjaGFycy5sZW5ndGgpO1xuXHRcdFx0XHRwYXNzICs9IGNoYXJzLmNoYXJBdChpKTtcblx0XHRcdH1cblx0XHRcdHJldHVybiBwYXNzO1xuXHRcdH1cblxuXHR9XG5cbn0pKCk7IiwiKGZ1bmN0aW9uKCl7XG5cblx0J3VzZSBzdHJpY3QnO1xuXG5cdGFuZ3VsYXJcblx0XHQubW9kdWxlKCdhcHAuY29yZScpXG5cdFx0LmNvbnRyb2xsZXIoJ1NwaW5uZXJDb250cm9sbGVyJywgU3Bpbm5lckNvbnRyb2xsZXIpO1xuXG5cdFNwaW5uZXJDb250cm9sbGVyLiRpbmplY3QgPSBbJ3NwaW5uZXJTZXJ2aWNlJ107XG5cblx0ZnVuY3Rpb24gU3Bpbm5lckNvbnRyb2xsZXIoc3Bpbm5lclNlcnZpY2UpIHtcblxuXHRcdHZhciB2bSA9IHRoaXM7XG5cblx0XHQvLyBEZWNsYXJlIGEgbWluaS1BUEkgdG8gaGFuZCBvZmYgdG8gb3VyIHNlcnZpY2Ugc28gdGhlIHNlcnZpY2Vcblx0XHQvLyBkb2Vzbid0IGhhdmUgYSBkaXJlY3QgcmVmZXJlbmNlIHRvIHRoaXMgZGlyZWN0aXZlJ3Mgc2NvcGUuXG5cdFx0dmFyIGFwaSA9IHtcblx0XHRcdG5hbWU6IHZtLm5hbWUsXG5cdFx0XHRncm91cDogdm0uZ3JvdXAsXG5cdFx0XHRzaG93OiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdHZtLnNob3cgPSB0cnVlO1xuXHRcdFx0fSxcblx0XHRcdGhpZGU6IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0dm0uc2hvdyA9IGZhbHNlO1xuXHRcdFx0fSxcblx0XHRcdHRvZ2dsZTogZnVuY3Rpb24gKCkge1xuXHRcdFx0XHR2bS5zaG93ID0gIXZtLnNob3c7XG5cdFx0XHR9XG5cdFx0fTtcblxuXHRcdC8vIHJlZ2lzdGVyIHNob3VsZCBiZSB0cnVlIGJ5IGRlZmF1bHQgaWYgbm90IHNwZWNpZmllZC5cblx0XHRpZiAoIXZtLmhhc093blByb3BlcnR5KCdyZWdpc3RlcicpKSB7XG5cdFx0XHR2bS5yZWdpc3RlciA9IHRydWU7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHZtLnJlZ2lzdGVyID0gdm0ucmVnaXN0ZXIudG9Mb3dlckNhc2UoKSA9PT0gJ2ZhbHNlJyA/IGZhbHNlIDogdHJ1ZTtcblx0XHR9XG5cblx0XHQvLyBSZWdpc3RlciB0aGlzIHNwaW5uZXIgd2l0aCB0aGUgc3Bpbm5lciBzZXJ2aWNlLlxuXHRcdGlmICh2bS5yZWdpc3RlciA9PT0gdHJ1ZSkge1xuXHRcdFx0c3Bpbm5lclNlcnZpY2UuX3JlZ2lzdGVyKGFwaSk7XG5cdFx0fVxuXG5cdFx0Ly8gSWYgYW4gb25TaG93IG9yIG9uSGlkZSBleHByZXNzaW9uIHdhcyBwcm92aWRlZCwgcmVnaXN0ZXIgYSB3YXRjaGVyXG5cdFx0Ly8gdGhhdCB3aWxsIGZpcmUgdGhlIHJlbGV2YW50IGV4cHJlc3Npb24gd2hlbiBzaG93J3MgdmFsdWUgY2hhbmdlcy5cblx0XHRpZiAodm0ub25TaG93IHx8IHZtLm9uSGlkZSkge1xuXHRcdFx0JHNjb3BlLiR3YXRjaCgnc2hvdycsIGZ1bmN0aW9uIChzaG93KSB7XG5cdFx0XHRcdGlmIChzaG93ICYmIHZtLm9uU2hvdykge1xuXHRcdFx0XHRcdHZtLm9uU2hvdyh7IHNwaW5uZXJTZXJ2aWNlOiBzcGlubmVyU2VydmljZSwgc3Bpbm5lckFwaTogYXBpIH0pO1xuXHRcdFx0XHR9IGVsc2UgaWYgKCFzaG93ICYmIHZtLm9uSGlkZSkge1xuXHRcdFx0XHRcdHZtLm9uSGlkZSh7IHNwaW5uZXJTZXJ2aWNlOiBzcGlubmVyU2VydmljZSwgc3Bpbm5lckFwaTogYXBpIH0pO1xuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblx0XHR9XG5cblx0XHQvLyBUaGlzIHNwaW5uZXIgaXMgZ29vZCB0byBnby4gRmlyZSB0aGUgb25Mb2FkZWQgZXhwcmVzc2lvbi5cblx0XHRpZiAodm0ub25Mb2FkZWQpIHtcblx0XHRcdHZtLm9uTG9hZGVkKHsgc3Bpbm5lclNlcnZpY2U6IHNwaW5uZXJTZXJ2aWNlLCBzcGlubmVyQXBpOiBhcGkgfSk7XG5cdFx0fVxuXG5cdH1cblxufSkoKTsiLCIoZnVuY3Rpb24oKXtcblxuXHQndXNlIHN0cmljdCc7XG5cblx0YW5ndWxhclxuXHRcdC5tb2R1bGUoJ2FwcCcpXG5cdFx0LmRpcmVjdGl2ZSgnc3Bpbm5lcicsIHNwaW5uZXIpO1xuXG5cdGZ1bmN0aW9uIHNwaW5uZXIoKXtcblxuXHRcdHJldHVybiB7XG5cdFx0XHRyZXN0cmljdDogJ0FFJyxcblx0XHRcdHJlcGxhY2U6IHRydWUsXG5cdFx0XHR0cmFuc2NsdWRlOiB0cnVlLFxuXHRcdFx0c2NvcGU6IHtcblx0XHRcdFx0bmFtZTogJ0A/Jyxcblx0XHRcdFx0Z3JvdXA6ICdAPycsXG5cdFx0XHRcdHNob3c6ICc9PycsXG5cdFx0XHRcdGltZ1NyYzogJ0A/Jyxcblx0XHRcdFx0cmVnaXN0ZXI6ICdAPycsXG5cdFx0XHRcdG9uTG9hZGVkOiAnJj8nLFxuXHRcdFx0XHRvblNob3c6ICcmPycsXG5cdFx0XHRcdG9uSGlkZTogJyY/J1xuXHRcdFx0fSxcblx0XHRcdHRlbXBsYXRlOiBbXG5cdFx0XHRcdCc8ZGl2IG5nLXNob3c9XCJzcGlubmVyVm0uc2hvd1wiPicsXG5cdFx0XHRcdCcgIDxpbWcgbmctaWY9XCJzcGlubmVyVm0uaW1nU3JjXCIgbmctc3JjPVwie3tzcGlubmVyVm0uaW1nU3JjfX1cIiAvPicsXG5cdFx0XHRcdCcgIDxuZy10cmFuc2NsdWRlPjwvbmctdHJhbnNjbHVkZT4nLFxuXHRcdFx0XHQnPC9kaXY+J1xuXHRcdFx0XS5qb2luKCcnKSxcblx0XHRcdGNvbnRyb2xsZXI6ICdTcGlubmVyQ29udHJvbGxlcicsXG5cdFx0XHRjb250cm9sbGVyQXM6ICdzcGlubmVyVm0nLFxuXHRcdFx0YmluZFRvQ29udHJvbGxlcjogdHJ1ZVxuXHRcdH07XG5cblx0fVxuXG59KSgpOyIsIihmdW5jdGlvbigpe1xuXG5cdCd1c2Ugc3RyaWN0JztcblxuXHRhbmd1bGFyXG5cdFx0Lm1vZHVsZSgnYXBwLmNvcmUnKVxuXHRcdC5jb250cm9sbGVyKCdEYXRlUGlja2VyJywgRGF0ZVBpY2tlcik7XG5cblx0RGF0ZVBpY2tlci4kaW5qZWN0ID0gWyd1dGlsc1NlcnZpY2UnLCAnZXJyb3JTZXJ2aWNlJ107XG5cblx0ZnVuY3Rpb24gRGF0ZVBpY2tlcih1dGlscywgZXJyb3JTZXJ2aWNlKSB7XG5cblx0XHR2YXIgdm0gPSB0aGlzO1xuXG5cdFx0dm0ub3BlbmVkID0gZmFsc2U7XG5cdFx0dm0ub3BlbiA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0dm0ub3BlbmVkID0gdHJ1ZTtcblx0XHR9O1xuXG5cdH1cblxufSkoKTsiLCIoZnVuY3Rpb24oKXtcblxuXHQndXNlIHN0cmljdCc7XG5cblx0YW5ndWxhclxuXHRcdC5tb2R1bGUoJ2FwcCcpXG5cdFx0LmRpcmVjdGl2ZSgnZGF0ZVBpY2tlcicsIGRhdGVQaWNrZXIpO1xuXG5cdGRhdGVQaWNrZXIuJGluamVjdCA9IFsndXRpbHNTZXJ2aWNlJ107XG5cblx0ZnVuY3Rpb24gZGF0ZVBpY2tlcih1dGlsc1NlcnZpY2Upe1xuXG5cdFx0cmV0dXJuIHtcblx0XHRcdHJlc3RyaWN0OiAnQUUnLFxuXHRcdFx0dHJhbnNjbHVkZTogdHJ1ZSxcblx0XHRcdHNjb3BlOiB7XG5cdFx0XHRcdGRhdGVGb3JtYXQ6ICc9Jyxcblx0XHRcdFx0ZGF0ZU9wdGlvbnM6ICc9Jyxcblx0XHRcdFx0bW9kZWw6ICc9J1xuXHRcdFx0fSxcblx0XHRcdGNvbnRyb2xsZXI6ICdEYXRlUGlja2VyJyxcblx0XHRcdGNvbnRyb2xsZXJBczogJ3BpY2tlclZtJyxcblx0XHRcdHRlbXBsYXRlVXJsOiAnY29tcG9uZW50cy9kYXRlLXBpY2tlci9kYXRlLXBpY2tlci5odG1sJyxcblx0XHRcdGxpbms6IGxpbmtcblx0XHR9O1xuXG5cdFx0ZnVuY3Rpb24gbGluayhzY29wZSwgZWwsIGF0dHJzLCBjdHJsKXtcblxuXHRcdFx0dmFyIGljb25zQ2hhbmdlZCA9IGZhbHNlO1xuXG5cdFx0XHRzY29wZS4kd2F0Y2goJ3BpY2tlclZtLm9wZW5lZCcsIGZ1bmN0aW9uIChvcGVuZWQpIHtcblx0XHRcdFx0aWYob3BlbmVkICYmICFpY29uc0NoYW5nZWQpIHtcblx0XHRcdFx0XHRjaGFuZ2VJY29ucygpO1xuXHRcdFx0XHRcdGljb25zQ2hhbmdlZCA9IHRydWU7XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXG5cdFx0XHRmdW5jdGlvbiBjaGFuZ2VJY29ucygpe1xuXHRcdFx0XHR2YXIgbGVmdEljbyA9IGVsWzBdLnF1ZXJ5U2VsZWN0b3JBbGwoJy51aWItbGVmdCcpO1xuXHRcdFx0XHR2YXIgcmlnaHRJY28gPSBlbFswXS5xdWVyeVNlbGVjdG9yQWxsKCcudWliLXJpZ2h0Jyk7XG5cblx0XHRcdFx0Y29uc29sZS5sb2coJ2NoYW5nZUljb25zOiAnLCBlbFswXSwgbGVmdEljbywgcmlnaHRJY28pO1xuXG5cdFx0XHRcdC8vIGxlZnRJY28uY2xhc3NOYW1lID0gJ2ZhIGZhLWNoZXZyb24tbGVmdCc7XG5cdFx0XHRcdC8vIHJpZ2h0SWNvLmNsYXNzTmFtZSA9ICdmYSBmYS1jaGV2cm9uLXJpZ2h0JztcblxuXHRcdFx0fVxuXG5cdFx0fVxuXG5cdH1cblxufSkoKTsiLCIoZnVuY3Rpb24oKXtcblxuXHQndXNlIHN0cmljdCc7XG5cblx0YW5ndWxhclxuXHRcdC5tb2R1bGUoJ2FwcC5jb3JlJylcblx0XHQuZGlyZWN0aXZlKCd1bmlxdWVQcmVmaXgnLCB1bmlxdWVQcmVmaXgpO1xuXG5cdHVuaXF1ZVByZWZpeC4kaW5qZWN0ID0gWyckcScsICdicmFuY2hlc1NlcnZpY2UnLCAnZXJyb3JTZXJ2aWNlJ107XG5cdGZ1bmN0aW9uIHVuaXF1ZVByZWZpeCgkcSwgYnJhbmNoZXNTZXJ2aWNlLCBlcnJvclNlcnZpY2Upe1xuXG5cdFx0cmV0dXJuIHtcblx0XHRcdHJlc3RyaWN0OiAnQUUnLFxuXHRcdFx0cmVxdWlyZTogJ25nTW9kZWwnLFxuXHRcdFx0bGluazogbGlua1xuXHRcdH07XG5cblx0XHRmdW5jdGlvbiBsaW5rKHNjb3BlLCBlbCwgYXR0cnMsIGN0cmwpIHtcblxuXHRcdCAgICBjdHJsLiRhc3luY1ZhbGlkYXRvcnMudW5pcXVlUHJlZml4ID0gZnVuY3Rpb24obW9kZWxWYWx1ZSwgdmlld1ZhbHVlKSB7XG5cdFx0ICAgIFx0aWYgKGN0cmwuJGlzRW1wdHkobW9kZWxWYWx1ZSkpIHtcblx0XHQgICAgXHQgIC8vIGNvbnNpZGVyIGVtcHR5IG1vZGVsIHZhbGlkXG5cdFx0ICAgIFx0ICByZXR1cm4gJHEud2hlbigpO1xuXHRcdCAgICBcdH1cblxuXHRcdCAgICBcdHZhciBkZWYgPSAkcS5kZWZlcigpO1xuXG5cdFx0ICAgIFx0YnJhbmNoZXNTZXJ2aWNlLmlzUHJlZml4VW5pcXVlKG1vZGVsVmFsdWUpXG5cdFx0ICAgIFx0LnRoZW4oZnVuY3Rpb24ocmVzKXtcblx0XHQgICAgXHRcdGNvbnNvbGUubG9nKCd1bmlxdWVQcmVmaXg6ICcsIHJlcyk7XG5cdFx0ICAgIFx0ICAgIGlmKHJlcy5kYXRhLnJlc3VsdCkgZGVmLnJlc29sdmUoKTtcblx0XHQgICAgXHQgICAgZWxzZSBkZWYucmVqZWN0KCk7XG5cdFx0ICAgIFx0fSwgZnVuY3Rpb24oZXJyKXtcblx0XHQgICAgXHQgICAgZXJyb3JTZXJ2aWNlLnNob3coZXJyKTtcblx0XHQgICAgXHQgICAgZGVmLnJlamVjdCgpO1xuXHRcdCAgICBcdH0pO1xuXG5cdFx0ICAgIFx0cmV0dXJuIGRlZi5wcm9taXNlO1xuXHRcdCAgICAgICAgXG5cdFx0ICAgIH07XG5cdFx0fVxuXG5cdH1cblxufSkoKTsiLCIoZnVuY3Rpb24oKXtcblxuXHQndXNlIHN0cmljdCc7XG5cblx0YW5ndWxhclxuXHRcdC5tb2R1bGUoJ2FwcC5jb3JlJylcblx0XHQuZGlyZWN0aXZlKCd2YWxpZE5hbWUnLCB2YWxpZE5hbWUpO1xuXG5cdHZhbGlkTmFtZS4kaW5qZWN0ID0gWyckcScsICdhcGlTZXJ2aWNlJywgJ2Vycm9yU2VydmljZSddO1xuXHRmdW5jdGlvbiB2YWxpZE5hbWUoJHEsIGFwaSwgZXJyb3JTZXJ2aWNlKXtcblxuXHRcdHJldHVybiB7XG5cdFx0XHRyZXN0cmljdDogJ0FFJyxcblx0XHRcdHJlcXVpcmU6ICduZ01vZGVsJyxcblx0XHRcdGxpbms6IGxpbmtcblx0XHR9O1xuXG5cdFx0ZnVuY3Rpb24gbGluayhzY29wZSwgZWwsIGF0dHJzLCBjdHJsKSB7XG5cblx0XHQgICAgY3RybC4kYXN5bmNWYWxpZGF0b3JzLnZhbGlkTmFtZSA9IGZ1bmN0aW9uKG1vZGVsVmFsdWUsIHZpZXdWYWx1ZSkge1xuXHRcdCAgICAgICAgaWYgKGN0cmwuJGlzRW1wdHkobW9kZWxWYWx1ZSkpIHtcblx0XHQgICAgICAgICAgLy8gY29uc2lkZXIgZW1wdHkgbW9kZWwgdmFsaWRcblx0XHQgICAgICAgICAgcmV0dXJuICRxLndoZW4oKTtcblx0XHQgICAgICAgIH1cblxuXHRcdCAgICAgICAgdmFyIGRlZiA9ICRxLmRlZmVyKCk7XG5cblx0XHQgICAgICAgIGFwaS5yZXF1ZXN0KHtcblx0XHQgICAgICAgICAgICB1cmw6ICdpc05hbWVWYWxpZCcsXG5cdFx0ICAgICAgICAgICAgcGFyYW1zOiB7XG5cdFx0ICAgICAgICAgICAgICAgIG5hbWU6IG1vZGVsVmFsdWVcblx0XHQgICAgICAgICAgICB9XG5cdFx0ICAgICAgICB9KS50aGVuKGZ1bmN0aW9uKHJlcyl7XG5cdFx0ICAgICAgICBcdGNvbnNvbGUubG9nKCd2YWxpZE5hbWU6ICcsIHJlcyk7XG5cdFx0ICAgICAgICAgICAgaWYocmVzLmRhdGEucmVzdWx0KSBkZWYucmVzb2x2ZSgpO1xuXHRcdCAgICAgICAgICAgIGVsc2UgZGVmLnJlamVjdCgpO1xuXHRcdCAgICAgICAgfSwgZnVuY3Rpb24oZXJyKXtcblx0XHQgICAgICAgICAgICBlcnJvclNlcnZpY2Uuc2hvdyhlcnIpO1xuXHRcdCAgICAgICAgICAgIGRlZi5yZWplY3QoKTtcblx0XHQgICAgICAgIH0pO1xuXG5cdFx0ICAgICAgICByZXR1cm4gZGVmLnByb21pc2U7XG5cdFx0ICAgIH07XG5cdFx0fVxuXG5cdH1cblxufSkoKTsiLCIoZnVuY3Rpb24oKXtcblxuXHQndXNlIHN0cmljdCc7XG5cblx0YW5ndWxhclxuXHRcdC5tb2R1bGUoJ2FwcC5jb3JlJylcblx0XHQuZGlyZWN0aXZlKCd2YWxpZFByZWZpeCcsIHZhbGlkUHJlZml4KTtcblxuXHR2YWxpZFByZWZpeC4kaW5qZWN0ID0gWydicmFuY2hlc1NlcnZpY2UnXTtcblx0ZnVuY3Rpb24gdmFsaWRQcmVmaXgoYnJhbmNoZXNTZXJ2aWNlKXtcblxuXHRcdHJldHVybiB7XG5cdFx0XHRyZXN0cmljdDogJ0FFJyxcblx0XHRcdHJlcXVpcmU6ICduZ01vZGVsJyxcblx0XHRcdGxpbms6IGxpbmtcblx0XHR9O1xuXG5cdFx0ZnVuY3Rpb24gbGluayhzY29wZSwgZWwsIGF0dHJzLCBjdHJsKSB7XG5cblx0XHQgICAgZWwub24oJ2tleWRvd24nLCBmdW5jdGlvbiAoZSl7XG5cdFx0ICAgICAgICBpZiAoZS5hbHRLZXkgfHwgZS5rZXlDb2RlID09PSAxOCB8fCBlLmtleUNvZGUgPT09IDMyIHx8IChlLmtleUNvZGUgIT09IDE4OSAmJiBlLmtleUNvZGUgPiA5MCkpIHtcblx0XHQgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG5cdFx0ICAgICAgICB9XG5cdFx0ICAgIH0pO1xuXHRcdCAgICBcblx0XHQgICAgY3RybC4kdmFsaWRhdG9ycy52YWxpZFByZWZpeCA9IGZ1bmN0aW9uKG1vZGVsVmFsdWUsIHZpZXdWYWx1ZSkge1xuXHRcdCAgICBcdGlmIChjdHJsLiRpc0VtcHR5KG1vZGVsVmFsdWUpKSB7XG5cdFx0ICAgIFx0ICAvLyBjb25zaWRlciBlbXB0eSBtb2RlbCB2YWxpZFxuXHRcdCAgICBcdCAgcmV0dXJuIHRydWU7XG5cdFx0ICAgIFx0fVxuXG5cdFx0ICAgIFx0aWYoYnJhbmNoZXNTZXJ2aWNlLmlzUHJlZml4VmFsaWQobW9kZWxWYWx1ZSkpIHtcblx0XHQgICAgXHRcdHJldHVybiB0cnVlO1xuXHRcdCAgICBcdH0gZWxzZSB7XG5cdFx0ICAgIFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0ICAgIFx0fVxuXHRcdCAgICAgICAgXG5cdFx0ICAgIH07XG5cdFx0fVxuXG5cdH1cblxufSkoKTsiLCIoZnVuY3Rpb24oKXtcblxuXHQndXNlIHN0cmljdCc7XG5cblx0YW5ndWxhclxuXHRcdC5tb2R1bGUoJ2FwcC5sYXlvdXQnKVxuXHRcdC5jb250cm9sbGVyKCdGb290ZXJDb250cm9sbGVyJywgRm9vdGVyQ29udHJvbGxlcik7XG5cblx0Rm9vdGVyQ29udHJvbGxlci4kaW5qZWN0ID0gWyckcm9vdFNjb3BlJ107XG5cblx0ZnVuY3Rpb24gRm9vdGVyQ29udHJvbGxlcigkcm9vdFNjb3BlKSB7XG5cblx0XHR2YXIgdm0gPSB0aGlzO1xuXHRcdC8vIHZtLmZvb3RlciA9IHRydWU7XG5cdFx0XG5cdH1cblxufSkoKTsiLCIoZnVuY3Rpb24oKXtcblxuXHQndXNlIHN0cmljdCc7XG5cblx0YW5ndWxhclxuXHRcdC5tb2R1bGUoJ2FwcC5sYXlvdXQnKVxuXHRcdC5kaXJlY3RpdmUoJ2Zvb3RlcicsIGZvb3Rlcik7XG5cblx0ZnVuY3Rpb24gZm9vdGVyKCl7XG5cblx0XHRyZXR1cm4ge1xuXHRcdFx0cmVzdHJpY3Q6ICdBRScsXG5cdFx0XHR0cmFuc2NsdWRlOiB0cnVlLFxuXHRcdFx0Y29udHJvbGxlcjogJ0Zvb3RlckNvbnRyb2xsZXInLFxuXHRcdFx0Y29udHJvbGxlckFzOiAnZm9vdGVyVm0nLFxuXHRcdFx0dGVtcGxhdGVVcmw6ICdsYXlvdXQvZm9vdGVyL2Zvb3Rlci5odG1sJ1xuXHRcdH07XG5cblx0fVxuXG59KSgpOyIsIihmdW5jdGlvbigpe1xuXG5cdCd1c2Ugc3RyaWN0JztcblxuXHRhbmd1bGFyXG5cdFx0Lm1vZHVsZSgnYXBwLmxheW91dCcpXG5cdFx0LmRpcmVjdGl2ZSgnbGFuZ05hdicsIGxhbmdOYXYpO1xuXG5cdGZ1bmN0aW9uIGxhbmdOYXYoKXtcblxuXHRcdHJldHVybiB7XG5cdFx0XHRyZXN0cmljdDogJ0FFJyxcblx0XHRcdHRyYW5zY2x1ZGU6IHRydWUsXG5cdFx0XHRjb250cm9sbGVyOiAnTGFuZ0NvbnRyb2xsZXInLFxuXHRcdFx0Y29udHJvbGxlckFzOiAnbGFuZ1ZtJyxcblx0XHRcdHRlbXBsYXRlVXJsOiAnbGF5b3V0L2xhbmduYXYvbGFuZ25hdi5odG1sJ1xuXHRcdH07XG5cblx0fVxuXG59KSgpOyIsIihmdW5jdGlvbigpe1xuXG5cdCd1c2Ugc3RyaWN0JztcblxuXHRhbmd1bGFyXG5cdFx0Lm1vZHVsZSgnYXBwLmxheW91dCcpXG5cdFx0LmNvbnRyb2xsZXIoJ0xhbmdDb250cm9sbGVyJywgTGFuZ0NvbnRyb2xsZXIpO1xuXG5cdExhbmdDb250cm9sbGVyLiRpbmplY3QgPSBbJyRsb2NhbFN0b3JhZ2UnLCAnJHJvb3RTY29wZScsICckc2NvcGUnLCAnJHRyYW5zbGF0ZScsICdhcGlTZXJ2aWNlJywgJ2F1dGhTZXJ2aWNlJywgJ3RtaER5bmFtaWNMb2NhbGUnXTtcblxuXHRmdW5jdGlvbiBMYW5nQ29udHJvbGxlcigkbG9jYWxTdG9yYWdlLCAkcm9vdFNjb3BlLCAkc2NvcGUsICR0cmFuc2xhdGUsIGFwaSwgYXV0aFNlcnZpY2UsIHRtaER5bmFtaWNMb2NhbGUpIHtcblxuXHRcdHZhciB2bSA9IHRoaXM7XG5cdFx0dm0uY2hhbmdlTGFuZ3VhZ2UgPSBjaGFuZ2VMYW5ndWFnZTtcblxuXHRcdHRtaER5bmFtaWNMb2NhbGUuc2V0KCRsb2NhbFN0b3JhZ2UuTkdfVFJBTlNMQVRFX0xBTkdfS0VZIHx8ICdlbicpO1xuXHRcdFxuXHRcdGZ1bmN0aW9uIGNoYW5nZUxhbmd1YWdlKGxhbmdLZXkpIHtcblx0XHRcdCR0cmFuc2xhdGUudXNlKGxhbmdLZXkpO1xuXHRcdFx0aWYoIWF1dGhTZXJ2aWNlLmlzTG9nZ2VkSW4oKSkge1xuXHRcdFx0XHQkcm9vdFNjb3BlLiRlbWl0KCdsYW5nLmNoYW5nZScsIHsgbGFuZzogbGFuZ0tleSB9KTtcblx0XHRcdFx0JHNjb3BlLmxheW91dFZtLnRyaWdnZXJMYW5nTWVudSgpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0YXBpLnJlcXVlc3Qoe1xuXHRcdFx0XHRcdHVybDogJ3NldEN1c3RvbWVyTGFuZycsXG5cdFx0XHRcdFx0cGFyYW1zOiB7XG5cdFx0XHRcdFx0XHRsYW5nOiBsYW5nS2V5XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9KS50aGVuKGZ1bmN0aW9uIChyZXMpe1xuXHRcdFx0XHRcdGlmKCFyZXMuZGF0YS5zdWNjZXNzKSByZXR1cm4gZXJyb3JTZXJ2aWNlLnNob3cocmVzLmRhdGEubWVzc2FnZSk7XG5cdFx0XHRcdFx0XG5cdFx0XHRcdFx0JHJvb3RTY29wZS4kZW1pdCgnbGFuZy5jaGFuZ2UnLCB7IGxhbmc6IGxhbmdLZXkgfSk7XG5cdFx0XHRcdFx0JHNjb3BlLmxheW91dFZtLnRyaWdnZXJMYW5nTWVudSgpO1xuXHRcdFx0XHR9LCBmdW5jdGlvbiAoZXJyKXtcblx0XHRcdFx0XHRlcnJvclNlcnZpY2Uuc2hvdyhlcnIpO1xuXHRcdFx0XHR9KTtcblx0XHRcdH1cblxuXHRcdFx0dG1oRHluYW1pY0xvY2FsZS5zZXQobGFuZ0tleSk7XG5cdFx0fVxuXG5cdH1cblxufSkoKTsiLCIndXNlIHN0cmljdCc7XG5hbmd1bGFyLm1vZHVsZShcIm5nTG9jYWxlXCIsIFtdLCBbXCIkcHJvdmlkZVwiLCBmdW5jdGlvbigkcHJvdmlkZSkge1xudmFyIFBMVVJBTF9DQVRFR09SWSA9IHtaRVJPOiBcInplcm9cIiwgT05FOiBcIm9uZVwiLCBUV086IFwidHdvXCIsIEZFVzogXCJmZXdcIiwgTUFOWTogXCJtYW55XCIsIE9USEVSOiBcIm90aGVyXCJ9O1xuZnVuY3Rpb24gZ2V0RGVjaW1hbHMobikge1xuICBuID0gbiArICcnO1xuICB2YXIgaSA9IG4uaW5kZXhPZignLicpO1xuICByZXR1cm4gKGkgPT0gLTEpID8gMCA6IG4ubGVuZ3RoIC0gaSAtIDE7XG59XG5cbmZ1bmN0aW9uIGdldFZGKG4sIG9wdF9wcmVjaXNpb24pIHtcbiAgdmFyIHYgPSBvcHRfcHJlY2lzaW9uO1xuXG4gIGlmICh1bmRlZmluZWQgPT09IHYpIHtcbiAgICB2ID0gTWF0aC5taW4oZ2V0RGVjaW1hbHMobiksIDMpO1xuICB9XG5cbiAgdmFyIGJhc2UgPSBNYXRoLnBvdygxMCwgdik7XG4gIHZhciBmID0gKChuICogYmFzZSkgfCAwKSAlIGJhc2U7XG4gIHJldHVybiB7djogdiwgZjogZn07XG59XG5cbiRwcm92aWRlLnZhbHVlKFwiJGxvY2FsZVwiLCB7XG4gIFwiREFURVRJTUVfRk9STUFUU1wiOiB7XG4gICAgXCJBTVBNU1wiOiBbXG4gICAgICBcIkFNXCIsXG4gICAgICBcIlBNXCJcbiAgICBdLFxuICAgIFwiREFZXCI6IFtcbiAgICAgIFwiU3VuZGF5XCIsXG4gICAgICBcIk1vbmRheVwiLFxuICAgICAgXCJUdWVzZGF5XCIsXG4gICAgICBcIldlZG5lc2RheVwiLFxuICAgICAgXCJUaHVyc2RheVwiLFxuICAgICAgXCJGcmlkYXlcIixcbiAgICAgIFwiU2F0dXJkYXlcIlxuICAgIF0sXG4gICAgXCJFUkFOQU1FU1wiOiBbXG4gICAgICBcIkJlZm9yZSBDaHJpc3RcIixcbiAgICAgIFwiQW5ubyBEb21pbmlcIlxuICAgIF0sXG4gICAgXCJFUkFTXCI6IFtcbiAgICAgIFwiQkNcIixcbiAgICAgIFwiQURcIlxuICAgIF0sXG4gICAgXCJGSVJTVERBWU9GV0VFS1wiOiA2LFxuICAgIFwiTU9OVEhcIjogW1xuICAgICAgXCJKYW51YXJ5XCIsXG4gICAgICBcIkZlYnJ1YXJ5XCIsXG4gICAgICBcIk1hcmNoXCIsXG4gICAgICBcIkFwcmlsXCIsXG4gICAgICBcIk1heVwiLFxuICAgICAgXCJKdW5lXCIsXG4gICAgICBcIkp1bHlcIixcbiAgICAgIFwiQXVndXN0XCIsXG4gICAgICBcIlNlcHRlbWJlclwiLFxuICAgICAgXCJPY3RvYmVyXCIsXG4gICAgICBcIk5vdmVtYmVyXCIsXG4gICAgICBcIkRlY2VtYmVyXCJcbiAgICBdLFxuICAgIFwiU0hPUlREQVlcIjogW1xuICAgICAgXCJTdW5cIixcbiAgICAgIFwiTW9uXCIsXG4gICAgICBcIlR1ZVwiLFxuICAgICAgXCJXZWRcIixcbiAgICAgIFwiVGh1XCIsXG4gICAgICBcIkZyaVwiLFxuICAgICAgXCJTYXRcIlxuICAgIF0sXG4gICAgXCJTSE9SVE1PTlRIXCI6IFtcbiAgICAgIFwiSmFuXCIsXG4gICAgICBcIkZlYlwiLFxuICAgICAgXCJNYXJcIixcbiAgICAgIFwiQXByXCIsXG4gICAgICBcIk1heVwiLFxuICAgICAgXCJKdW5cIixcbiAgICAgIFwiSnVsXCIsXG4gICAgICBcIkF1Z1wiLFxuICAgICAgXCJTZXBcIixcbiAgICAgIFwiT2N0XCIsXG4gICAgICBcIk5vdlwiLFxuICAgICAgXCJEZWNcIlxuICAgIF0sXG4gICAgXCJTVEFOREFMT05FTU9OVEhcIjogW1xuICAgICAgXCJKYW51YXJ5XCIsXG4gICAgICBcIkZlYnJ1YXJ5XCIsXG4gICAgICBcIk1hcmNoXCIsXG4gICAgICBcIkFwcmlsXCIsXG4gICAgICBcIk1heVwiLFxuICAgICAgXCJKdW5lXCIsXG4gICAgICBcIkp1bHlcIixcbiAgICAgIFwiQXVndXN0XCIsXG4gICAgICBcIlNlcHRlbWJlclwiLFxuICAgICAgXCJPY3RvYmVyXCIsXG4gICAgICBcIk5vdmVtYmVyXCIsXG4gICAgICBcIkRlY2VtYmVyXCJcbiAgICBdLFxuICAgIFwiV0VFS0VORFJBTkdFXCI6IFtcbiAgICAgIDUsXG4gICAgICA2XG4gICAgXSxcbiAgICBcImZ1bGxEYXRlXCI6IFwiRUVFRSwgTU1NTSBkLCB5XCIsXG4gICAgXCJsb25nRGF0ZVwiOiBcIk1NTU0gZCwgeVwiLFxuICAgIFwibWVkaXVtXCI6IFwiTU1NIGQsIHkgaDptbTpzcyBhXCIsXG4gICAgXCJtZWRpdW1EYXRlXCI6IFwiTU1NIGQsIHlcIixcbiAgICBcIm1lZGl1bVRpbWVcIjogXCJoOm1tOnNzIGFcIixcbiAgICBcInNob3J0XCI6IFwiTS9kL3l5IGg6bW0gYVwiLFxuICAgIFwic2hvcnREYXRlXCI6IFwiTS9kL3l5XCIsXG4gICAgXCJzaG9ydFRpbWVcIjogXCJoOm1tIGFcIlxuICB9LFxuICBcIk5VTUJFUl9GT1JNQVRTXCI6IHtcbiAgICBcIkNVUlJFTkNZX1NZTVwiOiBcIiRcIixcbiAgICBcIkRFQ0lNQUxfU0VQXCI6IFwiLlwiLFxuICAgIFwiR1JPVVBfU0VQXCI6IFwiLFwiLFxuICAgIFwiUEFUVEVSTlNcIjogW1xuICAgICAge1xuICAgICAgICBcImdTaXplXCI6IDMsXG4gICAgICAgIFwibGdTaXplXCI6IDMsXG4gICAgICAgIFwibWF4RnJhY1wiOiAzLFxuICAgICAgICBcIm1pbkZyYWNcIjogMCxcbiAgICAgICAgXCJtaW5JbnRcIjogMSxcbiAgICAgICAgXCJuZWdQcmVcIjogXCItXCIsXG4gICAgICAgIFwibmVnU3VmXCI6IFwiXCIsXG4gICAgICAgIFwicG9zUHJlXCI6IFwiXCIsXG4gICAgICAgIFwicG9zU3VmXCI6IFwiXCJcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIFwiZ1NpemVcIjogMyxcbiAgICAgICAgXCJsZ1NpemVcIjogMyxcbiAgICAgICAgXCJtYXhGcmFjXCI6IDIsXG4gICAgICAgIFwibWluRnJhY1wiOiAyLFxuICAgICAgICBcIm1pbkludFwiOiAxLFxuICAgICAgICBcIm5lZ1ByZVwiOiBcIi1cXHUwMGE0XCIsXG4gICAgICAgIFwibmVnU3VmXCI6IFwiXCIsXG4gICAgICAgIFwicG9zUHJlXCI6IFwiXFx1MDBhNFwiLFxuICAgICAgICBcInBvc1N1ZlwiOiBcIlwiXG4gICAgICB9XG4gICAgXVxuICB9LFxuICBcImlkXCI6IFwiZW5cIixcbiAgXCJsb2NhbGVJRFwiOiBcImVuXCIsXG4gIFwicGx1cmFsQ2F0XCI6IGZ1bmN0aW9uKG4sIG9wdF9wcmVjaXNpb24pIHsgIHZhciBpID0gbiB8IDA7ICB2YXIgdmYgPSBnZXRWRihuLCBvcHRfcHJlY2lzaW9uKTsgIGlmIChpID09IDEgJiYgdmYudiA9PSAwKSB7ICAgIHJldHVybiBQTFVSQUxfQ0FURUdPUlkuT05FOyAgfSAgcmV0dXJuIFBMVVJBTF9DQVRFR09SWS5PVEhFUjt9XG59KTtcbn1dKTtcbiIsIid1c2Ugc3RyaWN0JztcbmFuZ3VsYXIubW9kdWxlKFwibmdMb2NhbGVcIiwgW10sIFtcIiRwcm92aWRlXCIsIGZ1bmN0aW9uKCRwcm92aWRlKSB7XG52YXIgUExVUkFMX0NBVEVHT1JZID0ge1pFUk86IFwiemVyb1wiLCBPTkU6IFwib25lXCIsIFRXTzogXCJ0d29cIiwgRkVXOiBcImZld1wiLCBNQU5ZOiBcIm1hbnlcIiwgT1RIRVI6IFwib3RoZXJcIn07XG5mdW5jdGlvbiBnZXREZWNpbWFscyhuKSB7XG4gIG4gPSBuICsgJyc7XG4gIHZhciBpID0gbi5pbmRleE9mKCcuJyk7XG4gIHJldHVybiAoaSA9PSAtMSkgPyAwIDogbi5sZW5ndGggLSBpIC0gMTtcbn1cblxuZnVuY3Rpb24gZ2V0VkYobiwgb3B0X3ByZWNpc2lvbikge1xuICB2YXIgdiA9IG9wdF9wcmVjaXNpb247XG5cbiAgaWYgKHVuZGVmaW5lZCA9PT0gdikge1xuICAgIHYgPSBNYXRoLm1pbihnZXREZWNpbWFscyhuKSwgMyk7XG4gIH1cblxuICB2YXIgYmFzZSA9IE1hdGgucG93KDEwLCB2KTtcbiAgdmFyIGYgPSAoKG4gKiBiYXNlKSB8IDApICUgYmFzZTtcbiAgcmV0dXJuIHt2OiB2LCBmOiBmfTtcbn1cblxuJHByb3ZpZGUudmFsdWUoXCIkbG9jYWxlXCIsIHtcbiAgXCJEQVRFVElNRV9GT1JNQVRTXCI6IHtcbiAgICBcIkFNUE1TXCI6IFtcbiAgICAgIFwiQU1cIixcbiAgICAgIFwiUE1cIlxuICAgIF0sXG4gICAgXCJEQVlcIjogW1xuICAgICAgXCJcXHUwNDMyXFx1MDQzZVxcdTA0NDFcXHUwNDNhXFx1MDQ0MFxcdTA0MzVcXHUwNDQxXFx1MDQzNVxcdTA0M2RcXHUwNDRjXFx1MDQzNVwiLFxuICAgICAgXCJcXHUwNDNmXFx1MDQzZVxcdTA0M2RcXHUwNDM1XFx1MDQzNFxcdTA0MzVcXHUwNDNiXFx1MDQ0Y1xcdTA0M2RcXHUwNDM4XFx1MDQzYVwiLFxuICAgICAgXCJcXHUwNDMyXFx1MDQ0MlxcdTA0M2VcXHUwNDQwXFx1MDQzZFxcdTA0MzhcXHUwNDNhXCIsXG4gICAgICBcIlxcdTA0NDFcXHUwNDQwXFx1MDQzNVxcdTA0MzRcXHUwNDMwXCIsXG4gICAgICBcIlxcdTA0NDdcXHUwNDM1XFx1MDQ0MlxcdTA0MzJcXHUwNDM1XFx1MDQ0MFxcdTA0MzNcIixcbiAgICAgIFwiXFx1MDQzZlxcdTA0NGZcXHUwNDQyXFx1MDQzZFxcdTA0MzhcXHUwNDQ2XFx1MDQzMFwiLFxuICAgICAgXCJcXHUwNDQxXFx1MDQ0M1xcdTA0MzFcXHUwNDMxXFx1MDQzZVxcdTA0NDJcXHUwNDMwXCJcbiAgICBdLFxuICAgIFwiRVJBTkFNRVNcIjogW1xuICAgICAgXCJcXHUwNDM0XFx1MDQzZSBcXHUwNDNkLiBcXHUwNDRkLlwiLFxuICAgICAgXCJcXHUwNDNkLiBcXHUwNDRkLlwiXG4gICAgXSxcbiAgICBcIkVSQVNcIjogW1xuICAgICAgXCJcXHUwNDM0XFx1MDQzZSBcXHUwNDNkLiBcXHUwNDRkLlwiLFxuICAgICAgXCJcXHUwNDNkLiBcXHUwNDRkLlwiXG4gICAgXSxcbiAgICBcIkZJUlNUREFZT0ZXRUVLXCI6IDAsXG4gICAgXCJNT05USFwiOiBbXG4gICAgICBcIlxcdTA0NGZcXHUwNDNkXFx1MDQzMlxcdTA0MzBcXHUwNDQwXFx1MDQ0ZlwiLFxuICAgICAgXCJcXHUwNDQ0XFx1MDQzNVxcdTA0MzJcXHUwNDQwXFx1MDQzMFxcdTA0M2JcXHUwNDRmXCIsXG4gICAgICBcIlxcdTA0M2NcXHUwNDMwXFx1MDQ0MFxcdTA0NDJcXHUwNDMwXCIsXG4gICAgICBcIlxcdTA0MzBcXHUwNDNmXFx1MDQ0MFxcdTA0MzVcXHUwNDNiXFx1MDQ0ZlwiLFxuICAgICAgXCJcXHUwNDNjXFx1MDQzMFxcdTA0NGZcIixcbiAgICAgIFwiXFx1MDQzOFxcdTA0NGVcXHUwNDNkXFx1MDQ0ZlwiLFxuICAgICAgXCJcXHUwNDM4XFx1MDQ0ZVxcdTA0M2JcXHUwNDRmXCIsXG4gICAgICBcIlxcdTA0MzBcXHUwNDMyXFx1MDQzM1xcdTA0NDNcXHUwNDQxXFx1MDQ0MlxcdTA0MzBcIixcbiAgICAgIFwiXFx1MDQ0MVxcdTA0MzVcXHUwNDNkXFx1MDQ0MlxcdTA0NGZcXHUwNDMxXFx1MDQ0MFxcdTA0NGZcIixcbiAgICAgIFwiXFx1MDQzZVxcdTA0M2FcXHUwNDQyXFx1MDQ0ZlxcdTA0MzFcXHUwNDQwXFx1MDQ0ZlwiLFxuICAgICAgXCJcXHUwNDNkXFx1MDQzZVxcdTA0NGZcXHUwNDMxXFx1MDQ0MFxcdTA0NGZcIixcbiAgICAgIFwiXFx1MDQzNFxcdTA0MzVcXHUwNDNhXFx1MDQzMFxcdTA0MzFcXHUwNDQwXFx1MDQ0ZlwiXG4gICAgXSxcbiAgICBcIlNIT1JUREFZXCI6IFtcbiAgICAgIFwiXFx1MDQzMlxcdTA0NDFcIixcbiAgICAgIFwiXFx1MDQzZlxcdTA0M2RcIixcbiAgICAgIFwiXFx1MDQzMlxcdTA0NDJcIixcbiAgICAgIFwiXFx1MDQ0MVxcdTA0NDBcIixcbiAgICAgIFwiXFx1MDQ0N1xcdTA0NDJcIixcbiAgICAgIFwiXFx1MDQzZlxcdTA0NDJcIixcbiAgICAgIFwiXFx1MDQ0MVxcdTA0MzFcIlxuICAgIF0sXG4gICAgXCJTSE9SVE1PTlRIXCI6IFtcbiAgICAgIFwiXFx1MDQ0ZlxcdTA0M2RcXHUwNDMyLlwiLFxuICAgICAgXCJcXHUwNDQ0XFx1MDQzNVxcdTA0MzJcXHUwNDQwLlwiLFxuICAgICAgXCJcXHUwNDNjXFx1MDQzMFxcdTA0NDBcXHUwNDQyXFx1MDQzMFwiLFxuICAgICAgXCJcXHUwNDMwXFx1MDQzZlxcdTA0NDAuXCIsXG4gICAgICBcIlxcdTA0M2NcXHUwNDMwXFx1MDQ0ZlwiLFxuICAgICAgXCJcXHUwNDM4XFx1MDQ0ZVxcdTA0M2RcXHUwNDRmXCIsXG4gICAgICBcIlxcdTA0MzhcXHUwNDRlXFx1MDQzYlxcdTA0NGZcIixcbiAgICAgIFwiXFx1MDQzMFxcdTA0MzJcXHUwNDMzLlwiLFxuICAgICAgXCJcXHUwNDQxXFx1MDQzNVxcdTA0M2RcXHUwNDQyLlwiLFxuICAgICAgXCJcXHUwNDNlXFx1MDQzYVxcdTA0NDIuXCIsXG4gICAgICBcIlxcdTA0M2RcXHUwNDNlXFx1MDQ0ZlxcdTA0MzEuXCIsXG4gICAgICBcIlxcdTA0MzRcXHUwNDM1XFx1MDQzYS5cIlxuICAgIF0sXG4gICAgXCJTVEFOREFMT05FTU9OVEhcIjogW1xuICAgICAgXCJcXHUwNDRmXFx1MDQzZFxcdTA0MzJcXHUwNDMwXFx1MDQ0MFxcdTA0NGNcIixcbiAgICAgIFwiXFx1MDQ0NFxcdTA0MzVcXHUwNDMyXFx1MDQ0MFxcdTA0MzBcXHUwNDNiXFx1MDQ0Y1wiLFxuICAgICAgXCJcXHUwNDNjXFx1MDQzMFxcdTA0NDBcXHUwNDQyXCIsXG4gICAgICBcIlxcdTA0MzBcXHUwNDNmXFx1MDQ0MFxcdTA0MzVcXHUwNDNiXFx1MDQ0Y1wiLFxuICAgICAgXCJcXHUwNDNjXFx1MDQzMFxcdTA0MzlcIixcbiAgICAgIFwiXFx1MDQzOFxcdTA0NGVcXHUwNDNkXFx1MDQ0Y1wiLFxuICAgICAgXCJcXHUwNDM4XFx1MDQ0ZVxcdTA0M2JcXHUwNDRjXCIsXG4gICAgICBcIlxcdTA0MzBcXHUwNDMyXFx1MDQzM1xcdTA0NDNcXHUwNDQxXFx1MDQ0MlwiLFxuICAgICAgXCJcXHUwNDQxXFx1MDQzNVxcdTA0M2RcXHUwNDQyXFx1MDQ0ZlxcdTA0MzFcXHUwNDQwXFx1MDQ0Y1wiLFxuICAgICAgXCJcXHUwNDNlXFx1MDQzYVxcdTA0NDJcXHUwNDRmXFx1MDQzMVxcdTA0NDBcXHUwNDRjXCIsXG4gICAgICBcIlxcdTA0M2RcXHUwNDNlXFx1MDQ0ZlxcdTA0MzFcXHUwNDQwXFx1MDQ0Y1wiLFxuICAgICAgXCJcXHUwNDM0XFx1MDQzNVxcdTA0M2FcXHUwNDMwXFx1MDQzMVxcdTA0NDBcXHUwNDRjXCJcbiAgICBdLFxuICAgIFwiV0VFS0VORFJBTkdFXCI6IFtcbiAgICAgIDUsXG4gICAgICA2XG4gICAgXSxcbiAgICBcImZ1bGxEYXRlXCI6IFwiRUVFRSwgZCBNTU1NIHkgJ1xcdTA0MzMnLlwiLFxuICAgIFwibG9uZ0RhdGVcIjogXCJkIE1NTU0geSAnXFx1MDQzMycuXCIsXG4gICAgXCJtZWRpdW1cIjogXCJkIE1NTSB5ICdcXHUwNDMzJy4gSDptbTpzc1wiLFxuICAgIFwibWVkaXVtRGF0ZVwiOiBcImQgTU1NIHkgJ1xcdTA0MzMnLlwiLFxuICAgIFwibWVkaXVtVGltZVwiOiBcIkg6bW06c3NcIixcbiAgICBcInNob3J0XCI6IFwiZGQuTU0ueXkgSDptbVwiLFxuICAgIFwic2hvcnREYXRlXCI6IFwiZGQuTU0ueXlcIixcbiAgICBcInNob3J0VGltZVwiOiBcIkg6bW1cIlxuICB9LFxuICBcIk5VTUJFUl9GT1JNQVRTXCI6IHtcbiAgICBcIkNVUlJFTkNZX1NZTVwiOiBcIlxcdTA0NDBcXHUwNDQzXFx1MDQzMS5cIixcbiAgICBcIkRFQ0lNQUxfU0VQXCI6IFwiLFwiLFxuICAgIFwiR1JPVVBfU0VQXCI6IFwiXFx1MDBhMFwiLFxuICAgIFwiUEFUVEVSTlNcIjogW1xuICAgICAge1xuICAgICAgICBcImdTaXplXCI6IDMsXG4gICAgICAgIFwibGdTaXplXCI6IDMsXG4gICAgICAgIFwibWF4RnJhY1wiOiAzLFxuICAgICAgICBcIm1pbkZyYWNcIjogMCxcbiAgICAgICAgXCJtaW5JbnRcIjogMSxcbiAgICAgICAgXCJuZWdQcmVcIjogXCItXCIsXG4gICAgICAgIFwibmVnU3VmXCI6IFwiXCIsXG4gICAgICAgIFwicG9zUHJlXCI6IFwiXCIsXG4gICAgICAgIFwicG9zU3VmXCI6IFwiXCJcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIFwiZ1NpemVcIjogMyxcbiAgICAgICAgXCJsZ1NpemVcIjogMyxcbiAgICAgICAgXCJtYXhGcmFjXCI6IDIsXG4gICAgICAgIFwibWluRnJhY1wiOiAyLFxuICAgICAgICBcIm1pbkludFwiOiAxLFxuICAgICAgICBcIm5lZ1ByZVwiOiBcIi1cIixcbiAgICAgICAgXCJuZWdTdWZcIjogXCJcXHUwMGEwXFx1MDBhNFwiLFxuICAgICAgICBcInBvc1ByZVwiOiBcIlwiLFxuICAgICAgICBcInBvc1N1ZlwiOiBcIlxcdTAwYTBcXHUwMGE0XCJcbiAgICAgIH1cbiAgICBdXG4gIH0sXG4gIFwiaWRcIjogXCJydS1ydVwiLFxuICBcImxvY2FsZUlEXCI6IFwicnVfUlVcIixcbiAgXCJwbHVyYWxDYXRcIjogZnVuY3Rpb24obiwgb3B0X3ByZWNpc2lvbikgeyAgdmFyIGkgPSBuIHwgMDsgIHZhciB2ZiA9IGdldFZGKG4sIG9wdF9wcmVjaXNpb24pOyAgaWYgKHZmLnYgPT0gMCAmJiBpICUgMTAgPT0gMSAmJiBpICUgMTAwICE9IDExKSB7ICAgIHJldHVybiBQTFVSQUxfQ0FURUdPUlkuT05FOyAgfSAgaWYgKHZmLnYgPT0gMCAmJiBpICUgMTAgPj0gMiAmJiBpICUgMTAgPD0gNCAmJiAoaSAlIDEwMCA8IDEyIHx8IGkgJSAxMDAgPiAxNCkpIHsgICAgcmV0dXJuIFBMVVJBTF9DQVRFR09SWS5GRVc7ICB9ICBpZiAodmYudiA9PSAwICYmIGkgJSAxMCA9PSAwIHx8IHZmLnYgPT0gMCAmJiBpICUgMTAgPj0gNSAmJiBpICUgMTAgPD0gOSB8fCB2Zi52ID09IDAgJiYgaSAlIDEwMCA+PSAxMSAmJiBpICUgMTAwIDw9IDE0KSB7ICAgIHJldHVybiBQTFVSQUxfQ0FURUdPUlkuTUFOWTsgIH0gIHJldHVybiBQTFVSQUxfQ0FURUdPUlkuT1RIRVI7fVxufSk7XG59XSk7XG4iLCIndXNlIHN0cmljdCc7XG5hbmd1bGFyLm1vZHVsZShcIm5nTG9jYWxlXCIsIFtdLCBbXCIkcHJvdmlkZVwiLCBmdW5jdGlvbigkcHJvdmlkZSkge1xudmFyIFBMVVJBTF9DQVRFR09SWSA9IHtaRVJPOiBcInplcm9cIiwgT05FOiBcIm9uZVwiLCBUV086IFwidHdvXCIsIEZFVzogXCJmZXdcIiwgTUFOWTogXCJtYW55XCIsIE9USEVSOiBcIm90aGVyXCJ9O1xuZnVuY3Rpb24gZ2V0RGVjaW1hbHMobikge1xuICBuID0gbiArICcnO1xuICB2YXIgaSA9IG4uaW5kZXhPZignLicpO1xuICByZXR1cm4gKGkgPT0gLTEpID8gMCA6IG4ubGVuZ3RoIC0gaSAtIDE7XG59XG5cbmZ1bmN0aW9uIGdldFZGKG4sIG9wdF9wcmVjaXNpb24pIHtcbiAgdmFyIHYgPSBvcHRfcHJlY2lzaW9uO1xuXG4gIGlmICh1bmRlZmluZWQgPT09IHYpIHtcbiAgICB2ID0gTWF0aC5taW4oZ2V0RGVjaW1hbHMobiksIDMpO1xuICB9XG5cbiAgdmFyIGJhc2UgPSBNYXRoLnBvdygxMCwgdik7XG4gIHZhciBmID0gKChuICogYmFzZSkgfCAwKSAlIGJhc2U7XG4gIHJldHVybiB7djogdiwgZjogZn07XG59XG5cbiRwcm92aWRlLnZhbHVlKFwiJGxvY2FsZVwiLCB7XG4gIFwiREFURVRJTUVfRk9STUFUU1wiOiB7XG4gICAgXCJBTVBNU1wiOiBbXG4gICAgICBcIkFNXCIsXG4gICAgICBcIlBNXCJcbiAgICBdLFxuICAgIFwiREFZXCI6IFtcbiAgICAgIFwiXFx1MDQzMlxcdTA0M2VcXHUwNDQxXFx1MDQzYVxcdTA0NDBcXHUwNDM1XFx1MDQ0MVxcdTA0MzVcXHUwNDNkXFx1MDQ0Y1xcdTA0MzVcIixcbiAgICAgIFwiXFx1MDQzZlxcdTA0M2VcXHUwNDNkXFx1MDQzNVxcdTA0MzRcXHUwNDM1XFx1MDQzYlxcdTA0NGNcXHUwNDNkXFx1MDQzOFxcdTA0M2FcIixcbiAgICAgIFwiXFx1MDQzMlxcdTA0NDJcXHUwNDNlXFx1MDQ0MFxcdTA0M2RcXHUwNDM4XFx1MDQzYVwiLFxuICAgICAgXCJcXHUwNDQxXFx1MDQ0MFxcdTA0MzVcXHUwNDM0XFx1MDQzMFwiLFxuICAgICAgXCJcXHUwNDQ3XFx1MDQzNVxcdTA0NDJcXHUwNDMyXFx1MDQzNVxcdTA0NDBcXHUwNDMzXCIsXG4gICAgICBcIlxcdTA0M2ZcXHUwNDRmXFx1MDQ0MlxcdTA0M2RcXHUwNDM4XFx1MDQ0NlxcdTA0MzBcIixcbiAgICAgIFwiXFx1MDQ0MVxcdTA0NDNcXHUwNDMxXFx1MDQzMVxcdTA0M2VcXHUwNDQyXFx1MDQzMFwiXG4gICAgXSxcbiAgICBcIkVSQU5BTUVTXCI6IFtcbiAgICAgIFwiXFx1MDQzNFxcdTA0M2UgXFx1MDQzZC4gXFx1MDQ0ZC5cIixcbiAgICAgIFwiXFx1MDQzZC4gXFx1MDQ0ZC5cIlxuICAgIF0sXG4gICAgXCJFUkFTXCI6IFtcbiAgICAgIFwiXFx1MDQzNFxcdTA0M2UgXFx1MDQzZC4gXFx1MDQ0ZC5cIixcbiAgICAgIFwiXFx1MDQzZC4gXFx1MDQ0ZC5cIlxuICAgIF0sXG4gICAgXCJGSVJTVERBWU9GV0VFS1wiOiAwLFxuICAgIFwiTU9OVEhcIjogW1xuICAgICAgXCJcXHUwNDRmXFx1MDQzZFxcdTA0MzJcXHUwNDMwXFx1MDQ0MFxcdTA0NGZcIixcbiAgICAgIFwiXFx1MDQ0NFxcdTA0MzVcXHUwNDMyXFx1MDQ0MFxcdTA0MzBcXHUwNDNiXFx1MDQ0ZlwiLFxuICAgICAgXCJcXHUwNDNjXFx1MDQzMFxcdTA0NDBcXHUwNDQyXFx1MDQzMFwiLFxuICAgICAgXCJcXHUwNDMwXFx1MDQzZlxcdTA0NDBcXHUwNDM1XFx1MDQzYlxcdTA0NGZcIixcbiAgICAgIFwiXFx1MDQzY1xcdTA0MzBcXHUwNDRmXCIsXG4gICAgICBcIlxcdTA0MzhcXHUwNDRlXFx1MDQzZFxcdTA0NGZcIixcbiAgICAgIFwiXFx1MDQzOFxcdTA0NGVcXHUwNDNiXFx1MDQ0ZlwiLFxuICAgICAgXCJcXHUwNDMwXFx1MDQzMlxcdTA0MzNcXHUwNDQzXFx1MDQ0MVxcdTA0NDJcXHUwNDMwXCIsXG4gICAgICBcIlxcdTA0NDFcXHUwNDM1XFx1MDQzZFxcdTA0NDJcXHUwNDRmXFx1MDQzMVxcdTA0NDBcXHUwNDRmXCIsXG4gICAgICBcIlxcdTA0M2VcXHUwNDNhXFx1MDQ0MlxcdTA0NGZcXHUwNDMxXFx1MDQ0MFxcdTA0NGZcIixcbiAgICAgIFwiXFx1MDQzZFxcdTA0M2VcXHUwNDRmXFx1MDQzMVxcdTA0NDBcXHUwNDRmXCIsXG4gICAgICBcIlxcdTA0MzRcXHUwNDM1XFx1MDQzYVxcdTA0MzBcXHUwNDMxXFx1MDQ0MFxcdTA0NGZcIlxuICAgIF0sXG4gICAgXCJTSE9SVERBWVwiOiBbXG4gICAgICBcIlxcdTA0MzJcXHUwNDQxXCIsXG4gICAgICBcIlxcdTA0M2ZcXHUwNDNkXCIsXG4gICAgICBcIlxcdTA0MzJcXHUwNDQyXCIsXG4gICAgICBcIlxcdTA0NDFcXHUwNDQwXCIsXG4gICAgICBcIlxcdTA0NDdcXHUwNDQyXCIsXG4gICAgICBcIlxcdTA0M2ZcXHUwNDQyXCIsXG4gICAgICBcIlxcdTA0NDFcXHUwNDMxXCJcbiAgICBdLFxuICAgIFwiU0hPUlRNT05USFwiOiBbXG4gICAgICBcIlxcdTA0NGZcXHUwNDNkXFx1MDQzMi5cIixcbiAgICAgIFwiXFx1MDQ0NFxcdTA0MzVcXHUwNDMyXFx1MDQ0MC5cIixcbiAgICAgIFwiXFx1MDQzY1xcdTA0MzBcXHUwNDQwXFx1MDQ0MlxcdTA0MzBcIixcbiAgICAgIFwiXFx1MDQzMFxcdTA0M2ZcXHUwNDQwLlwiLFxuICAgICAgXCJcXHUwNDNjXFx1MDQzMFxcdTA0NGZcIixcbiAgICAgIFwiXFx1MDQzOFxcdTA0NGVcXHUwNDNkXFx1MDQ0ZlwiLFxuICAgICAgXCJcXHUwNDM4XFx1MDQ0ZVxcdTA0M2JcXHUwNDRmXCIsXG4gICAgICBcIlxcdTA0MzBcXHUwNDMyXFx1MDQzMy5cIixcbiAgICAgIFwiXFx1MDQ0MVxcdTA0MzVcXHUwNDNkXFx1MDQ0Mi5cIixcbiAgICAgIFwiXFx1MDQzZVxcdTA0M2FcXHUwNDQyLlwiLFxuICAgICAgXCJcXHUwNDNkXFx1MDQzZVxcdTA0NGZcXHUwNDMxLlwiLFxuICAgICAgXCJcXHUwNDM0XFx1MDQzNVxcdTA0M2EuXCJcbiAgICBdLFxuICAgIFwiU1RBTkRBTE9ORU1PTlRIXCI6IFtcbiAgICAgIFwiXFx1MDQ0ZlxcdTA0M2RcXHUwNDMyXFx1MDQzMFxcdTA0NDBcXHUwNDRjXCIsXG4gICAgICBcIlxcdTA0NDRcXHUwNDM1XFx1MDQzMlxcdTA0NDBcXHUwNDMwXFx1MDQzYlxcdTA0NGNcIixcbiAgICAgIFwiXFx1MDQzY1xcdTA0MzBcXHUwNDQwXFx1MDQ0MlwiLFxuICAgICAgXCJcXHUwNDMwXFx1MDQzZlxcdTA0NDBcXHUwNDM1XFx1MDQzYlxcdTA0NGNcIixcbiAgICAgIFwiXFx1MDQzY1xcdTA0MzBcXHUwNDM5XCIsXG4gICAgICBcIlxcdTA0MzhcXHUwNDRlXFx1MDQzZFxcdTA0NGNcIixcbiAgICAgIFwiXFx1MDQzOFxcdTA0NGVcXHUwNDNiXFx1MDQ0Y1wiLFxuICAgICAgXCJcXHUwNDMwXFx1MDQzMlxcdTA0MzNcXHUwNDQzXFx1MDQ0MVxcdTA0NDJcIixcbiAgICAgIFwiXFx1MDQ0MVxcdTA0MzVcXHUwNDNkXFx1MDQ0MlxcdTA0NGZcXHUwNDMxXFx1MDQ0MFxcdTA0NGNcIixcbiAgICAgIFwiXFx1MDQzZVxcdTA0M2FcXHUwNDQyXFx1MDQ0ZlxcdTA0MzFcXHUwNDQwXFx1MDQ0Y1wiLFxuICAgICAgXCJcXHUwNDNkXFx1MDQzZVxcdTA0NGZcXHUwNDMxXFx1MDQ0MFxcdTA0NGNcIixcbiAgICAgIFwiXFx1MDQzNFxcdTA0MzVcXHUwNDNhXFx1MDQzMFxcdTA0MzFcXHUwNDQwXFx1MDQ0Y1wiXG4gICAgXSxcbiAgICBcIldFRUtFTkRSQU5HRVwiOiBbXG4gICAgICA1LFxuICAgICAgNlxuICAgIF0sXG4gICAgXCJmdWxsRGF0ZVwiOiBcIkVFRUUsIGQgTU1NTSB5ICdcXHUwNDMzJy5cIixcbiAgICBcImxvbmdEYXRlXCI6IFwiZCBNTU1NIHkgJ1xcdTA0MzMnLlwiLFxuICAgIFwibWVkaXVtXCI6IFwiZCBNTU0geSAnXFx1MDQzMycuIEg6bW06c3NcIixcbiAgICBcIm1lZGl1bURhdGVcIjogXCJkIE1NTSB5ICdcXHUwNDMzJy5cIixcbiAgICBcIm1lZGl1bVRpbWVcIjogXCJIOm1tOnNzXCIsXG4gICAgXCJzaG9ydFwiOiBcImRkLk1NLnl5IEg6bW1cIixcbiAgICBcInNob3J0RGF0ZVwiOiBcImRkLk1NLnl5XCIsXG4gICAgXCJzaG9ydFRpbWVcIjogXCJIOm1tXCJcbiAgfSxcbiAgXCJOVU1CRVJfRk9STUFUU1wiOiB7XG4gICAgXCJDVVJSRU5DWV9TWU1cIjogXCJcXHUwNDQwXFx1MDQ0M1xcdTA0MzEuXCIsXG4gICAgXCJERUNJTUFMX1NFUFwiOiBcIixcIixcbiAgICBcIkdST1VQX1NFUFwiOiBcIlxcdTAwYTBcIixcbiAgICBcIlBBVFRFUk5TXCI6IFtcbiAgICAgIHtcbiAgICAgICAgXCJnU2l6ZVwiOiAzLFxuICAgICAgICBcImxnU2l6ZVwiOiAzLFxuICAgICAgICBcIm1heEZyYWNcIjogMyxcbiAgICAgICAgXCJtaW5GcmFjXCI6IDAsXG4gICAgICAgIFwibWluSW50XCI6IDEsXG4gICAgICAgIFwibmVnUHJlXCI6IFwiLVwiLFxuICAgICAgICBcIm5lZ1N1ZlwiOiBcIlwiLFxuICAgICAgICBcInBvc1ByZVwiOiBcIlwiLFxuICAgICAgICBcInBvc1N1ZlwiOiBcIlwiXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBcImdTaXplXCI6IDMsXG4gICAgICAgIFwibGdTaXplXCI6IDMsXG4gICAgICAgIFwibWF4RnJhY1wiOiAyLFxuICAgICAgICBcIm1pbkZyYWNcIjogMixcbiAgICAgICAgXCJtaW5JbnRcIjogMSxcbiAgICAgICAgXCJuZWdQcmVcIjogXCItXCIsXG4gICAgICAgIFwibmVnU3VmXCI6IFwiXFx1MDBhMFxcdTAwYTRcIixcbiAgICAgICAgXCJwb3NQcmVcIjogXCJcIixcbiAgICAgICAgXCJwb3NTdWZcIjogXCJcXHUwMGEwXFx1MDBhNFwiXG4gICAgICB9XG4gICAgXVxuICB9LFxuICBcImlkXCI6IFwicnVcIixcbiAgXCJsb2NhbGVJRFwiOiBcInJ1XCIsXG4gIFwicGx1cmFsQ2F0XCI6IGZ1bmN0aW9uKG4sIG9wdF9wcmVjaXNpb24pIHsgIHZhciBpID0gbiB8IDA7ICB2YXIgdmYgPSBnZXRWRihuLCBvcHRfcHJlY2lzaW9uKTsgIGlmICh2Zi52ID09IDAgJiYgaSAlIDEwID09IDEgJiYgaSAlIDEwMCAhPSAxMSkgeyAgICByZXR1cm4gUExVUkFMX0NBVEVHT1JZLk9ORTsgIH0gIGlmICh2Zi52ID09IDAgJiYgaSAlIDEwID49IDIgJiYgaSAlIDEwIDw9IDQgJiYgKGkgJSAxMDAgPCAxMiB8fCBpICUgMTAwID4gMTQpKSB7ICAgIHJldHVybiBQTFVSQUxfQ0FURUdPUlkuRkVXOyAgfSAgaWYgKHZmLnYgPT0gMCAmJiBpICUgMTAgPT0gMCB8fCB2Zi52ID09IDAgJiYgaSAlIDEwID49IDUgJiYgaSAlIDEwIDw9IDkgfHwgdmYudiA9PSAwICYmIGkgJSAxMDAgPj0gMTEgJiYgaSAlIDEwMCA8PSAxNCkgeyAgICByZXR1cm4gUExVUkFMX0NBVEVHT1JZLk1BTlk7ICB9ICByZXR1cm4gUExVUkFMX0NBVEVHT1JZLk9USEVSO31cbn0pO1xufV0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuYW5ndWxhci5tb2R1bGUoXCJuZ0xvY2FsZVwiLCBbXSwgW1wiJHByb3ZpZGVcIiwgZnVuY3Rpb24oJHByb3ZpZGUpIHtcbnZhciBQTFVSQUxfQ0FURUdPUlkgPSB7WkVSTzogXCJ6ZXJvXCIsIE9ORTogXCJvbmVcIiwgVFdPOiBcInR3b1wiLCBGRVc6IFwiZmV3XCIsIE1BTlk6IFwibWFueVwiLCBPVEhFUjogXCJvdGhlclwifTtcbmZ1bmN0aW9uIGdldERlY2ltYWxzKG4pIHtcbiAgbiA9IG4gKyAnJztcbiAgdmFyIGkgPSBuLmluZGV4T2YoJy4nKTtcbiAgcmV0dXJuIChpID09IC0xKSA/IDAgOiBuLmxlbmd0aCAtIGkgLSAxO1xufVxuXG5mdW5jdGlvbiBnZXRWRihuLCBvcHRfcHJlY2lzaW9uKSB7XG4gIHZhciB2ID0gb3B0X3ByZWNpc2lvbjtcblxuICBpZiAodW5kZWZpbmVkID09PSB2KSB7XG4gICAgdiA9IE1hdGgubWluKGdldERlY2ltYWxzKG4pLCAzKTtcbiAgfVxuXG4gIHZhciBiYXNlID0gTWF0aC5wb3coMTAsIHYpO1xuICB2YXIgZiA9ICgobiAqIGJhc2UpIHwgMCkgJSBiYXNlO1xuICByZXR1cm4ge3Y6IHYsIGY6IGZ9O1xufVxuXG4kcHJvdmlkZS52YWx1ZShcIiRsb2NhbGVcIiwge1xuICBcIkRBVEVUSU1FX0ZPUk1BVFNcIjoge1xuICAgIFwiQU1QTVNcIjogW1xuICAgICAgXCJcXHUwNDM0XFx1MDQzZlwiLFxuICAgICAgXCJcXHUwNDNmXFx1MDQzZlwiXG4gICAgXSxcbiAgICBcIkRBWVwiOiBbXG4gICAgICBcIlxcdTA0M2RcXHUwNDM1XFx1MDQzNFxcdTA0NTZcXHUwNDNiXFx1MDQ0ZlwiLFxuICAgICAgXCJcXHUwNDNmXFx1MDQzZVxcdTA0M2RcXHUwNDM1XFx1MDQzNFxcdTA0NTZcXHUwNDNiXFx1MDQzZVxcdTA0M2FcIixcbiAgICAgIFwiXFx1MDQzMlxcdTA0NTZcXHUwNDMyXFx1MDQ0MlxcdTA0M2VcXHUwNDQwXFx1MDQzZVxcdTA0M2FcIixcbiAgICAgIFwiXFx1MDQ0MVxcdTA0MzVcXHUwNDQwXFx1MDQzNVxcdTA0MzRcXHUwNDMwXCIsXG4gICAgICBcIlxcdTA0NDdcXHUwNDM1XFx1MDQ0MlxcdTA0MzJcXHUwNDM1XFx1MDQ0MFwiLFxuICAgICAgXCJcXHUwNDNmXFx1MDJiY1xcdTA0NGZcXHUwNDQyXFx1MDQzZFxcdTA0MzhcXHUwNDQ2XFx1MDQ0ZlwiLFxuICAgICAgXCJcXHUwNDQxXFx1MDQ0M1xcdTA0MzFcXHUwNDNlXFx1MDQ0MlxcdTA0MzBcIlxuICAgIF0sXG4gICAgXCJFUkFOQU1FU1wiOiBbXG4gICAgICBcIlxcdTA0MzRcXHUwNDNlIFxcdTA0M2RcXHUwNDMwXFx1MDQ0OFxcdTA0M2VcXHUwNDU3IFxcdTA0MzVcXHUwNDQwXFx1MDQzOFwiLFxuICAgICAgXCJcXHUwNDNkXFx1MDQzMFxcdTA0NDhcXHUwNDNlXFx1MDQ1NyBcXHUwNDM1XFx1MDQ0MFxcdTA0MzhcIlxuICAgIF0sXG4gICAgXCJFUkFTXCI6IFtcbiAgICAgIFwiXFx1MDQzNFxcdTA0M2UgXFx1MDQzZC5cXHUwNDM1LlwiLFxuICAgICAgXCJcXHUwNDNkLlxcdTA0MzUuXCJcbiAgICBdLFxuICAgIFwiRklSU1REQVlPRldFRUtcIjogMCxcbiAgICBcIk1PTlRIXCI6IFtcbiAgICAgIFwiXFx1MDQ0MVxcdTA0NTZcXHUwNDQ3XFx1MDQzZFxcdTA0NGZcIixcbiAgICAgIFwiXFx1MDQzYlxcdTA0NGVcXHUwNDQyXFx1MDQzZVxcdTA0MzNcXHUwNDNlXCIsXG4gICAgICBcIlxcdTA0MzFcXHUwNDM1XFx1MDQ0MFxcdTA0MzVcXHUwNDM3XFx1MDQzZFxcdTA0NGZcIixcbiAgICAgIFwiXFx1MDQzYVxcdTA0MzJcXHUwNDU2XFx1MDQ0MlxcdTA0M2RcXHUwNDRmXCIsXG4gICAgICBcIlxcdTA0NDJcXHUwNDQwXFx1MDQzMFxcdTA0MzJcXHUwNDNkXFx1MDQ0ZlwiLFxuICAgICAgXCJcXHUwNDQ3XFx1MDQzNVxcdTA0NDBcXHUwNDMyXFx1MDQzZFxcdTA0NGZcIixcbiAgICAgIFwiXFx1MDQzYlxcdTA0MzhcXHUwNDNmXFx1MDQzZFxcdTA0NGZcIixcbiAgICAgIFwiXFx1MDQ0MVxcdTA0MzVcXHUwNDQwXFx1MDQzZlxcdTA0M2RcXHUwNDRmXCIsXG4gICAgICBcIlxcdTA0MzJcXHUwNDM1XFx1MDQ0MFxcdTA0MzVcXHUwNDQxXFx1MDQzZFxcdTA0NGZcIixcbiAgICAgIFwiXFx1MDQzNlxcdTA0M2VcXHUwNDMyXFx1MDQ0MlxcdTA0M2RcXHUwNDRmXCIsXG4gICAgICBcIlxcdTA0M2JcXHUwNDM4XFx1MDQ0MVxcdTA0NDJcXHUwNDNlXFx1MDQzZlxcdTA0MzBcXHUwNDM0XFx1MDQzMFwiLFxuICAgICAgXCJcXHUwNDMzXFx1MDQ0MFxcdTA0NDNcXHUwNDM0XFx1MDQzZFxcdTA0NGZcIlxuICAgIF0sXG4gICAgXCJTSE9SVERBWVwiOiBbXG4gICAgICBcIlxcdTA0MWRcXHUwNDM0XCIsXG4gICAgICBcIlxcdTA0MWZcXHUwNDNkXCIsXG4gICAgICBcIlxcdTA0MTJcXHUwNDQyXCIsXG4gICAgICBcIlxcdTA0MjFcXHUwNDQwXCIsXG4gICAgICBcIlxcdTA0MjdcXHUwNDQyXCIsXG4gICAgICBcIlxcdTA0MWZcXHUwNDQyXCIsXG4gICAgICBcIlxcdTA0MjFcXHUwNDMxXCJcbiAgICBdLFxuICAgIFwiU0hPUlRNT05USFwiOiBbXG4gICAgICBcIlxcdTA0NDFcXHUwNDU2XFx1MDQ0Ny5cIixcbiAgICAgIFwiXFx1MDQzYlxcdTA0NGVcXHUwNDQyLlwiLFxuICAgICAgXCJcXHUwNDMxXFx1MDQzNVxcdTA0NDAuXCIsXG4gICAgICBcIlxcdTA0M2FcXHUwNDMyXFx1MDQ1NlxcdTA0NDIuXCIsXG4gICAgICBcIlxcdTA0NDJcXHUwNDQwXFx1MDQzMFxcdTA0MzIuXCIsXG4gICAgICBcIlxcdTA0NDdcXHUwNDM1XFx1MDQ0MFxcdTA0MzIuXCIsXG4gICAgICBcIlxcdTA0M2JcXHUwNDM4XFx1MDQzZi5cIixcbiAgICAgIFwiXFx1MDQ0MVxcdTA0MzVcXHUwNDQwXFx1MDQzZi5cIixcbiAgICAgIFwiXFx1MDQzMlxcdTA0MzVcXHUwNDQwLlwiLFxuICAgICAgXCJcXHUwNDM2XFx1MDQzZVxcdTA0MzJcXHUwNDQyLlwiLFxuICAgICAgXCJcXHUwNDNiXFx1MDQzOFxcdTA0NDFcXHUwNDQyLlwiLFxuICAgICAgXCJcXHUwNDMzXFx1MDQ0MFxcdTA0NDNcXHUwNDM0LlwiXG4gICAgXSxcbiAgICBcIlNUQU5EQUxPTkVNT05USFwiOiBbXG4gICAgICBcIlxcdTA0MjFcXHUwNDU2XFx1MDQ0N1xcdTA0MzVcXHUwNDNkXFx1MDQ0Y1wiLFxuICAgICAgXCJcXHUwNDFiXFx1MDQ0ZVxcdTA0NDJcXHUwNDM4XFx1MDQzOVwiLFxuICAgICAgXCJcXHUwNDExXFx1MDQzNVxcdTA0NDBcXHUwNDM1XFx1MDQzN1xcdTA0MzVcXHUwNDNkXFx1MDQ0Y1wiLFxuICAgICAgXCJcXHUwNDFhXFx1MDQzMlxcdTA0NTZcXHUwNDQyXFx1MDQzNVxcdTA0M2RcXHUwNDRjXCIsXG4gICAgICBcIlxcdTA0MjJcXHUwNDQwXFx1MDQzMFxcdTA0MzJcXHUwNDM1XFx1MDQzZFxcdTA0NGNcIixcbiAgICAgIFwiXFx1MDQyN1xcdTA0MzVcXHUwNDQwXFx1MDQzMlxcdTA0MzVcXHUwNDNkXFx1MDQ0Y1wiLFxuICAgICAgXCJcXHUwNDFiXFx1MDQzOFxcdTA0M2ZcXHUwNDM1XFx1MDQzZFxcdTA0NGNcIixcbiAgICAgIFwiXFx1MDQyMVxcdTA0MzVcXHUwNDQwXFx1MDQzZlxcdTA0MzVcXHUwNDNkXFx1MDQ0Y1wiLFxuICAgICAgXCJcXHUwNDEyXFx1MDQzNVxcdTA0NDBcXHUwNDM1XFx1MDQ0MVxcdTA0MzVcXHUwNDNkXFx1MDQ0Y1wiLFxuICAgICAgXCJcXHUwNDE2XFx1MDQzZVxcdTA0MzJcXHUwNDQyXFx1MDQzNVxcdTA0M2RcXHUwNDRjXCIsXG4gICAgICBcIlxcdTA0MWJcXHUwNDM4XFx1MDQ0MVxcdTA0NDJcXHUwNDNlXFx1MDQzZlxcdTA0MzBcXHUwNDM0XCIsXG4gICAgICBcIlxcdTA0MTNcXHUwNDQwXFx1MDQ0M1xcdTA0MzRcXHUwNDM1XFx1MDQzZFxcdTA0NGNcIlxuICAgIF0sXG4gICAgXCJXRUVLRU5EUkFOR0VcIjogW1xuICAgICAgNSxcbiAgICAgIDZcbiAgICBdLFxuICAgIFwiZnVsbERhdGVcIjogXCJFRUVFLCBkIE1NTU0geSAnXFx1MDQ0MCcuXCIsXG4gICAgXCJsb25nRGF0ZVwiOiBcImQgTU1NTSB5ICdcXHUwNDQwJy5cIixcbiAgICBcIm1lZGl1bVwiOiBcImQgTU1NIHkgJ1xcdTA0NDAnLiBISDptbTpzc1wiLFxuICAgIFwibWVkaXVtRGF0ZVwiOiBcImQgTU1NIHkgJ1xcdTA0NDAnLlwiLFxuICAgIFwibWVkaXVtVGltZVwiOiBcIkhIOm1tOnNzXCIsXG4gICAgXCJzaG9ydFwiOiBcImRkLk1NLnl5IEhIOm1tXCIsXG4gICAgXCJzaG9ydERhdGVcIjogXCJkZC5NTS55eVwiLFxuICAgIFwic2hvcnRUaW1lXCI6IFwiSEg6bW1cIlxuICB9LFxuICBcIk5VTUJFUl9GT1JNQVRTXCI6IHtcbiAgICBcIkNVUlJFTkNZX1NZTVwiOiBcIlxcdTIwYjRcIixcbiAgICBcIkRFQ0lNQUxfU0VQXCI6IFwiLFwiLFxuICAgIFwiR1JPVVBfU0VQXCI6IFwiXFx1MDBhMFwiLFxuICAgIFwiUEFUVEVSTlNcIjogW1xuICAgICAge1xuICAgICAgICBcImdTaXplXCI6IDMsXG4gICAgICAgIFwibGdTaXplXCI6IDMsXG4gICAgICAgIFwibWF4RnJhY1wiOiAzLFxuICAgICAgICBcIm1pbkZyYWNcIjogMCxcbiAgICAgICAgXCJtaW5JbnRcIjogMSxcbiAgICAgICAgXCJuZWdQcmVcIjogXCItXCIsXG4gICAgICAgIFwibmVnU3VmXCI6IFwiXCIsXG4gICAgICAgIFwicG9zUHJlXCI6IFwiXCIsXG4gICAgICAgIFwicG9zU3VmXCI6IFwiXCJcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIFwiZ1NpemVcIjogMyxcbiAgICAgICAgXCJsZ1NpemVcIjogMyxcbiAgICAgICAgXCJtYXhGcmFjXCI6IDIsXG4gICAgICAgIFwibWluRnJhY1wiOiAyLFxuICAgICAgICBcIm1pbkludFwiOiAxLFxuICAgICAgICBcIm5lZ1ByZVwiOiBcIi1cIixcbiAgICAgICAgXCJuZWdTdWZcIjogXCJcXHUwMGEwXFx1MDBhNFwiLFxuICAgICAgICBcInBvc1ByZVwiOiBcIlwiLFxuICAgICAgICBcInBvc1N1ZlwiOiBcIlxcdTAwYTBcXHUwMGE0XCJcbiAgICAgIH1cbiAgICBdXG4gIH0sXG4gIFwiaWRcIjogXCJ1ay11YVwiLFxuICBcImxvY2FsZUlEXCI6IFwidWtfVUFcIixcbiAgXCJwbHVyYWxDYXRcIjogZnVuY3Rpb24obiwgb3B0X3ByZWNpc2lvbikgeyAgdmFyIGkgPSBuIHwgMDsgIHZhciB2ZiA9IGdldFZGKG4sIG9wdF9wcmVjaXNpb24pOyAgaWYgKHZmLnYgPT0gMCAmJiBpICUgMTAgPT0gMSAmJiBpICUgMTAwICE9IDExKSB7ICAgIHJldHVybiBQTFVSQUxfQ0FURUdPUlkuT05FOyAgfSAgaWYgKHZmLnYgPT0gMCAmJiBpICUgMTAgPj0gMiAmJiBpICUgMTAgPD0gNCAmJiAoaSAlIDEwMCA8IDEyIHx8IGkgJSAxMDAgPiAxNCkpIHsgICAgcmV0dXJuIFBMVVJBTF9DQVRFR09SWS5GRVc7ICB9ICBpZiAodmYudiA9PSAwICYmIGkgJSAxMCA9PSAwIHx8IHZmLnYgPT0gMCAmJiBpICUgMTAgPj0gNSAmJiBpICUgMTAgPD0gOSB8fCB2Zi52ID09IDAgJiYgaSAlIDEwMCA+PSAxMSAmJiBpICUgMTAwIDw9IDE0KSB7ICAgIHJldHVybiBQTFVSQUxfQ0FURUdPUlkuTUFOWTsgIH0gIHJldHVybiBQTFVSQUxfQ0FURUdPUlkuT1RIRVI7fVxufSk7XG59XSk7XG4iLCIndXNlIHN0cmljdCc7XG5hbmd1bGFyLm1vZHVsZShcIm5nTG9jYWxlXCIsIFtdLCBbXCIkcHJvdmlkZVwiLCBmdW5jdGlvbigkcHJvdmlkZSkge1xudmFyIFBMVVJBTF9DQVRFR09SWSA9IHtaRVJPOiBcInplcm9cIiwgT05FOiBcIm9uZVwiLCBUV086IFwidHdvXCIsIEZFVzogXCJmZXdcIiwgTUFOWTogXCJtYW55XCIsIE9USEVSOiBcIm90aGVyXCJ9O1xuZnVuY3Rpb24gZ2V0RGVjaW1hbHMobikge1xuICBuID0gbiArICcnO1xuICB2YXIgaSA9IG4uaW5kZXhPZignLicpO1xuICByZXR1cm4gKGkgPT0gLTEpID8gMCA6IG4ubGVuZ3RoIC0gaSAtIDE7XG59XG5cbmZ1bmN0aW9uIGdldFZGKG4sIG9wdF9wcmVjaXNpb24pIHtcbiAgdmFyIHYgPSBvcHRfcHJlY2lzaW9uO1xuXG4gIGlmICh1bmRlZmluZWQgPT09IHYpIHtcbiAgICB2ID0gTWF0aC5taW4oZ2V0RGVjaW1hbHMobiksIDMpO1xuICB9XG5cbiAgdmFyIGJhc2UgPSBNYXRoLnBvdygxMCwgdik7XG4gIHZhciBmID0gKChuICogYmFzZSkgfCAwKSAlIGJhc2U7XG4gIHJldHVybiB7djogdiwgZjogZn07XG59XG5cbiRwcm92aWRlLnZhbHVlKFwiJGxvY2FsZVwiLCB7XG4gIFwiREFURVRJTUVfRk9STUFUU1wiOiB7XG4gICAgXCJBTVBNU1wiOiBbXG4gICAgICBcIlxcdTA0MzRcXHUwNDNmXCIsXG4gICAgICBcIlxcdTA0M2ZcXHUwNDNmXCJcbiAgICBdLFxuICAgIFwiREFZXCI6IFtcbiAgICAgIFwiXFx1MDQzZFxcdTA0MzVcXHUwNDM0XFx1MDQ1NlxcdTA0M2JcXHUwNDRmXCIsXG4gICAgICBcIlxcdTA0M2ZcXHUwNDNlXFx1MDQzZFxcdTA0MzVcXHUwNDM0XFx1MDQ1NlxcdTA0M2JcXHUwNDNlXFx1MDQzYVwiLFxuICAgICAgXCJcXHUwNDMyXFx1MDQ1NlxcdTA0MzJcXHUwNDQyXFx1MDQzZVxcdTA0NDBcXHUwNDNlXFx1MDQzYVwiLFxuICAgICAgXCJcXHUwNDQxXFx1MDQzNVxcdTA0NDBcXHUwNDM1XFx1MDQzNFxcdTA0MzBcIixcbiAgICAgIFwiXFx1MDQ0N1xcdTA0MzVcXHUwNDQyXFx1MDQzMlxcdTA0MzVcXHUwNDQwXCIsXG4gICAgICBcIlxcdTA0M2ZcXHUwMmJjXFx1MDQ0ZlxcdTA0NDJcXHUwNDNkXFx1MDQzOFxcdTA0NDZcXHUwNDRmXCIsXG4gICAgICBcIlxcdTA0NDFcXHUwNDQzXFx1MDQzMVxcdTA0M2VcXHUwNDQyXFx1MDQzMFwiXG4gICAgXSxcbiAgICBcIkVSQU5BTUVTXCI6IFtcbiAgICAgIFwiXFx1MDQzNFxcdTA0M2UgXFx1MDQzZFxcdTA0MzBcXHUwNDQ4XFx1MDQzZVxcdTA0NTcgXFx1MDQzNVxcdTA0NDBcXHUwNDM4XCIsXG4gICAgICBcIlxcdTA0M2RcXHUwNDMwXFx1MDQ0OFxcdTA0M2VcXHUwNDU3IFxcdTA0MzVcXHUwNDQwXFx1MDQzOFwiXG4gICAgXSxcbiAgICBcIkVSQVNcIjogW1xuICAgICAgXCJcXHUwNDM0XFx1MDQzZSBcXHUwNDNkLlxcdTA0MzUuXCIsXG4gICAgICBcIlxcdTA0M2QuXFx1MDQzNS5cIlxuICAgIF0sXG4gICAgXCJGSVJTVERBWU9GV0VFS1wiOiAwLFxuICAgIFwiTU9OVEhcIjogW1xuICAgICAgXCJcXHUwNDQxXFx1MDQ1NlxcdTA0NDdcXHUwNDNkXFx1MDQ0ZlwiLFxuICAgICAgXCJcXHUwNDNiXFx1MDQ0ZVxcdTA0NDJcXHUwNDNlXFx1MDQzM1xcdTA0M2VcIixcbiAgICAgIFwiXFx1MDQzMVxcdTA0MzVcXHUwNDQwXFx1MDQzNVxcdTA0MzdcXHUwNDNkXFx1MDQ0ZlwiLFxuICAgICAgXCJcXHUwNDNhXFx1MDQzMlxcdTA0NTZcXHUwNDQyXFx1MDQzZFxcdTA0NGZcIixcbiAgICAgIFwiXFx1MDQ0MlxcdTA0NDBcXHUwNDMwXFx1MDQzMlxcdTA0M2RcXHUwNDRmXCIsXG4gICAgICBcIlxcdTA0NDdcXHUwNDM1XFx1MDQ0MFxcdTA0MzJcXHUwNDNkXFx1MDQ0ZlwiLFxuICAgICAgXCJcXHUwNDNiXFx1MDQzOFxcdTA0M2ZcXHUwNDNkXFx1MDQ0ZlwiLFxuICAgICAgXCJcXHUwNDQxXFx1MDQzNVxcdTA0NDBcXHUwNDNmXFx1MDQzZFxcdTA0NGZcIixcbiAgICAgIFwiXFx1MDQzMlxcdTA0MzVcXHUwNDQwXFx1MDQzNVxcdTA0NDFcXHUwNDNkXFx1MDQ0ZlwiLFxuICAgICAgXCJcXHUwNDM2XFx1MDQzZVxcdTA0MzJcXHUwNDQyXFx1MDQzZFxcdTA0NGZcIixcbiAgICAgIFwiXFx1MDQzYlxcdTA0MzhcXHUwNDQxXFx1MDQ0MlxcdTA0M2VcXHUwNDNmXFx1MDQzMFxcdTA0MzRcXHUwNDMwXCIsXG4gICAgICBcIlxcdTA0MzNcXHUwNDQwXFx1MDQ0M1xcdTA0MzRcXHUwNDNkXFx1MDQ0ZlwiXG4gICAgXSxcbiAgICBcIlNIT1JUREFZXCI6IFtcbiAgICAgIFwiXFx1MDQxZFxcdTA0MzRcIixcbiAgICAgIFwiXFx1MDQxZlxcdTA0M2RcIixcbiAgICAgIFwiXFx1MDQxMlxcdTA0NDJcIixcbiAgICAgIFwiXFx1MDQyMVxcdTA0NDBcIixcbiAgICAgIFwiXFx1MDQyN1xcdTA0NDJcIixcbiAgICAgIFwiXFx1MDQxZlxcdTA0NDJcIixcbiAgICAgIFwiXFx1MDQyMVxcdTA0MzFcIlxuICAgIF0sXG4gICAgXCJTSE9SVE1PTlRIXCI6IFtcbiAgICAgIFwiXFx1MDQ0MVxcdTA0NTZcXHUwNDQ3LlwiLFxuICAgICAgXCJcXHUwNDNiXFx1MDQ0ZVxcdTA0NDIuXCIsXG4gICAgICBcIlxcdTA0MzFcXHUwNDM1XFx1MDQ0MC5cIixcbiAgICAgIFwiXFx1MDQzYVxcdTA0MzJcXHUwNDU2XFx1MDQ0Mi5cIixcbiAgICAgIFwiXFx1MDQ0MlxcdTA0NDBcXHUwNDMwXFx1MDQzMi5cIixcbiAgICAgIFwiXFx1MDQ0N1xcdTA0MzVcXHUwNDQwXFx1MDQzMi5cIixcbiAgICAgIFwiXFx1MDQzYlxcdTA0MzhcXHUwNDNmLlwiLFxuICAgICAgXCJcXHUwNDQxXFx1MDQzNVxcdTA0NDBcXHUwNDNmLlwiLFxuICAgICAgXCJcXHUwNDMyXFx1MDQzNVxcdTA0NDAuXCIsXG4gICAgICBcIlxcdTA0MzZcXHUwNDNlXFx1MDQzMlxcdTA0NDIuXCIsXG4gICAgICBcIlxcdTA0M2JcXHUwNDM4XFx1MDQ0MVxcdTA0NDIuXCIsXG4gICAgICBcIlxcdTA0MzNcXHUwNDQwXFx1MDQ0M1xcdTA0MzQuXCJcbiAgICBdLFxuICAgIFwiU1RBTkRBTE9ORU1PTlRIXCI6IFtcbiAgICAgIFwiXFx1MDQyMVxcdTA0NTZcXHUwNDQ3XFx1MDQzNVxcdTA0M2RcXHUwNDRjXCIsXG4gICAgICBcIlxcdTA0MWJcXHUwNDRlXFx1MDQ0MlxcdTA0MzhcXHUwNDM5XCIsXG4gICAgICBcIlxcdTA0MTFcXHUwNDM1XFx1MDQ0MFxcdTA0MzVcXHUwNDM3XFx1MDQzNVxcdTA0M2RcXHUwNDRjXCIsXG4gICAgICBcIlxcdTA0MWFcXHUwNDMyXFx1MDQ1NlxcdTA0NDJcXHUwNDM1XFx1MDQzZFxcdTA0NGNcIixcbiAgICAgIFwiXFx1MDQyMlxcdTA0NDBcXHUwNDMwXFx1MDQzMlxcdTA0MzVcXHUwNDNkXFx1MDQ0Y1wiLFxuICAgICAgXCJcXHUwNDI3XFx1MDQzNVxcdTA0NDBcXHUwNDMyXFx1MDQzNVxcdTA0M2RcXHUwNDRjXCIsXG4gICAgICBcIlxcdTA0MWJcXHUwNDM4XFx1MDQzZlxcdTA0MzVcXHUwNDNkXFx1MDQ0Y1wiLFxuICAgICAgXCJcXHUwNDIxXFx1MDQzNVxcdTA0NDBcXHUwNDNmXFx1MDQzNVxcdTA0M2RcXHUwNDRjXCIsXG4gICAgICBcIlxcdTA0MTJcXHUwNDM1XFx1MDQ0MFxcdTA0MzVcXHUwNDQxXFx1MDQzNVxcdTA0M2RcXHUwNDRjXCIsXG4gICAgICBcIlxcdTA0MTZcXHUwNDNlXFx1MDQzMlxcdTA0NDJcXHUwNDM1XFx1MDQzZFxcdTA0NGNcIixcbiAgICAgIFwiXFx1MDQxYlxcdTA0MzhcXHUwNDQxXFx1MDQ0MlxcdTA0M2VcXHUwNDNmXFx1MDQzMFxcdTA0MzRcIixcbiAgICAgIFwiXFx1MDQxM1xcdTA0NDBcXHUwNDQzXFx1MDQzNFxcdTA0MzVcXHUwNDNkXFx1MDQ0Y1wiXG4gICAgXSxcbiAgICBcIldFRUtFTkRSQU5HRVwiOiBbXG4gICAgICA1LFxuICAgICAgNlxuICAgIF0sXG4gICAgXCJmdWxsRGF0ZVwiOiBcIkVFRUUsIGQgTU1NTSB5ICdcXHUwNDQwJy5cIixcbiAgICBcImxvbmdEYXRlXCI6IFwiZCBNTU1NIHkgJ1xcdTA0NDAnLlwiLFxuICAgIFwibWVkaXVtXCI6IFwiZCBNTU0geSAnXFx1MDQ0MCcuIEhIOm1tOnNzXCIsXG4gICAgXCJtZWRpdW1EYXRlXCI6IFwiZCBNTU0geSAnXFx1MDQ0MCcuXCIsXG4gICAgXCJtZWRpdW1UaW1lXCI6IFwiSEg6bW06c3NcIixcbiAgICBcInNob3J0XCI6IFwiZGQuTU0ueXkgSEg6bW1cIixcbiAgICBcInNob3J0RGF0ZVwiOiBcImRkLk1NLnl5XCIsXG4gICAgXCJzaG9ydFRpbWVcIjogXCJISDptbVwiXG4gIH0sXG4gIFwiTlVNQkVSX0ZPUk1BVFNcIjoge1xuICAgIFwiQ1VSUkVOQ1lfU1lNXCI6IFwiXFx1MjBiNFwiLFxuICAgIFwiREVDSU1BTF9TRVBcIjogXCIsXCIsXG4gICAgXCJHUk9VUF9TRVBcIjogXCJcXHUwMGEwXCIsXG4gICAgXCJQQVRURVJOU1wiOiBbXG4gICAgICB7XG4gICAgICAgIFwiZ1NpemVcIjogMyxcbiAgICAgICAgXCJsZ1NpemVcIjogMyxcbiAgICAgICAgXCJtYXhGcmFjXCI6IDMsXG4gICAgICAgIFwibWluRnJhY1wiOiAwLFxuICAgICAgICBcIm1pbkludFwiOiAxLFxuICAgICAgICBcIm5lZ1ByZVwiOiBcIi1cIixcbiAgICAgICAgXCJuZWdTdWZcIjogXCJcIixcbiAgICAgICAgXCJwb3NQcmVcIjogXCJcIixcbiAgICAgICAgXCJwb3NTdWZcIjogXCJcIlxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgXCJnU2l6ZVwiOiAzLFxuICAgICAgICBcImxnU2l6ZVwiOiAzLFxuICAgICAgICBcIm1heEZyYWNcIjogMixcbiAgICAgICAgXCJtaW5GcmFjXCI6IDIsXG4gICAgICAgIFwibWluSW50XCI6IDEsXG4gICAgICAgIFwibmVnUHJlXCI6IFwiLVwiLFxuICAgICAgICBcIm5lZ1N1ZlwiOiBcIlxcdTAwYTBcXHUwMGE0XCIsXG4gICAgICAgIFwicG9zUHJlXCI6IFwiXCIsXG4gICAgICAgIFwicG9zU3VmXCI6IFwiXFx1MDBhMFxcdTAwYTRcIlxuICAgICAgfVxuICAgIF1cbiAgfSxcbiAgXCJpZFwiOiBcInVrXCIsXG4gIFwibG9jYWxlSURcIjogXCJ1a1wiLFxuICBcInBsdXJhbENhdFwiOiBmdW5jdGlvbihuLCBvcHRfcHJlY2lzaW9uKSB7ICB2YXIgaSA9IG4gfCAwOyAgdmFyIHZmID0gZ2V0VkYobiwgb3B0X3ByZWNpc2lvbik7ICBpZiAodmYudiA9PSAwICYmIGkgJSAxMCA9PSAxICYmIGkgJSAxMDAgIT0gMTEpIHsgICAgcmV0dXJuIFBMVVJBTF9DQVRFR09SWS5PTkU7ICB9ICBpZiAodmYudiA9PSAwICYmIGkgJSAxMCA+PSAyICYmIGkgJSAxMCA8PSA0ICYmIChpICUgMTAwIDwgMTIgfHwgaSAlIDEwMCA+IDE0KSkgeyAgICByZXR1cm4gUExVUkFMX0NBVEVHT1JZLkZFVzsgIH0gIGlmICh2Zi52ID09IDAgJiYgaSAlIDEwID09IDAgfHwgdmYudiA9PSAwICYmIGkgJSAxMCA+PSA1ICYmIGkgJSAxMCA8PSA5IHx8IHZmLnYgPT0gMCAmJiBpICUgMTAwID49IDExICYmIGkgJSAxMDAgPD0gMTQpIHsgICAgcmV0dXJuIFBMVVJBTF9DQVRFR09SWS5NQU5ZOyAgfSAgcmV0dXJuIFBMVVJBTF9DQVRFR09SWS5PVEhFUjt9XG59KTtcbn1dKTtcbiIsIihmdW5jdGlvbigpe1xuXG5cdCd1c2Ugc3RyaWN0JztcblxuXHRhbmd1bGFyXG5cdFx0Lm1vZHVsZSgnYXBwLmxheW91dCcpXG5cdFx0LmNvbnRyb2xsZXIoJ1RvcGJhckNvbnRyb2xsZXInLCBUb3BiYXJDb250cm9sbGVyKTtcblxuXHRUb3BiYXJDb250cm9sbGVyLiRpbmplY3QgPSBbJyRyb290U2NvcGUnLCAnJHNjb3BlJywgJyRsb2NhbFN0b3JhZ2UnLCAnJHRyYW5zbGF0ZSddO1xuXG5cdGZ1bmN0aW9uIFRvcGJhckNvbnRyb2xsZXIoJHJvb3RTY29wZSwgJHNjb3BlLCAkbG9jYWxTdG9yYWdlLCAkdHJhbnNsYXRlKSB7XG5cblx0XHR2YXIgdm0gPSB0aGlzO1xuXHRcdHZtLmxhbmcgPSAkbG9jYWxTdG9yYWdlLk5HX1RSQU5TTEFURV9MQU5HX0tFWSB8fCAkdHJhbnNsYXRlLnVzZSgpO1xuXG5cdFx0JHJvb3RTY29wZS4kb24oJ2xhbmcuY2hhbmdlJywgZnVuY3Rpb24oZSwgZGF0YSl7XG5cdFx0XHRpZihkYXRhLmxhbmcpIHZtLmxhbmcgPSBkYXRhLmxhbmc7XG5cdFx0fSk7XG5cdFx0XG5cblx0fVxuXG59KSgpOyIsIihmdW5jdGlvbigpe1xuXG5cdCd1c2Ugc3RyaWN0JztcblxuXHRhbmd1bGFyXG5cdFx0Lm1vZHVsZSgnYXBwLmxheW91dCcpXG5cdFx0LmRpcmVjdGl2ZSgndG9wQmFyJywgdG9wQmFyKTtcblxuXHRmdW5jdGlvbiB0b3BCYXIoKXtcblxuXHRcdHJldHVybiB7XG5cdFx0XHRyZXN0cmljdDogJ0FFJyxcblx0XHRcdHRyYW5zY2x1ZGU6IHRydWUsXG5cdFx0XHRjb250cm9sbGVyOiAnVG9wYmFyQ29udHJvbGxlcicsXG5cdFx0XHRjb250cm9sbGVyQXM6ICd0b3BiYXJWbScsXG5cdFx0XHR0ZW1wbGF0ZVVybDogJ2xheW91dC90b3BiYXIvdG9wYmFyLmh0bWwnLFxuXHRcdH07XG5cblx0fVxuXG59KSgpOyIsIihmdW5jdGlvbigpe1xuXG5cdCd1c2Ugc3RyaWN0JztcblxuXHRhbmd1bGFyXG5cdFx0Lm1vZHVsZSgnYXBwLmxheW91dCcpXG5cdFx0LmRpcmVjdGl2ZSgnc2lkZU1lbnUnLCBzaWRlTWVudSk7XG5cblx0ZnVuY3Rpb24gc2lkZU1lbnUoKXtcblxuXHRcdHJldHVybiB7XG5cdFx0XHRyZXN0cmljdDogJ0FFJyxcblx0XHRcdHRyYW5zY2x1ZGU6IHRydWUsXG5cdFx0XHRjb250cm9sbGVyOiAnU2lkZW1lbnVDb250cm9sbGVyJyxcblx0XHRcdGNvbnRyb2xsZXJBczogJ3NpZGVtZW51Vm0nLFxuXHRcdFx0dGVtcGxhdGVVcmw6ICdsYXlvdXQvc2lkZW1lbnUvc2lkZW1lbnUuaHRtbCdcblx0XHR9O1xuXG5cdH1cblxufSkoKTsiLCIoZnVuY3Rpb24oKXtcblxuXHQndXNlIHN0cmljdCc7XG5cblx0YW5ndWxhclxuXHRcdC5tb2R1bGUoJ2FwcC5sYXlvdXQnKVxuXHRcdC5jb250cm9sbGVyKCdTaWRlbWVudUNvbnRyb2xsZXInLCBTaWRlbWVudUNvbnRyb2xsZXIpO1xuXG5cdFNpZGVtZW51Q29udHJvbGxlci4kaW5qZWN0ID0gWyckcm9vdFNjb3BlJywgJyRsb2NhdGlvbicsICckdHJhbnNsYXRlJywgJ2F1dGhTZXJ2aWNlJywgJ2Vycm9yU2VydmljZScsICd1dGlsc1NlcnZpY2UnLCAnYXBpU2VydmljZScsICdjdXN0b21lclNlcnZpY2UnXTtcblxuXHRmdW5jdGlvbiBTaWRlbWVudUNvbnRyb2xsZXIoJHJvb3RTY29wZSwgJGxvY2F0aW9uLCAkdHJhbnNsYXRlLCBhdXRoU2VydmljZSwgZXJyb3JTZXJ2aWNlLCB1dGlsc1NlcnZpY2UsIGFwaVNlcnZpY2UsIGN1c3RvbWVyU2VydmljZSkge1xuXG5cdFx0dmFyIHZtID0gdGhpcztcblx0XHR2bS5jdXN0b21lciA9IHt9O1xuXHRcdHZtLmN1c3RvbWVyQmFsYW5jZSA9IG51bGw7XG5cdFx0dm0ubG9nb3V0ID0gbG9nb3V0O1xuXHRcdFxuXHRcdGNvbnNvbGUubG9nKCdTaWRlbWVudUNvbnRyb2xsZXI6ICcsIHZtLmN1c3RvbWVyQmFsYW5jZSk7XG5cblx0XHQkcm9vdFNjb3BlLiRvbignY3VzdG9tZXIudXBkYXRlJywgZnVuY3Rpb24oZXZlbnQsIGN1c3RvbWVyKSB7XG5cdFx0XHR2bS5jdXN0b21lciA9IGN1c3RvbWVyO1xuXHRcdH0pO1xuXG5cdFx0JHJvb3RTY29wZS4kb24oJ2F1dGgubG9naW4nLCBmdW5jdGlvbigpIHtcblx0XHRcdGdldEN1c3RvbWVyQmFsYW5jZSgpO1xuXHRcdH0pO1xuXG5cdFx0ZnVuY3Rpb24gc3RyaW5nVG9GaXhlZChzdHJpbmcpIHtcblx0XHRcdHJldHVybiB1dGlsc1NlcnZpY2Uuc3RyaW5nVG9GaXhlZChzdHJpbmcsIDIpO1xuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIGdldEN1c3RvbWVyQmFsYW5jZSgpIHtcblx0XHRcdGFwaVNlcnZpY2UucmVxdWVzdCh7XG5cdFx0XHRcdHVybDogXCJnZXRDdXN0b21lckJhbGFuY2VcIlxuXHRcdFx0fSkudGhlbihmdW5jdGlvbihyZXMpe1xuXHRcdFx0XHRpZighcmVzLmRhdGEuc3VjY2VzcykgcmV0dXJuIGVycm9yU2VydmljZS5zaG93KHJlcy5kYXRhLm1lc3NhZ2UpO1xuXHRcdFx0XHRcblx0XHRcdFx0dm0uY3VzdG9tZXIuYmFsYW5jZSA9IHJlcy5kYXRhLnJlc3VsdDtcblx0XHRcdFx0dm0uY3VzdG9tZXJCYWxhbmNlID0gc3RyaW5nVG9GaXhlZChyZXMuZGF0YS5yZXN1bHQpO1xuXHRcdFx0XHRjdXN0b21lclNlcnZpY2Uuc2V0Q3VzdG9tZXJCYWxhbmNlKHJlcy5kYXRhLnJlc3VsdCk7XG5cdFx0XHR9LCBmdW5jdGlvbihlcnIpe1xuXHRcdFx0XHRlcnJvclNlcnZpY2Uuc2hvdyhlcnIpO1xuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gbG9nb3V0KCkge1xuXHRcdFx0YXV0aFNlcnZpY2UubG9nb3V0KCk7XG5cdFx0fVxuXG5cdH1cblxufSkoKTsiXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=
