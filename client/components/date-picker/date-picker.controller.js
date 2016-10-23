(function(){

	'use strict';

	angular
		.module('app.core')
		.controller('DatePicker', DatePicker);

	DatePicker.$inject = ['utilsService', 'errorService'];

	function DatePicker(utils, errorService) {

		var vm = this;

		vm.opened = false;
		vm.open = function() {
			vm.opened = true;
		};

	}

})();