(function(){

	'use strict';

	angular
		.module('app.layout')
		.controller('LayoutController', LayoutController);

	LayoutController.$inject = ['$rootScope'];

	function LayoutController($rootScope) {

		var vm = this;

		vm.fullView = true;
		vm.topbar = false;
		vm.sidemenu = false;
		vm.langmenu = false;
		vm.footer = true;
		vm.triggerSidebar = triggerSidebar;
		vm.triggerLangMenu = triggerLangMenu;

		$rootScope.$on('auth.login', function(e){
			vm.fullView = false;
			vm.topbar = true;
			vm.sidemenu = true;
			vm.footer = false;

			console.log('layout vm.sidemenu: ', vm.sidemenu);
		});

		$rootScope.$on('auth.logout', function(e){
			vm.fullView = true;
			vm.topbar = false;
			vm.sidemenu = false;
			vm.footer = true;

			console.log('layout vm.sidemenu: ', vm.sidemenu);
		});

		function triggerSidebar() {
			console.log('trigger sidebar!');
			vm.sidemenu = !vm.sidemenu;
		};

		function triggerLangMenu() {
			console.log('trigger langmenu!');
			vm.langmenu = !vm.langmenu;
		}

	}

})();