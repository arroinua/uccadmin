(function(){

	'use strict';

	angular
		.module('app.instance')
		.directive('instanceSummary', instanceSummary);

	function instanceSummary(){

		return {
			restrict: 'AE',
			transclude: true,
			scope: {
				plan: '=',
				amount: '=',
				currency: '=',
				maxlines: '=',
				numPool: '=',
				storage: '=',
				instance: '=',
				newBranch: '=',
				update: '&',
				proceed: '&'
			},
			templateUrl: 'instance/instance-summary.html'
		};

	}

})();