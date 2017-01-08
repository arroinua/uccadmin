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
			remove: remove,
			getAll: getAll,
			clear: clear
		};

		function newItem(params) {
			return {
				edit: params.edit !== undefined ? params.edit : true,
				remove: params.remove !== undefined ? params.remove : true,
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

		function set(params, index) {
			index ? remove(index) : clear();
			index ? items[index] = newItem(params) : items.push(newItem(params));
		}

		function remove(index) {
			items.splice(index, 1);
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
			items.splice(0, items.length);
		}

	}

})();