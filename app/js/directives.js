// angular.module('dashApp')
dashApp.directive('inputHoshi', function(){

    function link(scope, el, attr, ngModel){

        if (!String.prototype.trim) {
            (function() {
                // Make sure we trim BOM and NBSP
                var rtrim = /^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g;
                String.prototype.trim = function() {
                    return this.replace(rtrim, '');
                };
            })();
        }
        if( el[0].value !== undefined && el[0].value.trim() !== '' ) {
            el[0].parentNode.className += ' input--filled';
        }
        if( el[0].nodeName === 'SELECT' ){
            el[0].parentNode.className += ' input--filled';
        }

        function onInputFocus( ev ) {
            if( ev.target.value.trim() !== '' )
                return;
            ev.target.parentNode.className += ' input--filled';
        }

        function onInputBlur( ev ) {
            if( ev.target.value.trim() === '' ) {
                ev.target.parentNode.className = ev.target.parentNode.className.replace(/\binput--filled\b/,'');
            }
        }

        // events:
        el.on( 'focus', onInputFocus );
        el.on( 'blur', onInputBlur );

        if(ngModel){
            scope.$watch(function(){
                return ngModel.$modelValue;
            }, function(val){
                if( el[0].value !== undefined && el[0].value.trim() !== '' ) {
                    el[0].parentNode.className += ' input--filled';
                }
                if(scope.inpType === 'integer'){
                    ngModel.$setViewValue(parseInt(ngModel.$modelValue, 10));
                }
            });
        }
    }

	return {
        require: '?ngModel',
        scope: {
            inpType: '@'
        },
        link: link
    };
});

dashApp.directive('popoverable', [function(){

    function link(scope, el, attr, ngModel){
        $(el[0]).popover({
            placement: 'bottom',
            html: true
        });
    }

    return {
        link: link
    };
}]);

dashApp.directive('numpool', function() {
    return {
        link: function(scope, el, attrs){
            el.on('keydown', function (e){
                // Allow: backspace, tab, delete, escape, enter
                if ([46, 9, 8, 27, 13].indexOf(e.keyCode) !== -1 ||
                     // Allow: Ctrl+A
                    (e.keyCode == 65 && e.ctrlKey === true) ||
                     // Allow: home, end, left, right, down, up
                    (e.keyCode >= 35 && e.keyCode <= 40) ||
                     // Allow: comma and dash 
                    (e.keyCode == 188 && e.shiftKey === false) ||
                    (e.keyCode == 189 && e.shiftKey === false)) {
                         // let it happen, don't do anything
                         return;
                }
                if ((e.shiftKey || e.altKey || (e.keyCode < 48 || e.keyCode > 57)) && (e.keyCode < 96 || e.keyCode > 105)) {
                    e.preventDefault();
                }
            });
        }
    };
});

dashApp.directive('validprefix', ['$q', '$rootScope', 'api', function($q, $rootScope, api) {
  return {
    require: 'ngModel',
    link: function(scope, el, attrs, ctrl) {

        el.on('keydown', function (e){
            if (e.altKey || e.keyCode === 18 || e.keyCode === 32 || e.keyCode > 90) {
                e.preventDefault();
            }
        });

      ctrl.$asyncValidators.validprefix = function(modelValue, viewValue) {
        if (ctrl.$isEmpty(modelValue)) {
          // consider empty model valid
          return $q.when();
        }

        var def = $q.defer();

        api.request({
            url: 'isPrefixValid',
            params: {
                prefix: modelValue
            }
        }).then(function(res){
            if(res.data.result) def.resolve();
            else def.reject();
        }, function(err){
            $rootScope.error = err;
        });

        return def.promise;
      };
    }
  };
}]);

dashApp.directive('instRow', function(){

    function link(scope, el, attr){

        function checkElement(){
            if(el[0].checked){
                scope.array.push({oid: scope.oid, sid: scope.sid});
            } else {
                scope.array.forEach(function(item, index, array){
                    if(item.oid === scope.oid)
                        array.splice(index, 1);
                });
            }
        }

        el.on('change', checkElement);
    }

    return {
        scope: {
            oid: '@',
            sid: '@',
            array: '='
        },
        link: link
    };
});

dashApp.directive('sideMenu', function(){
    return {
        restrict: 'AE',
        transclude: true,
        controller: 'SidebarController',
        templateUrl: '/partials/sidebar.html'
    };
});

dashApp.directive('topMenu', function(){
    return {
        restrict: 'AE',
        transclude: true,
        controller: 'TopmenuController',
        templateUrl: '/partials/topmenu.html'
    };
});

dashApp.directive('planItem', function(){
    return {
        restrict: 'AE',
        scope: {
            model: '=',
            plan: '='
        },
        templateUrl: '/partials/plan.html'
    };
});

dashApp.directive('wizard', function(){
    return {
        restrict: 'AE',
        transclude: true,
        scope: {
            submit: '&',
            // globEdition: '=',
            submited: '@'
        },
        controller: function($scope){
            var panels = $scope.panels = [];

            $scope.selIndex = 0;
            $scope.select = function(panel){
                // angular.forEach(panels, function(panel, index){
                //     panel.selected = false;
                // });
                panel.selected = true;
            };

            $scope.selectAll = function(){
                angular.forEach(panels, function(panel){
                    panel.selected = true;
                });
            };

            $scope.nextPanel = function(){
                if($scope.selIndex >= panels.length-1)
                    return;

                $scope.select(panels[$scope.selIndex+1]);
                $scope.selIndex += 1;
            };

            $scope.prevPanel = function(){
                if($scope.selIndex === 0)
                    return;
                $scope.select(panels[$scope.selIndex-1]);
                $scope.selIndex -= 1;
            };

            $scope.submitWiz = function(){
                $scope.submit();
            };

            this.addPanel = function(panel){
                if(panels.length === 0){
                    $scope.select(panel);
                }
                panels.push(panel);
                return panels.length;
            };
            
            if($scope.submited){
                $scope.selectAll();
            }

        },
        // link: function(scope, el, attr){
        //     $('.cd-select').on('click', function(){
        //         if($(this).hasClass('selected')) {
        //             scope.globEdition = '';
        //         } else {
        //             scope.globEdition = $(this).attr('edition');
        //         }
        //         $('.cd-prising-wrapper').toggleClass('selected');

        //         $(this).closest('.cd-prising-panel').toggleClass('selected');
        //     });
        // },
        templateUrl: '/partials/wizard.html'
    };
})
.directive('wizPanel', function(){
    return {
        require: '^wizard',
        restrict: 'AE',
        transclude: true,
        scope: {
            panel: '@'
        },
        link: function(scope, el, attr, wizCtrl){
            scope.step = wizCtrl.addPanel(scope);
        },
        templateUrl: '/partials/wizpane.html'
    };
});
