(function(){

	'use strict';

	angular
		.module('app.layout')
		.directive('footer', footer);

	function footer(){

		return {
			restrict: 'AE',
			transclude: true,
			controller: 'FooterController',
			controllerAs: 'footerVm',
			templateUrl: 'layout/footer/footer.html'
		};

	}

})();