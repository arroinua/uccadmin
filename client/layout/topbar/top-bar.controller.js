(function(){

	'use strict';

	angular
		.module('app.layout')
		.controller('TopbarController', TopbarController);

	TopbarController.$inject = ['$rootScope', '$scope', '$localStorage', '$translate'];

	function TopbarController($rootScope, $scope, $localStorage, $translate) {

		var vm = this;
		vm.lang = $localStorage.NG_TRANSLATE_LANG_KEY || $translate.use();

		$rootScope.$on('lang.change', function(e, data){
			if(data.lang) vm.lang = data.lang;
		});
		

	}

})();