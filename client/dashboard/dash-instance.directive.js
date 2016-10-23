(function(){

	'use strict';

	angular
		.module('app.dashboard')
		.directive('dashInstance', dashInstance);

	function dashInstance(){

		return {
			restrict: 'EA',
			replace: true,
			transclude: true,
			scope: {
				inst: '='
			},
			templateUrl: 'dashboard/dash-instance.html',
			controller: 'DashInstanceController',
			controllerAs: 'dashInstVm',
			bindToController: true
		};

	}

})();