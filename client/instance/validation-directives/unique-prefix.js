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