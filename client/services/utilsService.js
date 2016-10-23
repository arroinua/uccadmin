(function(){

	'use strict';

	angular
		.module('app')
		.factory('utilsService', utilsService);

	utilsService.$inject = ["uibDateParser"];

	function utilsService(uibDateParser){

		return {
			isArray: isArray,
			isString: isString,
			stringToFixed: stringToFixed,
			arrayToObject: arrayToObject,
			parseDate: parseDate,
			getDifference: getDifference,
			checkPasswordStrength: checkPasswordStrength,
			generatePassword: generatePassword
		};

		function isArray(obj) {
			return typeof obj === 'object';
		}

		function isString(obj) {
			return typeof obj === 'string';
		}

		function stringToFixed(string, point) {
			return parseFloat(string).toFixed(point);
		}

		function arrayToObject(array, key) {
			var obj = {}, prop = '';
			array.forEach(function(item){
				prop = item[key];
				obj[prop] = item;
			});
			return obj;
		}

		function parseDate(date, format) {
			return moment(date).format(format || 'DD MMMM YYYY');
			// return new Date(date).toLocaleDateString();
		}

		function getDifference(date1, date2, output) {
			return moment(date1).diff(date2, (output ? output : ''));
		}

		function checkPasswordStrength(string) {
			var strong = new RegExp("^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&\*])(?=.{10,})"),
				middle = new RegExp("^(((?=.*[a-z])(?=.*[A-Z])(?=.*[0-9]))|((?=.*[a-z])(?=.*[A-Z])(?=.*[!@#\$%\^&\*])))(?=.{8,})");
			if(strong.test(string)) {
				return 2;
			} else if(middle.test(string)) {
				return 1;
			} else {
				return 0;
			}
		}


		// TODO: generate password on the server side!!!
		function generatePassword(minlength, maxlength) {
			var chars = "abcdefghijklmnopqrstuvwxyz!@$%^&*_ABCDEFGHIJKLMNOP1234567890",
				passLength = Math.floor(Math.random() * (maxlength - minlength)) + minlength,
				pass = "";
			
			for (var x = 0; x < passLength; x++) {
				var i = Math.floor(Math.random() * chars.length);
				pass += chars.charAt(i);
			}
			return pass;
		}

	}

})();