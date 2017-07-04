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