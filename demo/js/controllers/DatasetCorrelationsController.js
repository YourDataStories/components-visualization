angular.module("yds").controller("DatasetCorrelationsController", ["$scope", "$ocLazyLoad", "$timeout", "PValues",
    function ($scope, $ocLazyLoad, $timeout, PValues) {
        var scope = $scope;
        scope.loaded = false;
        var controller;

        var pValue = 0.05;

        // Load required files from:
        // http://new.censusatschool.org.nz/resource/using-the-eikosogram-to-teach-conditional-and-joint-probability/
        $ocLazyLoad.load({
            files: [
                "https://www.stat.auckland.ac.nz/~wild/TwoWay/shared/d3.js",
                "https://www.stat.auckland.ac.nz/~wild/TwoWay/probability.js",
                "https://www.stat.auckland.ac.nz/~wild/TwoWay/probModel.js",
                "https://www.stat.auckland.ac.nz/~wild/TwoWay/probView.js",
                "https://www.stat.auckland.ac.nz/~wild/TwoWay/eiko.js",
                "//cdn.jsdelivr.net/npm/jstat@latest/dist/jstat.min.js"
            ],
            cache: true
        }).then(function () {
            // Show the file selector now that everything is loaded
            scope.loaded = true;

            // Get the controller
            controller = window.mainControl;

            if (!_.isUndefined(controller)) {
                // Set custom functions in the controller
                controller.finishedModelSU = function () {
                    $timeout(function () {
                        // window.dataHeadings variable should be available by now...
                        var pvalues = PValues.calculate(window.dataHeadings, controller.model.getData());

                        createPValueHeatmap(PValues.getVarNames(), pValuesToHighcharts(pvalues));
                    });

                    // Do other things that this function did before..
                    // this.view.suManipTools(this.model.getCategorical(), self.finToolSU);
                };
            } else {
                //todo: Show error...
            }
        });

        /**
         * Transform the p-values from a 2D array, to the format that Highcharts heatmaps accept.
         * @param data  2D array of values (as returned from PValues service)
         * @returns {Array} Data formatted for Highcharts heatmap
         */
        var pValuesToHighcharts = function (data) {
            var newData = [];

            _.each(data, function (row, i) {
                _.each(row, function (value, j) {
                    var point = {
                        x: i,
                        y: j,
                        value: value
                    };

                    // For the points in the diagonal, make them a specific color
                    if (i === j) {
                        point.color = "#828282";
                    }

                    newData.push(point);
                });
            });

            return newData;
        };

        /**
         * Create a heatmap to show the given p values.
         * @param variableNames Names of the variables
         * @param data          P Values (formatted for Highcharts)
         */
        var createPValueHeatmap = function (variableNames, data) {
            // Create the chart
            Highcharts.chart("p-value-heatmap-container", {
                chart: {
                    type: "heatmap"
                },
                title: {
                    text: "P Values"
                },
                xAxis: {
                    categories: variableNames,
                    opposite: true  // Show labels on top
                },
                yAxis: {
                    categories: variableNames,
                    reversed: true,
                    title: null
                },
                colorAxis: {
                    min: 0,
                    max: 1,
                    minColor: "#00FF00",
                    maxColor: "#ff7272",
                    stops: [
                        [0, "#00FF00"],
                        [pValue, "#ffffff"],
                        [1, "#ff7272"]
                    ]
                },
                series: [{
                    name: "P Values",
                    borderWidth: 1,
                    data: data
                }]
            });
        };
    }
]);