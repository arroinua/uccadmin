(function(){

	'use strict';

	angular
		.module('app.layout')
		.controller('FooterController', FooterController);

	FooterController.$inject = ['$rootScope'];

	function FooterController($rootScope) {

		var vm = this;
		// vm.footer = true;
		
	}

})();