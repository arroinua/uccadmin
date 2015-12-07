dashApp.controller('SidebarController', ['$rootScope', '$scope', '$location', '$translate', 'authService', 'utils', 'api', function($rootScope, $scope, $location, $translate, authService, utils, api){
	var getCustomerBalance = function(){
		api.request({
			url: "getCustomerBalance"
		}).then(function(response){
			// $scope.balance = response.result;
			$rootScope.currentUser = $rootScope.currentUser || {};
			$rootScope.currentUser.balance = response.data.result;
		}, function(err){
			$rootScope.error = err;
		});
	};
	var onRouteChange = function(path){
		if(path === '/' || path === '/login' || path === '/signup' || path === '/account-verification' || path === '/request-password-reset' || path === '/reset-password'){
			$scope.visible = false;
			$scope.fullView = true;
		} else {
			$scope.visible = true;
			$scope.fullView = false;
		}
	};

	$rootScope.currentUser = null;
	$rootScope.$on('$routeChangeSuccess', function (){
		onRouteChange($location.path());
	});

	$scope.visible = false;
	$scope.stringToFixed = function(string){
		return utils.stringToFixed(string, 2);
	};
	$scope.logout = function(){
		authService.logout(function(){
			$location.path('/');
			$rootScope.currentUser = null;
		});
	};
	
	onRouteChange($location.path());
	if($scope.visible) getCustomerBalance();
}]);

dashApp.controller('TopmenuController', ['$localStorage', '$rootScope', '$scope', '$translate', 'api', function($localStorage, $rootScope, $scope, $translate, api){
	$rootScope.lang = $localStorage.NG_TRANSLATE_LANG_KEY || $translate.use();
	// $scope.changeLanguage = function (langKey) {
	// 	$translate.use(langKey);
	// 	$scope.lang = langKey;
	// 	api.request({
	// 		url: 'setCustomerLang',
	// 		params: {
	// 			lang: langKey
	// 		}
	// 	}).then(function (res){
	// 		console.log(res.data.result);
	// 	}, function (err){
	// 		console.log(err);
	// 	});
	// };
	$scope.$watch(function(){
		return $rootScope.title;
	}, function(val){
		$translate(val).then(function (result) {
			$scope.pageTitle = result;
		});
	});
}]);

dashApp.controller('PlansModalController', ['$scope', '$element', 'currentPlan', 'plans', 'close', function($scope, $element, currentPlan, plans, close){
	$scope.planModal = {
		planId: currentPlan,
		plans: plans
	};

	$scope.closeModal = function(){
		close(null);
	};

	$scope.submitModal = function(){
		angular.element($element.modal).removeClass('in');
		close(($scope.planModal.planId !== currentPlan ? $scope.planModal.planId : null), 1000);
	};

}]);

dashApp.controller('VerifyController', ['$rootScope', '$scope', '$location', function($rootScope, $scope, $location){
	$rootScope.title = 'EMAIL_VERIFICATION';
	$scope.verified = $location.search().verified === 'true' ? true : false;
}]);

dashApp.controller('ProfileController', ['$rootScope', '$routeParams', '$scope', 'api', 'notifications', 'errorService', function($rootScope, $routeParams, $scope, api, notifications, errorService){
	$rootScope.title = 'PROFILE.PROFILE';
	$scope.user = $rootScope.currentUser;
	$scope.saveProfile = function(){
		
		if(!$scope.user.email || !$scope.user.name){
			return errorService.show('MISSING_FIELDS');
			// return notifications.showInfo('Please, fill all required fields');
		}
		if($scope.confirmPass !== $scope.user.password){
			return errorService.show('PASSWORD_NOT_CONFIRMED');
			// return notifications.showInfo('Please, confirm password');
		}

		api.request({
			url: "update/"+$routeParams.id,
			params: $scope.user
		}).then(function(response){
			notifications.showSuccess('All changes saved');
			angular.extend($rootScope.currentUser, response.data.result);
			console.log('currentUser: ', $rootScope.currentUser, response.data.result);
		}, function(err){
			$rootScope.error = err;
		});
	};
}]);

