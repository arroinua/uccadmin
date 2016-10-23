(function(){

	'use strict';

	angular
		.module('app.layout')
		.directive('langNav', langNav);

	function langNav(){

		return {
			restrict: 'AE',
			transclude: true,
			controller: 'LangController',
			controllerAs: 'langVm',
			templateUrl: 'layout/langnav/langnav.html'
		};

	}

})();