(function(){

	'use strict';

	angular
		.module('app.layout')
		.controller('ContentController', ContentController);

	ContentController.$inject = ['$rootScope'];

	function ContentController($rootScope) {

		var vm = this;
		// vm.fullView = true;

	}

})();