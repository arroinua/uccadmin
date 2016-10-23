(function(){

	'use strict';

	angular
		.module('app.instance')
		.directive('serverItem', serverItem);

	function serverItem(){

		return {
			restrict: 'AE',
			transclude: true,
			scope: {
				model: '=',
				server: '=',
				newBranch: '=',
				selectServer: '&'
			},
			templateUrl: 'instance/server-item.html'
		};

	}

})();