dashApp.controller('TransactionsController', ['$rootScope', '$scope', 'api', 'utils', function ($rootScope, $scope, api, utils){

	var date = new Date();

	$rootScope.title = 'TRANSACTIONS';
	$scope.transactions = [];
	$scope.startDate = new Date( Date.parse(date) - (7 * 24 * 60 * 60 * 1000) ).toLocaleDateString();
	$scope.endDate = new Date( Date.parse(date) + (1 * 24 * 60 * 60 * 1000) ).toLocaleDateString();
	
	$scope.parseDate = function(date){
		return utils.parseDate(date, 'DD/MM/YYYY HH:MM');
	};

	$scope.findRecords = function(){
		api.request({
			url: "transactions",
			params: {
				start: Date.parse($scope.startDate),
				end: Date.parse($scope.endDate)
			}
		}).then(function(response){
			console.log('Transactions: ', response.data);
			$scope.transactions = response.data.result;
		}, function(err){
			$rootScope.error = err;
		});
	};

	$scope.findRecords();

}]);

dashApp.controller('ChargesController', ['$rootScope', '$scope', 'api', 'utils', function ($rootScope, $scope, api, utils){

	var date = new Date();

	$rootScope.title = 'CHARGES';
	$scope.charges = [];
	$scope.startDate = new Date( Date.parse(date) - (7 * 24 * 60 * 60 * 1000) ).toLocaleDateString();
	$scope.endDate = new Date( Date.parse(date) + (1 * 24 * 60 * 60 * 1000) ).toLocaleDateString();

	$scope.findRecords = function(){
		api.request({
			url: "charges",
			params: {
				start: Date.parse($scope.startDate),
				end: Date.parse($scope.endDate)
			}
		}).then(function(response){
			console.log('Charges: ', response.data);
			$scope.charges = response.data.result;
		}, function(err){
			$rootScope.error = err;
		});
	};

	$scope.parseDate = function(date){
		return utils.parseDate(date, 'DD/MM/YYYY HH:MM');
	};
	$scope.stringToFixed = function(string){
		return utils.stringToFixed(string, 2);
	};

	$scope.findRecords();

}]);

dashApp.controller('PaymentController', ['$q', '$http', '$rootScope', '$scope', '$localStorage', '$location', 'api', 'cart', 'notifications', 'errorService', function ($q, $http, $rootScope, $scope, $localStorage, $location, api, cart, notifications, errorService){
	$rootScope.title = 'PAYMENT';

	var requiredAmount = 0;
	var coutAmount = function(array){
		//TODO - count min amount based on the currency
		var amount = array.length ? 0 : 50;
		array.forEach(function (item){
			amount += item.amount;
		});
		return amount;
	};

	$scope.paymentMethod = 1;
	$scope.cart = cart.getAll();
	$scope.proceedPayment = function(){

		if(!$scope.paymentMethod)
			return errorService.show('CHOOSE_PAYMENT_METHOD');
			// return notifications.showInfo('Please, choose payment method');
		if(!$scope.amount)
			return errorService.show('AMOUNT_NOT_SET');
			// return notifications.showInfo('Please, set amount');

		//TODO - switch between payment methods
		
		var requestParams = {};
		requestParams.url = '/checkout';

		// if($scope.paymentMethod === '0'){
		// 	requestParams.params = {
		// 		order: $scope.cart
		// 	};
		// } else {
			requestParams.params = {
				paymentMethod: $scope.paymentMethod,
				amount: (requiredAmount ? requiredAmount : $scope.amount),
				order: $scope.cart
			};
		// }

		api.request(requestParams).then(function(result){
			if(result.data.redirect) {
				window.location.href = result.data.redirect;
			} else {
				$location.path('/dashboard'); //TODO
			}
			cart.clear();
		}, function(err){
			$rootScope.error = err;
		});
	};
	$scope.removeFromArray = function(array, index){
		array.splice(index, 1);
	};
	$scope.cancel = function(){
		$location.path('/dashboard');
	};
	$scope.amount = requiredAmount = coutAmount($scope.cart);

	$scope.$watch(function(){
		return $scope.cart.length;
	}, function(val){
		if(!val) requiredAmount = 0;
		$scope.amount = coutAmount($scope.cart);
		// $scope.cart = val;
	});
}]);

