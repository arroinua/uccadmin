(function(){

	'use strict';

	angular
		.module('app')
		.factory('poolSizeServices', poolSizeServices);

	poolSizeServices.$inject = ['utilsService'];

	function poolSizeServices(utils){

		return {
			getPoolSize: getPoolSize,
			poolArrayToString: poolArrayToString,
			poolStringToObject: poolStringToObject
		};

		function getPoolSize(arrayOrString) {
			var poolsize = 0;

			if(utils.isArray(arrayOrString)){
				arrayOrString.forEach(function(obj, indx, array){
					poolsize += obj.poolsize;
				});
			} else {
				arrayOrString
				.split(',')
				.map(function(str){
					return str.split('-');
				})
				.forEach(function(array){
					poolsize += parseInt(array[1] ? (array[1] - array[0]+1) : 1, 10);
				});
			}
				
			return poolsize;
		}

		function poolArrayToString(array) {
			var str = '';
			array.forEach(function(obj, indx, array){
				if(indx > 0) str += ',';
				str += obj.firstnumber;
				if(obj.poolsize > 1) str += ('-' + (obj.firstnumber+obj.poolsize-1));
			});
			return str;
		}

		function poolStringToObject(string) {
			var extensions = [];

			string
			.replace(/\s/g, '')
			.split(',')
			.map(function(str){
				return str.split('-');
			})
			.forEach(function(array){
				extensions.push({
					firstnumber: parseInt(array[0], 10),
					poolsize: parseInt(array[1] ? (array[1] - array[0]+1) : 1, 10)
				});
			});
			return extensions;
		}
	}

})();