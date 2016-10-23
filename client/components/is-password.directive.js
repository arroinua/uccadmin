(function(){

	'use strict';

	angular
		.module('app')
		.directive('isPassword', isPassword);

	isPassword.$inject = ['utils'];

	function isPassword(utils){

		return {
			require: 'ngModel',
			link: link
		};

		function link(scope, el, attrs, ctrl) {

			ctrl.$validators.password = function(modelValue, viewValue) {
				if(ctrl.$isEmpty(modelValue)) {
					return true;
				}

				if(scope.instance) {
					var prefix = scope.instance.result.prefix;
					if(prefix && new RegExp(prefix, 'i').test(modelValue))
						return false;
				}

				if(!utils.checkPasswordStrength(modelValue)) {
					return false;
				}

				return true;
			};
			
		}

	}

})();