dashApp.controller('InstanceController', ['$rootScope', '$routeParams', '$scope', '$location', 'api', 'poolSizeServices', 'branchesService', 'cart', 'notifications', 'errorService', function ($rootScope, $routeParams, $scope, $location, api, poolSizeServices, branchesService, cart, notifications, errorService){
	
	var oid = $routeParams.oid;
	var setBranch = function(opts){
		$scope.instance = opts;
		// $scope.instance.result = opts.result;
		// $scope.instance._subscription.planId = opts._subscription.planId;
		$scope.numPool = poolSizeServices.poolArrayToString(opts.result.extensions);
	};
	var getBranchSetts = function(){
		console.log($scope.instance._subscription.planId);
		if(!$scope.instance._subscription.planId || !$scope.instance.result.prefix || !$scope.numPool || !$scope.instance.result.name || (!$scope.instance.result.adminpass && $scope.newBranch)) {
			// notifications.showInfo('Please, fill all required fields');
			errorService.show('MISSING_FIELDS');
			return false;
		}

		if($scope.instance.result.adminpass && ($scope.confirmPass !== $scope.instance.result.adminpass)){
			errorService.show('PASSWORD_NOT_CONFIRMED');
			// notifications.showInfo('Please, confirm password');
			return false;
		}

		$scope.instance.result.extensions = poolSizeServices.poolStringToObject($scope.numPool);
		$scope.instance.result.adminname = $scope.instance.result.prefix;
		
		return $scope.instance;
	};
	var getPlans = function(){
		api.request({
			url: 'getPlans'
		}).then(function(res){
			$scope.plans = res.data.result;
			$scope.instance._subscription.planId = res.data.result[0]._id;
		}, function(err){
			errorService.show(err.data.message);
		});
	};
	var getServers = function(){
		api.request({
			url: 'getServers'
		}).then(function(res){
			console.log(res.data.result);
			$scope.sids = res.data.result;
			if(oid === 'new') $scope.instance.sid = res.data.result[0]._id;
		}, function(err){
			errorService.show(err.data.message);
		});
	};

	$scope.plans = [];
	$scope.sids = [];
	$scope.isPrefixValid = true;
	$scope.languages = [
		{name: 'English', value: 'en'},
		{name: 'Українська', value: 'uk'},
		{name: 'Русский', value: 'ru'}
	];
	$scope.instance = {
		_subscription: {
			quantity: 1,
			addOns: []
		},
		result: {
			lang: 'en'
		}
	};
	$scope.proceed = function(){

		var branchSetts = getBranchSetts();

		if(!branchSetts) {
			return;
		}

		api.request({
			url: 'createSubscription',
			params: branchSetts
		}).then(function(result){
			notifications.showSuccess('All changes saved!');
			$location.path('/dashboard');
		}, function(err){
			console.log(err);
			if(err.data.message === 'NOT_ENOUGH_CREDITS') {
				branchesService.getSubscriptionAmount(branchSetts._subscription, function (err, response){
					if(err){
						$rootScope.error = err;
					} else {
						cart.add({
							action: "createSubscription",
							description: "Create subscription",
							amount: response.result,
							data: branchSetts
						});
						$location.path('/payment');
					}
				});
			} else {
				$rootScope.error = err;
			}
		});
	};
	$scope.saveInstance = function(){

		var branchSetts = getBranchSetts();

		if(!branchSetts) {
			return;
		}

		api.request({
			url: 'updateBranch/'+oid,
			params: branchSetts
		}).then(function(result){
			notifications.showSuccess('All changes saved!');
			console.log('ins result: ', result);
		}, function(err){
			$rootScope.error = err;
		});

	};

	if(oid !== 'new'){

		branchesService.get(oid, function (branch){
			if(branch) {
				setBranch(branch);
			} else {
				api.request({ url: 'getBranch/'+oid }).then(function (res){
					setBranch(res.data.result);
				}, function (err){
					$rootScope.error = err;
				});
			}
		});

		$scope.newBranch = false;
		// $scope.btnText = 'Update branch';
		$rootScope.title = 'EDIT_INSTANCE';
		// url = '/updateBranch/'+oid;

	} else {
		$scope.newBranch = true;
		$scope.numPool = '200-204';
		// $scope.btnText = 'Buy Now';
		$rootScope.title = 'NEW_INSTANCE';
		getPlans();
	}
	getServers();
}]);

