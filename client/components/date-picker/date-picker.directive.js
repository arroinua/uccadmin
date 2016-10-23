(function(){

	'use strict';

	angular
		.module('app')
		.directive('datePicker', datePicker);

	datePicker.$inject = ['utilsService'];

	function datePicker(utilsService){

		return {
			restrict: 'AE',
			transclude: true,
			scope: {
				dateFormat: '=',
				dateOptions: '=',
				model: '='
			},
			controller: 'DatePicker',
			controllerAs: 'pickerVm',
			templateUrl: 'components/date-picker/date-picker.html',
			link: link
		};

		function link(scope, el, attrs, ctrl){

			var iconsChanged = false;

			scope.$watch('pickerVm.opened', function (opened) {
				if(opened && !iconsChanged) {
					changeIcons();
					iconsChanged = true;
				}
			});

			function changeIcons(){
				var leftIco = el[0].querySelectorAll('.uib-left');
				var rightIco = el[0].querySelectorAll('.uib-right');

				console.log('changeIcons: ', el[0], leftIco, rightIco);

				// leftIco.className = 'fa fa-chevron-left';
				// rightIco.className = 'fa fa-chevron-right';

			}

		}

	}

})();