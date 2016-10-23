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