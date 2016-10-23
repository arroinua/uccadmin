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