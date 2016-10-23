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