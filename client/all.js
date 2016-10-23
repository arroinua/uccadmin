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
			}).then(function(response){
				console.log('Transactions: ', response.data);
				vm.transactions = response.data.result;

				return api.request({
					url: "charges",
					params: {
						start: Date.parse(vm.startDate),
						end: Date.parse(vm.endDate)
					}
				});
			}).then(function(response) {
				console.log('Charges: ', response.data);
				vm.charges = response.data.result;
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
			}).then(function(response){
				vm.customer.balance = response.data.result;
				vm.currentBalance = stringToFixed(response.data.result);
				customerService.setCustomerBalance(response.data.result);
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

		// function getCharges() {
		// 	api.request({
		// 		url: "charges",
		// 		params: {
		// 			start: Date.parse(vm.startDate),
		// 			end: Date.parse(vm.endDate)
		// 		}
		// 	}).then(function(response){
		// 		console.log('Charges: ', response.data);
		// 		vm.charges = response.data.result;
		// 	}, function(err){
		// 		errorService.show(err);
		// 	});
		// }

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
				maxlines: 8
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

			totalStorage();
			totalAmount();
		});
		
		$scope.$watch(function() {
			return vm.addOns.lines.quantity;
		}, function(val) {
			// vm.instance._subscription.addOns.lines.quantity = parseInt(val, 10);
			totalLines();
			totalAmount();
		});

		$scope.$watch(function() {
			return vm.addOns.storage.quantity;
		}, function(val) {
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
					} else {
						// vm.trial = false;
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
				vm.sids = res.data.result;
				branchesService.setServers(vm.sids);

				if(oid === 'new') vm.instance.sid = vm.sids[0]._id;
				spinner.hide('servers-spinner');
			}, function(err){
				errorService.show(err.data.message);
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
					console.log('canCreateTrialSub: ', res.data);
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
			console.log('proceed: ', branchSetts);
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
			} else if(action === 'updateSubscription') {
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
					// cart[(vm.customer.role === 'user' ? 'set' : 'add')].add({
					cart[(vm.customer.role === 'user' ? 'set' : 'add')]({
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

				proceed('updateSubscription');
				return;

			}

			api.request({
				url: 'updateSubscription',
				params: branchSetts
			}).then(function(result){
				console.log('updateSubscription result; ', result);
				console.log('updateSubscription branchSetts; ', branchSetts);
				branchesService.update(branchSetts.oid, branchSetts);
				notifyService.show('ALL_CHANGES_SAVED');
			}, function(err){
				console.log(err);
				if(err.data.message === 'ERRORS.NOT_ENOUGH_CREDITS') {
					
					proceed('updateSubscription');

				} else {
					errorService.show(err);
				}
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
			vm.instance.result.maxlines = vm.totalLines;
			vm.instance.result.adminname = vm.instance.result.prefix;
			vm.instance.result.storelimit = convertBytesFilter(vm.totalStorage, 'GB', 'Byte');
			if(oid) vm.instance.oid = oid;

			angular.forEach(vm.addOns, function(value, key){
				addOns.push(value);
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
			}).then(function(response){
				notifyService.show('ALL_CHANGES_SAVED');
				customerService.setCustomer(response.data.result);
				console.log('currentUser: ', response.data.result);
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
			getAll: getAll,
			clear: clear
		};

		function newItem(params) {
			return {
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

		function set(params) {
			items.splice(0, items.length);
			items.push(newItem(params));
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
			items = [];
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
					console.log(res.data.result);
					$rootScope.$emit('lang.change', { lang: langKey });
					$scope.layoutVm.triggerLangMenu();
				}, function (err){
					console.log(err);
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
			}).then(function(response){
				vm.customer.balance = response.data.result;
				vm.customerBalance = stringToFixed(response.data.result);
				customerService.setCustomerBalance(response.data.result);
			}, function(err){
				errorService.show = err;
			});
		}

		function logout() {
			authService.logout();
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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC5qcyIsImFwcC5hdXRoLmpzIiwiYXBwLmJpbGxpbmcuanMiLCJhcHAuY29uZmlnLmpzIiwiYXBwLmNvcmUuanMiLCJhcHAuZGFzaGJvYXJkLmpzIiwiYXBwLmluc3RhbmNlLmpzIiwiYXBwLmxheW91dC5qcyIsImFwcC5wYXltZW50LmpzIiwiYXBwLnByb2ZpbGUuanMiLCJhcHAucm91dGVzLmpzIiwiYXV0aC9hdXRoLmNvbnRyb2xsZXIuanMiLCJhdXRoL2F1dGgucm91dGUuanMiLCJiaWxsaW5nL2JpbGxpbmcuY29udHJvbGxlci5qcyIsImJpbGxpbmcvYmlsbGluZy5yb3V0ZS5qcyIsImNvbXBvbmVudHMvaXMtcGFzc3dvcmQuZGlyZWN0aXZlLmpzIiwiY29tcG9uZW50cy9wYXNzd29yZC5kaXJlY3RpdmUuanMiLCJkYXNoYm9hcmQvZGFzaC1pbnN0YW5jZS5jb250cm9sbGVyLmpzIiwiZGFzaGJvYXJkL2Rhc2gtaW5zdGFuY2UuZGlyZWN0aXZlLmpzIiwiZGFzaGJvYXJkL2Rhc2hib2FyZC5jb250cm9sbGVyLmpzIiwiZGFzaGJvYXJkL2Rhc2hib2FyZC5yb3V0ZS5qcyIsImZpbHRlcnMvZmlsdGVycy5qcyIsImluc3RhbmNlL2luc3RhbmNlLXN1bW1hcnkuZGlyZWN0aXZlLmpzIiwiaW5zdGFuY2UvaW5zdGFuY2UuY29udHJvbGxlci5qcyIsImluc3RhbmNlL2luc3RhbmNlLnJvdXRlLmpzIiwiaW5zdGFuY2UvcGxhbi1pdGVtLmRpcmVjdGl2ZS5qcyIsImluc3RhbmNlL3NlcnZlci1pdGVtLmRpcmVjdGl2ZS5qcyIsImxheW91dC9jb250ZW50LmNvbnRyb2xsZXIuanMiLCJsYXlvdXQvbGF5b3V0LmNvbnRyb2xsZXIuanMiLCJwYXltZW50L21ldGhvZC1pdGVtLmRpcmVjdGl2ZS5qcyIsInBheW1lbnQvcGF5bWVudC5jb250cm9sbGVyLmpzIiwicGF5bWVudC9wYXltZW50LnJvdXRlLmpzIiwicHJvZmlsZS9wcm9maWxlLmNvbnRyb2xsZXIuanMiLCJwcm9maWxlL3Byb2ZpbGUucm91dGUuanMiLCJzZXJ2aWNlcy9hcGkuanMiLCJzZXJ2aWNlcy9hdXRoLmpzIiwic2VydmljZXMvYnJhbmNoZXMuanMiLCJzZXJ2aWNlcy9jYXJ0LmpzIiwic2VydmljZXMvY3VzdG9tZXJTZXJ2aWNlLmpzIiwic2VydmljZXMvZXJyb3IuanMiLCJzZXJ2aWNlcy9ub3RpZnkuanMiLCJzZXJ2aWNlcy9wb29sU2l6ZS5qcyIsInNlcnZpY2VzL3NwaW5uZXIuanMiLCJzZXJ2aWNlcy9zdG9yYWdlLmpzIiwic2VydmljZXMvdXRpbHNTZXJ2aWNlLmpzIiwiY29tcG9uZW50cy9kYXRlLXBpY2tlci9kYXRlLXBpY2tlci5jb250cm9sbGVyLmpzIiwiY29tcG9uZW50cy9kYXRlLXBpY2tlci9kYXRlLXBpY2tlci5kaXJlY3RpdmUuanMiLCJjb21wb25lbnRzL3NwaW5uZXIvc3Bpbm5lci5jb250cm9sbGVyLmpzIiwiY29tcG9uZW50cy9zcGlubmVyL3NwaW5uZXIuZGlyZWN0aXZlLmpzIiwiaW5zdGFuY2UvdmFsaWRhdGlvbi1kaXJlY3RpdmVzL3VuaXF1ZS1wcmVmaXguanMiLCJpbnN0YW5jZS92YWxpZGF0aW9uLWRpcmVjdGl2ZXMvdmFsaWQtbmFtZS5qcyIsImluc3RhbmNlL3ZhbGlkYXRpb24tZGlyZWN0aXZlcy92YWxpZC1wcmVmaXguanMiLCJsYXlvdXQvZm9vdGVyL2Zvb3Rlci5jb250cm9sbGVyLmpzIiwibGF5b3V0L2Zvb3Rlci9mb290ZXIuZGlyZWN0aXZlLmpzIiwibGF5b3V0L2xhbmduYXYvbGFuZy1uYXYuZGlyZWN0aXZlLmpzIiwibGF5b3V0L2xhbmduYXYvbGFuZy5jb250cm9sbGVyLmpzIiwibGF5b3V0L3NpZGVtZW51L3NpZGUtbWVudS5kaXJlY3RpdmUuanMiLCJsYXlvdXQvc2lkZW1lbnUvc2lkZW1lbnUuY29udHJvbGxlci5qcyIsImxheW91dC90b3BiYXIvdG9wLWJhci5jb250cm9sbGVyLmpzIiwibGF5b3V0L3RvcGJhci90b3AtYmFyLmRpcmVjdGl2ZS5qcyIsImxpYi9pMThuL2FuZ3VsYXItbG9jYWxlX2VuLmpzIiwibGliL2kxOG4vYW5ndWxhci1sb2NhbGVfcnUtcnUuanMiLCJsaWIvaTE4bi9hbmd1bGFyLWxvY2FsZV9ydS5qcyIsImxpYi9pMThuL2FuZ3VsYXItbG9jYWxlX3VrLXVhLmpzIiwibGliL2kxOG4vYW5ndWxhci1sb2NhbGVfdWsuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ1ZBO0FBQ0E7QUFDQTtBQ0ZBO0FBQ0E7QUFDQTtBQ0ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN2REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNUQTtBQUNBO0FBQ0E7QUNGQTtBQUNBO0FBQ0E7QUNGQTtBQUNBO0FBQ0E7QUNGQTtBQUNBO0FBQ0E7QUNGQTtBQUNBO0FBQ0E7QUNGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDL0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzNHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzlCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzlIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2xCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN6Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDbkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN2R0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3pCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2xFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2xCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ1pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDOUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN2ZUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNsQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN4QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN4QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDakJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNwREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN4QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNoSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNsQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNoREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNsQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNyQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzlGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDcEpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDbEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN4Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDN0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzdCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNwRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDOURBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3ZCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2pGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3JCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDcERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUM3REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3JDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUM1Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDL0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDMUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2pCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNwQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDcEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDMUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3BCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDakRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN0QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDcEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQy9JQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUMvSUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDL0lBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQy9JQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiYWxsLmpzIiwic291cmNlc0NvbnRlbnQiOlsiYW5ndWxhci5tb2R1bGUoJ2FwcCcsIFtcblx0J2FwcC5jb3JlJyxcblx0J2FwcC5yb3V0ZXMnLFxuXHQnYXBwLmxheW91dCcsXG5cdCdhcHAuYXV0aCcsXG5cdCdhcHAuYmlsbGluZycsXG5cdCdhcHAuZGFzaGJvYXJkJyxcblx0J2FwcC5pbnN0YW5jZScsXG5cdCdhcHAucGF5bWVudCcsXG5cdCdhcHAucHJvZmlsZSdcbl0pOyIsImFuZ3VsYXIubW9kdWxlKCdhcHAuYXV0aCcsIFtcblx0J2FwcC5jb3JlJ1xuXSk7IiwiYW5ndWxhci5tb2R1bGUoJ2FwcC5iaWxsaW5nJywgW1xuXHQnYXBwLmNvcmUnXG5dKTsiLCJhbmd1bGFyLm1vZHVsZSgnYXBwJylcbi52YWx1ZSgnbW9tZW50JywgbW9tZW50KVxuLmNvbnN0YW50KCdhcHBDb25maWcnLCB7XG5cdHNlcnZlcjogd2luZG93LmxvY2F0aW9uLnByb3RvY29sICsgJy8vJyArIHdpbmRvdy5sb2NhdGlvbi5ob3N0XG59KVxuLmNvbmZpZyhbJyRodHRwUHJvdmlkZXInLCBmdW5jdGlvbigkaHR0cFByb3ZpZGVyKSB7XG5cdCRodHRwUHJvdmlkZXIuaW50ZXJjZXB0b3JzLnB1c2goWyckcScsICckbG9jYXRpb24nLCAnJGxvY2FsU3RvcmFnZScsICdjdXN0b21lclNlcnZpY2UnLCBmdW5jdGlvbigkcSwgJGxvY2F0aW9uLCAkbG9jYWxTdG9yYWdlLCBjdXN0b21lclNlcnZpY2UpIHtcbiAgICAgICAgcmV0dXJuIHtcblx0XHRcdHJlcXVlc3Q6IGZ1bmN0aW9uKGNvbmZpZykge1xuXHRcdFx0XHRjb25maWcuaGVhZGVycyA9IGNvbmZpZy5oZWFkZXJzIHx8IHt9O1xuXHRcdFx0XHRpZiAoJGxvY2FsU3RvcmFnZS50b2tlbikge1xuXHRcdFx0XHRcdGNvbmZpZy5oZWFkZXJzWyd4LWFjY2Vzcy10b2tlbiddID0gJGxvY2FsU3RvcmFnZS50b2tlbjtcblx0XHRcdFx0fVxuXHRcdFx0XHRyZXR1cm4gY29uZmlnO1xuXHRcdFx0fSxcblx0XHRcdHJlc3BvbnNlRXJyb3I6IGZ1bmN0aW9uKGVycm9yKSB7XG5cdFx0XHRcdGlmKGVycm9yLnN0YXR1cyA9PT0gNDAxIHx8IGVycm9yLnN0YXR1cyA9PT0gNDAzKSB7XG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ3Jlc3BvbnNlRXJyb3I6ICcsICRsb2NhdGlvbi5wYXRoKCksIGVycm9yLnN0YXR1cywgZXJyb3IpO1xuXHRcdFx0XHRcdCRsb2NhdGlvbi5wYXRoKCcvbG9naW4nKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRyZXR1cm4gJHEucmVqZWN0KGVycm9yKTtcblx0XHRcdH0sXG5cdFx0XHRyZXNwb25zZTogZnVuY3Rpb24ocmVzcG9uc2Upe1xuXHRcdFx0XHRpZihyZXNwb25zZS5kYXRhLnRva2VuKSB7XG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ3Jlc3BvbnNlOiAnLCByZXNwb25zZS5kYXRhKTtcblx0XHRcdFx0XHQkbG9jYWxTdG9yYWdlLnRva2VuID0gcmVzcG9uc2UuZGF0YS50b2tlbjtcblx0XHRcdFx0fVxuXHRcdFx0XHQvLyBpZihyZXNwb25zZS5kYXRhLmN1c3RvbWVyICYmICFjdXN0b21lclNlcnZpY2UuZ2V0Q3VzdG9tZXIoKSl7XG5cdFx0XHRcdC8vIFx0Y3VzdG9tZXJTZXJ2aWNlLnNldEN1c3RvbWVyKHJlc3BvbnNlLmRhdGEuY3VzdG9tZXIpO1xuXHRcdFx0XHQvLyB9XG5cdFx0XHRcdHJldHVybiByZXNwb25zZTtcblx0XHRcdH1cbiAgICAgICAgfTtcblx0fV0pO1xufV0pXG4uY29uZmlnKFsnbm90aWZpY2F0aW9uc0NvbmZpZ1Byb3ZpZGVyJywgZnVuY3Rpb24gKG5vdGlmaWNhdGlvbnNDb25maWdQcm92aWRlcikge1xuICAgIG5vdGlmaWNhdGlvbnNDb25maWdQcm92aWRlci5zZXRBdXRvSGlkZSh0cnVlKTtcbiAgICBub3RpZmljYXRpb25zQ29uZmlnUHJvdmlkZXIuc2V0SGlkZURlbGF5KDUwMDApO1xuICAgIG5vdGlmaWNhdGlvbnNDb25maWdQcm92aWRlci5zZXRBdXRvSGlkZUFuaW1hdGlvbignZmFkZU91dE5vdGlmaWNhdGlvbnMnKTtcbiAgICBub3RpZmljYXRpb25zQ29uZmlnUHJvdmlkZXIuc2V0QXV0b0hpZGVBbmltYXRpb25EZWxheSg1MDApO1xuXHRub3RpZmljYXRpb25zQ29uZmlnUHJvdmlkZXIuc2V0QWNjZXB0SFRNTCh0cnVlKTtcbn1dKVxuLmNvbmZpZyhbJyR0cmFuc2xhdGVQcm92aWRlcicsIGZ1bmN0aW9uKCR0cmFuc2xhdGVQcm92aWRlcikge1xuXHQkdHJhbnNsYXRlUHJvdmlkZXIudXNlU3RhdGljRmlsZXNMb2FkZXIoe1xuXHRcdHByZWZpeDogJy4vYXNzZXRzL3RyYW5zbGF0aW9ucy9sb2NhbGUtJyxcblx0XHRzdWZmaXg6ICcuanNvbidcblx0fSk7XG5cdCR0cmFuc2xhdGVQcm92aWRlci5wcmVmZXJyZWRMYW5ndWFnZSgnZW4nKTtcblx0JHRyYW5zbGF0ZVByb3ZpZGVyLmZhbGxiYWNrTGFuZ3VhZ2UoJ2VuJyk7XG5cdCR0cmFuc2xhdGVQcm92aWRlci51c2VTdG9yYWdlKCdzdG9yYWdlU2VydmljZScpO1xuXHQkdHJhbnNsYXRlUHJvdmlkZXIudXNlU2FuaXRpemVWYWx1ZVN0cmF0ZWd5KCdzYW5pdGl6ZVBhcmFtZXRlcnMnKTtcblx0Ly8gJHRyYW5zbGF0ZVByb3ZpZGVyLnVzZVNhbml0aXplVmFsdWVTdHJhdGVneSgnZXNjYXBlJyk7XG59XSlcbi5jb25maWcoWyd0bWhEeW5hbWljTG9jYWxlUHJvdmlkZXInLCBmdW5jdGlvbih0bWhEeW5hbWljTG9jYWxlUHJvdmlkZXIpIHtcblx0dG1oRHluYW1pY0xvY2FsZVByb3ZpZGVyLmxvY2FsZUxvY2F0aW9uUGF0dGVybignLi9saWIvaTE4bi9hbmd1bGFyLWxvY2FsZV97e2xvY2FsZX19LmpzJyk7XG59XSk7IiwiYW5ndWxhci5tb2R1bGUoJ2FwcC5jb3JlJywgW1xuXHQvLyAnbmdBbmltYXRlJyxcblx0J25nTWVzc2FnZXMnLFxuXHQnbmdTdG9yYWdlJyxcblx0J25nU2FuaXRpemUnLFxuXHQncGFzY2FscHJlY2h0LnRyYW5zbGF0ZScsXG5cdCduZ05vdGlmaWNhdGlvbnNCYXInLFxuXHQndG1oLmR5bmFtaWNMb2NhbGUnLFxuXHQndWkuYm9vdHN0cmFwJ1xuXSk7IiwiYW5ndWxhci5tb2R1bGUoJ2FwcC5kYXNoYm9hcmQnLCBbXG5cdCdhcHAuY29yZSdcbl0pOyIsImFuZ3VsYXIubW9kdWxlKCdhcHAuaW5zdGFuY2UnLCBbXG5cdCdhcHAuY29yZSdcbl0pOyIsImFuZ3VsYXIubW9kdWxlKCdhcHAubGF5b3V0JywgW1xuXHQnYXBwLmNvcmUnXG5dKTsiLCJhbmd1bGFyLm1vZHVsZSgnYXBwLnBheW1lbnQnLCBbXG5cdCdhcHAuY29yZSdcbl0pOyIsImFuZ3VsYXIubW9kdWxlKCdhcHAucHJvZmlsZScsIFtcblx0J2FwcC5jb3JlJ1xuXSk7IiwiYW5ndWxhci5tb2R1bGUoJ2FwcC5yb3V0ZXMnLCBbXG5cdCduZ1JvdXRlJ1xuXSlcbi5jb25maWcoWyckcm91dGVQcm92aWRlcicsIGZ1bmN0aW9uKCRyb3V0ZVByb3ZpZGVyKXtcblxuXHRmdW5jdGlvbiB2ZXJpZnlVc2VyKCRxLCAkaHR0cCwgJGxvY2F0aW9uKSB7XG5cdFx0dmFyIGRlZmVycmVkID0gJHEuZGVmZXIoKTsgLy8gTWFrZSBhbiBBSkFYIGNhbGwgdG8gY2hlY2sgaWYgdGhlIHVzZXIgaXMgbG9nZ2VkIGluXG5cdFx0dmFyIHZlcmlmaWVkID0gZmFsc2U7XG5cdFx0JGh0dHAuZ2V0KCcvYXBpL3ZlcmlmeT9vdHQ9JyskbG9jYXRpb24uc2VhcmNoKCkub3R0KS50aGVuKGZ1bmN0aW9uIChyZXMpe1xuXHRcdFx0aWYgKHJlcy5zdWNjZXNzKXsgLy8gQXV0aGVudGljYXRlZFxuXHRcdFx0XHRkZWZlcnJlZC5yZXNvbHZlKCk7XG5cdFx0XHRcdHZlcmlmaWVkID0gdHJ1ZTtcblx0XHRcdH0gZWxzZSB7IC8vIE5vdCBBdXRoZW50aWNhdGVkXG5cdFx0XHRcdGRlZmVycmVkLnJlamVjdCgpO1xuXHRcdFx0fVxuXHRcdFx0JGxvY2F0aW9uLnVybCgnL2FjY291bnQtdmVyaWZpY2F0aW9uP3ZlcmlmaWVkPScrdmVyaWZpZWQpO1xuXHRcdH0sIGZ1bmN0aW9uIChlcnIpe1xuXHRcdFx0Y29uc29sZS5sb2coZXJyKTtcblx0XHR9KTtcblx0XHRyZXR1cm4gZGVmZXJyZWQucHJvbWlzZTtcblx0fVxuXG5cdCRyb3V0ZVByb3ZpZGVyLlxuXHRcdHdoZW4oJy92ZXJpZnknLCB7XG5cdFx0XHRyZXNvbHZlOiB7XG5cdFx0XHRcdHZlcmlmaWVkOiB2ZXJpZnlVc2VyXG5cdFx0XHR9XG5cdFx0fSkuXG5cdFx0b3RoZXJ3aXNlKHtcblx0XHRcdHJlZGlyZWN0VG86ICcvZGFzaGJvYXJkJ1xuXHRcdH0pO1xufV0pOyIsIihmdW5jdGlvbigpe1xuXG5cdCd1c2Ugc3RyaWN0JztcblxuXHRhbmd1bGFyXG5cdFx0Lm1vZHVsZSgnYXBwLmF1dGgnKVxuXHRcdC5jb250cm9sbGVyKCdBdXRoQ29udHJvbGxlcicsIEF1dGhDb250cm9sbGVyKTtcblxuXHRBdXRoQ29udHJvbGxlci4kaW5qZWN0ID0gWyckcm9vdFNjb3BlJywgJyRsb2NhdGlvbicsICckbG9jYWxTdG9yYWdlJywgJyR0cmFuc2xhdGUnLCAnYXV0aFNlcnZpY2UnLCAnZXJyb3JTZXJ2aWNlJywgJ3NwaW5uZXJTZXJ2aWNlJ107XG5cblx0ZnVuY3Rpb24gQXV0aENvbnRyb2xsZXIoJHJvb3RTY29wZSwgJGxvY2F0aW9uLCAkbG9jYWxTdG9yYWdlLCAkdHJhbnNsYXRlLCBhdXRoU2VydmljZSwgZXJyb3JTZXJ2aWNlLCBzcGlubmVyU2VydmljZSkge1xuXG5cdFx0aWYoJGxvY2F0aW9uLnBhdGgoKSA9PT0gJy9sb2dpbicpXG5cdFx0XHQkcm9vdFNjb3BlLnRpdGxlID0gJ0xPR0lOJztcblx0XHRlbHNlIGlmKCRsb2NhdGlvbi5wYXRoKCkgPT09ICcvc2lnbnVwJylcblx0XHRcdCRyb290U2NvcGUudGl0bGUgPSAnUkVHSVNUUkFUSU9OJztcblx0XHRlbHNlIGlmKCRsb2NhdGlvbi5wYXRoKCkgPT09ICcvYWNjb3VudC12ZXJpZmljYXRpb24nKVxuXHRcdFx0JHJvb3RTY29wZS50aXRsZSA9ICdFTUFJTF9WRVJJRklDQVRJT04nO1xuXHRcdGVsc2UgaWYoJGxvY2F0aW9uLnBhdGgoKSA9PT0gJy9yZXF1ZXN0LXBhc3N3b3JkLXJlc2V0JyB8fCAkbG9jYXRpb24ucGF0aCgpID09PSAnL3Jlc2V0LXBhc3N3b3JkJylcblx0XHRcdCRyb290U2NvcGUudGl0bGUgPSAnUkVTRVRfUEFTU1dPUkQnO1xuXG5cdFx0dmFyIHZtID0gdGhpcztcblx0XHR2bS52ZXJpZmljYXRpb25TZW50ID0gZmFsc2U7XG5cdFx0dm0udmVyaWZpZWQgPSAkbG9jYXRpb24uc2VhcmNoKCkudmVyaWZpZWQgPT09ICd0cnVlJyA/IHRydWUgOiBmYWxzZTtcblx0XHR2bS5yZXF1ZXN0U2VudCA9IGZhbHNlO1xuXHRcdHZtLmVtYWlsID0gJyc7XG5cdFx0dm0ubmFtZSA9ICcnO1xuXHRcdHZtLnBhc3N3b3JkID0gJyc7XG5cdFx0dm0uc2lnbnVwID0gc2lnbnVwO1xuXHRcdHZtLmxvZ2luID0gbG9naW47XG5cdFx0dm0ucmVxdWVzdFBhc3N3b3JkUmVzZXQgPSByZXF1ZXN0UGFzc3dvcmRSZXNldDtcblx0XHR2bS5yZXNldFBhc3N3b3JkID0gcmVzZXRQYXNzd29yZDtcblx0XHR2bS5sb2dvdXQgPSBsb2dvdXQ7XG5cblxuXHRcdGZ1bmN0aW9uIHNpZ251cCgpIHtcblx0XHRcdHZhciBmZGF0YSA9IHtcblx0XHRcdFx0ZW1haWw6IHZtLmVtYWlsLFxuXHRcdFx0XHRuYW1lOiB2bS5uYW1lLFxuXHRcdFx0XHRwYXNzd29yZDogdm0ucGFzc3dvcmQsXG5cdFx0XHRcdGxhbmc6ICRsb2NhbFN0b3JhZ2UuTkdfVFJBTlNMQVRFX0xBTkdfS0VZIHx8ICdlbidcblx0XHRcdH07XG5cdFx0XHRhdXRoU2VydmljZS5zaWdudXAoZmRhdGEpLnRoZW4oZnVuY3Rpb24gKHJlcyl7XG5cdFx0XHRcdHZtLnZlcmlmaWNhdGlvblNlbnQgPSB0cnVlO1xuXHRcdFx0fSwgZnVuY3Rpb24gKGVycil7XG5cdFx0XHRcdGlmKGVyci5tZXNzYWdlID09PSAnTVVMVElQTEVfU0lHTlVQJykge1xuXHRcdFx0XHRcdCRsb2NhdGlvbi5wYXRoKCcvcmVzaWdudXAnKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRlcnJvclNlcnZpY2Uuc2hvdyhlcnIuZGF0YS5tZXNzYWdlKTtcblx0XHRcdFx0Ly8gJHJvb3RTY29wZS5lcnJvciA9IGVycjtcblx0XHRcdH0pO1xuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIGxvZ2luKCkge1xuXHRcdFx0dmFyIGZkYXRhID0ge1xuXHRcdFx0XHRlbWFpbDogdm0uZW1haWwsXG5cdFx0XHRcdHBhc3N3b3JkOiB2bS5wYXNzd29yZFxuXHRcdFx0fTtcblxuXHRcdFx0aWYoIXZtLmVtYWlsKSB7XG5cdFx0XHRcdHJldHVybiBlcnJvclNlcnZpY2Uuc2hvdygnTUlTU0lOR19GSUVMRFMnKTtcblx0XHRcdH1cblxuXG5cdFx0XHRhdXRoU2VydmljZS5sb2dpbihmZGF0YSkudGhlbihmdW5jdGlvbiAocmVzKXtcblx0XHRcdFx0Ly8gJGxvY2FsU3RvcmFnZS50b2tlbiA9IHJlcy5kYXRhLnRva2VuO1xuXHRcdFx0XHQkbG9jYXRpb24ucGF0aCgnL2Rhc2hib2FyZCcpO1xuXHRcdFx0fSwgZnVuY3Rpb24gKGVycil7XG5cdFx0XHRcdGVycm9yU2VydmljZS5zaG93KGVyci5kYXRhLm1lc3NhZ2UpO1xuXHRcdFx0XHQvLyAkcm9vdFNjb3BlLmVycm9yID0gZXJyO1xuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gcmVxdWVzdFBhc3N3b3JkUmVzZXQoKSB7XG5cdFx0XHR2YXIgZmRhdGEgPSB7XG5cdFx0XHRcdGVtYWlsOiB2bS5lbWFpbFxuXHRcdFx0fTtcblxuXHRcdFx0YXV0aFNlcnZpY2UucmVxdWVzdFBhc3N3b3JkUmVzZXQoZmRhdGEpLnRoZW4oZnVuY3Rpb24gKHJlcyl7XG5cdFx0XHRcdHZtLnJlcXVlc3RTZW50ID0gdHJ1ZTtcblx0XHRcdH0sIGZ1bmN0aW9uIChlcnIpe1xuXHRcdFx0XHRlcnJvclNlcnZpY2Uuc2hvdyhlcnIuZGF0YS5tZXNzYWdlKTtcblx0XHRcdFx0Ly8gJHJvb3RTY29wZS5lcnJvciA9IGVycjtcblx0XHRcdH0pO1xuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIHJlc2V0UGFzc3dvcmQoKSB7XG5cdFx0XHR2YXIgZmRhdGEgPSB7XG5cdFx0XHRcdHRva2VuOiAkbG9jYXRpb24uc2VhcmNoKCkub3R0LFxuXHRcdFx0XHRwYXNzd29yZDogdm0ucGFzc3dvcmRcblx0XHRcdH07XG5cblx0XHRcdGF1dGhTZXJ2aWNlLnJlc2V0UGFzc3dvcmQoZmRhdGEpLnRoZW4oZnVuY3Rpb24gKHJlcyl7XG5cdFx0XHRcdCRsb2NhbFN0b3JhZ2UudG9rZW4gPSByZXMudG9rZW47XG5cdFx0XHRcdCRsb2NhdGlvbi5wYXRoKCcvZGFzaGJvYXJkJyk7XG5cdFx0XHR9LCBmdW5jdGlvbiAoZXJyKXtcblx0XHRcdFx0ZXJyb3JTZXJ2aWNlLnNob3coZXJyLmRhdGEubWVzc2FnZSk7XG5cdFx0XHRcdC8vICRyb290U2NvcGUuZXJyb3IgPSBlcnI7XG5cdFx0XHR9KTtcblx0XHR9XG5cblx0XHRmdW5jdGlvbiBsb2dvdXQoKSB7XG5cdFx0XHRhdXRoU2VydmljZS5sb2dvdXQoKTtcblx0XHR9XG5cblx0fVxuXG59KSgpOyIsImFuZ3VsYXIubW9kdWxlKCdhcHAuYXV0aCcpXG4uY29uZmlnKFsnJHJvdXRlUHJvdmlkZXInLCBmdW5jdGlvbigkcm91dGVQcm92aWRlcil7XG5cblx0JHJvdXRlUHJvdmlkZXJcblx0XHQud2hlbignL2FjY291bnQtdmVyaWZpY2F0aW9uJywge1xuXHRcdFx0dGVtcGxhdGVVcmw6ICdhdXRoL3ZlcmlmaWNhdGlvbi5odG1sJyxcblx0XHRcdGNvbnRyb2xsZXI6ICdBdXRoQ29udHJvbGxlcicsXG5cdFx0XHRjb250cm9sbGVyQXM6ICdhdXRoVm0nXG5cdFx0fSlcblx0XHQud2hlbignL3JlcXVlc3QtcGFzc3dvcmQtcmVzZXQnLCB7XG5cdFx0XHR0ZW1wbGF0ZVVybDogJ2F1dGgvcmVxdWVzdC1wYXNzd29yZC1yZXNldC5odG1sJyxcblx0XHRcdGNvbnRyb2xsZXI6ICdBdXRoQ29udHJvbGxlcicsXG5cdFx0XHRjb250cm9sbGVyQXM6ICdhdXRoVm0nXG5cdFx0fSlcblx0XHQud2hlbignL3Jlc2V0LXBhc3N3b3JkJywge1xuXHRcdFx0dGVtcGxhdGVVcmw6ICdhdXRoL3Jlc2V0LXBhc3N3b3JkLmh0bWwnLFxuXHRcdFx0Y29udHJvbGxlcjogJ0F1dGhDb250cm9sbGVyJyxcblx0XHRcdGNvbnRyb2xsZXJBczogJ2F1dGhWbSdcblx0XHR9KVxuXHRcdC53aGVuKCcvbG9naW4nLHtcblx0XHRcdHRlbXBsYXRlVXJsOiAnYXV0aC9sb2dpbi5odG1sJyxcblx0XHRcdGNvbnRyb2xsZXI6ICdBdXRoQ29udHJvbGxlcicsXG5cdFx0XHRjb250cm9sbGVyQXM6ICdhdXRoVm0nXG5cdFx0fSlcblx0XHQud2hlbignL3NpZ251cCcsIHtcblx0XHRcdHRlbXBsYXRlVXJsOiAnYXV0aC9zaWdudXAuaHRtbCcsXG5cdFx0XHRjb250cm9sbGVyOiAnQXV0aENvbnRyb2xsZXInLFxuXHRcdFx0Y29udHJvbGxlckFzOiAnYXV0aFZtJ1xuXHRcdH0pO1xuXG59XSk7IiwiKGZ1bmN0aW9uKCl7XG5cblx0J3VzZSBzdHJpY3QnO1xuXG5cdGFuZ3VsYXJcblx0XHQubW9kdWxlKCdhcHAuYmlsbGluZycpXG5cdFx0LmNvbnRyb2xsZXIoJ0JpbGxpbmdDb250cm9sbGVyJywgQmlsbGluZ0NvbnRyb2xsZXIpO1xuXG5cdEJpbGxpbmdDb250cm9sbGVyLiRpbmplY3QgPSBbJyR0cmFuc2xhdGUnLCAndXRpbHNTZXJ2aWNlJywgJ2FwaVNlcnZpY2UnLCAnbW9tZW50JywgJ2N1c3RvbWVyU2VydmljZScsICdzcGlubmVyU2VydmljZScsICdlcnJvclNlcnZpY2UnXTtcblxuXHRmdW5jdGlvbiBCaWxsaW5nQ29udHJvbGxlcigkdHJhbnNsYXRlLCB1dGlsc1NlcnZpY2UsIGFwaSwgbW9tZW50LCBjdXN0b21lclNlcnZpY2UsIHNwaW5uZXIsIGVycm9yU2VydmljZSkge1xuXG5cdFx0dmFyIHZtID0gdGhpcztcblx0XHQvLyB2YXIgdHJhbnNhY3Rpb25zID0gW107XG5cblx0XHR2bS5jdXN0b21lciA9IGN1c3RvbWVyU2VydmljZS5nZXRDdXN0b21lcigpO1xuXHRcdHZtLmN1cnJlbnRCYWxhbmNlID0gbnVsbDtcblx0XHR2bS50cmFuc2FjdGlvbnMgPSBbXTtcblx0XHR2bS5jaGFyZ2VzID0gW107XG5cdFx0dm0uc3RhcnRCYWxhbmNlID0gJyc7XG5cdFx0dm0ubGFzdEJpbGxpbmdEYXRlID0gbnVsbDtcblx0XHR2bS5zdGFydERhdGUgPSBtb21lbnQoKS5zdWJ0cmFjdCg3LCAnZGF5cycpLnRvRGF0ZSgpO1xuXHRcdHZtLmVuZERhdGUgPSBtb21lbnQoKS5lbmRPZignZGF5JykudG9EYXRlKCk7XG5cdFx0dm0uZGF0ZUZvcm1hdCA9ICdkZCBNTU1NIHl5eXknO1xuXHRcdHZtLnN0YXJ0RGF0ZU9wdGlvbnMgPSB7XG5cdFx0XHQvLyBtaW5EYXRlOiBuZXcgRGF0ZSgyMDEwLCAxLCAxKSxcblx0XHRcdC8vIG1heERhdGU6IG5ldyBEYXRlKHZtLmVuZERhdGUpLFxuXHRcdFx0c2hvd1dlZWtzOiBmYWxzZVxuXHRcdH07XG5cdFx0dm0uZW5kRGF0ZU9wdGlvbnMgPSB7XG5cdFx0XHRtaW5EYXRlOiBuZXcgRGF0ZSh2bS5zdGFydERhdGUpLFxuXHRcdFx0c2hvd1dlZWtzOiBmYWxzZVxuXHRcdH07XG5cdFx0dm0ucGFyc2VEYXRlID0gZnVuY3Rpb24oZGF0ZSl7XG5cdFx0XHRyZXR1cm4gdXRpbHNTZXJ2aWNlLnBhcnNlRGF0ZShkYXRlKTtcblx0XHR9O1xuXHRcdHZtLnN1bVVwID0gc3VtVXA7XG5cdFx0dm0uZmluZFJlY29yZHMgPSBmaW5kUmVjb3JkcztcblxuXHRcdGNvbnNvbGUubG9nKCdjdXN0b21lcjogJywgdm0uY3VzdG9tZXIpO1xuXG5cdFx0c3Bpbm5lci5zaG93KCdtYWluLXNwaW5uZXInKTtcblxuXHRcdGdldEN1c3RvbWVyQmFsYW5jZSgpO1xuXHRcdGZpbmRSZWNvcmRzKCk7XG5cblx0XHRmdW5jdGlvbiBmaW5kUmVjb3Jkcygpe1xuXHRcdFx0Z2V0VHJhbnNhY3Rpb25zKCk7XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gZ2V0VHJhbnNhY3Rpb25zKCkge1xuXHRcdFx0YXBpLnJlcXVlc3Qoe1xuXHRcdFx0XHR1cmw6IFwidHJhbnNhY3Rpb25zXCIsXG5cdFx0XHRcdHBhcmFtczoge1xuXHRcdFx0XHRcdHN0YXJ0OiBEYXRlLnBhcnNlKHZtLnN0YXJ0RGF0ZSksXG5cdFx0XHRcdFx0ZW5kOiBEYXRlLnBhcnNlKHZtLmVuZERhdGUpXG5cdFx0XHRcdH1cblx0XHRcdH0pLnRoZW4oZnVuY3Rpb24ocmVzcG9uc2Upe1xuXHRcdFx0XHRjb25zb2xlLmxvZygnVHJhbnNhY3Rpb25zOiAnLCByZXNwb25zZS5kYXRhKTtcblx0XHRcdFx0dm0udHJhbnNhY3Rpb25zID0gcmVzcG9uc2UuZGF0YS5yZXN1bHQ7XG5cblx0XHRcdFx0cmV0dXJuIGFwaS5yZXF1ZXN0KHtcblx0XHRcdFx0XHR1cmw6IFwiY2hhcmdlc1wiLFxuXHRcdFx0XHRcdHBhcmFtczoge1xuXHRcdFx0XHRcdFx0c3RhcnQ6IERhdGUucGFyc2Uodm0uc3RhcnREYXRlKSxcblx0XHRcdFx0XHRcdGVuZDogRGF0ZS5wYXJzZSh2bS5lbmREYXRlKVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSk7XG5cdFx0XHR9KS50aGVuKGZ1bmN0aW9uKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKCdDaGFyZ2VzOiAnLCByZXNwb25zZS5kYXRhKTtcblx0XHRcdFx0dm0uY2hhcmdlcyA9IHJlc3BvbnNlLmRhdGEucmVzdWx0O1xuXHRcdFx0XHR2bS5zdGFydEJhbGFuY2UgPSB2bS5jaGFyZ2VzLmxlbmd0aCA/IHZtLmNoYXJnZXNbdm0uY2hhcmdlcy5sZW5ndGgtMV0uc3RhcnRCYWxhbmNlIDogbnVsbDtcblx0XHRcdFx0dm0ubGFzdEJpbGxpbmdEYXRlID0gdm0uY2hhcmdlcy5sZW5ndGggPyB2bS5jaGFyZ2VzWzBdLnRvIDogbnVsbDtcblx0XHRcdFx0dm0udG90YWxDaGFyZ2VzID0gdm0uY2hhcmdlcy5sZW5ndGggPyAodm0uc3RhcnRCYWxhbmNlIC0gdm0uY3VzdG9tZXIuYmFsYW5jZSkgOiBudWxsO1xuXHRcdFx0XHQvLyB2bS50cmFuc2FjdGlvbnMgPSB0cmFuc2FjdGlvbnM7XG5cblx0XHRcdFx0c3Bpbm5lci5oaWRlKCdtYWluLXNwaW5uZXInKTtcblx0XHRcdFx0Y29uc29sZS5sb2coJ0ZpbmFsOiAnLCB2bS50cmFuc2FjdGlvbnMsIHZtLmNoYXJnZXMpO1xuXHRcdFx0fSkuY2F0Y2goZnVuY3Rpb24oZXJyKSB7XG5cdFx0XHRcdHNwaW5uZXIuaGlkZSgnbWFpbi1zcGlubmVyJyk7XG5cdFx0XHRcdGVycm9yU2VydmljZS5zaG93KGVycik7XG5cdFx0XHR9KTtcblx0XHR9XG5cblx0XHRmdW5jdGlvbiBnZXRDdXN0b21lckJhbGFuY2UoKSB7XG5cdFx0XHRhcGkucmVxdWVzdCh7XG5cdFx0XHRcdHVybDogXCJnZXRDdXN0b21lckJhbGFuY2VcIlxuXHRcdFx0fSkudGhlbihmdW5jdGlvbihyZXNwb25zZSl7XG5cdFx0XHRcdHZtLmN1c3RvbWVyLmJhbGFuY2UgPSByZXNwb25zZS5kYXRhLnJlc3VsdDtcblx0XHRcdFx0dm0uY3VycmVudEJhbGFuY2UgPSBzdHJpbmdUb0ZpeGVkKHJlc3BvbnNlLmRhdGEucmVzdWx0KTtcblx0XHRcdFx0Y3VzdG9tZXJTZXJ2aWNlLnNldEN1c3RvbWVyQmFsYW5jZShyZXNwb25zZS5kYXRhLnJlc3VsdCk7XG5cdFx0XHR9LCBmdW5jdGlvbihlcnIpe1xuXHRcdFx0XHRzcGlubmVyLmhpZGUoJ21haW4tc3Bpbm5lcicpO1xuXHRcdFx0XHRlcnJvclNlcnZpY2Uuc2hvdyhlcnIpO1xuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gc3RyaW5nVG9GaXhlZChzdHJpbmcpIHtcblx0XHRcdHJldHVybiB1dGlsc1NlcnZpY2Uuc3RyaW5nVG9GaXhlZChzdHJpbmcsIDIpO1xuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIHN1bVVwKGFycmF5KSB7XG5cdFx0XHR2YXIgYW1vdW50ID0gMDtcblx0XHRcdGFycmF5LmZvckVhY2goZnVuY3Rpb24oaXRlbSl7XG5cdFx0XHRcdGFtb3VudCArPSBwYXJzZUZsb2F0KGl0ZW0pO1xuXHRcdFx0fSk7XG5cdFx0XHRyZXR1cm4gYW1vdW50O1xuXHRcdH1cblxuXHRcdC8vIGZ1bmN0aW9uIGdldENoYXJnZXMoKSB7XG5cdFx0Ly8gXHRhcGkucmVxdWVzdCh7XG5cdFx0Ly8gXHRcdHVybDogXCJjaGFyZ2VzXCIsXG5cdFx0Ly8gXHRcdHBhcmFtczoge1xuXHRcdC8vIFx0XHRcdHN0YXJ0OiBEYXRlLnBhcnNlKHZtLnN0YXJ0RGF0ZSksXG5cdFx0Ly8gXHRcdFx0ZW5kOiBEYXRlLnBhcnNlKHZtLmVuZERhdGUpXG5cdFx0Ly8gXHRcdH1cblx0XHQvLyBcdH0pLnRoZW4oZnVuY3Rpb24ocmVzcG9uc2Upe1xuXHRcdC8vIFx0XHRjb25zb2xlLmxvZygnQ2hhcmdlczogJywgcmVzcG9uc2UuZGF0YSk7XG5cdFx0Ly8gXHRcdHZtLmNoYXJnZXMgPSByZXNwb25zZS5kYXRhLnJlc3VsdDtcblx0XHQvLyBcdH0sIGZ1bmN0aW9uKGVycil7XG5cdFx0Ly8gXHRcdGVycm9yU2VydmljZS5zaG93KGVycik7XG5cdFx0Ly8gXHR9KTtcblx0XHQvLyB9XG5cblx0fVxuXG59KSgpOyIsImFuZ3VsYXIubW9kdWxlKCdhcHAuYmlsbGluZycpXG4uY29uZmlnKFsnJHJvdXRlUHJvdmlkZXInLCBmdW5jdGlvbigkcm91dGVQcm92aWRlcil7XG5cblx0JHJvdXRlUHJvdmlkZXJcblx0XHQud2hlbignL2JpbGxpbmcnLCB7XG5cdFx0XHR0ZW1wbGF0ZVVybDogJ2JpbGxpbmcvYmlsbGluZy5odG1sJyxcblx0XHRcdGNvbnRyb2xsZXI6ICdCaWxsaW5nQ29udHJvbGxlcicsXG5cdFx0XHRjb250cm9sbGVyQXM6ICdiaWxsVm0nLFxuXHRcdFx0cmVzb2x2ZToge1xuXHRcdFx0XHRsb2dnZWRpbjogaXNBdXRob3JpemVkXG5cdFx0XHR9XG5cdFx0fSk7XG5cbn1dKTtcblxuaXNBdXRob3JpemVkLiRpbmplY3QgPSBbJ2F1dGhTZXJ2aWNlJ107XG5mdW5jdGlvbiBpc0F1dGhvcml6ZWQoYXV0aFNlcnZpY2UpIHtcblx0cmV0dXJuIGF1dGhTZXJ2aWNlLmlzQXV0aG9yaXplZCgpO1xufSIsIihmdW5jdGlvbigpe1xuXG5cdCd1c2Ugc3RyaWN0JztcblxuXHRhbmd1bGFyXG5cdFx0Lm1vZHVsZSgnYXBwJylcblx0XHQuZGlyZWN0aXZlKCdpc1Bhc3N3b3JkJywgaXNQYXNzd29yZCk7XG5cblx0aXNQYXNzd29yZC4kaW5qZWN0ID0gWyd1dGlscyddO1xuXG5cdGZ1bmN0aW9uIGlzUGFzc3dvcmQodXRpbHMpe1xuXG5cdFx0cmV0dXJuIHtcblx0XHRcdHJlcXVpcmU6ICduZ01vZGVsJyxcblx0XHRcdGxpbms6IGxpbmtcblx0XHR9O1xuXG5cdFx0ZnVuY3Rpb24gbGluayhzY29wZSwgZWwsIGF0dHJzLCBjdHJsKSB7XG5cblx0XHRcdGN0cmwuJHZhbGlkYXRvcnMucGFzc3dvcmQgPSBmdW5jdGlvbihtb2RlbFZhbHVlLCB2aWV3VmFsdWUpIHtcblx0XHRcdFx0aWYoY3RybC4kaXNFbXB0eShtb2RlbFZhbHVlKSkge1xuXHRcdFx0XHRcdHJldHVybiB0cnVlO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0aWYoc2NvcGUuaW5zdGFuY2UpIHtcblx0XHRcdFx0XHR2YXIgcHJlZml4ID0gc2NvcGUuaW5zdGFuY2UucmVzdWx0LnByZWZpeDtcblx0XHRcdFx0XHRpZihwcmVmaXggJiYgbmV3IFJlZ0V4cChwcmVmaXgsICdpJykudGVzdChtb2RlbFZhbHVlKSlcblx0XHRcdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGlmKCF1dGlscy5jaGVja1Bhc3N3b3JkU3RyZW5ndGgobW9kZWxWYWx1ZSkpIHtcblx0XHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHRcdH07XG5cdFx0XHRcblx0XHR9XG5cblx0fVxuXG59KSgpOyIsIihmdW5jdGlvbigpe1xuXG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgYW5ndWxhclxuICAgICAgICAubW9kdWxlKCdhcHAuY29yZScpXG4gICAgICAgIC5kaXJlY3RpdmUoJ3Bhc3N3b3JkJywgcGFzc3dvcmQpO1xuXG4gICAgcGFzc3dvcmQuJGluamVjdCA9IFsndXRpbHNTZXJ2aWNlJ107XG4gICAgZnVuY3Rpb24gcGFzc3dvcmQodXRpbHMpe1xuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICByZXN0cmljdDogJ0FFJyxcbiAgICAgICAgICAgIHJlcXVpcmU6ICduZ01vZGVsJyxcbiAgICAgICAgICAgIGxpbms6IGxpbmtcbiAgICAgICAgfTtcblxuICAgICAgICBmdW5jdGlvbiBsaW5rKHNjb3BlLCBlbCwgYXR0cnMsIGN0cmwpIHtcblxuICAgICAgICAgICAgY3RybC4kdmFsaWRhdG9ycy5wYXNzd29yZCA9IGZ1bmN0aW9uKG1vZGVsVmFsdWUsIHZpZXdWYWx1ZSkge1xuICAgICAgICAgICAgICAgIGlmKGN0cmwuJGlzRW1wdHkobW9kZWxWYWx1ZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gY2hlY2sgaWYgcGFzc3dvcmQgY29udGFpbnMgdGhlIGJyYW5jaCBwcmVmaXhcbiAgICAgICAgICAgICAgICBpZihzY29wZS5pbnN0Vm0gJiYgc2NvcGUuaW5zdFZtLmluc3RhbmNlKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBwcmVmaXggPSBzY29wZS5pbnN0Vm0uaW5zdGFuY2UucmVzdWx0LnByZWZpeDtcbiAgICAgICAgICAgICAgICAgICAgaWYocHJlZml4ICYmIG5ldyBSZWdFeHAocHJlZml4LCAnaScpLnRlc3QobW9kZWxWYWx1ZSkpXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgcmV0dXJuICEhdXRpbHMuY2hlY2tQYXNzd29yZFN0cmVuZ3RoKG1vZGVsVmFsdWUpO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgIH1cbn0pKCk7IiwiKGZ1bmN0aW9uKCl7XG5cblx0J3VzZSBzdHJpY3QnO1xuXG5cdGFuZ3VsYXJcblx0XHQubW9kdWxlKCdhcHAuZGFzaGJvYXJkJylcblx0XHQuY29udHJvbGxlcignRGFzaEluc3RhbmNlQ29udHJvbGxlcicsIERhc2hJbnN0YW5jZUNvbnRyb2xsZXIpO1xuXG5cdERhc2hJbnN0YW5jZUNvbnRyb2xsZXIuJGluamVjdCA9IFsnJHJvb3RTY29wZScsICckbG9jYXRpb24nLCAnJHRyYW5zbGF0ZScsICdhcGlTZXJ2aWNlJywgJ3Bvb2xTaXplU2VydmljZXMnLCAnYnJhbmNoZXNTZXJ2aWNlJywgJ2NhcnRTZXJ2aWNlJywgJ3V0aWxzU2VydmljZScsICdlcnJvclNlcnZpY2UnXTtcblxuXHRmdW5jdGlvbiBEYXNoSW5zdGFuY2VDb250cm9sbGVyKCRyb290U2NvcGUsICRsb2NhdGlvbiwgJHRyYW5zbGF0ZSwgYXBpLCBwb29sU2l6ZVNlcnZpY2VzLCBicmFuY2hlc1NlcnZpY2UsIGNhcnQsIHV0aWxzLCBlcnJvclNlcnZpY2UpIHtcblxuXHRcdHZhciB2bSA9IHRoaXM7XG5cdFx0dmFyIGRpZmY7XG5cblx0XHR2bS5zdWIgPSB2bS5pbnN0Ll9zdWJzY3JpcHRpb247XG5cdFx0dm0udGVybWluYXRlSW5zdGFuY2UgPSB0ZXJtaW5hdGVJbnN0YW5jZTtcblx0XHR2bS5yZW5ld1N1YnNjcmlwdGlvbiA9IHJlbmV3U3Vic2NyaXB0aW9uO1xuXHRcdHZtLmV4cGlyZXNBdCA9IGV4cGlyZXNBdDtcblx0XHR2bS5jYW5SZW5ldyA9IGNhblJlbmV3O1xuXHRcdHZtLnBhcnNlRGF0ZSA9IHBhcnNlRGF0ZTtcblx0XHR2bS5zdHJpbmdUb0ZpeGVkID0gc3RyaW5nVG9GaXhlZDtcblx0XHR2bS5nZXREaWZmZXJlbmNlID0gdXRpbHMuZ2V0RGlmZmVyZW5jZTtcblx0XHR2bS50cmlhbEV4cGlyZXMgPSBleHBpcmVzQXQodm0uc3ViLnRyaWFsRXhwaXJlcyk7XG5cdFx0dm0uZXhwaXJlcyA9IHZtLnN1Yi5iaWxsaW5nQ3lyY2xlcyAtIHZtLnN1Yi5jdXJyZW50QmlsbGluZ0N5cmNsZTtcblx0XHR2bS5leHBUaHJlc2hvbGQgPSAxMDtcblxuXHRcdGZ1bmN0aW9uIHRlcm1pbmF0ZUluc3RhbmNlKG9pZCkge1xuXHRcdFx0aWYoIW9pZCkgcmV0dXJuO1xuXHRcdFx0aWYoY29uZmlybShcIkRvIHlvdSByZWFseSB3YW50IHRvIHRlcm1pbmF0ZSBpbnN0YW5jZSBwZXJtYW5lbnRseT9cIikpe1xuXHRcdFx0XHRzZXRTdGF0ZSgnZGVsZXRlQnJhbmNoJywgb2lkLCBmdW5jdGlvbiAoZXJyLCByZXNwb25zZSl7XG5cdFx0XHRcdFx0aWYoZXJyKSB7XG5cdFx0XHRcdFx0XHRlcnJvclNlcnZpY2Uuc2hvdyhlcnIpO1xuXHRcdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdGJyYW5jaGVzU2VydmljZS5yZW1vdmUob2lkKTtcblx0XHRcdFx0XHQvLyBnZXRCcmFuY2hlcygpO1xuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHR9XG5cdFx0XG5cdFx0ZnVuY3Rpb24gcmVuZXdTdWJzY3JpcHRpb24oaW5zdCkge1xuXHRcdFx0JHRyYW5zbGF0ZSgnREVTQ1JJUFRJT05TLlJFTkVXX1NVQlNDUklQVElPTicsIHtcblx0XHRcdFx0cGxhbklkOiBpbnN0Ll9zdWJzY3JpcHRpb24ucGxhbklkLFxuXHRcdFx0XHR1c2VyczogaW5zdC5fc3Vic2NyaXB0aW9uLnF1YW50aXR5LFxuXHRcdFx0XHRjb21wYW55OiBpbnN0LnJlc3VsdC5uYW1lXG5cdFx0XHR9KVxuXHRcdFx0LnRoZW4oZnVuY3Rpb24gKGRlc2NyaXB0aW9uKSB7XG5cdFx0XHRcdGNhcnQuYWRkKHtcblx0XHRcdFx0XHRhY3Rpb246IFwicmVuZXdTdWJzY3JpcHRpb25cIixcblx0XHRcdFx0XHRkZXNjcmlwdGlvbjogZGVzY3JpcHRpb24sXG5cdFx0XHRcdFx0YW1vdW50OiBpbnN0Ll9zdWJzY3JpcHRpb24uYW1vdW50LFxuXHRcdFx0XHRcdGRhdGE6IHtcblx0XHRcdFx0XHRcdG9pZDogaW5zdC5vaWRcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0pO1xuXHRcdFx0XHQkbG9jYXRpb24ucGF0aCgnL3BheW1lbnQnKTtcblx0XHRcdH0pO1xuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIGV4cGlyZXNBdChsYXN0QmlsbGluZ0RhdGUpIHtcblx0XHRcdGRpZmYgPSB1dGlscy5nZXREaWZmZXJlbmNlKGxhc3RCaWxsaW5nRGF0ZSwgbW9tZW50KCksICdkYXlzJyk7XG5cdFx0XHRyZXR1cm4gZGlmZiA8IDAgPyAwIDogZGlmZjtcblx0XHR9XG5cblx0XHRmdW5jdGlvbiBjYW5SZW5ldyhpbnN0KSB7XG5cdFx0XHRkaWZmID0gdm0uZXhwaXJlc0F0KGluc3QpO1xuXHRcdFx0cmV0dXJuIGRpZmYgPD0gMTA7XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gcGFyc2VEYXRlKGRhdGUsIGZvcm1hdCkge1xuXHRcdFx0cmV0dXJuIHV0aWxzLnBhcnNlRGF0ZShkYXRlLCBmb3JtYXQpO1xuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIHN0cmluZ1RvRml4ZWQoc3RyaW5nKSB7XG5cdFx0XHRyZXR1cm4gdXRpbHMuc3RyaW5nVG9GaXhlZChzdHJpbmcsIDIpO1xuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIGdldFBvb2xTdHJpbmcoYXJyYXkpIHtcblx0XHRcdHJldHVybiBwb29sU2l6ZVNlcnZpY2VzLnBvb2xBcnJheVRvU3RyaW5nKGFycmF5KTtcblx0XHR9XG5cblx0XHRmdW5jdGlvbiBnZXRQb29sU2l6ZShhcnJheSkge1xuXHRcdFx0cmV0dXJuIHBvb2xTaXplU2VydmljZXMuZ2V0UG9vbFNpemUoYXJyYXkpO1xuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIHNldFN0YXRlKG1ldGhvZCwgb2lkLCBjYWxsYmFjaykge1xuXHRcdFx0YXBpLnJlcXVlc3Qoe1xuXHRcdFx0XHR1cmw6IG1ldGhvZCxcblx0XHRcdFx0cGFyYW1zOiB7XG5cdFx0XHRcdFx0b2lkOiBvaWRcblx0XHRcdFx0fVxuXHRcdFx0fSkudGhlbihmdW5jdGlvbihyZXN1bHQpe1xuXHRcdFx0XHRjb25zb2xlLmxvZygnc2V0U3RhdGUgcmVzdWx0OiAnLCByZXN1bHQpO1xuXHRcdFx0XHRjYWxsYmFjayhudWxsLCByZXN1bHQuZGF0YS5yZXN1bHQpO1xuXHRcdFx0fSwgZnVuY3Rpb24oZXJyKXtcblx0XHRcdFx0Y2FsbGJhY2soZXJyKTtcblx0XHRcdH0pO1xuXHRcdH1cblxuXHR9XG5cbn0pKCk7IiwiKGZ1bmN0aW9uKCl7XG5cblx0J3VzZSBzdHJpY3QnO1xuXG5cdGFuZ3VsYXJcblx0XHQubW9kdWxlKCdhcHAuZGFzaGJvYXJkJylcblx0XHQuZGlyZWN0aXZlKCdkYXNoSW5zdGFuY2UnLCBkYXNoSW5zdGFuY2UpO1xuXG5cdGZ1bmN0aW9uIGRhc2hJbnN0YW5jZSgpe1xuXG5cdFx0cmV0dXJuIHtcblx0XHRcdHJlc3RyaWN0OiAnRUEnLFxuXHRcdFx0cmVwbGFjZTogdHJ1ZSxcblx0XHRcdHRyYW5zY2x1ZGU6IHRydWUsXG5cdFx0XHRzY29wZToge1xuXHRcdFx0XHRpbnN0OiAnPSdcblx0XHRcdH0sXG5cdFx0XHR0ZW1wbGF0ZVVybDogJ2Rhc2hib2FyZC9kYXNoLWluc3RhbmNlLmh0bWwnLFxuXHRcdFx0Y29udHJvbGxlcjogJ0Rhc2hJbnN0YW5jZUNvbnRyb2xsZXInLFxuXHRcdFx0Y29udHJvbGxlckFzOiAnZGFzaEluc3RWbScsXG5cdFx0XHRiaW5kVG9Db250cm9sbGVyOiB0cnVlXG5cdFx0fTtcblxuXHR9XG5cbn0pKCk7IiwiKGZ1bmN0aW9uKCl7XG5cblx0J3VzZSBzdHJpY3QnO1xuXG5cdGFuZ3VsYXJcblx0XHQubW9kdWxlKCdhcHAuZGFzaGJvYXJkJylcblx0XHQuY29udHJvbGxlcignRGFzaGJvYXJkQ29udHJvbGxlcicsIERhc2hib2FyZENvbnRyb2xsZXIpO1xuXG5cdERhc2hib2FyZENvbnRyb2xsZXIuJGluamVjdCA9IFsnJHJvb3RTY29wZScsICdhcGlTZXJ2aWNlJywgJ2JyYW5jaGVzU2VydmljZScsICdub3RpZnlTZXJ2aWNlJywgJ3NwaW5uZXJTZXJ2aWNlJywgJ2N1c3RvbWVyU2VydmljZScsICdlcnJvclNlcnZpY2UnXTtcblxuXHRmdW5jdGlvbiBEYXNoYm9hcmRDb250cm9sbGVyKCRyb290U2NvcGUsIGFwaSwgYnJhbmNoZXNTZXJ2aWNlLCBub3RpZnlTZXJ2aWNlLCBzcGlubmVyLCBjdXN0b21lclNlcnZpY2UsIGVycm9yU2VydmljZSkge1xuXG5cdFx0dmFyIHZtID0gdGhpcztcblxuXHRcdHZtLmluc3RhbmNlcyA9IFtdO1xuXHRcdHZtLmN1c3RvbWVyUm9sZSA9IGN1c3RvbWVyU2VydmljZS5nZXRDdXN0b21lcigpLnJvbGU7XG5cblx0XHQkcm9vdFNjb3BlLnRpdGxlID0gJ0RBU0hCT0FSRCc7XG5cdFx0JHJvb3RTY29wZS4kb24oJ2F1dGgubG9nb3V0JywgZnVuY3Rpb24oKXtcblx0XHRcdGJyYW5jaGVzU2VydmljZS5jbGVhcigpO1xuXHRcdH0pO1xuXG5cdFx0c3Bpbm5lci5zaG93KCdtYWluLXNwaW5uZXInKTtcblxuXHRcdGdldEJyYW5jaGVzKCk7XG5cdFx0Ly8gZ2V0UGxhbnMoKTtcblxuXHRcdGZ1bmN0aW9uIGdldEJyYW5jaGVzKCl7XG5cdFx0XHR2YXIgaW5zdGFuY2VzID0gYnJhbmNoZXNTZXJ2aWNlLmdldEFsbCgpO1xuXHRcdFx0aWYoaW5zdGFuY2VzLmxlbmd0aCkge1xuXHRcdFx0XHR2bS5pbnN0YW5jZXMgPSBpbnN0YW5jZXM7XG5cdFx0XHRcdHNwaW5uZXIuaGlkZSgnbWFpbi1zcGlubmVyJyk7XG5cdFx0XHRcdGNvbnNvbGUubG9nKCdnZXRCcmFuY2hlczogJywgaW5zdGFuY2VzKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGxvYWRCcmFuY2hlcygpO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIGxvYWRCcmFuY2hlcygpIHtcblx0XHRcdGFwaS5yZXF1ZXN0KHtcblx0XHRcdFx0dXJsOiBcImdldEJyYW5jaGVzXCJcblx0XHRcdH0pLnRoZW4oZnVuY3Rpb24ocmVzdWx0KXtcblx0XHRcdFx0YnJhbmNoZXNTZXJ2aWNlLnNldChyZXN1bHQuZGF0YS5yZXN1bHQpO1xuXHRcdFx0XHRcblx0XHRcdFx0dm0uaW5zdGFuY2VzID0gcmVzdWx0LmRhdGEucmVzdWx0O1xuXG5cdFx0XHRcdHNwaW5uZXIuaGlkZSgnbWFpbi1zcGlubmVyJyk7XG5cdFx0XHRcdGNvbnNvbGUubG9nKCdsb2FkQnJhbmNoZXMgcmVzdWx0OiAnLCB2bS5pbnN0YW5jZXMpO1xuXHRcdFx0XHQvLyB2bS5nZXRJbnN0U3RhdGUoKTtcblx0XHRcdH0sIGZ1bmN0aW9uKGVycil7XG5cdFx0XHRcdGVycm9yU2VydmljZS5zaG93KGVyci5kYXRhLm1lc3NhZ2UpO1xuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0Ly8gZnVuY3Rpb24gZ2V0UGxhbnMoKSB7XG5cdFx0Ly8gXHRhcGkucmVxdWVzdCh7XG5cdFx0Ly8gXHRcdHVybDogJ2dldFBsYW5zJ1xuXHRcdC8vIFx0fSkudGhlbihmdW5jdGlvbihyZXMpe1xuXHRcdC8vIFx0XHR2bS5wbGFucyA9IHJlcy5kYXRhLnJlc3VsdDtcblx0XHQvLyBcdH0sIGZ1bmN0aW9uKGVycil7XG5cdFx0Ly8gXHRcdGVycm9yU2VydmljZS5zaG93KGVyci5kYXRhLm1lc3NhZ2UpO1xuXHRcdC8vIFx0fSk7XG5cdFx0Ly8gfVxuXG5cdH1cblxufSkoKTsiLCJhbmd1bGFyLm1vZHVsZSgnYXBwLmRhc2hib2FyZCcpXG4uY29uZmlnKFsnJHJvdXRlUHJvdmlkZXInLCBmdW5jdGlvbigkcm91dGVQcm92aWRlcil7XG5cblx0JHJvdXRlUHJvdmlkZXJcblx0XHQud2hlbignL2Rhc2hib2FyZCcsIHtcblx0XHRcdHRlbXBsYXRlVXJsOiAnZGFzaGJvYXJkL2Rhc2hib2FyZC5odG1sJyxcblx0XHRcdGNvbnRyb2xsZXI6ICdEYXNoYm9hcmRDb250cm9sbGVyJyxcblx0XHRcdGNvbnRyb2xsZXJBczogJ2Rhc2hWbScsXG5cdFx0XHRyZXNvbHZlOiB7XG5cdFx0XHRcdGxvZ2dlZGluOiBpc0F1dGhvcml6ZWRcblx0XHRcdH1cblx0XHR9KTtcblxufV0pO1xuXG5pc0F1dGhvcml6ZWQuJGluamVjdCA9IFsnYXV0aFNlcnZpY2UnXTtcbmZ1bmN0aW9uIGlzQXV0aG9yaXplZChhdXRoU2VydmljZSkge1xuXHRyZXR1cm4gYXV0aFNlcnZpY2UuaXNBdXRob3JpemVkKCk7XG59IiwiYW5ndWxhclxuLm1vZHVsZSgnYXBwJylcbi5maWx0ZXIoJ2NvbnZlcnRCeXRlcycsIGZ1bmN0aW9uKCkge1xuICByZXR1cm4gZnVuY3Rpb24oaW50ZWdlciwgZnJvbVVuaXRzLCB0b1VuaXRzKSB7XG4gICAgdmFyIGNvZWZmaWNpZW50cyA9IHtcbiAgICAgICAgJ0J5dGUnOiAxLFxuICAgICAgICAnS0InOiAxMDAwLFxuICAgICAgICAnTUInOiAxMDAwMDAwLFxuICAgICAgICAnR0InOiAxMDAwMDAwMDAwXG4gICAgfTtcbiAgICByZXR1cm4gaW50ZWdlciAqIGNvZWZmaWNpZW50c1tmcm9tVW5pdHNdIC8gY29lZmZpY2llbnRzW3RvVW5pdHNdO1xuICB9O1xufSk7IiwiKGZ1bmN0aW9uKCl7XG5cblx0J3VzZSBzdHJpY3QnO1xuXG5cdGFuZ3VsYXJcblx0XHQubW9kdWxlKCdhcHAuaW5zdGFuY2UnKVxuXHRcdC5kaXJlY3RpdmUoJ2luc3RhbmNlU3VtbWFyeScsIGluc3RhbmNlU3VtbWFyeSk7XG5cblx0ZnVuY3Rpb24gaW5zdGFuY2VTdW1tYXJ5KCl7XG5cblx0XHRyZXR1cm4ge1xuXHRcdFx0cmVzdHJpY3Q6ICdBRScsXG5cdFx0XHR0cmFuc2NsdWRlOiB0cnVlLFxuXHRcdFx0c2NvcGU6IHtcblx0XHRcdFx0cGxhbjogJz0nLFxuXHRcdFx0XHRhbW91bnQ6ICc9Jyxcblx0XHRcdFx0Y3VycmVuY3k6ICc9Jyxcblx0XHRcdFx0bWF4bGluZXM6ICc9Jyxcblx0XHRcdFx0bnVtUG9vbDogJz0nLFxuXHRcdFx0XHRzdG9yYWdlOiAnPScsXG5cdFx0XHRcdGluc3RhbmNlOiAnPScsXG5cdFx0XHRcdG5ld0JyYW5jaDogJz0nLFxuXHRcdFx0XHR1cGRhdGU6ICcmJyxcblx0XHRcdFx0cHJvY2VlZDogJyYnXG5cdFx0XHR9LFxuXHRcdFx0dGVtcGxhdGVVcmw6ICdpbnN0YW5jZS9pbnN0YW5jZS1zdW1tYXJ5Lmh0bWwnXG5cdFx0fTtcblxuXHR9XG5cbn0pKCk7IiwiKGZ1bmN0aW9uKCl7XG5cblx0J3VzZSBzdHJpY3QnO1xuXG5cdGFuZ3VsYXJcblx0XHQubW9kdWxlKCdhcHAuaW5zdGFuY2UnKVxuXHRcdC5jb250cm9sbGVyKCdJbnN0YW5jZUNvbnRyb2xsZXInLCBJbnN0YW5jZUNvbnRyb2xsZXIpO1xuXG5cdEluc3RhbmNlQ29udHJvbGxlci4kaW5qZWN0ID0gWyckc2NvcGUnLCAnJHJvdXRlUGFyYW1zJywgJyRsb2NhdGlvbicsICckdHJhbnNsYXRlJywgJyR1aWJNb2RhbCcsICdhcGlTZXJ2aWNlJywgJ2N1c3RvbWVyU2VydmljZScsICdwb29sU2l6ZVNlcnZpY2VzJywgJ2JyYW5jaGVzU2VydmljZScsICdjYXJ0U2VydmljZScsICdub3RpZnlTZXJ2aWNlJywgJ2Vycm9yU2VydmljZScsICdzcGlubmVyU2VydmljZScsICd1dGlsc1NlcnZpY2UnLCAnY29udmVydEJ5dGVzRmlsdGVyJ107XG5cblx0ZnVuY3Rpb24gSW5zdGFuY2VDb250cm9sbGVyKCRzY29wZSwgJHJvdXRlUGFyYW1zLCAkbG9jYXRpb24sICR0cmFuc2xhdGUsICR1aWJNb2RhbCwgYXBpLCBjdXN0b21lclNlcnZpY2UsIHBvb2xTaXplU2VydmljZXMsIGJyYW5jaGVzU2VydmljZSwgY2FydCwgbm90aWZ5U2VydmljZSwgZXJyb3JTZXJ2aWNlLCBzcGlubmVyLCB1dGlscywgY29udmVydEJ5dGVzRmlsdGVyKSB7XG5cblx0XHR2YXIgdm0gPSB0aGlzO1xuXHRcdHZhciBvaWQgPSAkcm91dGVQYXJhbXMub2lkO1xuXHRcdHZhciBjYXJ0SXRlbSA9ICRyb3V0ZVBhcmFtcy5jYXJ0X2l0ZW07XG5cdFx0dmFyIG1pblVzZXJzID0gNDtcblx0XHR2YXIgbWluTGluZXMgPSA4O1xuXG5cdFx0dm0uY3VzdG9tZXIgPSBjdXN0b21lclNlcnZpY2UuZ2V0Q3VzdG9tZXIoKTtcblx0XHR2bS5taW5Vc2VycyA9IG1pblVzZXJzO1xuXHRcdHZtLm1pbkxpbmVzID0gbWluTGluZXM7XG5cdFx0dm0ucGFzc1R5cGUgPSAncGFzc3dvcmQnO1xuXHRcdHZtLnBhc3N3b3JkU3RyZW5ndGggPSAwO1xuXHRcdHZtLm5ld0JyYW5jaCA9IHRydWU7XG5cdFx0Ly8gdm0ubm9UcmlhbCA9IGZhbHNlO1xuXHRcdHZtLnRyaWFsID0gdHJ1ZTtcblx0XHR2bS5wbGFucyA9IFtdO1xuXHRcdHZtLmF2YWlsYWJsZVBsYW5zID0gW107XG5cdFx0dm0uc2VsZWN0ZWRQbGFuID0ge307XG5cdFx0dm0ucHJldlBsYW5JZCA9ICcnO1xuXHRcdHZtLnNpZHMgPSBbXTtcblx0XHR2bS50b3RhbEFtb3VudCA9IDA7XG5cdFx0dm0udG90YWxMaW5lcyA9IDA7XG5cdFx0dm0udG90YWxTdG9yYWdlID0gMDtcblx0XHR2bS5udW1Qb29sID0gJzIwMC0yOTknO1xuXHRcdHZtLnN0b3JhZ2VzID0gWycwJywgJzMwJywgJzEwMCcsICcyNTAnLCAnNTAwJ107XG5cdFx0dm0ubGluZXMgPSBbJzAnLCAnNCcsICc4JywgJzE2JywgJzMwJywgJzYwJywgJzEyMCcsICcyNTAnLCAnNTAwJ107XG5cdFx0dm0ubGFuZ3VhZ2VzID0gW1xuXHRcdFx0e25hbWU6ICdFbmdsaXNoJywgdmFsdWU6ICdlbid9LFxuXHRcdFx0e25hbWU6ICfQo9C60YDQsNGX0L3RgdGM0LrQsCcsIHZhbHVlOiAndWsnfSxcblx0XHRcdHtuYW1lOiAn0KDRg9GB0YHQutC40LknLCB2YWx1ZTogJ3J1J31cblx0XHRdO1xuXHRcdHZtLmFkZE9ucyA9IHtcblx0XHRcdHN0b3JhZ2U6IHtcblx0XHRcdFx0bmFtZTogJ3N0b3JhZ2UnLFxuXHRcdFx0XHRxdWFudGl0eTogJzAnXG5cdFx0XHR9LFxuXHRcdFx0bGluZXM6IHtcblx0XHRcdFx0bmFtZTogJ2xpbmVzJyxcblx0XHRcdFx0cXVhbnRpdHk6ICcwJ1xuXHRcdFx0fVxuXHRcdH07XG5cdFx0dm0uaW5zdGFuY2UgPSB7XG5cdFx0XHRfc3Vic2NyaXB0aW9uOiB7XG5cdFx0XHRcdHBsYW5JZDogJycsXG5cdFx0XHRcdHF1YW50aXR5OiBtaW5Vc2Vycyxcblx0XHRcdFx0YWRkT25zOiBbXVxuXHRcdFx0fSxcblx0XHRcdHJlc3VsdDoge1xuXHRcdFx0XHRsYW5nOiAnZW4nLFxuXHRcdFx0XHRtYXhsaW5lczogOFxuXHRcdFx0fVxuXHRcdH07XG5cblx0XHR2bS5nZW5lcmF0ZVBhc3N3b3JkID0gZ2VuZXJhdGVQYXNzd29yZDtcblx0XHR2bS5yZXZlYWxQYXNzd29yZCA9IHJldmVhbFBhc3N3b3JkO1xuXHRcdHZtLnByb2NlZWQgPSBwcm9jZWVkO1xuXHRcdHZtLnVwZGF0ZSA9IHVwZGF0ZTtcblx0XHR2bS5zZWxlY3RQbGFuID0gc2VsZWN0UGxhbjtcblx0XHR2bS5zZWxlY3RTZXJ2ZXIgPSBzZWxlY3RTZXJ2ZXI7XG5cdFx0dm0ucGx1c1VzZXIgPSBmdW5jdGlvbigpIHtcblx0XHRcdHJldHVybiB2bS5pbnN0YW5jZS5fc3Vic2NyaXB0aW9uLnF1YW50aXR5ICs9IDE7XG5cdFx0fTtcblx0XHR2bS5taW51c1VzZXIgPSBmdW5jdGlvbigpIHtcblx0XHRcdGlmKHZtLmluc3RhbmNlLl9zdWJzY3JpcHRpb24ucXVhbnRpdHkgPiBtaW5Vc2Vycykge1xuXHRcdFx0XHR2bS5pbnN0YW5jZS5fc3Vic2NyaXB0aW9uLnF1YW50aXR5IC09IDE7XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gdm0uaW5zdGFuY2UuX3N1YnNjcmlwdGlvbi5xdWFudGl0eTtcblx0XHR9O1xuXHRcdHZtLnNob3dQbGFucyA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0JHVpYk1vZGFsLm9wZW4oe1xuXHRcdFx0XHR0ZW1wbGF0ZVVybDogJ2Fzc2V0cy9wYXJ0aWFscy9jb21wYXJlLXBsYW5zLmh0bWwnLFxuXHRcdFx0XHRzaXplOiAnbGcnXG5cdFx0XHR9KTtcblx0XHR9O1xuXG5cdFx0JHNjb3BlLiR3YXRjaChmdW5jdGlvbigpIHtcblx0XHRcdHJldHVybiB2bS5pbnN0YW5jZS5fc3Vic2NyaXB0aW9uLnF1YW50aXR5O1xuXHRcdH0sIGZ1bmN0aW9uKHZhbCkge1xuXHRcdFx0XG5cdFx0XHRpZighdmFsKSB7XG5cdFx0XHRcdHZtLmluc3RhbmNlLl9zdWJzY3JpcHRpb24ucXVhbnRpdHkgPSBtaW5Vc2Vycztcblx0XHRcdH1cblxuXHRcdFx0aWYodm0uc2VsZWN0ZWRQbGFuLnBsYW5JZCA9PT0gJ3RyaWFsJyB8fCB2bS5zZWxlY3RlZFBsYW4ucGxhbklkID09PSAnZnJlZScpIHtcblx0XHRcdFx0dm0uaW5zdGFuY2UuX3N1YnNjcmlwdGlvbi5xdWFudGl0eSA9IG1pblVzZXJzO1xuXHRcdFx0fVxuXG5cdFx0XHR0b3RhbFN0b3JhZ2UoKTtcblx0XHRcdHRvdGFsQW1vdW50KCk7XG5cdFx0fSk7XG5cdFx0XG5cdFx0JHNjb3BlLiR3YXRjaChmdW5jdGlvbigpIHtcblx0XHRcdHJldHVybiB2bS5hZGRPbnMubGluZXMucXVhbnRpdHk7XG5cdFx0fSwgZnVuY3Rpb24odmFsKSB7XG5cdFx0XHQvLyB2bS5pbnN0YW5jZS5fc3Vic2NyaXB0aW9uLmFkZE9ucy5saW5lcy5xdWFudGl0eSA9IHBhcnNlSW50KHZhbCwgMTApO1xuXHRcdFx0dG90YWxMaW5lcygpO1xuXHRcdFx0dG90YWxBbW91bnQoKTtcblx0XHR9KTtcblxuXHRcdCRzY29wZS4kd2F0Y2goZnVuY3Rpb24oKSB7XG5cdFx0XHRyZXR1cm4gdm0uYWRkT25zLnN0b3JhZ2UucXVhbnRpdHk7XG5cdFx0fSwgZnVuY3Rpb24odmFsKSB7XG5cdFx0XHQvLyB2bS5pbnN0YW5jZS5fc3Vic2NyaXB0aW9uLmFkZE9ucy5zdG9yYWdlLnF1YW50aXR5ID0gcGFyc2VJbnQodmFsLCAxMCk7XG5cdFx0XHR0b3RhbFN0b3JhZ2UoKTtcblx0XHRcdHRvdGFsQW1vdW50KCk7XG5cdFx0fSk7XG5cblx0XHQkc2NvcGUuJHdhdGNoKGZ1bmN0aW9uKCkge1xuXHRcdFx0cmV0dXJuIHZtLmluc3RhbmNlLl9zdWJzY3JpcHRpb24ucGxhbklkO1xuXHRcdH0sIGZ1bmN0aW9uKHZhbCwgcHJldikge1xuXHRcdFx0dm0ucGxhbnMuZm9yRWFjaChmdW5jdGlvbihpdGVtKSB7XG5cdFx0XHRcdGlmKGl0ZW0ucGxhbklkID09PSB2bS5pbnN0YW5jZS5fc3Vic2NyaXB0aW9uLnBsYW5JZCkge1xuXHRcdFx0XHRcdHZtLnNlbGVjdGVkUGxhbiA9IGl0ZW07XG5cdFx0XHRcdFx0aWYoaXRlbS5wbGFuSWQgPT09ICd0cmlhbCcgfHwgaXRlbS5wbGFuSWQgPT09ICdmcmVlJykge1xuXHRcdFx0XHRcdFx0Ly8gdm0udHJpYWwgPSB0cnVlO1xuXHRcdFx0XHRcdFx0dm0uaW5zdGFuY2UuX3N1YnNjcmlwdGlvbi5xdWFudGl0eSA9IG1pblVzZXJzO1xuXHRcdFx0XHRcdFx0dm0uaW5zdGFuY2UubWF4bGluZXMgPSBtaW5MaW5lcztcblx0XHRcdFx0XHRcdHZtLmFkZE9ucy5saW5lcy5xdWFudGl0eSA9ICcwJztcblx0XHRcdFx0XHRcdHZtLmFkZE9ucy5zdG9yYWdlLnF1YW50aXR5ID0gJzAnO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHQvLyB2bS50cmlhbCA9IGZhbHNlO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdHRvdGFsQW1vdW50KCk7XG5cdFx0XHRcdFx0dG90YWxTdG9yYWdlKCk7XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXHRcdFx0dm0ucHJldlBsYW5JZCA9IHByZXY7XG5cdFx0XHRjb25zb2xlLmxvZygncHJldlBsYW5JZDogJywgdm0ucHJldlBsYW5JZCk7XG5cdFx0fSk7XG5cblx0XHQkc2NvcGUuJG9uKCckdmlld0NvbnRlbnRMb2FkZWQnLCBmdW5jdGlvbigpe1xuXHRcdFx0c3Bpbm5lci5zaG93KCdwbGFucy1zcGlubmVyJyk7XG5cdFx0XHRzcGlubmVyLnNob3coJ3NlcnZlcnMtc3Bpbm5lcicpO1xuXHRcdH0pO1xuXG5cdFx0Z2V0UGxhbnMoKTtcblx0XHRnZXRTZXJ2ZXJzKCk7XG5cblx0XHRmdW5jdGlvbiBnZXRQbGFucygpIHtcblx0XHRcdFxuXHRcdFx0aWYoYnJhbmNoZXNTZXJ2aWNlLmdldFBsYW5zKCkubGVuZ3RoKSB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKCdnZXRQbGFuczonLCBicmFuY2hlc1NlcnZpY2UuZ2V0UGxhbnMoKSk7XG5cdFx0XHRcdHZtLnBsYW5zID0gYnJhbmNoZXNTZXJ2aWNlLmdldFBsYW5zKCk7XG5cblx0XHRcdFx0c3Bpbm5lci5oaWRlKCdwbGFucy1zcGlubmVyJyk7XG5cdFx0XHRcdGluaXQoKTtcblxuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdGFwaS5yZXF1ZXN0KHtcblx0XHRcdFx0dXJsOiAnZ2V0UGxhbnMnXG5cdFx0XHR9KS50aGVuKGZ1bmN0aW9uKHJlcyl7XG5cdFx0XHRcdHZtLnBsYW5zID0gcmVzLmRhdGEucmVzdWx0O1xuXHRcdFx0XHR2bS5wbGFucy5mb3JFYWNoKGZ1bmN0aW9uKGl0ZW0pe1xuXHRcdFx0XHRcdGl0ZW0uYWRkT25zID0gdXRpbHMuYXJyYXlUb09iamVjdChpdGVtLmFkZE9ucywgJ25hbWUnKTtcblx0XHRcdFx0fSk7XG5cdFx0XHRcdGNvbnNvbGUubG9nKCdnZXRQbGFuczonLCB2bS5wbGFucyk7XG5cblx0XHRcdFx0YnJhbmNoZXNTZXJ2aWNlLnNldFBsYW5zKHZtLnBsYW5zKTtcblxuXHRcdFx0XHRpbml0KCk7XG5cdFx0XHRcdFxuXHRcdFx0fSwgZnVuY3Rpb24oZXJyKXtcblx0XHRcdFx0ZXJyb3JTZXJ2aWNlLnNob3coZXJyLmRhdGEubWVzc2FnZSk7XG5cdFx0XHR9KTtcblx0XHR9XG5cblx0XHRmdW5jdGlvbiBnZXRTZXJ2ZXJzKCkge1xuXG5cdFx0XHRpZihicmFuY2hlc1NlcnZpY2UuZ2V0U2VydmVycygpLmxlbmd0aCkge1xuXHRcdFx0XHR2bS5zaWRzID0gYnJhbmNoZXNTZXJ2aWNlLmdldFNlcnZlcnMoKTtcblx0XHRcdFx0aWYob2lkID09PSAnbmV3Jykgdm0uaW5zdGFuY2Uuc2lkID0gdm0uc2lkc1swXS5faWQ7XG5cdFx0XHRcdHNwaW5uZXIuaGlkZSgnc2VydmVycy1zcGlubmVyJyk7XG5cdFx0XHRcdFxuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdGFwaS5yZXF1ZXN0KHtcblx0XHRcdFx0dXJsOiAnZ2V0U2VydmVycydcblx0XHRcdH0pLnRoZW4oZnVuY3Rpb24ocmVzKXtcblx0XHRcdFx0dm0uc2lkcyA9IHJlcy5kYXRhLnJlc3VsdDtcblx0XHRcdFx0YnJhbmNoZXNTZXJ2aWNlLnNldFNlcnZlcnModm0uc2lkcyk7XG5cblx0XHRcdFx0aWYob2lkID09PSAnbmV3Jykgdm0uaW5zdGFuY2Uuc2lkID0gdm0uc2lkc1swXS5faWQ7XG5cdFx0XHRcdHNwaW5uZXIuaGlkZSgnc2VydmVycy1zcGlubmVyJyk7XG5cdFx0XHR9LCBmdW5jdGlvbihlcnIpe1xuXHRcdFx0XHRlcnJvclNlcnZpY2Uuc2hvdyhlcnIuZGF0YS5tZXNzYWdlKTtcblx0XHRcdH0pO1xuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIGluaXQoKSB7XG5cdFx0XHRpZihvaWQgIT09ICduZXcnKXtcblxuXHRcdFx0XHRicmFuY2hlc1NlcnZpY2UuZ2V0KG9pZCwgZnVuY3Rpb24gKGJyYW5jaCl7XG5cdFx0XHRcdFx0aWYoYnJhbmNoKSB7XG5cdFx0XHRcdFx0XHRzZXRCcmFuY2goYW5ndWxhci5tZXJnZSh7fSwgYnJhbmNoKSk7XG5cdFx0XHRcdFx0XHR2bS5hdmFpbGFibGVQbGFucyA9IHZtLnBsYW5zLmZpbHRlcihpc1BsYW5BdmFpbGFibGUpO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRhcGkucmVxdWVzdCh7IHVybDogJ2dldEJyYW5jaC8nK29pZCB9KS50aGVuKGZ1bmN0aW9uIChyZXMpe1xuXHRcdFx0XHRcdFx0XHRzZXRCcmFuY2gocmVzLmRhdGEucmVzdWx0KTtcblx0XHRcdFx0XHRcdFx0dm0uYXZhaWxhYmxlUGxhbnMgPSB2bS5wbGFucy5maWx0ZXIoaXNQbGFuQXZhaWxhYmxlKTtcblx0XHRcdFx0XHRcdH0sIGZ1bmN0aW9uIChlcnIpe1xuXHRcdFx0XHRcdFx0XHRlcnJvclNlcnZpY2Uuc2hvdyhlcnIpO1xuXHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdHNwaW5uZXIuaGlkZSgncGxhbnMtc3Bpbm5lcicpO1xuXHRcdFx0XHR9KTtcblxuXHRcdFx0XHR2bS5uZXdCcmFuY2ggPSBmYWxzZTtcblxuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0dm0ubmV3QnJhbmNoID0gdHJ1ZTtcblx0XHRcdFx0dm0ubnVtUG9vbCA9ICcyMDAtMjk5Jztcblx0XHRcdFx0dm0uaW5zdGFuY2UuX3N1YnNjcmlwdGlvbi5wbGFuSWQgPSAnc3RhbmRhcmQnO1xuXHRcdFx0XHR2bS5hdmFpbGFibGVQbGFucyA9IHZtLnBsYW5zO1xuXG5cdFx0XHRcdGlmKGNhcnRJdGVtICYmIGNhcnQuZ2V0KGNhcnRJdGVtKSkge1xuXHRcdFx0XHRcdHNldEJyYW5jaChjYXJ0LmdldChjYXJ0SXRlbSkuZGF0YSk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRhcGkucmVxdWVzdCh7XG5cdFx0XHRcdFx0dXJsOiAnY2FuQ3JlYXRlVHJpYWxTdWInXG5cdFx0XHRcdH0pLnRoZW4oZnVuY3Rpb24ocmVzKXtcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnY2FuQ3JlYXRlVHJpYWxTdWI6ICcsIHJlcy5kYXRhKTtcblx0XHRcdFx0XHRpZihyZXMuZGF0YS5yZXN1bHQpIHZtLnRyaWFsID0gdHJ1ZTtcblx0XHRcdFx0XHRlbHNlIHZtLnRyaWFsID0gZmFsc2U7XG5cdFx0XHRcdFx0c3Bpbm5lci5oaWRlKCdwbGFucy1zcGlubmVyJyk7XG5cdFx0XHRcdH0sIGZ1bmN0aW9uKGVycil7XG5cdFx0XHRcdFx0ZXJyb3JTZXJ2aWNlLnNob3coZXJyLmRhdGEubWVzc2FnZSk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIHByb2NlZWQoYWN0aW9uKXtcblxuXHRcdFx0dmFyIGJyYW5jaFNldHRzID0gZ2V0QnJhbmNoU2V0dHMoKTtcblx0XHRcdGNvbnNvbGUubG9nKCdwcm9jZWVkOiAnLCBicmFuY2hTZXR0cyk7XG5cdFx0XHRpZighYnJhbmNoU2V0dHMpIHtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBQcm9oaWJpdCBkb3duZ3JhZGUgaWYgcGxhbidzIHN0b3JlbGltaXQgXG5cdFx0XHQvLyBpcyBsZXNzIHRoYW4gYnJhbmNoIGlzIGFscmVhZHkgdXRpbGl6ZWRcblx0XHRcdGlmKGJyYW5jaFNldHRzLnJlc3VsdC5zdG9yZWxpbWl0IDwgYnJhbmNoU2V0dHMucmVzdWx0LnN0b3Jlc2l6ZSkge1xuXHRcdFx0XHQkdHJhbnNsYXRlKCdFUlJPUlMuRE9XTkdSQURFX0VSUk9SX1NUT1JBR0UnKVxuXHRcdFx0XHQudGhlbihmdW5jdGlvbih0cmFuc2xhdGlvbil7XG5cdFx0XHRcdFx0YWxlcnQodHJhbnNsYXRpb24pO1xuXHRcdFx0XHR9KTtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXHRcdFx0Ly8gUHJvaGliaXQgZG93bmdyYWRlIGlmIHRoZSBuZXcgbnViZXIgb2YgbWF4dXNlcnMgXG5cdFx0XHQvLyBpcyBsZXNzIHRoYW4gdGhlIG51bWJlciBvZiBjcmVhdGVkIHVzZXJzIGluIGJyYW5jaFxuXHRcdFx0aWYoYnJhbmNoU2V0dHMuX3N1YnNjcmlwdGlvbi5xdWFudGl0eSA8IGJyYW5jaFNldHRzLnJlc3VsdC51c2Vycykge1xuXHRcdFx0XHQkdHJhbnNsYXRlKCdFUlJPUlMuRE9XTkdSQURFX0VSUk9SX1VTRVJTJylcblx0XHRcdFx0LnRoZW4oZnVuY3Rpb24odHJhbnNsYXRpb24pe1xuXHRcdFx0XHRcdGFsZXJ0KHRyYW5zbGF0aW9uKTtcblx0XHRcdFx0fSk7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0dmFyIGFjdGlvblN0ciA9ICcnOyBcblx0XHRcdGlmKGFjdGlvbiA9PT0gJ2NyZWF0ZVN1YnNjcmlwdGlvbicpIHtcblx0XHRcdFx0YWN0aW9uU3RyID0gJ05FV19TVUJTQ1JJUFRJT04nO1xuXHRcdFx0fSBlbHNlIGlmKGFjdGlvbiA9PT0gJ3VwZGF0ZVN1YnNjcmlwdGlvbicpIHtcblx0XHRcdFx0YWN0aW9uU3RyID0gJ1VQREFURV9TVUJTQ1JJUFRJT04nO1xuXHRcdFx0fVxuXG5cdFx0XHQkdHJhbnNsYXRlKCdERVNDUklQVElPTlMuJythY3Rpb25TdHIsIHtcblx0XHRcdFx0cGxhbklkOiBicmFuY2hTZXR0cy5fc3Vic2NyaXB0aW9uLnBsYW5JZCxcblx0XHRcdFx0dXNlcnM6IGJyYW5jaFNldHRzLl9zdWJzY3JpcHRpb24ucXVhbnRpdHksXG5cdFx0XHRcdG1heGxpbmVzOiBicmFuY2hTZXR0cy5yZXN1bHQubWF4bGluZXMsXG5cdFx0XHRcdGNvbXBhbnk6IGJyYW5jaFNldHRzLnJlc3VsdC5uYW1lXG5cdFx0XHR9KVxuXHRcdFx0LnRoZW4oZnVuY3Rpb24gKGRlc2NyaXB0aW9uKSB7XG5cdFx0XHRcdFxuXHRcdFx0XHRicmFuY2hTZXR0cy5fc3Vic2NyaXB0aW9uLmRlc2NyaXB0aW9uID0gZGVzY3JpcHRpb247XG5cblx0XHRcdFx0aWYoY2FydEl0ZW0pIHtcblx0XHRcdFx0XHRjYXJ0LnVwZGF0ZShicmFuY2hTZXR0cy5yZXN1bHQucHJlZml4LCB7XG5cdFx0XHRcdFx0XHRhY3Rpb246IGFjdGlvbixcblx0XHRcdFx0XHRcdGRlc2NyaXB0aW9uOiBkZXNjcmlwdGlvbixcblx0XHRcdFx0XHRcdGFtb3VudDogdm0udG90YWxBbW91bnQsXG5cdFx0XHRcdFx0XHRkYXRhOiBicmFuY2hTZXR0c1xuXHRcdFx0XHRcdH0pO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdC8vIGNhcnRbKHZtLmN1c3RvbWVyLnJvbGUgPT09ICd1c2VyJyA/ICdzZXQnIDogJ2FkZCcpXS5hZGQoe1xuXHRcdFx0XHRcdGNhcnRbKHZtLmN1c3RvbWVyLnJvbGUgPT09ICd1c2VyJyA/ICdzZXQnIDogJ2FkZCcpXSh7XG5cdFx0XHRcdFx0XHRhY3Rpb246IGFjdGlvbixcblx0XHRcdFx0XHRcdGRlc2NyaXB0aW9uOiBkZXNjcmlwdGlvbixcblx0XHRcdFx0XHRcdGFtb3VudDogdm0udG90YWxBbW91bnQsXG5cdFx0XHRcdFx0XHRkYXRhOiBicmFuY2hTZXR0c1xuXHRcdFx0XHRcdH0pO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0JGxvY2F0aW9uLnBhdGgoJy9wYXltZW50Jyk7XG5cdFx0XHR9KTtcblx0XHR9XG5cblx0XHRmdW5jdGlvbiB1cGRhdGUoKXtcblxuXHRcdFx0dmFyIGJyYW5jaFNldHRzID0gZ2V0QnJhbmNoU2V0dHMoKSxcblx0XHRcdFx0YmFsYW5jZSxcblx0XHRcdFx0cGxhblByaWNlLFxuXHRcdFx0XHRwbGFuQW1vdW50LFxuXHRcdFx0XHRiaWxsaW5nQ3lyY2xlcztcblxuXG5cdFx0XHRpZighYnJhbmNoU2V0dHMpIHtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBQcm9oaWJpdCBkb3duZ3JhZGUgaWYgcGxhbidzIHN0b3JlbGltaXQgXG5cdFx0XHQvLyBpcyBsZXNzIHRoYW4gYnJhbmNoIGlzIGFscmVhZHkgdXRpbGl6ZWRcblx0XHRcdGlmKGJyYW5jaFNldHRzLnJlc3VsdC5zdG9yZWxpbWl0IDwgYnJhbmNoU2V0dHMucmVzdWx0LnN0b3Jlc2l6ZSkge1xuXHRcdFx0XHQkdHJhbnNsYXRlKCdFUlJPUlMuRE9XTkdSQURFX0VSUk9SX1NUT1JBR0UnKVxuXHRcdFx0XHQudGhlbihmdW5jdGlvbih0cmFuc2xhdGlvbil7XG5cdFx0XHRcdFx0YWxlcnQodHJhbnNsYXRpb24pO1xuXHRcdFx0XHR9KTtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXHRcdFx0Ly8gUHJvaGliaXQgZG93bmdyYWRlIGlmIHRoZSBuZXcgbnViZXIgb2YgbWF4dXNlcnMgXG5cdFx0XHQvLyBpcyBsZXNzIHRoYW4gdGhlIG51bWJlciBvZiBjcmVhdGVkIHVzZXJzIGluIGJyYW5jaFxuXHRcdFx0aWYoYnJhbmNoU2V0dHMuX3N1YnNjcmlwdGlvbi5xdWFudGl0eSA8IGJyYW5jaFNldHRzLnJlc3VsdC51c2Vycykge1xuXHRcdFx0XHQkdHJhbnNsYXRlKCdFUlJPUlMuRE9XTkdSQURFX0VSUk9SX1VTRVJTJylcblx0XHRcdFx0LnRoZW4oZnVuY3Rpb24odHJhbnNsYXRpb24pe1xuXHRcdFx0XHRcdGFsZXJ0KHRyYW5zbGF0aW9uKTtcblx0XHRcdFx0fSk7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0YmFsYW5jZSA9IHBhcnNlRmxvYXQodm0uY3VzdG9tZXIuYmFsYW5jZSk7XG5cdFx0XHRwbGFuUHJpY2UgPSBwYXJzZUZsb2F0KHZtLnNlbGVjdGVkUGxhbi5wcmljZSk7XG5cdFx0XHRwbGFuQW1vdW50ID0gcGFyc2VGbG9hdCh2bS50b3RhbEFtb3VudCk7XG5cdFx0XHRiaWxsaW5nQ3lyY2xlcyA9IGJyYW5jaFNldHRzLl9zdWJzY3JpcHRpb24uYmlsbGluZ0N5cmNsZXM7XG5cblx0XHRcdGlmKGJhbGFuY2UgPCBwbGFuQW1vdW50IHx8ICh2bS5wcmV2UGxhbklkICYmIGJyYW5jaFNldHRzLl9zdWJzY3JpcHRpb24ucGxhbklkICE9PSB2bS5wcmV2UGxhbklkKSkge1xuXG5cdFx0XHRcdHByb2NlZWQoJ3VwZGF0ZVN1YnNjcmlwdGlvbicpO1xuXHRcdFx0XHRyZXR1cm47XG5cblx0XHRcdH1cblxuXHRcdFx0YXBpLnJlcXVlc3Qoe1xuXHRcdFx0XHR1cmw6ICd1cGRhdGVTdWJzY3JpcHRpb24nLFxuXHRcdFx0XHRwYXJhbXM6IGJyYW5jaFNldHRzXG5cdFx0XHR9KS50aGVuKGZ1bmN0aW9uKHJlc3VsdCl7XG5cdFx0XHRcdGNvbnNvbGUubG9nKCd1cGRhdGVTdWJzY3JpcHRpb24gcmVzdWx0OyAnLCByZXN1bHQpO1xuXHRcdFx0XHRjb25zb2xlLmxvZygndXBkYXRlU3Vic2NyaXB0aW9uIGJyYW5jaFNldHRzOyAnLCBicmFuY2hTZXR0cyk7XG5cdFx0XHRcdGJyYW5jaGVzU2VydmljZS51cGRhdGUoYnJhbmNoU2V0dHMub2lkLCBicmFuY2hTZXR0cyk7XG5cdFx0XHRcdG5vdGlmeVNlcnZpY2Uuc2hvdygnQUxMX0NIQU5HRVNfU0FWRUQnKTtcblx0XHRcdH0sIGZ1bmN0aW9uKGVycil7XG5cdFx0XHRcdGNvbnNvbGUubG9nKGVycik7XG5cdFx0XHRcdGlmKGVyci5kYXRhLm1lc3NhZ2UgPT09ICdFUlJPUlMuTk9UX0VOT1VHSF9DUkVESVRTJykge1xuXHRcdFx0XHRcdFxuXHRcdFx0XHRcdHByb2NlZWQoJ3VwZGF0ZVN1YnNjcmlwdGlvbicpO1xuXG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0ZXJyb3JTZXJ2aWNlLnNob3coZXJyKTtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0fVxuXHRcdFxuXHRcdGZ1bmN0aW9uIHNldEJyYW5jaChvcHRzKSB7XG5cdFx0XHR2bS5pbnN0YW5jZSA9IG9wdHM7XG5cdFx0XHR2bS5pbml0TmFtZSA9IG9wdHMucmVzdWx0Lm5hbWU7XG5cblx0XHRcdGlmKG9wdHMucmVzdWx0LmV4dGVuc2lvbnMpIHtcblx0XHRcdFx0dm0ubnVtUG9vbCA9IHBvb2xTaXplU2VydmljZXMucG9vbEFycmF5VG9TdHJpbmcob3B0cy5yZXN1bHQuZXh0ZW5zaW9ucyk7XG5cdFx0XHR9XG5cdFx0XHRcblx0XHRcdC8vIGlmKG9wdHMuX3N1YnNjcmlwdGlvbi5wbGFuSWQgJiYgb3B0cy5fc3Vic2NyaXB0aW9uLnBsYW5JZCAhPT0gJ3RyaWFsJyAmJiBvcHRzLl9zdWJzY3JpcHRpb24ucGxhbklkICE9PSAnZnJlZScpIHtcblx0XHRcdC8vIFx0dm0ubm9UcmlhbCA9IHRydWU7XG5cdFx0XHQvLyB9XG5cblx0XHRcdGlmKG9wdHMuX3N1YnNjcmlwdGlvbi5hZGRPbnMubGVuZ3RoKSB7XG5cdFx0XHRcdHZtLmFkZE9ucyA9IHV0aWxzLmFycmF5VG9PYmplY3Qob3B0cy5fc3Vic2NyaXB0aW9uLmFkZE9ucywgJ25hbWUnKTtcblx0XHRcdH1cblxuXHRcdFx0dm0uc3RvcmFnZXMuZm9yRWFjaChmdW5jdGlvbihpdGVtLCBpbmRleCwgYXJyYXkpe1xuXHRcdFx0XHRpZihpdGVtICE9PSAnMCcgJiYgcGFyc2VJbnQoaXRlbSwgMTApIDwgb3B0cy5yZXN1bHQuc3RvcmVzaXplKSBhcnJheS5zcGxpY2UoaW5kZXgsIDEpO1xuXHRcdFx0fSk7XG5cblx0XHRcdGNvbnNvbGUubG9nKCdzZXRCcmFuY2g6ICcsIHZtLmluc3RhbmNlKTtcblx0XHR9XG5cblx0XHRmdW5jdGlvbiBnZXRCcmFuY2hTZXR0cygpIHtcblx0XHRcdHZhciBhZGRPbnMgPSBbXTtcblxuXHRcdFx0aWYoIXZtLmluc3RhbmNlLl9zdWJzY3JpcHRpb24ucGxhbklkIHx8ICF2bS5pbnN0YW5jZS5yZXN1bHQucHJlZml4IHx8ICF2bS5udW1Qb29sIHx8ICF2bS5pbnN0YW5jZS5yZXN1bHQubmFtZSB8fCAoIXZtLmluc3RhbmNlLnJlc3VsdC5hZG1pbnBhc3MgJiYgdm0ubmV3QnJhbmNoKSkge1xuXHRcdFx0XHRlcnJvclNlcnZpY2Uuc2hvdygnTUlTU0lOR19GSUVMRFMnKTtcblx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0fVxuXG5cdFx0XHRjb25zb2xlLmxvZygncGFzczogJywgdm0uaW5zdGFuY2UucmVzdWx0LmFkbWlucGFzcywgdm0uY29uZmlybVBhc3MpO1xuXHRcdFx0aWYodm0uaW5zdGFuY2UucmVzdWx0LmFkbWlucGFzcyAmJiAodm0uY29uZmlybVBhc3MgIT09IHZtLmluc3RhbmNlLnJlc3VsdC5hZG1pbnBhc3MpKXtcblx0XHRcdFx0ZXJyb3JTZXJ2aWNlLnNob3coJ1BBU1NXT1JEX05PVF9DT05GSVJNRUQnKTtcblx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0fVxuXG5cdFx0XHR2bS5pbnN0YW5jZS5yZXN1bHQuZXh0ZW5zaW9ucyA9IHBvb2xTaXplU2VydmljZXMucG9vbFN0cmluZ1RvT2JqZWN0KHZtLm51bVBvb2wpO1xuXHRcdFx0dm0uaW5zdGFuY2UucmVzdWx0Lm1heGxpbmVzID0gdm0udG90YWxMaW5lcztcblx0XHRcdHZtLmluc3RhbmNlLnJlc3VsdC5hZG1pbm5hbWUgPSB2bS5pbnN0YW5jZS5yZXN1bHQucHJlZml4O1xuXHRcdFx0dm0uaW5zdGFuY2UucmVzdWx0LnN0b3JlbGltaXQgPSBjb252ZXJ0Qnl0ZXNGaWx0ZXIodm0udG90YWxTdG9yYWdlLCAnR0InLCAnQnl0ZScpO1xuXHRcdFx0aWYob2lkKSB2bS5pbnN0YW5jZS5vaWQgPSBvaWQ7XG5cblx0XHRcdGFuZ3VsYXIuZm9yRWFjaCh2bS5hZGRPbnMsIGZ1bmN0aW9uKHZhbHVlLCBrZXkpe1xuXHRcdFx0XHRhZGRPbnMucHVzaCh2YWx1ZSk7XG5cdFx0XHR9KTtcblxuXHRcdFx0dm0uaW5zdGFuY2UuX3N1YnNjcmlwdGlvbi5hZGRPbnMgPSBhZGRPbnM7XG5cblx0XHRcdHJldHVybiB2bS5pbnN0YW5jZTtcblx0XHR9XG5cblx0XHRmdW5jdGlvbiBzZWxlY3RQbGFuKHBsYW4pIHtcblx0XHRcdHZtLmluc3RhbmNlLl9zdWJzY3JpcHRpb24ucGxhbklkID0gcGxhbi5wbGFuSWQ7XG5cdFx0XHR2bS5pbnN0YW5jZS5fc3Vic2NyaXB0aW9uLm51bUlkID0gcGxhbi5udW1JZDtcblx0XHR9XG5cblx0XHRmdW5jdGlvbiBpc1BsYW5BdmFpbGFibGUocGxhbikge1xuXHRcdFx0Y29uc29sZS5sb2coJ2lzUGxhbkF2YWlsYWJsZTogJywgcGxhbi5udW1JZCA+PSB2bS5pbnN0YW5jZS5fc3Vic2NyaXB0aW9uLm51bUlkKTtcblx0XHRcdGlmKHBsYW4ubnVtSWQgPj0gdm0uaW5zdGFuY2UuX3N1YnNjcmlwdGlvbi5udW1JZCkge1xuXHRcdFx0XHRyZXR1cm4gcGxhbjtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRmdW5jdGlvbiBzZWxlY3RTZXJ2ZXIoc2lkKSB7XG5cdFx0XHR2bS5pbnN0YW5jZS5zaWQgPSBzaWQ7XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gdG90YWxBbW91bnQoKSB7XG5cdFx0XHR2YXIgc3ViID0gdm0uaW5zdGFuY2UuX3N1YnNjcmlwdGlvbjtcblx0XHRcdHZtLnRvdGFsQW1vdW50ID0gc3ViLnF1YW50aXR5ICogcGFyc2VGbG9hdCh2bS5zZWxlY3RlZFBsYW4ucHJpY2UpO1xuXG5cdFx0XHRpZih2bS5zZWxlY3RlZFBsYW4uYWRkT25zICYmIE9iamVjdC5rZXlzKHZtLnNlbGVjdGVkUGxhbi5hZGRPbnMpLmxlbmd0aCkge1xuXHRcdFx0XHR2bS50b3RhbEFtb3VudCArPSB2bS5hZGRPbnMuc3RvcmFnZS5xdWFudGl0eSAqIHBhcnNlRmxvYXQodm0uc2VsZWN0ZWRQbGFuLmFkZE9ucy5zdG9yYWdlLnByaWNlKTtcblx0XHRcdFx0dm0udG90YWxBbW91bnQgKz0gdm0uYWRkT25zLmxpbmVzLnF1YW50aXR5ICogcGFyc2VGbG9hdCh2bS5zZWxlY3RlZFBsYW4uYWRkT25zLmxpbmVzLnByaWNlKTtcblx0XHRcdH1cblx0XHRcdHZtLnRvdGFsQW1vdW50ID0gdm0udG90YWxBbW91bnQudG9GaXhlZCgyKTtcblx0XHR9XG5cblx0XHRmdW5jdGlvbiB0b3RhbFN0b3JhZ2UoKSB7XG5cdFx0XHR2YXIgc3ViID0gdm0uaW5zdGFuY2UuX3N1YnNjcmlwdGlvbjtcblx0XHRcdGlmKHZtLnNlbGVjdGVkUGxhbi5jdXN0b21EYXRhKSB7XG5cdFx0XHRcdHZtLnRvdGFsU3RvcmFnZSA9IHN1Yi5xdWFudGl0eSAqIHBhcnNlRmxvYXQodm0uc2VsZWN0ZWRQbGFuLmN1c3RvbURhdGEuc3RvcmFnZXBlcnVzZXIpO1xuXHRcdFx0fVxuXHRcdFx0aWYodm0uYWRkT25zLnN0b3JhZ2UpIHtcblx0XHRcdFx0dm0udG90YWxTdG9yYWdlICs9IHBhcnNlSW50KHZtLmFkZE9ucy5zdG9yYWdlLnF1YW50aXR5LCAxMCk7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gdG90YWxMaW5lcygpIHtcblx0XHRcdHZhciBzdWIgPSB2bS5pbnN0YW5jZS5fc3Vic2NyaXB0aW9uO1xuXHRcdFx0dm0udG90YWxMaW5lcyA9IHN1Yi5xdWFudGl0eSAqIDI7XG5cdFx0XHRpZih2bS5hZGRPbnMubGluZXMpIHtcblx0XHRcdFx0dm0udG90YWxMaW5lcyArPSBwYXJzZUludCh2bS5hZGRPbnMubGluZXMucXVhbnRpdHksIDEwKTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRmdW5jdGlvbiBnZW5lcmF0ZVBhc3N3b3JkKG1pbiwgbWF4KSB7XG5cdFx0XHR2YXIgbmV3UGFzcyA9ICcnO1xuXHRcdFx0d2hpbGUoIXV0aWxzLmNoZWNrUGFzc3dvcmRTdHJlbmd0aChuZXdQYXNzKSkge1xuXHRcdFx0XHRuZXdQYXNzID0gdXRpbHMuZ2VuZXJhdGVQYXNzd29yZChtaW4sIG1heCk7XG5cdFx0XHR9XG5cdFx0XHR2bS5pbnN0YW5jZS5yZXN1bHQuYWRtaW5wYXNzID0gbmV3UGFzcztcblx0XHRcdHZtLmNvbmZpcm1QYXNzID0gbmV3UGFzcztcblx0XHR9XG5cblx0XHRmdW5jdGlvbiByZXZlYWxQYXNzd29yZCgpIHtcblx0XHRcdHZtLnBhc3NUeXBlID0gdm0ucGFzc1R5cGUgPT09ICd0ZXh0JyA/ICdwYXNzd29yZCcgOiAndGV4dCc7XG5cdFx0fVxuXG5cdH1cblxufSkoKTsiLCJhbmd1bGFyLm1vZHVsZSgnYXBwLmluc3RhbmNlJylcbi5jb25maWcoWyckcm91dGVQcm92aWRlcicsIGZ1bmN0aW9uKCRyb3V0ZVByb3ZpZGVyKXtcblxuXHQkcm91dGVQcm92aWRlclxuXHRcdC53aGVuKCcvaW5zdGFuY2UvOm9pZCcsIHtcblx0XHRcdHRlbXBsYXRlVXJsOiAnaW5zdGFuY2UvaW5zdGFuY2UuaHRtbCcsXG5cdFx0XHRjb250cm9sbGVyOiAnSW5zdGFuY2VDb250cm9sbGVyJyxcblx0XHRcdGNvbnRyb2xsZXJBczogJ2luc3RWbScsXG5cdFx0XHRyZXNvbHZlOiB7XG5cdFx0XHRcdGxvZ2dlZGluOiBpc0F1dGhvcml6ZWRcblx0XHRcdH1cblx0XHR9KTtcblxufV0pO1xuXG5pc0F1dGhvcml6ZWQuJGluamVjdCA9IFsnYXV0aFNlcnZpY2UnXTtcbmZ1bmN0aW9uIGlzQXV0aG9yaXplZChhdXRoU2VydmljZSkge1xuXHRyZXR1cm4gYXV0aFNlcnZpY2UuaXNBdXRob3JpemVkKCk7XG59IiwiKGZ1bmN0aW9uKCl7XG5cblx0J3VzZSBzdHJpY3QnO1xuXG5cdGFuZ3VsYXJcblx0XHQubW9kdWxlKCdhcHAuaW5zdGFuY2UnKVxuXHRcdC5kaXJlY3RpdmUoJ3BsYW5JdGVtJywgcGxhbkl0ZW0pO1xuXG5cdGZ1bmN0aW9uIHBsYW5JdGVtKCl7XG5cblx0XHRyZXR1cm4ge1xuXHRcdFx0cmVzdHJpY3Q6ICdBRScsXG5cdFx0XHR0cmFuc2NsdWRlOiB0cnVlLFxuXHRcdFx0c2NvcGU6IHtcblx0XHRcdFx0cGxhbjogJz0nLFxuXHRcdFx0XHRtb2RlbDogJz0nLFxuXHRcdFx0XHRzZWxlY3RQbGFuOiAnJicsXG5cdFx0XHRcdHNob3dQbGFuczogJyYnXG5cdFx0XHR9LFxuXHRcdFx0dGVtcGxhdGVVcmw6ICdpbnN0YW5jZS9wbGFuLmh0bWwnXG5cdFx0fTtcblxuXHR9XG5cbn0pKCk7IiwiKGZ1bmN0aW9uKCl7XG5cblx0J3VzZSBzdHJpY3QnO1xuXG5cdGFuZ3VsYXJcblx0XHQubW9kdWxlKCdhcHAuaW5zdGFuY2UnKVxuXHRcdC5kaXJlY3RpdmUoJ3NlcnZlckl0ZW0nLCBzZXJ2ZXJJdGVtKTtcblxuXHRmdW5jdGlvbiBzZXJ2ZXJJdGVtKCl7XG5cblx0XHRyZXR1cm4ge1xuXHRcdFx0cmVzdHJpY3Q6ICdBRScsXG5cdFx0XHR0cmFuc2NsdWRlOiB0cnVlLFxuXHRcdFx0c2NvcGU6IHtcblx0XHRcdFx0bW9kZWw6ICc9Jyxcblx0XHRcdFx0c2VydmVyOiAnPScsXG5cdFx0XHRcdG5ld0JyYW5jaDogJz0nLFxuXHRcdFx0XHRzZWxlY3RTZXJ2ZXI6ICcmJ1xuXHRcdFx0fSxcblx0XHRcdHRlbXBsYXRlVXJsOiAnaW5zdGFuY2Uvc2VydmVyLWl0ZW0uaHRtbCdcblx0XHR9O1xuXG5cdH1cblxufSkoKTsiLCIoZnVuY3Rpb24oKXtcblxuXHQndXNlIHN0cmljdCc7XG5cblx0YW5ndWxhclxuXHRcdC5tb2R1bGUoJ2FwcC5sYXlvdXQnKVxuXHRcdC5jb250cm9sbGVyKCdDb250ZW50Q29udHJvbGxlcicsIENvbnRlbnRDb250cm9sbGVyKTtcblxuXHRDb250ZW50Q29udHJvbGxlci4kaW5qZWN0ID0gWyckcm9vdFNjb3BlJ107XG5cblx0ZnVuY3Rpb24gQ29udGVudENvbnRyb2xsZXIoJHJvb3RTY29wZSkge1xuXG5cdFx0dmFyIHZtID0gdGhpcztcblx0XHQvLyB2bS5mdWxsVmlldyA9IHRydWU7XG5cblx0fVxuXG59KSgpOyIsIihmdW5jdGlvbigpe1xuXG5cdCd1c2Ugc3RyaWN0JztcblxuXHRhbmd1bGFyXG5cdFx0Lm1vZHVsZSgnYXBwLmxheW91dCcpXG5cdFx0LmNvbnRyb2xsZXIoJ0xheW91dENvbnRyb2xsZXInLCBMYXlvdXRDb250cm9sbGVyKTtcblxuXHRMYXlvdXRDb250cm9sbGVyLiRpbmplY3QgPSBbJyRyb290U2NvcGUnXTtcblxuXHRmdW5jdGlvbiBMYXlvdXRDb250cm9sbGVyKCRyb290U2NvcGUpIHtcblxuXHRcdHZhciB2bSA9IHRoaXM7XG5cblx0XHR2bS5mdWxsVmlldyA9IHRydWU7XG5cdFx0dm0udG9wYmFyID0gZmFsc2U7XG5cdFx0dm0uc2lkZW1lbnUgPSBmYWxzZTtcblx0XHR2bS5sYW5nbWVudSA9IGZhbHNlO1xuXHRcdHZtLmZvb3RlciA9IHRydWU7XG5cdFx0dm0udHJpZ2dlclNpZGViYXIgPSB0cmlnZ2VyU2lkZWJhcjtcblx0XHR2bS50cmlnZ2VyTGFuZ01lbnUgPSB0cmlnZ2VyTGFuZ01lbnU7XG5cblx0XHQkcm9vdFNjb3BlLiRvbignYXV0aC5sb2dpbicsIGZ1bmN0aW9uKGUpe1xuXHRcdFx0dm0uZnVsbFZpZXcgPSBmYWxzZTtcblx0XHRcdHZtLnRvcGJhciA9IHRydWU7XG5cdFx0XHR2bS5zaWRlbWVudSA9IHRydWU7XG5cdFx0XHR2bS5mb290ZXIgPSBmYWxzZTtcblxuXHRcdFx0Y29uc29sZS5sb2coJ2xheW91dCB2bS5zaWRlbWVudTogJywgdm0uc2lkZW1lbnUpO1xuXHRcdH0pO1xuXG5cdFx0JHJvb3RTY29wZS4kb24oJ2F1dGgubG9nb3V0JywgZnVuY3Rpb24oZSl7XG5cdFx0XHR2bS5mdWxsVmlldyA9IHRydWU7XG5cdFx0XHR2bS50b3BiYXIgPSBmYWxzZTtcblx0XHRcdHZtLnNpZGVtZW51ID0gZmFsc2U7XG5cdFx0XHR2bS5mb290ZXIgPSB0cnVlO1xuXG5cdFx0XHRjb25zb2xlLmxvZygnbGF5b3V0IHZtLnNpZGVtZW51OiAnLCB2bS5zaWRlbWVudSk7XG5cdFx0fSk7XG5cblx0XHRmdW5jdGlvbiB0cmlnZ2VyU2lkZWJhcigpIHtcblx0XHRcdGNvbnNvbGUubG9nKCd0cmlnZ2VyIHNpZGViYXIhJyk7XG5cdFx0XHR2bS5zaWRlbWVudSA9ICF2bS5zaWRlbWVudTtcblx0XHR9O1xuXG5cdFx0ZnVuY3Rpb24gdHJpZ2dlckxhbmdNZW51KCkge1xuXHRcdFx0Y29uc29sZS5sb2coJ3RyaWdnZXIgbGFuZ21lbnUhJyk7XG5cdFx0XHR2bS5sYW5nbWVudSA9ICF2bS5sYW5nbWVudTtcblx0XHR9XG5cblx0fVxuXG59KSgpOyIsIihmdW5jdGlvbigpe1xuXG5cdCd1c2Ugc3RyaWN0JztcblxuXHRhbmd1bGFyXG5cdFx0Lm1vZHVsZSgnYXBwLnBheW1lbnQnKVxuXHRcdC5kaXJlY3RpdmUoJ21ldGhvZEl0ZW0nLCBtZXRob2RJdGVtKTtcblxuXHRmdW5jdGlvbiBtZXRob2RJdGVtKCl7XG5cblx0XHRyZXR1cm4ge1xuXHRcdFx0cmVzdHJpY3Q6ICdBRScsXG5cdFx0XHR0cmFuc2NsdWRlOiB0cnVlLFxuXHRcdFx0c2NvcGU6IHtcblx0XHRcdFx0bW9kZWw6ICc9Jyxcblx0XHRcdFx0bWV0aG9kOiAnPScsXG5cdFx0XHRcdHVuc2VsZWN0YWJsZTogJz0nLFxuXHRcdFx0XHRzZWxlY3Q6ICcmJ1xuXHRcdFx0fSxcblx0XHRcdHRlbXBsYXRlVXJsOiAncGF5bWVudC9tZXRob2QtaXRlbS5odG1sJ1xuXHRcdH07XG5cblx0fVxuXG59KSgpOyIsIihmdW5jdGlvbigpe1xuXG5cdCd1c2Ugc3RyaWN0JztcblxuXHRhbmd1bGFyXG5cdFx0Lm1vZHVsZSgnYXBwLnBheW1lbnQnKVxuXHRcdC5jb250cm9sbGVyKCdQYXltZW50Q29udHJvbGxlcicsIFBheW1lbnRDb250cm9sbGVyKTtcblxuXHRQYXltZW50Q29udHJvbGxlci4kaW5qZWN0ID0gWyckcScsICckc2NvcGUnLCAnJGh0dHAnLCAnJHJvb3RTY29wZScsICckbG9jYWxTdG9yYWdlJywgJyRsb2NhdGlvbicsICdhcGlTZXJ2aWNlJywgJ2JyYW5jaGVzU2VydmljZScsICdjdXN0b21lclNlcnZpY2UnLCAnY2FydFNlcnZpY2UnLCAnbm90aWZ5U2VydmljZScsICdlcnJvclNlcnZpY2UnLCAnc3Bpbm5lclNlcnZpY2UnXTtcblxuXHRmdW5jdGlvbiBQYXltZW50Q29udHJvbGxlcigkcSwgJHNjb3BlLCAkaHR0cCwgJHJvb3RTY29wZSwgJGxvY2FsU3RvcmFnZSwgJGxvY2F0aW9uLCBhcGksIGJyYW5jaGVzU2VydmljZSwgY3VzdG9tZXJTZXJ2aWNlLCBjYXJ0LCBub3RpZnlTZXJ2aWNlLCBlcnJvclNlcnZpY2UsIHNwaW5uZXJTZXJ2aWNlKSB7XG5cblx0XHR2YXIgdm0gPSB0aGlzO1xuXHRcdC8vIHZhciByZXF1aXJlZEFtb3VudCA9IDA7XG5cdFx0XG5cdFx0dm0uY3VzdG9tZXIgPSBjdXN0b21lclNlcnZpY2UuZ2V0Q3VzdG9tZXIoKTtcblx0XHRjb25zb2xlLmxvZygndm0uY3VzdG9tZXI6ICcsIHZtLmN1c3RvbWVyLCB2bS5jdXN0b21lci5iYWxhbmNlKTtcblxuXHRcdHZtLmlzRW5vdWdoID0gZmFsc2U7XG5cdFx0dm0uY2FydCA9IGNhcnQuZ2V0QWxsKCk7XG5cdFx0dm0uYW1vdW50ID0gY291dEFtb3VudCh2bS5jYXJ0KTtcblx0XHR2bS5wYXltZW50TWV0aG9kcyA9IFtcblx0XHRcdHtcblx0XHRcdFx0aWQ6IDEsXG5cdFx0XHRcdGljb246ICdmYSBmYS1jcmVkaXQtY2FyZCcsXG5cdFx0XHRcdG5hbWU6ICdDcmVkaXQgQ2FyZCdcblx0XHRcdH0sXG5cdFx0XHR7XG5cdFx0XHRcdGlkOiAyLFxuXHRcdFx0XHRpY29uOiAnZmEgZmEtcGF5cGFsJyxcblx0XHRcdFx0bmFtZTogJ1BheVBhbCcsXG5cdFx0XHRcdGNvbWluZ1Nvb246IHRydWVcblx0XHRcdH0sXG5cdFx0XHR7XG5cdFx0XHRcdGlkOiAzLFxuXHRcdFx0XHRpY29uOiAnZmEgZmEtYml0Y29pbicsXG5cdFx0XHRcdG5hbWU6ICdCaXRjb2luJyxcblx0XHRcdFx0Y29taW5nU29vbjogdHJ1ZVxuXHRcdFx0fSxcblx0XHRcdHtcblx0XHRcdFx0aWQ6IDAsXG5cdFx0XHRcdG5hbWU6ICdSaW5nb3RlbCBCYWxhbmNlJ1xuXHRcdFx0fVxuXHRcdF07XG5cdFx0dm0ucGF5bWVudE1ldGhvZCA9IHZtLmFtb3VudCA+IDAgPyAxIDogMDtcblx0XHR2bS5zZWxlY3RNZXRob2QgPSBzZWxlY3RNZXRob2Q7XG5cdFx0dm0ucHJvY2VlZFBheW1lbnQgPSBwcm9jZWVkUGF5bWVudDtcblx0XHR2bS5yZW1vdmVGcm9tQXJyYXkgPSByZW1vdmVGcm9tQXJyYXk7XG5cdFx0dm0uY2FuY2VsID0gY2FuY2VsO1xuXG5cdFx0JHJvb3RTY29wZS4kb24oJ2N1c3RvbWVyLnVwZGF0ZScsIGZ1bmN0aW9uKGV2ZW50LCBjdXN0b21lcikge1xuXHRcdFx0dm0uY3VzdG9tZXIgPSBjdXN0b21lcjtcblx0XHRcdGlzRW5vdWdoKCk7XG5cdFx0fSk7XG5cblx0XHQkc2NvcGUuJHdhdGNoKGZ1bmN0aW9uKCl7XG5cdFx0XHRyZXR1cm4gdm0uY2FydC5sZW5ndGg7XG5cdFx0fSwgZnVuY3Rpb24odmFsKXtcblx0XHRcdHZtLmFtb3VudCA9IGNvdXRBbW91bnQodm0uY2FydCk7XG5cdFx0XHQvLyBpZighdmFsKSByZXF1aXJlZEFtb3VudCA9IDA7XG5cdFx0XHQvLyBlbHNlIHJlcXVpcmVkQW1vdW50ID0gdm0uYW1vdW50O1xuXHRcdH0pO1xuXG5cdFx0JHNjb3BlLiR3YXRjaChmdW5jdGlvbigpe1xuXHRcdFx0cmV0dXJuIHZtLmFtb3VudDtcblx0XHR9LCBmdW5jdGlvbih2YWwpe1xuXHRcdFx0aXNFbm91Z2goKTtcblx0XHRcdC8vIHJlcXVpcmVkQW1vdW50ID0gdmFsO1xuXHRcdFx0Ly8gaWYodm0uY3VzdG9tZXIuYmFsYW5jZSA8IHJlcXVpcmVkQW1vdW50IHx8ICghdmFsICYmICF2bS5jYXJ0Lmxlbmd0aCkpIHZtLmlzRW5vdWdoID0gZmFsc2U7XG5cdFx0XHQvLyBlbHNlIHZtLmlzRW5vdWdoID0gdHJ1ZTtcblx0XHR9KTtcblxuXHRcdGZ1bmN0aW9uIGlzRW5vdWdoKCkge1xuXHRcdFx0aWYodm0uY3VzdG9tZXIuYmFsYW5jZSA8IHZtLmFtb3VudCB8fCAoIXZtLmFtb3VudCAmJiAhdm0uY2FydC5sZW5ndGgpKSB2bS5pc0Vub3VnaCA9IGZhbHNlO1xuXHRcdFx0ZWxzZSB2bS5pc0Vub3VnaCA9IHRydWU7XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gcHJvY2VlZFBheW1lbnQoKSB7XG5cblx0XHRcdGlmKHZtLnBheW1lbnRNZXRob2QgPT09IHVuZGVmaW5lZClcblx0XHRcdFx0cmV0dXJuIGVycm9yU2VydmljZS5zaG93KCdDSE9PU0VfUEFZTUVOVF9NRVRIT0QnKTtcblx0XHRcdGlmKHZtLmFtb3VudCA9PT0gdW5kZWZpbmVkIHx8IHZtLmFtb3VudCA9PT0gbnVsbClcblx0XHRcdFx0cmV0dXJuIGVycm9yU2VydmljZS5zaG93KCdBTU9VTlRfTk9UX1NFVCcpO1xuXG5cdFx0XHQvLyBzcGlubmVyU2VydmljZS5zaG93KCdtYWluLXNwaW5uZXInKTtcblxuXHRcdFx0Ly9UT0RPIC0gc3dpdGNoIGJldHdlZW4gcGF5bWVudCBtZXRob2RzXG5cdFx0XHR2YXIgcmVxdWVzdFBhcmFtcyA9IHtcblx0XHRcdFx0dXJsOiAnY2hlY2tvdXQnLFxuXHRcdFx0XHRwYXJhbXM6IHtcblx0XHRcdFx0XHRwYXltZW50TWV0aG9kOiB2bS5wYXltZW50TWV0aG9kLFxuXHRcdFx0XHRcdGFtb3VudDogdm0uYW1vdW50LFxuXHRcdFx0XHRcdG9yZGVyOiB2bS5jYXJ0XG5cdFx0XHRcdH1cblx0XHRcdH07XG5cblx0XHRcdGFwaS5yZXF1ZXN0KHJlcXVlc3RQYXJhbXMpLnRoZW4oZnVuY3Rpb24ocmVzdWx0KXtcblx0XHRcdFx0aWYocmVzdWx0LmRhdGEucmVkaXJlY3QpIHtcblx0XHRcdFx0XHR3aW5kb3cubG9jYXRpb24uaHJlZiA9IHJlc3VsdC5kYXRhLnJlZGlyZWN0O1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdGlmKHJlc3VsdC5zdWNjZXNzKSBub3RpZnlTZXJ2aWNlLnNob3coJ0FMTF9DSEFOR0VTX1NBVkVEJyk7XG5cblx0XHRcdFx0XHQvLyB1cGRhdGUgY2FjaGVcblx0XHRcdFx0XHR2bS5jYXJ0LmZvckVhY2goZnVuY3Rpb24oaXRlbSl7XG5cdFx0XHRcdFx0XHRpZihpdGVtLmFjdGlvbiA9PT0gJ2NyZWF0ZVN1YnNjcmlwdGlvbicpIHtcblx0XHRcdFx0XHRcdFx0YnJhbmNoZXNTZXJ2aWNlLnNldChbXSk7XG5cdFx0XHRcdFx0XHR9IGVsc2UgaWYoaXRlbS5hY3Rpb24gPT09ICd1cGRhdGVTdWJzY3JpcHRpb24nKSB7XG5cdFx0XHRcdFx0XHRcdGJyYW5jaGVzU2VydmljZS51cGRhdGUoaXRlbS5kYXRhLm9pZCwgaXRlbS5kYXRhKTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9KTtcblxuXHRcdFx0XHRcdCRsb2NhdGlvbi5wYXRoKCcvZGFzaGJvYXJkJyk7IC8vVE9ET1xuXHRcdFx0XHR9XG5cdFx0XHRcdGNhcnQuY2xlYXIoKTtcblx0XHRcdFx0Ly8gc3Bpbm5lclNlcnZpY2UuaGlkZSgnbWFpbi1zcGlubmVyJyk7XG5cdFx0XHR9LCBmdW5jdGlvbihlcnIpe1xuXHRcdFx0XHRlcnJvclNlcnZpY2Uuc2hvdyhlcnIpO1xuXHRcdFx0XHQvLyBzcGlubmVyU2VydmljZS5oaWRlKCdtYWluLXNwaW5uZXInKTtcblx0XHRcdH0pO1xuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIHNlbGVjdE1ldGhvZChtZXRob2QpIHtcblx0XHRcdHZtLnBheW1lbnRNZXRob2QgPSBtZXRob2Q7XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gY291dEFtb3VudChhcnJheSkge1xuXHRcdFx0Ly9UT0RPIC0gY291bnQgbWluIGFtb3VudCBiYXNlZCBvbiB0aGUgY3VycmVuY3lcblx0XHRcdHZhciBhbW91bnQgPSBhcnJheS5sZW5ndGggPyAwIDogMjA7XG5cdFx0XHRhcnJheS5mb3JFYWNoKGZ1bmN0aW9uIChpdGVtKXtcblx0XHRcdFx0YW1vdW50ICs9IHBhcnNlRmxvYXQoaXRlbS5hbW91bnQpO1xuXHRcdFx0fSk7XG5cdFx0XHRyZXR1cm4gYW1vdW50O1xuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIHJlbW92ZUZyb21BcnJheShhcnJheSwgaW5kZXgpIHtcblx0XHRcdGFycmF5LnNwbGljZShpbmRleCwgMSk7XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gY2FuY2VsKCkge1xuXHRcdFx0JGxvY2F0aW9uLnBhdGgoJy9kYXNoYm9hcmQnKTtcblx0XHR9XG5cblx0fVxuXG59KSgpOyIsImFuZ3VsYXIubW9kdWxlKCdhcHAucGF5bWVudCcpXG4uY29uZmlnKFsnJHJvdXRlUHJvdmlkZXInLCBmdW5jdGlvbigkcm91dGVQcm92aWRlcil7XG5cblx0JHJvdXRlUHJvdmlkZXJcblx0XHQud2hlbignL3BheW1lbnQnLCB7XG5cdFx0XHR0ZW1wbGF0ZVVybDogJ3BheW1lbnQvcGF5bWVudC5odG1sJyxcblx0XHRcdGNvbnRyb2xsZXI6ICdQYXltZW50Q29udHJvbGxlcicsXG5cdFx0XHRjb250cm9sbGVyQXM6ICdwYXlWbScsXG5cdFx0XHRyZXNvbHZlOiB7XG5cdFx0XHRcdGxvZ2dlZGluOiBpc0F1dGhvcml6ZWRcblx0XHRcdH1cblx0XHR9KTtcblxufV0pO1xuXG5pc0F1dGhvcml6ZWQuJGluamVjdCA9IFsnYXV0aFNlcnZpY2UnXTtcbmZ1bmN0aW9uIGlzQXV0aG9yaXplZChhdXRoU2VydmljZSkge1xuXHRyZXR1cm4gYXV0aFNlcnZpY2UuaXNBdXRob3JpemVkKCk7XG59IiwiKGZ1bmN0aW9uKCl7XG5cblx0J3VzZSBzdHJpY3QnO1xuXG5cdGFuZ3VsYXJcblx0XHQubW9kdWxlKCdhcHAucHJvZmlsZScpXG5cdFx0LmNvbnRyb2xsZXIoJ1Byb2ZpbGVDb250cm9sbGVyJywgUHJvZmlsZUNvbnRyb2xsZXIpO1xuXG5cdFByb2ZpbGVDb250cm9sbGVyLiRpbmplY3QgPSBbJ2FwaVNlcnZpY2UnLCAnY3VzdG9tZXJTZXJ2aWNlJywgJ25vdGlmeVNlcnZpY2UnLCAnZXJyb3JTZXJ2aWNlJ107XG5cblx0ZnVuY3Rpb24gUHJvZmlsZUNvbnRyb2xsZXIoYXBpLCBjdXN0b21lclNlcnZpY2UsIG5vdGlmeVNlcnZpY2UsIGVycm9yU2VydmljZSkge1xuXG5cdFx0dmFyIHZtID0gdGhpcztcblx0XHR2bS5wcm9maWxlID0gY3VzdG9tZXJTZXJ2aWNlLmdldEN1c3RvbWVyKCk7XG5cdFx0dm0uc2F2ZVByb2ZpbGUgPSBzYXZlUHJvZmlsZTtcblx0XHR2bS5jb25maXJtUGFzcyA9ICcnO1xuXG5cdFx0Y29uc29sZS5sb2coJ3Byb2ZpbGU6ICcsIHZtLnByb2ZpbGUpO1xuXG5cdFx0ZnVuY3Rpb24gc2F2ZVByb2ZpbGUoKSB7XG5cdFx0XHRcblx0XHRcdHZhciBwYXJhbXMgPSB7fTtcblxuXHRcdFx0aWYoIXZtLnByb2ZpbGUuZW1haWwgfHwgIXZtLnByb2ZpbGUubmFtZSl7XG5cdFx0XHRcdHJldHVybiBlcnJvclNlcnZpY2Uuc2hvdygnTUlTU0lOR19GSUVMRFMnKTtcblx0XHRcdH1cblx0XHRcdGlmKHZtLnByb2ZpbGUucGFzc3dvcmQgJiYgdm0uY29uZmlybVBhc3MgIT09IHZtLnByb2ZpbGUucGFzc3dvcmQpe1xuXHRcdFx0XHRyZXR1cm4gZXJyb3JTZXJ2aWNlLnNob3coJ1BBU1NXT1JEX05PVF9DT05GSVJNRUQnKTtcblx0XHRcdH1cblxuXHRcdFx0aWYodm0ucHJvZmlsZS5uYW1lKSBwYXJhbXMubmFtZSA9IHZtLnByb2ZpbGUubmFtZTtcblx0XHRcdGlmKHZtLnByb2ZpbGUuZW1haWwpIHBhcmFtcy5lbWFpbCA9IHZtLnByb2ZpbGUuZW1haWw7XG5cdFx0XHRpZih2bS5wcm9maWxlLnBhc3N3b3JkKSBwYXJhbXMucGFzc3dvcmQgPSB2bS5wcm9maWxlLnBhc3N3b3JkO1xuXG5cdFx0XHRhcGkucmVxdWVzdCh7XG5cdFx0XHRcdHVybDogXCJ1cGRhdGUvXCIrdm0ucHJvZmlsZS5faWQsXG5cdFx0XHRcdHBhcmFtczogcGFyYW1zXG5cdFx0XHR9KS50aGVuKGZ1bmN0aW9uKHJlc3BvbnNlKXtcblx0XHRcdFx0bm90aWZ5U2VydmljZS5zaG93KCdBTExfQ0hBTkdFU19TQVZFRCcpO1xuXHRcdFx0XHRjdXN0b21lclNlcnZpY2Uuc2V0Q3VzdG9tZXIocmVzcG9uc2UuZGF0YS5yZXN1bHQpO1xuXHRcdFx0XHRjb25zb2xlLmxvZygnY3VycmVudFVzZXI6ICcsIHJlc3BvbnNlLmRhdGEucmVzdWx0KTtcblx0XHRcdH0sIGZ1bmN0aW9uKGVycil7XG5cdFx0XHRcdGVycm9yU2VydmljZS5zaG93KGVycik7XG5cdFx0XHR9KTtcblx0XHR9XG5cblx0fVxuXG59KSgpOyIsImFuZ3VsYXIubW9kdWxlKCdhcHAucHJvZmlsZScpXG4uY29uZmlnKFsnJHJvdXRlUHJvdmlkZXInLCBmdW5jdGlvbigkcm91dGVQcm92aWRlcil7XG5cblx0JHJvdXRlUHJvdmlkZXJcblx0XHQud2hlbignL3Byb2ZpbGUnLCB7XG5cdFx0XHR0ZW1wbGF0ZVVybDogJ3Byb2ZpbGUvcHJvZmlsZS5odG1sJyxcblx0XHRcdGNvbnRyb2xsZXI6ICdQcm9maWxlQ29udHJvbGxlcicsXG5cdFx0XHRjb250cm9sbGVyQXM6ICdwcm9maWxlVm0nLFxuXHRcdFx0cmVzb2x2ZToge1xuXHRcdFx0XHRsb2dnZWRpbjogaXNBdXRob3JpemVkXG5cdFx0XHR9XG5cdFx0fSk7XG5cbn1dKTtcblxuaXNBdXRob3JpemVkLiRpbmplY3QgPSBbJ2F1dGhTZXJ2aWNlJ107XG5mdW5jdGlvbiBpc0F1dGhvcml6ZWQoYXV0aFNlcnZpY2UpIHtcblx0cmV0dXJuIGF1dGhTZXJ2aWNlLmlzQXV0aG9yaXplZCgpO1xufSIsIihmdW5jdGlvbigpe1xuXG5cdCd1c2Ugc3RyaWN0JztcblxuXHRhbmd1bGFyXG5cdFx0Lm1vZHVsZSgnYXBwLmNvcmUnKVxuXHRcdC5mYWN0b3J5KCdhcGlTZXJ2aWNlJywgYXBpU2VydmljZSk7XG5cblx0YXBpU2VydmljZS4kaW5qZWN0ID0gWyckaHR0cCcsICdhcHBDb25maWcnXTtcblxuXHRmdW5jdGlvbiBhcGlTZXJ2aWNlKCRodHRwLCBhcHBDb25maWcpe1xuXG5cdFx0dmFyIGJhc2VVcmwgPSBhcHBDb25maWcuc2VydmVyICsgJy9hcGknO1xuXHRcdHJldHVybiB7XG5cdFx0XHRyZXF1ZXN0OiBmdW5jdGlvbihwYXJhbXMpe1xuXHRcdFx0XHRyZXR1cm4gJGh0dHAucG9zdChiYXNlVXJsKycvJytwYXJhbXMudXJsLCAocGFyYW1zLnBhcmFtcyB8fCB7fSkpO1xuXHRcdFx0fVxuXHRcdH07XG5cblx0fVxuXG59KSgpOyIsIihmdW5jdGlvbigpe1xuXG5cdCd1c2Ugc3RyaWN0JztcblxuXHRhbmd1bGFyXG5cdFx0Lm1vZHVsZSgnYXBwJylcblx0XHQuZmFjdG9yeSgnYXV0aFNlcnZpY2UnLCBhdXRoU2VydmljZSk7XG5cblx0YXV0aFNlcnZpY2UuJGluamVjdCA9IFsnJHEnLCAnJHRpbWVvdXQnLCAnJGxvY2F0aW9uJywgJyRyb290U2NvcGUnLCAnJGh0dHAnLCAnJGxvY2FsU3RvcmFnZScsICdhcHBDb25maWcnLCAnY3VzdG9tZXJTZXJ2aWNlJ107XG5cblx0ZnVuY3Rpb24gYXV0aFNlcnZpY2UoJHEsICR0aW1lb3V0LCAkbG9jYXRpb24sICRyb290U2NvcGUsICRodHRwLCAkbG9jYWxTdG9yYWdlLCBhcHBDb25maWcsIGN1c3RvbWVyU2VydmljZSl7XG5cblx0XHR2YXIgYmFzZVVybCA9IGFwcENvbmZpZy5zZXJ2ZXI7XG5cdFx0dmFyIGluaXQgPSBmYWxzZTtcblxuXHRcdHJldHVybiB7XG5cdFx0XHRzaWdudXA6IHNpZ251cCxcblx0XHRcdGxvZ2luOiBsb2dpbixcblx0XHRcdHJlcXVlc3RQYXNzd29yZFJlc2V0OiByZXF1ZXN0UGFzc3dvcmRSZXNldCxcblx0XHRcdHJlc2V0UGFzc3dvcmQ6IHJlc2V0UGFzc3dvcmQsXG5cdFx0XHRpc0xvZ2dlZEluOiBpc0xvZ2dlZEluLFxuXHRcdFx0bG9nb3V0OiBsb2dvdXQsXG5cdFx0XHRpc0F1dGhvcml6ZWQ6IGlzQXV0aG9yaXplZFxuXHRcdH07XG5cblx0XHRmdW5jdGlvbiBzaWdudXAoZGF0YSkge1xuXHRcdFx0cmV0dXJuICRodHRwLnBvc3QoYmFzZVVybCArICcvYXBpL3NpZ251cCcsIGRhdGEpO1xuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIGxvZ2luKGRhdGEpIHtcblx0XHRcdHJldHVybiAkaHR0cC5wb3N0KGJhc2VVcmwgKyAnL2FwaS9sb2dpbicsIGRhdGEpO1xuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIHJlcXVlc3RQYXNzd29yZFJlc2V0KGRhdGEpIHtcblx0XHRcdHJldHVybiAgJGh0dHAucG9zdChiYXNlVXJsICsgJy9hcGkvcmVxdWVzdFBhc3N3b3JkUmVzZXQnLCBkYXRhKTtcblx0XHR9XG5cblx0XHRmdW5jdGlvbiByZXNldFBhc3N3b3JkKGRhdGEpIHtcblx0XHRcdHJldHVybiAkaHR0cC5wb3N0KGJhc2VVcmwgKyAnL2FwaS9yZXNldFBhc3N3b3JkJywgZGF0YSk7XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gbG9nb3V0KCkge1xuXHRcdFx0ZGVsZXRlICRsb2NhbFN0b3JhZ2UudG9rZW47XG5cblx0XHRcdC8vIENsZWFyIGF1dGhvcml6ZWQgY3VzdG9tZXIgZGF0YVxuXHRcdFx0Y3VzdG9tZXJTZXJ2aWNlLmNsZWFyQ3VycmVudEN1c3RvbWVyKCk7XG5cblx0XHRcdC8vIEVtaXQgZXZlbnQgd2hlbiBjdXN0b21lciBsb2dnZWQgb3V0IHRvIHRoZSBjb25zb2xlXG5cdFx0XHQkcm9vdFNjb3BlLiRlbWl0KCdhdXRoLmxvZ291dCcpO1xuXG5cdFx0XHRpbml0ID0gZmFsc2U7XG5cblx0XHRcdCRsb2NhdGlvbi5wYXRoKCcvbG9naW4nKTtcblx0XHR9XG5cblx0XHRmdW5jdGlvbiBpc0xvZ2dlZEluKCl7XG5cdFx0XHRyZXR1cm4gaW5pdDtcblx0XHR9XG5cblx0XHRmdW5jdGlvbiBsb2dnZWRJbihkYXRhKSB7XG5cdFx0XHRjb25zb2xlLmxvZygnbG9nZ2VkSW46ICcsIGRhdGEpO1xuXHRcdFx0Ly8gU2V0IGF1dGhvcml6ZWQgY3VzdG9tZXIgZGF0YVxuXHRcdFx0aWYoZGF0YS5jdXN0b21lcikge1xuXHRcdFx0XHRjdXN0b21lclNlcnZpY2Uuc2V0Q3VzdG9tZXIoZGF0YS5jdXN0b21lcik7XG5cdFxuXHRcdFx0XHQvLyBFbWl0IGV2ZW50IHdoZW4gY3VzdG9tZXIgZGF0YSB1cGRhdGVkXG5cdFx0XHRcdCRyb290U2NvcGUuJGVtaXQoJ2N1c3RvbWVyLnVwZGF0ZScsIGRhdGEuY3VzdG9tZXIpO1xuXHRcdFx0fVxuXG5cblx0XHRcdGlmKCFpbml0KSB7XG5cdFx0XHRcdC8vIEVtaXQgZXZlbnQgd2hlbiBjdXN0b21lciBsb2dnZWQgaW4gdG8gdGhlIGNvbnNvbGVcblx0XHRcdFx0JHJvb3RTY29wZS4kZW1pdCgnYXV0aC5sb2dpbicpO1xuXHRcdFx0XHRpbml0ID0gdHJ1ZTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRmdW5jdGlvbiBpc0F1dGhvcml6ZWQoKSB7XG5cdFx0XHRpZihjdXN0b21lclNlcnZpY2UuZ2V0Q3VzdG9tZXIoKSkgcmV0dXJuO1xuXG5cdFx0XHR2YXIgZGVmZXJyZWQgPSAkcS5kZWZlcigpOyAvLyBNYWtlIGFuIEFKQVggY2FsbCB0byBjaGVjayBpZiB0aGUgdXNlciBpcyBsb2dnZWQgaW4gXG5cdFx0XHQkaHR0cC5nZXQoJy9hcGkvbG9nZ2VkaW4nKS50aGVuKGZ1bmN0aW9uKHJlcyl7XG5cdFx0XHRcdGxvZ2dlZEluKHJlcy5kYXRhKTtcblx0XHRcdFx0ZGVmZXJyZWQucmVzb2x2ZSgpO1xuXHRcdFx0fSwgZnVuY3Rpb24gKGVycil7XG5cdFx0XHRcdGRlZmVycmVkLnJlamVjdCgpO1xuXHRcdFx0XHRsb2dvdXQoKTtcblx0XHRcdFx0Ly8gJGxvY2F0aW9uLnBhdGgoJy9sb2dpbicpO1xuXHRcdFx0fSk7XG5cdFx0XHRyZXR1cm4gZGVmZXJyZWQucHJvbWlzZTtcblx0XHR9XG5cblx0fVxuXG59KSgpOyIsIihmdW5jdGlvbigpe1xuXG5cdCd1c2Ugc3RyaWN0JztcblxuXHRhbmd1bGFyXG5cdFx0Lm1vZHVsZSgnYXBwLmNvcmUnKVxuXHRcdC5mYWN0b3J5KCdicmFuY2hlc1NlcnZpY2UnLCBicmFuY2hlc1NlcnZpY2UpO1xuXG5cdGJyYW5jaGVzU2VydmljZS4kaW5qZWN0ID0gWydwb29sU2l6ZVNlcnZpY2VzJywgJ2FwaVNlcnZpY2UnXTtcblxuXHRmdW5jdGlvbiBicmFuY2hlc1NlcnZpY2UocG9vbFNpemVTZXJ2aWNlcywgYXBpKXtcblxuXHRcdHZhciBicmFuY2hlcyA9IFtdO1xuXHRcdHZhciBwbGFucyA9IFtdO1xuXHRcdHZhciBzZXJ2ZXJzID0gW107XG5cblx0XHRyZXR1cm4ge1xuXHRcdFx0YWRkOiBhZGQsXG5cdFx0XHRzZXQ6IHNldCxcblx0XHRcdHVwZGF0ZTogdXBkYXRlLFxuXHRcdFx0Z2V0OiBnZXQsXG5cdFx0XHRnZXRBbGw6IGdldEFsbCxcblx0XHRcdGdldEFsbEFkZG9uczogZ2V0QWxsQWRkb25zLFxuXHRcdFx0cmVtb3ZlOiByZW1vdmUsXG5cdFx0XHRzZXRQbGFuczogc2V0UGxhbnMsXG5cdFx0XHRzZXRTZXJ2ZXJzOiBzZXRTZXJ2ZXJzLFxuXHRcdFx0Z2V0UGxhbnM6IGdldFBsYW5zLFxuXHRcdFx0Z2V0U2VydmVyczogZ2V0U2VydmVycyxcblx0XHRcdGNsZWFyOiBjbGVhcixcblx0XHRcdGlzUHJlZml4VmFsaWQ6IGlzUHJlZml4VmFsaWQsXG5cdFx0XHRpc1ByZWZpeFVuaXF1ZTogaXNQcmVmaXhVbmlxdWUsXG5cdFx0XHRnZXRTdWJzY3JpcHRpb25BbW91bnQ6IGdldFN1YnNjcmlwdGlvbkFtb3VudFxuXHRcdH07XG5cblx0XHRmdW5jdGlvbiBhZGQoaXRlbSkge1xuXHRcdFx0aWYoYW5ndWxhci5pc0FycmF5KGl0ZW0pKSB7XG5cdFx0XHRcdGFuZ3VsYXIuY29weShpdGVtLCBicmFuY2hlcyk7XG5cdFx0XHRcdC8vIGJyYW5jaGVzID0gYnJhbmNoZXMuY29uY2F0KGl0ZW0pO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0ZGVsZXRlIGl0ZW0uYWRtaW5wYXNzO1xuXHRcdFx0XHRicmFuY2hlcy5wdXNoKGl0ZW0pO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIHNldChhcnJheSkge1xuXHRcdFx0aWYoQXJyYXkuaXNBcnJheShhcnJheSkpIGJyYW5jaGVzID0gYXJyYXk7XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gdXBkYXRlKG9pZCwgZGF0YSl7XG5cdFx0XHRjb25zb2xlLmxvZygndXBkYXRlIGJyYW5jaDogJywgb2lkLCBkYXRhKTtcblx0XHRcdGlmKCFvaWQpIHJldHVybjtcblx0XHRcdGJyYW5jaGVzLmZvckVhY2goZnVuY3Rpb24oaXRlbSwgaW5kZXgsIGFycmF5KXtcblx0XHRcdFx0aWYoaXRlbS5vaWQgPT09IG9pZCkge1xuXHRcdFx0XHRcdGRlbGV0ZSBpdGVtLmFkbWlucGFzcztcblx0XHRcdFx0XHRhbmd1bGFyLm1lcmdlKGl0ZW0sIGRhdGEpO1xuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblx0XHR9XG5cblx0XHRmdW5jdGlvbiBnZXQob2lkLCBjYikge1xuXHRcdFx0dmFyIGZvdW5kID0gbnVsbDtcblx0XHRcdGJyYW5jaGVzLmZvckVhY2goZnVuY3Rpb24gKGJyYW5jaCl7XG5cdFx0XHRcdGlmKGJyYW5jaC5vaWQgPT09IG9pZCl7XG5cdFx0XHRcdFx0Zm91bmQgPSBicmFuY2g7XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXHRcdFx0aWYoY2IpIGNiKGZvdW5kKTtcblx0XHRcdGVsc2UgcmV0dXJuIGZvdW5kO1xuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIGdldEFsbCgpIHtcblx0XHRcdHJldHVybiBicmFuY2hlcztcblx0XHR9XG5cblx0XHRmdW5jdGlvbiBnZXRBbGxBZGRvbnMocGFyYW1zKSB7XG5cdFx0XHR2YXIgYWRkT25zID0gW107XG5cdFx0XHRpZihwYXJhbXMuZXh0ZW5zaW9ucyAhPT0gdW5kZWZpbmVkKXtcblx0XHRcdFx0dmFyIHBvb2xzaXplID0gcG9vbFNpemVTZXJ2aWNlcy5nZXRQb29sU2l6ZShwYXJhbXMuZXh0ZW5zaW9ucyk7XG5cdFx0XHRcdGFkZE9ucy5wdXNoKHtcblx0XHRcdFx0XHRuYW1lOiBcIlVzZXJcIixcblx0XHRcdFx0XHRxdWFudGl0eTogcG9vbHNpemVcblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cblx0XHRcdHJldHVybiBhZGRPbnM7XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gcmVtb3ZlKG9pZCkge1xuXHRcdFx0YnJhbmNoZXMuZm9yRWFjaChmdW5jdGlvbihpdGVtLCBpbmRleCwgYXJyYXkpe1xuXHRcdFx0XHRpZihpdGVtLm9pZCAmJiBpdGVtLm9pZCA9PT0gb2lkKSB7XG5cdFx0XHRcdFx0YXJyYXkuc3BsaWNlKGluZGV4LCAxKTtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gc2V0UGxhbnMoYXJyYXkpe1xuXHRcdFx0cGxhbnMgPSBhcnJheTtcblx0XHR9XG5cblx0XHRmdW5jdGlvbiBnZXRQbGFucygpe1xuXHRcdFx0cmV0dXJuIHBsYW5zO1xuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIHNldFNlcnZlcnMoYXJyYXkpe1xuXHRcdFx0c2VydmVycyA9IGFycmF5O1xuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIGdldFNlcnZlcnMoKXtcblx0XHRcdHJldHVybiBzZXJ2ZXJzO1xuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIGNsZWFyKCkge1xuXHRcdFx0YnJhbmNoZXMgPSBbXTtcblx0XHRcdHBsYW5zID0gW107XG5cdFx0XHRzZXJ2ZXJzID0gW107XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gaXNQcmVmaXhWYWxpZChwcmVmaXgpIHtcblx0XHRcdFxuXHRcdFx0dmFyIHJlZ2V4ID0gL15bYS16QS1aMC05XVthLXpBLVowLTktXXsxLDYyfVthLXpBLVowLTldJC9nO1xuXHRcdFx0cmV0dXJuIHByZWZpeC5tYXRjaChyZWdleCk7XG5cblx0XHR9XG5cblx0XHRmdW5jdGlvbiBpc1ByZWZpeFVuaXF1ZShwcmVmaXgpIHtcblx0XHRcdHJldHVybiBhcGkucmVxdWVzdCh7XG5cdFx0XHQgICAgdXJsOiAnaXNQcmVmaXhWYWxpZCcsXG5cdFx0XHQgICAgcGFyYW1zOiB7XG5cdFx0XHQgICAgICAgIHByZWZpeDogcHJlZml4XG5cdFx0XHQgICAgfVxuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gZ2V0U3Vic2NyaXB0aW9uQW1vdW50KHBhcmFtcywgY2IpIHtcblxuXHRcdFx0YXBpLnJlcXVlc3Qoe1xuXHRcdFx0XHR1cmw6ICcvZ2V0U3Vic2NyaXB0aW9uQW1vdW50Jyxcblx0XHRcdFx0cGFyYW1zOiBwYXJhbXNcblx0XHRcdH0pLnRoZW4oZnVuY3Rpb24ocmVzdWx0KXtcblx0XHRcdFx0Y2IobnVsbCwgcmVzdWx0LmRhdGEpO1xuXHRcdFx0fSwgZnVuY3Rpb24oZXJyKXtcblx0XHRcdFx0Y2IoZXJyKTtcblx0XHRcdH0pO1xuXG5cdFx0fVxuXG5cdH1cblxufSkoKTsiLCIoZnVuY3Rpb24oKXtcblxuXHQndXNlIHN0cmljdCc7XG5cblx0YW5ndWxhclxuXHRcdC5tb2R1bGUoJ2FwcC5jb3JlJylcblx0XHQuZmFjdG9yeSgnY2FydFNlcnZpY2UnLCBjYXJ0U2VydmljZSk7XG5cblx0Y2FydFNlcnZpY2UuJGluamVjdCA9IFsnJHJvb3RTY29wZScsICdjdXN0b21lclNlcnZpY2UnXTtcblxuXHRmdW5jdGlvbiBjYXJ0U2VydmljZSgkcm9vdFNjb3BlLCBjdXN0b21lclNlcnZpY2UpIHtcblxuXHRcdHZhciBpdGVtcyA9IFtdO1xuXHRcdHJldHVybiB7XG5cdFx0XHRhZGQ6IGFkZCxcblx0XHRcdHVwZGF0ZTogdXBkYXRlLFxuXHRcdFx0Z2V0OiBnZXQsXG5cdFx0XHRzZXQ6IHNldCxcblx0XHRcdGdldEFsbDogZ2V0QWxsLFxuXHRcdFx0Y2xlYXI6IGNsZWFyXG5cdFx0fTtcblxuXHRcdGZ1bmN0aW9uIG5ld0l0ZW0ocGFyYW1zKSB7XG5cdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRhY3Rpb246IHBhcmFtcy5hY3Rpb24sXG5cdFx0XHRcdGRlc2NyaXB0aW9uOiBwYXJhbXMuZGVzY3JpcHRpb24sXG5cdFx0XHRcdGFtb3VudDogcGFyYW1zLmFtb3VudCxcblx0XHRcdFx0Y3VycmVuY3k6IGN1c3RvbWVyU2VydmljZS5nZXRDdXN0b21lcigpLmN1cnJlbmN5LFxuXHRcdFx0XHRkYXRhOiBwYXJhbXMuZGF0YVxuXHRcdFx0fTtcblx0XHR9XG5cblx0XHRmdW5jdGlvbiBhZGQocGFyYW1zKSB7XG5cdFx0XHQvLyBpdGVtcyA9IFtdOyAvL2NvbW1lbnQgdGhpcyBsaW5lIHRvIGNvbGxlY3QgaXRlbXMgaW4gdGhlIGNhcnQsIHJhdGhlciB0aGFuIHN1YnN0aXR1dGVcblx0XHRcdGl0ZW1zLnB1c2gobmV3SXRlbShwYXJhbXMpKTtcblx0XHR9XG5cblx0XHRmdW5jdGlvbiBzZXQocGFyYW1zKSB7XG5cdFx0XHRpdGVtcy5zcGxpY2UoMCwgaXRlbXMubGVuZ3RoKTtcblx0XHRcdGl0ZW1zLnB1c2gobmV3SXRlbShwYXJhbXMpKTtcblx0XHR9XG5cblx0XHRmdW5jdGlvbiB1cGRhdGUocHJlZml4LCBwYXJhbXMpIHtcblx0XHRcdHZhciBpdGVtID0gaXRlbXMuZm9yRWFjaChmdW5jdGlvbihpdGVtLCBpbmRleCwgYXJyYXkpIHtcblx0XHRcdFx0aWYoaXRlbS5kYXRhLnJlc3VsdC5wcmVmaXggPT09IHByZWZpeCkgYXJyYXlbaW5kZXhdID0gcGFyYW1zO1xuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gZ2V0KHByZWZpeCkge1xuXHRcdFx0dmFyIGZvdW5kO1xuXHRcdFx0aXRlbXMuZm9yRWFjaChmdW5jdGlvbihpdGVtKSB7XG5cdFx0XHRcdGlmKGl0ZW0uZGF0YS5yZXN1bHQucHJlZml4ID09PSBwcmVmaXgpIGZvdW5kID0gaXRlbTtcblx0XHRcdH0pO1xuXHRcdFx0cmV0dXJuIGZvdW5kO1xuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIGdldEFsbCgpIHtcblx0XHRcdHJldHVybiBpdGVtcztcblx0XHR9XG5cdFx0XG5cdFx0ZnVuY3Rpb24gY2xlYXIoKSB7XG5cdFx0XHRpdGVtcyA9IFtdO1xuXHRcdH1cblxuXHR9XG5cbn0pKCk7IiwiKGZ1bmN0aW9uKCl7XG5cblx0J3VzZSBzdHJpY3QnO1xuXG5cdGFuZ3VsYXJcblx0XHQubW9kdWxlKCdhcHAnKVxuXHRcdC5mYWN0b3J5KCdjdXN0b21lclNlcnZpY2UnLCBjdXN0b21lclNlcnZpY2UpO1xuXG5cdGN1c3RvbWVyU2VydmljZS4kaW5qZWN0ID0gWyckcm9vdFNjb3BlJ107XG5cblx0ZnVuY3Rpb24gY3VzdG9tZXJTZXJ2aWNlKCRyb290U2NvcGUpe1xuXG5cdFx0dmFyIGN1cnJlbnRDdXN0b21lciA9IG51bGwsXG5cdFx0XHRjdXJyZW50QmFsYW5jZSA9IG51bGw7XG5cblx0XHRyZXR1cm4ge1xuXHRcdFx0c2V0Q3VzdG9tZXI6IGZ1bmN0aW9uKHBhcmFtcykge1xuXHRcdFx0XHRjdXJyZW50Q3VzdG9tZXIgPSBhbmd1bGFyLmV4dGVuZCh7fSwgcGFyYW1zKTtcblx0XHRcdFx0JHJvb3RTY29wZS4kZW1pdCgnY3VzdG9tZXIudXBkYXRlJywgY3VycmVudEN1c3RvbWVyKTtcblx0XHRcdFx0cmV0dXJuIGN1cnJlbnRDdXN0b21lcjtcblx0XHRcdH0sXG5cdFx0XHRnZXRDdXN0b21lcjogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHJldHVybiBjdXJyZW50Q3VzdG9tZXI7XG5cdFx0XHR9LFxuXHRcdFx0c2V0Q3VzdG9tZXJCYWxhbmNlOiBmdW5jdGlvbihiYWxhbmNlKSB7XG5cdFx0XHRcdGN1cnJlbnRDdXN0b21lciA9IGN1cnJlbnRDdXN0b21lciB8fCB7fTtcblx0XHRcdFx0Y3VycmVudEN1c3RvbWVyLmJhbGFuY2UgPSBiYWxhbmNlO1xuXHRcdFx0XHRjdXJyZW50QmFsYW5jZSA9IGJhbGFuY2U7XG5cdFx0XHRcdCRyb290U2NvcGUuJGVtaXQoJ2N1c3RvbWVyLnVwZGF0ZScsIGN1cnJlbnRDdXN0b21lcik7XG5cdFx0XHR9LFxuXHRcdFx0Z2V0Q3VzdG9tZXJCYWxhbmNlOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0cmV0dXJuIGN1cnJlbnRDdXN0b21lci5iYWxhbmNlIHx8IGN1cnJlbnRCYWxhbmNlO1xuXHRcdFx0fSxcblx0XHRcdGNsZWFyQ3VycmVudEN1c3RvbWVyOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0Y3VycmVudEN1c3RvbWVyID0gbnVsbDtcblx0XHRcdH1cblx0XHR9O1xuXG5cdH1cblxufSkoKTsiLCIoZnVuY3Rpb24oKXtcblxuXHQndXNlIHN0cmljdCc7XG5cblx0YW5ndWxhclxuXHRcdC5tb2R1bGUoJ2FwcCcpXG5cdFx0LmZhY3RvcnkoJ2Vycm9yU2VydmljZScsIGVycm9yU2VydmljZSk7XG5cblx0ZXJyb3JTZXJ2aWNlLiRpbmplY3QgPSBbJyRyb290U2NvcGUnLCAnJHRyYW5zbGF0ZScsICdub3RpZmljYXRpb25zJ107XG5cblx0ZnVuY3Rpb24gZXJyb3JTZXJ2aWNlKCRyb290U2NvcGUsICR0cmFuc2xhdGUsIG5vdGlmaWNhdGlvbnMpe1xuXG5cdFx0cmV0dXJuIHtcblx0XHRcdHNob3c6IHNob3dcblx0XHR9O1xuXG5cdFx0ZnVuY3Rpb24gc2hvdyhlcnJvcil7XG5cdFx0XHQkdHJhbnNsYXRlKCdFUlJPUlMuJytlcnJvcilcblx0XHRcdC50aGVuKGZ1bmN0aW9uICh0cmFuc2xhdGlvbil7XG5cdFx0XHRcdGlmKCdFUlJPUlMuJytlcnJvciA9PT0gdHJhbnNsYXRpb24pIHtcblx0XHRcdFx0XHRub3RpZmljYXRpb25zLnNob3dFcnJvcignRVJST1JfT0NDVVJSRUQnKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRub3RpZmljYXRpb25zLnNob3dFcnJvcih0cmFuc2xhdGlvbik7XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXHRcdH1cblxuXHR9XG5cbn0pKCk7IiwiKGZ1bmN0aW9uKCl7XG5cblx0J3VzZSBzdHJpY3QnO1xuXG5cdGFuZ3VsYXJcblx0XHQubW9kdWxlKCdhcHAnKVxuXHRcdC5mYWN0b3J5KCdub3RpZnlTZXJ2aWNlJywgbm90aWZ5U2VydmljZSk7XG5cblx0bm90aWZ5U2VydmljZS4kaW5qZWN0ID0gWyckdHJhbnNsYXRlJywgJ25vdGlmaWNhdGlvbnMnXTtcblxuXHRmdW5jdGlvbiBub3RpZnlTZXJ2aWNlKCR0cmFuc2xhdGUsIG5vdGlmaWNhdGlvbnMpe1xuXG5cdFx0cmV0dXJuIHtcblx0XHRcdHNob3c6IHNob3dcblx0XHR9O1xuXG5cdFx0ZnVuY3Rpb24gc2hvdyhub3RpZnkpe1xuXHRcdFx0JHRyYW5zbGF0ZSgnTk9USUZZLicrbm90aWZ5KVxuXHRcdFx0LnRoZW4oZnVuY3Rpb24gKHRyYW5zbGF0aW9uKXtcblx0XHRcdFx0aWYoJ05PVElGWS4nK25vdGlmeSA9PT0gdHJhbnNsYXRpb24pIHtcblx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0bm90aWZpY2F0aW9ucy5zaG93U3VjY2Vzcyh0cmFuc2xhdGlvbik7XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXHRcdH1cblxuXHR9XG5cbn0pKCk7IiwiKGZ1bmN0aW9uKCl7XG5cblx0J3VzZSBzdHJpY3QnO1xuXG5cdGFuZ3VsYXJcblx0XHQubW9kdWxlKCdhcHAnKVxuXHRcdC5mYWN0b3J5KCdwb29sU2l6ZVNlcnZpY2VzJywgcG9vbFNpemVTZXJ2aWNlcyk7XG5cblx0cG9vbFNpemVTZXJ2aWNlcy4kaW5qZWN0ID0gWyd1dGlsc1NlcnZpY2UnXTtcblxuXHRmdW5jdGlvbiBwb29sU2l6ZVNlcnZpY2VzKHV0aWxzKXtcblxuXHRcdHJldHVybiB7XG5cdFx0XHRnZXRQb29sU2l6ZTogZ2V0UG9vbFNpemUsXG5cdFx0XHRwb29sQXJyYXlUb1N0cmluZzogcG9vbEFycmF5VG9TdHJpbmcsXG5cdFx0XHRwb29sU3RyaW5nVG9PYmplY3Q6IHBvb2xTdHJpbmdUb09iamVjdFxuXHRcdH07XG5cblx0XHRmdW5jdGlvbiBnZXRQb29sU2l6ZShhcnJheU9yU3RyaW5nKSB7XG5cdFx0XHR2YXIgcG9vbHNpemUgPSAwO1xuXG5cdFx0XHRpZih1dGlscy5pc0FycmF5KGFycmF5T3JTdHJpbmcpKXtcblx0XHRcdFx0YXJyYXlPclN0cmluZy5mb3JFYWNoKGZ1bmN0aW9uKG9iaiwgaW5keCwgYXJyYXkpe1xuXHRcdFx0XHRcdHBvb2xzaXplICs9IG9iai5wb29sc2l6ZTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRhcnJheU9yU3RyaW5nXG5cdFx0XHRcdC5zcGxpdCgnLCcpXG5cdFx0XHRcdC5tYXAoZnVuY3Rpb24oc3RyKXtcblx0XHRcdFx0XHRyZXR1cm4gc3RyLnNwbGl0KCctJyk7XG5cdFx0XHRcdH0pXG5cdFx0XHRcdC5mb3JFYWNoKGZ1bmN0aW9uKGFycmF5KXtcblx0XHRcdFx0XHRwb29sc2l6ZSArPSBwYXJzZUludChhcnJheVsxXSA/IChhcnJheVsxXSAtIGFycmF5WzBdKzEpIDogMSwgMTApO1xuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHRcdFx0XG5cdFx0XHRyZXR1cm4gcG9vbHNpemU7XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gcG9vbEFycmF5VG9TdHJpbmcoYXJyYXkpIHtcblx0XHRcdHZhciBzdHIgPSAnJztcblx0XHRcdGFycmF5LmZvckVhY2goZnVuY3Rpb24ob2JqLCBpbmR4LCBhcnJheSl7XG5cdFx0XHRcdGlmKGluZHggPiAwKSBzdHIgKz0gJywnO1xuXHRcdFx0XHRzdHIgKz0gb2JqLmZpcnN0bnVtYmVyO1xuXHRcdFx0XHRpZihvYmoucG9vbHNpemUgPiAxKSBzdHIgKz0gKCctJyArIChvYmouZmlyc3RudW1iZXIrb2JqLnBvb2xzaXplLTEpKTtcblx0XHRcdH0pO1xuXHRcdFx0cmV0dXJuIHN0cjtcblx0XHR9XG5cblx0XHRmdW5jdGlvbiBwb29sU3RyaW5nVG9PYmplY3Qoc3RyaW5nKSB7XG5cdFx0XHR2YXIgZXh0ZW5zaW9ucyA9IFtdO1xuXG5cdFx0XHRzdHJpbmdcblx0XHRcdC5yZXBsYWNlKC9cXHMvZywgJycpXG5cdFx0XHQuc3BsaXQoJywnKVxuXHRcdFx0Lm1hcChmdW5jdGlvbihzdHIpe1xuXHRcdFx0XHRyZXR1cm4gc3RyLnNwbGl0KCctJyk7XG5cdFx0XHR9KVxuXHRcdFx0LmZvckVhY2goZnVuY3Rpb24oYXJyYXkpe1xuXHRcdFx0XHRleHRlbnNpb25zLnB1c2goe1xuXHRcdFx0XHRcdGZpcnN0bnVtYmVyOiBwYXJzZUludChhcnJheVswXSwgMTApLFxuXHRcdFx0XHRcdHBvb2xzaXplOiBwYXJzZUludChhcnJheVsxXSA/IChhcnJheVsxXSAtIGFycmF5WzBdKzEpIDogMSwgMTApXG5cdFx0XHRcdH0pO1xuXHRcdFx0fSk7XG5cdFx0XHRyZXR1cm4gZXh0ZW5zaW9ucztcblx0XHR9XG5cdH1cblxufSkoKTsiLCIoZnVuY3Rpb24oKXtcblxuXHQndXNlIHN0cmljdCc7XG5cblx0YW5ndWxhclxuXHRcdC5tb2R1bGUoJ2FwcC5jb3JlJylcblx0XHQuZmFjdG9yeSgnc3Bpbm5lclNlcnZpY2UnLCBzcGlubmVyU2VydmljZSk7XG5cblx0Ly8gc3Bpbm5lclNlcnZpY2UuJGluamVjdCA9IFtdO1xuXG5cdGZ1bmN0aW9uIHNwaW5uZXJTZXJ2aWNlKCl7XG5cblx0XHR2YXIgc3Bpbm5lcnMgPSB7fTtcblx0XHRyZXR1cm4ge1xuXHRcdFx0X3JlZ2lzdGVyOiBfcmVnaXN0ZXIsXG5cdFx0XHRzaG93OiBzaG93LFxuXHRcdFx0aGlkZTogaGlkZSxcblx0XHRcdHNob3dBbGw6IHNob3dBbGwsXG5cdFx0XHRoaWRlQWxsOiBoaWRlQWxsXG5cdFx0fTtcblx0XHRcblx0XHRmdW5jdGlvbiBfcmVnaXN0ZXIoZGF0YSkge1xuXHRcdFx0aWYgKCFkYXRhLmhhc093blByb3BlcnR5KCduYW1lJykpIHtcblx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiU3Bpbm5lciBtdXN0IHNwZWNpZnkgYSBuYW1lIHdoZW4gcmVnaXN0ZXJpbmcgd2l0aCB0aGUgc3Bpbm5lciBzZXJ2aWNlLlwiKTtcblx0XHRcdH1cblx0XHRcdGlmIChzcGlubmVycy5oYXNPd25Qcm9wZXJ0eShkYXRhLm5hbWUpKSB7XG5cdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdFx0Ly8gdGhyb3cgbmV3IEVycm9yKFwiQSBzcGlubmVyIHdpdGggdGhlIG5hbWUgJ1wiICsgZGF0YS5uYW1lICsgXCInIGhhcyBhbHJlYWR5IGJlZW4gcmVnaXN0ZXJlZC5cIik7XG5cdFx0XHR9XG5cdFx0XHRzcGlubmVyc1tkYXRhLm5hbWVdID0gZGF0YTtcblx0XHR9XG5cblx0XHRmdW5jdGlvbiBzaG93KG5hbWUpIHtcblx0XHRcdHZhciBzcGlubmVyID0gc3Bpbm5lcnNbbmFtZV07XG5cdFx0XHRpZiAoIXNwaW5uZXIpIHtcblx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiTm8gc3Bpbm5lciBuYW1lZCAnXCIgKyBuYW1lICsgXCInIGlzIHJlZ2lzdGVyZWQuXCIpO1xuXHRcdFx0fVxuXHRcdFx0c3Bpbm5lci5zaG93KCk7XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gaGlkZShuYW1lKSB7XG5cdFx0XHR2YXIgc3Bpbm5lciA9IHNwaW5uZXJzW25hbWVdO1xuXHRcdFx0aWYgKCFzcGlubmVyKSB7XG5cdFx0XHRcdHRocm93IG5ldyBFcnJvcihcIk5vIHNwaW5uZXIgbmFtZWQgJ1wiICsgbmFtZSArIFwiJyBpcyByZWdpc3RlcmVkLlwiKTtcblx0XHRcdH1cblx0XHRcdHNwaW5uZXIuaGlkZSgpO1xuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIHNob3dBbGwoKSB7XG5cdFx0XHRmb3IgKHZhciBuYW1lIGluIHNwaW5uZXJzKSB7XG5cdFx0XHRcdHNwaW5uZXJzW25hbWVdLnNob3coKTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRmdW5jdGlvbiBoaWRlQWxsKCkge1xuXHRcdFx0Zm9yICh2YXIgbmFtZSBpbiBzcGlubmVycykge1xuXHRcdFx0XHRzcGlubmVyc1tuYW1lXS5oaWRlKCk7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdH1cblxufSkoKTsiLCIoZnVuY3Rpb24oKXtcblxuXHQndXNlIHN0cmljdCc7XG5cblx0YW5ndWxhclxuXHRcdC5tb2R1bGUoJ2FwcCcpXG5cdFx0LmZhY3RvcnkoJ3N0b3JhZ2VTZXJ2aWNlJywgc3RvcmFnZVNlcnZpY2UpO1xuXG5cdHN0b3JhZ2VTZXJ2aWNlLiRpbmplY3QgPSBbJyRsb2NhbFN0b3JhZ2UnXTtcblxuXHRmdW5jdGlvbiBzdG9yYWdlU2VydmljZSgkbG9jYWxTdG9yYWdlKXtcblxuXHRcdHJldHVybiB7XG5cdFx0XHRwdXQ6IGZ1bmN0aW9uIChuYW1lLCB2YWx1ZSkge1xuXHRcdFx0XHQkbG9jYWxTdG9yYWdlW25hbWVdID0gdmFsdWU7XG5cdFx0XHR9LFxuXHRcdFx0Z2V0OiBmdW5jdGlvbiAobmFtZSkge1xuXHRcdFx0XHRyZXR1cm4gJGxvY2FsU3RvcmFnZVtuYW1lXTtcblx0XHRcdH1cblx0XHR9O1xuXG5cdH1cblxufSkoKTsiLCIoZnVuY3Rpb24oKXtcblxuXHQndXNlIHN0cmljdCc7XG5cblx0YW5ndWxhclxuXHRcdC5tb2R1bGUoJ2FwcCcpXG5cdFx0LmZhY3RvcnkoJ3V0aWxzU2VydmljZScsIHV0aWxzU2VydmljZSk7XG5cblx0dXRpbHNTZXJ2aWNlLiRpbmplY3QgPSBbXCJ1aWJEYXRlUGFyc2VyXCJdO1xuXG5cdGZ1bmN0aW9uIHV0aWxzU2VydmljZSh1aWJEYXRlUGFyc2VyKXtcblxuXHRcdHJldHVybiB7XG5cdFx0XHRpc0FycmF5OiBpc0FycmF5LFxuXHRcdFx0aXNTdHJpbmc6IGlzU3RyaW5nLFxuXHRcdFx0c3RyaW5nVG9GaXhlZDogc3RyaW5nVG9GaXhlZCxcblx0XHRcdGFycmF5VG9PYmplY3Q6IGFycmF5VG9PYmplY3QsXG5cdFx0XHRwYXJzZURhdGU6IHBhcnNlRGF0ZSxcblx0XHRcdGdldERpZmZlcmVuY2U6IGdldERpZmZlcmVuY2UsXG5cdFx0XHRjaGVja1Bhc3N3b3JkU3RyZW5ndGg6IGNoZWNrUGFzc3dvcmRTdHJlbmd0aCxcblx0XHRcdGdlbmVyYXRlUGFzc3dvcmQ6IGdlbmVyYXRlUGFzc3dvcmRcblx0XHR9O1xuXG5cdFx0ZnVuY3Rpb24gaXNBcnJheShvYmopIHtcblx0XHRcdHJldHVybiB0eXBlb2Ygb2JqID09PSAnb2JqZWN0Jztcblx0XHR9XG5cblx0XHRmdW5jdGlvbiBpc1N0cmluZyhvYmopIHtcblx0XHRcdHJldHVybiB0eXBlb2Ygb2JqID09PSAnc3RyaW5nJztcblx0XHR9XG5cblx0XHRmdW5jdGlvbiBzdHJpbmdUb0ZpeGVkKHN0cmluZywgcG9pbnQpIHtcblx0XHRcdHJldHVybiBwYXJzZUZsb2F0KHN0cmluZykudG9GaXhlZChwb2ludCk7XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gYXJyYXlUb09iamVjdChhcnJheSwga2V5KSB7XG5cdFx0XHR2YXIgb2JqID0ge30sIHByb3AgPSAnJztcblx0XHRcdGFycmF5LmZvckVhY2goZnVuY3Rpb24oaXRlbSl7XG5cdFx0XHRcdHByb3AgPSBpdGVtW2tleV07XG5cdFx0XHRcdG9ialtwcm9wXSA9IGl0ZW07XG5cdFx0XHR9KTtcblx0XHRcdHJldHVybiBvYmo7XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gcGFyc2VEYXRlKGRhdGUsIGZvcm1hdCkge1xuXHRcdFx0cmV0dXJuIG1vbWVudChkYXRlKS5mb3JtYXQoZm9ybWF0IHx8ICdERCBNTU1NIFlZWVknKTtcblx0XHRcdC8vIHJldHVybiBuZXcgRGF0ZShkYXRlKS50b0xvY2FsZURhdGVTdHJpbmcoKTtcblx0XHR9XG5cblx0XHRmdW5jdGlvbiBnZXREaWZmZXJlbmNlKGRhdGUxLCBkYXRlMiwgb3V0cHV0KSB7XG5cdFx0XHRyZXR1cm4gbW9tZW50KGRhdGUxKS5kaWZmKGRhdGUyLCAob3V0cHV0ID8gb3V0cHV0IDogJycpKTtcblx0XHR9XG5cblx0XHRmdW5jdGlvbiBjaGVja1Bhc3N3b3JkU3RyZW5ndGgoc3RyaW5nKSB7XG5cdFx0XHR2YXIgc3Ryb25nID0gbmV3IFJlZ0V4cChcIl4oPz0uKlthLXpdKSg/PS4qW0EtWl0pKD89LipbMC05XSkoPz0uKlshQCNcXCQlXFxeJlxcKl0pKD89LnsxMCx9KVwiKSxcblx0XHRcdFx0bWlkZGxlID0gbmV3IFJlZ0V4cChcIl4oKCg/PS4qW2Etel0pKD89LipbQS1aXSkoPz0uKlswLTldKSl8KCg/PS4qW2Etel0pKD89LipbQS1aXSkoPz0uKlshQCNcXCQlXFxeJlxcKl0pKSkoPz0uezgsfSlcIik7XG5cdFx0XHRpZihzdHJvbmcudGVzdChzdHJpbmcpKSB7XG5cdFx0XHRcdHJldHVybiAyO1xuXHRcdFx0fSBlbHNlIGlmKG1pZGRsZS50ZXN0KHN0cmluZykpIHtcblx0XHRcdFx0cmV0dXJuIDE7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRyZXR1cm4gMDtcblx0XHRcdH1cblx0XHR9XG5cblxuXHRcdC8vIFRPRE86IGdlbmVyYXRlIHBhc3N3b3JkIG9uIHRoZSBzZXJ2ZXIgc2lkZSEhIVxuXHRcdGZ1bmN0aW9uIGdlbmVyYXRlUGFzc3dvcmQobWlubGVuZ3RoLCBtYXhsZW5ndGgpIHtcblx0XHRcdHZhciBjaGFycyA9IFwiYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXohQCQlXiYqX0FCQ0RFRkdISUpLTE1OT1AxMjM0NTY3ODkwXCIsXG5cdFx0XHRcdHBhc3NMZW5ndGggPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAobWF4bGVuZ3RoIC0gbWlubGVuZ3RoKSkgKyBtaW5sZW5ndGgsXG5cdFx0XHRcdHBhc3MgPSBcIlwiO1xuXHRcdFx0XG5cdFx0XHRmb3IgKHZhciB4ID0gMDsgeCA8IHBhc3NMZW5ndGg7IHgrKykge1xuXHRcdFx0XHR2YXIgaSA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIGNoYXJzLmxlbmd0aCk7XG5cdFx0XHRcdHBhc3MgKz0gY2hhcnMuY2hhckF0KGkpO1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIHBhc3M7XG5cdFx0fVxuXG5cdH1cblxufSkoKTsiLCIoZnVuY3Rpb24oKXtcblxuXHQndXNlIHN0cmljdCc7XG5cblx0YW5ndWxhclxuXHRcdC5tb2R1bGUoJ2FwcC5jb3JlJylcblx0XHQuY29udHJvbGxlcignRGF0ZVBpY2tlcicsIERhdGVQaWNrZXIpO1xuXG5cdERhdGVQaWNrZXIuJGluamVjdCA9IFsndXRpbHNTZXJ2aWNlJywgJ2Vycm9yU2VydmljZSddO1xuXG5cdGZ1bmN0aW9uIERhdGVQaWNrZXIodXRpbHMsIGVycm9yU2VydmljZSkge1xuXG5cdFx0dmFyIHZtID0gdGhpcztcblxuXHRcdHZtLm9wZW5lZCA9IGZhbHNlO1xuXHRcdHZtLm9wZW4gPSBmdW5jdGlvbigpIHtcblx0XHRcdHZtLm9wZW5lZCA9IHRydWU7XG5cdFx0fTtcblxuXHR9XG5cbn0pKCk7IiwiKGZ1bmN0aW9uKCl7XG5cblx0J3VzZSBzdHJpY3QnO1xuXG5cdGFuZ3VsYXJcblx0XHQubW9kdWxlKCdhcHAnKVxuXHRcdC5kaXJlY3RpdmUoJ2RhdGVQaWNrZXInLCBkYXRlUGlja2VyKTtcblxuXHRkYXRlUGlja2VyLiRpbmplY3QgPSBbJ3V0aWxzU2VydmljZSddO1xuXG5cdGZ1bmN0aW9uIGRhdGVQaWNrZXIodXRpbHNTZXJ2aWNlKXtcblxuXHRcdHJldHVybiB7XG5cdFx0XHRyZXN0cmljdDogJ0FFJyxcblx0XHRcdHRyYW5zY2x1ZGU6IHRydWUsXG5cdFx0XHRzY29wZToge1xuXHRcdFx0XHRkYXRlRm9ybWF0OiAnPScsXG5cdFx0XHRcdGRhdGVPcHRpb25zOiAnPScsXG5cdFx0XHRcdG1vZGVsOiAnPSdcblx0XHRcdH0sXG5cdFx0XHRjb250cm9sbGVyOiAnRGF0ZVBpY2tlcicsXG5cdFx0XHRjb250cm9sbGVyQXM6ICdwaWNrZXJWbScsXG5cdFx0XHR0ZW1wbGF0ZVVybDogJ2NvbXBvbmVudHMvZGF0ZS1waWNrZXIvZGF0ZS1waWNrZXIuaHRtbCcsXG5cdFx0XHRsaW5rOiBsaW5rXG5cdFx0fTtcblxuXHRcdGZ1bmN0aW9uIGxpbmsoc2NvcGUsIGVsLCBhdHRycywgY3RybCl7XG5cblx0XHRcdHZhciBpY29uc0NoYW5nZWQgPSBmYWxzZTtcblxuXHRcdFx0c2NvcGUuJHdhdGNoKCdwaWNrZXJWbS5vcGVuZWQnLCBmdW5jdGlvbiAob3BlbmVkKSB7XG5cdFx0XHRcdGlmKG9wZW5lZCAmJiAhaWNvbnNDaGFuZ2VkKSB7XG5cdFx0XHRcdFx0Y2hhbmdlSWNvbnMoKTtcblx0XHRcdFx0XHRpY29uc0NoYW5nZWQgPSB0cnVlO1xuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblxuXHRcdFx0ZnVuY3Rpb24gY2hhbmdlSWNvbnMoKXtcblx0XHRcdFx0dmFyIGxlZnRJY28gPSBlbFswXS5xdWVyeVNlbGVjdG9yQWxsKCcudWliLWxlZnQnKTtcblx0XHRcdFx0dmFyIHJpZ2h0SWNvID0gZWxbMF0ucXVlcnlTZWxlY3RvckFsbCgnLnVpYi1yaWdodCcpO1xuXG5cdFx0XHRcdGNvbnNvbGUubG9nKCdjaGFuZ2VJY29uczogJywgZWxbMF0sIGxlZnRJY28sIHJpZ2h0SWNvKTtcblxuXHRcdFx0XHQvLyBsZWZ0SWNvLmNsYXNzTmFtZSA9ICdmYSBmYS1jaGV2cm9uLWxlZnQnO1xuXHRcdFx0XHQvLyByaWdodEljby5jbGFzc05hbWUgPSAnZmEgZmEtY2hldnJvbi1yaWdodCc7XG5cblx0XHRcdH1cblxuXHRcdH1cblxuXHR9XG5cbn0pKCk7IiwiKGZ1bmN0aW9uKCl7XG5cblx0J3VzZSBzdHJpY3QnO1xuXG5cdGFuZ3VsYXJcblx0XHQubW9kdWxlKCdhcHAuY29yZScpXG5cdFx0LmNvbnRyb2xsZXIoJ1NwaW5uZXJDb250cm9sbGVyJywgU3Bpbm5lckNvbnRyb2xsZXIpO1xuXG5cdFNwaW5uZXJDb250cm9sbGVyLiRpbmplY3QgPSBbJ3NwaW5uZXJTZXJ2aWNlJ107XG5cblx0ZnVuY3Rpb24gU3Bpbm5lckNvbnRyb2xsZXIoc3Bpbm5lclNlcnZpY2UpIHtcblxuXHRcdHZhciB2bSA9IHRoaXM7XG5cblx0XHQvLyBEZWNsYXJlIGEgbWluaS1BUEkgdG8gaGFuZCBvZmYgdG8gb3VyIHNlcnZpY2Ugc28gdGhlIHNlcnZpY2Vcblx0XHQvLyBkb2Vzbid0IGhhdmUgYSBkaXJlY3QgcmVmZXJlbmNlIHRvIHRoaXMgZGlyZWN0aXZlJ3Mgc2NvcGUuXG5cdFx0dmFyIGFwaSA9IHtcblx0XHRcdG5hbWU6IHZtLm5hbWUsXG5cdFx0XHRncm91cDogdm0uZ3JvdXAsXG5cdFx0XHRzaG93OiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdHZtLnNob3cgPSB0cnVlO1xuXHRcdFx0fSxcblx0XHRcdGhpZGU6IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0dm0uc2hvdyA9IGZhbHNlO1xuXHRcdFx0fSxcblx0XHRcdHRvZ2dsZTogZnVuY3Rpb24gKCkge1xuXHRcdFx0XHR2bS5zaG93ID0gIXZtLnNob3c7XG5cdFx0XHR9XG5cdFx0fTtcblxuXHRcdC8vIHJlZ2lzdGVyIHNob3VsZCBiZSB0cnVlIGJ5IGRlZmF1bHQgaWYgbm90IHNwZWNpZmllZC5cblx0XHRpZiAoIXZtLmhhc093blByb3BlcnR5KCdyZWdpc3RlcicpKSB7XG5cdFx0XHR2bS5yZWdpc3RlciA9IHRydWU7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHZtLnJlZ2lzdGVyID0gdm0ucmVnaXN0ZXIudG9Mb3dlckNhc2UoKSA9PT0gJ2ZhbHNlJyA/IGZhbHNlIDogdHJ1ZTtcblx0XHR9XG5cblx0XHQvLyBSZWdpc3RlciB0aGlzIHNwaW5uZXIgd2l0aCB0aGUgc3Bpbm5lciBzZXJ2aWNlLlxuXHRcdGlmICh2bS5yZWdpc3RlciA9PT0gdHJ1ZSkge1xuXHRcdFx0c3Bpbm5lclNlcnZpY2UuX3JlZ2lzdGVyKGFwaSk7XG5cdFx0fVxuXG5cdFx0Ly8gSWYgYW4gb25TaG93IG9yIG9uSGlkZSBleHByZXNzaW9uIHdhcyBwcm92aWRlZCwgcmVnaXN0ZXIgYSB3YXRjaGVyXG5cdFx0Ly8gdGhhdCB3aWxsIGZpcmUgdGhlIHJlbGV2YW50IGV4cHJlc3Npb24gd2hlbiBzaG93J3MgdmFsdWUgY2hhbmdlcy5cblx0XHRpZiAodm0ub25TaG93IHx8IHZtLm9uSGlkZSkge1xuXHRcdFx0JHNjb3BlLiR3YXRjaCgnc2hvdycsIGZ1bmN0aW9uIChzaG93KSB7XG5cdFx0XHRcdGlmIChzaG93ICYmIHZtLm9uU2hvdykge1xuXHRcdFx0XHRcdHZtLm9uU2hvdyh7IHNwaW5uZXJTZXJ2aWNlOiBzcGlubmVyU2VydmljZSwgc3Bpbm5lckFwaTogYXBpIH0pO1xuXHRcdFx0XHR9IGVsc2UgaWYgKCFzaG93ICYmIHZtLm9uSGlkZSkge1xuXHRcdFx0XHRcdHZtLm9uSGlkZSh7IHNwaW5uZXJTZXJ2aWNlOiBzcGlubmVyU2VydmljZSwgc3Bpbm5lckFwaTogYXBpIH0pO1xuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblx0XHR9XG5cblx0XHQvLyBUaGlzIHNwaW5uZXIgaXMgZ29vZCB0byBnby4gRmlyZSB0aGUgb25Mb2FkZWQgZXhwcmVzc2lvbi5cblx0XHRpZiAodm0ub25Mb2FkZWQpIHtcblx0XHRcdHZtLm9uTG9hZGVkKHsgc3Bpbm5lclNlcnZpY2U6IHNwaW5uZXJTZXJ2aWNlLCBzcGlubmVyQXBpOiBhcGkgfSk7XG5cdFx0fVxuXG5cdH1cblxufSkoKTsiLCIoZnVuY3Rpb24oKXtcblxuXHQndXNlIHN0cmljdCc7XG5cblx0YW5ndWxhclxuXHRcdC5tb2R1bGUoJ2FwcCcpXG5cdFx0LmRpcmVjdGl2ZSgnc3Bpbm5lcicsIHNwaW5uZXIpO1xuXG5cdGZ1bmN0aW9uIHNwaW5uZXIoKXtcblxuXHRcdHJldHVybiB7XG5cdFx0XHRyZXN0cmljdDogJ0FFJyxcblx0XHRcdHJlcGxhY2U6IHRydWUsXG5cdFx0XHR0cmFuc2NsdWRlOiB0cnVlLFxuXHRcdFx0c2NvcGU6IHtcblx0XHRcdFx0bmFtZTogJ0A/Jyxcblx0XHRcdFx0Z3JvdXA6ICdAPycsXG5cdFx0XHRcdHNob3c6ICc9PycsXG5cdFx0XHRcdGltZ1NyYzogJ0A/Jyxcblx0XHRcdFx0cmVnaXN0ZXI6ICdAPycsXG5cdFx0XHRcdG9uTG9hZGVkOiAnJj8nLFxuXHRcdFx0XHRvblNob3c6ICcmPycsXG5cdFx0XHRcdG9uSGlkZTogJyY/J1xuXHRcdFx0fSxcblx0XHRcdHRlbXBsYXRlOiBbXG5cdFx0XHRcdCc8ZGl2IG5nLXNob3c9XCJzcGlubmVyVm0uc2hvd1wiPicsXG5cdFx0XHRcdCcgIDxpbWcgbmctaWY9XCJzcGlubmVyVm0uaW1nU3JjXCIgbmctc3JjPVwie3tzcGlubmVyVm0uaW1nU3JjfX1cIiAvPicsXG5cdFx0XHRcdCcgIDxuZy10cmFuc2NsdWRlPjwvbmctdHJhbnNjbHVkZT4nLFxuXHRcdFx0XHQnPC9kaXY+J1xuXHRcdFx0XS5qb2luKCcnKSxcblx0XHRcdGNvbnRyb2xsZXI6ICdTcGlubmVyQ29udHJvbGxlcicsXG5cdFx0XHRjb250cm9sbGVyQXM6ICdzcGlubmVyVm0nLFxuXHRcdFx0YmluZFRvQ29udHJvbGxlcjogdHJ1ZVxuXHRcdH07XG5cblx0fVxuXG59KSgpOyIsIihmdW5jdGlvbigpe1xuXG5cdCd1c2Ugc3RyaWN0JztcblxuXHRhbmd1bGFyXG5cdFx0Lm1vZHVsZSgnYXBwLmNvcmUnKVxuXHRcdC5kaXJlY3RpdmUoJ3VuaXF1ZVByZWZpeCcsIHVuaXF1ZVByZWZpeCk7XG5cblx0dW5pcXVlUHJlZml4LiRpbmplY3QgPSBbJyRxJywgJ2JyYW5jaGVzU2VydmljZScsICdlcnJvclNlcnZpY2UnXTtcblx0ZnVuY3Rpb24gdW5pcXVlUHJlZml4KCRxLCBicmFuY2hlc1NlcnZpY2UsIGVycm9yU2VydmljZSl7XG5cblx0XHRyZXR1cm4ge1xuXHRcdFx0cmVzdHJpY3Q6ICdBRScsXG5cdFx0XHRyZXF1aXJlOiAnbmdNb2RlbCcsXG5cdFx0XHRsaW5rOiBsaW5rXG5cdFx0fTtcblxuXHRcdGZ1bmN0aW9uIGxpbmsoc2NvcGUsIGVsLCBhdHRycywgY3RybCkge1xuXG5cdFx0ICAgIGN0cmwuJGFzeW5jVmFsaWRhdG9ycy51bmlxdWVQcmVmaXggPSBmdW5jdGlvbihtb2RlbFZhbHVlLCB2aWV3VmFsdWUpIHtcblx0XHQgICAgXHRpZiAoY3RybC4kaXNFbXB0eShtb2RlbFZhbHVlKSkge1xuXHRcdCAgICBcdCAgLy8gY29uc2lkZXIgZW1wdHkgbW9kZWwgdmFsaWRcblx0XHQgICAgXHQgIHJldHVybiAkcS53aGVuKCk7XG5cdFx0ICAgIFx0fVxuXG5cdFx0ICAgIFx0dmFyIGRlZiA9ICRxLmRlZmVyKCk7XG5cblx0XHQgICAgXHRicmFuY2hlc1NlcnZpY2UuaXNQcmVmaXhVbmlxdWUobW9kZWxWYWx1ZSlcblx0XHQgICAgXHQudGhlbihmdW5jdGlvbihyZXMpe1xuXHRcdCAgICBcdFx0Y29uc29sZS5sb2coJ3VuaXF1ZVByZWZpeDogJywgcmVzKTtcblx0XHQgICAgXHQgICAgaWYocmVzLmRhdGEucmVzdWx0KSBkZWYucmVzb2x2ZSgpO1xuXHRcdCAgICBcdCAgICBlbHNlIGRlZi5yZWplY3QoKTtcblx0XHQgICAgXHR9LCBmdW5jdGlvbihlcnIpe1xuXHRcdCAgICBcdCAgICBlcnJvclNlcnZpY2Uuc2hvdyhlcnIpO1xuXHRcdCAgICBcdCAgICBkZWYucmVqZWN0KCk7XG5cdFx0ICAgIFx0fSk7XG5cblx0XHQgICAgXHRyZXR1cm4gZGVmLnByb21pc2U7XG5cdFx0ICAgICAgICBcblx0XHQgICAgfTtcblx0XHR9XG5cblx0fVxuXG59KSgpOyIsIihmdW5jdGlvbigpe1xuXG5cdCd1c2Ugc3RyaWN0JztcblxuXHRhbmd1bGFyXG5cdFx0Lm1vZHVsZSgnYXBwLmNvcmUnKVxuXHRcdC5kaXJlY3RpdmUoJ3ZhbGlkTmFtZScsIHZhbGlkTmFtZSk7XG5cblx0dmFsaWROYW1lLiRpbmplY3QgPSBbJyRxJywgJ2FwaVNlcnZpY2UnLCAnZXJyb3JTZXJ2aWNlJ107XG5cdGZ1bmN0aW9uIHZhbGlkTmFtZSgkcSwgYXBpLCBlcnJvclNlcnZpY2Upe1xuXG5cdFx0cmV0dXJuIHtcblx0XHRcdHJlc3RyaWN0OiAnQUUnLFxuXHRcdFx0cmVxdWlyZTogJ25nTW9kZWwnLFxuXHRcdFx0bGluazogbGlua1xuXHRcdH07XG5cblx0XHRmdW5jdGlvbiBsaW5rKHNjb3BlLCBlbCwgYXR0cnMsIGN0cmwpIHtcblxuXHRcdCAgICBjdHJsLiRhc3luY1ZhbGlkYXRvcnMudmFsaWROYW1lID0gZnVuY3Rpb24obW9kZWxWYWx1ZSwgdmlld1ZhbHVlKSB7XG5cdFx0ICAgICAgICBpZiAoY3RybC4kaXNFbXB0eShtb2RlbFZhbHVlKSkge1xuXHRcdCAgICAgICAgICAvLyBjb25zaWRlciBlbXB0eSBtb2RlbCB2YWxpZFxuXHRcdCAgICAgICAgICByZXR1cm4gJHEud2hlbigpO1xuXHRcdCAgICAgICAgfVxuXG5cdFx0ICAgICAgICB2YXIgZGVmID0gJHEuZGVmZXIoKTtcblxuXHRcdCAgICAgICAgYXBpLnJlcXVlc3Qoe1xuXHRcdCAgICAgICAgICAgIHVybDogJ2lzTmFtZVZhbGlkJyxcblx0XHQgICAgICAgICAgICBwYXJhbXM6IHtcblx0XHQgICAgICAgICAgICAgICAgbmFtZTogbW9kZWxWYWx1ZVxuXHRcdCAgICAgICAgICAgIH1cblx0XHQgICAgICAgIH0pLnRoZW4oZnVuY3Rpb24ocmVzKXtcblx0XHQgICAgICAgIFx0Y29uc29sZS5sb2coJ3ZhbGlkTmFtZTogJywgcmVzKTtcblx0XHQgICAgICAgICAgICBpZihyZXMuZGF0YS5yZXN1bHQpIGRlZi5yZXNvbHZlKCk7XG5cdFx0ICAgICAgICAgICAgZWxzZSBkZWYucmVqZWN0KCk7XG5cdFx0ICAgICAgICB9LCBmdW5jdGlvbihlcnIpe1xuXHRcdCAgICAgICAgICAgIGVycm9yU2VydmljZS5zaG93KGVycik7XG5cdFx0ICAgICAgICAgICAgZGVmLnJlamVjdCgpO1xuXHRcdCAgICAgICAgfSk7XG5cblx0XHQgICAgICAgIHJldHVybiBkZWYucHJvbWlzZTtcblx0XHQgICAgfTtcblx0XHR9XG5cblx0fVxuXG59KSgpOyIsIihmdW5jdGlvbigpe1xuXG5cdCd1c2Ugc3RyaWN0JztcblxuXHRhbmd1bGFyXG5cdFx0Lm1vZHVsZSgnYXBwLmNvcmUnKVxuXHRcdC5kaXJlY3RpdmUoJ3ZhbGlkUHJlZml4JywgdmFsaWRQcmVmaXgpO1xuXG5cdHZhbGlkUHJlZml4LiRpbmplY3QgPSBbJ2JyYW5jaGVzU2VydmljZSddO1xuXHRmdW5jdGlvbiB2YWxpZFByZWZpeChicmFuY2hlc1NlcnZpY2Upe1xuXG5cdFx0cmV0dXJuIHtcblx0XHRcdHJlc3RyaWN0OiAnQUUnLFxuXHRcdFx0cmVxdWlyZTogJ25nTW9kZWwnLFxuXHRcdFx0bGluazogbGlua1xuXHRcdH07XG5cblx0XHRmdW5jdGlvbiBsaW5rKHNjb3BlLCBlbCwgYXR0cnMsIGN0cmwpIHtcblxuXHRcdCAgICBlbC5vbigna2V5ZG93bicsIGZ1bmN0aW9uIChlKXtcblx0XHQgICAgICAgIGlmIChlLmFsdEtleSB8fCBlLmtleUNvZGUgPT09IDE4IHx8IGUua2V5Q29kZSA9PT0gMzIgfHwgKGUua2V5Q29kZSAhPT0gMTg5ICYmIGUua2V5Q29kZSA+IDkwKSkge1xuXHRcdCAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcblx0XHQgICAgICAgIH1cblx0XHQgICAgfSk7XG5cdFx0ICAgIFxuXHRcdCAgICBjdHJsLiR2YWxpZGF0b3JzLnZhbGlkUHJlZml4ID0gZnVuY3Rpb24obW9kZWxWYWx1ZSwgdmlld1ZhbHVlKSB7XG5cdFx0ICAgIFx0aWYgKGN0cmwuJGlzRW1wdHkobW9kZWxWYWx1ZSkpIHtcblx0XHQgICAgXHQgIC8vIGNvbnNpZGVyIGVtcHR5IG1vZGVsIHZhbGlkXG5cdFx0ICAgIFx0ICByZXR1cm4gdHJ1ZTtcblx0XHQgICAgXHR9XG5cblx0XHQgICAgXHRpZihicmFuY2hlc1NlcnZpY2UuaXNQcmVmaXhWYWxpZChtb2RlbFZhbHVlKSkge1xuXHRcdCAgICBcdFx0cmV0dXJuIHRydWU7XG5cdFx0ICAgIFx0fSBlbHNlIHtcblx0XHQgICAgXHRcdHJldHVybiBmYWxzZTtcblx0XHQgICAgXHR9XG5cdFx0ICAgICAgICBcblx0XHQgICAgfTtcblx0XHR9XG5cblx0fVxuXG59KSgpOyIsIihmdW5jdGlvbigpe1xuXG5cdCd1c2Ugc3RyaWN0JztcblxuXHRhbmd1bGFyXG5cdFx0Lm1vZHVsZSgnYXBwLmxheW91dCcpXG5cdFx0LmNvbnRyb2xsZXIoJ0Zvb3RlckNvbnRyb2xsZXInLCBGb290ZXJDb250cm9sbGVyKTtcblxuXHRGb290ZXJDb250cm9sbGVyLiRpbmplY3QgPSBbJyRyb290U2NvcGUnXTtcblxuXHRmdW5jdGlvbiBGb290ZXJDb250cm9sbGVyKCRyb290U2NvcGUpIHtcblxuXHRcdHZhciB2bSA9IHRoaXM7XG5cdFx0Ly8gdm0uZm9vdGVyID0gdHJ1ZTtcblx0XHRcblx0fVxuXG59KSgpOyIsIihmdW5jdGlvbigpe1xuXG5cdCd1c2Ugc3RyaWN0JztcblxuXHRhbmd1bGFyXG5cdFx0Lm1vZHVsZSgnYXBwLmxheW91dCcpXG5cdFx0LmRpcmVjdGl2ZSgnZm9vdGVyJywgZm9vdGVyKTtcblxuXHRmdW5jdGlvbiBmb290ZXIoKXtcblxuXHRcdHJldHVybiB7XG5cdFx0XHRyZXN0cmljdDogJ0FFJyxcblx0XHRcdHRyYW5zY2x1ZGU6IHRydWUsXG5cdFx0XHRjb250cm9sbGVyOiAnRm9vdGVyQ29udHJvbGxlcicsXG5cdFx0XHRjb250cm9sbGVyQXM6ICdmb290ZXJWbScsXG5cdFx0XHR0ZW1wbGF0ZVVybDogJ2xheW91dC9mb290ZXIvZm9vdGVyLmh0bWwnXG5cdFx0fTtcblxuXHR9XG5cbn0pKCk7IiwiKGZ1bmN0aW9uKCl7XG5cblx0J3VzZSBzdHJpY3QnO1xuXG5cdGFuZ3VsYXJcblx0XHQubW9kdWxlKCdhcHAubGF5b3V0Jylcblx0XHQuZGlyZWN0aXZlKCdsYW5nTmF2JywgbGFuZ05hdik7XG5cblx0ZnVuY3Rpb24gbGFuZ05hdigpe1xuXG5cdFx0cmV0dXJuIHtcblx0XHRcdHJlc3RyaWN0OiAnQUUnLFxuXHRcdFx0dHJhbnNjbHVkZTogdHJ1ZSxcblx0XHRcdGNvbnRyb2xsZXI6ICdMYW5nQ29udHJvbGxlcicsXG5cdFx0XHRjb250cm9sbGVyQXM6ICdsYW5nVm0nLFxuXHRcdFx0dGVtcGxhdGVVcmw6ICdsYXlvdXQvbGFuZ25hdi9sYW5nbmF2Lmh0bWwnXG5cdFx0fTtcblxuXHR9XG5cbn0pKCk7IiwiKGZ1bmN0aW9uKCl7XG5cblx0J3VzZSBzdHJpY3QnO1xuXG5cdGFuZ3VsYXJcblx0XHQubW9kdWxlKCdhcHAubGF5b3V0Jylcblx0XHQuY29udHJvbGxlcignTGFuZ0NvbnRyb2xsZXInLCBMYW5nQ29udHJvbGxlcik7XG5cblx0TGFuZ0NvbnRyb2xsZXIuJGluamVjdCA9IFsnJGxvY2FsU3RvcmFnZScsICckcm9vdFNjb3BlJywgJyRzY29wZScsICckdHJhbnNsYXRlJywgJ2FwaVNlcnZpY2UnLCAnYXV0aFNlcnZpY2UnLCAndG1oRHluYW1pY0xvY2FsZSddO1xuXG5cdGZ1bmN0aW9uIExhbmdDb250cm9sbGVyKCRsb2NhbFN0b3JhZ2UsICRyb290U2NvcGUsICRzY29wZSwgJHRyYW5zbGF0ZSwgYXBpLCBhdXRoU2VydmljZSwgdG1oRHluYW1pY0xvY2FsZSkge1xuXG5cdFx0dmFyIHZtID0gdGhpcztcblx0XHR2bS5jaGFuZ2VMYW5ndWFnZSA9IGNoYW5nZUxhbmd1YWdlO1xuXG5cdFx0dG1oRHluYW1pY0xvY2FsZS5zZXQoJGxvY2FsU3RvcmFnZS5OR19UUkFOU0xBVEVfTEFOR19LRVkgfHwgJ2VuJyk7XG5cdFx0XG5cdFx0ZnVuY3Rpb24gY2hhbmdlTGFuZ3VhZ2UobGFuZ0tleSkge1xuXHRcdFx0JHRyYW5zbGF0ZS51c2UobGFuZ0tleSk7XG5cdFx0XHRpZighYXV0aFNlcnZpY2UuaXNMb2dnZWRJbigpKSB7XG5cdFx0XHRcdCRyb290U2NvcGUuJGVtaXQoJ2xhbmcuY2hhbmdlJywgeyBsYW5nOiBsYW5nS2V5IH0pO1xuXHRcdFx0XHQkc2NvcGUubGF5b3V0Vm0udHJpZ2dlckxhbmdNZW51KCk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRhcGkucmVxdWVzdCh7XG5cdFx0XHRcdFx0dXJsOiAnc2V0Q3VzdG9tZXJMYW5nJyxcblx0XHRcdFx0XHRwYXJhbXM6IHtcblx0XHRcdFx0XHRcdGxhbmc6IGxhbmdLZXlcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0pLnRoZW4oZnVuY3Rpb24gKHJlcyl7XG5cdFx0XHRcdFx0Y29uc29sZS5sb2cocmVzLmRhdGEucmVzdWx0KTtcblx0XHRcdFx0XHQkcm9vdFNjb3BlLiRlbWl0KCdsYW5nLmNoYW5nZScsIHsgbGFuZzogbGFuZ0tleSB9KTtcblx0XHRcdFx0XHQkc2NvcGUubGF5b3V0Vm0udHJpZ2dlckxhbmdNZW51KCk7XG5cdFx0XHRcdH0sIGZ1bmN0aW9uIChlcnIpe1xuXHRcdFx0XHRcdGNvbnNvbGUubG9nKGVycik7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXG5cdFx0XHR0bWhEeW5hbWljTG9jYWxlLnNldChsYW5nS2V5KTtcblx0XHR9XG5cblx0fVxuXG59KSgpOyIsIihmdW5jdGlvbigpe1xuXG5cdCd1c2Ugc3RyaWN0JztcblxuXHRhbmd1bGFyXG5cdFx0Lm1vZHVsZSgnYXBwLmxheW91dCcpXG5cdFx0LmRpcmVjdGl2ZSgnc2lkZU1lbnUnLCBzaWRlTWVudSk7XG5cblx0ZnVuY3Rpb24gc2lkZU1lbnUoKXtcblxuXHRcdHJldHVybiB7XG5cdFx0XHRyZXN0cmljdDogJ0FFJyxcblx0XHRcdHRyYW5zY2x1ZGU6IHRydWUsXG5cdFx0XHRjb250cm9sbGVyOiAnU2lkZW1lbnVDb250cm9sbGVyJyxcblx0XHRcdGNvbnRyb2xsZXJBczogJ3NpZGVtZW51Vm0nLFxuXHRcdFx0dGVtcGxhdGVVcmw6ICdsYXlvdXQvc2lkZW1lbnUvc2lkZW1lbnUuaHRtbCdcblx0XHR9O1xuXG5cdH1cblxufSkoKTsiLCIoZnVuY3Rpb24oKXtcblxuXHQndXNlIHN0cmljdCc7XG5cblx0YW5ndWxhclxuXHRcdC5tb2R1bGUoJ2FwcC5sYXlvdXQnKVxuXHRcdC5jb250cm9sbGVyKCdTaWRlbWVudUNvbnRyb2xsZXInLCBTaWRlbWVudUNvbnRyb2xsZXIpO1xuXG5cdFNpZGVtZW51Q29udHJvbGxlci4kaW5qZWN0ID0gWyckcm9vdFNjb3BlJywgJyRsb2NhdGlvbicsICckdHJhbnNsYXRlJywgJ2F1dGhTZXJ2aWNlJywgJ2Vycm9yU2VydmljZScsICd1dGlsc1NlcnZpY2UnLCAnYXBpU2VydmljZScsICdjdXN0b21lclNlcnZpY2UnXTtcblxuXHRmdW5jdGlvbiBTaWRlbWVudUNvbnRyb2xsZXIoJHJvb3RTY29wZSwgJGxvY2F0aW9uLCAkdHJhbnNsYXRlLCBhdXRoU2VydmljZSwgZXJyb3JTZXJ2aWNlLCB1dGlsc1NlcnZpY2UsIGFwaVNlcnZpY2UsIGN1c3RvbWVyU2VydmljZSkge1xuXG5cdFx0dmFyIHZtID0gdGhpcztcblx0XHR2bS5jdXN0b21lciA9IHt9O1xuXHRcdHZtLmN1c3RvbWVyQmFsYW5jZSA9IG51bGw7XG5cdFx0dm0ubG9nb3V0ID0gbG9nb3V0O1xuXHRcdFxuXHRcdGNvbnNvbGUubG9nKCdTaWRlbWVudUNvbnRyb2xsZXI6ICcsIHZtLmN1c3RvbWVyQmFsYW5jZSk7XG5cblx0XHQkcm9vdFNjb3BlLiRvbignY3VzdG9tZXIudXBkYXRlJywgZnVuY3Rpb24oZXZlbnQsIGN1c3RvbWVyKSB7XG5cdFx0XHR2bS5jdXN0b21lciA9IGN1c3RvbWVyO1xuXHRcdH0pO1xuXG5cdFx0JHJvb3RTY29wZS4kb24oJ2F1dGgubG9naW4nLCBmdW5jdGlvbigpIHtcblx0XHRcdGdldEN1c3RvbWVyQmFsYW5jZSgpO1xuXHRcdH0pO1xuXG5cdFx0ZnVuY3Rpb24gc3RyaW5nVG9GaXhlZChzdHJpbmcpIHtcblx0XHRcdHJldHVybiB1dGlsc1NlcnZpY2Uuc3RyaW5nVG9GaXhlZChzdHJpbmcsIDIpO1xuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIGdldEN1c3RvbWVyQmFsYW5jZSgpIHtcblx0XHRcdGFwaVNlcnZpY2UucmVxdWVzdCh7XG5cdFx0XHRcdHVybDogXCJnZXRDdXN0b21lckJhbGFuY2VcIlxuXHRcdFx0fSkudGhlbihmdW5jdGlvbihyZXNwb25zZSl7XG5cdFx0XHRcdHZtLmN1c3RvbWVyLmJhbGFuY2UgPSByZXNwb25zZS5kYXRhLnJlc3VsdDtcblx0XHRcdFx0dm0uY3VzdG9tZXJCYWxhbmNlID0gc3RyaW5nVG9GaXhlZChyZXNwb25zZS5kYXRhLnJlc3VsdCk7XG5cdFx0XHRcdGN1c3RvbWVyU2VydmljZS5zZXRDdXN0b21lckJhbGFuY2UocmVzcG9uc2UuZGF0YS5yZXN1bHQpO1xuXHRcdFx0fSwgZnVuY3Rpb24oZXJyKXtcblx0XHRcdFx0ZXJyb3JTZXJ2aWNlLnNob3cgPSBlcnI7XG5cdFx0XHR9KTtcblx0XHR9XG5cblx0XHRmdW5jdGlvbiBsb2dvdXQoKSB7XG5cdFx0XHRhdXRoU2VydmljZS5sb2dvdXQoKTtcblx0XHR9XG5cblx0fVxuXG59KSgpOyIsIihmdW5jdGlvbigpe1xuXG5cdCd1c2Ugc3RyaWN0JztcblxuXHRhbmd1bGFyXG5cdFx0Lm1vZHVsZSgnYXBwLmxheW91dCcpXG5cdFx0LmNvbnRyb2xsZXIoJ1RvcGJhckNvbnRyb2xsZXInLCBUb3BiYXJDb250cm9sbGVyKTtcblxuXHRUb3BiYXJDb250cm9sbGVyLiRpbmplY3QgPSBbJyRyb290U2NvcGUnLCAnJHNjb3BlJywgJyRsb2NhbFN0b3JhZ2UnLCAnJHRyYW5zbGF0ZSddO1xuXG5cdGZ1bmN0aW9uIFRvcGJhckNvbnRyb2xsZXIoJHJvb3RTY29wZSwgJHNjb3BlLCAkbG9jYWxTdG9yYWdlLCAkdHJhbnNsYXRlKSB7XG5cblx0XHR2YXIgdm0gPSB0aGlzO1xuXHRcdHZtLmxhbmcgPSAkbG9jYWxTdG9yYWdlLk5HX1RSQU5TTEFURV9MQU5HX0tFWSB8fCAkdHJhbnNsYXRlLnVzZSgpO1xuXG5cdFx0JHJvb3RTY29wZS4kb24oJ2xhbmcuY2hhbmdlJywgZnVuY3Rpb24oZSwgZGF0YSl7XG5cdFx0XHRpZihkYXRhLmxhbmcpIHZtLmxhbmcgPSBkYXRhLmxhbmc7XG5cdFx0fSk7XG5cdFx0XG5cblx0fVxuXG59KSgpOyIsIihmdW5jdGlvbigpe1xuXG5cdCd1c2Ugc3RyaWN0JztcblxuXHRhbmd1bGFyXG5cdFx0Lm1vZHVsZSgnYXBwLmxheW91dCcpXG5cdFx0LmRpcmVjdGl2ZSgndG9wQmFyJywgdG9wQmFyKTtcblxuXHRmdW5jdGlvbiB0b3BCYXIoKXtcblxuXHRcdHJldHVybiB7XG5cdFx0XHRyZXN0cmljdDogJ0FFJyxcblx0XHRcdHRyYW5zY2x1ZGU6IHRydWUsXG5cdFx0XHRjb250cm9sbGVyOiAnVG9wYmFyQ29udHJvbGxlcicsXG5cdFx0XHRjb250cm9sbGVyQXM6ICd0b3BiYXJWbScsXG5cdFx0XHR0ZW1wbGF0ZVVybDogJ2xheW91dC90b3BiYXIvdG9wYmFyLmh0bWwnLFxuXHRcdH07XG5cblx0fVxuXG59KSgpOyIsIid1c2Ugc3RyaWN0JztcbmFuZ3VsYXIubW9kdWxlKFwibmdMb2NhbGVcIiwgW10sIFtcIiRwcm92aWRlXCIsIGZ1bmN0aW9uKCRwcm92aWRlKSB7XG52YXIgUExVUkFMX0NBVEVHT1JZID0ge1pFUk86IFwiemVyb1wiLCBPTkU6IFwib25lXCIsIFRXTzogXCJ0d29cIiwgRkVXOiBcImZld1wiLCBNQU5ZOiBcIm1hbnlcIiwgT1RIRVI6IFwib3RoZXJcIn07XG5mdW5jdGlvbiBnZXREZWNpbWFscyhuKSB7XG4gIG4gPSBuICsgJyc7XG4gIHZhciBpID0gbi5pbmRleE9mKCcuJyk7XG4gIHJldHVybiAoaSA9PSAtMSkgPyAwIDogbi5sZW5ndGggLSBpIC0gMTtcbn1cblxuZnVuY3Rpb24gZ2V0VkYobiwgb3B0X3ByZWNpc2lvbikge1xuICB2YXIgdiA9IG9wdF9wcmVjaXNpb247XG5cbiAgaWYgKHVuZGVmaW5lZCA9PT0gdikge1xuICAgIHYgPSBNYXRoLm1pbihnZXREZWNpbWFscyhuKSwgMyk7XG4gIH1cblxuICB2YXIgYmFzZSA9IE1hdGgucG93KDEwLCB2KTtcbiAgdmFyIGYgPSAoKG4gKiBiYXNlKSB8IDApICUgYmFzZTtcbiAgcmV0dXJuIHt2OiB2LCBmOiBmfTtcbn1cblxuJHByb3ZpZGUudmFsdWUoXCIkbG9jYWxlXCIsIHtcbiAgXCJEQVRFVElNRV9GT1JNQVRTXCI6IHtcbiAgICBcIkFNUE1TXCI6IFtcbiAgICAgIFwiQU1cIixcbiAgICAgIFwiUE1cIlxuICAgIF0sXG4gICAgXCJEQVlcIjogW1xuICAgICAgXCJTdW5kYXlcIixcbiAgICAgIFwiTW9uZGF5XCIsXG4gICAgICBcIlR1ZXNkYXlcIixcbiAgICAgIFwiV2VkbmVzZGF5XCIsXG4gICAgICBcIlRodXJzZGF5XCIsXG4gICAgICBcIkZyaWRheVwiLFxuICAgICAgXCJTYXR1cmRheVwiXG4gICAgXSxcbiAgICBcIkVSQU5BTUVTXCI6IFtcbiAgICAgIFwiQmVmb3JlIENocmlzdFwiLFxuICAgICAgXCJBbm5vIERvbWluaVwiXG4gICAgXSxcbiAgICBcIkVSQVNcIjogW1xuICAgICAgXCJCQ1wiLFxuICAgICAgXCJBRFwiXG4gICAgXSxcbiAgICBcIkZJUlNUREFZT0ZXRUVLXCI6IDYsXG4gICAgXCJNT05USFwiOiBbXG4gICAgICBcIkphbnVhcnlcIixcbiAgICAgIFwiRmVicnVhcnlcIixcbiAgICAgIFwiTWFyY2hcIixcbiAgICAgIFwiQXByaWxcIixcbiAgICAgIFwiTWF5XCIsXG4gICAgICBcIkp1bmVcIixcbiAgICAgIFwiSnVseVwiLFxuICAgICAgXCJBdWd1c3RcIixcbiAgICAgIFwiU2VwdGVtYmVyXCIsXG4gICAgICBcIk9jdG9iZXJcIixcbiAgICAgIFwiTm92ZW1iZXJcIixcbiAgICAgIFwiRGVjZW1iZXJcIlxuICAgIF0sXG4gICAgXCJTSE9SVERBWVwiOiBbXG4gICAgICBcIlN1blwiLFxuICAgICAgXCJNb25cIixcbiAgICAgIFwiVHVlXCIsXG4gICAgICBcIldlZFwiLFxuICAgICAgXCJUaHVcIixcbiAgICAgIFwiRnJpXCIsXG4gICAgICBcIlNhdFwiXG4gICAgXSxcbiAgICBcIlNIT1JUTU9OVEhcIjogW1xuICAgICAgXCJKYW5cIixcbiAgICAgIFwiRmViXCIsXG4gICAgICBcIk1hclwiLFxuICAgICAgXCJBcHJcIixcbiAgICAgIFwiTWF5XCIsXG4gICAgICBcIkp1blwiLFxuICAgICAgXCJKdWxcIixcbiAgICAgIFwiQXVnXCIsXG4gICAgICBcIlNlcFwiLFxuICAgICAgXCJPY3RcIixcbiAgICAgIFwiTm92XCIsXG4gICAgICBcIkRlY1wiXG4gICAgXSxcbiAgICBcIlNUQU5EQUxPTkVNT05USFwiOiBbXG4gICAgICBcIkphbnVhcnlcIixcbiAgICAgIFwiRmVicnVhcnlcIixcbiAgICAgIFwiTWFyY2hcIixcbiAgICAgIFwiQXByaWxcIixcbiAgICAgIFwiTWF5XCIsXG4gICAgICBcIkp1bmVcIixcbiAgICAgIFwiSnVseVwiLFxuICAgICAgXCJBdWd1c3RcIixcbiAgICAgIFwiU2VwdGVtYmVyXCIsXG4gICAgICBcIk9jdG9iZXJcIixcbiAgICAgIFwiTm92ZW1iZXJcIixcbiAgICAgIFwiRGVjZW1iZXJcIlxuICAgIF0sXG4gICAgXCJXRUVLRU5EUkFOR0VcIjogW1xuICAgICAgNSxcbiAgICAgIDZcbiAgICBdLFxuICAgIFwiZnVsbERhdGVcIjogXCJFRUVFLCBNTU1NIGQsIHlcIixcbiAgICBcImxvbmdEYXRlXCI6IFwiTU1NTSBkLCB5XCIsXG4gICAgXCJtZWRpdW1cIjogXCJNTU0gZCwgeSBoOm1tOnNzIGFcIixcbiAgICBcIm1lZGl1bURhdGVcIjogXCJNTU0gZCwgeVwiLFxuICAgIFwibWVkaXVtVGltZVwiOiBcImg6bW06c3MgYVwiLFxuICAgIFwic2hvcnRcIjogXCJNL2QveXkgaDptbSBhXCIsXG4gICAgXCJzaG9ydERhdGVcIjogXCJNL2QveXlcIixcbiAgICBcInNob3J0VGltZVwiOiBcImg6bW0gYVwiXG4gIH0sXG4gIFwiTlVNQkVSX0ZPUk1BVFNcIjoge1xuICAgIFwiQ1VSUkVOQ1lfU1lNXCI6IFwiJFwiLFxuICAgIFwiREVDSU1BTF9TRVBcIjogXCIuXCIsXG4gICAgXCJHUk9VUF9TRVBcIjogXCIsXCIsXG4gICAgXCJQQVRURVJOU1wiOiBbXG4gICAgICB7XG4gICAgICAgIFwiZ1NpemVcIjogMyxcbiAgICAgICAgXCJsZ1NpemVcIjogMyxcbiAgICAgICAgXCJtYXhGcmFjXCI6IDMsXG4gICAgICAgIFwibWluRnJhY1wiOiAwLFxuICAgICAgICBcIm1pbkludFwiOiAxLFxuICAgICAgICBcIm5lZ1ByZVwiOiBcIi1cIixcbiAgICAgICAgXCJuZWdTdWZcIjogXCJcIixcbiAgICAgICAgXCJwb3NQcmVcIjogXCJcIixcbiAgICAgICAgXCJwb3NTdWZcIjogXCJcIlxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgXCJnU2l6ZVwiOiAzLFxuICAgICAgICBcImxnU2l6ZVwiOiAzLFxuICAgICAgICBcIm1heEZyYWNcIjogMixcbiAgICAgICAgXCJtaW5GcmFjXCI6IDIsXG4gICAgICAgIFwibWluSW50XCI6IDEsXG4gICAgICAgIFwibmVnUHJlXCI6IFwiLVxcdTAwYTRcIixcbiAgICAgICAgXCJuZWdTdWZcIjogXCJcIixcbiAgICAgICAgXCJwb3NQcmVcIjogXCJcXHUwMGE0XCIsXG4gICAgICAgIFwicG9zU3VmXCI6IFwiXCJcbiAgICAgIH1cbiAgICBdXG4gIH0sXG4gIFwiaWRcIjogXCJlblwiLFxuICBcImxvY2FsZUlEXCI6IFwiZW5cIixcbiAgXCJwbHVyYWxDYXRcIjogZnVuY3Rpb24obiwgb3B0X3ByZWNpc2lvbikgeyAgdmFyIGkgPSBuIHwgMDsgIHZhciB2ZiA9IGdldFZGKG4sIG9wdF9wcmVjaXNpb24pOyAgaWYgKGkgPT0gMSAmJiB2Zi52ID09IDApIHsgICAgcmV0dXJuIFBMVVJBTF9DQVRFR09SWS5PTkU7ICB9ICByZXR1cm4gUExVUkFMX0NBVEVHT1JZLk9USEVSO31cbn0pO1xufV0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuYW5ndWxhci5tb2R1bGUoXCJuZ0xvY2FsZVwiLCBbXSwgW1wiJHByb3ZpZGVcIiwgZnVuY3Rpb24oJHByb3ZpZGUpIHtcbnZhciBQTFVSQUxfQ0FURUdPUlkgPSB7WkVSTzogXCJ6ZXJvXCIsIE9ORTogXCJvbmVcIiwgVFdPOiBcInR3b1wiLCBGRVc6IFwiZmV3XCIsIE1BTlk6IFwibWFueVwiLCBPVEhFUjogXCJvdGhlclwifTtcbmZ1bmN0aW9uIGdldERlY2ltYWxzKG4pIHtcbiAgbiA9IG4gKyAnJztcbiAgdmFyIGkgPSBuLmluZGV4T2YoJy4nKTtcbiAgcmV0dXJuIChpID09IC0xKSA/IDAgOiBuLmxlbmd0aCAtIGkgLSAxO1xufVxuXG5mdW5jdGlvbiBnZXRWRihuLCBvcHRfcHJlY2lzaW9uKSB7XG4gIHZhciB2ID0gb3B0X3ByZWNpc2lvbjtcblxuICBpZiAodW5kZWZpbmVkID09PSB2KSB7XG4gICAgdiA9IE1hdGgubWluKGdldERlY2ltYWxzKG4pLCAzKTtcbiAgfVxuXG4gIHZhciBiYXNlID0gTWF0aC5wb3coMTAsIHYpO1xuICB2YXIgZiA9ICgobiAqIGJhc2UpIHwgMCkgJSBiYXNlO1xuICByZXR1cm4ge3Y6IHYsIGY6IGZ9O1xufVxuXG4kcHJvdmlkZS52YWx1ZShcIiRsb2NhbGVcIiwge1xuICBcIkRBVEVUSU1FX0ZPUk1BVFNcIjoge1xuICAgIFwiQU1QTVNcIjogW1xuICAgICAgXCJBTVwiLFxuICAgICAgXCJQTVwiXG4gICAgXSxcbiAgICBcIkRBWVwiOiBbXG4gICAgICBcIlxcdTA0MzJcXHUwNDNlXFx1MDQ0MVxcdTA0M2FcXHUwNDQwXFx1MDQzNVxcdTA0NDFcXHUwNDM1XFx1MDQzZFxcdTA0NGNcXHUwNDM1XCIsXG4gICAgICBcIlxcdTA0M2ZcXHUwNDNlXFx1MDQzZFxcdTA0MzVcXHUwNDM0XFx1MDQzNVxcdTA0M2JcXHUwNDRjXFx1MDQzZFxcdTA0MzhcXHUwNDNhXCIsXG4gICAgICBcIlxcdTA0MzJcXHUwNDQyXFx1MDQzZVxcdTA0NDBcXHUwNDNkXFx1MDQzOFxcdTA0M2FcIixcbiAgICAgIFwiXFx1MDQ0MVxcdTA0NDBcXHUwNDM1XFx1MDQzNFxcdTA0MzBcIixcbiAgICAgIFwiXFx1MDQ0N1xcdTA0MzVcXHUwNDQyXFx1MDQzMlxcdTA0MzVcXHUwNDQwXFx1MDQzM1wiLFxuICAgICAgXCJcXHUwNDNmXFx1MDQ0ZlxcdTA0NDJcXHUwNDNkXFx1MDQzOFxcdTA0NDZcXHUwNDMwXCIsXG4gICAgICBcIlxcdTA0NDFcXHUwNDQzXFx1MDQzMVxcdTA0MzFcXHUwNDNlXFx1MDQ0MlxcdTA0MzBcIlxuICAgIF0sXG4gICAgXCJFUkFOQU1FU1wiOiBbXG4gICAgICBcIlxcdTA0MzRcXHUwNDNlIFxcdTA0M2QuIFxcdTA0NGQuXCIsXG4gICAgICBcIlxcdTA0M2QuIFxcdTA0NGQuXCJcbiAgICBdLFxuICAgIFwiRVJBU1wiOiBbXG4gICAgICBcIlxcdTA0MzRcXHUwNDNlIFxcdTA0M2QuIFxcdTA0NGQuXCIsXG4gICAgICBcIlxcdTA0M2QuIFxcdTA0NGQuXCJcbiAgICBdLFxuICAgIFwiRklSU1REQVlPRldFRUtcIjogMCxcbiAgICBcIk1PTlRIXCI6IFtcbiAgICAgIFwiXFx1MDQ0ZlxcdTA0M2RcXHUwNDMyXFx1MDQzMFxcdTA0NDBcXHUwNDRmXCIsXG4gICAgICBcIlxcdTA0NDRcXHUwNDM1XFx1MDQzMlxcdTA0NDBcXHUwNDMwXFx1MDQzYlxcdTA0NGZcIixcbiAgICAgIFwiXFx1MDQzY1xcdTA0MzBcXHUwNDQwXFx1MDQ0MlxcdTA0MzBcIixcbiAgICAgIFwiXFx1MDQzMFxcdTA0M2ZcXHUwNDQwXFx1MDQzNVxcdTA0M2JcXHUwNDRmXCIsXG4gICAgICBcIlxcdTA0M2NcXHUwNDMwXFx1MDQ0ZlwiLFxuICAgICAgXCJcXHUwNDM4XFx1MDQ0ZVxcdTA0M2RcXHUwNDRmXCIsXG4gICAgICBcIlxcdTA0MzhcXHUwNDRlXFx1MDQzYlxcdTA0NGZcIixcbiAgICAgIFwiXFx1MDQzMFxcdTA0MzJcXHUwNDMzXFx1MDQ0M1xcdTA0NDFcXHUwNDQyXFx1MDQzMFwiLFxuICAgICAgXCJcXHUwNDQxXFx1MDQzNVxcdTA0M2RcXHUwNDQyXFx1MDQ0ZlxcdTA0MzFcXHUwNDQwXFx1MDQ0ZlwiLFxuICAgICAgXCJcXHUwNDNlXFx1MDQzYVxcdTA0NDJcXHUwNDRmXFx1MDQzMVxcdTA0NDBcXHUwNDRmXCIsXG4gICAgICBcIlxcdTA0M2RcXHUwNDNlXFx1MDQ0ZlxcdTA0MzFcXHUwNDQwXFx1MDQ0ZlwiLFxuICAgICAgXCJcXHUwNDM0XFx1MDQzNVxcdTA0M2FcXHUwNDMwXFx1MDQzMVxcdTA0NDBcXHUwNDRmXCJcbiAgICBdLFxuICAgIFwiU0hPUlREQVlcIjogW1xuICAgICAgXCJcXHUwNDMyXFx1MDQ0MVwiLFxuICAgICAgXCJcXHUwNDNmXFx1MDQzZFwiLFxuICAgICAgXCJcXHUwNDMyXFx1MDQ0MlwiLFxuICAgICAgXCJcXHUwNDQxXFx1MDQ0MFwiLFxuICAgICAgXCJcXHUwNDQ3XFx1MDQ0MlwiLFxuICAgICAgXCJcXHUwNDNmXFx1MDQ0MlwiLFxuICAgICAgXCJcXHUwNDQxXFx1MDQzMVwiXG4gICAgXSxcbiAgICBcIlNIT1JUTU9OVEhcIjogW1xuICAgICAgXCJcXHUwNDRmXFx1MDQzZFxcdTA0MzIuXCIsXG4gICAgICBcIlxcdTA0NDRcXHUwNDM1XFx1MDQzMlxcdTA0NDAuXCIsXG4gICAgICBcIlxcdTA0M2NcXHUwNDMwXFx1MDQ0MFxcdTA0NDJcXHUwNDMwXCIsXG4gICAgICBcIlxcdTA0MzBcXHUwNDNmXFx1MDQ0MC5cIixcbiAgICAgIFwiXFx1MDQzY1xcdTA0MzBcXHUwNDRmXCIsXG4gICAgICBcIlxcdTA0MzhcXHUwNDRlXFx1MDQzZFxcdTA0NGZcIixcbiAgICAgIFwiXFx1MDQzOFxcdTA0NGVcXHUwNDNiXFx1MDQ0ZlwiLFxuICAgICAgXCJcXHUwNDMwXFx1MDQzMlxcdTA0MzMuXCIsXG4gICAgICBcIlxcdTA0NDFcXHUwNDM1XFx1MDQzZFxcdTA0NDIuXCIsXG4gICAgICBcIlxcdTA0M2VcXHUwNDNhXFx1MDQ0Mi5cIixcbiAgICAgIFwiXFx1MDQzZFxcdTA0M2VcXHUwNDRmXFx1MDQzMS5cIixcbiAgICAgIFwiXFx1MDQzNFxcdTA0MzVcXHUwNDNhLlwiXG4gICAgXSxcbiAgICBcIlNUQU5EQUxPTkVNT05USFwiOiBbXG4gICAgICBcIlxcdTA0NGZcXHUwNDNkXFx1MDQzMlxcdTA0MzBcXHUwNDQwXFx1MDQ0Y1wiLFxuICAgICAgXCJcXHUwNDQ0XFx1MDQzNVxcdTA0MzJcXHUwNDQwXFx1MDQzMFxcdTA0M2JcXHUwNDRjXCIsXG4gICAgICBcIlxcdTA0M2NcXHUwNDMwXFx1MDQ0MFxcdTA0NDJcIixcbiAgICAgIFwiXFx1MDQzMFxcdTA0M2ZcXHUwNDQwXFx1MDQzNVxcdTA0M2JcXHUwNDRjXCIsXG4gICAgICBcIlxcdTA0M2NcXHUwNDMwXFx1MDQzOVwiLFxuICAgICAgXCJcXHUwNDM4XFx1MDQ0ZVxcdTA0M2RcXHUwNDRjXCIsXG4gICAgICBcIlxcdTA0MzhcXHUwNDRlXFx1MDQzYlxcdTA0NGNcIixcbiAgICAgIFwiXFx1MDQzMFxcdTA0MzJcXHUwNDMzXFx1MDQ0M1xcdTA0NDFcXHUwNDQyXCIsXG4gICAgICBcIlxcdTA0NDFcXHUwNDM1XFx1MDQzZFxcdTA0NDJcXHUwNDRmXFx1MDQzMVxcdTA0NDBcXHUwNDRjXCIsXG4gICAgICBcIlxcdTA0M2VcXHUwNDNhXFx1MDQ0MlxcdTA0NGZcXHUwNDMxXFx1MDQ0MFxcdTA0NGNcIixcbiAgICAgIFwiXFx1MDQzZFxcdTA0M2VcXHUwNDRmXFx1MDQzMVxcdTA0NDBcXHUwNDRjXCIsXG4gICAgICBcIlxcdTA0MzRcXHUwNDM1XFx1MDQzYVxcdTA0MzBcXHUwNDMxXFx1MDQ0MFxcdTA0NGNcIlxuICAgIF0sXG4gICAgXCJXRUVLRU5EUkFOR0VcIjogW1xuICAgICAgNSxcbiAgICAgIDZcbiAgICBdLFxuICAgIFwiZnVsbERhdGVcIjogXCJFRUVFLCBkIE1NTU0geSAnXFx1MDQzMycuXCIsXG4gICAgXCJsb25nRGF0ZVwiOiBcImQgTU1NTSB5ICdcXHUwNDMzJy5cIixcbiAgICBcIm1lZGl1bVwiOiBcImQgTU1NIHkgJ1xcdTA0MzMnLiBIOm1tOnNzXCIsXG4gICAgXCJtZWRpdW1EYXRlXCI6IFwiZCBNTU0geSAnXFx1MDQzMycuXCIsXG4gICAgXCJtZWRpdW1UaW1lXCI6IFwiSDptbTpzc1wiLFxuICAgIFwic2hvcnRcIjogXCJkZC5NTS55eSBIOm1tXCIsXG4gICAgXCJzaG9ydERhdGVcIjogXCJkZC5NTS55eVwiLFxuICAgIFwic2hvcnRUaW1lXCI6IFwiSDptbVwiXG4gIH0sXG4gIFwiTlVNQkVSX0ZPUk1BVFNcIjoge1xuICAgIFwiQ1VSUkVOQ1lfU1lNXCI6IFwiXFx1MDQ0MFxcdTA0NDNcXHUwNDMxLlwiLFxuICAgIFwiREVDSU1BTF9TRVBcIjogXCIsXCIsXG4gICAgXCJHUk9VUF9TRVBcIjogXCJcXHUwMGEwXCIsXG4gICAgXCJQQVRURVJOU1wiOiBbXG4gICAgICB7XG4gICAgICAgIFwiZ1NpemVcIjogMyxcbiAgICAgICAgXCJsZ1NpemVcIjogMyxcbiAgICAgICAgXCJtYXhGcmFjXCI6IDMsXG4gICAgICAgIFwibWluRnJhY1wiOiAwLFxuICAgICAgICBcIm1pbkludFwiOiAxLFxuICAgICAgICBcIm5lZ1ByZVwiOiBcIi1cIixcbiAgICAgICAgXCJuZWdTdWZcIjogXCJcIixcbiAgICAgICAgXCJwb3NQcmVcIjogXCJcIixcbiAgICAgICAgXCJwb3NTdWZcIjogXCJcIlxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgXCJnU2l6ZVwiOiAzLFxuICAgICAgICBcImxnU2l6ZVwiOiAzLFxuICAgICAgICBcIm1heEZyYWNcIjogMixcbiAgICAgICAgXCJtaW5GcmFjXCI6IDIsXG4gICAgICAgIFwibWluSW50XCI6IDEsXG4gICAgICAgIFwibmVnUHJlXCI6IFwiLVwiLFxuICAgICAgICBcIm5lZ1N1ZlwiOiBcIlxcdTAwYTBcXHUwMGE0XCIsXG4gICAgICAgIFwicG9zUHJlXCI6IFwiXCIsXG4gICAgICAgIFwicG9zU3VmXCI6IFwiXFx1MDBhMFxcdTAwYTRcIlxuICAgICAgfVxuICAgIF1cbiAgfSxcbiAgXCJpZFwiOiBcInJ1LXJ1XCIsXG4gIFwibG9jYWxlSURcIjogXCJydV9SVVwiLFxuICBcInBsdXJhbENhdFwiOiBmdW5jdGlvbihuLCBvcHRfcHJlY2lzaW9uKSB7ICB2YXIgaSA9IG4gfCAwOyAgdmFyIHZmID0gZ2V0VkYobiwgb3B0X3ByZWNpc2lvbik7ICBpZiAodmYudiA9PSAwICYmIGkgJSAxMCA9PSAxICYmIGkgJSAxMDAgIT0gMTEpIHsgICAgcmV0dXJuIFBMVVJBTF9DQVRFR09SWS5PTkU7ICB9ICBpZiAodmYudiA9PSAwICYmIGkgJSAxMCA+PSAyICYmIGkgJSAxMCA8PSA0ICYmIChpICUgMTAwIDwgMTIgfHwgaSAlIDEwMCA+IDE0KSkgeyAgICByZXR1cm4gUExVUkFMX0NBVEVHT1JZLkZFVzsgIH0gIGlmICh2Zi52ID09IDAgJiYgaSAlIDEwID09IDAgfHwgdmYudiA9PSAwICYmIGkgJSAxMCA+PSA1ICYmIGkgJSAxMCA8PSA5IHx8IHZmLnYgPT0gMCAmJiBpICUgMTAwID49IDExICYmIGkgJSAxMDAgPD0gMTQpIHsgICAgcmV0dXJuIFBMVVJBTF9DQVRFR09SWS5NQU5ZOyAgfSAgcmV0dXJuIFBMVVJBTF9DQVRFR09SWS5PVEhFUjt9XG59KTtcbn1dKTtcbiIsIid1c2Ugc3RyaWN0JztcbmFuZ3VsYXIubW9kdWxlKFwibmdMb2NhbGVcIiwgW10sIFtcIiRwcm92aWRlXCIsIGZ1bmN0aW9uKCRwcm92aWRlKSB7XG52YXIgUExVUkFMX0NBVEVHT1JZID0ge1pFUk86IFwiemVyb1wiLCBPTkU6IFwib25lXCIsIFRXTzogXCJ0d29cIiwgRkVXOiBcImZld1wiLCBNQU5ZOiBcIm1hbnlcIiwgT1RIRVI6IFwib3RoZXJcIn07XG5mdW5jdGlvbiBnZXREZWNpbWFscyhuKSB7XG4gIG4gPSBuICsgJyc7XG4gIHZhciBpID0gbi5pbmRleE9mKCcuJyk7XG4gIHJldHVybiAoaSA9PSAtMSkgPyAwIDogbi5sZW5ndGggLSBpIC0gMTtcbn1cblxuZnVuY3Rpb24gZ2V0VkYobiwgb3B0X3ByZWNpc2lvbikge1xuICB2YXIgdiA9IG9wdF9wcmVjaXNpb247XG5cbiAgaWYgKHVuZGVmaW5lZCA9PT0gdikge1xuICAgIHYgPSBNYXRoLm1pbihnZXREZWNpbWFscyhuKSwgMyk7XG4gIH1cblxuICB2YXIgYmFzZSA9IE1hdGgucG93KDEwLCB2KTtcbiAgdmFyIGYgPSAoKG4gKiBiYXNlKSB8IDApICUgYmFzZTtcbiAgcmV0dXJuIHt2OiB2LCBmOiBmfTtcbn1cblxuJHByb3ZpZGUudmFsdWUoXCIkbG9jYWxlXCIsIHtcbiAgXCJEQVRFVElNRV9GT1JNQVRTXCI6IHtcbiAgICBcIkFNUE1TXCI6IFtcbiAgICAgIFwiQU1cIixcbiAgICAgIFwiUE1cIlxuICAgIF0sXG4gICAgXCJEQVlcIjogW1xuICAgICAgXCJcXHUwNDMyXFx1MDQzZVxcdTA0NDFcXHUwNDNhXFx1MDQ0MFxcdTA0MzVcXHUwNDQxXFx1MDQzNVxcdTA0M2RcXHUwNDRjXFx1MDQzNVwiLFxuICAgICAgXCJcXHUwNDNmXFx1MDQzZVxcdTA0M2RcXHUwNDM1XFx1MDQzNFxcdTA0MzVcXHUwNDNiXFx1MDQ0Y1xcdTA0M2RcXHUwNDM4XFx1MDQzYVwiLFxuICAgICAgXCJcXHUwNDMyXFx1MDQ0MlxcdTA0M2VcXHUwNDQwXFx1MDQzZFxcdTA0MzhcXHUwNDNhXCIsXG4gICAgICBcIlxcdTA0NDFcXHUwNDQwXFx1MDQzNVxcdTA0MzRcXHUwNDMwXCIsXG4gICAgICBcIlxcdTA0NDdcXHUwNDM1XFx1MDQ0MlxcdTA0MzJcXHUwNDM1XFx1MDQ0MFxcdTA0MzNcIixcbiAgICAgIFwiXFx1MDQzZlxcdTA0NGZcXHUwNDQyXFx1MDQzZFxcdTA0MzhcXHUwNDQ2XFx1MDQzMFwiLFxuICAgICAgXCJcXHUwNDQxXFx1MDQ0M1xcdTA0MzFcXHUwNDMxXFx1MDQzZVxcdTA0NDJcXHUwNDMwXCJcbiAgICBdLFxuICAgIFwiRVJBTkFNRVNcIjogW1xuICAgICAgXCJcXHUwNDM0XFx1MDQzZSBcXHUwNDNkLiBcXHUwNDRkLlwiLFxuICAgICAgXCJcXHUwNDNkLiBcXHUwNDRkLlwiXG4gICAgXSxcbiAgICBcIkVSQVNcIjogW1xuICAgICAgXCJcXHUwNDM0XFx1MDQzZSBcXHUwNDNkLiBcXHUwNDRkLlwiLFxuICAgICAgXCJcXHUwNDNkLiBcXHUwNDRkLlwiXG4gICAgXSxcbiAgICBcIkZJUlNUREFZT0ZXRUVLXCI6IDAsXG4gICAgXCJNT05USFwiOiBbXG4gICAgICBcIlxcdTA0NGZcXHUwNDNkXFx1MDQzMlxcdTA0MzBcXHUwNDQwXFx1MDQ0ZlwiLFxuICAgICAgXCJcXHUwNDQ0XFx1MDQzNVxcdTA0MzJcXHUwNDQwXFx1MDQzMFxcdTA0M2JcXHUwNDRmXCIsXG4gICAgICBcIlxcdTA0M2NcXHUwNDMwXFx1MDQ0MFxcdTA0NDJcXHUwNDMwXCIsXG4gICAgICBcIlxcdTA0MzBcXHUwNDNmXFx1MDQ0MFxcdTA0MzVcXHUwNDNiXFx1MDQ0ZlwiLFxuICAgICAgXCJcXHUwNDNjXFx1MDQzMFxcdTA0NGZcIixcbiAgICAgIFwiXFx1MDQzOFxcdTA0NGVcXHUwNDNkXFx1MDQ0ZlwiLFxuICAgICAgXCJcXHUwNDM4XFx1MDQ0ZVxcdTA0M2JcXHUwNDRmXCIsXG4gICAgICBcIlxcdTA0MzBcXHUwNDMyXFx1MDQzM1xcdTA0NDNcXHUwNDQxXFx1MDQ0MlxcdTA0MzBcIixcbiAgICAgIFwiXFx1MDQ0MVxcdTA0MzVcXHUwNDNkXFx1MDQ0MlxcdTA0NGZcXHUwNDMxXFx1MDQ0MFxcdTA0NGZcIixcbiAgICAgIFwiXFx1MDQzZVxcdTA0M2FcXHUwNDQyXFx1MDQ0ZlxcdTA0MzFcXHUwNDQwXFx1MDQ0ZlwiLFxuICAgICAgXCJcXHUwNDNkXFx1MDQzZVxcdTA0NGZcXHUwNDMxXFx1MDQ0MFxcdTA0NGZcIixcbiAgICAgIFwiXFx1MDQzNFxcdTA0MzVcXHUwNDNhXFx1MDQzMFxcdTA0MzFcXHUwNDQwXFx1MDQ0ZlwiXG4gICAgXSxcbiAgICBcIlNIT1JUREFZXCI6IFtcbiAgICAgIFwiXFx1MDQzMlxcdTA0NDFcIixcbiAgICAgIFwiXFx1MDQzZlxcdTA0M2RcIixcbiAgICAgIFwiXFx1MDQzMlxcdTA0NDJcIixcbiAgICAgIFwiXFx1MDQ0MVxcdTA0NDBcIixcbiAgICAgIFwiXFx1MDQ0N1xcdTA0NDJcIixcbiAgICAgIFwiXFx1MDQzZlxcdTA0NDJcIixcbiAgICAgIFwiXFx1MDQ0MVxcdTA0MzFcIlxuICAgIF0sXG4gICAgXCJTSE9SVE1PTlRIXCI6IFtcbiAgICAgIFwiXFx1MDQ0ZlxcdTA0M2RcXHUwNDMyLlwiLFxuICAgICAgXCJcXHUwNDQ0XFx1MDQzNVxcdTA0MzJcXHUwNDQwLlwiLFxuICAgICAgXCJcXHUwNDNjXFx1MDQzMFxcdTA0NDBcXHUwNDQyXFx1MDQzMFwiLFxuICAgICAgXCJcXHUwNDMwXFx1MDQzZlxcdTA0NDAuXCIsXG4gICAgICBcIlxcdTA0M2NcXHUwNDMwXFx1MDQ0ZlwiLFxuICAgICAgXCJcXHUwNDM4XFx1MDQ0ZVxcdTA0M2RcXHUwNDRmXCIsXG4gICAgICBcIlxcdTA0MzhcXHUwNDRlXFx1MDQzYlxcdTA0NGZcIixcbiAgICAgIFwiXFx1MDQzMFxcdTA0MzJcXHUwNDMzLlwiLFxuICAgICAgXCJcXHUwNDQxXFx1MDQzNVxcdTA0M2RcXHUwNDQyLlwiLFxuICAgICAgXCJcXHUwNDNlXFx1MDQzYVxcdTA0NDIuXCIsXG4gICAgICBcIlxcdTA0M2RcXHUwNDNlXFx1MDQ0ZlxcdTA0MzEuXCIsXG4gICAgICBcIlxcdTA0MzRcXHUwNDM1XFx1MDQzYS5cIlxuICAgIF0sXG4gICAgXCJTVEFOREFMT05FTU9OVEhcIjogW1xuICAgICAgXCJcXHUwNDRmXFx1MDQzZFxcdTA0MzJcXHUwNDMwXFx1MDQ0MFxcdTA0NGNcIixcbiAgICAgIFwiXFx1MDQ0NFxcdTA0MzVcXHUwNDMyXFx1MDQ0MFxcdTA0MzBcXHUwNDNiXFx1MDQ0Y1wiLFxuICAgICAgXCJcXHUwNDNjXFx1MDQzMFxcdTA0NDBcXHUwNDQyXCIsXG4gICAgICBcIlxcdTA0MzBcXHUwNDNmXFx1MDQ0MFxcdTA0MzVcXHUwNDNiXFx1MDQ0Y1wiLFxuICAgICAgXCJcXHUwNDNjXFx1MDQzMFxcdTA0MzlcIixcbiAgICAgIFwiXFx1MDQzOFxcdTA0NGVcXHUwNDNkXFx1MDQ0Y1wiLFxuICAgICAgXCJcXHUwNDM4XFx1MDQ0ZVxcdTA0M2JcXHUwNDRjXCIsXG4gICAgICBcIlxcdTA0MzBcXHUwNDMyXFx1MDQzM1xcdTA0NDNcXHUwNDQxXFx1MDQ0MlwiLFxuICAgICAgXCJcXHUwNDQxXFx1MDQzNVxcdTA0M2RcXHUwNDQyXFx1MDQ0ZlxcdTA0MzFcXHUwNDQwXFx1MDQ0Y1wiLFxuICAgICAgXCJcXHUwNDNlXFx1MDQzYVxcdTA0NDJcXHUwNDRmXFx1MDQzMVxcdTA0NDBcXHUwNDRjXCIsXG4gICAgICBcIlxcdTA0M2RcXHUwNDNlXFx1MDQ0ZlxcdTA0MzFcXHUwNDQwXFx1MDQ0Y1wiLFxuICAgICAgXCJcXHUwNDM0XFx1MDQzNVxcdTA0M2FcXHUwNDMwXFx1MDQzMVxcdTA0NDBcXHUwNDRjXCJcbiAgICBdLFxuICAgIFwiV0VFS0VORFJBTkdFXCI6IFtcbiAgICAgIDUsXG4gICAgICA2XG4gICAgXSxcbiAgICBcImZ1bGxEYXRlXCI6IFwiRUVFRSwgZCBNTU1NIHkgJ1xcdTA0MzMnLlwiLFxuICAgIFwibG9uZ0RhdGVcIjogXCJkIE1NTU0geSAnXFx1MDQzMycuXCIsXG4gICAgXCJtZWRpdW1cIjogXCJkIE1NTSB5ICdcXHUwNDMzJy4gSDptbTpzc1wiLFxuICAgIFwibWVkaXVtRGF0ZVwiOiBcImQgTU1NIHkgJ1xcdTA0MzMnLlwiLFxuICAgIFwibWVkaXVtVGltZVwiOiBcIkg6bW06c3NcIixcbiAgICBcInNob3J0XCI6IFwiZGQuTU0ueXkgSDptbVwiLFxuICAgIFwic2hvcnREYXRlXCI6IFwiZGQuTU0ueXlcIixcbiAgICBcInNob3J0VGltZVwiOiBcIkg6bW1cIlxuICB9LFxuICBcIk5VTUJFUl9GT1JNQVRTXCI6IHtcbiAgICBcIkNVUlJFTkNZX1NZTVwiOiBcIlxcdTA0NDBcXHUwNDQzXFx1MDQzMS5cIixcbiAgICBcIkRFQ0lNQUxfU0VQXCI6IFwiLFwiLFxuICAgIFwiR1JPVVBfU0VQXCI6IFwiXFx1MDBhMFwiLFxuICAgIFwiUEFUVEVSTlNcIjogW1xuICAgICAge1xuICAgICAgICBcImdTaXplXCI6IDMsXG4gICAgICAgIFwibGdTaXplXCI6IDMsXG4gICAgICAgIFwibWF4RnJhY1wiOiAzLFxuICAgICAgICBcIm1pbkZyYWNcIjogMCxcbiAgICAgICAgXCJtaW5JbnRcIjogMSxcbiAgICAgICAgXCJuZWdQcmVcIjogXCItXCIsXG4gICAgICAgIFwibmVnU3VmXCI6IFwiXCIsXG4gICAgICAgIFwicG9zUHJlXCI6IFwiXCIsXG4gICAgICAgIFwicG9zU3VmXCI6IFwiXCJcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIFwiZ1NpemVcIjogMyxcbiAgICAgICAgXCJsZ1NpemVcIjogMyxcbiAgICAgICAgXCJtYXhGcmFjXCI6IDIsXG4gICAgICAgIFwibWluRnJhY1wiOiAyLFxuICAgICAgICBcIm1pbkludFwiOiAxLFxuICAgICAgICBcIm5lZ1ByZVwiOiBcIi1cIixcbiAgICAgICAgXCJuZWdTdWZcIjogXCJcXHUwMGEwXFx1MDBhNFwiLFxuICAgICAgICBcInBvc1ByZVwiOiBcIlwiLFxuICAgICAgICBcInBvc1N1ZlwiOiBcIlxcdTAwYTBcXHUwMGE0XCJcbiAgICAgIH1cbiAgICBdXG4gIH0sXG4gIFwiaWRcIjogXCJydVwiLFxuICBcImxvY2FsZUlEXCI6IFwicnVcIixcbiAgXCJwbHVyYWxDYXRcIjogZnVuY3Rpb24obiwgb3B0X3ByZWNpc2lvbikgeyAgdmFyIGkgPSBuIHwgMDsgIHZhciB2ZiA9IGdldFZGKG4sIG9wdF9wcmVjaXNpb24pOyAgaWYgKHZmLnYgPT0gMCAmJiBpICUgMTAgPT0gMSAmJiBpICUgMTAwICE9IDExKSB7ICAgIHJldHVybiBQTFVSQUxfQ0FURUdPUlkuT05FOyAgfSAgaWYgKHZmLnYgPT0gMCAmJiBpICUgMTAgPj0gMiAmJiBpICUgMTAgPD0gNCAmJiAoaSAlIDEwMCA8IDEyIHx8IGkgJSAxMDAgPiAxNCkpIHsgICAgcmV0dXJuIFBMVVJBTF9DQVRFR09SWS5GRVc7ICB9ICBpZiAodmYudiA9PSAwICYmIGkgJSAxMCA9PSAwIHx8IHZmLnYgPT0gMCAmJiBpICUgMTAgPj0gNSAmJiBpICUgMTAgPD0gOSB8fCB2Zi52ID09IDAgJiYgaSAlIDEwMCA+PSAxMSAmJiBpICUgMTAwIDw9IDE0KSB7ICAgIHJldHVybiBQTFVSQUxfQ0FURUdPUlkuTUFOWTsgIH0gIHJldHVybiBQTFVSQUxfQ0FURUdPUlkuT1RIRVI7fVxufSk7XG59XSk7XG4iLCIndXNlIHN0cmljdCc7XG5hbmd1bGFyLm1vZHVsZShcIm5nTG9jYWxlXCIsIFtdLCBbXCIkcHJvdmlkZVwiLCBmdW5jdGlvbigkcHJvdmlkZSkge1xudmFyIFBMVVJBTF9DQVRFR09SWSA9IHtaRVJPOiBcInplcm9cIiwgT05FOiBcIm9uZVwiLCBUV086IFwidHdvXCIsIEZFVzogXCJmZXdcIiwgTUFOWTogXCJtYW55XCIsIE9USEVSOiBcIm90aGVyXCJ9O1xuZnVuY3Rpb24gZ2V0RGVjaW1hbHMobikge1xuICBuID0gbiArICcnO1xuICB2YXIgaSA9IG4uaW5kZXhPZignLicpO1xuICByZXR1cm4gKGkgPT0gLTEpID8gMCA6IG4ubGVuZ3RoIC0gaSAtIDE7XG59XG5cbmZ1bmN0aW9uIGdldFZGKG4sIG9wdF9wcmVjaXNpb24pIHtcbiAgdmFyIHYgPSBvcHRfcHJlY2lzaW9uO1xuXG4gIGlmICh1bmRlZmluZWQgPT09IHYpIHtcbiAgICB2ID0gTWF0aC5taW4oZ2V0RGVjaW1hbHMobiksIDMpO1xuICB9XG5cbiAgdmFyIGJhc2UgPSBNYXRoLnBvdygxMCwgdik7XG4gIHZhciBmID0gKChuICogYmFzZSkgfCAwKSAlIGJhc2U7XG4gIHJldHVybiB7djogdiwgZjogZn07XG59XG5cbiRwcm92aWRlLnZhbHVlKFwiJGxvY2FsZVwiLCB7XG4gIFwiREFURVRJTUVfRk9STUFUU1wiOiB7XG4gICAgXCJBTVBNU1wiOiBbXG4gICAgICBcIlxcdTA0MzRcXHUwNDNmXCIsXG4gICAgICBcIlxcdTA0M2ZcXHUwNDNmXCJcbiAgICBdLFxuICAgIFwiREFZXCI6IFtcbiAgICAgIFwiXFx1MDQzZFxcdTA0MzVcXHUwNDM0XFx1MDQ1NlxcdTA0M2JcXHUwNDRmXCIsXG4gICAgICBcIlxcdTA0M2ZcXHUwNDNlXFx1MDQzZFxcdTA0MzVcXHUwNDM0XFx1MDQ1NlxcdTA0M2JcXHUwNDNlXFx1MDQzYVwiLFxuICAgICAgXCJcXHUwNDMyXFx1MDQ1NlxcdTA0MzJcXHUwNDQyXFx1MDQzZVxcdTA0NDBcXHUwNDNlXFx1MDQzYVwiLFxuICAgICAgXCJcXHUwNDQxXFx1MDQzNVxcdTA0NDBcXHUwNDM1XFx1MDQzNFxcdTA0MzBcIixcbiAgICAgIFwiXFx1MDQ0N1xcdTA0MzVcXHUwNDQyXFx1MDQzMlxcdTA0MzVcXHUwNDQwXCIsXG4gICAgICBcIlxcdTA0M2ZcXHUwMmJjXFx1MDQ0ZlxcdTA0NDJcXHUwNDNkXFx1MDQzOFxcdTA0NDZcXHUwNDRmXCIsXG4gICAgICBcIlxcdTA0NDFcXHUwNDQzXFx1MDQzMVxcdTA0M2VcXHUwNDQyXFx1MDQzMFwiXG4gICAgXSxcbiAgICBcIkVSQU5BTUVTXCI6IFtcbiAgICAgIFwiXFx1MDQzNFxcdTA0M2UgXFx1MDQzZFxcdTA0MzBcXHUwNDQ4XFx1MDQzZVxcdTA0NTcgXFx1MDQzNVxcdTA0NDBcXHUwNDM4XCIsXG4gICAgICBcIlxcdTA0M2RcXHUwNDMwXFx1MDQ0OFxcdTA0M2VcXHUwNDU3IFxcdTA0MzVcXHUwNDQwXFx1MDQzOFwiXG4gICAgXSxcbiAgICBcIkVSQVNcIjogW1xuICAgICAgXCJcXHUwNDM0XFx1MDQzZSBcXHUwNDNkLlxcdTA0MzUuXCIsXG4gICAgICBcIlxcdTA0M2QuXFx1MDQzNS5cIlxuICAgIF0sXG4gICAgXCJGSVJTVERBWU9GV0VFS1wiOiAwLFxuICAgIFwiTU9OVEhcIjogW1xuICAgICAgXCJcXHUwNDQxXFx1MDQ1NlxcdTA0NDdcXHUwNDNkXFx1MDQ0ZlwiLFxuICAgICAgXCJcXHUwNDNiXFx1MDQ0ZVxcdTA0NDJcXHUwNDNlXFx1MDQzM1xcdTA0M2VcIixcbiAgICAgIFwiXFx1MDQzMVxcdTA0MzVcXHUwNDQwXFx1MDQzNVxcdTA0MzdcXHUwNDNkXFx1MDQ0ZlwiLFxuICAgICAgXCJcXHUwNDNhXFx1MDQzMlxcdTA0NTZcXHUwNDQyXFx1MDQzZFxcdTA0NGZcIixcbiAgICAgIFwiXFx1MDQ0MlxcdTA0NDBcXHUwNDMwXFx1MDQzMlxcdTA0M2RcXHUwNDRmXCIsXG4gICAgICBcIlxcdTA0NDdcXHUwNDM1XFx1MDQ0MFxcdTA0MzJcXHUwNDNkXFx1MDQ0ZlwiLFxuICAgICAgXCJcXHUwNDNiXFx1MDQzOFxcdTA0M2ZcXHUwNDNkXFx1MDQ0ZlwiLFxuICAgICAgXCJcXHUwNDQxXFx1MDQzNVxcdTA0NDBcXHUwNDNmXFx1MDQzZFxcdTA0NGZcIixcbiAgICAgIFwiXFx1MDQzMlxcdTA0MzVcXHUwNDQwXFx1MDQzNVxcdTA0NDFcXHUwNDNkXFx1MDQ0ZlwiLFxuICAgICAgXCJcXHUwNDM2XFx1MDQzZVxcdTA0MzJcXHUwNDQyXFx1MDQzZFxcdTA0NGZcIixcbiAgICAgIFwiXFx1MDQzYlxcdTA0MzhcXHUwNDQxXFx1MDQ0MlxcdTA0M2VcXHUwNDNmXFx1MDQzMFxcdTA0MzRcXHUwNDMwXCIsXG4gICAgICBcIlxcdTA0MzNcXHUwNDQwXFx1MDQ0M1xcdTA0MzRcXHUwNDNkXFx1MDQ0ZlwiXG4gICAgXSxcbiAgICBcIlNIT1JUREFZXCI6IFtcbiAgICAgIFwiXFx1MDQxZFxcdTA0MzRcIixcbiAgICAgIFwiXFx1MDQxZlxcdTA0M2RcIixcbiAgICAgIFwiXFx1MDQxMlxcdTA0NDJcIixcbiAgICAgIFwiXFx1MDQyMVxcdTA0NDBcIixcbiAgICAgIFwiXFx1MDQyN1xcdTA0NDJcIixcbiAgICAgIFwiXFx1MDQxZlxcdTA0NDJcIixcbiAgICAgIFwiXFx1MDQyMVxcdTA0MzFcIlxuICAgIF0sXG4gICAgXCJTSE9SVE1PTlRIXCI6IFtcbiAgICAgIFwiXFx1MDQ0MVxcdTA0NTZcXHUwNDQ3LlwiLFxuICAgICAgXCJcXHUwNDNiXFx1MDQ0ZVxcdTA0NDIuXCIsXG4gICAgICBcIlxcdTA0MzFcXHUwNDM1XFx1MDQ0MC5cIixcbiAgICAgIFwiXFx1MDQzYVxcdTA0MzJcXHUwNDU2XFx1MDQ0Mi5cIixcbiAgICAgIFwiXFx1MDQ0MlxcdTA0NDBcXHUwNDMwXFx1MDQzMi5cIixcbiAgICAgIFwiXFx1MDQ0N1xcdTA0MzVcXHUwNDQwXFx1MDQzMi5cIixcbiAgICAgIFwiXFx1MDQzYlxcdTA0MzhcXHUwNDNmLlwiLFxuICAgICAgXCJcXHUwNDQxXFx1MDQzNVxcdTA0NDBcXHUwNDNmLlwiLFxuICAgICAgXCJcXHUwNDMyXFx1MDQzNVxcdTA0NDAuXCIsXG4gICAgICBcIlxcdTA0MzZcXHUwNDNlXFx1MDQzMlxcdTA0NDIuXCIsXG4gICAgICBcIlxcdTA0M2JcXHUwNDM4XFx1MDQ0MVxcdTA0NDIuXCIsXG4gICAgICBcIlxcdTA0MzNcXHUwNDQwXFx1MDQ0M1xcdTA0MzQuXCJcbiAgICBdLFxuICAgIFwiU1RBTkRBTE9ORU1PTlRIXCI6IFtcbiAgICAgIFwiXFx1MDQyMVxcdTA0NTZcXHUwNDQ3XFx1MDQzNVxcdTA0M2RcXHUwNDRjXCIsXG4gICAgICBcIlxcdTA0MWJcXHUwNDRlXFx1MDQ0MlxcdTA0MzhcXHUwNDM5XCIsXG4gICAgICBcIlxcdTA0MTFcXHUwNDM1XFx1MDQ0MFxcdTA0MzVcXHUwNDM3XFx1MDQzNVxcdTA0M2RcXHUwNDRjXCIsXG4gICAgICBcIlxcdTA0MWFcXHUwNDMyXFx1MDQ1NlxcdTA0NDJcXHUwNDM1XFx1MDQzZFxcdTA0NGNcIixcbiAgICAgIFwiXFx1MDQyMlxcdTA0NDBcXHUwNDMwXFx1MDQzMlxcdTA0MzVcXHUwNDNkXFx1MDQ0Y1wiLFxuICAgICAgXCJcXHUwNDI3XFx1MDQzNVxcdTA0NDBcXHUwNDMyXFx1MDQzNVxcdTA0M2RcXHUwNDRjXCIsXG4gICAgICBcIlxcdTA0MWJcXHUwNDM4XFx1MDQzZlxcdTA0MzVcXHUwNDNkXFx1MDQ0Y1wiLFxuICAgICAgXCJcXHUwNDIxXFx1MDQzNVxcdTA0NDBcXHUwNDNmXFx1MDQzNVxcdTA0M2RcXHUwNDRjXCIsXG4gICAgICBcIlxcdTA0MTJcXHUwNDM1XFx1MDQ0MFxcdTA0MzVcXHUwNDQxXFx1MDQzNVxcdTA0M2RcXHUwNDRjXCIsXG4gICAgICBcIlxcdTA0MTZcXHUwNDNlXFx1MDQzMlxcdTA0NDJcXHUwNDM1XFx1MDQzZFxcdTA0NGNcIixcbiAgICAgIFwiXFx1MDQxYlxcdTA0MzhcXHUwNDQxXFx1MDQ0MlxcdTA0M2VcXHUwNDNmXFx1MDQzMFxcdTA0MzRcIixcbiAgICAgIFwiXFx1MDQxM1xcdTA0NDBcXHUwNDQzXFx1MDQzNFxcdTA0MzVcXHUwNDNkXFx1MDQ0Y1wiXG4gICAgXSxcbiAgICBcIldFRUtFTkRSQU5HRVwiOiBbXG4gICAgICA1LFxuICAgICAgNlxuICAgIF0sXG4gICAgXCJmdWxsRGF0ZVwiOiBcIkVFRUUsIGQgTU1NTSB5ICdcXHUwNDQwJy5cIixcbiAgICBcImxvbmdEYXRlXCI6IFwiZCBNTU1NIHkgJ1xcdTA0NDAnLlwiLFxuICAgIFwibWVkaXVtXCI6IFwiZCBNTU0geSAnXFx1MDQ0MCcuIEhIOm1tOnNzXCIsXG4gICAgXCJtZWRpdW1EYXRlXCI6IFwiZCBNTU0geSAnXFx1MDQ0MCcuXCIsXG4gICAgXCJtZWRpdW1UaW1lXCI6IFwiSEg6bW06c3NcIixcbiAgICBcInNob3J0XCI6IFwiZGQuTU0ueXkgSEg6bW1cIixcbiAgICBcInNob3J0RGF0ZVwiOiBcImRkLk1NLnl5XCIsXG4gICAgXCJzaG9ydFRpbWVcIjogXCJISDptbVwiXG4gIH0sXG4gIFwiTlVNQkVSX0ZPUk1BVFNcIjoge1xuICAgIFwiQ1VSUkVOQ1lfU1lNXCI6IFwiXFx1MjBiNFwiLFxuICAgIFwiREVDSU1BTF9TRVBcIjogXCIsXCIsXG4gICAgXCJHUk9VUF9TRVBcIjogXCJcXHUwMGEwXCIsXG4gICAgXCJQQVRURVJOU1wiOiBbXG4gICAgICB7XG4gICAgICAgIFwiZ1NpemVcIjogMyxcbiAgICAgICAgXCJsZ1NpemVcIjogMyxcbiAgICAgICAgXCJtYXhGcmFjXCI6IDMsXG4gICAgICAgIFwibWluRnJhY1wiOiAwLFxuICAgICAgICBcIm1pbkludFwiOiAxLFxuICAgICAgICBcIm5lZ1ByZVwiOiBcIi1cIixcbiAgICAgICAgXCJuZWdTdWZcIjogXCJcIixcbiAgICAgICAgXCJwb3NQcmVcIjogXCJcIixcbiAgICAgICAgXCJwb3NTdWZcIjogXCJcIlxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgXCJnU2l6ZVwiOiAzLFxuICAgICAgICBcImxnU2l6ZVwiOiAzLFxuICAgICAgICBcIm1heEZyYWNcIjogMixcbiAgICAgICAgXCJtaW5GcmFjXCI6IDIsXG4gICAgICAgIFwibWluSW50XCI6IDEsXG4gICAgICAgIFwibmVnUHJlXCI6IFwiLVwiLFxuICAgICAgICBcIm5lZ1N1ZlwiOiBcIlxcdTAwYTBcXHUwMGE0XCIsXG4gICAgICAgIFwicG9zUHJlXCI6IFwiXCIsXG4gICAgICAgIFwicG9zU3VmXCI6IFwiXFx1MDBhMFxcdTAwYTRcIlxuICAgICAgfVxuICAgIF1cbiAgfSxcbiAgXCJpZFwiOiBcInVrLXVhXCIsXG4gIFwibG9jYWxlSURcIjogXCJ1a19VQVwiLFxuICBcInBsdXJhbENhdFwiOiBmdW5jdGlvbihuLCBvcHRfcHJlY2lzaW9uKSB7ICB2YXIgaSA9IG4gfCAwOyAgdmFyIHZmID0gZ2V0VkYobiwgb3B0X3ByZWNpc2lvbik7ICBpZiAodmYudiA9PSAwICYmIGkgJSAxMCA9PSAxICYmIGkgJSAxMDAgIT0gMTEpIHsgICAgcmV0dXJuIFBMVVJBTF9DQVRFR09SWS5PTkU7ICB9ICBpZiAodmYudiA9PSAwICYmIGkgJSAxMCA+PSAyICYmIGkgJSAxMCA8PSA0ICYmIChpICUgMTAwIDwgMTIgfHwgaSAlIDEwMCA+IDE0KSkgeyAgICByZXR1cm4gUExVUkFMX0NBVEVHT1JZLkZFVzsgIH0gIGlmICh2Zi52ID09IDAgJiYgaSAlIDEwID09IDAgfHwgdmYudiA9PSAwICYmIGkgJSAxMCA+PSA1ICYmIGkgJSAxMCA8PSA5IHx8IHZmLnYgPT0gMCAmJiBpICUgMTAwID49IDExICYmIGkgJSAxMDAgPD0gMTQpIHsgICAgcmV0dXJuIFBMVVJBTF9DQVRFR09SWS5NQU5ZOyAgfSAgcmV0dXJuIFBMVVJBTF9DQVRFR09SWS5PVEhFUjt9XG59KTtcbn1dKTtcbiIsIid1c2Ugc3RyaWN0JztcbmFuZ3VsYXIubW9kdWxlKFwibmdMb2NhbGVcIiwgW10sIFtcIiRwcm92aWRlXCIsIGZ1bmN0aW9uKCRwcm92aWRlKSB7XG52YXIgUExVUkFMX0NBVEVHT1JZID0ge1pFUk86IFwiemVyb1wiLCBPTkU6IFwib25lXCIsIFRXTzogXCJ0d29cIiwgRkVXOiBcImZld1wiLCBNQU5ZOiBcIm1hbnlcIiwgT1RIRVI6IFwib3RoZXJcIn07XG5mdW5jdGlvbiBnZXREZWNpbWFscyhuKSB7XG4gIG4gPSBuICsgJyc7XG4gIHZhciBpID0gbi5pbmRleE9mKCcuJyk7XG4gIHJldHVybiAoaSA9PSAtMSkgPyAwIDogbi5sZW5ndGggLSBpIC0gMTtcbn1cblxuZnVuY3Rpb24gZ2V0VkYobiwgb3B0X3ByZWNpc2lvbikge1xuICB2YXIgdiA9IG9wdF9wcmVjaXNpb247XG5cbiAgaWYgKHVuZGVmaW5lZCA9PT0gdikge1xuICAgIHYgPSBNYXRoLm1pbihnZXREZWNpbWFscyhuKSwgMyk7XG4gIH1cblxuICB2YXIgYmFzZSA9IE1hdGgucG93KDEwLCB2KTtcbiAgdmFyIGYgPSAoKG4gKiBiYXNlKSB8IDApICUgYmFzZTtcbiAgcmV0dXJuIHt2OiB2LCBmOiBmfTtcbn1cblxuJHByb3ZpZGUudmFsdWUoXCIkbG9jYWxlXCIsIHtcbiAgXCJEQVRFVElNRV9GT1JNQVRTXCI6IHtcbiAgICBcIkFNUE1TXCI6IFtcbiAgICAgIFwiXFx1MDQzNFxcdTA0M2ZcIixcbiAgICAgIFwiXFx1MDQzZlxcdTA0M2ZcIlxuICAgIF0sXG4gICAgXCJEQVlcIjogW1xuICAgICAgXCJcXHUwNDNkXFx1MDQzNVxcdTA0MzRcXHUwNDU2XFx1MDQzYlxcdTA0NGZcIixcbiAgICAgIFwiXFx1MDQzZlxcdTA0M2VcXHUwNDNkXFx1MDQzNVxcdTA0MzRcXHUwNDU2XFx1MDQzYlxcdTA0M2VcXHUwNDNhXCIsXG4gICAgICBcIlxcdTA0MzJcXHUwNDU2XFx1MDQzMlxcdTA0NDJcXHUwNDNlXFx1MDQ0MFxcdTA0M2VcXHUwNDNhXCIsXG4gICAgICBcIlxcdTA0NDFcXHUwNDM1XFx1MDQ0MFxcdTA0MzVcXHUwNDM0XFx1MDQzMFwiLFxuICAgICAgXCJcXHUwNDQ3XFx1MDQzNVxcdTA0NDJcXHUwNDMyXFx1MDQzNVxcdTA0NDBcIixcbiAgICAgIFwiXFx1MDQzZlxcdTAyYmNcXHUwNDRmXFx1MDQ0MlxcdTA0M2RcXHUwNDM4XFx1MDQ0NlxcdTA0NGZcIixcbiAgICAgIFwiXFx1MDQ0MVxcdTA0NDNcXHUwNDMxXFx1MDQzZVxcdTA0NDJcXHUwNDMwXCJcbiAgICBdLFxuICAgIFwiRVJBTkFNRVNcIjogW1xuICAgICAgXCJcXHUwNDM0XFx1MDQzZSBcXHUwNDNkXFx1MDQzMFxcdTA0NDhcXHUwNDNlXFx1MDQ1NyBcXHUwNDM1XFx1MDQ0MFxcdTA0MzhcIixcbiAgICAgIFwiXFx1MDQzZFxcdTA0MzBcXHUwNDQ4XFx1MDQzZVxcdTA0NTcgXFx1MDQzNVxcdTA0NDBcXHUwNDM4XCJcbiAgICBdLFxuICAgIFwiRVJBU1wiOiBbXG4gICAgICBcIlxcdTA0MzRcXHUwNDNlIFxcdTA0M2QuXFx1MDQzNS5cIixcbiAgICAgIFwiXFx1MDQzZC5cXHUwNDM1LlwiXG4gICAgXSxcbiAgICBcIkZJUlNUREFZT0ZXRUVLXCI6IDAsXG4gICAgXCJNT05USFwiOiBbXG4gICAgICBcIlxcdTA0NDFcXHUwNDU2XFx1MDQ0N1xcdTA0M2RcXHUwNDRmXCIsXG4gICAgICBcIlxcdTA0M2JcXHUwNDRlXFx1MDQ0MlxcdTA0M2VcXHUwNDMzXFx1MDQzZVwiLFxuICAgICAgXCJcXHUwNDMxXFx1MDQzNVxcdTA0NDBcXHUwNDM1XFx1MDQzN1xcdTA0M2RcXHUwNDRmXCIsXG4gICAgICBcIlxcdTA0M2FcXHUwNDMyXFx1MDQ1NlxcdTA0NDJcXHUwNDNkXFx1MDQ0ZlwiLFxuICAgICAgXCJcXHUwNDQyXFx1MDQ0MFxcdTA0MzBcXHUwNDMyXFx1MDQzZFxcdTA0NGZcIixcbiAgICAgIFwiXFx1MDQ0N1xcdTA0MzVcXHUwNDQwXFx1MDQzMlxcdTA0M2RcXHUwNDRmXCIsXG4gICAgICBcIlxcdTA0M2JcXHUwNDM4XFx1MDQzZlxcdTA0M2RcXHUwNDRmXCIsXG4gICAgICBcIlxcdTA0NDFcXHUwNDM1XFx1MDQ0MFxcdTA0M2ZcXHUwNDNkXFx1MDQ0ZlwiLFxuICAgICAgXCJcXHUwNDMyXFx1MDQzNVxcdTA0NDBcXHUwNDM1XFx1MDQ0MVxcdTA0M2RcXHUwNDRmXCIsXG4gICAgICBcIlxcdTA0MzZcXHUwNDNlXFx1MDQzMlxcdTA0NDJcXHUwNDNkXFx1MDQ0ZlwiLFxuICAgICAgXCJcXHUwNDNiXFx1MDQzOFxcdTA0NDFcXHUwNDQyXFx1MDQzZVxcdTA0M2ZcXHUwNDMwXFx1MDQzNFxcdTA0MzBcIixcbiAgICAgIFwiXFx1MDQzM1xcdTA0NDBcXHUwNDQzXFx1MDQzNFxcdTA0M2RcXHUwNDRmXCJcbiAgICBdLFxuICAgIFwiU0hPUlREQVlcIjogW1xuICAgICAgXCJcXHUwNDFkXFx1MDQzNFwiLFxuICAgICAgXCJcXHUwNDFmXFx1MDQzZFwiLFxuICAgICAgXCJcXHUwNDEyXFx1MDQ0MlwiLFxuICAgICAgXCJcXHUwNDIxXFx1MDQ0MFwiLFxuICAgICAgXCJcXHUwNDI3XFx1MDQ0MlwiLFxuICAgICAgXCJcXHUwNDFmXFx1MDQ0MlwiLFxuICAgICAgXCJcXHUwNDIxXFx1MDQzMVwiXG4gICAgXSxcbiAgICBcIlNIT1JUTU9OVEhcIjogW1xuICAgICAgXCJcXHUwNDQxXFx1MDQ1NlxcdTA0NDcuXCIsXG4gICAgICBcIlxcdTA0M2JcXHUwNDRlXFx1MDQ0Mi5cIixcbiAgICAgIFwiXFx1MDQzMVxcdTA0MzVcXHUwNDQwLlwiLFxuICAgICAgXCJcXHUwNDNhXFx1MDQzMlxcdTA0NTZcXHUwNDQyLlwiLFxuICAgICAgXCJcXHUwNDQyXFx1MDQ0MFxcdTA0MzBcXHUwNDMyLlwiLFxuICAgICAgXCJcXHUwNDQ3XFx1MDQzNVxcdTA0NDBcXHUwNDMyLlwiLFxuICAgICAgXCJcXHUwNDNiXFx1MDQzOFxcdTA0M2YuXCIsXG4gICAgICBcIlxcdTA0NDFcXHUwNDM1XFx1MDQ0MFxcdTA0M2YuXCIsXG4gICAgICBcIlxcdTA0MzJcXHUwNDM1XFx1MDQ0MC5cIixcbiAgICAgIFwiXFx1MDQzNlxcdTA0M2VcXHUwNDMyXFx1MDQ0Mi5cIixcbiAgICAgIFwiXFx1MDQzYlxcdTA0MzhcXHUwNDQxXFx1MDQ0Mi5cIixcbiAgICAgIFwiXFx1MDQzM1xcdTA0NDBcXHUwNDQzXFx1MDQzNC5cIlxuICAgIF0sXG4gICAgXCJTVEFOREFMT05FTU9OVEhcIjogW1xuICAgICAgXCJcXHUwNDIxXFx1MDQ1NlxcdTA0NDdcXHUwNDM1XFx1MDQzZFxcdTA0NGNcIixcbiAgICAgIFwiXFx1MDQxYlxcdTA0NGVcXHUwNDQyXFx1MDQzOFxcdTA0MzlcIixcbiAgICAgIFwiXFx1MDQxMVxcdTA0MzVcXHUwNDQwXFx1MDQzNVxcdTA0MzdcXHUwNDM1XFx1MDQzZFxcdTA0NGNcIixcbiAgICAgIFwiXFx1MDQxYVxcdTA0MzJcXHUwNDU2XFx1MDQ0MlxcdTA0MzVcXHUwNDNkXFx1MDQ0Y1wiLFxuICAgICAgXCJcXHUwNDIyXFx1MDQ0MFxcdTA0MzBcXHUwNDMyXFx1MDQzNVxcdTA0M2RcXHUwNDRjXCIsXG4gICAgICBcIlxcdTA0MjdcXHUwNDM1XFx1MDQ0MFxcdTA0MzJcXHUwNDM1XFx1MDQzZFxcdTA0NGNcIixcbiAgICAgIFwiXFx1MDQxYlxcdTA0MzhcXHUwNDNmXFx1MDQzNVxcdTA0M2RcXHUwNDRjXCIsXG4gICAgICBcIlxcdTA0MjFcXHUwNDM1XFx1MDQ0MFxcdTA0M2ZcXHUwNDM1XFx1MDQzZFxcdTA0NGNcIixcbiAgICAgIFwiXFx1MDQxMlxcdTA0MzVcXHUwNDQwXFx1MDQzNVxcdTA0NDFcXHUwNDM1XFx1MDQzZFxcdTA0NGNcIixcbiAgICAgIFwiXFx1MDQxNlxcdTA0M2VcXHUwNDMyXFx1MDQ0MlxcdTA0MzVcXHUwNDNkXFx1MDQ0Y1wiLFxuICAgICAgXCJcXHUwNDFiXFx1MDQzOFxcdTA0NDFcXHUwNDQyXFx1MDQzZVxcdTA0M2ZcXHUwNDMwXFx1MDQzNFwiLFxuICAgICAgXCJcXHUwNDEzXFx1MDQ0MFxcdTA0NDNcXHUwNDM0XFx1MDQzNVxcdTA0M2RcXHUwNDRjXCJcbiAgICBdLFxuICAgIFwiV0VFS0VORFJBTkdFXCI6IFtcbiAgICAgIDUsXG4gICAgICA2XG4gICAgXSxcbiAgICBcImZ1bGxEYXRlXCI6IFwiRUVFRSwgZCBNTU1NIHkgJ1xcdTA0NDAnLlwiLFxuICAgIFwibG9uZ0RhdGVcIjogXCJkIE1NTU0geSAnXFx1MDQ0MCcuXCIsXG4gICAgXCJtZWRpdW1cIjogXCJkIE1NTSB5ICdcXHUwNDQwJy4gSEg6bW06c3NcIixcbiAgICBcIm1lZGl1bURhdGVcIjogXCJkIE1NTSB5ICdcXHUwNDQwJy5cIixcbiAgICBcIm1lZGl1bVRpbWVcIjogXCJISDptbTpzc1wiLFxuICAgIFwic2hvcnRcIjogXCJkZC5NTS55eSBISDptbVwiLFxuICAgIFwic2hvcnREYXRlXCI6IFwiZGQuTU0ueXlcIixcbiAgICBcInNob3J0VGltZVwiOiBcIkhIOm1tXCJcbiAgfSxcbiAgXCJOVU1CRVJfRk9STUFUU1wiOiB7XG4gICAgXCJDVVJSRU5DWV9TWU1cIjogXCJcXHUyMGI0XCIsXG4gICAgXCJERUNJTUFMX1NFUFwiOiBcIixcIixcbiAgICBcIkdST1VQX1NFUFwiOiBcIlxcdTAwYTBcIixcbiAgICBcIlBBVFRFUk5TXCI6IFtcbiAgICAgIHtcbiAgICAgICAgXCJnU2l6ZVwiOiAzLFxuICAgICAgICBcImxnU2l6ZVwiOiAzLFxuICAgICAgICBcIm1heEZyYWNcIjogMyxcbiAgICAgICAgXCJtaW5GcmFjXCI6IDAsXG4gICAgICAgIFwibWluSW50XCI6IDEsXG4gICAgICAgIFwibmVnUHJlXCI6IFwiLVwiLFxuICAgICAgICBcIm5lZ1N1ZlwiOiBcIlwiLFxuICAgICAgICBcInBvc1ByZVwiOiBcIlwiLFxuICAgICAgICBcInBvc1N1ZlwiOiBcIlwiXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBcImdTaXplXCI6IDMsXG4gICAgICAgIFwibGdTaXplXCI6IDMsXG4gICAgICAgIFwibWF4RnJhY1wiOiAyLFxuICAgICAgICBcIm1pbkZyYWNcIjogMixcbiAgICAgICAgXCJtaW5JbnRcIjogMSxcbiAgICAgICAgXCJuZWdQcmVcIjogXCItXCIsXG4gICAgICAgIFwibmVnU3VmXCI6IFwiXFx1MDBhMFxcdTAwYTRcIixcbiAgICAgICAgXCJwb3NQcmVcIjogXCJcIixcbiAgICAgICAgXCJwb3NTdWZcIjogXCJcXHUwMGEwXFx1MDBhNFwiXG4gICAgICB9XG4gICAgXVxuICB9LFxuICBcImlkXCI6IFwidWtcIixcbiAgXCJsb2NhbGVJRFwiOiBcInVrXCIsXG4gIFwicGx1cmFsQ2F0XCI6IGZ1bmN0aW9uKG4sIG9wdF9wcmVjaXNpb24pIHsgIHZhciBpID0gbiB8IDA7ICB2YXIgdmYgPSBnZXRWRihuLCBvcHRfcHJlY2lzaW9uKTsgIGlmICh2Zi52ID09IDAgJiYgaSAlIDEwID09IDEgJiYgaSAlIDEwMCAhPSAxMSkgeyAgICByZXR1cm4gUExVUkFMX0NBVEVHT1JZLk9ORTsgIH0gIGlmICh2Zi52ID09IDAgJiYgaSAlIDEwID49IDIgJiYgaSAlIDEwIDw9IDQgJiYgKGkgJSAxMDAgPCAxMiB8fCBpICUgMTAwID4gMTQpKSB7ICAgIHJldHVybiBQTFVSQUxfQ0FURUdPUlkuRkVXOyAgfSAgaWYgKHZmLnYgPT0gMCAmJiBpICUgMTAgPT0gMCB8fCB2Zi52ID09IDAgJiYgaSAlIDEwID49IDUgJiYgaSAlIDEwIDw9IDkgfHwgdmYudiA9PSAwICYmIGkgJSAxMDAgPj0gMTEgJiYgaSAlIDEwMCA8PSAxNCkgeyAgICByZXR1cm4gUExVUkFMX0NBVEVHT1JZLk1BTlk7ICB9ICByZXR1cm4gUExVUkFMX0NBVEVHT1JZLk9USEVSO31cbn0pO1xufV0pO1xuIl0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9
