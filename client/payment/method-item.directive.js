(function(){

	'use strict';

	angular
		.module('app.payment')
		.directive('methodItem', methodItem);

	function methodItem(){

		return {
			restrict: 'AE',
			transclude: true,
			scope: {
				model: '=',
				method: '=',
				unselectable: '=',
				select: '&'
			},
			templateUrl: 'payment/method-item.html'
		};

	}

})();