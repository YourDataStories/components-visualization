angular.module('yds').directive('ydsDashboardVisualization', ['CountrySelectionService',
    function(CountrySelectionService) {
        return {
            restrict: 'E',
            scope: {
                elementH: '@'   // Height of component
            },
            templateUrl: ((typeof Drupal != 'undefined') ? Drupal.settings.basePath + Drupal.settings.yds_project.modulePath  +'/' :'') + 'templates/dashboard-visualization.html',
            link: function (scope, element, attrs) {
                // Check if the component's height attribute is defined, else assign default value
                if (_.isUndefined(scope.elementH) || scope.elementH.trim() == "")
                    scope.elementH = 300;

                scope.selectedVis = "";

                /**
                 * Change selected visualization type and if there is a year range selected, add it to apiOptions
                 * @param visType
                 */
                scope.selectVis = function(visType) {
                    // If there is a selected year range, add it to the parameters that will be added to the API call
                    var minYear = CountrySelectionService.getMinYear();
                    var maxYear = CountrySelectionService.getMaxYear();

                    if (!_.isNull(minYear) && !_.isNull(maxYear)) {
                        scope.apiOptions = {
                            year: "[" + minYear + " TO " + maxYear + "]"
                        };
                    }

                    // Change selected visualization type
                    scope.selectedVis = visType;
                };
            }
        };
    }
]);
