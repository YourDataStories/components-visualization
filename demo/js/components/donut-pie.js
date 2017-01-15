angular.module('yds').directive('ydsDonutPie', ['Data', 'Filters', function(Data, Filters) {
    return {
        restrict: 'E',
        scope: {
            projectId: '@',     //id of the project that the data belong
            viewType: '@',      //name of the array that contains the visualised data
            lang: '@',          //lang of the visualised data

            extraParams: '=',   //extra attributes to pass to the API, if needed

            exporting: '@',     //enable or disable the export of the chart
            elementH: '@'       //set the height of the component
        },
        templateUrl: ((typeof Drupal != 'undefined')? Drupal.settings.basePath + Drupal.settings.yds_project.modulePath + '/' :'') + 'templates/pie.html',
        link: function (scope, element) {
            var barContainer = angular.element(element[0].querySelector('.pie-container'));

            //create a random id for the element that will render the chart
            var elementId = "pie" + Data.createRandomId();
            barContainer[0].id = elementId;

            var projectId = scope.projectId;
            var viewType = scope.viewType;
            var lang = scope.lang;
            var exporting = scope.exporting;
            var elementH = scope.elementH;
            var extraParams = scope.extraParams;

            //check if the projectId and the viewType attr is defined, else stop the process
            if (_.isUndefined(projectId) || projectId.trim()=="") {
                scope.ydsAlert = "The YDS component is not properly configured. " +
                    "Please check the corresponding documentation section.";
                return false;
            }

            //check if view-type attribute is empty and assign the default value
            if(_.isUndefined(viewType) || viewType.trim()=="")
                viewType = "default";

            //check if the language attr is defined, else assign default value
            if(_.isUndefined(lang) || lang.trim()=="")
                lang = "en";

            //check if the exporting attr is defined, else assign default value
            if(_.isUndefined(exporting) || (exporting!="true" && exporting!="false"))
                exporting = "false";

            //check if the component's height attr is defined, else assign default value
            if(_.isUndefined(elementH) || _.isNaN(elementH))
                elementH = 200;

            // Show loading animation
            scope.loading = true;

            //set the height of the chart
            barContainer[0].style.height = elementH + 'px';

            // Get data and visualize bar
            Data.getProjectVis("pie", projectId, viewType, lang, extraParams)
                .then(function (response) {
                    // Check that the component has not been destroyed
                    if (scope.$$destroyed)
                        return;

                    var options = response.data;

                    // Set exporting options
                    options.exporting = {
                        buttons: {
                            contextButton: {
                                symbol: 'url(' + ((typeof Drupal != 'undefined') ? Drupal.settings.basePath + Drupal.settings.yds_project.modulePath + '/' : '') + 'img/fa-download-small.png)',
                                symbolX: 12,
                                symbolY: 12
                            }
                        },

                        enabled: (exporting === "true")
                    };

                    // Add selection events to all series
                    _.each(options.series, function(series) {
                        series.allowPointSelect = true;

                        if (!_.has(series, "point")) {
                            series.point = {};
                        }

                        series.point.events = {
                            select: function(e) {
                                console.log("selection", e);
                            },
                            unselect: function(e) {
                                console.log("unselect", e);
                            }
                        }
                    });

                    new Highcharts.Chart(elementId, options);

                    // Remove loading animation
                    scope.loading = false;
                }, function (error) {
                    if (_.isNull(error) || _.isUndefined(error) || _.isUndefined(error.message))
                        scope.ydsAlert = "An error has occurred, please check the configuration of the component";
                    else
                        scope.ydsAlert = error.message;

                    // Remove loading animation
                    scope.loading = false;
                });
        }
    };
}]);