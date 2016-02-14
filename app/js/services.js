// angular.module('dashApp')
dashApp.factory('authService', ['$http', '$localStorage', 'appConfig', function($http, $localStorage, appConfig){
	var baseUrl = appConfig.server;
	return {
        signup: function(data) {
            return $http.post(baseUrl + '/api/signup', data);
        },
        login: function(data) {
            return $http.post(baseUrl + '/api/login', data);
        },
        requestPasswordReset: function(data) {
           return  $http.post(baseUrl + '/api/requestPasswordReset', data);
        },
        resetPassword: function(data) {
            return $http.post(baseUrl + '/api/resetPassword', data);
        },
        logout: function(callback) {
            delete $localStorage.token;
            callback();
        }
    };
}]);

dashApp.factory('api', ['$http', 'appConfig', function($http, appConfig){
    var baseUrl = appConfig.server + '/api';
    return {
        request: function(params){
            return $http.post(baseUrl+'/'+params.url, (params.params || {}));
        }
    };
}]);

dashApp.factory('errorService', ['$translate', 'notifications', function($translate, notifications){
    function show(error){
        $translate('ERRORS.'+error)
        .then(function (translation){
            if('ERRORS.'+error === translation) {
                notifications.showError('ERROR_OCCURRED');
            } else {
                notifications.showError(translation);
            }
        });
    }

    return {
        show: show
    };
}]);

dashApp.factory('chartService', [function (){

    var data = {},
        defaultOptions = {
            responsive: true,
            showScale: false,
            scaleShowLabels: false,
            barShowStroke : false,
            maintainAspectRatio: false,
            barStrokeWidth : 0,
            barValueSpacing : 0,
            barDatasetSpacing : 0,
            multiTooltipTemplate: "<%= datasetLabel %>: <%= value %>"
        };

    function createChartObject(labels, datasets, options){
        data = {
            labels: labels,
            datasets: []
        };
        datasets.forEach(function (item){
            data.datasets.push(item);
        });
        if(options){
            angular.extend(defaultOptions, options);
        }
        return {
            data: data,
            options: defaultOptions
        };
    }

    return {
        createChartObject: createChartObject
    };
}]);

dashApp.factory('cart', ['$rootScope', function ($rootScope){

    var items = [];

    function newItem(params){
        return {
            action: params.action,
            description: params.description,
            amount: params.amount,
            currency: $rootScope.currentUser.currency,
            data: params.data
        };
    }

    return {
        add: function(params){
            // items = []; //comment this line to collect items in the cart, rather than substitute
            items.push(newItem(params));
        },
        update: function(prefix, params) {
            var item = items.forEach(function(item, index, array) {
                if(item.data.result.prefix === prefix) array[index] = params;
            });
        },
        get: function(prefix) {
            var found;
            items.forEach(function(item) {
                if(item.data.result.prefix === prefix) found = item;
            });
            return found;
        },
        getAll: function(){
            return items;
        },
        clear: function(){
            items = [];
        }
    };
}]);

dashApp.factory('branchesService', ['poolSizeServices', 'api', function(poolSizeServices, api){

    var branches = [];
    var publicMethods = {};

    publicMethods.set = function(array){
        branches = array;
    };

    publicMethods.add = function(item){
        if(angular.isArray(item)) {
            angular.copy(item, branches);
            // branches = branches.concat(item);
        } else {
            branches.push(item);
        }
    };

    publicMethods.get = function(oid, cb){
        var found = null;
        branches.forEach(function (branch){
            if(branch.oid === oid){
                found = branch;
            }
        });
        if(cb) cb(found);
        else return found;
    };

    publicMethods.getAll = function(){
        return branches;
    };

    publicMethods.getAllAddons = function(params){
        var addOns = [];
        if(params.extensions !== undefined){
            var poolsize = poolSizeServices.getPoolSize(params.extensions);
            addOns.push({
                name: "User",
                quantity: poolsize
            });
        }

        return addOns;
    };

    publicMethods.getSubscriptionAmount = function(params, cb){

        api.request({
            url: '/getSubscriptionAmount',
            params: params
        }).then(function(result){
            cb(null, result.data);
        }, function(err){
            cb(err);
        });

    };

    return publicMethods;

}]);

dashApp.factory('poolSizeServices', ['utils', function (utils){
    return {
        getPoolSize: function(arrayOrString) {
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
        },
        poolArrayToString: function(array){
            var str = '';
            array.forEach(function(obj, indx, array){
                if(indx > 0) str += ',';
                str += obj.firstnumber;
                if(obj.poolsize > 1) str += ('-' + (obj.firstnumber+obj.poolsize-1));
            });
            return str;
        },
        poolStringToObject: function(string){
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
    };
}]);

dashApp.factory('storage', ['$localStorage', function ($localStorage){
    return {
        put: function (name, value) {
            $localStorage[name] = value;
        },
        get: function (name) {
            return $localStorage[name];
        }
    };
}]);

dashApp.factory('utils', function (){

    var methods = {
        isArray: function(obj){
            return typeof obj === 'object';
        },
        isString: function(obj){
            return typeof obj === 'string';
        },
        stringToFixed: function(string, point){
            return parseFloat(string).toFixed(point);
        },
        parseDate: function(date, format){
            return moment(date).format(format || 'DD/MM/YYYY');
            // return new Date(date).toLocaleDateString();
        },
        getDifference: function(date1, date2, output){
            return moment(date1).diff(date2, (output ? output : ''));
        },
        checkPasswordStrength: function(string) {
            var strong = new RegExp("^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&\*])(?=.{8,})"),
                middle = new RegExp("^(((?=.*[a-z])(?=.*[A-Z])(?=.*[0-9]))|((?=.*[a-z])(?=.*[A-Z])(?=.*[!@#\$%\^&\*])))(?=.{6,})");
            if(strong.test(string)) {
                return 2;
            } else if(middle.test(string)) {
                return 1;
            } else {
                return 0;
            }
        },
        generatePassword: function(minlength, maxlength) {
            var chars = "abcdefghijklmnopqrstuvwxyz!@$%^&*_ABCDEFGHIJKLMNOP1234567890",
                passLength = Math.floor(Math.random() * (maxlength - minlength)) + minlength,
                pass = "";
            
            for (var x = 0; x < passLength; x++) {
                var i = Math.floor(Math.random() * chars.length);
                pass += chars.charAt(i);
            }
            return pass;
        }
    };
    return methods;
});

dashApp.factory('spinnerService', [function(){
    var spinners = {};
    return {
        _register: function (data) {
            if (!data.hasOwnProperty('name')) {
                throw new Error("Spinner must specify a name when registering with the spinner service.");
            }
            if (spinners.hasOwnProperty(data.name)) {
                throw new Error("A spinner with the name '" + data.name + "' has already been registered.");
            }
            spinners[data.name] = data;
        },
        show: function (name) {
            var spinner = spinners[name];
            if (!spinner) {
                throw new Error("No spinner named '" + name + "' is registered.");
            }
            spinner.show();
        },
        hide: function (name) {
            var spinner = spinners[name];
            if (!spinner) {
                throw new Error("No spinner named '" + name + "' is registered.");
            }
            spinner.hide();
        },
        showAll: function () {
            for (var name in spinners) {
                spinners[name].show();
            }
        },
        hideAll: function () {
            for (var name in spinners) {
                spinners[name].hide();
            }
        }
    };
}]);