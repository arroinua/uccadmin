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