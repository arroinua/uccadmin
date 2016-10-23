(function(){

	'use strict';

	angular
		.module('app.core')
		.factory('branchesService', branchesService);

	branchesService.$inject = ['poolSizeServices', 'apiService'];

	function branchesService(poolSizeServices, api){

		var branches = [];
		var plans = [];
		var servers = [];

		return {
			add: add,
			set: set,
			update: update,
			get: get,
			getAll: getAll,
			getAllAddons: getAllAddons,
			remove: remove,
			setPlans: setPlans,
			setServers: setServers,
			getPlans: getPlans,
			getServers: getServers,
			clear: clear,
			isPrefixValid: isPrefixValid,
			isPrefixUnique: isPrefixUnique,
			getSubscriptionAmount: getSubscriptionAmount
		};

		function add(item) {
			if(angular.isArray(item)) {
				angular.copy(item, branches);
				// branches = branches.concat(item);
			} else {
				delete item.adminpass;
				branches.push(item);
			}
		}

		function set(array) {
			if(Array.isArray(array)) branches = array;
		}

		function update(oid, data){
			console.log('update branch: ', oid, data);
			if(!oid) return;
			branches.forEach(function(item, index, array){
				if(item.oid === oid) {
					delete item.adminpass;
					angular.merge(item, data);
				}
			});
		}

		function get(oid, cb) {
			var found = null;
			branches.forEach(function (branch){
				if(branch.oid === oid){
					found = branch;
				}
			});
			if(cb) cb(found);
			else return found;
		}

		function getAll() {
			return branches;
		}

		function getAllAddons(params) {
			var addOns = [];
			if(params.extensions !== undefined){
				var poolsize = poolSizeServices.getPoolSize(params.extensions);
				addOns.push({
					name: "User",
					quantity: poolsize
				});
			}

			return addOns;
		}

		function remove(oid) {
			branches.forEach(function(item, index, array){
				if(item.oid && item.oid === oid) {
					array.splice(index, 1);
				}
			});
		}

		function setPlans(array){
			plans = array;
		}

		function getPlans(){
			return plans;
		}

		function setServers(array){
			servers = array;
		}

		function getServers(){
			return servers;
		}

		function clear() {
			branches = [];
			plans = [];
			servers = [];
		}

		function isPrefixValid(prefix) {
			
			var regex = /^[a-zA-Z0-9][a-zA-Z0-9-]{1,62}[a-zA-Z0-9]$/g;
			return prefix.match(regex);

		}

		function isPrefixUnique(prefix) {
			return api.request({
			    url: 'isPrefixValid',
			    params: {
			        prefix: prefix
			    }
			});
		}

		function getSubscriptionAmount(params, cb) {

			api.request({
				url: '/getSubscriptionAmount',
				params: params
			}).then(function(result){
				cb(null, result.data);
			}, function(err){
				cb(err);
			});

		}

	}

})();