dashApp.controller('DashController', ['$rootScope', '$scope', '$location', 'api', 'poolSizeServices', 'branchesService', 'utils', 'cart', 'chartService', 'ModalService', 'notifications', function($rootScope, $scope, $location, api, poolSizeServices, branchesService, utils, cart, chartService, ModalService, notifications){
	
	$rootScope.title = 'DASHBOARD';

	$scope.instances = [];

	var diff;

	var getBranches = function(){
		api.request({
			url: "getBranches"
		}).then(function(result){
			branchesService.add(result.data.result);
			$scope.instances = result.data.result;

			console.log('getBranches result: ', $scope.instances);
			// $scope.getInstState();
		}, function(err){
			$rootScope.error = err;
		});
	};

	var setState = function(method, oid, callback){
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
	};

	var changePlan = function(newPlan, inst){
		inst._subscription.planId = newPlan;

		api.request({
			url: 'changePlan',
			params: {
				oid: inst.oid,
				planId: newPlan
			}
		}).then(function(result){
			getBranches();
			notifications.showSuccess('All changes saved!');
		}, function(err){
			if(err.data.message === 'NOT_ENOUGH_CREDITS') {
				branchesService.getSubscriptionAmount(inst._subscription, function (err, response){
					if(err){
						$rootScope.error = err;
					} else {
						cart.add({
							action: "changePlan",
							description: "Change Plan",
							amount: response.result,
							data: {
								oid: inst.oid,
								planId: newPlan
							}
						});

						$location.path('/payment');
					}
				});
			} else {
				$rootScope.error = err;
			}
		});
	};

	var getCharges = function(){
		api.request({
			url: 'charges',
			params: {
				start: (Date.now() - (7 * 24 * 60 * 60 * 1000)),
				limit: 7
			}
		}).then(function(res){
			console.log('charges: %o', res.data);
			$scope.charges = res.data.result;
			createChargesGraph(res.data.result);

		}, function (err){
			$rootScope.error = err;
			console.log('getCharges error: ', err);
		});
	};

	var getTransactions = function(){
		api.request({
			url: 'transactions',
			params: {
				start: (Date.now() - (7 * 24 * 60 * 60 * 1000)),
				limit: 7
			}
		}).then(function(res){
			$scope.transactions = res.data.result.filter(function (item){
				return item.status !== 'pending';
			});
			createTransactionsGraph($scope.transactions);

		}, function (err){
			$rootScope.error = err;
			console.log(err);
		});
	};

	var createChargesGraph = function(data){
		var lables = [],
			datasets = [],
			data1 = [],
			data2 = [],
			chartParams = {};

		data.forEach(function (item){
			lables.push($scope.parseDate(item.createdAt));
			data1.push($scope.stringToFixed(item.amount));
			data2.push($scope.stringToFixed(item.balance));
		});

		datasets.push({label: 'Amount', fillColor: 'rgba(248,208,28,0.8)', data: data1});
		datasets.push({label: 'Balance', fillColor: 'rgba(220,220,220,0.8)', data: data2});

		chartParams = chartService.createChartObject(lables, datasets);

		$scope.chargesData = chartParams.data;
		$scope.chargesOptions = chartParams.options;
	};

	var createTransactionsGraph = function(data){
		var lables = [],
			datasets = [],
			data1 = [],
			data2 = [],
			chartParams = {};

		data.forEach(function (item){
			lables.push($scope.parseDate(item.createdAt));
			data1.push(item.amount);
			data2.push($scope.stringToFixed(item.balance));
		});

		datasets.push({label: 'Amount', fillColor: 'rgba(248,208,28,0.8)', data: data1});
		datasets.push({label: 'Balance', fillColor: 'rgba(220,220,220,0.8)', data: data2});

		chartParams = chartService.createChartObject(lables, datasets);

		$scope.transactionsData = chartParams.data;
		$scope.transactionsOptions = chartParams.options;
	};
	var getPlans = function(){
		api.request({
			url: 'getPlans'
		}).then(function(res){
			$scope.plans = res.data.result;
		}, function(err){
			errorService.show(err.data.message);
		});
	};
	
	$scope.activateBranch = function(oid){
		if(!oid) return;

		setState('activateBranch', oid, function (err, response){
			if(err) {
				$rootScope.error = err;
				return;
			}
			getBranches();
		});
	};
	$scope.pauseBranch = function(oid){
		if(!oid) return;

		setState('pauseBranch', oid, function (err, response){
			if(err) {
				$rootScope.error = err;
				return;
			}
			getBranches();
		});
	};
	$scope.terminateInstance = function(oid){
		if(!oid) return;
		if(confirm("Do you realy want to terminate instance permanently?")){
			setState('deleteBranch', oid, function (err, response){
				if(err) {
					$rootScope.error = err;
					return;
				}
				getBranches();
			});
		}
	};
	$scope.renewSubscription = function(inst){
		api.request({
			url: 'renewSubscription',
			params: {
				oid: inst.oid
			}
		}).then(function(res){
			notifications.showSuccess('All changes saved!');
		}, function (err){
			if(err.data.message === 'NOT_ENOUGH_CREDITS') {
				branchesService.getSubscriptionAmount(inst._subscription, function (err, response){
					if(err){
						$rootScope.error = err.data.message;
					} else {
						cart.add({
							action: "renewSubscription",
							description: "Renew subscription",
							amount: response.result,
							data: {
								oid: inst.oid
							}
						});

						$location.path('/payment');
					}
				});
			} else {
				$rootScope.error = err.data.message;
			}
		});
	};
	$scope.changePlan = function(inst){
		ModalService.showModal({
			templateUrl: "/partials/plans-modal.html",
			controller: "PlansModalController",
			appendElement: angular.element('#modals-cont'),
			inputs: {
				plans: $scope.plans,
				currentPlan: inst._subscription.planId
			}
		}).then(function(modal) {
			//it's a bootstrap element, use 'modal' to show it
			console.log(modal);
			angular.element(modal.element).addClass('in');
			angular.element(modal.element).on('click', function (event){
				// event.preventDefault();
				if(event.target.id === this.id)
					this.parentNode.removeChild(this);
			});

			modal.close.then(function(result) {
				if(result) changePlan(result, inst);
			});
		}).catch(function (err){
			console.log(err);
		});
	};

	$scope.getDifference = utils.getDifference;
	$scope.expiresAt = function(inst){
		diff = utils.getDifference(inst._subscription.nextBillingDate, moment(), 'days');
		return diff;
	};
	$scope.canRenew = function(inst){
		diff = $scope.expiresAt(inst);
		return diff <= 10;
	};
	$scope.parseDate = function(date, format){
		return utils.parseDate(date, format);
	};
	$scope.stringToFixed = function(string){
		return utils.stringToFixed(string, 2);
	};
	$scope.getPoolString = function(array){
		return poolSizeServices.poolArrayToString(array);
	};
	$scope.getPoolSize = function(array){
		return poolSizeServices.getPoolSize(array);
	};
	getBranches();
	getTransactions();
	getCharges();
	getPlans();
}]);

