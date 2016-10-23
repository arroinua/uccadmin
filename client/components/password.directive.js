(function(){

    'use strict';

    angular
        .module('app.core')
        .directive('password', password);

    password.$inject = ['utilsService'];
    function password(utils){

        return {
            restrict: 'AE',
            require: 'ngModel',
            link: link
        };

        function link(scope, el, attrs, ctrl) {

            ctrl.$validators.password = function(modelValue, viewValue) {
                if(ctrl.$isEmpty(modelValue)) {
                    return true;
                }

                // check if password contains the branch prefix
                if(scope.instVm && scope.instVm.instance) {
                    var prefix = scope.instVm.instance.result.prefix;
                    if(prefix && new RegExp(prefix, 'i').test(modelValue))
                        return false;
                }

                return !!utils.checkPasswordStrength(modelValue);
            };
        }
    }
})();