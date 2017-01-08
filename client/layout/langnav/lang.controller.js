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