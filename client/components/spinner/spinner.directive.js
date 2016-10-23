(function(){

	'use strict';

	angular
		.module('app')
		.directive('spinner', spinner);

	function spinner(){

		return {
			restrict: 'AE',
			replace: true,
			transclude: true,
			scope: {
				name: '@?',
				group: '@?',
				show: '=?',
				imgSrc: '@?',
				register: '@?',
				onLoaded: '&?',
				onShow: '&?',
				onHide: '&?'
			},
			template: [
				'<div ng-show="spinnerVm.show">',
				'  <img ng-if="spinnerVm.imgSrc" ng-src="{{spinnerVm.imgSrc}}" />',
				'  <ng-transclude></ng-transclude>',
				'</div>'
			].join(''),
			controller: 'SpinnerController',
			controllerAs: 'spinnerVm',
			bindToController: true
		};

	}

})();