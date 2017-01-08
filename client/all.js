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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC5qcyIsImFwcC5hdXRoLmpzIiwiYXBwLmJpbGxpbmcuanMiLCJhcHAuY29uZmlnLmpzIiwiYXBwLmNvcmUuanMiLCJhcHAuZGFzaGJvYXJkLmpzIiwiYXBwLmluc3RhbmNlLmpzIiwiYXBwLmxheW91dC5qcyIsImFwcC5wYXltZW50LmpzIiwiYXBwLnByb2ZpbGUuanMiLCJhcHAucm91dGVzLmpzIiwiYmlsbGluZy9iaWxsaW5nLmNvbnRyb2xsZXIuanMiLCJiaWxsaW5nL2JpbGxpbmcucm91dGUuanMiLCJhdXRoL2F1dGguY29udHJvbGxlci5qcyIsImF1dGgvYXV0aC5yb3V0ZS5qcyIsImNvbXBvbmVudHMvaXMtcGFzc3dvcmQuZGlyZWN0aXZlLmpzIiwiY29tcG9uZW50cy9wYXNzd29yZC5kaXJlY3RpdmUuanMiLCJkYXNoYm9hcmQvZGFzaC1pbnN0YW5jZS5jb250cm9sbGVyLmpzIiwiZGFzaGJvYXJkL2Rhc2gtaW5zdGFuY2UuZGlyZWN0aXZlLmpzIiwiZGFzaGJvYXJkL2Rhc2hib2FyZC5jb250cm9sbGVyLmpzIiwiZGFzaGJvYXJkL2Rhc2hib2FyZC5yb3V0ZS5qcyIsImxheW91dC9jb250ZW50LmNvbnRyb2xsZXIuanMiLCJsYXlvdXQvbGF5b3V0LmNvbnRyb2xsZXIuanMiLCJpbnN0YW5jZS9pbnN0YW5jZS1zdW1tYXJ5LmRpcmVjdGl2ZS5qcyIsImluc3RhbmNlL2luc3RhbmNlLmNvbnRyb2xsZXIuanMiLCJpbnN0YW5jZS9pbnN0YW5jZS5yb3V0ZS5qcyIsImluc3RhbmNlL3BsYW4taXRlbS5kaXJlY3RpdmUuanMiLCJpbnN0YW5jZS9zZXJ2ZXItaXRlbS5kaXJlY3RpdmUuanMiLCJwYXltZW50L21ldGhvZC1pdGVtLmRpcmVjdGl2ZS5qcyIsInBheW1lbnQvcGF5bWVudC5jb250cm9sbGVyLmpzIiwicGF5bWVudC9wYXltZW50LnJvdXRlLmpzIiwiZmlsdGVycy9maWx0ZXJzLmpzIiwicHJvZmlsZS9wcm9maWxlLmNvbnRyb2xsZXIuanMiLCJwcm9maWxlL3Byb2ZpbGUucm91dGUuanMiLCJzZXJ2aWNlcy9hcGkuanMiLCJzZXJ2aWNlcy9hdXRoLmpzIiwic2VydmljZXMvYnJhbmNoZXMuanMiLCJzZXJ2aWNlcy9jYXJ0LmpzIiwic2VydmljZXMvY3VzdG9tZXJTZXJ2aWNlLmpzIiwic2VydmljZXMvZXJyb3IuanMiLCJzZXJ2aWNlcy9ub3RpZnkuanMiLCJzZXJ2aWNlcy9wb29sU2l6ZS5qcyIsInNlcnZpY2VzL3NwaW5uZXIuanMiLCJzZXJ2aWNlcy9zdG9yYWdlLmpzIiwic2VydmljZXMvdXRpbHNTZXJ2aWNlLmpzIiwiY29tcG9uZW50cy9kYXRlLXBpY2tlci9kYXRlLXBpY2tlci5jb250cm9sbGVyLmpzIiwiY29tcG9uZW50cy9kYXRlLXBpY2tlci9kYXRlLXBpY2tlci5kaXJlY3RpdmUuanMiLCJsYXlvdXQvc2lkZW1lbnUvc2lkZS1tZW51LmRpcmVjdGl2ZS5qcyIsImxheW91dC9zaWRlbWVudS9zaWRlbWVudS5jb250cm9sbGVyLmpzIiwibGF5b3V0L3RvcGJhci90b3AtYmFyLmNvbnRyb2xsZXIuanMiLCJsYXlvdXQvdG9wYmFyL3RvcC1iYXIuZGlyZWN0aXZlLmpzIiwibGliL2kxOG4vYW5ndWxhci1sb2NhbGVfZW4uanMiLCJsaWIvaTE4bi9hbmd1bGFyLWxvY2FsZV9ydS1ydS5qcyIsImxpYi9pMThuL2FuZ3VsYXItbG9jYWxlX3J1LmpzIiwibGliL2kxOG4vYW5ndWxhci1sb2NhbGVfdWstdWEuanMiLCJsaWIvaTE4bi9hbmd1bGFyLWxvY2FsZV91ay5qcyIsImxheW91dC9sYW5nbmF2L2xhbmctbmF2LmRpcmVjdGl2ZS5qcyIsImxheW91dC9sYW5nbmF2L2xhbmcuY29udHJvbGxlci5qcyIsImxheW91dC9mb290ZXIvZm9vdGVyLmNvbnRyb2xsZXIuanMiLCJsYXlvdXQvZm9vdGVyL2Zvb3Rlci5kaXJlY3RpdmUuanMiLCJjb21wb25lbnRzL3NwaW5uZXIvc3Bpbm5lci5jb250cm9sbGVyLmpzIiwiY29tcG9uZW50cy9zcGlubmVyL3NwaW5uZXIuZGlyZWN0aXZlLmpzIiwiaW5zdGFuY2UvdmFsaWRhdGlvbi1kaXJlY3RpdmVzL3VuaXF1ZS1wcmVmaXguanMiLCJpbnN0YW5jZS92YWxpZGF0aW9uLWRpcmVjdGl2ZXMvdmFsaWQtbmFtZS5qcyIsImluc3RhbmNlL3ZhbGlkYXRpb24tZGlyZWN0aXZlcy92YWxpZC1wcmVmaXguanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ1ZBO0FBQ0E7QUFDQTtBQ0ZBO0FBQ0E7QUFDQTtBQ0ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN2REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNUQTtBQUNBO0FBQ0E7QUNGQTtBQUNBO0FBQ0E7QUNGQTtBQUNBO0FBQ0E7QUNGQTtBQUNBO0FBQ0E7QUNGQTtBQUNBO0FBQ0E7QUNGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDL0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDeEhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDbEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzNHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzlCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN6Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDbkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN2R0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3pCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDMURBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDbEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2pCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDcERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDOUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3BmQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2xCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzlLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2xCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ1pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2xEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2xCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3JCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDOUZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNwSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3pFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDeENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzdCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUM3QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDcEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzlEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN2QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNqRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNyQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3BEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNwQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNuREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3RCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNwQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDL0lBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQy9JQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUMvSUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDL0lBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQy9JQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNwQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzNDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNqQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDcEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUM3REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3JDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUM1Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDL0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImFsbC5qcyIsInNvdXJjZXNDb250ZW50IjpbImFuZ3VsYXIubW9kdWxlKCdhcHAnLCBbXG5cdCdhcHAuY29yZScsXG5cdCdhcHAucm91dGVzJyxcblx0J2FwcC5sYXlvdXQnLFxuXHQnYXBwLmF1dGgnLFxuXHQnYXBwLmJpbGxpbmcnLFxuXHQnYXBwLmRhc2hib2FyZCcsXG5cdCdhcHAuaW5zdGFuY2UnLFxuXHQnYXBwLnBheW1lbnQnLFxuXHQnYXBwLnByb2ZpbGUnXG5dKTsiLCJhbmd1bGFyLm1vZHVsZSgnYXBwLmF1dGgnLCBbXG5cdCdhcHAuY29yZSdcbl0pOyIsImFuZ3VsYXIubW9kdWxlKCdhcHAuYmlsbGluZycsIFtcblx0J2FwcC5jb3JlJ1xuXSk7IiwiYW5ndWxhci5tb2R1bGUoJ2FwcCcpXG4udmFsdWUoJ21vbWVudCcsIG1vbWVudClcbi5jb25zdGFudCgnYXBwQ29uZmlnJywge1xuXHRzZXJ2ZXI6IHdpbmRvdy5sb2NhdGlvbi5wcm90b2NvbCArICcvLycgKyB3aW5kb3cubG9jYXRpb24uaG9zdFxufSlcbi5jb25maWcoWyckaHR0cFByb3ZpZGVyJywgZnVuY3Rpb24oJGh0dHBQcm92aWRlcikge1xuXHQkaHR0cFByb3ZpZGVyLmludGVyY2VwdG9ycy5wdXNoKFsnJHEnLCAnJGxvY2F0aW9uJywgJyRsb2NhbFN0b3JhZ2UnLCAnY3VzdG9tZXJTZXJ2aWNlJywgZnVuY3Rpb24oJHEsICRsb2NhdGlvbiwgJGxvY2FsU3RvcmFnZSwgY3VzdG9tZXJTZXJ2aWNlKSB7XG4gICAgICAgIHJldHVybiB7XG5cdFx0XHRyZXF1ZXN0OiBmdW5jdGlvbihjb25maWcpIHtcblx0XHRcdFx0Y29uZmlnLmhlYWRlcnMgPSBjb25maWcuaGVhZGVycyB8fCB7fTtcblx0XHRcdFx0aWYgKCRsb2NhbFN0b3JhZ2UudG9rZW4pIHtcblx0XHRcdFx0XHRjb25maWcuaGVhZGVyc1sneC1hY2Nlc3MtdG9rZW4nXSA9ICRsb2NhbFN0b3JhZ2UudG9rZW47XG5cdFx0XHRcdH1cblx0XHRcdFx0cmV0dXJuIGNvbmZpZztcblx0XHRcdH0sXG5cdFx0XHRyZXNwb25zZUVycm9yOiBmdW5jdGlvbihlcnJvcikge1xuXHRcdFx0XHRpZihlcnJvci5zdGF0dXMgPT09IDQwMSB8fCBlcnJvci5zdGF0dXMgPT09IDQwMykge1xuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdyZXNwb25zZUVycm9yOiAnLCAkbG9jYXRpb24ucGF0aCgpLCBlcnJvci5zdGF0dXMsIGVycm9yKTtcblx0XHRcdFx0XHQkbG9jYXRpb24ucGF0aCgnL2xvZ2luJyk7XG5cdFx0XHRcdH1cblx0XHRcdFx0cmV0dXJuICRxLnJlamVjdChlcnJvcik7XG5cdFx0XHR9LFxuXHRcdFx0cmVzcG9uc2U6IGZ1bmN0aW9uKHJlc3BvbnNlKXtcblx0XHRcdFx0aWYocmVzcG9uc2UuZGF0YS50b2tlbikge1xuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdyZXNwb25zZTogJywgcmVzcG9uc2UuZGF0YSk7XG5cdFx0XHRcdFx0JGxvY2FsU3RvcmFnZS50b2tlbiA9IHJlc3BvbnNlLmRhdGEudG9rZW47XG5cdFx0XHRcdH1cblx0XHRcdFx0Ly8gaWYocmVzcG9uc2UuZGF0YS5jdXN0b21lciAmJiAhY3VzdG9tZXJTZXJ2aWNlLmdldEN1c3RvbWVyKCkpe1xuXHRcdFx0XHQvLyBcdGN1c3RvbWVyU2VydmljZS5zZXRDdXN0b21lcihyZXNwb25zZS5kYXRhLmN1c3RvbWVyKTtcblx0XHRcdFx0Ly8gfVxuXHRcdFx0XHRyZXR1cm4gcmVzcG9uc2U7XG5cdFx0XHR9XG4gICAgICAgIH07XG5cdH1dKTtcbn1dKVxuLmNvbmZpZyhbJ25vdGlmaWNhdGlvbnNDb25maWdQcm92aWRlcicsIGZ1bmN0aW9uIChub3RpZmljYXRpb25zQ29uZmlnUHJvdmlkZXIpIHtcbiAgICBub3RpZmljYXRpb25zQ29uZmlnUHJvdmlkZXIuc2V0QXV0b0hpZGUodHJ1ZSk7XG4gICAgbm90aWZpY2F0aW9uc0NvbmZpZ1Byb3ZpZGVyLnNldEhpZGVEZWxheSg1MDAwKTtcbiAgICBub3RpZmljYXRpb25zQ29uZmlnUHJvdmlkZXIuc2V0QXV0b0hpZGVBbmltYXRpb24oJ2ZhZGVPdXROb3RpZmljYXRpb25zJyk7XG4gICAgbm90aWZpY2F0aW9uc0NvbmZpZ1Byb3ZpZGVyLnNldEF1dG9IaWRlQW5pbWF0aW9uRGVsYXkoNTAwKTtcblx0bm90aWZpY2F0aW9uc0NvbmZpZ1Byb3ZpZGVyLnNldEFjY2VwdEhUTUwodHJ1ZSk7XG59XSlcbi5jb25maWcoWyckdHJhbnNsYXRlUHJvdmlkZXInLCBmdW5jdGlvbigkdHJhbnNsYXRlUHJvdmlkZXIpIHtcblx0JHRyYW5zbGF0ZVByb3ZpZGVyLnVzZVN0YXRpY0ZpbGVzTG9hZGVyKHtcblx0XHRwcmVmaXg6ICcuL2Fzc2V0cy90cmFuc2xhdGlvbnMvbG9jYWxlLScsXG5cdFx0c3VmZml4OiAnLmpzb24nXG5cdH0pO1xuXHQkdHJhbnNsYXRlUHJvdmlkZXIucHJlZmVycmVkTGFuZ3VhZ2UoJ2VuJyk7XG5cdCR0cmFuc2xhdGVQcm92aWRlci5mYWxsYmFja0xhbmd1YWdlKCdlbicpO1xuXHQkdHJhbnNsYXRlUHJvdmlkZXIudXNlU3RvcmFnZSgnc3RvcmFnZVNlcnZpY2UnKTtcblx0JHRyYW5zbGF0ZVByb3ZpZGVyLnVzZVNhbml0aXplVmFsdWVTdHJhdGVneSgnc2FuaXRpemVQYXJhbWV0ZXJzJyk7XG5cdC8vICR0cmFuc2xhdGVQcm92aWRlci51c2VTYW5pdGl6ZVZhbHVlU3RyYXRlZ3koJ2VzY2FwZScpO1xufV0pXG4uY29uZmlnKFsndG1oRHluYW1pY0xvY2FsZVByb3ZpZGVyJywgZnVuY3Rpb24odG1oRHluYW1pY0xvY2FsZVByb3ZpZGVyKSB7XG5cdHRtaER5bmFtaWNMb2NhbGVQcm92aWRlci5sb2NhbGVMb2NhdGlvblBhdHRlcm4oJy4vbGliL2kxOG4vYW5ndWxhci1sb2NhbGVfe3tsb2NhbGV9fS5qcycpO1xufV0pOyIsImFuZ3VsYXIubW9kdWxlKCdhcHAuY29yZScsIFtcblx0Ly8gJ25nQW5pbWF0ZScsXG5cdCduZ01lc3NhZ2VzJyxcblx0J25nU3RvcmFnZScsXG5cdCduZ1Nhbml0aXplJyxcblx0J3Bhc2NhbHByZWNodC50cmFuc2xhdGUnLFxuXHQnbmdOb3RpZmljYXRpb25zQmFyJyxcblx0J3RtaC5keW5hbWljTG9jYWxlJyxcblx0J3VpLmJvb3RzdHJhcCdcbl0pOyIsImFuZ3VsYXIubW9kdWxlKCdhcHAuZGFzaGJvYXJkJywgW1xuXHQnYXBwLmNvcmUnXG5dKTsiLCJhbmd1bGFyLm1vZHVsZSgnYXBwLmluc3RhbmNlJywgW1xuXHQnYXBwLmNvcmUnXG5dKTsiLCJhbmd1bGFyLm1vZHVsZSgnYXBwLmxheW91dCcsIFtcblx0J2FwcC5jb3JlJ1xuXSk7IiwiYW5ndWxhci5tb2R1bGUoJ2FwcC5wYXltZW50JywgW1xuXHQnYXBwLmNvcmUnXG5dKTsiLCJhbmd1bGFyLm1vZHVsZSgnYXBwLnByb2ZpbGUnLCBbXG5cdCdhcHAuY29yZSdcbl0pOyIsImFuZ3VsYXIubW9kdWxlKCdhcHAucm91dGVzJywgW1xuXHQnbmdSb3V0ZSdcbl0pXG4uY29uZmlnKFsnJHJvdXRlUHJvdmlkZXInLCBmdW5jdGlvbigkcm91dGVQcm92aWRlcil7XG5cblx0ZnVuY3Rpb24gdmVyaWZ5VXNlcigkcSwgJGh0dHAsICRsb2NhdGlvbikge1xuXHRcdHZhciBkZWZlcnJlZCA9ICRxLmRlZmVyKCk7IC8vIE1ha2UgYW4gQUpBWCBjYWxsIHRvIGNoZWNrIGlmIHRoZSB1c2VyIGlzIGxvZ2dlZCBpblxuXHRcdHZhciB2ZXJpZmllZCA9IGZhbHNlO1xuXHRcdCRodHRwLmdldCgnL2FwaS92ZXJpZnk/b3R0PScrJGxvY2F0aW9uLnNlYXJjaCgpLm90dCkudGhlbihmdW5jdGlvbiAocmVzKXtcblx0XHRcdGlmIChyZXMuc3VjY2Vzcyl7IC8vIEF1dGhlbnRpY2F0ZWRcblx0XHRcdFx0ZGVmZXJyZWQucmVzb2x2ZSgpO1xuXHRcdFx0XHR2ZXJpZmllZCA9IHRydWU7XG5cdFx0XHR9IGVsc2UgeyAvLyBOb3QgQXV0aGVudGljYXRlZFxuXHRcdFx0XHRkZWZlcnJlZC5yZWplY3QoKTtcblx0XHRcdH1cblx0XHRcdCRsb2NhdGlvbi51cmwoJy9hY2NvdW50LXZlcmlmaWNhdGlvbj92ZXJpZmllZD0nK3ZlcmlmaWVkKTtcblx0XHR9LCBmdW5jdGlvbiAoZXJyKXtcblx0XHRcdGNvbnNvbGUubG9nKGVycik7XG5cdFx0fSk7XG5cdFx0cmV0dXJuIGRlZmVycmVkLnByb21pc2U7XG5cdH1cblxuXHQkcm91dGVQcm92aWRlci5cblx0XHR3aGVuKCcvdmVyaWZ5Jywge1xuXHRcdFx0cmVzb2x2ZToge1xuXHRcdFx0XHR2ZXJpZmllZDogdmVyaWZ5VXNlclxuXHRcdFx0fVxuXHRcdH0pLlxuXHRcdG90aGVyd2lzZSh7XG5cdFx0XHRyZWRpcmVjdFRvOiAnL2Rhc2hib2FyZCdcblx0XHR9KTtcbn1dKTsiLCIoZnVuY3Rpb24oKXtcblxuXHQndXNlIHN0cmljdCc7XG5cblx0YW5ndWxhclxuXHRcdC5tb2R1bGUoJ2FwcC5iaWxsaW5nJylcblx0XHQuY29udHJvbGxlcignQmlsbGluZ0NvbnRyb2xsZXInLCBCaWxsaW5nQ29udHJvbGxlcik7XG5cblx0QmlsbGluZ0NvbnRyb2xsZXIuJGluamVjdCA9IFsnJHRyYW5zbGF0ZScsICd1dGlsc1NlcnZpY2UnLCAnYXBpU2VydmljZScsICdtb21lbnQnLCAnY3VzdG9tZXJTZXJ2aWNlJywgJ3NwaW5uZXJTZXJ2aWNlJywgJ2Vycm9yU2VydmljZSddO1xuXG5cdGZ1bmN0aW9uIEJpbGxpbmdDb250cm9sbGVyKCR0cmFuc2xhdGUsIHV0aWxzU2VydmljZSwgYXBpLCBtb21lbnQsIGN1c3RvbWVyU2VydmljZSwgc3Bpbm5lciwgZXJyb3JTZXJ2aWNlKSB7XG5cblx0XHR2YXIgdm0gPSB0aGlzO1xuXHRcdC8vIHZhciB0cmFuc2FjdGlvbnMgPSBbXTtcblxuXHRcdHZtLmN1c3RvbWVyID0gY3VzdG9tZXJTZXJ2aWNlLmdldEN1c3RvbWVyKCk7XG5cdFx0dm0uY3VycmVudEJhbGFuY2UgPSBudWxsO1xuXHRcdHZtLnRyYW5zYWN0aW9ucyA9IFtdO1xuXHRcdHZtLmNoYXJnZXMgPSBbXTtcblx0XHR2bS5zdGFydEJhbGFuY2UgPSAnJztcblx0XHR2bS5sYXN0QmlsbGluZ0RhdGUgPSBudWxsO1xuXHRcdHZtLnN0YXJ0RGF0ZSA9IG1vbWVudCgpLnN1YnRyYWN0KDcsICdkYXlzJykudG9EYXRlKCk7XG5cdFx0dm0uZW5kRGF0ZSA9IG1vbWVudCgpLmVuZE9mKCdkYXknKS50b0RhdGUoKTtcblx0XHR2bS5kYXRlRm9ybWF0ID0gJ2RkIE1NTU0geXl5eSc7XG5cdFx0dm0uc3RhcnREYXRlT3B0aW9ucyA9IHtcblx0XHRcdC8vIG1pbkRhdGU6IG5ldyBEYXRlKDIwMTAsIDEsIDEpLFxuXHRcdFx0Ly8gbWF4RGF0ZTogbmV3IERhdGUodm0uZW5kRGF0ZSksXG5cdFx0XHRzaG93V2Vla3M6IGZhbHNlXG5cdFx0fTtcblx0XHR2bS5lbmREYXRlT3B0aW9ucyA9IHtcblx0XHRcdG1pbkRhdGU6IG5ldyBEYXRlKHZtLnN0YXJ0RGF0ZSksXG5cdFx0XHRzaG93V2Vla3M6IGZhbHNlXG5cdFx0fTtcblx0XHR2bS5wYXJzZURhdGUgPSBmdW5jdGlvbihkYXRlKXtcblx0XHRcdHJldHVybiB1dGlsc1NlcnZpY2UucGFyc2VEYXRlKGRhdGUpO1xuXHRcdH07XG5cdFx0dm0uc3VtVXAgPSBzdW1VcDtcblx0XHR2bS5maW5kUmVjb3JkcyA9IGZpbmRSZWNvcmRzO1xuXG5cdFx0Y29uc29sZS5sb2coJ2N1c3RvbWVyOiAnLCB2bS5jdXN0b21lcik7XG5cblx0XHRzcGlubmVyLnNob3coJ21haW4tc3Bpbm5lcicpO1xuXG5cdFx0Z2V0Q3VzdG9tZXJCYWxhbmNlKCk7XG5cdFx0ZmluZFJlY29yZHMoKTtcblxuXHRcdGZ1bmN0aW9uIGZpbmRSZWNvcmRzKCl7XG5cdFx0XHRnZXRUcmFuc2FjdGlvbnMoKTtcblx0XHR9XG5cblx0XHRmdW5jdGlvbiBnZXRUcmFuc2FjdGlvbnMoKSB7XG5cdFx0XHRhcGkucmVxdWVzdCh7XG5cdFx0XHRcdHVybDogXCJ0cmFuc2FjdGlvbnNcIixcblx0XHRcdFx0cGFyYW1zOiB7XG5cdFx0XHRcdFx0c3RhcnQ6IERhdGUucGFyc2Uodm0uc3RhcnREYXRlKSxcblx0XHRcdFx0XHRlbmQ6IERhdGUucGFyc2Uodm0uZW5kRGF0ZSlcblx0XHRcdFx0fVxuXHRcdFx0fSkudGhlbihmdW5jdGlvbihyZXMpe1xuXHRcdFx0XHRpZighcmVzLmRhdGEuc3VjY2VzcykgcmV0dXJuIGVycm9yU2VydmljZS5zaG93KHJlcy5kYXRhLm1lc3NhZ2UpO1xuXHRcdFx0XHRjb25zb2xlLmxvZygnVHJhbnNhY3Rpb25zOiAnLCByZXMuZGF0YS5yZXN1bHQpO1xuXG5cdFx0XHRcdHZtLnRyYW5zYWN0aW9ucyA9IHJlcy5kYXRhLnJlc3VsdDtcblxuXHRcdFx0XHRyZXR1cm4gYXBpLnJlcXVlc3Qoe1xuXHRcdFx0XHRcdHVybDogXCJjaGFyZ2VzXCIsXG5cdFx0XHRcdFx0cGFyYW1zOiB7XG5cdFx0XHRcdFx0XHRzdGFydDogRGF0ZS5wYXJzZSh2bS5zdGFydERhdGUpLFxuXHRcdFx0XHRcdFx0ZW5kOiBEYXRlLnBhcnNlKHZtLmVuZERhdGUpXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9KTtcblx0XHRcdH0pLnRoZW4oZnVuY3Rpb24ocmVzKSB7XG5cdFx0XHRcdGlmKCFyZXMuZGF0YS5zdWNjZXNzKSByZXR1cm4gZXJyb3JTZXJ2aWNlLnNob3cocmVzLmRhdGEubWVzc2FnZSk7XG5cdFx0XHRcdGNvbnNvbGUubG9nKCdDaGFyZ2VzOiAnLCByZXMuZGF0YS5yZXN1bHQpO1xuXHRcdFx0XHRcblx0XHRcdFx0dm0uY2hhcmdlcyA9IHJlcy5kYXRhLnJlc3VsdDtcblx0XHRcdFx0dm0uc3RhcnRCYWxhbmNlID0gdm0uY2hhcmdlcy5sZW5ndGggPyB2bS5jaGFyZ2VzW3ZtLmNoYXJnZXMubGVuZ3RoLTFdLnN0YXJ0QmFsYW5jZSA6IG51bGw7XG5cdFx0XHRcdHZtLmxhc3RCaWxsaW5nRGF0ZSA9IHZtLmNoYXJnZXMubGVuZ3RoID8gdm0uY2hhcmdlc1swXS50byA6IG51bGw7XG5cdFx0XHRcdHZtLnRvdGFsQ2hhcmdlcyA9IHZtLmNoYXJnZXMubGVuZ3RoID8gKHZtLnN0YXJ0QmFsYW5jZSAtIHZtLmN1c3RvbWVyLmJhbGFuY2UpIDogbnVsbDtcblx0XHRcdFx0Ly8gdm0udHJhbnNhY3Rpb25zID0gdHJhbnNhY3Rpb25zO1xuXG5cdFx0XHRcdHNwaW5uZXIuaGlkZSgnbWFpbi1zcGlubmVyJyk7XG5cdFx0XHRcdGNvbnNvbGUubG9nKCdGaW5hbDogJywgdm0udHJhbnNhY3Rpb25zLCB2bS5jaGFyZ2VzKTtcblx0XHRcdH0pLmNhdGNoKGZ1bmN0aW9uKGVycikge1xuXHRcdFx0XHRzcGlubmVyLmhpZGUoJ21haW4tc3Bpbm5lcicpO1xuXHRcdFx0XHRlcnJvclNlcnZpY2Uuc2hvdyhlcnIpO1xuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gZ2V0Q3VzdG9tZXJCYWxhbmNlKCkge1xuXHRcdFx0YXBpLnJlcXVlc3Qoe1xuXHRcdFx0XHR1cmw6IFwiZ2V0Q3VzdG9tZXJCYWxhbmNlXCJcblx0XHRcdH0pLnRoZW4oZnVuY3Rpb24ocmVzKXtcblx0XHRcdFx0aWYoIXJlcy5kYXRhLnN1Y2Nlc3MpIHtcblx0XHRcdFx0XHRzcGlubmVyLmhpZGUoJ21haW4tc3Bpbm5lcicpO1xuXHRcdFx0XHRcdHJldHVybiBlcnJvclNlcnZpY2Uuc2hvdyhyZXMuZGF0YS5tZXNzYWdlKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdHZtLmN1c3RvbWVyLmJhbGFuY2UgPSByZXMuZGF0YS5yZXN1bHQ7XG5cdFx0XHRcdHZtLmN1cnJlbnRCYWxhbmNlID0gc3RyaW5nVG9GaXhlZChyZXMuZGF0YS5yZXN1bHQpO1xuXHRcdFx0XHRjdXN0b21lclNlcnZpY2Uuc2V0Q3VzdG9tZXJCYWxhbmNlKHJlcy5kYXRhLnJlc3VsdCk7XG5cdFx0XHR9LCBmdW5jdGlvbihlcnIpe1xuXHRcdFx0XHRzcGlubmVyLmhpZGUoJ21haW4tc3Bpbm5lcicpO1xuXHRcdFx0XHRlcnJvclNlcnZpY2Uuc2hvdyhlcnIpO1xuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gc3RyaW5nVG9GaXhlZChzdHJpbmcpIHtcblx0XHRcdHJldHVybiB1dGlsc1NlcnZpY2Uuc3RyaW5nVG9GaXhlZChzdHJpbmcsIDIpO1xuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIHN1bVVwKGFycmF5KSB7XG5cdFx0XHR2YXIgYW1vdW50ID0gMDtcblx0XHRcdGFycmF5LmZvckVhY2goZnVuY3Rpb24oaXRlbSl7XG5cdFx0XHRcdGFtb3VudCArPSBwYXJzZUZsb2F0KGl0ZW0pO1xuXHRcdFx0fSk7XG5cdFx0XHRyZXR1cm4gYW1vdW50O1xuXHRcdH1cblxuXHR9XG5cbn0pKCk7IiwiYW5ndWxhci5tb2R1bGUoJ2FwcC5iaWxsaW5nJylcbi5jb25maWcoWyckcm91dGVQcm92aWRlcicsIGZ1bmN0aW9uKCRyb3V0ZVByb3ZpZGVyKXtcblxuXHQkcm91dGVQcm92aWRlclxuXHRcdC53aGVuKCcvYmlsbGluZycsIHtcblx0XHRcdHRlbXBsYXRlVXJsOiAnYmlsbGluZy9iaWxsaW5nLmh0bWwnLFxuXHRcdFx0Y29udHJvbGxlcjogJ0JpbGxpbmdDb250cm9sbGVyJyxcblx0XHRcdGNvbnRyb2xsZXJBczogJ2JpbGxWbScsXG5cdFx0XHRyZXNvbHZlOiB7XG5cdFx0XHRcdGxvZ2dlZGluOiBpc0F1dGhvcml6ZWRcblx0XHRcdH1cblx0XHR9KTtcblxufV0pO1xuXG5pc0F1dGhvcml6ZWQuJGluamVjdCA9IFsnYXV0aFNlcnZpY2UnXTtcbmZ1bmN0aW9uIGlzQXV0aG9yaXplZChhdXRoU2VydmljZSkge1xuXHRyZXR1cm4gYXV0aFNlcnZpY2UuaXNBdXRob3JpemVkKCk7XG59IiwiKGZ1bmN0aW9uKCl7XG5cblx0J3VzZSBzdHJpY3QnO1xuXG5cdGFuZ3VsYXJcblx0XHQubW9kdWxlKCdhcHAuYXV0aCcpXG5cdFx0LmNvbnRyb2xsZXIoJ0F1dGhDb250cm9sbGVyJywgQXV0aENvbnRyb2xsZXIpO1xuXG5cdEF1dGhDb250cm9sbGVyLiRpbmplY3QgPSBbJyRyb290U2NvcGUnLCAnJGxvY2F0aW9uJywgJyRsb2NhbFN0b3JhZ2UnLCAnJHRyYW5zbGF0ZScsICdhdXRoU2VydmljZScsICdlcnJvclNlcnZpY2UnLCAnc3Bpbm5lclNlcnZpY2UnXTtcblxuXHRmdW5jdGlvbiBBdXRoQ29udHJvbGxlcigkcm9vdFNjb3BlLCAkbG9jYXRpb24sICRsb2NhbFN0b3JhZ2UsICR0cmFuc2xhdGUsIGF1dGhTZXJ2aWNlLCBlcnJvclNlcnZpY2UsIHNwaW5uZXJTZXJ2aWNlKSB7XG5cblx0XHRpZigkbG9jYXRpb24ucGF0aCgpID09PSAnL2xvZ2luJylcblx0XHRcdCRyb290U2NvcGUudGl0bGUgPSAnTE9HSU4nO1xuXHRcdGVsc2UgaWYoJGxvY2F0aW9uLnBhdGgoKSA9PT0gJy9zaWdudXAnKVxuXHRcdFx0JHJvb3RTY29wZS50aXRsZSA9ICdSRUdJU1RSQVRJT04nO1xuXHRcdGVsc2UgaWYoJGxvY2F0aW9uLnBhdGgoKSA9PT0gJy9hY2NvdW50LXZlcmlmaWNhdGlvbicpXG5cdFx0XHQkcm9vdFNjb3BlLnRpdGxlID0gJ0VNQUlMX1ZFUklGSUNBVElPTic7XG5cdFx0ZWxzZSBpZigkbG9jYXRpb24ucGF0aCgpID09PSAnL3JlcXVlc3QtcGFzc3dvcmQtcmVzZXQnIHx8ICRsb2NhdGlvbi5wYXRoKCkgPT09ICcvcmVzZXQtcGFzc3dvcmQnKVxuXHRcdFx0JHJvb3RTY29wZS50aXRsZSA9ICdSRVNFVF9QQVNTV09SRCc7XG5cblx0XHR2YXIgdm0gPSB0aGlzO1xuXHRcdHZtLnZlcmlmaWNhdGlvblNlbnQgPSBmYWxzZTtcblx0XHR2bS52ZXJpZmllZCA9ICRsb2NhdGlvbi5zZWFyY2goKS52ZXJpZmllZCA9PT0gJ3RydWUnID8gdHJ1ZSA6IGZhbHNlO1xuXHRcdHZtLnJlcXVlc3RTZW50ID0gZmFsc2U7XG5cdFx0dm0uZW1haWwgPSAnJztcblx0XHR2bS5uYW1lID0gJyc7XG5cdFx0dm0ucGFzc3dvcmQgPSAnJztcblx0XHR2bS5zaWdudXAgPSBzaWdudXA7XG5cdFx0dm0ubG9naW4gPSBsb2dpbjtcblx0XHR2bS5yZXF1ZXN0UGFzc3dvcmRSZXNldCA9IHJlcXVlc3RQYXNzd29yZFJlc2V0O1xuXHRcdHZtLnJlc2V0UGFzc3dvcmQgPSByZXNldFBhc3N3b3JkO1xuXHRcdHZtLmxvZ291dCA9IGxvZ291dDtcblxuXG5cdFx0ZnVuY3Rpb24gc2lnbnVwKCkge1xuXHRcdFx0dmFyIGZkYXRhID0ge1xuXHRcdFx0XHRlbWFpbDogdm0uZW1haWwsXG5cdFx0XHRcdG5hbWU6IHZtLm5hbWUsXG5cdFx0XHRcdHBhc3N3b3JkOiB2bS5wYXNzd29yZCxcblx0XHRcdFx0bGFuZzogJGxvY2FsU3RvcmFnZS5OR19UUkFOU0xBVEVfTEFOR19LRVkgfHwgJ2VuJ1xuXHRcdFx0fTtcblx0XHRcdGF1dGhTZXJ2aWNlLnNpZ251cChmZGF0YSkudGhlbihmdW5jdGlvbiAocmVzKXtcblx0XHRcdFx0dm0udmVyaWZpY2F0aW9uU2VudCA9IHRydWU7XG5cdFx0XHR9LCBmdW5jdGlvbiAoZXJyKXtcblx0XHRcdFx0aWYoZXJyLm1lc3NhZ2UgPT09ICdNVUxUSVBMRV9TSUdOVVAnKSB7XG5cdFx0XHRcdFx0JGxvY2F0aW9uLnBhdGgoJy9yZXNpZ251cCcpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGVycm9yU2VydmljZS5zaG93KGVyci5kYXRhLm1lc3NhZ2UpO1xuXHRcdFx0XHQvLyAkcm9vdFNjb3BlLmVycm9yID0gZXJyO1xuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gbG9naW4oKSB7XG5cdFx0XHR2YXIgZmRhdGEgPSB7XG5cdFx0XHRcdGVtYWlsOiB2bS5lbWFpbCxcblx0XHRcdFx0cGFzc3dvcmQ6IHZtLnBhc3N3b3JkXG5cdFx0XHR9O1xuXG5cdFx0XHRpZighdm0uZW1haWwpIHtcblx0XHRcdFx0cmV0dXJuIGVycm9yU2VydmljZS5zaG93KCdNSVNTSU5HX0ZJRUxEUycpO1xuXHRcdFx0fVxuXG5cblx0XHRcdGF1dGhTZXJ2aWNlLmxvZ2luKGZkYXRhKS50aGVuKGZ1bmN0aW9uIChyZXMpe1xuXHRcdFx0XHQvLyAkbG9jYWxTdG9yYWdlLnRva2VuID0gcmVzLmRhdGEudG9rZW47XG5cdFx0XHRcdCRsb2NhdGlvbi5wYXRoKCcvZGFzaGJvYXJkJyk7XG5cdFx0XHR9LCBmdW5jdGlvbiAoZXJyKXtcblx0XHRcdFx0ZXJyb3JTZXJ2aWNlLnNob3coZXJyLmRhdGEubWVzc2FnZSk7XG5cdFx0XHRcdC8vICRyb290U2NvcGUuZXJyb3IgPSBlcnI7XG5cdFx0XHR9KTtcblx0XHR9XG5cblx0XHRmdW5jdGlvbiByZXF1ZXN0UGFzc3dvcmRSZXNldCgpIHtcblx0XHRcdHZhciBmZGF0YSA9IHtcblx0XHRcdFx0ZW1haWw6IHZtLmVtYWlsXG5cdFx0XHR9O1xuXG5cdFx0XHRhdXRoU2VydmljZS5yZXF1ZXN0UGFzc3dvcmRSZXNldChmZGF0YSkudGhlbihmdW5jdGlvbiAocmVzKXtcblx0XHRcdFx0dm0ucmVxdWVzdFNlbnQgPSB0cnVlO1xuXHRcdFx0fSwgZnVuY3Rpb24gKGVycil7XG5cdFx0XHRcdGVycm9yU2VydmljZS5zaG93KGVyci5kYXRhLm1lc3NhZ2UpO1xuXHRcdFx0XHQvLyAkcm9vdFNjb3BlLmVycm9yID0gZXJyO1xuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gcmVzZXRQYXNzd29yZCgpIHtcblx0XHRcdHZhciBmZGF0YSA9IHtcblx0XHRcdFx0dG9rZW46ICRsb2NhdGlvbi5zZWFyY2goKS5vdHQsXG5cdFx0XHRcdHBhc3N3b3JkOiB2bS5wYXNzd29yZFxuXHRcdFx0fTtcblxuXHRcdFx0YXV0aFNlcnZpY2UucmVzZXRQYXNzd29yZChmZGF0YSkudGhlbihmdW5jdGlvbiAocmVzKXtcblx0XHRcdFx0JGxvY2FsU3RvcmFnZS50b2tlbiA9IHJlcy50b2tlbjtcblx0XHRcdFx0JGxvY2F0aW9uLnBhdGgoJy9kYXNoYm9hcmQnKTtcblx0XHRcdH0sIGZ1bmN0aW9uIChlcnIpe1xuXHRcdFx0XHRlcnJvclNlcnZpY2Uuc2hvdyhlcnIuZGF0YS5tZXNzYWdlKTtcblx0XHRcdFx0Ly8gJHJvb3RTY29wZS5lcnJvciA9IGVycjtcblx0XHRcdH0pO1xuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIGxvZ291dCgpIHtcblx0XHRcdGF1dGhTZXJ2aWNlLmxvZ291dCgpO1xuXHRcdH1cblxuXHR9XG5cbn0pKCk7IiwiYW5ndWxhci5tb2R1bGUoJ2FwcC5hdXRoJylcbi5jb25maWcoWyckcm91dGVQcm92aWRlcicsIGZ1bmN0aW9uKCRyb3V0ZVByb3ZpZGVyKXtcblxuXHQkcm91dGVQcm92aWRlclxuXHRcdC53aGVuKCcvYWNjb3VudC12ZXJpZmljYXRpb24nLCB7XG5cdFx0XHR0ZW1wbGF0ZVVybDogJ2F1dGgvdmVyaWZpY2F0aW9uLmh0bWwnLFxuXHRcdFx0Y29udHJvbGxlcjogJ0F1dGhDb250cm9sbGVyJyxcblx0XHRcdGNvbnRyb2xsZXJBczogJ2F1dGhWbSdcblx0XHR9KVxuXHRcdC53aGVuKCcvcmVxdWVzdC1wYXNzd29yZC1yZXNldCcsIHtcblx0XHRcdHRlbXBsYXRlVXJsOiAnYXV0aC9yZXF1ZXN0LXBhc3N3b3JkLXJlc2V0Lmh0bWwnLFxuXHRcdFx0Y29udHJvbGxlcjogJ0F1dGhDb250cm9sbGVyJyxcblx0XHRcdGNvbnRyb2xsZXJBczogJ2F1dGhWbSdcblx0XHR9KVxuXHRcdC53aGVuKCcvcmVzZXQtcGFzc3dvcmQnLCB7XG5cdFx0XHR0ZW1wbGF0ZVVybDogJ2F1dGgvcmVzZXQtcGFzc3dvcmQuaHRtbCcsXG5cdFx0XHRjb250cm9sbGVyOiAnQXV0aENvbnRyb2xsZXInLFxuXHRcdFx0Y29udHJvbGxlckFzOiAnYXV0aFZtJ1xuXHRcdH0pXG5cdFx0LndoZW4oJy9sb2dpbicse1xuXHRcdFx0dGVtcGxhdGVVcmw6ICdhdXRoL2xvZ2luLmh0bWwnLFxuXHRcdFx0Y29udHJvbGxlcjogJ0F1dGhDb250cm9sbGVyJyxcblx0XHRcdGNvbnRyb2xsZXJBczogJ2F1dGhWbSdcblx0XHR9KVxuXHRcdC53aGVuKCcvc2lnbnVwJywge1xuXHRcdFx0dGVtcGxhdGVVcmw6ICdhdXRoL3NpZ251cC5odG1sJyxcblx0XHRcdGNvbnRyb2xsZXI6ICdBdXRoQ29udHJvbGxlcicsXG5cdFx0XHRjb250cm9sbGVyQXM6ICdhdXRoVm0nXG5cdFx0fSk7XG5cbn1dKTsiLCIoZnVuY3Rpb24oKXtcblxuXHQndXNlIHN0cmljdCc7XG5cblx0YW5ndWxhclxuXHRcdC5tb2R1bGUoJ2FwcCcpXG5cdFx0LmRpcmVjdGl2ZSgnaXNQYXNzd29yZCcsIGlzUGFzc3dvcmQpO1xuXG5cdGlzUGFzc3dvcmQuJGluamVjdCA9IFsndXRpbHMnXTtcblxuXHRmdW5jdGlvbiBpc1Bhc3N3b3JkKHV0aWxzKXtcblxuXHRcdHJldHVybiB7XG5cdFx0XHRyZXF1aXJlOiAnbmdNb2RlbCcsXG5cdFx0XHRsaW5rOiBsaW5rXG5cdFx0fTtcblxuXHRcdGZ1bmN0aW9uIGxpbmsoc2NvcGUsIGVsLCBhdHRycywgY3RybCkge1xuXG5cdFx0XHRjdHJsLiR2YWxpZGF0b3JzLnBhc3N3b3JkID0gZnVuY3Rpb24obW9kZWxWYWx1ZSwgdmlld1ZhbHVlKSB7XG5cdFx0XHRcdGlmKGN0cmwuJGlzRW1wdHkobW9kZWxWYWx1ZSkpIHtcblx0XHRcdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGlmKHNjb3BlLmluc3RhbmNlKSB7XG5cdFx0XHRcdFx0dmFyIHByZWZpeCA9IHNjb3BlLmluc3RhbmNlLnJlc3VsdC5wcmVmaXg7XG5cdFx0XHRcdFx0aWYocHJlZml4ICYmIG5ldyBSZWdFeHAocHJlZml4LCAnaScpLnRlc3QobW9kZWxWYWx1ZSkpXG5cdFx0XHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRpZighdXRpbHMuY2hlY2tQYXNzd29yZFN0cmVuZ3RoKG1vZGVsVmFsdWUpKSB7XG5cdFx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0XHR9O1xuXHRcdFx0XG5cdFx0fVxuXG5cdH1cblxufSkoKTsiLCIoZnVuY3Rpb24oKXtcblxuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIGFuZ3VsYXJcbiAgICAgICAgLm1vZHVsZSgnYXBwLmNvcmUnKVxuICAgICAgICAuZGlyZWN0aXZlKCdwYXNzd29yZCcsIHBhc3N3b3JkKTtcblxuICAgIHBhc3N3b3JkLiRpbmplY3QgPSBbJ3V0aWxzU2VydmljZSddO1xuICAgIGZ1bmN0aW9uIHBhc3N3b3JkKHV0aWxzKXtcblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgcmVzdHJpY3Q6ICdBRScsXG4gICAgICAgICAgICByZXF1aXJlOiAnbmdNb2RlbCcsXG4gICAgICAgICAgICBsaW5rOiBsaW5rXG4gICAgICAgIH07XG5cbiAgICAgICAgZnVuY3Rpb24gbGluayhzY29wZSwgZWwsIGF0dHJzLCBjdHJsKSB7XG5cbiAgICAgICAgICAgIGN0cmwuJHZhbGlkYXRvcnMucGFzc3dvcmQgPSBmdW5jdGlvbihtb2RlbFZhbHVlLCB2aWV3VmFsdWUpIHtcbiAgICAgICAgICAgICAgICBpZihjdHJsLiRpc0VtcHR5KG1vZGVsVmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIGNoZWNrIGlmIHBhc3N3b3JkIGNvbnRhaW5zIHRoZSBicmFuY2ggcHJlZml4XG4gICAgICAgICAgICAgICAgaWYoc2NvcGUuaW5zdFZtICYmIHNjb3BlLmluc3RWbS5pbnN0YW5jZSkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgcHJlZml4ID0gc2NvcGUuaW5zdFZtLmluc3RhbmNlLnJlc3VsdC5wcmVmaXg7XG4gICAgICAgICAgICAgICAgICAgIGlmKHByZWZpeCAmJiBuZXcgUmVnRXhwKHByZWZpeCwgJ2knKS50ZXN0KG1vZGVsVmFsdWUpKVxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHJldHVybiAhIXV0aWxzLmNoZWNrUGFzc3dvcmRTdHJlbmd0aChtb2RlbFZhbHVlKTtcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICB9XG59KSgpOyIsIihmdW5jdGlvbigpe1xuXG5cdCd1c2Ugc3RyaWN0JztcblxuXHRhbmd1bGFyXG5cdFx0Lm1vZHVsZSgnYXBwLmRhc2hib2FyZCcpXG5cdFx0LmNvbnRyb2xsZXIoJ0Rhc2hJbnN0YW5jZUNvbnRyb2xsZXInLCBEYXNoSW5zdGFuY2VDb250cm9sbGVyKTtcblxuXHREYXNoSW5zdGFuY2VDb250cm9sbGVyLiRpbmplY3QgPSBbJyRyb290U2NvcGUnLCAnJGxvY2F0aW9uJywgJyR0cmFuc2xhdGUnLCAnYXBpU2VydmljZScsICdwb29sU2l6ZVNlcnZpY2VzJywgJ2JyYW5jaGVzU2VydmljZScsICdjYXJ0U2VydmljZScsICd1dGlsc1NlcnZpY2UnLCAnZXJyb3JTZXJ2aWNlJ107XG5cblx0ZnVuY3Rpb24gRGFzaEluc3RhbmNlQ29udHJvbGxlcigkcm9vdFNjb3BlLCAkbG9jYXRpb24sICR0cmFuc2xhdGUsIGFwaSwgcG9vbFNpemVTZXJ2aWNlcywgYnJhbmNoZXNTZXJ2aWNlLCBjYXJ0LCB1dGlscywgZXJyb3JTZXJ2aWNlKSB7XG5cblx0XHR2YXIgdm0gPSB0aGlzO1xuXHRcdHZhciBkaWZmO1xuXG5cdFx0dm0uc3ViID0gdm0uaW5zdC5fc3Vic2NyaXB0aW9uO1xuXHRcdHZtLnRlcm1pbmF0ZUluc3RhbmNlID0gdGVybWluYXRlSW5zdGFuY2U7XG5cdFx0dm0ucmVuZXdTdWJzY3JpcHRpb24gPSByZW5ld1N1YnNjcmlwdGlvbjtcblx0XHR2bS5leHBpcmVzQXQgPSBleHBpcmVzQXQ7XG5cdFx0dm0uY2FuUmVuZXcgPSBjYW5SZW5ldztcblx0XHR2bS5wYXJzZURhdGUgPSBwYXJzZURhdGU7XG5cdFx0dm0uc3RyaW5nVG9GaXhlZCA9IHN0cmluZ1RvRml4ZWQ7XG5cdFx0dm0uZ2V0RGlmZmVyZW5jZSA9IHV0aWxzLmdldERpZmZlcmVuY2U7XG5cdFx0dm0udHJpYWxFeHBpcmVzID0gZXhwaXJlc0F0KHZtLnN1Yi50cmlhbEV4cGlyZXMpO1xuXHRcdHZtLmV4cGlyZXMgPSB2bS5zdWIuYmlsbGluZ0N5cmNsZXMgLSB2bS5zdWIuY3VycmVudEJpbGxpbmdDeXJjbGU7XG5cdFx0dm0uZXhwVGhyZXNob2xkID0gMTA7XG5cblx0XHRmdW5jdGlvbiB0ZXJtaW5hdGVJbnN0YW5jZShvaWQpIHtcblx0XHRcdGlmKCFvaWQpIHJldHVybjtcblx0XHRcdGlmKGNvbmZpcm0oXCJEbyB5b3UgcmVhbHkgd2FudCB0byB0ZXJtaW5hdGUgaW5zdGFuY2UgcGVybWFuZW50bHk/XCIpKXtcblx0XHRcdFx0c2V0U3RhdGUoJ2RlbGV0ZUJyYW5jaCcsIG9pZCwgZnVuY3Rpb24gKGVyciwgcmVzcG9uc2Upe1xuXHRcdFx0XHRcdGlmKGVycikge1xuXHRcdFx0XHRcdFx0ZXJyb3JTZXJ2aWNlLnNob3coZXJyKTtcblx0XHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRicmFuY2hlc1NlcnZpY2UucmVtb3ZlKG9pZCk7XG5cdFx0XHRcdFx0Ly8gZ2V0QnJhbmNoZXMoKTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdFxuXHRcdGZ1bmN0aW9uIHJlbmV3U3Vic2NyaXB0aW9uKGluc3QpIHtcblx0XHRcdCR0cmFuc2xhdGUoJ0RFU0NSSVBUSU9OUy5SRU5FV19TVUJTQ1JJUFRJT04nLCB7XG5cdFx0XHRcdHBsYW5JZDogaW5zdC5fc3Vic2NyaXB0aW9uLnBsYW5JZCxcblx0XHRcdFx0dXNlcnM6IGluc3QuX3N1YnNjcmlwdGlvbi5xdWFudGl0eSxcblx0XHRcdFx0Y29tcGFueTogaW5zdC5yZXN1bHQubmFtZVxuXHRcdFx0fSlcblx0XHRcdC50aGVuKGZ1bmN0aW9uIChkZXNjcmlwdGlvbikge1xuXHRcdFx0XHRjYXJ0LmFkZCh7XG5cdFx0XHRcdFx0YWN0aW9uOiBcInJlbmV3U3Vic2NyaXB0aW9uXCIsXG5cdFx0XHRcdFx0ZGVzY3JpcHRpb246IGRlc2NyaXB0aW9uLFxuXHRcdFx0XHRcdGFtb3VudDogaW5zdC5fc3Vic2NyaXB0aW9uLmFtb3VudCxcblx0XHRcdFx0XHRkYXRhOiB7XG5cdFx0XHRcdFx0XHRvaWQ6IGluc3Qub2lkXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9KTtcblx0XHRcdFx0JGxvY2F0aW9uLnBhdGgoJy9wYXltZW50Jyk7XG5cdFx0XHR9KTtcblx0XHR9XG5cblx0XHRmdW5jdGlvbiBleHBpcmVzQXQobGFzdEJpbGxpbmdEYXRlKSB7XG5cdFx0XHRkaWZmID0gdXRpbHMuZ2V0RGlmZmVyZW5jZShsYXN0QmlsbGluZ0RhdGUsIG1vbWVudCgpLCAnZGF5cycpO1xuXHRcdFx0cmV0dXJuIGRpZmYgPCAwID8gMCA6IGRpZmY7XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gY2FuUmVuZXcoaW5zdCkge1xuXHRcdFx0ZGlmZiA9IHZtLmV4cGlyZXNBdChpbnN0KTtcblx0XHRcdHJldHVybiBkaWZmIDw9IDEwO1xuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIHBhcnNlRGF0ZShkYXRlLCBmb3JtYXQpIHtcblx0XHRcdHJldHVybiB1dGlscy5wYXJzZURhdGUoZGF0ZSwgZm9ybWF0KTtcblx0XHR9XG5cblx0XHRmdW5jdGlvbiBzdHJpbmdUb0ZpeGVkKHN0cmluZykge1xuXHRcdFx0cmV0dXJuIHV0aWxzLnN0cmluZ1RvRml4ZWQoc3RyaW5nLCAyKTtcblx0XHR9XG5cblx0XHRmdW5jdGlvbiBnZXRQb29sU3RyaW5nKGFycmF5KSB7XG5cdFx0XHRyZXR1cm4gcG9vbFNpemVTZXJ2aWNlcy5wb29sQXJyYXlUb1N0cmluZyhhcnJheSk7XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gZ2V0UG9vbFNpemUoYXJyYXkpIHtcblx0XHRcdHJldHVybiBwb29sU2l6ZVNlcnZpY2VzLmdldFBvb2xTaXplKGFycmF5KTtcblx0XHR9XG5cblx0XHRmdW5jdGlvbiBzZXRTdGF0ZShtZXRob2QsIG9pZCwgY2FsbGJhY2spIHtcblx0XHRcdGFwaS5yZXF1ZXN0KHtcblx0XHRcdFx0dXJsOiBtZXRob2QsXG5cdFx0XHRcdHBhcmFtczoge1xuXHRcdFx0XHRcdG9pZDogb2lkXG5cdFx0XHRcdH1cblx0XHRcdH0pLnRoZW4oZnVuY3Rpb24ocmVzdWx0KXtcblx0XHRcdFx0Y29uc29sZS5sb2coJ3NldFN0YXRlIHJlc3VsdDogJywgcmVzdWx0KTtcblx0XHRcdFx0Y2FsbGJhY2sobnVsbCwgcmVzdWx0LmRhdGEucmVzdWx0KTtcblx0XHRcdH0sIGZ1bmN0aW9uKGVycil7XG5cdFx0XHRcdGNhbGxiYWNrKGVycik7XG5cdFx0XHR9KTtcblx0XHR9XG5cblx0fVxuXG59KSgpOyIsIihmdW5jdGlvbigpe1xuXG5cdCd1c2Ugc3RyaWN0JztcblxuXHRhbmd1bGFyXG5cdFx0Lm1vZHVsZSgnYXBwLmRhc2hib2FyZCcpXG5cdFx0LmRpcmVjdGl2ZSgnZGFzaEluc3RhbmNlJywgZGFzaEluc3RhbmNlKTtcblxuXHRmdW5jdGlvbiBkYXNoSW5zdGFuY2UoKXtcblxuXHRcdHJldHVybiB7XG5cdFx0XHRyZXN0cmljdDogJ0VBJyxcblx0XHRcdHJlcGxhY2U6IHRydWUsXG5cdFx0XHR0cmFuc2NsdWRlOiB0cnVlLFxuXHRcdFx0c2NvcGU6IHtcblx0XHRcdFx0aW5zdDogJz0nXG5cdFx0XHR9LFxuXHRcdFx0dGVtcGxhdGVVcmw6ICdkYXNoYm9hcmQvZGFzaC1pbnN0YW5jZS5odG1sJyxcblx0XHRcdGNvbnRyb2xsZXI6ICdEYXNoSW5zdGFuY2VDb250cm9sbGVyJyxcblx0XHRcdGNvbnRyb2xsZXJBczogJ2Rhc2hJbnN0Vm0nLFxuXHRcdFx0YmluZFRvQ29udHJvbGxlcjogdHJ1ZVxuXHRcdH07XG5cblx0fVxuXG59KSgpOyIsIihmdW5jdGlvbigpe1xuXG5cdCd1c2Ugc3RyaWN0JztcblxuXHRhbmd1bGFyXG5cdFx0Lm1vZHVsZSgnYXBwLmRhc2hib2FyZCcpXG5cdFx0LmNvbnRyb2xsZXIoJ0Rhc2hib2FyZENvbnRyb2xsZXInLCBEYXNoYm9hcmRDb250cm9sbGVyKTtcblxuXHREYXNoYm9hcmRDb250cm9sbGVyLiRpbmplY3QgPSBbJyRyb290U2NvcGUnLCAnYXBpU2VydmljZScsICdicmFuY2hlc1NlcnZpY2UnLCAnbm90aWZ5U2VydmljZScsICdzcGlubmVyU2VydmljZScsICdjdXN0b21lclNlcnZpY2UnLCAnZXJyb3JTZXJ2aWNlJ107XG5cblx0ZnVuY3Rpb24gRGFzaGJvYXJkQ29udHJvbGxlcigkcm9vdFNjb3BlLCBhcGksIGJyYW5jaGVzU2VydmljZSwgbm90aWZ5U2VydmljZSwgc3Bpbm5lciwgY3VzdG9tZXJTZXJ2aWNlLCBlcnJvclNlcnZpY2UpIHtcblxuXHRcdHZhciB2bSA9IHRoaXM7XG5cblx0XHR2bS5pbnN0YW5jZXMgPSBbXTtcblx0XHR2bS5jdXN0b21lclJvbGUgPSBjdXN0b21lclNlcnZpY2UuZ2V0Q3VzdG9tZXIoKS5yb2xlO1xuXG5cdFx0JHJvb3RTY29wZS50aXRsZSA9ICdEQVNIQk9BUkQnO1xuXHRcdCRyb290U2NvcGUuJG9uKCdhdXRoLmxvZ291dCcsIGZ1bmN0aW9uKCl7XG5cdFx0XHRicmFuY2hlc1NlcnZpY2UuY2xlYXIoKTtcblx0XHR9KTtcblxuXHRcdHNwaW5uZXIuc2hvdygnbWFpbi1zcGlubmVyJyk7XG5cblx0XHRnZXRCcmFuY2hlcygpO1xuXHRcdC8vIGdldFBsYW5zKCk7XG5cblx0XHRmdW5jdGlvbiBnZXRCcmFuY2hlcygpe1xuXHRcdFx0dmFyIGluc3RhbmNlcyA9IGJyYW5jaGVzU2VydmljZS5nZXRBbGwoKTtcblx0XHRcdGlmKGluc3RhbmNlcy5sZW5ndGgpIHtcblx0XHRcdFx0dm0uaW5zdGFuY2VzID0gaW5zdGFuY2VzO1xuXHRcdFx0XHRzcGlubmVyLmhpZGUoJ21haW4tc3Bpbm5lcicpO1xuXHRcdFx0XHRjb25zb2xlLmxvZygnZ2V0QnJhbmNoZXM6ICcsIGluc3RhbmNlcyk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRsb2FkQnJhbmNoZXMoKTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRmdW5jdGlvbiBsb2FkQnJhbmNoZXMoKSB7XG5cdFx0XHRhcGkucmVxdWVzdCh7XG5cdFx0XHRcdHVybDogXCJnZXRCcmFuY2hlc1wiXG5cdFx0XHR9KS50aGVuKGZ1bmN0aW9uKHJlcyl7XG5cdFx0XHRcdGlmKCFyZXMuZGF0YS5zdWNjZXNzKSByZXR1cm4gZXJyb3JTZXJ2aWNlLnNob3cocmVzLmRhdGEubWVzc2FnZSk7XG5cblx0XHRcdFx0YnJhbmNoZXNTZXJ2aWNlLnNldChyZXMuZGF0YS5yZXN1bHQpO1xuXHRcdFx0XHRcblx0XHRcdFx0dm0uaW5zdGFuY2VzID0gcmVzLmRhdGEucmVzdWx0O1xuXG5cdFx0XHRcdHNwaW5uZXIuaGlkZSgnbWFpbi1zcGlubmVyJyk7XG5cdFx0XHRcdGNvbnNvbGUubG9nKCdCcmFuY2hlczogJywgdm0uaW5zdGFuY2VzKTtcblx0XHRcdFx0Ly8gdm0uZ2V0SW5zdFN0YXRlKCk7XG5cdFx0XHR9LCBmdW5jdGlvbihlcnIpe1xuXHRcdFx0XHRlcnJvclNlcnZpY2Uuc2hvdyhlcnIpO1xuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdH1cblxufSkoKTsiLCJhbmd1bGFyLm1vZHVsZSgnYXBwLmRhc2hib2FyZCcpXG4uY29uZmlnKFsnJHJvdXRlUHJvdmlkZXInLCBmdW5jdGlvbigkcm91dGVQcm92aWRlcil7XG5cblx0JHJvdXRlUHJvdmlkZXJcblx0XHQud2hlbignL2Rhc2hib2FyZCcsIHtcblx0XHRcdHRlbXBsYXRlVXJsOiAnZGFzaGJvYXJkL2Rhc2hib2FyZC5odG1sJyxcblx0XHRcdGNvbnRyb2xsZXI6ICdEYXNoYm9hcmRDb250cm9sbGVyJyxcblx0XHRcdGNvbnRyb2xsZXJBczogJ2Rhc2hWbScsXG5cdFx0XHRyZXNvbHZlOiB7XG5cdFx0XHRcdGxvZ2dlZGluOiBpc0F1dGhvcml6ZWRcblx0XHRcdH1cblx0XHR9KTtcblxufV0pO1xuXG5pc0F1dGhvcml6ZWQuJGluamVjdCA9IFsnYXV0aFNlcnZpY2UnXTtcbmZ1bmN0aW9uIGlzQXV0aG9yaXplZChhdXRoU2VydmljZSkge1xuXHRyZXR1cm4gYXV0aFNlcnZpY2UuaXNBdXRob3JpemVkKCk7XG59IiwiKGZ1bmN0aW9uKCl7XG5cblx0J3VzZSBzdHJpY3QnO1xuXG5cdGFuZ3VsYXJcblx0XHQubW9kdWxlKCdhcHAubGF5b3V0Jylcblx0XHQuY29udHJvbGxlcignQ29udGVudENvbnRyb2xsZXInLCBDb250ZW50Q29udHJvbGxlcik7XG5cblx0Q29udGVudENvbnRyb2xsZXIuJGluamVjdCA9IFsnJHJvb3RTY29wZSddO1xuXG5cdGZ1bmN0aW9uIENvbnRlbnRDb250cm9sbGVyKCRyb290U2NvcGUpIHtcblxuXHRcdHZhciB2bSA9IHRoaXM7XG5cdFx0Ly8gdm0uZnVsbFZpZXcgPSB0cnVlO1xuXG5cdH1cblxufSkoKTsiLCIoZnVuY3Rpb24oKXtcblxuXHQndXNlIHN0cmljdCc7XG5cblx0YW5ndWxhclxuXHRcdC5tb2R1bGUoJ2FwcC5sYXlvdXQnKVxuXHRcdC5jb250cm9sbGVyKCdMYXlvdXRDb250cm9sbGVyJywgTGF5b3V0Q29udHJvbGxlcik7XG5cblx0TGF5b3V0Q29udHJvbGxlci4kaW5qZWN0ID0gWyckcm9vdFNjb3BlJ107XG5cblx0ZnVuY3Rpb24gTGF5b3V0Q29udHJvbGxlcigkcm9vdFNjb3BlKSB7XG5cblx0XHR2YXIgdm0gPSB0aGlzO1xuXG5cdFx0dm0uZnVsbFZpZXcgPSB0cnVlO1xuXHRcdHZtLnRvcGJhciA9IGZhbHNlO1xuXHRcdHZtLnNpZGVtZW51ID0gZmFsc2U7XG5cdFx0dm0ubGFuZ21lbnUgPSBmYWxzZTtcblx0XHR2bS5mb290ZXIgPSB0cnVlO1xuXHRcdHZtLnRyaWdnZXJTaWRlYmFyID0gdHJpZ2dlclNpZGViYXI7XG5cdFx0dm0udHJpZ2dlckxhbmdNZW51ID0gdHJpZ2dlckxhbmdNZW51O1xuXG5cdFx0JHJvb3RTY29wZS4kb24oJ2F1dGgubG9naW4nLCBmdW5jdGlvbihlKXtcblx0XHRcdHZtLmZ1bGxWaWV3ID0gZmFsc2U7XG5cdFx0XHR2bS50b3BiYXIgPSB0cnVlO1xuXHRcdFx0dm0uc2lkZW1lbnUgPSB0cnVlO1xuXHRcdFx0dm0uZm9vdGVyID0gZmFsc2U7XG5cblx0XHRcdGNvbnNvbGUubG9nKCdsYXlvdXQgdm0uc2lkZW1lbnU6ICcsIHZtLnNpZGVtZW51KTtcblx0XHR9KTtcblxuXHRcdCRyb290U2NvcGUuJG9uKCdhdXRoLmxvZ291dCcsIGZ1bmN0aW9uKGUpe1xuXHRcdFx0dm0uZnVsbFZpZXcgPSB0cnVlO1xuXHRcdFx0dm0udG9wYmFyID0gZmFsc2U7XG5cdFx0XHR2bS5zaWRlbWVudSA9IGZhbHNlO1xuXHRcdFx0dm0uZm9vdGVyID0gdHJ1ZTtcblxuXHRcdFx0Y29uc29sZS5sb2coJ2xheW91dCB2bS5zaWRlbWVudTogJywgdm0uc2lkZW1lbnUpO1xuXHRcdH0pO1xuXG5cdFx0ZnVuY3Rpb24gdHJpZ2dlclNpZGViYXIoKSB7XG5cdFx0XHRjb25zb2xlLmxvZygndHJpZ2dlciBzaWRlYmFyIScpO1xuXHRcdFx0dm0uc2lkZW1lbnUgPSAhdm0uc2lkZW1lbnU7XG5cdFx0fTtcblxuXHRcdGZ1bmN0aW9uIHRyaWdnZXJMYW5nTWVudSgpIHtcblx0XHRcdGNvbnNvbGUubG9nKCd0cmlnZ2VyIGxhbmdtZW51IScpO1xuXHRcdFx0dm0ubGFuZ21lbnUgPSAhdm0ubGFuZ21lbnU7XG5cdFx0fVxuXG5cdH1cblxufSkoKTsiLCIoZnVuY3Rpb24oKXtcblxuXHQndXNlIHN0cmljdCc7XG5cblx0YW5ndWxhclxuXHRcdC5tb2R1bGUoJ2FwcC5pbnN0YW5jZScpXG5cdFx0LmRpcmVjdGl2ZSgnaW5zdGFuY2VTdW1tYXJ5JywgaW5zdGFuY2VTdW1tYXJ5KTtcblxuXHRmdW5jdGlvbiBpbnN0YW5jZVN1bW1hcnkoKXtcblxuXHRcdHJldHVybiB7XG5cdFx0XHRyZXN0cmljdDogJ0FFJyxcblx0XHRcdHRyYW5zY2x1ZGU6IHRydWUsXG5cdFx0XHRzY29wZToge1xuXHRcdFx0XHRwbGFuOiAnPScsXG5cdFx0XHRcdGFtb3VudDogJz0nLFxuXHRcdFx0XHRjdXJyZW5jeTogJz0nLFxuXHRcdFx0XHRtYXhsaW5lczogJz0nLFxuXHRcdFx0XHRudW1Qb29sOiAnPScsXG5cdFx0XHRcdHN0b3JhZ2U6ICc9Jyxcblx0XHRcdFx0aW5zdGFuY2U6ICc9Jyxcblx0XHRcdFx0bmV3QnJhbmNoOiAnPScsXG5cdFx0XHRcdHVwZGF0ZTogJyYnLFxuXHRcdFx0XHRwcm9jZWVkOiAnJidcblx0XHRcdH0sXG5cdFx0XHR0ZW1wbGF0ZVVybDogJ2luc3RhbmNlL2luc3RhbmNlLXN1bW1hcnkuaHRtbCdcblx0XHR9O1xuXG5cdH1cblxufSkoKTsiLCIoZnVuY3Rpb24oKXtcblxuXHQndXNlIHN0cmljdCc7XG5cblx0YW5ndWxhclxuXHRcdC5tb2R1bGUoJ2FwcC5pbnN0YW5jZScpXG5cdFx0LmNvbnRyb2xsZXIoJ0luc3RhbmNlQ29udHJvbGxlcicsIEluc3RhbmNlQ29udHJvbGxlcik7XG5cblx0SW5zdGFuY2VDb250cm9sbGVyLiRpbmplY3QgPSBbJyRzY29wZScsICckcm91dGVQYXJhbXMnLCAnJGxvY2F0aW9uJywgJyR0cmFuc2xhdGUnLCAnJHVpYk1vZGFsJywgJ2FwaVNlcnZpY2UnLCAnY3VzdG9tZXJTZXJ2aWNlJywgJ3Bvb2xTaXplU2VydmljZXMnLCAnYnJhbmNoZXNTZXJ2aWNlJywgJ2NhcnRTZXJ2aWNlJywgJ25vdGlmeVNlcnZpY2UnLCAnZXJyb3JTZXJ2aWNlJywgJ3NwaW5uZXJTZXJ2aWNlJywgJ3V0aWxzU2VydmljZScsICdjb252ZXJ0Qnl0ZXNGaWx0ZXInXTtcblxuXHRmdW5jdGlvbiBJbnN0YW5jZUNvbnRyb2xsZXIoJHNjb3BlLCAkcm91dGVQYXJhbXMsICRsb2NhdGlvbiwgJHRyYW5zbGF0ZSwgJHVpYk1vZGFsLCBhcGksIGN1c3RvbWVyU2VydmljZSwgcG9vbFNpemVTZXJ2aWNlcywgYnJhbmNoZXNTZXJ2aWNlLCBjYXJ0LCBub3RpZnlTZXJ2aWNlLCBlcnJvclNlcnZpY2UsIHNwaW5uZXIsIHV0aWxzLCBjb252ZXJ0Qnl0ZXNGaWx0ZXIpIHtcblxuXHRcdHZhciB2bSA9IHRoaXM7XG5cdFx0dmFyIG9pZCA9ICRyb3V0ZVBhcmFtcy5vaWQ7XG5cdFx0dmFyIGNhcnRJdGVtID0gJHJvdXRlUGFyYW1zLmNhcnRfaXRlbTtcblx0XHR2YXIgbWluVXNlcnMgPSA0O1xuXHRcdHZhciBtaW5MaW5lcyA9IDg7XG5cblx0XHR2bS5jdXN0b21lciA9IGN1c3RvbWVyU2VydmljZS5nZXRDdXN0b21lcigpO1xuXHRcdHZtLm1pblVzZXJzID0gbWluVXNlcnM7XG5cdFx0dm0ubWluTGluZXMgPSBtaW5MaW5lcztcblx0XHR2bS5wYXNzVHlwZSA9ICdwYXNzd29yZCc7XG5cdFx0dm0ucGFzc3dvcmRTdHJlbmd0aCA9IDA7XG5cdFx0dm0ubmV3QnJhbmNoID0gdHJ1ZTtcblx0XHQvLyB2bS5ub1RyaWFsID0gZmFsc2U7XG5cdFx0dm0udHJpYWwgPSB0cnVlO1xuXHRcdHZtLm5vQWRkb25zID0gZmFsc2U7XG5cdFx0dm0ucGxhbnMgPSBbXTtcblx0XHR2bS5hdmFpbGFibGVQbGFucyA9IFtdO1xuXHRcdHZtLnNlbGVjdGVkUGxhbiA9IHt9O1xuXHRcdHZtLnByZXZQbGFuSWQgPSAnJztcblx0XHR2bS5zaWRzID0gW107XG5cdFx0dm0udG90YWxBbW91bnQgPSAwO1xuXHRcdHZtLnRvdGFsTGluZXMgPSAwO1xuXHRcdHZtLnRvdGFsU3RvcmFnZSA9IDA7XG5cdFx0dm0ubnVtUG9vbCA9ICcyMDAtMjk5Jztcblx0XHR2bS5zdG9yYWdlcyA9IFsnMCcsICczMCcsICcxMDAnLCAnMjUwJywgJzUwMCddO1xuXHRcdHZtLmxpbmVzID0gWycwJywgJzQnLCAnOCcsICcxNicsICczMCcsICc2MCcsICcxMjAnLCAnMjUwJywgJzUwMCddO1xuXHRcdHZtLmxhbmd1YWdlcyA9IFtcblx0XHRcdHtuYW1lOiAnRW5nbGlzaCcsIHZhbHVlOiAnZW4nfSxcblx0XHRcdHtuYW1lOiAn0KPQutGA0LDRl9C90YHRjNC60LAnLCB2YWx1ZTogJ3VrJ30sXG5cdFx0XHR7bmFtZTogJ9Cg0YPRgdGB0LrQuNC5JywgdmFsdWU6ICdydSd9XG5cdFx0XTtcblx0XHR2bS5hZGRPbnMgPSB7XG5cdFx0XHRzdG9yYWdlOiB7XG5cdFx0XHRcdG5hbWU6ICdzdG9yYWdlJyxcblx0XHRcdFx0cXVhbnRpdHk6ICcwJ1xuXHRcdFx0fSxcblx0XHRcdGxpbmVzOiB7XG5cdFx0XHRcdG5hbWU6ICdsaW5lcycsXG5cdFx0XHRcdHF1YW50aXR5OiAnMCdcblx0XHRcdH1cblx0XHR9O1xuXHRcdHZtLmluc3RhbmNlID0ge1xuXHRcdFx0X3N1YnNjcmlwdGlvbjoge1xuXHRcdFx0XHRwbGFuSWQ6ICcnLFxuXHRcdFx0XHRxdWFudGl0eTogbWluVXNlcnMsXG5cdFx0XHRcdGFkZE9uczogW11cblx0XHRcdH0sXG5cdFx0XHRyZXN1bHQ6IHtcblx0XHRcdFx0bGFuZzogJ2VuJyxcblx0XHRcdFx0bWF4bGluZXM6IDgsXG5cdFx0XHRcdG1heHVzZXJzOiBtaW5Vc2Vyc1xuXHRcdFx0fVxuXHRcdH07XG5cblx0XHR2bS5nZW5lcmF0ZVBhc3N3b3JkID0gZ2VuZXJhdGVQYXNzd29yZDtcblx0XHR2bS5yZXZlYWxQYXNzd29yZCA9IHJldmVhbFBhc3N3b3JkO1xuXHRcdHZtLnByb2NlZWQgPSBwcm9jZWVkO1xuXHRcdHZtLnVwZGF0ZSA9IHVwZGF0ZTtcblx0XHR2bS5zZWxlY3RQbGFuID0gc2VsZWN0UGxhbjtcblx0XHR2bS5zZWxlY3RTZXJ2ZXIgPSBzZWxlY3RTZXJ2ZXI7XG5cdFx0dm0ucGx1c1VzZXIgPSBmdW5jdGlvbigpIHtcblx0XHRcdHJldHVybiB2bS5pbnN0YW5jZS5fc3Vic2NyaXB0aW9uLnF1YW50aXR5ICs9IDE7XG5cdFx0fTtcblx0XHR2bS5taW51c1VzZXIgPSBmdW5jdGlvbigpIHtcblx0XHRcdGlmKHZtLmluc3RhbmNlLl9zdWJzY3JpcHRpb24ucXVhbnRpdHkgPiBtaW5Vc2Vycykge1xuXHRcdFx0XHR2bS5pbnN0YW5jZS5fc3Vic2NyaXB0aW9uLnF1YW50aXR5IC09IDE7XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gdm0uaW5zdGFuY2UuX3N1YnNjcmlwdGlvbi5xdWFudGl0eTtcblx0XHR9O1xuXHRcdHZtLnNob3dQbGFucyA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0JHVpYk1vZGFsLm9wZW4oe1xuXHRcdFx0XHR0ZW1wbGF0ZVVybDogJ2Fzc2V0cy9wYXJ0aWFscy9jb21wYXJlLXBsYW5zLmh0bWwnLFxuXHRcdFx0XHRzaXplOiAnbGcnXG5cdFx0XHR9KTtcblx0XHR9O1xuXG5cdFx0JHNjb3BlLiR3YXRjaChmdW5jdGlvbigpIHtcblx0XHRcdHJldHVybiB2bS5pbnN0YW5jZS5fc3Vic2NyaXB0aW9uLnF1YW50aXR5O1xuXHRcdH0sIGZ1bmN0aW9uKHZhbCkge1xuXHRcdFx0XG5cdFx0XHRpZighdmFsKSB7XG5cdFx0XHRcdHZtLmluc3RhbmNlLl9zdWJzY3JpcHRpb24ucXVhbnRpdHkgPSBtaW5Vc2Vycztcblx0XHRcdH1cblxuXHRcdFx0aWYodm0uc2VsZWN0ZWRQbGFuLnBsYW5JZCA9PT0gJ3RyaWFsJyB8fCB2bS5zZWxlY3RlZFBsYW4ucGxhbklkID09PSAnZnJlZScpIHtcblx0XHRcdFx0dm0uaW5zdGFuY2UuX3N1YnNjcmlwdGlvbi5xdWFudGl0eSA9IG1pblVzZXJzO1xuXHRcdFx0fVxuXG5cdFx0XHR0b3RhbExpbmVzKCk7XG5cdFx0XHR0b3RhbFN0b3JhZ2UoKTtcblx0XHRcdHRvdGFsQW1vdW50KCk7XG5cdFx0fSk7XG5cdFx0XG5cdFx0JHNjb3BlLiR3YXRjaChmdW5jdGlvbigpIHtcblx0XHRcdHJldHVybiB2bS5hZGRPbnMubGluZXMucXVhbnRpdHk7XG5cdFx0fSwgZnVuY3Rpb24odmFsKSB7XG5cdFx0XHR2bS5hZGRPbnMubGluZXMucXVhbnRpdHkgPSB2bS5hZGRPbnMubGluZXMucXVhbnRpdHkudG9TdHJpbmcoKTtcblx0XHRcdC8vIHZtLmluc3RhbmNlLl9zdWJzY3JpcHRpb24uYWRkT25zLmxpbmVzLnF1YW50aXR5ID0gcGFyc2VJbnQodmFsLCAxMCk7XG5cdFx0XHR0b3RhbExpbmVzKCk7XG5cdFx0XHR0b3RhbEFtb3VudCgpO1xuXHRcdH0pO1xuXG5cdFx0JHNjb3BlLiR3YXRjaChmdW5jdGlvbigpIHtcblx0XHRcdHJldHVybiB2bS5hZGRPbnMuc3RvcmFnZS5xdWFudGl0eTtcblx0XHR9LCBmdW5jdGlvbih2YWwpIHtcblx0XHRcdHZtLmFkZE9ucy5zdG9yYWdlLnF1YW50aXR5ID0gdm0uYWRkT25zLnN0b3JhZ2UucXVhbnRpdHkudG9TdHJpbmcoKTtcblx0XHRcdC8vIHZtLmluc3RhbmNlLl9zdWJzY3JpcHRpb24uYWRkT25zLnN0b3JhZ2UucXVhbnRpdHkgPSBwYXJzZUludCh2YWwsIDEwKTtcblx0XHRcdHRvdGFsU3RvcmFnZSgpO1xuXHRcdFx0dG90YWxBbW91bnQoKTtcblx0XHR9KTtcblxuXHRcdCRzY29wZS4kd2F0Y2goZnVuY3Rpb24oKSB7XG5cdFx0XHRyZXR1cm4gdm0uaW5zdGFuY2UuX3N1YnNjcmlwdGlvbi5wbGFuSWQ7XG5cdFx0fSwgZnVuY3Rpb24odmFsLCBwcmV2KSB7XG5cdFx0XHR2bS5wbGFucy5mb3JFYWNoKGZ1bmN0aW9uKGl0ZW0pIHtcblx0XHRcdFx0aWYoaXRlbS5wbGFuSWQgPT09IHZtLmluc3RhbmNlLl9zdWJzY3JpcHRpb24ucGxhbklkKSB7XG5cdFx0XHRcdFx0dm0uc2VsZWN0ZWRQbGFuID0gaXRlbTtcblx0XHRcdFx0XHRpZihpdGVtLnBsYW5JZCA9PT0gJ3RyaWFsJyB8fCBpdGVtLnBsYW5JZCA9PT0gJ2ZyZWUnKSB7XG5cdFx0XHRcdFx0XHQvLyB2bS50cmlhbCA9IHRydWU7XG5cdFx0XHRcdFx0XHR2bS5pbnN0YW5jZS5fc3Vic2NyaXB0aW9uLnF1YW50aXR5ID0gbWluVXNlcnM7XG5cdFx0XHRcdFx0XHR2bS5pbnN0YW5jZS5tYXhsaW5lcyA9IG1pbkxpbmVzO1xuXHRcdFx0XHRcdFx0dm0uYWRkT25zLmxpbmVzLnF1YW50aXR5ID0gJzAnO1xuXHRcdFx0XHRcdFx0dm0uYWRkT25zLnN0b3JhZ2UucXVhbnRpdHkgPSAnMCc7XG5cdFx0XHRcdFx0XHR2bS5ub0FkZG9ucyA9IHRydWU7XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdHZtLm5vQWRkb25zID0gZmFsc2U7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0dG90YWxBbW91bnQoKTtcblx0XHRcdFx0XHR0b3RhbFN0b3JhZ2UoKTtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0XHR2bS5wcmV2UGxhbklkID0gcHJldjtcblx0XHRcdGNvbnNvbGUubG9nKCdwcmV2UGxhbklkOiAnLCB2bS5wcmV2UGxhbklkKTtcblx0XHR9KTtcblxuXHRcdCRzY29wZS4kb24oJyR2aWV3Q29udGVudExvYWRlZCcsIGZ1bmN0aW9uKCl7XG5cdFx0XHRzcGlubmVyLnNob3coJ3BsYW5zLXNwaW5uZXInKTtcblx0XHRcdHNwaW5uZXIuc2hvdygnc2VydmVycy1zcGlubmVyJyk7XG5cdFx0fSk7XG5cblx0XHRnZXRQbGFucygpO1xuXHRcdGdldFNlcnZlcnMoKTtcblxuXHRcdGZ1bmN0aW9uIGdldFBsYW5zKCkge1xuXHRcdFx0XG5cdFx0XHRpZihicmFuY2hlc1NlcnZpY2UuZ2V0UGxhbnMoKS5sZW5ndGgpIHtcblx0XHRcdFx0Y29uc29sZS5sb2coJ2dldFBsYW5zOicsIGJyYW5jaGVzU2VydmljZS5nZXRQbGFucygpKTtcblx0XHRcdFx0dm0ucGxhbnMgPSBicmFuY2hlc1NlcnZpY2UuZ2V0UGxhbnMoKTtcblxuXHRcdFx0XHRzcGlubmVyLmhpZGUoJ3BsYW5zLXNwaW5uZXInKTtcblx0XHRcdFx0aW5pdCgpO1xuXG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0YXBpLnJlcXVlc3Qoe1xuXHRcdFx0XHR1cmw6ICdnZXRQbGFucydcblx0XHRcdH0pLnRoZW4oZnVuY3Rpb24ocmVzKXtcblx0XHRcdFx0aWYoIXJlcy5kYXRhLnN1Y2Nlc3MpIHJldHVybiBlcnJvclNlcnZpY2Uuc2hvdyhyZXMuZGF0YS5tZXNzYWdlKTtcblxuXHRcdFx0XHR2bS5wbGFucyA9IHJlcy5kYXRhLnJlc3VsdDtcblx0XHRcdFx0dm0ucGxhbnMuZm9yRWFjaChmdW5jdGlvbihpdGVtKXtcblx0XHRcdFx0XHRpdGVtLmFkZE9ucyA9IHV0aWxzLmFycmF5VG9PYmplY3QoaXRlbS5hZGRPbnMsICduYW1lJyk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0XHRjb25zb2xlLmxvZygnZ2V0UGxhbnM6Jywgdm0ucGxhbnMpO1xuXG5cdFx0XHRcdGJyYW5jaGVzU2VydmljZS5zZXRQbGFucyh2bS5wbGFucyk7XG5cblx0XHRcdFx0aW5pdCgpO1xuXHRcdFx0XHRcblx0XHRcdH0sIGZ1bmN0aW9uKGVycil7XG5cdFx0XHRcdGVycm9yU2VydmljZS5zaG93KGVyci5kYXRhLm1lc3NhZ2UpO1xuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gZ2V0U2VydmVycygpIHtcblxuXHRcdFx0aWYoYnJhbmNoZXNTZXJ2aWNlLmdldFNlcnZlcnMoKS5sZW5ndGgpIHtcblx0XHRcdFx0dm0uc2lkcyA9IGJyYW5jaGVzU2VydmljZS5nZXRTZXJ2ZXJzKCk7XG5cdFx0XHRcdGlmKG9pZCA9PT0gJ25ldycpIHZtLmluc3RhbmNlLnNpZCA9IHZtLnNpZHNbMF0uX2lkO1xuXHRcdFx0XHRzcGlubmVyLmhpZGUoJ3NlcnZlcnMtc3Bpbm5lcicpO1xuXHRcdFx0XHRcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0XHRhcGkucmVxdWVzdCh7XG5cdFx0XHRcdHVybDogJ2dldFNlcnZlcnMnXG5cdFx0XHR9KS50aGVuKGZ1bmN0aW9uKHJlcyl7XG5cdFx0XHRcdGlmKCFyZXMuZGF0YS5zdWNjZXNzKSByZXR1cm4gZXJyb3JTZXJ2aWNlLnNob3cocmVzLmRhdGEubWVzc2FnZSk7XG5cblx0XHRcdFx0Y29uc29sZS5sb2coJ2dldFNlcnZlcnM6ICcsIHJlcy5kYXRhLnJlc3VsdCk7XG5cdFx0XHRcdHZtLnNpZHMgPSByZXMuZGF0YS5yZXN1bHQ7XG5cdFx0XHRcdGJyYW5jaGVzU2VydmljZS5zZXRTZXJ2ZXJzKHZtLnNpZHMpO1xuXG5cdFx0XHRcdGlmKG9pZCA9PT0gJ25ldycpIHZtLmluc3RhbmNlLnNpZCA9IHZtLnNpZHNbMF0uX2lkO1xuXHRcdFx0XHRzcGlubmVyLmhpZGUoJ3NlcnZlcnMtc3Bpbm5lcicpO1xuXHRcdFx0fSwgZnVuY3Rpb24oZXJyKXtcblx0XHRcdFx0ZXJyb3JTZXJ2aWNlLnNob3coZXJyKTtcblx0XHRcdH0pO1xuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIGluaXQoKSB7XG5cdFx0XHRpZihvaWQgIT09ICduZXcnKXtcblxuXHRcdFx0XHRicmFuY2hlc1NlcnZpY2UuZ2V0KG9pZCwgZnVuY3Rpb24gKGJyYW5jaCl7XG5cdFx0XHRcdFx0aWYoYnJhbmNoKSB7XG5cdFx0XHRcdFx0XHRzZXRCcmFuY2goYW5ndWxhci5tZXJnZSh7fSwgYnJhbmNoKSk7XG5cdFx0XHRcdFx0XHR2bS5hdmFpbGFibGVQbGFucyA9IHZtLnBsYW5zLmZpbHRlcihpc1BsYW5BdmFpbGFibGUpO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRhcGkucmVxdWVzdCh7IHVybDogJ2dldEJyYW5jaC8nK29pZCB9KS50aGVuKGZ1bmN0aW9uIChyZXMpe1xuXHRcdFx0XHRcdFx0XHRpZighcmVzLmRhdGEuc3VjY2VzcykgcmV0dXJuIGVycm9yU2VydmljZS5zaG93KHJlcy5kYXRhLm1lc3NhZ2UpO1xuXG5cdFx0XHRcdFx0XHRcdHNldEJyYW5jaChyZXMuZGF0YS5yZXN1bHQpO1xuXHRcdFx0XHRcdFx0XHR2bS5hdmFpbGFibGVQbGFucyA9IHZtLnBsYW5zLmZpbHRlcihpc1BsYW5BdmFpbGFibGUpO1xuXHRcdFx0XHRcdFx0fSwgZnVuY3Rpb24gKGVycil7XG5cdFx0XHRcdFx0XHRcdGVycm9yU2VydmljZS5zaG93KGVycik7XG5cdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0c3Bpbm5lci5oaWRlKCdwbGFucy1zcGlubmVyJyk7XG5cdFx0XHRcdH0pO1xuXG5cdFx0XHRcdHZtLm5ld0JyYW5jaCA9IGZhbHNlO1xuXG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHR2bS5uZXdCcmFuY2ggPSB0cnVlO1xuXHRcdFx0XHR2bS5udW1Qb29sID0gJzIwMC0yOTknO1xuXHRcdFx0XHR2bS5pbnN0YW5jZS5fc3Vic2NyaXB0aW9uLnBsYW5JZCA9ICdzdGFuZGFyZCc7XG5cdFx0XHRcdHZtLmF2YWlsYWJsZVBsYW5zID0gdm0ucGxhbnM7XG5cblx0XHRcdFx0aWYoY2FydEl0ZW0gJiYgY2FydC5nZXQoY2FydEl0ZW0pKSB7XG5cdFx0XHRcdFx0c2V0QnJhbmNoKGNhcnQuZ2V0KGNhcnRJdGVtKS5kYXRhKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGFwaS5yZXF1ZXN0KHtcblx0XHRcdFx0XHR1cmw6ICdjYW5DcmVhdGVUcmlhbFN1Yidcblx0XHRcdFx0fSkudGhlbihmdW5jdGlvbihyZXMpe1xuXHRcdFx0XHRcdGlmKCFyZXMuZGF0YS5zdWNjZXNzKSByZXR1cm4gZXJyb3JTZXJ2aWNlLnNob3cocmVzLmRhdGEubWVzc2FnZSk7XG5cdFx0XHRcdFx0XG5cdFx0XHRcdFx0aWYocmVzLmRhdGEucmVzdWx0KSB2bS50cmlhbCA9IHRydWU7XG5cdFx0XHRcdFx0ZWxzZSB2bS50cmlhbCA9IGZhbHNlO1xuXHRcdFx0XHRcdHNwaW5uZXIuaGlkZSgncGxhbnMtc3Bpbm5lcicpO1xuXHRcdFx0XHR9LCBmdW5jdGlvbihlcnIpe1xuXHRcdFx0XHRcdGVycm9yU2VydmljZS5zaG93KGVyci5kYXRhLm1lc3NhZ2UpO1xuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRmdW5jdGlvbiBwcm9jZWVkKGFjdGlvbil7XG5cblx0XHRcdHZhciBicmFuY2hTZXR0cyA9IGdldEJyYW5jaFNldHRzKCk7XG5cdFx0XHRjb25zb2xlLmxvZygncHJvY2VlZDogJywgYnJhbmNoU2V0dHMsIHZtLmFkZE9ucyk7XG5cdFx0XHRpZighYnJhbmNoU2V0dHMpIHtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBQcm9oaWJpdCBkb3duZ3JhZGUgaWYgcGxhbidzIHN0b3JlbGltaXQgXG5cdFx0XHQvLyBpcyBsZXNzIHRoYW4gYnJhbmNoIGlzIGFscmVhZHkgdXRpbGl6ZWRcblx0XHRcdGlmKGJyYW5jaFNldHRzLnJlc3VsdC5zdG9yZWxpbWl0IDwgYnJhbmNoU2V0dHMucmVzdWx0LnN0b3Jlc2l6ZSkge1xuXHRcdFx0XHQkdHJhbnNsYXRlKCdFUlJPUlMuRE9XTkdSQURFX0VSUk9SX1NUT1JBR0UnKVxuXHRcdFx0XHQudGhlbihmdW5jdGlvbih0cmFuc2xhdGlvbil7XG5cdFx0XHRcdFx0YWxlcnQodHJhbnNsYXRpb24pO1xuXHRcdFx0XHR9KTtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXHRcdFx0Ly8gUHJvaGliaXQgZG93bmdyYWRlIGlmIHRoZSBuZXcgbnViZXIgb2YgbWF4dXNlcnMgXG5cdFx0XHQvLyBpcyBsZXNzIHRoYW4gdGhlIG51bWJlciBvZiBjcmVhdGVkIHVzZXJzIGluIGJyYW5jaFxuXHRcdFx0aWYoYnJhbmNoU2V0dHMuX3N1YnNjcmlwdGlvbi5xdWFudGl0eSA8IGJyYW5jaFNldHRzLnJlc3VsdC51c2Vycykge1xuXHRcdFx0XHQkdHJhbnNsYXRlKCdFUlJPUlMuRE9XTkdSQURFX0VSUk9SX1VTRVJTJylcblx0XHRcdFx0LnRoZW4oZnVuY3Rpb24odHJhbnNsYXRpb24pe1xuXHRcdFx0XHRcdGFsZXJ0KHRyYW5zbGF0aW9uKTtcblx0XHRcdFx0fSk7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0dmFyIGFjdGlvblN0ciA9ICcnOyBcblx0XHRcdGlmKGFjdGlvbiA9PT0gJ2NyZWF0ZVN1YnNjcmlwdGlvbicpIHtcblx0XHRcdFx0YWN0aW9uU3RyID0gJ05FV19TVUJTQ1JJUFRJT04nO1xuXHRcdFx0fSBlbHNlIGlmKGFjdGlvbiA9PT0gJ3VwZGF0ZVN1YnNjcmlwdGlvbicgfHwgYWN0aW9uID09PSAnY2hhbmdlUGxhbicpIHtcblx0XHRcdFx0YWN0aW9uU3RyID0gJ1VQREFURV9TVUJTQ1JJUFRJT04nO1xuXHRcdFx0fVxuXG5cdFx0XHQkdHJhbnNsYXRlKCdERVNDUklQVElPTlMuJythY3Rpb25TdHIsIHtcblx0XHRcdFx0cGxhbklkOiBicmFuY2hTZXR0cy5fc3Vic2NyaXB0aW9uLnBsYW5JZCxcblx0XHRcdFx0dXNlcnM6IGJyYW5jaFNldHRzLl9zdWJzY3JpcHRpb24ucXVhbnRpdHksXG5cdFx0XHRcdG1heGxpbmVzOiBicmFuY2hTZXR0cy5yZXN1bHQubWF4bGluZXMsXG5cdFx0XHRcdGNvbXBhbnk6IGJyYW5jaFNldHRzLnJlc3VsdC5uYW1lXG5cdFx0XHR9KVxuXHRcdFx0LnRoZW4oZnVuY3Rpb24gKGRlc2NyaXB0aW9uKSB7XG5cdFx0XHRcdFxuXHRcdFx0XHRicmFuY2hTZXR0cy5fc3Vic2NyaXB0aW9uLmRlc2NyaXB0aW9uID0gZGVzY3JpcHRpb247XG5cblx0XHRcdFx0aWYoY2FydEl0ZW0pIHtcblx0XHRcdFx0XHRjYXJ0LnVwZGF0ZShicmFuY2hTZXR0cy5yZXN1bHQucHJlZml4LCB7XG5cdFx0XHRcdFx0XHRhY3Rpb246IGFjdGlvbixcblx0XHRcdFx0XHRcdGRlc2NyaXB0aW9uOiBkZXNjcmlwdGlvbixcblx0XHRcdFx0XHRcdGFtb3VudDogdm0udG90YWxBbW91bnQsXG5cdFx0XHRcdFx0XHRkYXRhOiBicmFuY2hTZXR0c1xuXHRcdFx0XHRcdH0pO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdC8vIGNhcnRbKHZtLmN1c3RvbWVyLnJvbGUgPT09ICd1c2VyJyA/ICdzZXQnIDogJ2FkZCcpXSh7XG5cdFx0XHRcdFx0Y2FydC5hZGQoe1xuXHRcdFx0XHRcdFx0YWN0aW9uOiBhY3Rpb24sXG5cdFx0XHRcdFx0XHRkZXNjcmlwdGlvbjogZGVzY3JpcHRpb24sXG5cdFx0XHRcdFx0XHRhbW91bnQ6IHZtLnRvdGFsQW1vdW50LFxuXHRcdFx0XHRcdFx0ZGF0YTogYnJhbmNoU2V0dHNcblx0XHRcdFx0XHR9KTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdCRsb2NhdGlvbi5wYXRoKCcvcGF5bWVudCcpO1xuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gdXBkYXRlKCl7XG5cblx0XHRcdHZhciBicmFuY2hTZXR0cyA9IGdldEJyYW5jaFNldHRzKCksXG5cdFx0XHRcdGJhbGFuY2UsXG5cdFx0XHRcdHBsYW5QcmljZSxcblx0XHRcdFx0cGxhbkFtb3VudCxcblx0XHRcdFx0YmlsbGluZ0N5cmNsZXM7XG5cblxuXHRcdFx0aWYoIWJyYW5jaFNldHRzKSB7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0Ly8gUHJvaGliaXQgZG93bmdyYWRlIGlmIHBsYW4ncyBzdG9yZWxpbWl0IFxuXHRcdFx0Ly8gaXMgbGVzcyB0aGFuIGJyYW5jaCBpcyBhbHJlYWR5IHV0aWxpemVkXG5cdFx0XHRpZihicmFuY2hTZXR0cy5yZXN1bHQuc3RvcmVsaW1pdCA8IGJyYW5jaFNldHRzLnJlc3VsdC5zdG9yZXNpemUpIHtcblx0XHRcdFx0JHRyYW5zbGF0ZSgnRVJST1JTLkRPV05HUkFERV9FUlJPUl9TVE9SQUdFJylcblx0XHRcdFx0LnRoZW4oZnVuY3Rpb24odHJhbnNsYXRpb24pe1xuXHRcdFx0XHRcdGFsZXJ0KHRyYW5zbGF0aW9uKTtcblx0XHRcdFx0fSk7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblx0XHRcdC8vIFByb2hpYml0IGRvd25ncmFkZSBpZiB0aGUgbmV3IG51YmVyIG9mIG1heHVzZXJzIFxuXHRcdFx0Ly8gaXMgbGVzcyB0aGFuIHRoZSBudW1iZXIgb2YgY3JlYXRlZCB1c2VycyBpbiBicmFuY2hcblx0XHRcdGlmKGJyYW5jaFNldHRzLl9zdWJzY3JpcHRpb24ucXVhbnRpdHkgPCBicmFuY2hTZXR0cy5yZXN1bHQudXNlcnMpIHtcblx0XHRcdFx0JHRyYW5zbGF0ZSgnRVJST1JTLkRPV05HUkFERV9FUlJPUl9VU0VSUycpXG5cdFx0XHRcdC50aGVuKGZ1bmN0aW9uKHRyYW5zbGF0aW9uKXtcblx0XHRcdFx0XHRhbGVydCh0cmFuc2xhdGlvbik7XG5cdFx0XHRcdH0pO1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdGJhbGFuY2UgPSBwYXJzZUZsb2F0KHZtLmN1c3RvbWVyLmJhbGFuY2UpO1xuXHRcdFx0cGxhblByaWNlID0gcGFyc2VGbG9hdCh2bS5zZWxlY3RlZFBsYW4ucHJpY2UpO1xuXHRcdFx0cGxhbkFtb3VudCA9IHBhcnNlRmxvYXQodm0udG90YWxBbW91bnQpO1xuXHRcdFx0YmlsbGluZ0N5cmNsZXMgPSBicmFuY2hTZXR0cy5fc3Vic2NyaXB0aW9uLmJpbGxpbmdDeXJjbGVzO1xuXG5cdFx0XHRpZihiYWxhbmNlIDwgcGxhbkFtb3VudCB8fCAodm0ucHJldlBsYW5JZCAmJiBicmFuY2hTZXR0cy5fc3Vic2NyaXB0aW9uLnBsYW5JZCAhPT0gdm0ucHJldlBsYW5JZCkpIHtcblxuXHRcdFx0XHRwcm9jZWVkKCdjaGFuZ2VQbGFuJyk7XG5cdFx0XHRcdHJldHVybjtcblxuXHRcdFx0fVxuXG5cdFx0XHRhcGkucmVxdWVzdCh7XG5cdFx0XHRcdHVybDogJ3VwZGF0ZVN1YnNjcmlwdGlvbicsXG5cdFx0XHRcdHBhcmFtczogYnJhbmNoU2V0dHNcblx0XHRcdH0pLnRoZW4oZnVuY3Rpb24ocmVzKXtcblx0XHRcdFx0aWYoIXJlcy5kYXRhLnN1Y2Nlc3MpIHtcblx0XHRcdFx0XHRpZihlcnIuZGF0YS5tZXNzYWdlID09PSAnRVJST1JTLk5PVF9FTk9VR0hfQ1JFRElUUycpIHByb2NlZWQoJ3VwZGF0ZVN1YnNjcmlwdGlvbicpO1xuXHRcdFx0XHRcdGVsc2UgZXJyb3JTZXJ2aWNlLnNob3cocmVzLmRhdGEubWVzc2FnZSk7XG5cdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0YnJhbmNoZXNTZXJ2aWNlLnVwZGF0ZShicmFuY2hTZXR0cy5vaWQsIGJyYW5jaFNldHRzKTtcblx0XHRcdFx0bm90aWZ5U2VydmljZS5zaG93KCdBTExfQ0hBTkdFU19TQVZFRCcpO1xuXHRcdFx0fSwgZnVuY3Rpb24oZXJyKXtcblx0XHRcdFx0ZXJyb3JTZXJ2aWNlLnNob3coZXJyKTtcblx0XHRcdH0pO1xuXHRcdH1cblx0XHRcblx0XHRmdW5jdGlvbiBzZXRCcmFuY2gob3B0cykge1xuXHRcdFx0dm0uaW5zdGFuY2UgPSBvcHRzO1xuXHRcdFx0dm0uaW5pdE5hbWUgPSBvcHRzLnJlc3VsdC5uYW1lO1xuXG5cdFx0XHRpZihvcHRzLnJlc3VsdC5leHRlbnNpb25zKSB7XG5cdFx0XHRcdHZtLm51bVBvb2wgPSBwb29sU2l6ZVNlcnZpY2VzLnBvb2xBcnJheVRvU3RyaW5nKG9wdHMucmVzdWx0LmV4dGVuc2lvbnMpO1xuXHRcdFx0fVxuXHRcdFx0XG5cdFx0XHQvLyBpZihvcHRzLl9zdWJzY3JpcHRpb24ucGxhbklkICYmIG9wdHMuX3N1YnNjcmlwdGlvbi5wbGFuSWQgIT09ICd0cmlhbCcgJiYgb3B0cy5fc3Vic2NyaXB0aW9uLnBsYW5JZCAhPT0gJ2ZyZWUnKSB7XG5cdFx0XHQvLyBcdHZtLm5vVHJpYWwgPSB0cnVlO1xuXHRcdFx0Ly8gfVxuXG5cdFx0XHRpZihvcHRzLl9zdWJzY3JpcHRpb24uYWRkT25zLmxlbmd0aCkge1xuXHRcdFx0XHR2bS5hZGRPbnMgPSB1dGlscy5hcnJheVRvT2JqZWN0KG9wdHMuX3N1YnNjcmlwdGlvbi5hZGRPbnMsICduYW1lJyk7XG5cdFx0XHR9XG5cblx0XHRcdHZtLnN0b3JhZ2VzLmZvckVhY2goZnVuY3Rpb24oaXRlbSwgaW5kZXgsIGFycmF5KXtcblx0XHRcdFx0aWYoaXRlbSAhPT0gJzAnICYmIHBhcnNlSW50KGl0ZW0sIDEwKSA8IG9wdHMucmVzdWx0LnN0b3Jlc2l6ZSkgYXJyYXkuc3BsaWNlKGluZGV4LCAxKTtcblx0XHRcdH0pO1xuXG5cdFx0XHRjb25zb2xlLmxvZygnc2V0QnJhbmNoOiAnLCB2bS5pbnN0YW5jZSk7XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gZ2V0QnJhbmNoU2V0dHMoKSB7XG5cdFx0XHR2YXIgYWRkT25zID0gW107XG5cblx0XHRcdGlmKCF2bS5pbnN0YW5jZS5fc3Vic2NyaXB0aW9uLnBsYW5JZCB8fCAhdm0uaW5zdGFuY2UucmVzdWx0LnByZWZpeCB8fCAhdm0ubnVtUG9vbCB8fCAhdm0uaW5zdGFuY2UucmVzdWx0Lm5hbWUgfHwgKCF2bS5pbnN0YW5jZS5yZXN1bHQuYWRtaW5wYXNzICYmIHZtLm5ld0JyYW5jaCkpIHtcblx0XHRcdFx0ZXJyb3JTZXJ2aWNlLnNob3coJ01JU1NJTkdfRklFTERTJyk7XG5cdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdH1cblxuXHRcdFx0Y29uc29sZS5sb2coJ3Bhc3M6ICcsIHZtLmluc3RhbmNlLnJlc3VsdC5hZG1pbnBhc3MsIHZtLmNvbmZpcm1QYXNzKTtcblx0XHRcdGlmKHZtLmluc3RhbmNlLnJlc3VsdC5hZG1pbnBhc3MgJiYgKHZtLmNvbmZpcm1QYXNzICE9PSB2bS5pbnN0YW5jZS5yZXN1bHQuYWRtaW5wYXNzKSl7XG5cdFx0XHRcdGVycm9yU2VydmljZS5zaG93KCdQQVNTV09SRF9OT1RfQ09ORklSTUVEJyk7XG5cdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdH1cblxuXHRcdFx0dm0uaW5zdGFuY2UucmVzdWx0LmV4dGVuc2lvbnMgPSBwb29sU2l6ZVNlcnZpY2VzLnBvb2xTdHJpbmdUb09iamVjdCh2bS5udW1Qb29sKTtcblx0XHRcdHZtLmluc3RhbmNlLnJlc3VsdC5hZG1pbm5hbWUgPSB2bS5pbnN0YW5jZS5yZXN1bHQucHJlZml4O1xuXHRcdFx0dm0uaW5zdGFuY2UucmVzdWx0Lm1heGxpbmVzID0gcGFyc2VJbnQodm0udG90YWxMaW5lcywgMTApO1xuXHRcdFx0dm0uaW5zdGFuY2UucmVzdWx0Lm1heHVzZXJzID0gcGFyc2VJbnQodm0uaW5zdGFuY2UuX3N1YnNjcmlwdGlvbi5xdWFudGl0eSwgMTApO1xuXHRcdFx0dm0uaW5zdGFuY2UucmVzdWx0LnN0b3JlbGltaXQgPSBjb252ZXJ0Qnl0ZXNGaWx0ZXIodm0udG90YWxTdG9yYWdlLCAnR0InLCAnQnl0ZScpO1xuXHRcdFx0aWYob2lkKSB2bS5pbnN0YW5jZS5vaWQgPSBvaWQ7XG5cblx0XHRcdGFuZ3VsYXIuZm9yRWFjaCh2bS5hZGRPbnMsIGZ1bmN0aW9uKGFkZE9uKXtcblx0XHRcdFx0aWYoYWRkT24ucXVhbnRpdHkpIGFkZE9uLnF1YW50aXR5ID0gcGFyc2VJbnQoYWRkT24ucXVhbnRpdHkpO1xuXHRcdFx0XHRhZGRPbnMucHVzaChhZGRPbik7XG5cdFx0XHR9KTtcblxuXHRcdFx0dm0uaW5zdGFuY2UuX3N1YnNjcmlwdGlvbi5hZGRPbnMgPSBhZGRPbnM7XG5cblx0XHRcdHJldHVybiB2bS5pbnN0YW5jZTtcblx0XHR9XG5cblx0XHRmdW5jdGlvbiBzZWxlY3RQbGFuKHBsYW4pIHtcblx0XHRcdHZtLmluc3RhbmNlLl9zdWJzY3JpcHRpb24ucGxhbklkID0gcGxhbi5wbGFuSWQ7XG5cdFx0XHR2bS5pbnN0YW5jZS5fc3Vic2NyaXB0aW9uLm51bUlkID0gcGxhbi5udW1JZDtcblx0XHR9XG5cblx0XHRmdW5jdGlvbiBpc1BsYW5BdmFpbGFibGUocGxhbikge1xuXHRcdFx0Y29uc29sZS5sb2coJ2lzUGxhbkF2YWlsYWJsZTogJywgcGxhbi5udW1JZCA+PSB2bS5pbnN0YW5jZS5fc3Vic2NyaXB0aW9uLm51bUlkKTtcblx0XHRcdGlmKHBsYW4ubnVtSWQgPj0gdm0uaW5zdGFuY2UuX3N1YnNjcmlwdGlvbi5udW1JZCkge1xuXHRcdFx0XHRyZXR1cm4gcGxhbjtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRmdW5jdGlvbiBzZWxlY3RTZXJ2ZXIoc2lkKSB7XG5cdFx0XHR2bS5pbnN0YW5jZS5zaWQgPSBzaWQ7XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gdG90YWxBbW91bnQoKSB7XG5cdFx0XHR2YXIgc3ViID0gdm0uaW5zdGFuY2UuX3N1YnNjcmlwdGlvbjtcblx0XHRcdHZtLnRvdGFsQW1vdW50ID0gc3ViLnF1YW50aXR5ICogcGFyc2VGbG9hdCh2bS5zZWxlY3RlZFBsYW4ucHJpY2UpO1xuXG5cdFx0XHRpZih2bS5zZWxlY3RlZFBsYW4uYWRkT25zICYmIE9iamVjdC5rZXlzKHZtLnNlbGVjdGVkUGxhbi5hZGRPbnMpLmxlbmd0aCkge1xuXHRcdFx0XHR2bS50b3RhbEFtb3VudCArPSB2bS5hZGRPbnMuc3RvcmFnZS5xdWFudGl0eSAqIHBhcnNlRmxvYXQodm0uc2VsZWN0ZWRQbGFuLmFkZE9ucy5zdG9yYWdlLnByaWNlKTtcblx0XHRcdFx0dm0udG90YWxBbW91bnQgKz0gdm0uYWRkT25zLmxpbmVzLnF1YW50aXR5ICogcGFyc2VGbG9hdCh2bS5zZWxlY3RlZFBsYW4uYWRkT25zLmxpbmVzLnByaWNlKTtcblx0XHRcdH1cblx0XHRcdHZtLnRvdGFsQW1vdW50ID0gdm0udG90YWxBbW91bnQudG9GaXhlZCgyKTtcblx0XHR9XG5cblx0XHRmdW5jdGlvbiB0b3RhbFN0b3JhZ2UoKSB7XG5cdFx0XHR2YXIgc3ViID0gdm0uaW5zdGFuY2UuX3N1YnNjcmlwdGlvbjtcblx0XHRcdGlmKHZtLnNlbGVjdGVkUGxhbi5jdXN0b21EYXRhKSB7XG5cdFx0XHRcdHZtLnRvdGFsU3RvcmFnZSA9IHN1Yi5xdWFudGl0eSAqIHBhcnNlRmxvYXQodm0uc2VsZWN0ZWRQbGFuLmN1c3RvbURhdGEuc3RvcmFnZXBlcnVzZXIpO1xuXHRcdFx0fVxuXHRcdFx0aWYodm0uYWRkT25zLnN0b3JhZ2UpIHtcblx0XHRcdFx0dm0udG90YWxTdG9yYWdlICs9IHBhcnNlSW50KHZtLmFkZE9ucy5zdG9yYWdlLnF1YW50aXR5LCAxMCk7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gdG90YWxMaW5lcygpIHtcblx0XHRcdHZhciBzdWIgPSB2bS5pbnN0YW5jZS5fc3Vic2NyaXB0aW9uO1xuXHRcdFx0dm0udG90YWxMaW5lcyA9IHN1Yi5xdWFudGl0eSAqIDI7XG5cdFx0XHRpZih2bS5hZGRPbnMubGluZXMpIHtcblx0XHRcdFx0dm0udG90YWxMaW5lcyArPSBwYXJzZUludCh2bS5hZGRPbnMubGluZXMucXVhbnRpdHksIDEwKTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRmdW5jdGlvbiBnZW5lcmF0ZVBhc3N3b3JkKG1pbiwgbWF4KSB7XG5cdFx0XHR2YXIgbmV3UGFzcyA9ICcnO1xuXHRcdFx0d2hpbGUoIXV0aWxzLmNoZWNrUGFzc3dvcmRTdHJlbmd0aChuZXdQYXNzKSkge1xuXHRcdFx0XHRuZXdQYXNzID0gdXRpbHMuZ2VuZXJhdGVQYXNzd29yZChtaW4sIG1heCk7XG5cdFx0XHR9XG5cdFx0XHR2bS5pbnN0YW5jZS5yZXN1bHQuYWRtaW5wYXNzID0gbmV3UGFzcztcblx0XHRcdHZtLmNvbmZpcm1QYXNzID0gbmV3UGFzcztcblx0XHR9XG5cblx0XHRmdW5jdGlvbiByZXZlYWxQYXNzd29yZCgpIHtcblx0XHRcdHZtLnBhc3NUeXBlID0gdm0ucGFzc1R5cGUgPT09ICd0ZXh0JyA/ICdwYXNzd29yZCcgOiAndGV4dCc7XG5cdFx0fVxuXG5cdH1cblxufSkoKTsiLCJhbmd1bGFyLm1vZHVsZSgnYXBwLmluc3RhbmNlJylcbi5jb25maWcoWyckcm91dGVQcm92aWRlcicsIGZ1bmN0aW9uKCRyb3V0ZVByb3ZpZGVyKXtcblxuXHQkcm91dGVQcm92aWRlclxuXHRcdC53aGVuKCcvaW5zdGFuY2UvOm9pZCcsIHtcblx0XHRcdHRlbXBsYXRlVXJsOiAnaW5zdGFuY2UvaW5zdGFuY2UuaHRtbCcsXG5cdFx0XHRjb250cm9sbGVyOiAnSW5zdGFuY2VDb250cm9sbGVyJyxcblx0XHRcdGNvbnRyb2xsZXJBczogJ2luc3RWbScsXG5cdFx0XHRyZXNvbHZlOiB7XG5cdFx0XHRcdGxvZ2dlZGluOiBpc0F1dGhvcml6ZWRcblx0XHRcdH1cblx0XHR9KTtcblxufV0pO1xuXG5pc0F1dGhvcml6ZWQuJGluamVjdCA9IFsnYXV0aFNlcnZpY2UnXTtcbmZ1bmN0aW9uIGlzQXV0aG9yaXplZChhdXRoU2VydmljZSkge1xuXHRyZXR1cm4gYXV0aFNlcnZpY2UuaXNBdXRob3JpemVkKCk7XG59IiwiKGZ1bmN0aW9uKCl7XG5cblx0J3VzZSBzdHJpY3QnO1xuXG5cdGFuZ3VsYXJcblx0XHQubW9kdWxlKCdhcHAuaW5zdGFuY2UnKVxuXHRcdC5kaXJlY3RpdmUoJ3BsYW5JdGVtJywgcGxhbkl0ZW0pO1xuXG5cdGZ1bmN0aW9uIHBsYW5JdGVtKCl7XG5cblx0XHRyZXR1cm4ge1xuXHRcdFx0cmVzdHJpY3Q6ICdBRScsXG5cdFx0XHR0cmFuc2NsdWRlOiB0cnVlLFxuXHRcdFx0c2NvcGU6IHtcblx0XHRcdFx0cGxhbjogJz0nLFxuXHRcdFx0XHRtb2RlbDogJz0nLFxuXHRcdFx0XHRzZWxlY3RQbGFuOiAnJicsXG5cdFx0XHRcdHNob3dQbGFuczogJyYnXG5cdFx0XHR9LFxuXHRcdFx0dGVtcGxhdGVVcmw6ICdpbnN0YW5jZS9wbGFuLmh0bWwnXG5cdFx0fTtcblxuXHR9XG5cbn0pKCk7IiwiKGZ1bmN0aW9uKCl7XG5cblx0J3VzZSBzdHJpY3QnO1xuXG5cdGFuZ3VsYXJcblx0XHQubW9kdWxlKCdhcHAuaW5zdGFuY2UnKVxuXHRcdC5kaXJlY3RpdmUoJ3NlcnZlckl0ZW0nLCBzZXJ2ZXJJdGVtKTtcblxuXHRmdW5jdGlvbiBzZXJ2ZXJJdGVtKCl7XG5cblx0XHRyZXR1cm4ge1xuXHRcdFx0cmVzdHJpY3Q6ICdBRScsXG5cdFx0XHR0cmFuc2NsdWRlOiB0cnVlLFxuXHRcdFx0c2NvcGU6IHtcblx0XHRcdFx0bW9kZWw6ICc9Jyxcblx0XHRcdFx0c2VydmVyOiAnPScsXG5cdFx0XHRcdG5ld0JyYW5jaDogJz0nLFxuXHRcdFx0XHRzZWxlY3RTZXJ2ZXI6ICcmJ1xuXHRcdFx0fSxcblx0XHRcdHRlbXBsYXRlVXJsOiAnaW5zdGFuY2Uvc2VydmVyLWl0ZW0uaHRtbCdcblx0XHR9O1xuXG5cdH1cblxufSkoKTsiLCIoZnVuY3Rpb24oKXtcblxuXHQndXNlIHN0cmljdCc7XG5cblx0YW5ndWxhclxuXHRcdC5tb2R1bGUoJ2FwcC5wYXltZW50Jylcblx0XHQuZGlyZWN0aXZlKCdtZXRob2RJdGVtJywgbWV0aG9kSXRlbSk7XG5cblx0ZnVuY3Rpb24gbWV0aG9kSXRlbSgpe1xuXG5cdFx0cmV0dXJuIHtcblx0XHRcdHJlc3RyaWN0OiAnQUUnLFxuXHRcdFx0dHJhbnNjbHVkZTogdHJ1ZSxcblx0XHRcdHNjb3BlOiB7XG5cdFx0XHRcdG1vZGVsOiAnPScsXG5cdFx0XHRcdG1ldGhvZDogJz0nLFxuXHRcdFx0XHR1bnNlbGVjdGFibGU6ICc9Jyxcblx0XHRcdFx0c2VsZWN0OiAnJidcblx0XHRcdH0sXG5cdFx0XHR0ZW1wbGF0ZVVybDogJ3BheW1lbnQvbWV0aG9kLWl0ZW0uaHRtbCdcblx0XHR9O1xuXG5cdH1cblxufSkoKTsiLCIoZnVuY3Rpb24oKXtcblxuXHQndXNlIHN0cmljdCc7XG5cblx0YW5ndWxhclxuXHRcdC5tb2R1bGUoJ2FwcC5wYXltZW50Jylcblx0XHQuY29udHJvbGxlcignUGF5bWVudENvbnRyb2xsZXInLCBQYXltZW50Q29udHJvbGxlcik7XG5cblx0UGF5bWVudENvbnRyb2xsZXIuJGluamVjdCA9IFsnJHEnLCAnJHNjb3BlJywgJyRodHRwJywgJyRyb290U2NvcGUnLCAnJGxvY2FsU3RvcmFnZScsICckbG9jYXRpb24nLCAnYXBpU2VydmljZScsICdicmFuY2hlc1NlcnZpY2UnLCAnY3VzdG9tZXJTZXJ2aWNlJywgJ2NhcnRTZXJ2aWNlJywgJ25vdGlmeVNlcnZpY2UnLCAnZXJyb3JTZXJ2aWNlJywgJ3NwaW5uZXJTZXJ2aWNlJ107XG5cblx0ZnVuY3Rpb24gUGF5bWVudENvbnRyb2xsZXIoJHEsICRzY29wZSwgJGh0dHAsICRyb290U2NvcGUsICRsb2NhbFN0b3JhZ2UsICRsb2NhdGlvbiwgYXBpLCBicmFuY2hlc1NlcnZpY2UsIGN1c3RvbWVyU2VydmljZSwgY2FydFNlcnZpY2UsIG5vdGlmeVNlcnZpY2UsIGVycm9yU2VydmljZSwgc3Bpbm5lclNlcnZpY2UpIHtcblxuXHRcdHZhciB2bSA9IHRoaXM7XG5cdFx0XG5cdFx0dm0uY3VzdG9tZXIgPSBjdXN0b21lclNlcnZpY2UuZ2V0Q3VzdG9tZXIoKTtcblx0XHRjb25zb2xlLmxvZygndm0uY3VzdG9tZXI6ICcsIHZtLmN1c3RvbWVyLCB2bS5jdXN0b21lci5iYWxhbmNlKTtcblxuXHRcdHZtLnJlcXVpcmVkQW1vdW50ID0gMjA7XG5cdFx0dm0uaXNFbm91Z2ggPSBmYWxzZTtcblx0XHR2bS5jYXJ0ID0gYW5ndWxhci5leHRlbmQoIFtdLCBjYXJ0U2VydmljZS5nZXRBbGwoKSApO1xuXHRcdHZtLnBheW1lbnRNZXRob2RzID0gW1xuXHRcdFx0e1xuXHRcdFx0XHRpZDogMSxcblx0XHRcdFx0aWNvbjogJ2ZhIGZhLWNyZWRpdC1jYXJkJyxcblx0XHRcdFx0bmFtZTogJ0NyZWRpdCBDYXJkJ1xuXHRcdFx0fSxcblx0XHRcdHtcblx0XHRcdFx0aWQ6IDIsXG5cdFx0XHRcdGljb246ICdmYSBmYS1wYXlwYWwnLFxuXHRcdFx0XHRuYW1lOiAnUGF5UGFsJyxcblx0XHRcdFx0Y29taW5nU29vbjogdHJ1ZVxuXHRcdFx0fSxcblx0XHRcdHtcblx0XHRcdFx0aWQ6IDMsXG5cdFx0XHRcdGljb246ICdmYSBmYS1iaXRjb2luJyxcblx0XHRcdFx0bmFtZTogJ0JpdGNvaW4nLFxuXHRcdFx0XHRjb21pbmdTb29uOiB0cnVlXG5cdFx0XHR9LFxuXHRcdFx0e1xuXHRcdFx0XHRpZDogMCxcblx0XHRcdFx0bmFtZTogJ1JpbmdvdGVsIEJhbGFuY2UnXG5cdFx0XHR9XG5cdFx0XTtcblx0XHR2bS5zZWxlY3RNZXRob2QgPSBzZWxlY3RNZXRob2Q7XG5cdFx0dm0ucHJvY2VlZFBheW1lbnQgPSBwcm9jZWVkUGF5bWVudDtcblx0XHR2bS5yZW1vdmVDYXJ0SXRlbSA9IHJlbW92ZUNhcnRJdGVtO1xuXHRcdHZtLmNhbmNlbCA9IGNhbmNlbDtcblx0XHRpZih2bS5jYXJ0Lmxlbmd0aCAmJiB2bS5jdXN0b21lci5iYWxhbmNlIDwgMCkgYWRkRGVidEFtb3V0KCk7XG5cdFx0dm0uYW1vdW50ID0gY291dEFtb3VudCh2bS5jYXJ0KTtcblx0XHR2bS5wYXltZW50TWV0aG9kID0gdm0uYW1vdW50ID4gMCA/IDEgOiAwO1xuXHRcdHZtLmlzVW5zZWxlY3RhYmxlTWV0aG9kID0gaXNVbnNlbGVjdGFibGVNZXRob2Q7XG5cblxuXHRcdCRyb290U2NvcGUuJG9uKCdjdXN0b21lci51cGRhdGUnLCBmdW5jdGlvbihldmVudCwgY3VzdG9tZXIpIHtcblx0XHRcdHZtLmN1c3RvbWVyID0gY3VzdG9tZXI7XG5cdFx0XHRpc0Vub3VnaCgpO1xuXHRcdH0pO1xuXG5cdFx0JHNjb3BlLiR3YXRjaChmdW5jdGlvbigpe1xuXHRcdFx0cmV0dXJuIHZtLmNhcnQubGVuZ3RoO1xuXHRcdH0sIGZ1bmN0aW9uKHZhbCl7XG5cdFx0XHR2YXIgcmVxQW1vdW50ID0gY291dEFtb3VudCh2bS5jYXJ0KTtcblx0XHRcdHZtLmFtb3VudCA9IHJlcUFtb3VudDtcblx0XHRcdGlmKHZhbCkgdm0ucmVxdWlyZWRBbW91bnQgPSByZXFBbW91bnQ7XG5cdFx0fSk7XG5cblx0XHQkc2NvcGUuJHdhdGNoKGZ1bmN0aW9uKCl7XG5cdFx0XHRyZXR1cm4gdm0uYW1vdW50O1xuXHRcdH0sIGZ1bmN0aW9uKHZhbCl7XG5cdFx0XHR2bS5hbW91bnQgPSB2YWw7XG5cdFx0XHRpc0Vub3VnaCgpO1xuXHRcdFx0Ly8gcmVxdWlyZWRBbW91bnQgPSB2YWw7XG5cdFx0XHQvLyBpZih2bS5jdXN0b21lci5iYWxhbmNlIDwgcmVxdWlyZWRBbW91bnQgfHwgKCF2YWwgJiYgIXZtLmNhcnQubGVuZ3RoKSkgdm0uaXNFbm91Z2ggPSBmYWxzZTtcblx0XHRcdC8vIGVsc2Ugdm0uaXNFbm91Z2ggPSB0cnVlO1xuXHRcdH0pO1xuXG5cdFx0ZnVuY3Rpb24gaXNFbm91Z2goKSB7XG5cdFx0XHRpZigoIXZtLmFtb3VudCAmJiAhdm0uY2FydC5sZW5ndGgpIHx8IHZtLmFtb3VudCA8IHZtLnJlcXVpcmVkQW1vdW50KSB2bS5pc0Vub3VnaCA9IGZhbHNlO1xuXHRcdFx0ZWxzZSB2bS5pc0Vub3VnaCA9IHRydWU7XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gaXNVbnNlbGVjdGFibGVNZXRob2QobWV0aG9kT2JqKSB7XG5cdFx0XHRyZXR1cm4gKG1ldGhvZE9iai5pZCA9PT0gMCAmJiAodm0uY3VzdG9tZXIuYmFsYW5jZSA8IHZtLmFtb3VudCB8fCAhdm0uY2FydC5sZW5ndGgpIHx8IG1ldGhvZE9iai5pZCAhPT0gMCAmJiAhdm0uYW1vdW50KTtcblx0XHR9XG5cblx0XHRmdW5jdGlvbiBwcm9jZWVkUGF5bWVudCgpIHtcblxuXHRcdFx0aWYodm0ucGF5bWVudE1ldGhvZCA9PT0gdW5kZWZpbmVkKVxuXHRcdFx0XHRyZXR1cm4gZXJyb3JTZXJ2aWNlLnNob3coJ0NIT09TRV9QQVlNRU5UX01FVEhPRCcpO1xuXHRcdFx0aWYodm0uYW1vdW50ID09PSB1bmRlZmluZWQgfHwgdm0uYW1vdW50ID09PSBudWxsIHx8IHZtLmFtb3VudCA8IDApXG5cdFx0XHRcdHJldHVybiBlcnJvclNlcnZpY2Uuc2hvdygnQU1PVU5UX05PVF9TRVQnKTtcblxuXHRcdFx0Ly8gc3Bpbm5lclNlcnZpY2Uuc2hvdygnbWFpbi1zcGlubmVyJyk7XG5cblx0XHRcdHZhciBvcmRlciA9IHZtLmNhcnQubGVuZ3RoID8gdm0uY2FydCA6IHtcblx0XHRcdFx0YWN0aW9uOiAnYWRkQ3JlZGl0cycsXG5cdFx0XHRcdGRlc2NyaXB0aW9uOiAnUmluZ290ZWwgU2VydmljZSBQYXltZW50Jyxcblx0XHRcdFx0YW1vdW50OiB2bS5hbW91bnRcblx0XHRcdH07XG5cblx0XHRcdHZhciByZXF1ZXN0UGFyYW1zID0ge1xuXHRcdFx0XHR1cmw6ICdjaGVja291dCcsXG5cdFx0XHRcdHBhcmFtczoge1xuXHRcdFx0XHRcdHBheW1lbnRNZXRob2Q6IHZtLnBheW1lbnRNZXRob2QsXG5cdFx0XHRcdFx0YW1vdW50OiB2bS5hbW91bnQsXG5cdFx0XHRcdFx0b3JkZXI6IG9yZGVyXG5cdFx0XHRcdH1cblx0XHRcdH07XG5cblx0XHRcdGFwaS5yZXF1ZXN0KHJlcXVlc3RQYXJhbXMpLnRoZW4oZnVuY3Rpb24ocmVzKXtcblx0XHRcdFx0aWYocmVzLmRhdGEucmVkaXJlY3QpIHtcblx0XHRcdFx0XHR3aW5kb3cubG9jYXRpb24uaHJlZiA9IHJlcy5kYXRhLnJlZGlyZWN0O1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdGlmKHJlcy5kYXRhLnN1Y2Nlc3MpIHtcblx0XHRcdFx0XHRcdG5vdGlmeVNlcnZpY2Uuc2hvdygnQUxMX0NIQU5HRVNfU0FWRUQnKTtcblxuXHRcdFx0XHRcdFx0Ly8gdXBkYXRlIGNhY2hlXG5cdFx0XHRcdFx0XHR2bS5jYXJ0LmZvckVhY2goZnVuY3Rpb24oaXRlbSl7XG5cdFx0XHRcdFx0XHRcdGlmKGl0ZW0uYWN0aW9uID09PSAnY3JlYXRlU3Vic2NyaXB0aW9uJykge1xuXHRcdFx0XHRcdFx0XHRcdGJyYW5jaGVzU2VydmljZS5zZXQoW10pO1xuXHRcdFx0XHRcdFx0XHR9IGVsc2UgaWYoaXRlbS5hY3Rpb24gPT09ICd1cGRhdGVTdWJzY3JpcHRpb24nKSB7XG5cdFx0XHRcdFx0XHRcdFx0YnJhbmNoZXNTZXJ2aWNlLnVwZGF0ZShpdGVtLmRhdGEub2lkLCBpdGVtLmRhdGEpO1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9KTtcblxuXHRcdFx0XHRcdFx0JGxvY2F0aW9uLnBhdGgoJy9kYXNoYm9hcmQnKTsgLy9UT0RPXG5cblx0XHRcdFx0XHRcdGNhcnRTZXJ2aWNlLmNsZWFyKCk7XG5cblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0ZXJyb3JTZXJ2aWNlLnNob3cocmVzLmRhdGEubWVzc2FnZSk7XG5cdFx0XHRcdFx0fVx0XHRcdFx0XHRcblx0XHRcdFx0fVxuXHRcdFx0XHQvLyBzcGlubmVyU2VydmljZS5oaWRlKCdtYWluLXNwaW5uZXInKTtcblx0XHRcdH0sIGZ1bmN0aW9uKGVycil7XG5cdFx0XHRcdGVycm9yU2VydmljZS5zaG93KGVycik7XG5cdFx0XHRcdC8vIHNwaW5uZXJTZXJ2aWNlLmhpZGUoJ21haW4tc3Bpbm5lcicpO1xuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gc2VsZWN0TWV0aG9kKG1ldGhvZCkge1xuXHRcdFx0dm0ucGF5bWVudE1ldGhvZCA9IG1ldGhvZDtcblx0XHR9XG5cblx0XHRmdW5jdGlvbiBjb3V0QW1vdW50KGFycmF5KSB7XG5cdFx0XHQvL1RPRE8gLSBjb3VudCBtaW4gYW1vdW50IGJhc2VkIG9uIHRoZSBjdXJyZW5jeVxuXHRcdFx0dmFyIGFtb3VudCA9IGFycmF5Lmxlbmd0aCA/IDAgOiB2bS5yZXF1aXJlZEFtb3VudDtcblx0XHRcdGFycmF5LmZvckVhY2goZnVuY3Rpb24gKGl0ZW0pe1xuXHRcdFx0XHRhbW91bnQgKz0gcGFyc2VGbG9hdChpdGVtLmFtb3VudCk7XG5cdFx0XHR9KTtcblx0XHRcdHJldHVybiBhbW91bnQ7XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gYWRkRGVidEFtb3V0KCkge1xuXHRcdFx0dm0uY2FydC5wdXNoKHtcblx0XHRcdFx0ZWRpdDogZmFsc2UsXG5cdFx0XHRcdHJlbW92ZTogZmFsc2UsXG5cdFx0XHRcdGFjdGlvbjogJ2FkZENyZWRpdHMnLFxuXHRcdFx0XHRkZXNjcmlwdGlvbjogJ1JpbmdvdGVsIFNlcnZpY2UgUGF5bWVudCcsXG5cdFx0XHRcdGFtb3VudDogKHZtLmN1c3RvbWVyLmJhbGFuY2UgKiAtMSlcblx0XHRcdH0pO1xuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIHJlbW92ZUNhcnRJdGVtKGluZGV4KSB7XG5cdFx0XHR2bS5jYXJ0LnNwbGljZShpbmRleCwgMSlcblx0XHRcdGNhcnRTZXJ2aWNlLnJlbW92ZShpbmRleCk7XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gY2FuY2VsKCkge1xuXHRcdFx0JGxvY2F0aW9uLnBhdGgoJy9kYXNoYm9hcmQnKTtcblx0XHR9XG5cblx0fVxuXG59KSgpOyIsImFuZ3VsYXIubW9kdWxlKCdhcHAucGF5bWVudCcpXG4uY29uZmlnKFsnJHJvdXRlUHJvdmlkZXInLCBmdW5jdGlvbigkcm91dGVQcm92aWRlcil7XG5cblx0JHJvdXRlUHJvdmlkZXJcblx0XHQud2hlbignL3BheW1lbnQnLCB7XG5cdFx0XHR0ZW1wbGF0ZVVybDogJ3BheW1lbnQvcGF5bWVudC5odG1sJyxcblx0XHRcdGNvbnRyb2xsZXI6ICdQYXltZW50Q29udHJvbGxlcicsXG5cdFx0XHRjb250cm9sbGVyQXM6ICdwYXlWbScsXG5cdFx0XHRyZXNvbHZlOiB7XG5cdFx0XHRcdGxvZ2dlZGluOiBpc0F1dGhvcml6ZWRcblx0XHRcdH1cblx0XHR9KTtcblxufV0pO1xuXG5pc0F1dGhvcml6ZWQuJGluamVjdCA9IFsnYXV0aFNlcnZpY2UnXTtcbmZ1bmN0aW9uIGlzQXV0aG9yaXplZChhdXRoU2VydmljZSkge1xuXHRyZXR1cm4gYXV0aFNlcnZpY2UuaXNBdXRob3JpemVkKCk7XG59IiwiYW5ndWxhclxuLm1vZHVsZSgnYXBwJylcbi5maWx0ZXIoJ2NvbnZlcnRCeXRlcycsIGZ1bmN0aW9uKCkge1xuICByZXR1cm4gZnVuY3Rpb24oaW50ZWdlciwgZnJvbVVuaXRzLCB0b1VuaXRzKSB7XG4gICAgdmFyIGNvZWZmaWNpZW50cyA9IHtcbiAgICAgICAgJ0J5dGUnOiAxLFxuICAgICAgICAnS0InOiAxMDAwLFxuICAgICAgICAnTUInOiAxMDAwMDAwLFxuICAgICAgICAnR0InOiAxMDAwMDAwMDAwXG4gICAgfTtcbiAgICByZXR1cm4gaW50ZWdlciAqIGNvZWZmaWNpZW50c1tmcm9tVW5pdHNdIC8gY29lZmZpY2llbnRzW3RvVW5pdHNdO1xuICB9O1xufSk7IiwiKGZ1bmN0aW9uKCl7XG5cblx0J3VzZSBzdHJpY3QnO1xuXG5cdGFuZ3VsYXJcblx0XHQubW9kdWxlKCdhcHAucHJvZmlsZScpXG5cdFx0LmNvbnRyb2xsZXIoJ1Byb2ZpbGVDb250cm9sbGVyJywgUHJvZmlsZUNvbnRyb2xsZXIpO1xuXG5cdFByb2ZpbGVDb250cm9sbGVyLiRpbmplY3QgPSBbJ2FwaVNlcnZpY2UnLCAnY3VzdG9tZXJTZXJ2aWNlJywgJ25vdGlmeVNlcnZpY2UnLCAnZXJyb3JTZXJ2aWNlJ107XG5cblx0ZnVuY3Rpb24gUHJvZmlsZUNvbnRyb2xsZXIoYXBpLCBjdXN0b21lclNlcnZpY2UsIG5vdGlmeVNlcnZpY2UsIGVycm9yU2VydmljZSkge1xuXG5cdFx0dmFyIHZtID0gdGhpcztcblx0XHR2bS5wcm9maWxlID0gY3VzdG9tZXJTZXJ2aWNlLmdldEN1c3RvbWVyKCk7XG5cdFx0dm0uc2F2ZVByb2ZpbGUgPSBzYXZlUHJvZmlsZTtcblx0XHR2bS5jb25maXJtUGFzcyA9ICcnO1xuXG5cdFx0Y29uc29sZS5sb2coJ3Byb2ZpbGU6ICcsIHZtLnByb2ZpbGUpO1xuXG5cdFx0ZnVuY3Rpb24gc2F2ZVByb2ZpbGUoKSB7XG5cdFx0XHRcblx0XHRcdHZhciBwYXJhbXMgPSB7fTtcblxuXHRcdFx0aWYoIXZtLnByb2ZpbGUuZW1haWwgfHwgIXZtLnByb2ZpbGUubmFtZSl7XG5cdFx0XHRcdHJldHVybiBlcnJvclNlcnZpY2Uuc2hvdygnTUlTU0lOR19GSUVMRFMnKTtcblx0XHRcdH1cblx0XHRcdGlmKHZtLnByb2ZpbGUucGFzc3dvcmQgJiYgdm0uY29uZmlybVBhc3MgIT09IHZtLnByb2ZpbGUucGFzc3dvcmQpe1xuXHRcdFx0XHRyZXR1cm4gZXJyb3JTZXJ2aWNlLnNob3coJ1BBU1NXT1JEX05PVF9DT05GSVJNRUQnKTtcblx0XHRcdH1cblxuXHRcdFx0aWYodm0ucHJvZmlsZS5uYW1lKSBwYXJhbXMubmFtZSA9IHZtLnByb2ZpbGUubmFtZTtcblx0XHRcdGlmKHZtLnByb2ZpbGUuZW1haWwpIHBhcmFtcy5lbWFpbCA9IHZtLnByb2ZpbGUuZW1haWw7XG5cdFx0XHRpZih2bS5wcm9maWxlLnBhc3N3b3JkKSBwYXJhbXMucGFzc3dvcmQgPSB2bS5wcm9maWxlLnBhc3N3b3JkO1xuXG5cdFx0XHRhcGkucmVxdWVzdCh7XG5cdFx0XHRcdHVybDogXCJ1cGRhdGUvXCIrdm0ucHJvZmlsZS5faWQsXG5cdFx0XHRcdHBhcmFtczogcGFyYW1zXG5cdFx0XHR9KS50aGVuKGZ1bmN0aW9uKHJlcyl7XG5cdFx0XHRcdGlmKCFyZXMuZGF0YS5zdWNjZXNzKSByZXR1cm4gZXJyb3JTZXJ2aWNlLnNob3cocmVzLmRhdGEubWVzc2FnZSk7XG5cblx0XHRcdFx0bm90aWZ5U2VydmljZS5zaG93KCdBTExfQ0hBTkdFU19TQVZFRCcpO1xuXHRcdFx0XHRjdXN0b21lclNlcnZpY2Uuc2V0Q3VzdG9tZXIocmVzLmRhdGEucmVzdWx0KTtcblx0XHRcdFx0Y29uc29sZS5sb2coJ2N1cnJlbnRVc2VyOiAnLCByZXMuZGF0YS5yZXN1bHQpO1xuXHRcdFx0fSwgZnVuY3Rpb24oZXJyKXtcblx0XHRcdFx0ZXJyb3JTZXJ2aWNlLnNob3coZXJyKTtcblx0XHRcdH0pO1xuXHRcdH1cblxuXHR9XG5cbn0pKCk7IiwiYW5ndWxhci5tb2R1bGUoJ2FwcC5wcm9maWxlJylcbi5jb25maWcoWyckcm91dGVQcm92aWRlcicsIGZ1bmN0aW9uKCRyb3V0ZVByb3ZpZGVyKXtcblxuXHQkcm91dGVQcm92aWRlclxuXHRcdC53aGVuKCcvcHJvZmlsZScsIHtcblx0XHRcdHRlbXBsYXRlVXJsOiAncHJvZmlsZS9wcm9maWxlLmh0bWwnLFxuXHRcdFx0Y29udHJvbGxlcjogJ1Byb2ZpbGVDb250cm9sbGVyJyxcblx0XHRcdGNvbnRyb2xsZXJBczogJ3Byb2ZpbGVWbScsXG5cdFx0XHRyZXNvbHZlOiB7XG5cdFx0XHRcdGxvZ2dlZGluOiBpc0F1dGhvcml6ZWRcblx0XHRcdH1cblx0XHR9KTtcblxufV0pO1xuXG5pc0F1dGhvcml6ZWQuJGluamVjdCA9IFsnYXV0aFNlcnZpY2UnXTtcbmZ1bmN0aW9uIGlzQXV0aG9yaXplZChhdXRoU2VydmljZSkge1xuXHRyZXR1cm4gYXV0aFNlcnZpY2UuaXNBdXRob3JpemVkKCk7XG59IiwiKGZ1bmN0aW9uKCl7XG5cblx0J3VzZSBzdHJpY3QnO1xuXG5cdGFuZ3VsYXJcblx0XHQubW9kdWxlKCdhcHAuY29yZScpXG5cdFx0LmZhY3RvcnkoJ2FwaVNlcnZpY2UnLCBhcGlTZXJ2aWNlKTtcblxuXHRhcGlTZXJ2aWNlLiRpbmplY3QgPSBbJyRodHRwJywgJ2FwcENvbmZpZyddO1xuXG5cdGZ1bmN0aW9uIGFwaVNlcnZpY2UoJGh0dHAsIGFwcENvbmZpZyl7XG5cblx0XHR2YXIgYmFzZVVybCA9IGFwcENvbmZpZy5zZXJ2ZXIgKyAnL2FwaSc7XG5cdFx0cmV0dXJuIHtcblx0XHRcdHJlcXVlc3Q6IGZ1bmN0aW9uKHBhcmFtcyl7XG5cdFx0XHRcdHJldHVybiAkaHR0cC5wb3N0KGJhc2VVcmwrJy8nK3BhcmFtcy51cmwsIChwYXJhbXMucGFyYW1zIHx8IHt9KSk7XG5cdFx0XHR9XG5cdFx0fTtcblxuXHR9XG5cbn0pKCk7IiwiKGZ1bmN0aW9uKCl7XG5cblx0J3VzZSBzdHJpY3QnO1xuXG5cdGFuZ3VsYXJcblx0XHQubW9kdWxlKCdhcHAnKVxuXHRcdC5mYWN0b3J5KCdhdXRoU2VydmljZScsIGF1dGhTZXJ2aWNlKTtcblxuXHRhdXRoU2VydmljZS4kaW5qZWN0ID0gWyckcScsICckdGltZW91dCcsICckbG9jYXRpb24nLCAnJHJvb3RTY29wZScsICckaHR0cCcsICckbG9jYWxTdG9yYWdlJywgJ2FwcENvbmZpZycsICdjdXN0b21lclNlcnZpY2UnXTtcblxuXHRmdW5jdGlvbiBhdXRoU2VydmljZSgkcSwgJHRpbWVvdXQsICRsb2NhdGlvbiwgJHJvb3RTY29wZSwgJGh0dHAsICRsb2NhbFN0b3JhZ2UsIGFwcENvbmZpZywgY3VzdG9tZXJTZXJ2aWNlKXtcblxuXHRcdHZhciBiYXNlVXJsID0gYXBwQ29uZmlnLnNlcnZlcjtcblx0XHR2YXIgaW5pdCA9IGZhbHNlO1xuXG5cdFx0cmV0dXJuIHtcblx0XHRcdHNpZ251cDogc2lnbnVwLFxuXHRcdFx0bG9naW46IGxvZ2luLFxuXHRcdFx0cmVxdWVzdFBhc3N3b3JkUmVzZXQ6IHJlcXVlc3RQYXNzd29yZFJlc2V0LFxuXHRcdFx0cmVzZXRQYXNzd29yZDogcmVzZXRQYXNzd29yZCxcblx0XHRcdGlzTG9nZ2VkSW46IGlzTG9nZ2VkSW4sXG5cdFx0XHRsb2dvdXQ6IGxvZ291dCxcblx0XHRcdGlzQXV0aG9yaXplZDogaXNBdXRob3JpemVkXG5cdFx0fTtcblxuXHRcdGZ1bmN0aW9uIHNpZ251cChkYXRhKSB7XG5cdFx0XHRyZXR1cm4gJGh0dHAucG9zdChiYXNlVXJsICsgJy9hcGkvc2lnbnVwJywgZGF0YSk7XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gbG9naW4oZGF0YSkge1xuXHRcdFx0cmV0dXJuICRodHRwLnBvc3QoYmFzZVVybCArICcvYXBpL2xvZ2luJywgZGF0YSk7XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gcmVxdWVzdFBhc3N3b3JkUmVzZXQoZGF0YSkge1xuXHRcdFx0cmV0dXJuICAkaHR0cC5wb3N0KGJhc2VVcmwgKyAnL2FwaS9yZXF1ZXN0UGFzc3dvcmRSZXNldCcsIGRhdGEpO1xuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIHJlc2V0UGFzc3dvcmQoZGF0YSkge1xuXHRcdFx0cmV0dXJuICRodHRwLnBvc3QoYmFzZVVybCArICcvYXBpL3Jlc2V0UGFzc3dvcmQnLCBkYXRhKTtcblx0XHR9XG5cblx0XHRmdW5jdGlvbiBsb2dvdXQoKSB7XG5cdFx0XHRkZWxldGUgJGxvY2FsU3RvcmFnZS50b2tlbjtcblxuXHRcdFx0Ly8gQ2xlYXIgYXV0aG9yaXplZCBjdXN0b21lciBkYXRhXG5cdFx0XHRjdXN0b21lclNlcnZpY2UuY2xlYXJDdXJyZW50Q3VzdG9tZXIoKTtcblxuXHRcdFx0Ly8gRW1pdCBldmVudCB3aGVuIGN1c3RvbWVyIGxvZ2dlZCBvdXQgdG8gdGhlIGNvbnNvbGVcblx0XHRcdCRyb290U2NvcGUuJGVtaXQoJ2F1dGgubG9nb3V0Jyk7XG5cblx0XHRcdGluaXQgPSBmYWxzZTtcblxuXHRcdFx0JGxvY2F0aW9uLnBhdGgoJy9sb2dpbicpO1xuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIGlzTG9nZ2VkSW4oKXtcblx0XHRcdHJldHVybiBpbml0O1xuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIGxvZ2dlZEluKGRhdGEpIHtcblx0XHRcdGNvbnNvbGUubG9nKCdsb2dnZWRJbjogJywgZGF0YSk7XG5cdFx0XHQvLyBTZXQgYXV0aG9yaXplZCBjdXN0b21lciBkYXRhXG5cdFx0XHRpZihkYXRhLmN1c3RvbWVyKSB7XG5cdFx0XHRcdGN1c3RvbWVyU2VydmljZS5zZXRDdXN0b21lcihkYXRhLmN1c3RvbWVyKTtcblx0XG5cdFx0XHRcdC8vIEVtaXQgZXZlbnQgd2hlbiBjdXN0b21lciBkYXRhIHVwZGF0ZWRcblx0XHRcdFx0JHJvb3RTY29wZS4kZW1pdCgnY3VzdG9tZXIudXBkYXRlJywgZGF0YS5jdXN0b21lcik7XG5cdFx0XHR9XG5cblxuXHRcdFx0aWYoIWluaXQpIHtcblx0XHRcdFx0Ly8gRW1pdCBldmVudCB3aGVuIGN1c3RvbWVyIGxvZ2dlZCBpbiB0byB0aGUgY29uc29sZVxuXHRcdFx0XHQkcm9vdFNjb3BlLiRlbWl0KCdhdXRoLmxvZ2luJyk7XG5cdFx0XHRcdGluaXQgPSB0cnVlO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIGlzQXV0aG9yaXplZCgpIHtcblx0XHRcdGlmKGN1c3RvbWVyU2VydmljZS5nZXRDdXN0b21lcigpKSByZXR1cm47XG5cblx0XHRcdHZhciBkZWZlcnJlZCA9ICRxLmRlZmVyKCk7IC8vIE1ha2UgYW4gQUpBWCBjYWxsIHRvIGNoZWNrIGlmIHRoZSB1c2VyIGlzIGxvZ2dlZCBpbiBcblx0XHRcdCRodHRwLmdldCgnL2FwaS9sb2dnZWRpbicpLnRoZW4oZnVuY3Rpb24ocmVzKXtcblx0XHRcdFx0bG9nZ2VkSW4ocmVzLmRhdGEpO1xuXHRcdFx0XHRkZWZlcnJlZC5yZXNvbHZlKCk7XG5cdFx0XHR9LCBmdW5jdGlvbiAoZXJyKXtcblx0XHRcdFx0ZGVmZXJyZWQucmVqZWN0KCk7XG5cdFx0XHRcdGxvZ291dCgpO1xuXHRcdFx0XHQvLyAkbG9jYXRpb24ucGF0aCgnL2xvZ2luJyk7XG5cdFx0XHR9KTtcblx0XHRcdHJldHVybiBkZWZlcnJlZC5wcm9taXNlO1xuXHRcdH1cblxuXHR9XG5cbn0pKCk7IiwiKGZ1bmN0aW9uKCl7XG5cblx0J3VzZSBzdHJpY3QnO1xuXG5cdGFuZ3VsYXJcblx0XHQubW9kdWxlKCdhcHAuY29yZScpXG5cdFx0LmZhY3RvcnkoJ2JyYW5jaGVzU2VydmljZScsIGJyYW5jaGVzU2VydmljZSk7XG5cblx0YnJhbmNoZXNTZXJ2aWNlLiRpbmplY3QgPSBbJ3Bvb2xTaXplU2VydmljZXMnLCAnYXBpU2VydmljZSddO1xuXG5cdGZ1bmN0aW9uIGJyYW5jaGVzU2VydmljZShwb29sU2l6ZVNlcnZpY2VzLCBhcGkpe1xuXG5cdFx0dmFyIGJyYW5jaGVzID0gW107XG5cdFx0dmFyIHBsYW5zID0gW107XG5cdFx0dmFyIHNlcnZlcnMgPSBbXTtcblxuXHRcdHJldHVybiB7XG5cdFx0XHRhZGQ6IGFkZCxcblx0XHRcdHNldDogc2V0LFxuXHRcdFx0dXBkYXRlOiB1cGRhdGUsXG5cdFx0XHRnZXQ6IGdldCxcblx0XHRcdGdldEFsbDogZ2V0QWxsLFxuXHRcdFx0Z2V0QWxsQWRkb25zOiBnZXRBbGxBZGRvbnMsXG5cdFx0XHRyZW1vdmU6IHJlbW92ZSxcblx0XHRcdHNldFBsYW5zOiBzZXRQbGFucyxcblx0XHRcdHNldFNlcnZlcnM6IHNldFNlcnZlcnMsXG5cdFx0XHRnZXRQbGFuczogZ2V0UGxhbnMsXG5cdFx0XHRnZXRTZXJ2ZXJzOiBnZXRTZXJ2ZXJzLFxuXHRcdFx0Y2xlYXI6IGNsZWFyLFxuXHRcdFx0aXNQcmVmaXhWYWxpZDogaXNQcmVmaXhWYWxpZCxcblx0XHRcdGlzUHJlZml4VW5pcXVlOiBpc1ByZWZpeFVuaXF1ZSxcblx0XHRcdGdldFN1YnNjcmlwdGlvbkFtb3VudDogZ2V0U3Vic2NyaXB0aW9uQW1vdW50XG5cdFx0fTtcblxuXHRcdGZ1bmN0aW9uIGFkZChpdGVtKSB7XG5cdFx0XHRpZihhbmd1bGFyLmlzQXJyYXkoaXRlbSkpIHtcblx0XHRcdFx0YW5ndWxhci5jb3B5KGl0ZW0sIGJyYW5jaGVzKTtcblx0XHRcdFx0Ly8gYnJhbmNoZXMgPSBicmFuY2hlcy5jb25jYXQoaXRlbSk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRkZWxldGUgaXRlbS5hZG1pbnBhc3M7XG5cdFx0XHRcdGJyYW5jaGVzLnB1c2goaXRlbSk7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gc2V0KGFycmF5KSB7XG5cdFx0XHRpZihBcnJheS5pc0FycmF5KGFycmF5KSkgYnJhbmNoZXMgPSBhcnJheTtcblx0XHR9XG5cblx0XHRmdW5jdGlvbiB1cGRhdGUob2lkLCBkYXRhKXtcblx0XHRcdGNvbnNvbGUubG9nKCd1cGRhdGUgYnJhbmNoOiAnLCBvaWQsIGRhdGEpO1xuXHRcdFx0aWYoIW9pZCkgcmV0dXJuO1xuXHRcdFx0YnJhbmNoZXMuZm9yRWFjaChmdW5jdGlvbihpdGVtLCBpbmRleCwgYXJyYXkpe1xuXHRcdFx0XHRpZihpdGVtLm9pZCA9PT0gb2lkKSB7XG5cdFx0XHRcdFx0ZGVsZXRlIGl0ZW0uYWRtaW5wYXNzO1xuXHRcdFx0XHRcdGFuZ3VsYXIubWVyZ2UoaXRlbSwgZGF0YSk7XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIGdldChvaWQsIGNiKSB7XG5cdFx0XHR2YXIgZm91bmQgPSBudWxsO1xuXHRcdFx0YnJhbmNoZXMuZm9yRWFjaChmdW5jdGlvbiAoYnJhbmNoKXtcblx0XHRcdFx0aWYoYnJhbmNoLm9pZCA9PT0gb2lkKXtcblx0XHRcdFx0XHRmb3VuZCA9IGJyYW5jaDtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0XHRpZihjYikgY2IoZm91bmQpO1xuXHRcdFx0ZWxzZSByZXR1cm4gZm91bmQ7XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gZ2V0QWxsKCkge1xuXHRcdFx0cmV0dXJuIGJyYW5jaGVzO1xuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIGdldEFsbEFkZG9ucyhwYXJhbXMpIHtcblx0XHRcdHZhciBhZGRPbnMgPSBbXTtcblx0XHRcdGlmKHBhcmFtcy5leHRlbnNpb25zICE9PSB1bmRlZmluZWQpe1xuXHRcdFx0XHR2YXIgcG9vbHNpemUgPSBwb29sU2l6ZVNlcnZpY2VzLmdldFBvb2xTaXplKHBhcmFtcy5leHRlbnNpb25zKTtcblx0XHRcdFx0YWRkT25zLnB1c2goe1xuXHRcdFx0XHRcdG5hbWU6IFwiVXNlclwiLFxuXHRcdFx0XHRcdHF1YW50aXR5OiBwb29sc2l6ZVxuXHRcdFx0XHR9KTtcblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIGFkZE9ucztcblx0XHR9XG5cblx0XHRmdW5jdGlvbiByZW1vdmUob2lkKSB7XG5cdFx0XHRicmFuY2hlcy5mb3JFYWNoKGZ1bmN0aW9uKGl0ZW0sIGluZGV4LCBhcnJheSl7XG5cdFx0XHRcdGlmKGl0ZW0ub2lkICYmIGl0ZW0ub2lkID09PSBvaWQpIHtcblx0XHRcdFx0XHRhcnJheS5zcGxpY2UoaW5kZXgsIDEpO1xuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblx0XHR9XG5cblx0XHRmdW5jdGlvbiBzZXRQbGFucyhhcnJheSl7XG5cdFx0XHRwbGFucyA9IGFycmF5O1xuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIGdldFBsYW5zKCl7XG5cdFx0XHRyZXR1cm4gcGxhbnM7XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gc2V0U2VydmVycyhhcnJheSl7XG5cdFx0XHRzZXJ2ZXJzID0gYXJyYXk7XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gZ2V0U2VydmVycygpe1xuXHRcdFx0cmV0dXJuIHNlcnZlcnM7XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gY2xlYXIoKSB7XG5cdFx0XHRicmFuY2hlcyA9IFtdO1xuXHRcdFx0cGxhbnMgPSBbXTtcblx0XHRcdHNlcnZlcnMgPSBbXTtcblx0XHR9XG5cblx0XHRmdW5jdGlvbiBpc1ByZWZpeFZhbGlkKHByZWZpeCkge1xuXHRcdFx0XG5cdFx0XHR2YXIgcmVnZXggPSAvXlthLXpBLVowLTldW2EtekEtWjAtOS1dezEsNjJ9W2EtekEtWjAtOV0kL2c7XG5cdFx0XHRyZXR1cm4gcHJlZml4Lm1hdGNoKHJlZ2V4KTtcblxuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIGlzUHJlZml4VW5pcXVlKHByZWZpeCkge1xuXHRcdFx0cmV0dXJuIGFwaS5yZXF1ZXN0KHtcblx0XHRcdCAgICB1cmw6ICdpc1ByZWZpeFZhbGlkJyxcblx0XHRcdCAgICBwYXJhbXM6IHtcblx0XHRcdCAgICAgICAgcHJlZml4OiBwcmVmaXhcblx0XHRcdCAgICB9XG5cdFx0XHR9KTtcblx0XHR9XG5cblx0XHRmdW5jdGlvbiBnZXRTdWJzY3JpcHRpb25BbW91bnQocGFyYW1zLCBjYikge1xuXG5cdFx0XHRhcGkucmVxdWVzdCh7XG5cdFx0XHRcdHVybDogJy9nZXRTdWJzY3JpcHRpb25BbW91bnQnLFxuXHRcdFx0XHRwYXJhbXM6IHBhcmFtc1xuXHRcdFx0fSkudGhlbihmdW5jdGlvbihyZXN1bHQpe1xuXHRcdFx0XHRjYihudWxsLCByZXN1bHQuZGF0YSk7XG5cdFx0XHR9LCBmdW5jdGlvbihlcnIpe1xuXHRcdFx0XHRjYihlcnIpO1xuXHRcdFx0fSk7XG5cblx0XHR9XG5cblx0fVxuXG59KSgpOyIsIihmdW5jdGlvbigpe1xuXG5cdCd1c2Ugc3RyaWN0JztcblxuXHRhbmd1bGFyXG5cdFx0Lm1vZHVsZSgnYXBwLmNvcmUnKVxuXHRcdC5mYWN0b3J5KCdjYXJ0U2VydmljZScsIGNhcnRTZXJ2aWNlKTtcblxuXHRjYXJ0U2VydmljZS4kaW5qZWN0ID0gWyckcm9vdFNjb3BlJywgJ2N1c3RvbWVyU2VydmljZSddO1xuXG5cdGZ1bmN0aW9uIGNhcnRTZXJ2aWNlKCRyb290U2NvcGUsIGN1c3RvbWVyU2VydmljZSkge1xuXG5cdFx0dmFyIGl0ZW1zID0gW107XG5cdFx0cmV0dXJuIHtcblx0XHRcdGFkZDogYWRkLFxuXHRcdFx0dXBkYXRlOiB1cGRhdGUsXG5cdFx0XHRnZXQ6IGdldCxcblx0XHRcdHNldDogc2V0LFxuXHRcdFx0cmVtb3ZlOiByZW1vdmUsXG5cdFx0XHRnZXRBbGw6IGdldEFsbCxcblx0XHRcdGNsZWFyOiBjbGVhclxuXHRcdH07XG5cblx0XHRmdW5jdGlvbiBuZXdJdGVtKHBhcmFtcykge1xuXHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0ZWRpdDogcGFyYW1zLmVkaXQgIT09IHVuZGVmaW5lZCA/IHBhcmFtcy5lZGl0IDogdHJ1ZSxcblx0XHRcdFx0cmVtb3ZlOiBwYXJhbXMucmVtb3ZlICE9PSB1bmRlZmluZWQgPyBwYXJhbXMucmVtb3ZlIDogdHJ1ZSxcblx0XHRcdFx0YWN0aW9uOiBwYXJhbXMuYWN0aW9uLFxuXHRcdFx0XHRkZXNjcmlwdGlvbjogcGFyYW1zLmRlc2NyaXB0aW9uLFxuXHRcdFx0XHRhbW91bnQ6IHBhcmFtcy5hbW91bnQsXG5cdFx0XHRcdGN1cnJlbmN5OiBjdXN0b21lclNlcnZpY2UuZ2V0Q3VzdG9tZXIoKS5jdXJyZW5jeSxcblx0XHRcdFx0ZGF0YTogcGFyYW1zLmRhdGFcblx0XHRcdH07XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gYWRkKHBhcmFtcykge1xuXHRcdFx0Ly8gaXRlbXMgPSBbXTsgLy9jb21tZW50IHRoaXMgbGluZSB0byBjb2xsZWN0IGl0ZW1zIGluIHRoZSBjYXJ0LCByYXRoZXIgdGhhbiBzdWJzdGl0dXRlXG5cdFx0XHRpdGVtcy5wdXNoKG5ld0l0ZW0ocGFyYW1zKSk7XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gc2V0KHBhcmFtcywgaW5kZXgpIHtcblx0XHRcdGluZGV4ID8gcmVtb3ZlKGluZGV4KSA6IGNsZWFyKCk7XG5cdFx0XHRpbmRleCA/IGl0ZW1zW2luZGV4XSA9IG5ld0l0ZW0ocGFyYW1zKSA6IGl0ZW1zLnB1c2gobmV3SXRlbShwYXJhbXMpKTtcblx0XHR9XG5cblx0XHRmdW5jdGlvbiByZW1vdmUoaW5kZXgpIHtcblx0XHRcdGl0ZW1zLnNwbGljZShpbmRleCwgMSk7XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gdXBkYXRlKHByZWZpeCwgcGFyYW1zKSB7XG5cdFx0XHR2YXIgaXRlbSA9IGl0ZW1zLmZvckVhY2goZnVuY3Rpb24oaXRlbSwgaW5kZXgsIGFycmF5KSB7XG5cdFx0XHRcdGlmKGl0ZW0uZGF0YS5yZXN1bHQucHJlZml4ID09PSBwcmVmaXgpIGFycmF5W2luZGV4XSA9IHBhcmFtcztcblx0XHRcdH0pO1xuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIGdldChwcmVmaXgpIHtcblx0XHRcdHZhciBmb3VuZDtcblx0XHRcdGl0ZW1zLmZvckVhY2goZnVuY3Rpb24oaXRlbSkge1xuXHRcdFx0XHRpZihpdGVtLmRhdGEucmVzdWx0LnByZWZpeCA9PT0gcHJlZml4KSBmb3VuZCA9IGl0ZW07XG5cdFx0XHR9KTtcblx0XHRcdHJldHVybiBmb3VuZDtcblx0XHR9XG5cblx0XHRmdW5jdGlvbiBnZXRBbGwoKSB7XG5cdFx0XHRyZXR1cm4gaXRlbXM7XG5cdFx0fVxuXHRcdFxuXHRcdGZ1bmN0aW9uIGNsZWFyKCkge1xuXHRcdFx0aXRlbXMuc3BsaWNlKDAsIGl0ZW1zLmxlbmd0aCk7XG5cdFx0fVxuXG5cdH1cblxufSkoKTsiLCIoZnVuY3Rpb24oKXtcblxuXHQndXNlIHN0cmljdCc7XG5cblx0YW5ndWxhclxuXHRcdC5tb2R1bGUoJ2FwcCcpXG5cdFx0LmZhY3RvcnkoJ2N1c3RvbWVyU2VydmljZScsIGN1c3RvbWVyU2VydmljZSk7XG5cblx0Y3VzdG9tZXJTZXJ2aWNlLiRpbmplY3QgPSBbJyRyb290U2NvcGUnXTtcblxuXHRmdW5jdGlvbiBjdXN0b21lclNlcnZpY2UoJHJvb3RTY29wZSl7XG5cblx0XHR2YXIgY3VycmVudEN1c3RvbWVyID0gbnVsbCxcblx0XHRcdGN1cnJlbnRCYWxhbmNlID0gbnVsbDtcblxuXHRcdHJldHVybiB7XG5cdFx0XHRzZXRDdXN0b21lcjogZnVuY3Rpb24ocGFyYW1zKSB7XG5cdFx0XHRcdGN1cnJlbnRDdXN0b21lciA9IGFuZ3VsYXIuZXh0ZW5kKHt9LCBwYXJhbXMpO1xuXHRcdFx0XHQkcm9vdFNjb3BlLiRlbWl0KCdjdXN0b21lci51cGRhdGUnLCBjdXJyZW50Q3VzdG9tZXIpO1xuXHRcdFx0XHRyZXR1cm4gY3VycmVudEN1c3RvbWVyO1xuXHRcdFx0fSxcblx0XHRcdGdldEN1c3RvbWVyOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0cmV0dXJuIGN1cnJlbnRDdXN0b21lcjtcblx0XHRcdH0sXG5cdFx0XHRzZXRDdXN0b21lckJhbGFuY2U6IGZ1bmN0aW9uKGJhbGFuY2UpIHtcblx0XHRcdFx0Y3VycmVudEN1c3RvbWVyID0gY3VycmVudEN1c3RvbWVyIHx8IHt9O1xuXHRcdFx0XHRjdXJyZW50Q3VzdG9tZXIuYmFsYW5jZSA9IGJhbGFuY2U7XG5cdFx0XHRcdGN1cnJlbnRCYWxhbmNlID0gYmFsYW5jZTtcblx0XHRcdFx0JHJvb3RTY29wZS4kZW1pdCgnY3VzdG9tZXIudXBkYXRlJywgY3VycmVudEN1c3RvbWVyKTtcblx0XHRcdH0sXG5cdFx0XHRnZXRDdXN0b21lckJhbGFuY2U6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRyZXR1cm4gY3VycmVudEN1c3RvbWVyLmJhbGFuY2UgfHwgY3VycmVudEJhbGFuY2U7XG5cdFx0XHR9LFxuXHRcdFx0Y2xlYXJDdXJyZW50Q3VzdG9tZXI6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRjdXJyZW50Q3VzdG9tZXIgPSBudWxsO1xuXHRcdFx0fVxuXHRcdH07XG5cblx0fVxuXG59KSgpOyIsIihmdW5jdGlvbigpe1xuXG5cdCd1c2Ugc3RyaWN0JztcblxuXHRhbmd1bGFyXG5cdFx0Lm1vZHVsZSgnYXBwJylcblx0XHQuZmFjdG9yeSgnZXJyb3JTZXJ2aWNlJywgZXJyb3JTZXJ2aWNlKTtcblxuXHRlcnJvclNlcnZpY2UuJGluamVjdCA9IFsnJHJvb3RTY29wZScsICckdHJhbnNsYXRlJywgJ25vdGlmaWNhdGlvbnMnXTtcblxuXHRmdW5jdGlvbiBlcnJvclNlcnZpY2UoJHJvb3RTY29wZSwgJHRyYW5zbGF0ZSwgbm90aWZpY2F0aW9ucyl7XG5cblx0XHRyZXR1cm4ge1xuXHRcdFx0c2hvdzogc2hvd1xuXHRcdH07XG5cblx0XHRmdW5jdGlvbiBzaG93KGVycm9yKXtcblx0XHRcdCR0cmFuc2xhdGUoJ0VSUk9SUy4nK2Vycm9yKVxuXHRcdFx0LnRoZW4oZnVuY3Rpb24gKHRyYW5zbGF0aW9uKXtcblx0XHRcdFx0aWYoJ0VSUk9SUy4nK2Vycm9yID09PSB0cmFuc2xhdGlvbikge1xuXHRcdFx0XHRcdG5vdGlmaWNhdGlvbnMuc2hvd0Vycm9yKCdFUlJPUl9PQ0NVUlJFRCcpO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdG5vdGlmaWNhdGlvbnMuc2hvd0Vycm9yKHRyYW5zbGF0aW9uKTtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdH1cblxufSkoKTsiLCIoZnVuY3Rpb24oKXtcblxuXHQndXNlIHN0cmljdCc7XG5cblx0YW5ndWxhclxuXHRcdC5tb2R1bGUoJ2FwcCcpXG5cdFx0LmZhY3RvcnkoJ25vdGlmeVNlcnZpY2UnLCBub3RpZnlTZXJ2aWNlKTtcblxuXHRub3RpZnlTZXJ2aWNlLiRpbmplY3QgPSBbJyR0cmFuc2xhdGUnLCAnbm90aWZpY2F0aW9ucyddO1xuXG5cdGZ1bmN0aW9uIG5vdGlmeVNlcnZpY2UoJHRyYW5zbGF0ZSwgbm90aWZpY2F0aW9ucyl7XG5cblx0XHRyZXR1cm4ge1xuXHRcdFx0c2hvdzogc2hvd1xuXHRcdH07XG5cblx0XHRmdW5jdGlvbiBzaG93KG5vdGlmeSl7XG5cdFx0XHQkdHJhbnNsYXRlKCdOT1RJRlkuJytub3RpZnkpXG5cdFx0XHQudGhlbihmdW5jdGlvbiAodHJhbnNsYXRpb24pe1xuXHRcdFx0XHRpZignTk9USUZZLicrbm90aWZ5ID09PSB0cmFuc2xhdGlvbikge1xuXHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRub3RpZmljYXRpb25zLnNob3dTdWNjZXNzKHRyYW5zbGF0aW9uKTtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdH1cblxufSkoKTsiLCIoZnVuY3Rpb24oKXtcblxuXHQndXNlIHN0cmljdCc7XG5cblx0YW5ndWxhclxuXHRcdC5tb2R1bGUoJ2FwcCcpXG5cdFx0LmZhY3RvcnkoJ3Bvb2xTaXplU2VydmljZXMnLCBwb29sU2l6ZVNlcnZpY2VzKTtcblxuXHRwb29sU2l6ZVNlcnZpY2VzLiRpbmplY3QgPSBbJ3V0aWxzU2VydmljZSddO1xuXG5cdGZ1bmN0aW9uIHBvb2xTaXplU2VydmljZXModXRpbHMpe1xuXG5cdFx0cmV0dXJuIHtcblx0XHRcdGdldFBvb2xTaXplOiBnZXRQb29sU2l6ZSxcblx0XHRcdHBvb2xBcnJheVRvU3RyaW5nOiBwb29sQXJyYXlUb1N0cmluZyxcblx0XHRcdHBvb2xTdHJpbmdUb09iamVjdDogcG9vbFN0cmluZ1RvT2JqZWN0XG5cdFx0fTtcblxuXHRcdGZ1bmN0aW9uIGdldFBvb2xTaXplKGFycmF5T3JTdHJpbmcpIHtcblx0XHRcdHZhciBwb29sc2l6ZSA9IDA7XG5cblx0XHRcdGlmKHV0aWxzLmlzQXJyYXkoYXJyYXlPclN0cmluZykpe1xuXHRcdFx0XHRhcnJheU9yU3RyaW5nLmZvckVhY2goZnVuY3Rpb24ob2JqLCBpbmR4LCBhcnJheSl7XG5cdFx0XHRcdFx0cG9vbHNpemUgKz0gb2JqLnBvb2xzaXplO1xuXHRcdFx0XHR9KTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGFycmF5T3JTdHJpbmdcblx0XHRcdFx0LnNwbGl0KCcsJylcblx0XHRcdFx0Lm1hcChmdW5jdGlvbihzdHIpe1xuXHRcdFx0XHRcdHJldHVybiBzdHIuc3BsaXQoJy0nKTtcblx0XHRcdFx0fSlcblx0XHRcdFx0LmZvckVhY2goZnVuY3Rpb24oYXJyYXkpe1xuXHRcdFx0XHRcdHBvb2xzaXplICs9IHBhcnNlSW50KGFycmF5WzFdID8gKGFycmF5WzFdIC0gYXJyYXlbMF0rMSkgOiAxLCAxMCk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXHRcdFx0XHRcblx0XHRcdHJldHVybiBwb29sc2l6ZTtcblx0XHR9XG5cblx0XHRmdW5jdGlvbiBwb29sQXJyYXlUb1N0cmluZyhhcnJheSkge1xuXHRcdFx0dmFyIHN0ciA9ICcnO1xuXHRcdFx0YXJyYXkuZm9yRWFjaChmdW5jdGlvbihvYmosIGluZHgsIGFycmF5KXtcblx0XHRcdFx0aWYoaW5keCA+IDApIHN0ciArPSAnLCc7XG5cdFx0XHRcdHN0ciArPSBvYmouZmlyc3RudW1iZXI7XG5cdFx0XHRcdGlmKG9iai5wb29sc2l6ZSA+IDEpIHN0ciArPSAoJy0nICsgKG9iai5maXJzdG51bWJlcitvYmoucG9vbHNpemUtMSkpO1xuXHRcdFx0fSk7XG5cdFx0XHRyZXR1cm4gc3RyO1xuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIHBvb2xTdHJpbmdUb09iamVjdChzdHJpbmcpIHtcblx0XHRcdHZhciBleHRlbnNpb25zID0gW107XG5cblx0XHRcdHN0cmluZ1xuXHRcdFx0LnJlcGxhY2UoL1xccy9nLCAnJylcblx0XHRcdC5zcGxpdCgnLCcpXG5cdFx0XHQubWFwKGZ1bmN0aW9uKHN0cil7XG5cdFx0XHRcdHJldHVybiBzdHIuc3BsaXQoJy0nKTtcblx0XHRcdH0pXG5cdFx0XHQuZm9yRWFjaChmdW5jdGlvbihhcnJheSl7XG5cdFx0XHRcdGV4dGVuc2lvbnMucHVzaCh7XG5cdFx0XHRcdFx0Zmlyc3RudW1iZXI6IHBhcnNlSW50KGFycmF5WzBdLCAxMCksXG5cdFx0XHRcdFx0cG9vbHNpemU6IHBhcnNlSW50KGFycmF5WzFdID8gKGFycmF5WzFdIC0gYXJyYXlbMF0rMSkgOiAxLCAxMClcblx0XHRcdFx0fSk7XG5cdFx0XHR9KTtcblx0XHRcdHJldHVybiBleHRlbnNpb25zO1xuXHRcdH1cblx0fVxuXG59KSgpOyIsIihmdW5jdGlvbigpe1xuXG5cdCd1c2Ugc3RyaWN0JztcblxuXHRhbmd1bGFyXG5cdFx0Lm1vZHVsZSgnYXBwLmNvcmUnKVxuXHRcdC5mYWN0b3J5KCdzcGlubmVyU2VydmljZScsIHNwaW5uZXJTZXJ2aWNlKTtcblxuXHQvLyBzcGlubmVyU2VydmljZS4kaW5qZWN0ID0gW107XG5cblx0ZnVuY3Rpb24gc3Bpbm5lclNlcnZpY2UoKXtcblxuXHRcdHZhciBzcGlubmVycyA9IHt9O1xuXHRcdHJldHVybiB7XG5cdFx0XHRfcmVnaXN0ZXI6IF9yZWdpc3Rlcixcblx0XHRcdHNob3c6IHNob3csXG5cdFx0XHRoaWRlOiBoaWRlLFxuXHRcdFx0c2hvd0FsbDogc2hvd0FsbCxcblx0XHRcdGhpZGVBbGw6IGhpZGVBbGxcblx0XHR9O1xuXHRcdFxuXHRcdGZ1bmN0aW9uIF9yZWdpc3RlcihkYXRhKSB7XG5cdFx0XHRpZiAoIWRhdGEuaGFzT3duUHJvcGVydHkoJ25hbWUnKSkge1xuXHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJTcGlubmVyIG11c3Qgc3BlY2lmeSBhIG5hbWUgd2hlbiByZWdpc3RlcmluZyB3aXRoIHRoZSBzcGlubmVyIHNlcnZpY2UuXCIpO1xuXHRcdFx0fVxuXHRcdFx0aWYgKHNwaW5uZXJzLmhhc093blByb3BlcnR5KGRhdGEubmFtZSkpIHtcblx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0XHQvLyB0aHJvdyBuZXcgRXJyb3IoXCJBIHNwaW5uZXIgd2l0aCB0aGUgbmFtZSAnXCIgKyBkYXRhLm5hbWUgKyBcIicgaGFzIGFscmVhZHkgYmVlbiByZWdpc3RlcmVkLlwiKTtcblx0XHRcdH1cblx0XHRcdHNwaW5uZXJzW2RhdGEubmFtZV0gPSBkYXRhO1xuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIHNob3cobmFtZSkge1xuXHRcdFx0dmFyIHNwaW5uZXIgPSBzcGlubmVyc1tuYW1lXTtcblx0XHRcdGlmICghc3Bpbm5lcikge1xuXHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJObyBzcGlubmVyIG5hbWVkICdcIiArIG5hbWUgKyBcIicgaXMgcmVnaXN0ZXJlZC5cIik7XG5cdFx0XHR9XG5cdFx0XHRzcGlubmVyLnNob3coKTtcblx0XHR9XG5cblx0XHRmdW5jdGlvbiBoaWRlKG5hbWUpIHtcblx0XHRcdHZhciBzcGlubmVyID0gc3Bpbm5lcnNbbmFtZV07XG5cdFx0XHRpZiAoIXNwaW5uZXIpIHtcblx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiTm8gc3Bpbm5lciBuYW1lZCAnXCIgKyBuYW1lICsgXCInIGlzIHJlZ2lzdGVyZWQuXCIpO1xuXHRcdFx0fVxuXHRcdFx0c3Bpbm5lci5oaWRlKCk7XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gc2hvd0FsbCgpIHtcblx0XHRcdGZvciAodmFyIG5hbWUgaW4gc3Bpbm5lcnMpIHtcblx0XHRcdFx0c3Bpbm5lcnNbbmFtZV0uc2hvdygpO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIGhpZGVBbGwoKSB7XG5cdFx0XHRmb3IgKHZhciBuYW1lIGluIHNwaW5uZXJzKSB7XG5cdFx0XHRcdHNwaW5uZXJzW25hbWVdLmhpZGUoKTtcblx0XHRcdH1cblx0XHR9XG5cblx0fVxuXG59KSgpOyIsIihmdW5jdGlvbigpe1xuXG5cdCd1c2Ugc3RyaWN0JztcblxuXHRhbmd1bGFyXG5cdFx0Lm1vZHVsZSgnYXBwJylcblx0XHQuZmFjdG9yeSgnc3RvcmFnZVNlcnZpY2UnLCBzdG9yYWdlU2VydmljZSk7XG5cblx0c3RvcmFnZVNlcnZpY2UuJGluamVjdCA9IFsnJGxvY2FsU3RvcmFnZSddO1xuXG5cdGZ1bmN0aW9uIHN0b3JhZ2VTZXJ2aWNlKCRsb2NhbFN0b3JhZ2Upe1xuXG5cdFx0cmV0dXJuIHtcblx0XHRcdHB1dDogZnVuY3Rpb24gKG5hbWUsIHZhbHVlKSB7XG5cdFx0XHRcdCRsb2NhbFN0b3JhZ2VbbmFtZV0gPSB2YWx1ZTtcblx0XHRcdH0sXG5cdFx0XHRnZXQ6IGZ1bmN0aW9uIChuYW1lKSB7XG5cdFx0XHRcdHJldHVybiAkbG9jYWxTdG9yYWdlW25hbWVdO1xuXHRcdFx0fVxuXHRcdH07XG5cblx0fVxuXG59KSgpOyIsIihmdW5jdGlvbigpe1xuXG5cdCd1c2Ugc3RyaWN0JztcblxuXHRhbmd1bGFyXG5cdFx0Lm1vZHVsZSgnYXBwJylcblx0XHQuZmFjdG9yeSgndXRpbHNTZXJ2aWNlJywgdXRpbHNTZXJ2aWNlKTtcblxuXHR1dGlsc1NlcnZpY2UuJGluamVjdCA9IFtcInVpYkRhdGVQYXJzZXJcIl07XG5cblx0ZnVuY3Rpb24gdXRpbHNTZXJ2aWNlKHVpYkRhdGVQYXJzZXIpe1xuXG5cdFx0cmV0dXJuIHtcblx0XHRcdGlzQXJyYXk6IGlzQXJyYXksXG5cdFx0XHRpc1N0cmluZzogaXNTdHJpbmcsXG5cdFx0XHRzdHJpbmdUb0ZpeGVkOiBzdHJpbmdUb0ZpeGVkLFxuXHRcdFx0YXJyYXlUb09iamVjdDogYXJyYXlUb09iamVjdCxcblx0XHRcdHBhcnNlRGF0ZTogcGFyc2VEYXRlLFxuXHRcdFx0Z2V0RGlmZmVyZW5jZTogZ2V0RGlmZmVyZW5jZSxcblx0XHRcdGNoZWNrUGFzc3dvcmRTdHJlbmd0aDogY2hlY2tQYXNzd29yZFN0cmVuZ3RoLFxuXHRcdFx0Z2VuZXJhdGVQYXNzd29yZDogZ2VuZXJhdGVQYXNzd29yZFxuXHRcdH07XG5cblx0XHRmdW5jdGlvbiBpc0FycmF5KG9iaikge1xuXHRcdFx0cmV0dXJuIHR5cGVvZiBvYmogPT09ICdvYmplY3QnO1xuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIGlzU3RyaW5nKG9iaikge1xuXHRcdFx0cmV0dXJuIHR5cGVvZiBvYmogPT09ICdzdHJpbmcnO1xuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIHN0cmluZ1RvRml4ZWQoc3RyaW5nLCBwb2ludCkge1xuXHRcdFx0cmV0dXJuIHBhcnNlRmxvYXQoc3RyaW5nKS50b0ZpeGVkKHBvaW50KTtcblx0XHR9XG5cblx0XHRmdW5jdGlvbiBhcnJheVRvT2JqZWN0KGFycmF5LCBrZXkpIHtcblx0XHRcdHZhciBvYmogPSB7fSwgcHJvcCA9ICcnO1xuXHRcdFx0YXJyYXkuZm9yRWFjaChmdW5jdGlvbihpdGVtKXtcblx0XHRcdFx0cHJvcCA9IGl0ZW1ba2V5XTtcblx0XHRcdFx0b2JqW3Byb3BdID0gaXRlbTtcblx0XHRcdH0pO1xuXHRcdFx0cmV0dXJuIG9iajtcblx0XHR9XG5cblx0XHRmdW5jdGlvbiBwYXJzZURhdGUoZGF0ZSwgZm9ybWF0KSB7XG5cdFx0XHRyZXR1cm4gbW9tZW50KGRhdGUpLmZvcm1hdChmb3JtYXQgfHwgJ0REIE1NTU0gWVlZWScpO1xuXHRcdFx0Ly8gcmV0dXJuIG5ldyBEYXRlKGRhdGUpLnRvTG9jYWxlRGF0ZVN0cmluZygpO1xuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIGdldERpZmZlcmVuY2UoZGF0ZTEsIGRhdGUyLCBvdXRwdXQpIHtcblx0XHRcdHJldHVybiBtb21lbnQoZGF0ZTEpLmRpZmYoZGF0ZTIsIChvdXRwdXQgPyBvdXRwdXQgOiAnJykpO1xuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIGNoZWNrUGFzc3dvcmRTdHJlbmd0aChzdHJpbmcpIHtcblx0XHRcdHZhciBzdHJvbmcgPSBuZXcgUmVnRXhwKFwiXig/PS4qW2Etel0pKD89LipbQS1aXSkoPz0uKlswLTldKSg/PS4qWyFAI1xcJCVcXF4mXFwqXSkoPz0uezEwLH0pXCIpLFxuXHRcdFx0XHRtaWRkbGUgPSBuZXcgUmVnRXhwKFwiXigoKD89LipbYS16XSkoPz0uKltBLVpdKSg/PS4qWzAtOV0pKXwoKD89LipbYS16XSkoPz0uKltBLVpdKSg/PS4qWyFAI1xcJCVcXF4mXFwqXSkpKSg/PS57OCx9KVwiKTtcblx0XHRcdGlmKHN0cm9uZy50ZXN0KHN0cmluZykpIHtcblx0XHRcdFx0cmV0dXJuIDI7XG5cdFx0XHR9IGVsc2UgaWYobWlkZGxlLnRlc3Qoc3RyaW5nKSkge1xuXHRcdFx0XHRyZXR1cm4gMTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHJldHVybiAwO1xuXHRcdFx0fVxuXHRcdH1cblxuXG5cdFx0Ly8gVE9ETzogZ2VuZXJhdGUgcGFzc3dvcmQgb24gdGhlIHNlcnZlciBzaWRlISEhXG5cdFx0ZnVuY3Rpb24gZ2VuZXJhdGVQYXNzd29yZChtaW5sZW5ndGgsIG1heGxlbmd0aCkge1xuXHRcdFx0dmFyIGNoYXJzID0gXCJhYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5eiFAJCVeJipfQUJDREVGR0hJSktMTU5PUDEyMzQ1Njc4OTBcIixcblx0XHRcdFx0cGFzc0xlbmd0aCA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIChtYXhsZW5ndGggLSBtaW5sZW5ndGgpKSArIG1pbmxlbmd0aCxcblx0XHRcdFx0cGFzcyA9IFwiXCI7XG5cdFx0XHRcblx0XHRcdGZvciAodmFyIHggPSAwOyB4IDwgcGFzc0xlbmd0aDsgeCsrKSB7XG5cdFx0XHRcdHZhciBpID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogY2hhcnMubGVuZ3RoKTtcblx0XHRcdFx0cGFzcyArPSBjaGFycy5jaGFyQXQoaSk7XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gcGFzcztcblx0XHR9XG5cblx0fVxuXG59KSgpOyIsIihmdW5jdGlvbigpe1xuXG5cdCd1c2Ugc3RyaWN0JztcblxuXHRhbmd1bGFyXG5cdFx0Lm1vZHVsZSgnYXBwLmNvcmUnKVxuXHRcdC5jb250cm9sbGVyKCdEYXRlUGlja2VyJywgRGF0ZVBpY2tlcik7XG5cblx0RGF0ZVBpY2tlci4kaW5qZWN0ID0gWyd1dGlsc1NlcnZpY2UnLCAnZXJyb3JTZXJ2aWNlJ107XG5cblx0ZnVuY3Rpb24gRGF0ZVBpY2tlcih1dGlscywgZXJyb3JTZXJ2aWNlKSB7XG5cblx0XHR2YXIgdm0gPSB0aGlzO1xuXG5cdFx0dm0ub3BlbmVkID0gZmFsc2U7XG5cdFx0dm0ub3BlbiA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0dm0ub3BlbmVkID0gdHJ1ZTtcblx0XHR9O1xuXG5cdH1cblxufSkoKTsiLCIoZnVuY3Rpb24oKXtcblxuXHQndXNlIHN0cmljdCc7XG5cblx0YW5ndWxhclxuXHRcdC5tb2R1bGUoJ2FwcCcpXG5cdFx0LmRpcmVjdGl2ZSgnZGF0ZVBpY2tlcicsIGRhdGVQaWNrZXIpO1xuXG5cdGRhdGVQaWNrZXIuJGluamVjdCA9IFsndXRpbHNTZXJ2aWNlJ107XG5cblx0ZnVuY3Rpb24gZGF0ZVBpY2tlcih1dGlsc1NlcnZpY2Upe1xuXG5cdFx0cmV0dXJuIHtcblx0XHRcdHJlc3RyaWN0OiAnQUUnLFxuXHRcdFx0dHJhbnNjbHVkZTogdHJ1ZSxcblx0XHRcdHNjb3BlOiB7XG5cdFx0XHRcdGRhdGVGb3JtYXQ6ICc9Jyxcblx0XHRcdFx0ZGF0ZU9wdGlvbnM6ICc9Jyxcblx0XHRcdFx0bW9kZWw6ICc9J1xuXHRcdFx0fSxcblx0XHRcdGNvbnRyb2xsZXI6ICdEYXRlUGlja2VyJyxcblx0XHRcdGNvbnRyb2xsZXJBczogJ3BpY2tlclZtJyxcblx0XHRcdHRlbXBsYXRlVXJsOiAnY29tcG9uZW50cy9kYXRlLXBpY2tlci9kYXRlLXBpY2tlci5odG1sJyxcblx0XHRcdGxpbms6IGxpbmtcblx0XHR9O1xuXG5cdFx0ZnVuY3Rpb24gbGluayhzY29wZSwgZWwsIGF0dHJzLCBjdHJsKXtcblxuXHRcdFx0dmFyIGljb25zQ2hhbmdlZCA9IGZhbHNlO1xuXG5cdFx0XHRzY29wZS4kd2F0Y2goJ3BpY2tlclZtLm9wZW5lZCcsIGZ1bmN0aW9uIChvcGVuZWQpIHtcblx0XHRcdFx0aWYob3BlbmVkICYmICFpY29uc0NoYW5nZWQpIHtcblx0XHRcdFx0XHRjaGFuZ2VJY29ucygpO1xuXHRcdFx0XHRcdGljb25zQ2hhbmdlZCA9IHRydWU7XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXG5cdFx0XHRmdW5jdGlvbiBjaGFuZ2VJY29ucygpe1xuXHRcdFx0XHR2YXIgbGVmdEljbyA9IGVsWzBdLnF1ZXJ5U2VsZWN0b3JBbGwoJy51aWItbGVmdCcpO1xuXHRcdFx0XHR2YXIgcmlnaHRJY28gPSBlbFswXS5xdWVyeVNlbGVjdG9yQWxsKCcudWliLXJpZ2h0Jyk7XG5cblx0XHRcdFx0Y29uc29sZS5sb2coJ2NoYW5nZUljb25zOiAnLCBlbFswXSwgbGVmdEljbywgcmlnaHRJY28pO1xuXG5cdFx0XHRcdC8vIGxlZnRJY28uY2xhc3NOYW1lID0gJ2ZhIGZhLWNoZXZyb24tbGVmdCc7XG5cdFx0XHRcdC8vIHJpZ2h0SWNvLmNsYXNzTmFtZSA9ICdmYSBmYS1jaGV2cm9uLXJpZ2h0JztcblxuXHRcdFx0fVxuXG5cdFx0fVxuXG5cdH1cblxufSkoKTsiLCIoZnVuY3Rpb24oKXtcblxuXHQndXNlIHN0cmljdCc7XG5cblx0YW5ndWxhclxuXHRcdC5tb2R1bGUoJ2FwcC5sYXlvdXQnKVxuXHRcdC5kaXJlY3RpdmUoJ3NpZGVNZW51Jywgc2lkZU1lbnUpO1xuXG5cdGZ1bmN0aW9uIHNpZGVNZW51KCl7XG5cblx0XHRyZXR1cm4ge1xuXHRcdFx0cmVzdHJpY3Q6ICdBRScsXG5cdFx0XHR0cmFuc2NsdWRlOiB0cnVlLFxuXHRcdFx0Y29udHJvbGxlcjogJ1NpZGVtZW51Q29udHJvbGxlcicsXG5cdFx0XHRjb250cm9sbGVyQXM6ICdzaWRlbWVudVZtJyxcblx0XHRcdHRlbXBsYXRlVXJsOiAnbGF5b3V0L3NpZGVtZW51L3NpZGVtZW51Lmh0bWwnXG5cdFx0fTtcblxuXHR9XG5cbn0pKCk7IiwiKGZ1bmN0aW9uKCl7XG5cblx0J3VzZSBzdHJpY3QnO1xuXG5cdGFuZ3VsYXJcblx0XHQubW9kdWxlKCdhcHAubGF5b3V0Jylcblx0XHQuY29udHJvbGxlcignU2lkZW1lbnVDb250cm9sbGVyJywgU2lkZW1lbnVDb250cm9sbGVyKTtcblxuXHRTaWRlbWVudUNvbnRyb2xsZXIuJGluamVjdCA9IFsnJHJvb3RTY29wZScsICckbG9jYXRpb24nLCAnJHRyYW5zbGF0ZScsICdhdXRoU2VydmljZScsICdlcnJvclNlcnZpY2UnLCAndXRpbHNTZXJ2aWNlJywgJ2FwaVNlcnZpY2UnLCAnY3VzdG9tZXJTZXJ2aWNlJ107XG5cblx0ZnVuY3Rpb24gU2lkZW1lbnVDb250cm9sbGVyKCRyb290U2NvcGUsICRsb2NhdGlvbiwgJHRyYW5zbGF0ZSwgYXV0aFNlcnZpY2UsIGVycm9yU2VydmljZSwgdXRpbHNTZXJ2aWNlLCBhcGlTZXJ2aWNlLCBjdXN0b21lclNlcnZpY2UpIHtcblxuXHRcdHZhciB2bSA9IHRoaXM7XG5cdFx0dm0uY3VzdG9tZXIgPSB7fTtcblx0XHR2bS5jdXN0b21lckJhbGFuY2UgPSBudWxsO1xuXHRcdHZtLmxvZ291dCA9IGxvZ291dDtcblx0XHRcblx0XHRjb25zb2xlLmxvZygnU2lkZW1lbnVDb250cm9sbGVyOiAnLCB2bS5jdXN0b21lckJhbGFuY2UpO1xuXG5cdFx0JHJvb3RTY29wZS4kb24oJ2N1c3RvbWVyLnVwZGF0ZScsIGZ1bmN0aW9uKGV2ZW50LCBjdXN0b21lcikge1xuXHRcdFx0dm0uY3VzdG9tZXIgPSBjdXN0b21lcjtcblx0XHR9KTtcblxuXHRcdCRyb290U2NvcGUuJG9uKCdhdXRoLmxvZ2luJywgZnVuY3Rpb24oKSB7XG5cdFx0XHRnZXRDdXN0b21lckJhbGFuY2UoKTtcblx0XHR9KTtcblxuXHRcdGZ1bmN0aW9uIHN0cmluZ1RvRml4ZWQoc3RyaW5nKSB7XG5cdFx0XHRyZXR1cm4gdXRpbHNTZXJ2aWNlLnN0cmluZ1RvRml4ZWQoc3RyaW5nLCAyKTtcblx0XHR9XG5cblx0XHRmdW5jdGlvbiBnZXRDdXN0b21lckJhbGFuY2UoKSB7XG5cdFx0XHRhcGlTZXJ2aWNlLnJlcXVlc3Qoe1xuXHRcdFx0XHR1cmw6IFwiZ2V0Q3VzdG9tZXJCYWxhbmNlXCJcblx0XHRcdH0pLnRoZW4oZnVuY3Rpb24ocmVzKXtcblx0XHRcdFx0aWYoIXJlcy5kYXRhLnN1Y2Nlc3MpIHJldHVybiBlcnJvclNlcnZpY2Uuc2hvdyhyZXMuZGF0YS5tZXNzYWdlKTtcblx0XHRcdFx0XG5cdFx0XHRcdHZtLmN1c3RvbWVyLmJhbGFuY2UgPSByZXMuZGF0YS5yZXN1bHQ7XG5cdFx0XHRcdHZtLmN1c3RvbWVyQmFsYW5jZSA9IHN0cmluZ1RvRml4ZWQocmVzLmRhdGEucmVzdWx0KTtcblx0XHRcdFx0Y3VzdG9tZXJTZXJ2aWNlLnNldEN1c3RvbWVyQmFsYW5jZShyZXMuZGF0YS5yZXN1bHQpO1xuXHRcdFx0fSwgZnVuY3Rpb24oZXJyKXtcblx0XHRcdFx0ZXJyb3JTZXJ2aWNlLnNob3coZXJyKTtcblx0XHRcdH0pO1xuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIGxvZ291dCgpIHtcblx0XHRcdGF1dGhTZXJ2aWNlLmxvZ291dCgpO1xuXHRcdH1cblxuXHR9XG5cbn0pKCk7IiwiKGZ1bmN0aW9uKCl7XG5cblx0J3VzZSBzdHJpY3QnO1xuXG5cdGFuZ3VsYXJcblx0XHQubW9kdWxlKCdhcHAubGF5b3V0Jylcblx0XHQuY29udHJvbGxlcignVG9wYmFyQ29udHJvbGxlcicsIFRvcGJhckNvbnRyb2xsZXIpO1xuXG5cdFRvcGJhckNvbnRyb2xsZXIuJGluamVjdCA9IFsnJHJvb3RTY29wZScsICckc2NvcGUnLCAnJGxvY2FsU3RvcmFnZScsICckdHJhbnNsYXRlJ107XG5cblx0ZnVuY3Rpb24gVG9wYmFyQ29udHJvbGxlcigkcm9vdFNjb3BlLCAkc2NvcGUsICRsb2NhbFN0b3JhZ2UsICR0cmFuc2xhdGUpIHtcblxuXHRcdHZhciB2bSA9IHRoaXM7XG5cdFx0dm0ubGFuZyA9ICRsb2NhbFN0b3JhZ2UuTkdfVFJBTlNMQVRFX0xBTkdfS0VZIHx8ICR0cmFuc2xhdGUudXNlKCk7XG5cblx0XHQkcm9vdFNjb3BlLiRvbignbGFuZy5jaGFuZ2UnLCBmdW5jdGlvbihlLCBkYXRhKXtcblx0XHRcdGlmKGRhdGEubGFuZykgdm0ubGFuZyA9IGRhdGEubGFuZztcblx0XHR9KTtcblx0XHRcblxuXHR9XG5cbn0pKCk7IiwiKGZ1bmN0aW9uKCl7XG5cblx0J3VzZSBzdHJpY3QnO1xuXG5cdGFuZ3VsYXJcblx0XHQubW9kdWxlKCdhcHAubGF5b3V0Jylcblx0XHQuZGlyZWN0aXZlKCd0b3BCYXInLCB0b3BCYXIpO1xuXG5cdGZ1bmN0aW9uIHRvcEJhcigpe1xuXG5cdFx0cmV0dXJuIHtcblx0XHRcdHJlc3RyaWN0OiAnQUUnLFxuXHRcdFx0dHJhbnNjbHVkZTogdHJ1ZSxcblx0XHRcdGNvbnRyb2xsZXI6ICdUb3BiYXJDb250cm9sbGVyJyxcblx0XHRcdGNvbnRyb2xsZXJBczogJ3RvcGJhclZtJyxcblx0XHRcdHRlbXBsYXRlVXJsOiAnbGF5b3V0L3RvcGJhci90b3BiYXIuaHRtbCcsXG5cdFx0fTtcblxuXHR9XG5cbn0pKCk7IiwiJ3VzZSBzdHJpY3QnO1xuYW5ndWxhci5tb2R1bGUoXCJuZ0xvY2FsZVwiLCBbXSwgW1wiJHByb3ZpZGVcIiwgZnVuY3Rpb24oJHByb3ZpZGUpIHtcbnZhciBQTFVSQUxfQ0FURUdPUlkgPSB7WkVSTzogXCJ6ZXJvXCIsIE9ORTogXCJvbmVcIiwgVFdPOiBcInR3b1wiLCBGRVc6IFwiZmV3XCIsIE1BTlk6IFwibWFueVwiLCBPVEhFUjogXCJvdGhlclwifTtcbmZ1bmN0aW9uIGdldERlY2ltYWxzKG4pIHtcbiAgbiA9IG4gKyAnJztcbiAgdmFyIGkgPSBuLmluZGV4T2YoJy4nKTtcbiAgcmV0dXJuIChpID09IC0xKSA/IDAgOiBuLmxlbmd0aCAtIGkgLSAxO1xufVxuXG5mdW5jdGlvbiBnZXRWRihuLCBvcHRfcHJlY2lzaW9uKSB7XG4gIHZhciB2ID0gb3B0X3ByZWNpc2lvbjtcblxuICBpZiAodW5kZWZpbmVkID09PSB2KSB7XG4gICAgdiA9IE1hdGgubWluKGdldERlY2ltYWxzKG4pLCAzKTtcbiAgfVxuXG4gIHZhciBiYXNlID0gTWF0aC5wb3coMTAsIHYpO1xuICB2YXIgZiA9ICgobiAqIGJhc2UpIHwgMCkgJSBiYXNlO1xuICByZXR1cm4ge3Y6IHYsIGY6IGZ9O1xufVxuXG4kcHJvdmlkZS52YWx1ZShcIiRsb2NhbGVcIiwge1xuICBcIkRBVEVUSU1FX0ZPUk1BVFNcIjoge1xuICAgIFwiQU1QTVNcIjogW1xuICAgICAgXCJBTVwiLFxuICAgICAgXCJQTVwiXG4gICAgXSxcbiAgICBcIkRBWVwiOiBbXG4gICAgICBcIlN1bmRheVwiLFxuICAgICAgXCJNb25kYXlcIixcbiAgICAgIFwiVHVlc2RheVwiLFxuICAgICAgXCJXZWRuZXNkYXlcIixcbiAgICAgIFwiVGh1cnNkYXlcIixcbiAgICAgIFwiRnJpZGF5XCIsXG4gICAgICBcIlNhdHVyZGF5XCJcbiAgICBdLFxuICAgIFwiRVJBTkFNRVNcIjogW1xuICAgICAgXCJCZWZvcmUgQ2hyaXN0XCIsXG4gICAgICBcIkFubm8gRG9taW5pXCJcbiAgICBdLFxuICAgIFwiRVJBU1wiOiBbXG4gICAgICBcIkJDXCIsXG4gICAgICBcIkFEXCJcbiAgICBdLFxuICAgIFwiRklSU1REQVlPRldFRUtcIjogNixcbiAgICBcIk1PTlRIXCI6IFtcbiAgICAgIFwiSmFudWFyeVwiLFxuICAgICAgXCJGZWJydWFyeVwiLFxuICAgICAgXCJNYXJjaFwiLFxuICAgICAgXCJBcHJpbFwiLFxuICAgICAgXCJNYXlcIixcbiAgICAgIFwiSnVuZVwiLFxuICAgICAgXCJKdWx5XCIsXG4gICAgICBcIkF1Z3VzdFwiLFxuICAgICAgXCJTZXB0ZW1iZXJcIixcbiAgICAgIFwiT2N0b2JlclwiLFxuICAgICAgXCJOb3ZlbWJlclwiLFxuICAgICAgXCJEZWNlbWJlclwiXG4gICAgXSxcbiAgICBcIlNIT1JUREFZXCI6IFtcbiAgICAgIFwiU3VuXCIsXG4gICAgICBcIk1vblwiLFxuICAgICAgXCJUdWVcIixcbiAgICAgIFwiV2VkXCIsXG4gICAgICBcIlRodVwiLFxuICAgICAgXCJGcmlcIixcbiAgICAgIFwiU2F0XCJcbiAgICBdLFxuICAgIFwiU0hPUlRNT05USFwiOiBbXG4gICAgICBcIkphblwiLFxuICAgICAgXCJGZWJcIixcbiAgICAgIFwiTWFyXCIsXG4gICAgICBcIkFwclwiLFxuICAgICAgXCJNYXlcIixcbiAgICAgIFwiSnVuXCIsXG4gICAgICBcIkp1bFwiLFxuICAgICAgXCJBdWdcIixcbiAgICAgIFwiU2VwXCIsXG4gICAgICBcIk9jdFwiLFxuICAgICAgXCJOb3ZcIixcbiAgICAgIFwiRGVjXCJcbiAgICBdLFxuICAgIFwiU1RBTkRBTE9ORU1PTlRIXCI6IFtcbiAgICAgIFwiSmFudWFyeVwiLFxuICAgICAgXCJGZWJydWFyeVwiLFxuICAgICAgXCJNYXJjaFwiLFxuICAgICAgXCJBcHJpbFwiLFxuICAgICAgXCJNYXlcIixcbiAgICAgIFwiSnVuZVwiLFxuICAgICAgXCJKdWx5XCIsXG4gICAgICBcIkF1Z3VzdFwiLFxuICAgICAgXCJTZXB0ZW1iZXJcIixcbiAgICAgIFwiT2N0b2JlclwiLFxuICAgICAgXCJOb3ZlbWJlclwiLFxuICAgICAgXCJEZWNlbWJlclwiXG4gICAgXSxcbiAgICBcIldFRUtFTkRSQU5HRVwiOiBbXG4gICAgICA1LFxuICAgICAgNlxuICAgIF0sXG4gICAgXCJmdWxsRGF0ZVwiOiBcIkVFRUUsIE1NTU0gZCwgeVwiLFxuICAgIFwibG9uZ0RhdGVcIjogXCJNTU1NIGQsIHlcIixcbiAgICBcIm1lZGl1bVwiOiBcIk1NTSBkLCB5IGg6bW06c3MgYVwiLFxuICAgIFwibWVkaXVtRGF0ZVwiOiBcIk1NTSBkLCB5XCIsXG4gICAgXCJtZWRpdW1UaW1lXCI6IFwiaDptbTpzcyBhXCIsXG4gICAgXCJzaG9ydFwiOiBcIk0vZC95eSBoOm1tIGFcIixcbiAgICBcInNob3J0RGF0ZVwiOiBcIk0vZC95eVwiLFxuICAgIFwic2hvcnRUaW1lXCI6IFwiaDptbSBhXCJcbiAgfSxcbiAgXCJOVU1CRVJfRk9STUFUU1wiOiB7XG4gICAgXCJDVVJSRU5DWV9TWU1cIjogXCIkXCIsXG4gICAgXCJERUNJTUFMX1NFUFwiOiBcIi5cIixcbiAgICBcIkdST1VQX1NFUFwiOiBcIixcIixcbiAgICBcIlBBVFRFUk5TXCI6IFtcbiAgICAgIHtcbiAgICAgICAgXCJnU2l6ZVwiOiAzLFxuICAgICAgICBcImxnU2l6ZVwiOiAzLFxuICAgICAgICBcIm1heEZyYWNcIjogMyxcbiAgICAgICAgXCJtaW5GcmFjXCI6IDAsXG4gICAgICAgIFwibWluSW50XCI6IDEsXG4gICAgICAgIFwibmVnUHJlXCI6IFwiLVwiLFxuICAgICAgICBcIm5lZ1N1ZlwiOiBcIlwiLFxuICAgICAgICBcInBvc1ByZVwiOiBcIlwiLFxuICAgICAgICBcInBvc1N1ZlwiOiBcIlwiXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBcImdTaXplXCI6IDMsXG4gICAgICAgIFwibGdTaXplXCI6IDMsXG4gICAgICAgIFwibWF4RnJhY1wiOiAyLFxuICAgICAgICBcIm1pbkZyYWNcIjogMixcbiAgICAgICAgXCJtaW5JbnRcIjogMSxcbiAgICAgICAgXCJuZWdQcmVcIjogXCItXFx1MDBhNFwiLFxuICAgICAgICBcIm5lZ1N1ZlwiOiBcIlwiLFxuICAgICAgICBcInBvc1ByZVwiOiBcIlxcdTAwYTRcIixcbiAgICAgICAgXCJwb3NTdWZcIjogXCJcIlxuICAgICAgfVxuICAgIF1cbiAgfSxcbiAgXCJpZFwiOiBcImVuXCIsXG4gIFwibG9jYWxlSURcIjogXCJlblwiLFxuICBcInBsdXJhbENhdFwiOiBmdW5jdGlvbihuLCBvcHRfcHJlY2lzaW9uKSB7ICB2YXIgaSA9IG4gfCAwOyAgdmFyIHZmID0gZ2V0VkYobiwgb3B0X3ByZWNpc2lvbik7ICBpZiAoaSA9PSAxICYmIHZmLnYgPT0gMCkgeyAgICByZXR1cm4gUExVUkFMX0NBVEVHT1JZLk9ORTsgIH0gIHJldHVybiBQTFVSQUxfQ0FURUdPUlkuT1RIRVI7fVxufSk7XG59XSk7XG4iLCIndXNlIHN0cmljdCc7XG5hbmd1bGFyLm1vZHVsZShcIm5nTG9jYWxlXCIsIFtdLCBbXCIkcHJvdmlkZVwiLCBmdW5jdGlvbigkcHJvdmlkZSkge1xudmFyIFBMVVJBTF9DQVRFR09SWSA9IHtaRVJPOiBcInplcm9cIiwgT05FOiBcIm9uZVwiLCBUV086IFwidHdvXCIsIEZFVzogXCJmZXdcIiwgTUFOWTogXCJtYW55XCIsIE9USEVSOiBcIm90aGVyXCJ9O1xuZnVuY3Rpb24gZ2V0RGVjaW1hbHMobikge1xuICBuID0gbiArICcnO1xuICB2YXIgaSA9IG4uaW5kZXhPZignLicpO1xuICByZXR1cm4gKGkgPT0gLTEpID8gMCA6IG4ubGVuZ3RoIC0gaSAtIDE7XG59XG5cbmZ1bmN0aW9uIGdldFZGKG4sIG9wdF9wcmVjaXNpb24pIHtcbiAgdmFyIHYgPSBvcHRfcHJlY2lzaW9uO1xuXG4gIGlmICh1bmRlZmluZWQgPT09IHYpIHtcbiAgICB2ID0gTWF0aC5taW4oZ2V0RGVjaW1hbHMobiksIDMpO1xuICB9XG5cbiAgdmFyIGJhc2UgPSBNYXRoLnBvdygxMCwgdik7XG4gIHZhciBmID0gKChuICogYmFzZSkgfCAwKSAlIGJhc2U7XG4gIHJldHVybiB7djogdiwgZjogZn07XG59XG5cbiRwcm92aWRlLnZhbHVlKFwiJGxvY2FsZVwiLCB7XG4gIFwiREFURVRJTUVfRk9STUFUU1wiOiB7XG4gICAgXCJBTVBNU1wiOiBbXG4gICAgICBcIkFNXCIsXG4gICAgICBcIlBNXCJcbiAgICBdLFxuICAgIFwiREFZXCI6IFtcbiAgICAgIFwiXFx1MDQzMlxcdTA0M2VcXHUwNDQxXFx1MDQzYVxcdTA0NDBcXHUwNDM1XFx1MDQ0MVxcdTA0MzVcXHUwNDNkXFx1MDQ0Y1xcdTA0MzVcIixcbiAgICAgIFwiXFx1MDQzZlxcdTA0M2VcXHUwNDNkXFx1MDQzNVxcdTA0MzRcXHUwNDM1XFx1MDQzYlxcdTA0NGNcXHUwNDNkXFx1MDQzOFxcdTA0M2FcIixcbiAgICAgIFwiXFx1MDQzMlxcdTA0NDJcXHUwNDNlXFx1MDQ0MFxcdTA0M2RcXHUwNDM4XFx1MDQzYVwiLFxuICAgICAgXCJcXHUwNDQxXFx1MDQ0MFxcdTA0MzVcXHUwNDM0XFx1MDQzMFwiLFxuICAgICAgXCJcXHUwNDQ3XFx1MDQzNVxcdTA0NDJcXHUwNDMyXFx1MDQzNVxcdTA0NDBcXHUwNDMzXCIsXG4gICAgICBcIlxcdTA0M2ZcXHUwNDRmXFx1MDQ0MlxcdTA0M2RcXHUwNDM4XFx1MDQ0NlxcdTA0MzBcIixcbiAgICAgIFwiXFx1MDQ0MVxcdTA0NDNcXHUwNDMxXFx1MDQzMVxcdTA0M2VcXHUwNDQyXFx1MDQzMFwiXG4gICAgXSxcbiAgICBcIkVSQU5BTUVTXCI6IFtcbiAgICAgIFwiXFx1MDQzNFxcdTA0M2UgXFx1MDQzZC4gXFx1MDQ0ZC5cIixcbiAgICAgIFwiXFx1MDQzZC4gXFx1MDQ0ZC5cIlxuICAgIF0sXG4gICAgXCJFUkFTXCI6IFtcbiAgICAgIFwiXFx1MDQzNFxcdTA0M2UgXFx1MDQzZC4gXFx1MDQ0ZC5cIixcbiAgICAgIFwiXFx1MDQzZC4gXFx1MDQ0ZC5cIlxuICAgIF0sXG4gICAgXCJGSVJTVERBWU9GV0VFS1wiOiAwLFxuICAgIFwiTU9OVEhcIjogW1xuICAgICAgXCJcXHUwNDRmXFx1MDQzZFxcdTA0MzJcXHUwNDMwXFx1MDQ0MFxcdTA0NGZcIixcbiAgICAgIFwiXFx1MDQ0NFxcdTA0MzVcXHUwNDMyXFx1MDQ0MFxcdTA0MzBcXHUwNDNiXFx1MDQ0ZlwiLFxuICAgICAgXCJcXHUwNDNjXFx1MDQzMFxcdTA0NDBcXHUwNDQyXFx1MDQzMFwiLFxuICAgICAgXCJcXHUwNDMwXFx1MDQzZlxcdTA0NDBcXHUwNDM1XFx1MDQzYlxcdTA0NGZcIixcbiAgICAgIFwiXFx1MDQzY1xcdTA0MzBcXHUwNDRmXCIsXG4gICAgICBcIlxcdTA0MzhcXHUwNDRlXFx1MDQzZFxcdTA0NGZcIixcbiAgICAgIFwiXFx1MDQzOFxcdTA0NGVcXHUwNDNiXFx1MDQ0ZlwiLFxuICAgICAgXCJcXHUwNDMwXFx1MDQzMlxcdTA0MzNcXHUwNDQzXFx1MDQ0MVxcdTA0NDJcXHUwNDMwXCIsXG4gICAgICBcIlxcdTA0NDFcXHUwNDM1XFx1MDQzZFxcdTA0NDJcXHUwNDRmXFx1MDQzMVxcdTA0NDBcXHUwNDRmXCIsXG4gICAgICBcIlxcdTA0M2VcXHUwNDNhXFx1MDQ0MlxcdTA0NGZcXHUwNDMxXFx1MDQ0MFxcdTA0NGZcIixcbiAgICAgIFwiXFx1MDQzZFxcdTA0M2VcXHUwNDRmXFx1MDQzMVxcdTA0NDBcXHUwNDRmXCIsXG4gICAgICBcIlxcdTA0MzRcXHUwNDM1XFx1MDQzYVxcdTA0MzBcXHUwNDMxXFx1MDQ0MFxcdTA0NGZcIlxuICAgIF0sXG4gICAgXCJTSE9SVERBWVwiOiBbXG4gICAgICBcIlxcdTA0MzJcXHUwNDQxXCIsXG4gICAgICBcIlxcdTA0M2ZcXHUwNDNkXCIsXG4gICAgICBcIlxcdTA0MzJcXHUwNDQyXCIsXG4gICAgICBcIlxcdTA0NDFcXHUwNDQwXCIsXG4gICAgICBcIlxcdTA0NDdcXHUwNDQyXCIsXG4gICAgICBcIlxcdTA0M2ZcXHUwNDQyXCIsXG4gICAgICBcIlxcdTA0NDFcXHUwNDMxXCJcbiAgICBdLFxuICAgIFwiU0hPUlRNT05USFwiOiBbXG4gICAgICBcIlxcdTA0NGZcXHUwNDNkXFx1MDQzMi5cIixcbiAgICAgIFwiXFx1MDQ0NFxcdTA0MzVcXHUwNDMyXFx1MDQ0MC5cIixcbiAgICAgIFwiXFx1MDQzY1xcdTA0MzBcXHUwNDQwXFx1MDQ0MlxcdTA0MzBcIixcbiAgICAgIFwiXFx1MDQzMFxcdTA0M2ZcXHUwNDQwLlwiLFxuICAgICAgXCJcXHUwNDNjXFx1MDQzMFxcdTA0NGZcIixcbiAgICAgIFwiXFx1MDQzOFxcdTA0NGVcXHUwNDNkXFx1MDQ0ZlwiLFxuICAgICAgXCJcXHUwNDM4XFx1MDQ0ZVxcdTA0M2JcXHUwNDRmXCIsXG4gICAgICBcIlxcdTA0MzBcXHUwNDMyXFx1MDQzMy5cIixcbiAgICAgIFwiXFx1MDQ0MVxcdTA0MzVcXHUwNDNkXFx1MDQ0Mi5cIixcbiAgICAgIFwiXFx1MDQzZVxcdTA0M2FcXHUwNDQyLlwiLFxuICAgICAgXCJcXHUwNDNkXFx1MDQzZVxcdTA0NGZcXHUwNDMxLlwiLFxuICAgICAgXCJcXHUwNDM0XFx1MDQzNVxcdTA0M2EuXCJcbiAgICBdLFxuICAgIFwiU1RBTkRBTE9ORU1PTlRIXCI6IFtcbiAgICAgIFwiXFx1MDQ0ZlxcdTA0M2RcXHUwNDMyXFx1MDQzMFxcdTA0NDBcXHUwNDRjXCIsXG4gICAgICBcIlxcdTA0NDRcXHUwNDM1XFx1MDQzMlxcdTA0NDBcXHUwNDMwXFx1MDQzYlxcdTA0NGNcIixcbiAgICAgIFwiXFx1MDQzY1xcdTA0MzBcXHUwNDQwXFx1MDQ0MlwiLFxuICAgICAgXCJcXHUwNDMwXFx1MDQzZlxcdTA0NDBcXHUwNDM1XFx1MDQzYlxcdTA0NGNcIixcbiAgICAgIFwiXFx1MDQzY1xcdTA0MzBcXHUwNDM5XCIsXG4gICAgICBcIlxcdTA0MzhcXHUwNDRlXFx1MDQzZFxcdTA0NGNcIixcbiAgICAgIFwiXFx1MDQzOFxcdTA0NGVcXHUwNDNiXFx1MDQ0Y1wiLFxuICAgICAgXCJcXHUwNDMwXFx1MDQzMlxcdTA0MzNcXHUwNDQzXFx1MDQ0MVxcdTA0NDJcIixcbiAgICAgIFwiXFx1MDQ0MVxcdTA0MzVcXHUwNDNkXFx1MDQ0MlxcdTA0NGZcXHUwNDMxXFx1MDQ0MFxcdTA0NGNcIixcbiAgICAgIFwiXFx1MDQzZVxcdTA0M2FcXHUwNDQyXFx1MDQ0ZlxcdTA0MzFcXHUwNDQwXFx1MDQ0Y1wiLFxuICAgICAgXCJcXHUwNDNkXFx1MDQzZVxcdTA0NGZcXHUwNDMxXFx1MDQ0MFxcdTA0NGNcIixcbiAgICAgIFwiXFx1MDQzNFxcdTA0MzVcXHUwNDNhXFx1MDQzMFxcdTA0MzFcXHUwNDQwXFx1MDQ0Y1wiXG4gICAgXSxcbiAgICBcIldFRUtFTkRSQU5HRVwiOiBbXG4gICAgICA1LFxuICAgICAgNlxuICAgIF0sXG4gICAgXCJmdWxsRGF0ZVwiOiBcIkVFRUUsIGQgTU1NTSB5ICdcXHUwNDMzJy5cIixcbiAgICBcImxvbmdEYXRlXCI6IFwiZCBNTU1NIHkgJ1xcdTA0MzMnLlwiLFxuICAgIFwibWVkaXVtXCI6IFwiZCBNTU0geSAnXFx1MDQzMycuIEg6bW06c3NcIixcbiAgICBcIm1lZGl1bURhdGVcIjogXCJkIE1NTSB5ICdcXHUwNDMzJy5cIixcbiAgICBcIm1lZGl1bVRpbWVcIjogXCJIOm1tOnNzXCIsXG4gICAgXCJzaG9ydFwiOiBcImRkLk1NLnl5IEg6bW1cIixcbiAgICBcInNob3J0RGF0ZVwiOiBcImRkLk1NLnl5XCIsXG4gICAgXCJzaG9ydFRpbWVcIjogXCJIOm1tXCJcbiAgfSxcbiAgXCJOVU1CRVJfRk9STUFUU1wiOiB7XG4gICAgXCJDVVJSRU5DWV9TWU1cIjogXCJcXHUwNDQwXFx1MDQ0M1xcdTA0MzEuXCIsXG4gICAgXCJERUNJTUFMX1NFUFwiOiBcIixcIixcbiAgICBcIkdST1VQX1NFUFwiOiBcIlxcdTAwYTBcIixcbiAgICBcIlBBVFRFUk5TXCI6IFtcbiAgICAgIHtcbiAgICAgICAgXCJnU2l6ZVwiOiAzLFxuICAgICAgICBcImxnU2l6ZVwiOiAzLFxuICAgICAgICBcIm1heEZyYWNcIjogMyxcbiAgICAgICAgXCJtaW5GcmFjXCI6IDAsXG4gICAgICAgIFwibWluSW50XCI6IDEsXG4gICAgICAgIFwibmVnUHJlXCI6IFwiLVwiLFxuICAgICAgICBcIm5lZ1N1ZlwiOiBcIlwiLFxuICAgICAgICBcInBvc1ByZVwiOiBcIlwiLFxuICAgICAgICBcInBvc1N1ZlwiOiBcIlwiXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBcImdTaXplXCI6IDMsXG4gICAgICAgIFwibGdTaXplXCI6IDMsXG4gICAgICAgIFwibWF4RnJhY1wiOiAyLFxuICAgICAgICBcIm1pbkZyYWNcIjogMixcbiAgICAgICAgXCJtaW5JbnRcIjogMSxcbiAgICAgICAgXCJuZWdQcmVcIjogXCItXCIsXG4gICAgICAgIFwibmVnU3VmXCI6IFwiXFx1MDBhMFxcdTAwYTRcIixcbiAgICAgICAgXCJwb3NQcmVcIjogXCJcIixcbiAgICAgICAgXCJwb3NTdWZcIjogXCJcXHUwMGEwXFx1MDBhNFwiXG4gICAgICB9XG4gICAgXVxuICB9LFxuICBcImlkXCI6IFwicnUtcnVcIixcbiAgXCJsb2NhbGVJRFwiOiBcInJ1X1JVXCIsXG4gIFwicGx1cmFsQ2F0XCI6IGZ1bmN0aW9uKG4sIG9wdF9wcmVjaXNpb24pIHsgIHZhciBpID0gbiB8IDA7ICB2YXIgdmYgPSBnZXRWRihuLCBvcHRfcHJlY2lzaW9uKTsgIGlmICh2Zi52ID09IDAgJiYgaSAlIDEwID09IDEgJiYgaSAlIDEwMCAhPSAxMSkgeyAgICByZXR1cm4gUExVUkFMX0NBVEVHT1JZLk9ORTsgIH0gIGlmICh2Zi52ID09IDAgJiYgaSAlIDEwID49IDIgJiYgaSAlIDEwIDw9IDQgJiYgKGkgJSAxMDAgPCAxMiB8fCBpICUgMTAwID4gMTQpKSB7ICAgIHJldHVybiBQTFVSQUxfQ0FURUdPUlkuRkVXOyAgfSAgaWYgKHZmLnYgPT0gMCAmJiBpICUgMTAgPT0gMCB8fCB2Zi52ID09IDAgJiYgaSAlIDEwID49IDUgJiYgaSAlIDEwIDw9IDkgfHwgdmYudiA9PSAwICYmIGkgJSAxMDAgPj0gMTEgJiYgaSAlIDEwMCA8PSAxNCkgeyAgICByZXR1cm4gUExVUkFMX0NBVEVHT1JZLk1BTlk7ICB9ICByZXR1cm4gUExVUkFMX0NBVEVHT1JZLk9USEVSO31cbn0pO1xufV0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuYW5ndWxhci5tb2R1bGUoXCJuZ0xvY2FsZVwiLCBbXSwgW1wiJHByb3ZpZGVcIiwgZnVuY3Rpb24oJHByb3ZpZGUpIHtcbnZhciBQTFVSQUxfQ0FURUdPUlkgPSB7WkVSTzogXCJ6ZXJvXCIsIE9ORTogXCJvbmVcIiwgVFdPOiBcInR3b1wiLCBGRVc6IFwiZmV3XCIsIE1BTlk6IFwibWFueVwiLCBPVEhFUjogXCJvdGhlclwifTtcbmZ1bmN0aW9uIGdldERlY2ltYWxzKG4pIHtcbiAgbiA9IG4gKyAnJztcbiAgdmFyIGkgPSBuLmluZGV4T2YoJy4nKTtcbiAgcmV0dXJuIChpID09IC0xKSA/IDAgOiBuLmxlbmd0aCAtIGkgLSAxO1xufVxuXG5mdW5jdGlvbiBnZXRWRihuLCBvcHRfcHJlY2lzaW9uKSB7XG4gIHZhciB2ID0gb3B0X3ByZWNpc2lvbjtcblxuICBpZiAodW5kZWZpbmVkID09PSB2KSB7XG4gICAgdiA9IE1hdGgubWluKGdldERlY2ltYWxzKG4pLCAzKTtcbiAgfVxuXG4gIHZhciBiYXNlID0gTWF0aC5wb3coMTAsIHYpO1xuICB2YXIgZiA9ICgobiAqIGJhc2UpIHwgMCkgJSBiYXNlO1xuICByZXR1cm4ge3Y6IHYsIGY6IGZ9O1xufVxuXG4kcHJvdmlkZS52YWx1ZShcIiRsb2NhbGVcIiwge1xuICBcIkRBVEVUSU1FX0ZPUk1BVFNcIjoge1xuICAgIFwiQU1QTVNcIjogW1xuICAgICAgXCJBTVwiLFxuICAgICAgXCJQTVwiXG4gICAgXSxcbiAgICBcIkRBWVwiOiBbXG4gICAgICBcIlxcdTA0MzJcXHUwNDNlXFx1MDQ0MVxcdTA0M2FcXHUwNDQwXFx1MDQzNVxcdTA0NDFcXHUwNDM1XFx1MDQzZFxcdTA0NGNcXHUwNDM1XCIsXG4gICAgICBcIlxcdTA0M2ZcXHUwNDNlXFx1MDQzZFxcdTA0MzVcXHUwNDM0XFx1MDQzNVxcdTA0M2JcXHUwNDRjXFx1MDQzZFxcdTA0MzhcXHUwNDNhXCIsXG4gICAgICBcIlxcdTA0MzJcXHUwNDQyXFx1MDQzZVxcdTA0NDBcXHUwNDNkXFx1MDQzOFxcdTA0M2FcIixcbiAgICAgIFwiXFx1MDQ0MVxcdTA0NDBcXHUwNDM1XFx1MDQzNFxcdTA0MzBcIixcbiAgICAgIFwiXFx1MDQ0N1xcdTA0MzVcXHUwNDQyXFx1MDQzMlxcdTA0MzVcXHUwNDQwXFx1MDQzM1wiLFxuICAgICAgXCJcXHUwNDNmXFx1MDQ0ZlxcdTA0NDJcXHUwNDNkXFx1MDQzOFxcdTA0NDZcXHUwNDMwXCIsXG4gICAgICBcIlxcdTA0NDFcXHUwNDQzXFx1MDQzMVxcdTA0MzFcXHUwNDNlXFx1MDQ0MlxcdTA0MzBcIlxuICAgIF0sXG4gICAgXCJFUkFOQU1FU1wiOiBbXG4gICAgICBcIlxcdTA0MzRcXHUwNDNlIFxcdTA0M2QuIFxcdTA0NGQuXCIsXG4gICAgICBcIlxcdTA0M2QuIFxcdTA0NGQuXCJcbiAgICBdLFxuICAgIFwiRVJBU1wiOiBbXG4gICAgICBcIlxcdTA0MzRcXHUwNDNlIFxcdTA0M2QuIFxcdTA0NGQuXCIsXG4gICAgICBcIlxcdTA0M2QuIFxcdTA0NGQuXCJcbiAgICBdLFxuICAgIFwiRklSU1REQVlPRldFRUtcIjogMCxcbiAgICBcIk1PTlRIXCI6IFtcbiAgICAgIFwiXFx1MDQ0ZlxcdTA0M2RcXHUwNDMyXFx1MDQzMFxcdTA0NDBcXHUwNDRmXCIsXG4gICAgICBcIlxcdTA0NDRcXHUwNDM1XFx1MDQzMlxcdTA0NDBcXHUwNDMwXFx1MDQzYlxcdTA0NGZcIixcbiAgICAgIFwiXFx1MDQzY1xcdTA0MzBcXHUwNDQwXFx1MDQ0MlxcdTA0MzBcIixcbiAgICAgIFwiXFx1MDQzMFxcdTA0M2ZcXHUwNDQwXFx1MDQzNVxcdTA0M2JcXHUwNDRmXCIsXG4gICAgICBcIlxcdTA0M2NcXHUwNDMwXFx1MDQ0ZlwiLFxuICAgICAgXCJcXHUwNDM4XFx1MDQ0ZVxcdTA0M2RcXHUwNDRmXCIsXG4gICAgICBcIlxcdTA0MzhcXHUwNDRlXFx1MDQzYlxcdTA0NGZcIixcbiAgICAgIFwiXFx1MDQzMFxcdTA0MzJcXHUwNDMzXFx1MDQ0M1xcdTA0NDFcXHUwNDQyXFx1MDQzMFwiLFxuICAgICAgXCJcXHUwNDQxXFx1MDQzNVxcdTA0M2RcXHUwNDQyXFx1MDQ0ZlxcdTA0MzFcXHUwNDQwXFx1MDQ0ZlwiLFxuICAgICAgXCJcXHUwNDNlXFx1MDQzYVxcdTA0NDJcXHUwNDRmXFx1MDQzMVxcdTA0NDBcXHUwNDRmXCIsXG4gICAgICBcIlxcdTA0M2RcXHUwNDNlXFx1MDQ0ZlxcdTA0MzFcXHUwNDQwXFx1MDQ0ZlwiLFxuICAgICAgXCJcXHUwNDM0XFx1MDQzNVxcdTA0M2FcXHUwNDMwXFx1MDQzMVxcdTA0NDBcXHUwNDRmXCJcbiAgICBdLFxuICAgIFwiU0hPUlREQVlcIjogW1xuICAgICAgXCJcXHUwNDMyXFx1MDQ0MVwiLFxuICAgICAgXCJcXHUwNDNmXFx1MDQzZFwiLFxuICAgICAgXCJcXHUwNDMyXFx1MDQ0MlwiLFxuICAgICAgXCJcXHUwNDQxXFx1MDQ0MFwiLFxuICAgICAgXCJcXHUwNDQ3XFx1MDQ0MlwiLFxuICAgICAgXCJcXHUwNDNmXFx1MDQ0MlwiLFxuICAgICAgXCJcXHUwNDQxXFx1MDQzMVwiXG4gICAgXSxcbiAgICBcIlNIT1JUTU9OVEhcIjogW1xuICAgICAgXCJcXHUwNDRmXFx1MDQzZFxcdTA0MzIuXCIsXG4gICAgICBcIlxcdTA0NDRcXHUwNDM1XFx1MDQzMlxcdTA0NDAuXCIsXG4gICAgICBcIlxcdTA0M2NcXHUwNDMwXFx1MDQ0MFxcdTA0NDJcXHUwNDMwXCIsXG4gICAgICBcIlxcdTA0MzBcXHUwNDNmXFx1MDQ0MC5cIixcbiAgICAgIFwiXFx1MDQzY1xcdTA0MzBcXHUwNDRmXCIsXG4gICAgICBcIlxcdTA0MzhcXHUwNDRlXFx1MDQzZFxcdTA0NGZcIixcbiAgICAgIFwiXFx1MDQzOFxcdTA0NGVcXHUwNDNiXFx1MDQ0ZlwiLFxuICAgICAgXCJcXHUwNDMwXFx1MDQzMlxcdTA0MzMuXCIsXG4gICAgICBcIlxcdTA0NDFcXHUwNDM1XFx1MDQzZFxcdTA0NDIuXCIsXG4gICAgICBcIlxcdTA0M2VcXHUwNDNhXFx1MDQ0Mi5cIixcbiAgICAgIFwiXFx1MDQzZFxcdTA0M2VcXHUwNDRmXFx1MDQzMS5cIixcbiAgICAgIFwiXFx1MDQzNFxcdTA0MzVcXHUwNDNhLlwiXG4gICAgXSxcbiAgICBcIlNUQU5EQUxPTkVNT05USFwiOiBbXG4gICAgICBcIlxcdTA0NGZcXHUwNDNkXFx1MDQzMlxcdTA0MzBcXHUwNDQwXFx1MDQ0Y1wiLFxuICAgICAgXCJcXHUwNDQ0XFx1MDQzNVxcdTA0MzJcXHUwNDQwXFx1MDQzMFxcdTA0M2JcXHUwNDRjXCIsXG4gICAgICBcIlxcdTA0M2NcXHUwNDMwXFx1MDQ0MFxcdTA0NDJcIixcbiAgICAgIFwiXFx1MDQzMFxcdTA0M2ZcXHUwNDQwXFx1MDQzNVxcdTA0M2JcXHUwNDRjXCIsXG4gICAgICBcIlxcdTA0M2NcXHUwNDMwXFx1MDQzOVwiLFxuICAgICAgXCJcXHUwNDM4XFx1MDQ0ZVxcdTA0M2RcXHUwNDRjXCIsXG4gICAgICBcIlxcdTA0MzhcXHUwNDRlXFx1MDQzYlxcdTA0NGNcIixcbiAgICAgIFwiXFx1MDQzMFxcdTA0MzJcXHUwNDMzXFx1MDQ0M1xcdTA0NDFcXHUwNDQyXCIsXG4gICAgICBcIlxcdTA0NDFcXHUwNDM1XFx1MDQzZFxcdTA0NDJcXHUwNDRmXFx1MDQzMVxcdTA0NDBcXHUwNDRjXCIsXG4gICAgICBcIlxcdTA0M2VcXHUwNDNhXFx1MDQ0MlxcdTA0NGZcXHUwNDMxXFx1MDQ0MFxcdTA0NGNcIixcbiAgICAgIFwiXFx1MDQzZFxcdTA0M2VcXHUwNDRmXFx1MDQzMVxcdTA0NDBcXHUwNDRjXCIsXG4gICAgICBcIlxcdTA0MzRcXHUwNDM1XFx1MDQzYVxcdTA0MzBcXHUwNDMxXFx1MDQ0MFxcdTA0NGNcIlxuICAgIF0sXG4gICAgXCJXRUVLRU5EUkFOR0VcIjogW1xuICAgICAgNSxcbiAgICAgIDZcbiAgICBdLFxuICAgIFwiZnVsbERhdGVcIjogXCJFRUVFLCBkIE1NTU0geSAnXFx1MDQzMycuXCIsXG4gICAgXCJsb25nRGF0ZVwiOiBcImQgTU1NTSB5ICdcXHUwNDMzJy5cIixcbiAgICBcIm1lZGl1bVwiOiBcImQgTU1NIHkgJ1xcdTA0MzMnLiBIOm1tOnNzXCIsXG4gICAgXCJtZWRpdW1EYXRlXCI6IFwiZCBNTU0geSAnXFx1MDQzMycuXCIsXG4gICAgXCJtZWRpdW1UaW1lXCI6IFwiSDptbTpzc1wiLFxuICAgIFwic2hvcnRcIjogXCJkZC5NTS55eSBIOm1tXCIsXG4gICAgXCJzaG9ydERhdGVcIjogXCJkZC5NTS55eVwiLFxuICAgIFwic2hvcnRUaW1lXCI6IFwiSDptbVwiXG4gIH0sXG4gIFwiTlVNQkVSX0ZPUk1BVFNcIjoge1xuICAgIFwiQ1VSUkVOQ1lfU1lNXCI6IFwiXFx1MDQ0MFxcdTA0NDNcXHUwNDMxLlwiLFxuICAgIFwiREVDSU1BTF9TRVBcIjogXCIsXCIsXG4gICAgXCJHUk9VUF9TRVBcIjogXCJcXHUwMGEwXCIsXG4gICAgXCJQQVRURVJOU1wiOiBbXG4gICAgICB7XG4gICAgICAgIFwiZ1NpemVcIjogMyxcbiAgICAgICAgXCJsZ1NpemVcIjogMyxcbiAgICAgICAgXCJtYXhGcmFjXCI6IDMsXG4gICAgICAgIFwibWluRnJhY1wiOiAwLFxuICAgICAgICBcIm1pbkludFwiOiAxLFxuICAgICAgICBcIm5lZ1ByZVwiOiBcIi1cIixcbiAgICAgICAgXCJuZWdTdWZcIjogXCJcIixcbiAgICAgICAgXCJwb3NQcmVcIjogXCJcIixcbiAgICAgICAgXCJwb3NTdWZcIjogXCJcIlxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgXCJnU2l6ZVwiOiAzLFxuICAgICAgICBcImxnU2l6ZVwiOiAzLFxuICAgICAgICBcIm1heEZyYWNcIjogMixcbiAgICAgICAgXCJtaW5GcmFjXCI6IDIsXG4gICAgICAgIFwibWluSW50XCI6IDEsXG4gICAgICAgIFwibmVnUHJlXCI6IFwiLVwiLFxuICAgICAgICBcIm5lZ1N1ZlwiOiBcIlxcdTAwYTBcXHUwMGE0XCIsXG4gICAgICAgIFwicG9zUHJlXCI6IFwiXCIsXG4gICAgICAgIFwicG9zU3VmXCI6IFwiXFx1MDBhMFxcdTAwYTRcIlxuICAgICAgfVxuICAgIF1cbiAgfSxcbiAgXCJpZFwiOiBcInJ1XCIsXG4gIFwibG9jYWxlSURcIjogXCJydVwiLFxuICBcInBsdXJhbENhdFwiOiBmdW5jdGlvbihuLCBvcHRfcHJlY2lzaW9uKSB7ICB2YXIgaSA9IG4gfCAwOyAgdmFyIHZmID0gZ2V0VkYobiwgb3B0X3ByZWNpc2lvbik7ICBpZiAodmYudiA9PSAwICYmIGkgJSAxMCA9PSAxICYmIGkgJSAxMDAgIT0gMTEpIHsgICAgcmV0dXJuIFBMVVJBTF9DQVRFR09SWS5PTkU7ICB9ICBpZiAodmYudiA9PSAwICYmIGkgJSAxMCA+PSAyICYmIGkgJSAxMCA8PSA0ICYmIChpICUgMTAwIDwgMTIgfHwgaSAlIDEwMCA+IDE0KSkgeyAgICByZXR1cm4gUExVUkFMX0NBVEVHT1JZLkZFVzsgIH0gIGlmICh2Zi52ID09IDAgJiYgaSAlIDEwID09IDAgfHwgdmYudiA9PSAwICYmIGkgJSAxMCA+PSA1ICYmIGkgJSAxMCA8PSA5IHx8IHZmLnYgPT0gMCAmJiBpICUgMTAwID49IDExICYmIGkgJSAxMDAgPD0gMTQpIHsgICAgcmV0dXJuIFBMVVJBTF9DQVRFR09SWS5NQU5ZOyAgfSAgcmV0dXJuIFBMVVJBTF9DQVRFR09SWS5PVEhFUjt9XG59KTtcbn1dKTtcbiIsIid1c2Ugc3RyaWN0JztcbmFuZ3VsYXIubW9kdWxlKFwibmdMb2NhbGVcIiwgW10sIFtcIiRwcm92aWRlXCIsIGZ1bmN0aW9uKCRwcm92aWRlKSB7XG52YXIgUExVUkFMX0NBVEVHT1JZID0ge1pFUk86IFwiemVyb1wiLCBPTkU6IFwib25lXCIsIFRXTzogXCJ0d29cIiwgRkVXOiBcImZld1wiLCBNQU5ZOiBcIm1hbnlcIiwgT1RIRVI6IFwib3RoZXJcIn07XG5mdW5jdGlvbiBnZXREZWNpbWFscyhuKSB7XG4gIG4gPSBuICsgJyc7XG4gIHZhciBpID0gbi5pbmRleE9mKCcuJyk7XG4gIHJldHVybiAoaSA9PSAtMSkgPyAwIDogbi5sZW5ndGggLSBpIC0gMTtcbn1cblxuZnVuY3Rpb24gZ2V0VkYobiwgb3B0X3ByZWNpc2lvbikge1xuICB2YXIgdiA9IG9wdF9wcmVjaXNpb247XG5cbiAgaWYgKHVuZGVmaW5lZCA9PT0gdikge1xuICAgIHYgPSBNYXRoLm1pbihnZXREZWNpbWFscyhuKSwgMyk7XG4gIH1cblxuICB2YXIgYmFzZSA9IE1hdGgucG93KDEwLCB2KTtcbiAgdmFyIGYgPSAoKG4gKiBiYXNlKSB8IDApICUgYmFzZTtcbiAgcmV0dXJuIHt2OiB2LCBmOiBmfTtcbn1cblxuJHByb3ZpZGUudmFsdWUoXCIkbG9jYWxlXCIsIHtcbiAgXCJEQVRFVElNRV9GT1JNQVRTXCI6IHtcbiAgICBcIkFNUE1TXCI6IFtcbiAgICAgIFwiXFx1MDQzNFxcdTA0M2ZcIixcbiAgICAgIFwiXFx1MDQzZlxcdTA0M2ZcIlxuICAgIF0sXG4gICAgXCJEQVlcIjogW1xuICAgICAgXCJcXHUwNDNkXFx1MDQzNVxcdTA0MzRcXHUwNDU2XFx1MDQzYlxcdTA0NGZcIixcbiAgICAgIFwiXFx1MDQzZlxcdTA0M2VcXHUwNDNkXFx1MDQzNVxcdTA0MzRcXHUwNDU2XFx1MDQzYlxcdTA0M2VcXHUwNDNhXCIsXG4gICAgICBcIlxcdTA0MzJcXHUwNDU2XFx1MDQzMlxcdTA0NDJcXHUwNDNlXFx1MDQ0MFxcdTA0M2VcXHUwNDNhXCIsXG4gICAgICBcIlxcdTA0NDFcXHUwNDM1XFx1MDQ0MFxcdTA0MzVcXHUwNDM0XFx1MDQzMFwiLFxuICAgICAgXCJcXHUwNDQ3XFx1MDQzNVxcdTA0NDJcXHUwNDMyXFx1MDQzNVxcdTA0NDBcIixcbiAgICAgIFwiXFx1MDQzZlxcdTAyYmNcXHUwNDRmXFx1MDQ0MlxcdTA0M2RcXHUwNDM4XFx1MDQ0NlxcdTA0NGZcIixcbiAgICAgIFwiXFx1MDQ0MVxcdTA0NDNcXHUwNDMxXFx1MDQzZVxcdTA0NDJcXHUwNDMwXCJcbiAgICBdLFxuICAgIFwiRVJBTkFNRVNcIjogW1xuICAgICAgXCJcXHUwNDM0XFx1MDQzZSBcXHUwNDNkXFx1MDQzMFxcdTA0NDhcXHUwNDNlXFx1MDQ1NyBcXHUwNDM1XFx1MDQ0MFxcdTA0MzhcIixcbiAgICAgIFwiXFx1MDQzZFxcdTA0MzBcXHUwNDQ4XFx1MDQzZVxcdTA0NTcgXFx1MDQzNVxcdTA0NDBcXHUwNDM4XCJcbiAgICBdLFxuICAgIFwiRVJBU1wiOiBbXG4gICAgICBcIlxcdTA0MzRcXHUwNDNlIFxcdTA0M2QuXFx1MDQzNS5cIixcbiAgICAgIFwiXFx1MDQzZC5cXHUwNDM1LlwiXG4gICAgXSxcbiAgICBcIkZJUlNUREFZT0ZXRUVLXCI6IDAsXG4gICAgXCJNT05USFwiOiBbXG4gICAgICBcIlxcdTA0NDFcXHUwNDU2XFx1MDQ0N1xcdTA0M2RcXHUwNDRmXCIsXG4gICAgICBcIlxcdTA0M2JcXHUwNDRlXFx1MDQ0MlxcdTA0M2VcXHUwNDMzXFx1MDQzZVwiLFxuICAgICAgXCJcXHUwNDMxXFx1MDQzNVxcdTA0NDBcXHUwNDM1XFx1MDQzN1xcdTA0M2RcXHUwNDRmXCIsXG4gICAgICBcIlxcdTA0M2FcXHUwNDMyXFx1MDQ1NlxcdTA0NDJcXHUwNDNkXFx1MDQ0ZlwiLFxuICAgICAgXCJcXHUwNDQyXFx1MDQ0MFxcdTA0MzBcXHUwNDMyXFx1MDQzZFxcdTA0NGZcIixcbiAgICAgIFwiXFx1MDQ0N1xcdTA0MzVcXHUwNDQwXFx1MDQzMlxcdTA0M2RcXHUwNDRmXCIsXG4gICAgICBcIlxcdTA0M2JcXHUwNDM4XFx1MDQzZlxcdTA0M2RcXHUwNDRmXCIsXG4gICAgICBcIlxcdTA0NDFcXHUwNDM1XFx1MDQ0MFxcdTA0M2ZcXHUwNDNkXFx1MDQ0ZlwiLFxuICAgICAgXCJcXHUwNDMyXFx1MDQzNVxcdTA0NDBcXHUwNDM1XFx1MDQ0MVxcdTA0M2RcXHUwNDRmXCIsXG4gICAgICBcIlxcdTA0MzZcXHUwNDNlXFx1MDQzMlxcdTA0NDJcXHUwNDNkXFx1MDQ0ZlwiLFxuICAgICAgXCJcXHUwNDNiXFx1MDQzOFxcdTA0NDFcXHUwNDQyXFx1MDQzZVxcdTA0M2ZcXHUwNDMwXFx1MDQzNFxcdTA0MzBcIixcbiAgICAgIFwiXFx1MDQzM1xcdTA0NDBcXHUwNDQzXFx1MDQzNFxcdTA0M2RcXHUwNDRmXCJcbiAgICBdLFxuICAgIFwiU0hPUlREQVlcIjogW1xuICAgICAgXCJcXHUwNDFkXFx1MDQzNFwiLFxuICAgICAgXCJcXHUwNDFmXFx1MDQzZFwiLFxuICAgICAgXCJcXHUwNDEyXFx1MDQ0MlwiLFxuICAgICAgXCJcXHUwNDIxXFx1MDQ0MFwiLFxuICAgICAgXCJcXHUwNDI3XFx1MDQ0MlwiLFxuICAgICAgXCJcXHUwNDFmXFx1MDQ0MlwiLFxuICAgICAgXCJcXHUwNDIxXFx1MDQzMVwiXG4gICAgXSxcbiAgICBcIlNIT1JUTU9OVEhcIjogW1xuICAgICAgXCJcXHUwNDQxXFx1MDQ1NlxcdTA0NDcuXCIsXG4gICAgICBcIlxcdTA0M2JcXHUwNDRlXFx1MDQ0Mi5cIixcbiAgICAgIFwiXFx1MDQzMVxcdTA0MzVcXHUwNDQwLlwiLFxuICAgICAgXCJcXHUwNDNhXFx1MDQzMlxcdTA0NTZcXHUwNDQyLlwiLFxuICAgICAgXCJcXHUwNDQyXFx1MDQ0MFxcdTA0MzBcXHUwNDMyLlwiLFxuICAgICAgXCJcXHUwNDQ3XFx1MDQzNVxcdTA0NDBcXHUwNDMyLlwiLFxuICAgICAgXCJcXHUwNDNiXFx1MDQzOFxcdTA0M2YuXCIsXG4gICAgICBcIlxcdTA0NDFcXHUwNDM1XFx1MDQ0MFxcdTA0M2YuXCIsXG4gICAgICBcIlxcdTA0MzJcXHUwNDM1XFx1MDQ0MC5cIixcbiAgICAgIFwiXFx1MDQzNlxcdTA0M2VcXHUwNDMyXFx1MDQ0Mi5cIixcbiAgICAgIFwiXFx1MDQzYlxcdTA0MzhcXHUwNDQxXFx1MDQ0Mi5cIixcbiAgICAgIFwiXFx1MDQzM1xcdTA0NDBcXHUwNDQzXFx1MDQzNC5cIlxuICAgIF0sXG4gICAgXCJTVEFOREFMT05FTU9OVEhcIjogW1xuICAgICAgXCJcXHUwNDIxXFx1MDQ1NlxcdTA0NDdcXHUwNDM1XFx1MDQzZFxcdTA0NGNcIixcbiAgICAgIFwiXFx1MDQxYlxcdTA0NGVcXHUwNDQyXFx1MDQzOFxcdTA0MzlcIixcbiAgICAgIFwiXFx1MDQxMVxcdTA0MzVcXHUwNDQwXFx1MDQzNVxcdTA0MzdcXHUwNDM1XFx1MDQzZFxcdTA0NGNcIixcbiAgICAgIFwiXFx1MDQxYVxcdTA0MzJcXHUwNDU2XFx1MDQ0MlxcdTA0MzVcXHUwNDNkXFx1MDQ0Y1wiLFxuICAgICAgXCJcXHUwNDIyXFx1MDQ0MFxcdTA0MzBcXHUwNDMyXFx1MDQzNVxcdTA0M2RcXHUwNDRjXCIsXG4gICAgICBcIlxcdTA0MjdcXHUwNDM1XFx1MDQ0MFxcdTA0MzJcXHUwNDM1XFx1MDQzZFxcdTA0NGNcIixcbiAgICAgIFwiXFx1MDQxYlxcdTA0MzhcXHUwNDNmXFx1MDQzNVxcdTA0M2RcXHUwNDRjXCIsXG4gICAgICBcIlxcdTA0MjFcXHUwNDM1XFx1MDQ0MFxcdTA0M2ZcXHUwNDM1XFx1MDQzZFxcdTA0NGNcIixcbiAgICAgIFwiXFx1MDQxMlxcdTA0MzVcXHUwNDQwXFx1MDQzNVxcdTA0NDFcXHUwNDM1XFx1MDQzZFxcdTA0NGNcIixcbiAgICAgIFwiXFx1MDQxNlxcdTA0M2VcXHUwNDMyXFx1MDQ0MlxcdTA0MzVcXHUwNDNkXFx1MDQ0Y1wiLFxuICAgICAgXCJcXHUwNDFiXFx1MDQzOFxcdTA0NDFcXHUwNDQyXFx1MDQzZVxcdTA0M2ZcXHUwNDMwXFx1MDQzNFwiLFxuICAgICAgXCJcXHUwNDEzXFx1MDQ0MFxcdTA0NDNcXHUwNDM0XFx1MDQzNVxcdTA0M2RcXHUwNDRjXCJcbiAgICBdLFxuICAgIFwiV0VFS0VORFJBTkdFXCI6IFtcbiAgICAgIDUsXG4gICAgICA2XG4gICAgXSxcbiAgICBcImZ1bGxEYXRlXCI6IFwiRUVFRSwgZCBNTU1NIHkgJ1xcdTA0NDAnLlwiLFxuICAgIFwibG9uZ0RhdGVcIjogXCJkIE1NTU0geSAnXFx1MDQ0MCcuXCIsXG4gICAgXCJtZWRpdW1cIjogXCJkIE1NTSB5ICdcXHUwNDQwJy4gSEg6bW06c3NcIixcbiAgICBcIm1lZGl1bURhdGVcIjogXCJkIE1NTSB5ICdcXHUwNDQwJy5cIixcbiAgICBcIm1lZGl1bVRpbWVcIjogXCJISDptbTpzc1wiLFxuICAgIFwic2hvcnRcIjogXCJkZC5NTS55eSBISDptbVwiLFxuICAgIFwic2hvcnREYXRlXCI6IFwiZGQuTU0ueXlcIixcbiAgICBcInNob3J0VGltZVwiOiBcIkhIOm1tXCJcbiAgfSxcbiAgXCJOVU1CRVJfRk9STUFUU1wiOiB7XG4gICAgXCJDVVJSRU5DWV9TWU1cIjogXCJcXHUyMGI0XCIsXG4gICAgXCJERUNJTUFMX1NFUFwiOiBcIixcIixcbiAgICBcIkdST1VQX1NFUFwiOiBcIlxcdTAwYTBcIixcbiAgICBcIlBBVFRFUk5TXCI6IFtcbiAgICAgIHtcbiAgICAgICAgXCJnU2l6ZVwiOiAzLFxuICAgICAgICBcImxnU2l6ZVwiOiAzLFxuICAgICAgICBcIm1heEZyYWNcIjogMyxcbiAgICAgICAgXCJtaW5GcmFjXCI6IDAsXG4gICAgICAgIFwibWluSW50XCI6IDEsXG4gICAgICAgIFwibmVnUHJlXCI6IFwiLVwiLFxuICAgICAgICBcIm5lZ1N1ZlwiOiBcIlwiLFxuICAgICAgICBcInBvc1ByZVwiOiBcIlwiLFxuICAgICAgICBcInBvc1N1ZlwiOiBcIlwiXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBcImdTaXplXCI6IDMsXG4gICAgICAgIFwibGdTaXplXCI6IDMsXG4gICAgICAgIFwibWF4RnJhY1wiOiAyLFxuICAgICAgICBcIm1pbkZyYWNcIjogMixcbiAgICAgICAgXCJtaW5JbnRcIjogMSxcbiAgICAgICAgXCJuZWdQcmVcIjogXCItXCIsXG4gICAgICAgIFwibmVnU3VmXCI6IFwiXFx1MDBhMFxcdTAwYTRcIixcbiAgICAgICAgXCJwb3NQcmVcIjogXCJcIixcbiAgICAgICAgXCJwb3NTdWZcIjogXCJcXHUwMGEwXFx1MDBhNFwiXG4gICAgICB9XG4gICAgXVxuICB9LFxuICBcImlkXCI6IFwidWstdWFcIixcbiAgXCJsb2NhbGVJRFwiOiBcInVrX1VBXCIsXG4gIFwicGx1cmFsQ2F0XCI6IGZ1bmN0aW9uKG4sIG9wdF9wcmVjaXNpb24pIHsgIHZhciBpID0gbiB8IDA7ICB2YXIgdmYgPSBnZXRWRihuLCBvcHRfcHJlY2lzaW9uKTsgIGlmICh2Zi52ID09IDAgJiYgaSAlIDEwID09IDEgJiYgaSAlIDEwMCAhPSAxMSkgeyAgICByZXR1cm4gUExVUkFMX0NBVEVHT1JZLk9ORTsgIH0gIGlmICh2Zi52ID09IDAgJiYgaSAlIDEwID49IDIgJiYgaSAlIDEwIDw9IDQgJiYgKGkgJSAxMDAgPCAxMiB8fCBpICUgMTAwID4gMTQpKSB7ICAgIHJldHVybiBQTFVSQUxfQ0FURUdPUlkuRkVXOyAgfSAgaWYgKHZmLnYgPT0gMCAmJiBpICUgMTAgPT0gMCB8fCB2Zi52ID09IDAgJiYgaSAlIDEwID49IDUgJiYgaSAlIDEwIDw9IDkgfHwgdmYudiA9PSAwICYmIGkgJSAxMDAgPj0gMTEgJiYgaSAlIDEwMCA8PSAxNCkgeyAgICByZXR1cm4gUExVUkFMX0NBVEVHT1JZLk1BTlk7ICB9ICByZXR1cm4gUExVUkFMX0NBVEVHT1JZLk9USEVSO31cbn0pO1xufV0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuYW5ndWxhci5tb2R1bGUoXCJuZ0xvY2FsZVwiLCBbXSwgW1wiJHByb3ZpZGVcIiwgZnVuY3Rpb24oJHByb3ZpZGUpIHtcbnZhciBQTFVSQUxfQ0FURUdPUlkgPSB7WkVSTzogXCJ6ZXJvXCIsIE9ORTogXCJvbmVcIiwgVFdPOiBcInR3b1wiLCBGRVc6IFwiZmV3XCIsIE1BTlk6IFwibWFueVwiLCBPVEhFUjogXCJvdGhlclwifTtcbmZ1bmN0aW9uIGdldERlY2ltYWxzKG4pIHtcbiAgbiA9IG4gKyAnJztcbiAgdmFyIGkgPSBuLmluZGV4T2YoJy4nKTtcbiAgcmV0dXJuIChpID09IC0xKSA/IDAgOiBuLmxlbmd0aCAtIGkgLSAxO1xufVxuXG5mdW5jdGlvbiBnZXRWRihuLCBvcHRfcHJlY2lzaW9uKSB7XG4gIHZhciB2ID0gb3B0X3ByZWNpc2lvbjtcblxuICBpZiAodW5kZWZpbmVkID09PSB2KSB7XG4gICAgdiA9IE1hdGgubWluKGdldERlY2ltYWxzKG4pLCAzKTtcbiAgfVxuXG4gIHZhciBiYXNlID0gTWF0aC5wb3coMTAsIHYpO1xuICB2YXIgZiA9ICgobiAqIGJhc2UpIHwgMCkgJSBiYXNlO1xuICByZXR1cm4ge3Y6IHYsIGY6IGZ9O1xufVxuXG4kcHJvdmlkZS52YWx1ZShcIiRsb2NhbGVcIiwge1xuICBcIkRBVEVUSU1FX0ZPUk1BVFNcIjoge1xuICAgIFwiQU1QTVNcIjogW1xuICAgICAgXCJcXHUwNDM0XFx1MDQzZlwiLFxuICAgICAgXCJcXHUwNDNmXFx1MDQzZlwiXG4gICAgXSxcbiAgICBcIkRBWVwiOiBbXG4gICAgICBcIlxcdTA0M2RcXHUwNDM1XFx1MDQzNFxcdTA0NTZcXHUwNDNiXFx1MDQ0ZlwiLFxuICAgICAgXCJcXHUwNDNmXFx1MDQzZVxcdTA0M2RcXHUwNDM1XFx1MDQzNFxcdTA0NTZcXHUwNDNiXFx1MDQzZVxcdTA0M2FcIixcbiAgICAgIFwiXFx1MDQzMlxcdTA0NTZcXHUwNDMyXFx1MDQ0MlxcdTA0M2VcXHUwNDQwXFx1MDQzZVxcdTA0M2FcIixcbiAgICAgIFwiXFx1MDQ0MVxcdTA0MzVcXHUwNDQwXFx1MDQzNVxcdTA0MzRcXHUwNDMwXCIsXG4gICAgICBcIlxcdTA0NDdcXHUwNDM1XFx1MDQ0MlxcdTA0MzJcXHUwNDM1XFx1MDQ0MFwiLFxuICAgICAgXCJcXHUwNDNmXFx1MDJiY1xcdTA0NGZcXHUwNDQyXFx1MDQzZFxcdTA0MzhcXHUwNDQ2XFx1MDQ0ZlwiLFxuICAgICAgXCJcXHUwNDQxXFx1MDQ0M1xcdTA0MzFcXHUwNDNlXFx1MDQ0MlxcdTA0MzBcIlxuICAgIF0sXG4gICAgXCJFUkFOQU1FU1wiOiBbXG4gICAgICBcIlxcdTA0MzRcXHUwNDNlIFxcdTA0M2RcXHUwNDMwXFx1MDQ0OFxcdTA0M2VcXHUwNDU3IFxcdTA0MzVcXHUwNDQwXFx1MDQzOFwiLFxuICAgICAgXCJcXHUwNDNkXFx1MDQzMFxcdTA0NDhcXHUwNDNlXFx1MDQ1NyBcXHUwNDM1XFx1MDQ0MFxcdTA0MzhcIlxuICAgIF0sXG4gICAgXCJFUkFTXCI6IFtcbiAgICAgIFwiXFx1MDQzNFxcdTA0M2UgXFx1MDQzZC5cXHUwNDM1LlwiLFxuICAgICAgXCJcXHUwNDNkLlxcdTA0MzUuXCJcbiAgICBdLFxuICAgIFwiRklSU1REQVlPRldFRUtcIjogMCxcbiAgICBcIk1PTlRIXCI6IFtcbiAgICAgIFwiXFx1MDQ0MVxcdTA0NTZcXHUwNDQ3XFx1MDQzZFxcdTA0NGZcIixcbiAgICAgIFwiXFx1MDQzYlxcdTA0NGVcXHUwNDQyXFx1MDQzZVxcdTA0MzNcXHUwNDNlXCIsXG4gICAgICBcIlxcdTA0MzFcXHUwNDM1XFx1MDQ0MFxcdTA0MzVcXHUwNDM3XFx1MDQzZFxcdTA0NGZcIixcbiAgICAgIFwiXFx1MDQzYVxcdTA0MzJcXHUwNDU2XFx1MDQ0MlxcdTA0M2RcXHUwNDRmXCIsXG4gICAgICBcIlxcdTA0NDJcXHUwNDQwXFx1MDQzMFxcdTA0MzJcXHUwNDNkXFx1MDQ0ZlwiLFxuICAgICAgXCJcXHUwNDQ3XFx1MDQzNVxcdTA0NDBcXHUwNDMyXFx1MDQzZFxcdTA0NGZcIixcbiAgICAgIFwiXFx1MDQzYlxcdTA0MzhcXHUwNDNmXFx1MDQzZFxcdTA0NGZcIixcbiAgICAgIFwiXFx1MDQ0MVxcdTA0MzVcXHUwNDQwXFx1MDQzZlxcdTA0M2RcXHUwNDRmXCIsXG4gICAgICBcIlxcdTA0MzJcXHUwNDM1XFx1MDQ0MFxcdTA0MzVcXHUwNDQxXFx1MDQzZFxcdTA0NGZcIixcbiAgICAgIFwiXFx1MDQzNlxcdTA0M2VcXHUwNDMyXFx1MDQ0MlxcdTA0M2RcXHUwNDRmXCIsXG4gICAgICBcIlxcdTA0M2JcXHUwNDM4XFx1MDQ0MVxcdTA0NDJcXHUwNDNlXFx1MDQzZlxcdTA0MzBcXHUwNDM0XFx1MDQzMFwiLFxuICAgICAgXCJcXHUwNDMzXFx1MDQ0MFxcdTA0NDNcXHUwNDM0XFx1MDQzZFxcdTA0NGZcIlxuICAgIF0sXG4gICAgXCJTSE9SVERBWVwiOiBbXG4gICAgICBcIlxcdTA0MWRcXHUwNDM0XCIsXG4gICAgICBcIlxcdTA0MWZcXHUwNDNkXCIsXG4gICAgICBcIlxcdTA0MTJcXHUwNDQyXCIsXG4gICAgICBcIlxcdTA0MjFcXHUwNDQwXCIsXG4gICAgICBcIlxcdTA0MjdcXHUwNDQyXCIsXG4gICAgICBcIlxcdTA0MWZcXHUwNDQyXCIsXG4gICAgICBcIlxcdTA0MjFcXHUwNDMxXCJcbiAgICBdLFxuICAgIFwiU0hPUlRNT05USFwiOiBbXG4gICAgICBcIlxcdTA0NDFcXHUwNDU2XFx1MDQ0Ny5cIixcbiAgICAgIFwiXFx1MDQzYlxcdTA0NGVcXHUwNDQyLlwiLFxuICAgICAgXCJcXHUwNDMxXFx1MDQzNVxcdTA0NDAuXCIsXG4gICAgICBcIlxcdTA0M2FcXHUwNDMyXFx1MDQ1NlxcdTA0NDIuXCIsXG4gICAgICBcIlxcdTA0NDJcXHUwNDQwXFx1MDQzMFxcdTA0MzIuXCIsXG4gICAgICBcIlxcdTA0NDdcXHUwNDM1XFx1MDQ0MFxcdTA0MzIuXCIsXG4gICAgICBcIlxcdTA0M2JcXHUwNDM4XFx1MDQzZi5cIixcbiAgICAgIFwiXFx1MDQ0MVxcdTA0MzVcXHUwNDQwXFx1MDQzZi5cIixcbiAgICAgIFwiXFx1MDQzMlxcdTA0MzVcXHUwNDQwLlwiLFxuICAgICAgXCJcXHUwNDM2XFx1MDQzZVxcdTA0MzJcXHUwNDQyLlwiLFxuICAgICAgXCJcXHUwNDNiXFx1MDQzOFxcdTA0NDFcXHUwNDQyLlwiLFxuICAgICAgXCJcXHUwNDMzXFx1MDQ0MFxcdTA0NDNcXHUwNDM0LlwiXG4gICAgXSxcbiAgICBcIlNUQU5EQUxPTkVNT05USFwiOiBbXG4gICAgICBcIlxcdTA0MjFcXHUwNDU2XFx1MDQ0N1xcdTA0MzVcXHUwNDNkXFx1MDQ0Y1wiLFxuICAgICAgXCJcXHUwNDFiXFx1MDQ0ZVxcdTA0NDJcXHUwNDM4XFx1MDQzOVwiLFxuICAgICAgXCJcXHUwNDExXFx1MDQzNVxcdTA0NDBcXHUwNDM1XFx1MDQzN1xcdTA0MzVcXHUwNDNkXFx1MDQ0Y1wiLFxuICAgICAgXCJcXHUwNDFhXFx1MDQzMlxcdTA0NTZcXHUwNDQyXFx1MDQzNVxcdTA0M2RcXHUwNDRjXCIsXG4gICAgICBcIlxcdTA0MjJcXHUwNDQwXFx1MDQzMFxcdTA0MzJcXHUwNDM1XFx1MDQzZFxcdTA0NGNcIixcbiAgICAgIFwiXFx1MDQyN1xcdTA0MzVcXHUwNDQwXFx1MDQzMlxcdTA0MzVcXHUwNDNkXFx1MDQ0Y1wiLFxuICAgICAgXCJcXHUwNDFiXFx1MDQzOFxcdTA0M2ZcXHUwNDM1XFx1MDQzZFxcdTA0NGNcIixcbiAgICAgIFwiXFx1MDQyMVxcdTA0MzVcXHUwNDQwXFx1MDQzZlxcdTA0MzVcXHUwNDNkXFx1MDQ0Y1wiLFxuICAgICAgXCJcXHUwNDEyXFx1MDQzNVxcdTA0NDBcXHUwNDM1XFx1MDQ0MVxcdTA0MzVcXHUwNDNkXFx1MDQ0Y1wiLFxuICAgICAgXCJcXHUwNDE2XFx1MDQzZVxcdTA0MzJcXHUwNDQyXFx1MDQzNVxcdTA0M2RcXHUwNDRjXCIsXG4gICAgICBcIlxcdTA0MWJcXHUwNDM4XFx1MDQ0MVxcdTA0NDJcXHUwNDNlXFx1MDQzZlxcdTA0MzBcXHUwNDM0XCIsXG4gICAgICBcIlxcdTA0MTNcXHUwNDQwXFx1MDQ0M1xcdTA0MzRcXHUwNDM1XFx1MDQzZFxcdTA0NGNcIlxuICAgIF0sXG4gICAgXCJXRUVLRU5EUkFOR0VcIjogW1xuICAgICAgNSxcbiAgICAgIDZcbiAgICBdLFxuICAgIFwiZnVsbERhdGVcIjogXCJFRUVFLCBkIE1NTU0geSAnXFx1MDQ0MCcuXCIsXG4gICAgXCJsb25nRGF0ZVwiOiBcImQgTU1NTSB5ICdcXHUwNDQwJy5cIixcbiAgICBcIm1lZGl1bVwiOiBcImQgTU1NIHkgJ1xcdTA0NDAnLiBISDptbTpzc1wiLFxuICAgIFwibWVkaXVtRGF0ZVwiOiBcImQgTU1NIHkgJ1xcdTA0NDAnLlwiLFxuICAgIFwibWVkaXVtVGltZVwiOiBcIkhIOm1tOnNzXCIsXG4gICAgXCJzaG9ydFwiOiBcImRkLk1NLnl5IEhIOm1tXCIsXG4gICAgXCJzaG9ydERhdGVcIjogXCJkZC5NTS55eVwiLFxuICAgIFwic2hvcnRUaW1lXCI6IFwiSEg6bW1cIlxuICB9LFxuICBcIk5VTUJFUl9GT1JNQVRTXCI6IHtcbiAgICBcIkNVUlJFTkNZX1NZTVwiOiBcIlxcdTIwYjRcIixcbiAgICBcIkRFQ0lNQUxfU0VQXCI6IFwiLFwiLFxuICAgIFwiR1JPVVBfU0VQXCI6IFwiXFx1MDBhMFwiLFxuICAgIFwiUEFUVEVSTlNcIjogW1xuICAgICAge1xuICAgICAgICBcImdTaXplXCI6IDMsXG4gICAgICAgIFwibGdTaXplXCI6IDMsXG4gICAgICAgIFwibWF4RnJhY1wiOiAzLFxuICAgICAgICBcIm1pbkZyYWNcIjogMCxcbiAgICAgICAgXCJtaW5JbnRcIjogMSxcbiAgICAgICAgXCJuZWdQcmVcIjogXCItXCIsXG4gICAgICAgIFwibmVnU3VmXCI6IFwiXCIsXG4gICAgICAgIFwicG9zUHJlXCI6IFwiXCIsXG4gICAgICAgIFwicG9zU3VmXCI6IFwiXCJcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIFwiZ1NpemVcIjogMyxcbiAgICAgICAgXCJsZ1NpemVcIjogMyxcbiAgICAgICAgXCJtYXhGcmFjXCI6IDIsXG4gICAgICAgIFwibWluRnJhY1wiOiAyLFxuICAgICAgICBcIm1pbkludFwiOiAxLFxuICAgICAgICBcIm5lZ1ByZVwiOiBcIi1cIixcbiAgICAgICAgXCJuZWdTdWZcIjogXCJcXHUwMGEwXFx1MDBhNFwiLFxuICAgICAgICBcInBvc1ByZVwiOiBcIlwiLFxuICAgICAgICBcInBvc1N1ZlwiOiBcIlxcdTAwYTBcXHUwMGE0XCJcbiAgICAgIH1cbiAgICBdXG4gIH0sXG4gIFwiaWRcIjogXCJ1a1wiLFxuICBcImxvY2FsZUlEXCI6IFwidWtcIixcbiAgXCJwbHVyYWxDYXRcIjogZnVuY3Rpb24obiwgb3B0X3ByZWNpc2lvbikgeyAgdmFyIGkgPSBuIHwgMDsgIHZhciB2ZiA9IGdldFZGKG4sIG9wdF9wcmVjaXNpb24pOyAgaWYgKHZmLnYgPT0gMCAmJiBpICUgMTAgPT0gMSAmJiBpICUgMTAwICE9IDExKSB7ICAgIHJldHVybiBQTFVSQUxfQ0FURUdPUlkuT05FOyAgfSAgaWYgKHZmLnYgPT0gMCAmJiBpICUgMTAgPj0gMiAmJiBpICUgMTAgPD0gNCAmJiAoaSAlIDEwMCA8IDEyIHx8IGkgJSAxMDAgPiAxNCkpIHsgICAgcmV0dXJuIFBMVVJBTF9DQVRFR09SWS5GRVc7ICB9ICBpZiAodmYudiA9PSAwICYmIGkgJSAxMCA9PSAwIHx8IHZmLnYgPT0gMCAmJiBpICUgMTAgPj0gNSAmJiBpICUgMTAgPD0gOSB8fCB2Zi52ID09IDAgJiYgaSAlIDEwMCA+PSAxMSAmJiBpICUgMTAwIDw9IDE0KSB7ICAgIHJldHVybiBQTFVSQUxfQ0FURUdPUlkuTUFOWTsgIH0gIHJldHVybiBQTFVSQUxfQ0FURUdPUlkuT1RIRVI7fVxufSk7XG59XSk7XG4iLCIoZnVuY3Rpb24oKXtcblxuXHQndXNlIHN0cmljdCc7XG5cblx0YW5ndWxhclxuXHRcdC5tb2R1bGUoJ2FwcC5sYXlvdXQnKVxuXHRcdC5kaXJlY3RpdmUoJ2xhbmdOYXYnLCBsYW5nTmF2KTtcblxuXHRmdW5jdGlvbiBsYW5nTmF2KCl7XG5cblx0XHRyZXR1cm4ge1xuXHRcdFx0cmVzdHJpY3Q6ICdBRScsXG5cdFx0XHR0cmFuc2NsdWRlOiB0cnVlLFxuXHRcdFx0Y29udHJvbGxlcjogJ0xhbmdDb250cm9sbGVyJyxcblx0XHRcdGNvbnRyb2xsZXJBczogJ2xhbmdWbScsXG5cdFx0XHR0ZW1wbGF0ZVVybDogJ2xheW91dC9sYW5nbmF2L2xhbmduYXYuaHRtbCdcblx0XHR9O1xuXG5cdH1cblxufSkoKTsiLCIoZnVuY3Rpb24oKXtcblxuXHQndXNlIHN0cmljdCc7XG5cblx0YW5ndWxhclxuXHRcdC5tb2R1bGUoJ2FwcC5sYXlvdXQnKVxuXHRcdC5jb250cm9sbGVyKCdMYW5nQ29udHJvbGxlcicsIExhbmdDb250cm9sbGVyKTtcblxuXHRMYW5nQ29udHJvbGxlci4kaW5qZWN0ID0gWyckbG9jYWxTdG9yYWdlJywgJyRyb290U2NvcGUnLCAnJHNjb3BlJywgJyR0cmFuc2xhdGUnLCAnYXBpU2VydmljZScsICdhdXRoU2VydmljZScsICd0bWhEeW5hbWljTG9jYWxlJ107XG5cblx0ZnVuY3Rpb24gTGFuZ0NvbnRyb2xsZXIoJGxvY2FsU3RvcmFnZSwgJHJvb3RTY29wZSwgJHNjb3BlLCAkdHJhbnNsYXRlLCBhcGksIGF1dGhTZXJ2aWNlLCB0bWhEeW5hbWljTG9jYWxlKSB7XG5cblx0XHR2YXIgdm0gPSB0aGlzO1xuXHRcdHZtLmNoYW5nZUxhbmd1YWdlID0gY2hhbmdlTGFuZ3VhZ2U7XG5cblx0XHR0bWhEeW5hbWljTG9jYWxlLnNldCgkbG9jYWxTdG9yYWdlLk5HX1RSQU5TTEFURV9MQU5HX0tFWSB8fCAnZW4nKTtcblx0XHRcblx0XHRmdW5jdGlvbiBjaGFuZ2VMYW5ndWFnZShsYW5nS2V5KSB7XG5cdFx0XHQkdHJhbnNsYXRlLnVzZShsYW5nS2V5KTtcblx0XHRcdGlmKCFhdXRoU2VydmljZS5pc0xvZ2dlZEluKCkpIHtcblx0XHRcdFx0JHJvb3RTY29wZS4kZW1pdCgnbGFuZy5jaGFuZ2UnLCB7IGxhbmc6IGxhbmdLZXkgfSk7XG5cdFx0XHRcdCRzY29wZS5sYXlvdXRWbS50cmlnZ2VyTGFuZ01lbnUoKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGFwaS5yZXF1ZXN0KHtcblx0XHRcdFx0XHR1cmw6ICdzZXRDdXN0b21lckxhbmcnLFxuXHRcdFx0XHRcdHBhcmFtczoge1xuXHRcdFx0XHRcdFx0bGFuZzogbGFuZ0tleVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSkudGhlbihmdW5jdGlvbiAocmVzKXtcblx0XHRcdFx0XHRpZighcmVzLmRhdGEuc3VjY2VzcykgcmV0dXJuIGVycm9yU2VydmljZS5zaG93KHJlcy5kYXRhLm1lc3NhZ2UpO1xuXHRcdFx0XHRcdFxuXHRcdFx0XHRcdCRyb290U2NvcGUuJGVtaXQoJ2xhbmcuY2hhbmdlJywgeyBsYW5nOiBsYW5nS2V5IH0pO1xuXHRcdFx0XHRcdCRzY29wZS5sYXlvdXRWbS50cmlnZ2VyTGFuZ01lbnUoKTtcblx0XHRcdFx0fSwgZnVuY3Rpb24gKGVycil7XG5cdFx0XHRcdFx0ZXJyb3JTZXJ2aWNlLnNob3coZXJyKTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cblx0XHRcdHRtaER5bmFtaWNMb2NhbGUuc2V0KGxhbmdLZXkpO1xuXHRcdH1cblxuXHR9XG5cbn0pKCk7IiwiKGZ1bmN0aW9uKCl7XG5cblx0J3VzZSBzdHJpY3QnO1xuXG5cdGFuZ3VsYXJcblx0XHQubW9kdWxlKCdhcHAubGF5b3V0Jylcblx0XHQuY29udHJvbGxlcignRm9vdGVyQ29udHJvbGxlcicsIEZvb3RlckNvbnRyb2xsZXIpO1xuXG5cdEZvb3RlckNvbnRyb2xsZXIuJGluamVjdCA9IFsnJHJvb3RTY29wZSddO1xuXG5cdGZ1bmN0aW9uIEZvb3RlckNvbnRyb2xsZXIoJHJvb3RTY29wZSkge1xuXG5cdFx0dmFyIHZtID0gdGhpcztcblx0XHQvLyB2bS5mb290ZXIgPSB0cnVlO1xuXHRcdFxuXHR9XG5cbn0pKCk7IiwiKGZ1bmN0aW9uKCl7XG5cblx0J3VzZSBzdHJpY3QnO1xuXG5cdGFuZ3VsYXJcblx0XHQubW9kdWxlKCdhcHAubGF5b3V0Jylcblx0XHQuZGlyZWN0aXZlKCdmb290ZXInLCBmb290ZXIpO1xuXG5cdGZ1bmN0aW9uIGZvb3Rlcigpe1xuXG5cdFx0cmV0dXJuIHtcblx0XHRcdHJlc3RyaWN0OiAnQUUnLFxuXHRcdFx0dHJhbnNjbHVkZTogdHJ1ZSxcblx0XHRcdGNvbnRyb2xsZXI6ICdGb290ZXJDb250cm9sbGVyJyxcblx0XHRcdGNvbnRyb2xsZXJBczogJ2Zvb3RlclZtJyxcblx0XHRcdHRlbXBsYXRlVXJsOiAnbGF5b3V0L2Zvb3Rlci9mb290ZXIuaHRtbCdcblx0XHR9O1xuXG5cdH1cblxufSkoKTsiLCIoZnVuY3Rpb24oKXtcblxuXHQndXNlIHN0cmljdCc7XG5cblx0YW5ndWxhclxuXHRcdC5tb2R1bGUoJ2FwcC5jb3JlJylcblx0XHQuY29udHJvbGxlcignU3Bpbm5lckNvbnRyb2xsZXInLCBTcGlubmVyQ29udHJvbGxlcik7XG5cblx0U3Bpbm5lckNvbnRyb2xsZXIuJGluamVjdCA9IFsnc3Bpbm5lclNlcnZpY2UnXTtcblxuXHRmdW5jdGlvbiBTcGlubmVyQ29udHJvbGxlcihzcGlubmVyU2VydmljZSkge1xuXG5cdFx0dmFyIHZtID0gdGhpcztcblxuXHRcdC8vIERlY2xhcmUgYSBtaW5pLUFQSSB0byBoYW5kIG9mZiB0byBvdXIgc2VydmljZSBzbyB0aGUgc2VydmljZVxuXHRcdC8vIGRvZXNuJ3QgaGF2ZSBhIGRpcmVjdCByZWZlcmVuY2UgdG8gdGhpcyBkaXJlY3RpdmUncyBzY29wZS5cblx0XHR2YXIgYXBpID0ge1xuXHRcdFx0bmFtZTogdm0ubmFtZSxcblx0XHRcdGdyb3VwOiB2bS5ncm91cCxcblx0XHRcdHNob3c6IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0dm0uc2hvdyA9IHRydWU7XG5cdFx0XHR9LFxuXHRcdFx0aGlkZTogZnVuY3Rpb24gKCkge1xuXHRcdFx0XHR2bS5zaG93ID0gZmFsc2U7XG5cdFx0XHR9LFxuXHRcdFx0dG9nZ2xlOiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdHZtLnNob3cgPSAhdm0uc2hvdztcblx0XHRcdH1cblx0XHR9O1xuXG5cdFx0Ly8gcmVnaXN0ZXIgc2hvdWxkIGJlIHRydWUgYnkgZGVmYXVsdCBpZiBub3Qgc3BlY2lmaWVkLlxuXHRcdGlmICghdm0uaGFzT3duUHJvcGVydHkoJ3JlZ2lzdGVyJykpIHtcblx0XHRcdHZtLnJlZ2lzdGVyID0gdHJ1ZTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0dm0ucmVnaXN0ZXIgPSB2bS5yZWdpc3Rlci50b0xvd2VyQ2FzZSgpID09PSAnZmFsc2UnID8gZmFsc2UgOiB0cnVlO1xuXHRcdH1cblxuXHRcdC8vIFJlZ2lzdGVyIHRoaXMgc3Bpbm5lciB3aXRoIHRoZSBzcGlubmVyIHNlcnZpY2UuXG5cdFx0aWYgKHZtLnJlZ2lzdGVyID09PSB0cnVlKSB7XG5cdFx0XHRzcGlubmVyU2VydmljZS5fcmVnaXN0ZXIoYXBpKTtcblx0XHR9XG5cblx0XHQvLyBJZiBhbiBvblNob3cgb3Igb25IaWRlIGV4cHJlc3Npb24gd2FzIHByb3ZpZGVkLCByZWdpc3RlciBhIHdhdGNoZXJcblx0XHQvLyB0aGF0IHdpbGwgZmlyZSB0aGUgcmVsZXZhbnQgZXhwcmVzc2lvbiB3aGVuIHNob3cncyB2YWx1ZSBjaGFuZ2VzLlxuXHRcdGlmICh2bS5vblNob3cgfHwgdm0ub25IaWRlKSB7XG5cdFx0XHQkc2NvcGUuJHdhdGNoKCdzaG93JywgZnVuY3Rpb24gKHNob3cpIHtcblx0XHRcdFx0aWYgKHNob3cgJiYgdm0ub25TaG93KSB7XG5cdFx0XHRcdFx0dm0ub25TaG93KHsgc3Bpbm5lclNlcnZpY2U6IHNwaW5uZXJTZXJ2aWNlLCBzcGlubmVyQXBpOiBhcGkgfSk7XG5cdFx0XHRcdH0gZWxzZSBpZiAoIXNob3cgJiYgdm0ub25IaWRlKSB7XG5cdFx0XHRcdFx0dm0ub25IaWRlKHsgc3Bpbm5lclNlcnZpY2U6IHNwaW5uZXJTZXJ2aWNlLCBzcGlubmVyQXBpOiBhcGkgfSk7XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXHRcdH1cblxuXHRcdC8vIFRoaXMgc3Bpbm5lciBpcyBnb29kIHRvIGdvLiBGaXJlIHRoZSBvbkxvYWRlZCBleHByZXNzaW9uLlxuXHRcdGlmICh2bS5vbkxvYWRlZCkge1xuXHRcdFx0dm0ub25Mb2FkZWQoeyBzcGlubmVyU2VydmljZTogc3Bpbm5lclNlcnZpY2UsIHNwaW5uZXJBcGk6IGFwaSB9KTtcblx0XHR9XG5cblx0fVxuXG59KSgpOyIsIihmdW5jdGlvbigpe1xuXG5cdCd1c2Ugc3RyaWN0JztcblxuXHRhbmd1bGFyXG5cdFx0Lm1vZHVsZSgnYXBwJylcblx0XHQuZGlyZWN0aXZlKCdzcGlubmVyJywgc3Bpbm5lcik7XG5cblx0ZnVuY3Rpb24gc3Bpbm5lcigpe1xuXG5cdFx0cmV0dXJuIHtcblx0XHRcdHJlc3RyaWN0OiAnQUUnLFxuXHRcdFx0cmVwbGFjZTogdHJ1ZSxcblx0XHRcdHRyYW5zY2x1ZGU6IHRydWUsXG5cdFx0XHRzY29wZToge1xuXHRcdFx0XHRuYW1lOiAnQD8nLFxuXHRcdFx0XHRncm91cDogJ0A/Jyxcblx0XHRcdFx0c2hvdzogJz0/Jyxcblx0XHRcdFx0aW1nU3JjOiAnQD8nLFxuXHRcdFx0XHRyZWdpc3RlcjogJ0A/Jyxcblx0XHRcdFx0b25Mb2FkZWQ6ICcmPycsXG5cdFx0XHRcdG9uU2hvdzogJyY/Jyxcblx0XHRcdFx0b25IaWRlOiAnJj8nXG5cdFx0XHR9LFxuXHRcdFx0dGVtcGxhdGU6IFtcblx0XHRcdFx0JzxkaXYgbmctc2hvdz1cInNwaW5uZXJWbS5zaG93XCI+Jyxcblx0XHRcdFx0JyAgPGltZyBuZy1pZj1cInNwaW5uZXJWbS5pbWdTcmNcIiBuZy1zcmM9XCJ7e3NwaW5uZXJWbS5pbWdTcmN9fVwiIC8+Jyxcblx0XHRcdFx0JyAgPG5nLXRyYW5zY2x1ZGU+PC9uZy10cmFuc2NsdWRlPicsXG5cdFx0XHRcdCc8L2Rpdj4nXG5cdFx0XHRdLmpvaW4oJycpLFxuXHRcdFx0Y29udHJvbGxlcjogJ1NwaW5uZXJDb250cm9sbGVyJyxcblx0XHRcdGNvbnRyb2xsZXJBczogJ3NwaW5uZXJWbScsXG5cdFx0XHRiaW5kVG9Db250cm9sbGVyOiB0cnVlXG5cdFx0fTtcblxuXHR9XG5cbn0pKCk7IiwiKGZ1bmN0aW9uKCl7XG5cblx0J3VzZSBzdHJpY3QnO1xuXG5cdGFuZ3VsYXJcblx0XHQubW9kdWxlKCdhcHAuY29yZScpXG5cdFx0LmRpcmVjdGl2ZSgndW5pcXVlUHJlZml4JywgdW5pcXVlUHJlZml4KTtcblxuXHR1bmlxdWVQcmVmaXguJGluamVjdCA9IFsnJHEnLCAnYnJhbmNoZXNTZXJ2aWNlJywgJ2Vycm9yU2VydmljZSddO1xuXHRmdW5jdGlvbiB1bmlxdWVQcmVmaXgoJHEsIGJyYW5jaGVzU2VydmljZSwgZXJyb3JTZXJ2aWNlKXtcblxuXHRcdHJldHVybiB7XG5cdFx0XHRyZXN0cmljdDogJ0FFJyxcblx0XHRcdHJlcXVpcmU6ICduZ01vZGVsJyxcblx0XHRcdGxpbms6IGxpbmtcblx0XHR9O1xuXG5cdFx0ZnVuY3Rpb24gbGluayhzY29wZSwgZWwsIGF0dHJzLCBjdHJsKSB7XG5cblx0XHQgICAgY3RybC4kYXN5bmNWYWxpZGF0b3JzLnVuaXF1ZVByZWZpeCA9IGZ1bmN0aW9uKG1vZGVsVmFsdWUsIHZpZXdWYWx1ZSkge1xuXHRcdCAgICBcdGlmIChjdHJsLiRpc0VtcHR5KG1vZGVsVmFsdWUpKSB7XG5cdFx0ICAgIFx0ICAvLyBjb25zaWRlciBlbXB0eSBtb2RlbCB2YWxpZFxuXHRcdCAgICBcdCAgcmV0dXJuICRxLndoZW4oKTtcblx0XHQgICAgXHR9XG5cblx0XHQgICAgXHR2YXIgZGVmID0gJHEuZGVmZXIoKTtcblxuXHRcdCAgICBcdGJyYW5jaGVzU2VydmljZS5pc1ByZWZpeFVuaXF1ZShtb2RlbFZhbHVlKVxuXHRcdCAgICBcdC50aGVuKGZ1bmN0aW9uKHJlcyl7XG5cdFx0ICAgIFx0XHRjb25zb2xlLmxvZygndW5pcXVlUHJlZml4OiAnLCByZXMpO1xuXHRcdCAgICBcdCAgICBpZihyZXMuZGF0YS5yZXN1bHQpIGRlZi5yZXNvbHZlKCk7XG5cdFx0ICAgIFx0ICAgIGVsc2UgZGVmLnJlamVjdCgpO1xuXHRcdCAgICBcdH0sIGZ1bmN0aW9uKGVycil7XG5cdFx0ICAgIFx0ICAgIGVycm9yU2VydmljZS5zaG93KGVycik7XG5cdFx0ICAgIFx0ICAgIGRlZi5yZWplY3QoKTtcblx0XHQgICAgXHR9KTtcblxuXHRcdCAgICBcdHJldHVybiBkZWYucHJvbWlzZTtcblx0XHQgICAgICAgIFxuXHRcdCAgICB9O1xuXHRcdH1cblxuXHR9XG5cbn0pKCk7IiwiKGZ1bmN0aW9uKCl7XG5cblx0J3VzZSBzdHJpY3QnO1xuXG5cdGFuZ3VsYXJcblx0XHQubW9kdWxlKCdhcHAuY29yZScpXG5cdFx0LmRpcmVjdGl2ZSgndmFsaWROYW1lJywgdmFsaWROYW1lKTtcblxuXHR2YWxpZE5hbWUuJGluamVjdCA9IFsnJHEnLCAnYXBpU2VydmljZScsICdlcnJvclNlcnZpY2UnXTtcblx0ZnVuY3Rpb24gdmFsaWROYW1lKCRxLCBhcGksIGVycm9yU2VydmljZSl7XG5cblx0XHRyZXR1cm4ge1xuXHRcdFx0cmVzdHJpY3Q6ICdBRScsXG5cdFx0XHRyZXF1aXJlOiAnbmdNb2RlbCcsXG5cdFx0XHRsaW5rOiBsaW5rXG5cdFx0fTtcblxuXHRcdGZ1bmN0aW9uIGxpbmsoc2NvcGUsIGVsLCBhdHRycywgY3RybCkge1xuXG5cdFx0ICAgIGN0cmwuJGFzeW5jVmFsaWRhdG9ycy52YWxpZE5hbWUgPSBmdW5jdGlvbihtb2RlbFZhbHVlLCB2aWV3VmFsdWUpIHtcblx0XHQgICAgICAgIGlmIChjdHJsLiRpc0VtcHR5KG1vZGVsVmFsdWUpKSB7XG5cdFx0ICAgICAgICAgIC8vIGNvbnNpZGVyIGVtcHR5IG1vZGVsIHZhbGlkXG5cdFx0ICAgICAgICAgIHJldHVybiAkcS53aGVuKCk7XG5cdFx0ICAgICAgICB9XG5cblx0XHQgICAgICAgIHZhciBkZWYgPSAkcS5kZWZlcigpO1xuXG5cdFx0ICAgICAgICBhcGkucmVxdWVzdCh7XG5cdFx0ICAgICAgICAgICAgdXJsOiAnaXNOYW1lVmFsaWQnLFxuXHRcdCAgICAgICAgICAgIHBhcmFtczoge1xuXHRcdCAgICAgICAgICAgICAgICBuYW1lOiBtb2RlbFZhbHVlXG5cdFx0ICAgICAgICAgICAgfVxuXHRcdCAgICAgICAgfSkudGhlbihmdW5jdGlvbihyZXMpe1xuXHRcdCAgICAgICAgXHRjb25zb2xlLmxvZygndmFsaWROYW1lOiAnLCByZXMpO1xuXHRcdCAgICAgICAgICAgIGlmKHJlcy5kYXRhLnJlc3VsdCkgZGVmLnJlc29sdmUoKTtcblx0XHQgICAgICAgICAgICBlbHNlIGRlZi5yZWplY3QoKTtcblx0XHQgICAgICAgIH0sIGZ1bmN0aW9uKGVycil7XG5cdFx0ICAgICAgICAgICAgZXJyb3JTZXJ2aWNlLnNob3coZXJyKTtcblx0XHQgICAgICAgICAgICBkZWYucmVqZWN0KCk7XG5cdFx0ICAgICAgICB9KTtcblxuXHRcdCAgICAgICAgcmV0dXJuIGRlZi5wcm9taXNlO1xuXHRcdCAgICB9O1xuXHRcdH1cblxuXHR9XG5cbn0pKCk7IiwiKGZ1bmN0aW9uKCl7XG5cblx0J3VzZSBzdHJpY3QnO1xuXG5cdGFuZ3VsYXJcblx0XHQubW9kdWxlKCdhcHAuY29yZScpXG5cdFx0LmRpcmVjdGl2ZSgndmFsaWRQcmVmaXgnLCB2YWxpZFByZWZpeCk7XG5cblx0dmFsaWRQcmVmaXguJGluamVjdCA9IFsnYnJhbmNoZXNTZXJ2aWNlJ107XG5cdGZ1bmN0aW9uIHZhbGlkUHJlZml4KGJyYW5jaGVzU2VydmljZSl7XG5cblx0XHRyZXR1cm4ge1xuXHRcdFx0cmVzdHJpY3Q6ICdBRScsXG5cdFx0XHRyZXF1aXJlOiAnbmdNb2RlbCcsXG5cdFx0XHRsaW5rOiBsaW5rXG5cdFx0fTtcblxuXHRcdGZ1bmN0aW9uIGxpbmsoc2NvcGUsIGVsLCBhdHRycywgY3RybCkge1xuXG5cdFx0ICAgIGVsLm9uKCdrZXlkb3duJywgZnVuY3Rpb24gKGUpe1xuXHRcdCAgICAgICAgaWYgKGUuYWx0S2V5IHx8IGUua2V5Q29kZSA9PT0gMTggfHwgZS5rZXlDb2RlID09PSAzMiB8fCAoZS5rZXlDb2RlICE9PSAxODkgJiYgZS5rZXlDb2RlID4gOTApKSB7XG5cdFx0ICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdCAgICAgICAgfVxuXHRcdCAgICB9KTtcblx0XHQgICAgXG5cdFx0ICAgIGN0cmwuJHZhbGlkYXRvcnMudmFsaWRQcmVmaXggPSBmdW5jdGlvbihtb2RlbFZhbHVlLCB2aWV3VmFsdWUpIHtcblx0XHQgICAgXHRpZiAoY3RybC4kaXNFbXB0eShtb2RlbFZhbHVlKSkge1xuXHRcdCAgICBcdCAgLy8gY29uc2lkZXIgZW1wdHkgbW9kZWwgdmFsaWRcblx0XHQgICAgXHQgIHJldHVybiB0cnVlO1xuXHRcdCAgICBcdH1cblxuXHRcdCAgICBcdGlmKGJyYW5jaGVzU2VydmljZS5pc1ByZWZpeFZhbGlkKG1vZGVsVmFsdWUpKSB7XG5cdFx0ICAgIFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHQgICAgXHR9IGVsc2Uge1xuXHRcdCAgICBcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdCAgICBcdH1cblx0XHQgICAgICAgIFxuXHRcdCAgICB9O1xuXHRcdH1cblxuXHR9XG5cbn0pKCk7Il0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9
