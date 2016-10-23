(function(){

	'use strict';

	angular
		.module('app.instance')
		.directive('planItem', planItem);

	function planItem(){

		return {
			restrict: 'AE',
			transclude: true,
			scope: {
				plan: '=',
				model: '=',
				selectPlan: '&',
				showPlans: '&'
			},
			templateUrl: 'instance/plan.html'
		};

	}

})();