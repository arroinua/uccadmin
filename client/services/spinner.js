(function(){

	'use strict';

	angular
		.module('app.core')
		.factory('spinnerService', spinnerService);

	// spinnerService.$inject = [];

	function spinnerService(){

		var spinners = {};
		return {
			_register: _register,
			show: show,
			hide: hide,
			showAll: showAll,
			hideAll: hideAll
		};
		
		function _register(data) {
			if (!data.hasOwnProperty('name')) {
				throw new Error("Spinner must specify a name when registering with the spinner service.");
			}
			if (spinners.hasOwnProperty(data.name)) {
				return false;
				// throw new Error("A spinner with the name '" + data.name + "' has already been registered.");
			}
			spinners[data.name] = data;
		}

		function show(name) {
			var spinner = spinners[name];
			if (!spinner) {
				throw new Error("No spinner named '" + name + "' is registered.");
			}
			spinner.show();
		}

		function hide(name) {
			var spinner = spinners[name];
			if (!spinner) {
				throw new Error("No spinner named '" + name + "' is registered.");
			}
			spinner.hide();
		}

		function showAll() {
			for (var name in spinners) {
				spinners[name].show();
			}
		}

		function hideAll() {
			for (var name in spinners) {
				spinners[name].hide();
			}
		}

	}

})();