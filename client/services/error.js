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