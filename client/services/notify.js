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