dashApp.controller('AuthController', ['$rootScope', '$scope', '$location', '$localStorage', '$translate', 'authService', 'errorService', function($rootScope, $scope, $location, $localStorage, $translate, authService, errorService){
	if($location.path() === '/login')
		$rootScope.title = 'LOGIN';
	else if($location.path() === '/signup')
		$rootScope.title = 'REGISTRATION';
	else if($location.path() === '/request-password-reset' || $location.path() === '/reset-password')
		$rootScope.title = 'RESET_PASSWORD';

	$scope.verificationSent = false;
	$scope.requestSent = false;

	$scope.signup = function(){
		var fdata = {
			email: $scope.email,
			name: $scope.name,
			password: $scope.password,
			lang: $localStorage.NG_TRANSLATE_LANG_KEY || 'en'
		};
		authService.signup(fdata).then(function (res){
			$scope.verificationSent = true;
		}, function (err){
			errorService.show(err.data.message);
			// $rootScope.error = err;
		});
	};

	$scope.login = function(){
		var fdata = {
			email: $scope.email,
			password: $scope.password
		};

		if(!$scope.email) {
			return errorService.show('MISSING_FIELDS');
		}

		authService.login(fdata).then(function (res){
			$localStorage.token = res.data.token;
			$location.path('/dashboard');
		}, function (err){
			errorService.show(err.data.message);
			// $rootScope.error = err;
		});
	};

	$scope.requestPasswordReset = function(){
		var fdata = {
			email: $scope.email
		};

		authService.requestPasswordReset(fdata).then(function (res){
			$scope.requestSent = true;
		}, function (err){
			errorService.show(err.data.message);
			// $rootScope.error = err;
		});
	};

	$scope.resetPassword = function(){
		var fdata = {
			token: $location.search().ott,
			password: $scope.password
		};

		authService.resetPassword(fdata).then(function (res){
			$localStorage.token = res.token;
			$location.path('/dashboard');
		}, function (err){
			errorService.show(err.data.message);
			// $rootScope.error = err;
		});
	};

	$scope.logout = function() {
        authService.logout(function () {
            $location.path('/');
            $rootScope.currentUser = null;
        });
    };
}]);