(function(){

	'use strict';

	angular
		.module('app.core')
		.factory('cartService', cartService);

	cartService.$inject = ['$rootScope', 'customerService'];

	function cartService($rootScope, customerService) {

		var items = [];
		return {
			add: add,
			update: update,
			get: get,
			set: set,
			getAll: getAll,
			clear: clear
		};

		function newItem(params) {
			return {
				action: params.action,
				description: params.description,
				amount: params.amount,
				currency: customerService.getCustomer().currency,
				data: params.data
			};
		}

		function add(params) {
			// items = []; //comment this line to collect items in the cart, rather than substitute
			items.push(newItem(params));
		}

		function set(params) {
			items.splice(0, items.length);
			items.push(newItem(params));
		}

		function update(prefix, params) {
			var item = items.forEach(function(item, index, array) {
				if(item.data.result.prefix === prefix) array[index] = params;
			});
		}

		function get(prefix) {
			var found;
			items.forEach(function(item) {
				if(item.data.result.prefix === prefix) found = item;
			});
			return found;
		}

		function getAll() {
			return items;
		}
		
		function clear() {
			items = [];
		}

	}

})();