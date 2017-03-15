angular.module('yds').directive('ydsHeatmap', ['Data', '$ocLazyLoad', 'DashboardService',
	function (Data, $ocLazyLoad, DashboardService) {
		return {
			restrict: 'E',
			scope: {
				projectId: '@',         // ID of the project that the data belong
				viewType: '@',          // Name of the array that contains the visualised data
				lang: '@',			    // Lang of the visualised data

				colorAxis: '@',         // Enable or disable colored axis of chart
				colorType: '@',			// Axis color type (linear or logarithmic)

				legend: '@',            // Enable or disable chart legend
				legendVAlign: '@',      // Vertical alignment of the chart legend (top, middle, bottom)
				legendHAlign: '@',      // Horizontal alignment of the chart legend (left, center, right)
				legendLayout: '@',      // Layout of the chart legend (vertical, horizontal)

				useDashboardParams: '@',// If true, the heatmap will watch for DashboardService parameter changes
				dashboardId: '@',		// Optional, used for getting parameters from DashboardService
				countrySelection: '@',  // Allow selecting countries on the map

				europeOnly: '@',		// If true, the heatmap will show a map of Europe instead of the entire world

				exporting: '@',         // Enable or disable the export of the chart
				noBorder: '@',			// If true, the component will have no border
				elementH: '@'		    // Set the height of the component
			},
			templateUrl: ((typeof Drupal != 'undefined')? Drupal.settings.basePath  + Drupal.settings.yds_project.modulePath  +'/' :'') + 'templates/heatmap.html',
			link: function (scope, elem, attrs) {
				var projectId = scope.projectId;
				var viewType = scope.viewType;
				var lang = scope.lang;
				var colorAxis = scope.colorAxis;
				var colorType = scope.colorType;
				var legend = scope.legend;
				var legendVAlign = scope.legendVAlign;
				var legendHAlign = scope.legendHAlign;
				var legendLayout = scope.legendLayout;
				var useDashboardParams = scope.useDashboardParams;
				var dashboardId = scope.dashboardId;
				var countrySelection = scope.countrySelection;
				var noBorder = scope.noBorder;
				var exporting = scope.exporting;
				var elementH = scope.elementH;
				var europeOnly = scope.europeOnly;

				var heatmapContainer = angular.element(elem[0].querySelector('.heatmap-container'));

				//create a random id for the element that will render the chart
				var elementId = "heatmap" + Data.createRandomId();
				heatmapContainer[0].id = elementId;

                // Any extra parameters will be saved to check if something changed before refreshing the heatmap
                var extraParams = {};

				// Selectivity instance
				var selectivity = null;

				//check if project id or grid type are defined
				if(angular.isUndefined(projectId) || projectId.trim()=="") {
					scope.ydsAlert = "The YDS component is not properly initialized " +
						"because the projectId attribute isn't configured properly." +
						"Please check the corresponding documentation section";
					return false;
				}

				//check if view-type attribute is empty and assign the default value
				if(_.isUndefined(viewType) || viewType.trim()=="")
					viewType = "default";

				//check if the language attr is defined, else assign default value
				if(angular.isUndefined(lang) || lang.trim()=="")
					lang = "en";

				//check if colorAxis attr is defined, else assign default value
				if (_.isUndefined(colorAxis) || colorAxis.trim()=="")
					colorAxis = "false";

				//check if colorType attr is defined, else assign default value
				if (_.isUndefined(colorType) || colorType.trim()=="")
					colorType = "linear";

				//check if legend attr is defined, else assign default value
				if (_.isUndefined(legend) || legend.trim()=="")
					legend = "false";

				//check if legendVAlign attr is defined, else assign default value
				if (_.isUndefined(legendVAlign) || legendVAlign.trim()=="")
					legendVAlign = "top";

				//check if legendVAlign attr is defined, else assign default value
				if (_.isUndefined(legendHAlign) || legendHAlign.trim()=="")
					legendHAlign = "left";

				//check if legendLayout attr is defined, else assign default value
				if (_.isUndefined(legendLayout) || legendLayout.trim()=="")
					legendLayout = "horizontal";

				//check if useDashboardParams attr is defined, else assign default value
				if (_.isUndefined(useDashboardParams) || useDashboardParams.trim()=="")
                    useDashboardParams = "false";

				//check if dashboardId attr is defined, else assign default value
				if (_.isUndefined(dashboardId) || dashboardId.trim()=="")
					dashboardId = "default";

				//check if countrySelection attr is defined, else assign default value
				if (_.isUndefined(countrySelection) || countrySelection.trim()=="")
					countrySelection = "false";

				//check if the noBorder attr is defined, else assign default value
				if(_.isUndefined(noBorder) || (noBorder!="true" && noBorder!="false"))
					noBorder = "false";

				//check if the exporting attr is defined, else assign default value
				if(_.isUndefined(exporting) || (exporting!="true" && exporting!="false"))
					exporting = "true";

				//check if the europeOnly attr is defined, else assign default value
				if(_.isUndefined(europeOnly) || (europeOnly!="true" && europeOnly!="false"))
                    europeOnly = "false";

				//check if the component's height attr is defined, else assign default value
				if(_.isUndefined(elementH) || _.isNaN(elementH))
					elementH = 300;

				// Set cookie related variables
                var cookieKey = viewType;   // Key of cookie for this heatmap
                var firstLoad = true;       // Remember if it is the first load or not, to load countries from cookie

				// Setup base heatmap options
				var heatmapOptions = {
					initialized: false,
					chart : {
						renderTo: elementId,
						borderWidth: (noBorder == "true") ? 0 : 1
					},
					title : { text : '' },
					mapNavigation: {
						enabled: true,
						buttonOptions: {
							style: {display: 'none'}
						}
					},
					legend: { enabled: false },
					exporting: {
						buttons: {
							contextButton: {
								symbol: 'url(' + ((typeof Drupal != 'undefined')? Drupal.settings.basePath + Drupal.settings.yds_project.modulePath + '/' :'') + 'img/fa-download-small.png)',
								symbolX: 19,
								symbolY: 19
							}
						},
						enabled: (exporting === "true")
					},
					series: []
				};

				// Add default color axis to heatmap options
				if (colorAxis == "true") {
					heatmapOptions.colorAxis = {
						min: 1,
						type: colorType,
						minColor: '#EEEEFF',
						maxColor: '#000022',
						stops: [
							[0, '#EFEFFF'],
							[0.67, '#4444FF'],
							[1, '#000022']
						]
					};
				}

				// Add chart legend to heatmap options
				if (legend == "true") {
					heatmapOptions.legend = {
						layout: legendLayout,
						borderWidth: 0,
						backgroundColor: 'rgba(255,255,255,0.85)',
						floating: true,
						verticalAlign: legendVAlign,
						align: legendHAlign
					}
				}

				//set the height of the chart
				heatmapContainer[0].style.height = elementH + 'px';

				// Load map data from highcharts and create the heatmap
				$ocLazyLoad.load ({
					files: ['https://code.highcharts.com/mapdata/custom/world.js',
							'https://code.highcharts.com/mapdata/custom/europe.js'],
					cache: true
				}).then(function() {
					if (useDashboardParams == "true") {
						DashboardService.subscribeYearChanges(scope, createHeatmap);
						DashboardService.subscribeSelectionChanges(scope, createHeatmap);
					}

					createHeatmap();
				});

				/**
				 * Function that takes array of points from Highmaps and keeps only the
				 * country names, codes and values
				 * @param points
				 * @returns {*}
				 */
				var formatPoints = function(points) {
					return points.map(function(p) {
						return {
							name: p.name,
							code: p.code,
							value: p.value
						};
					});
				};

				/**
				 * Get points from the heatmap's series, and turn it into options for Selectivity
				 * @returns {*}
				 */
				var getSelectivityItemsFromPoints = function() {
					// Keep only countries that have a value, which means they are available for selection
					var selectivityData = _.filter(scope.heatmap.series[0].data, function(item) {
						return !_.isNull(item.value) && !_.isUndefined(item["iso-a2"]);
					});

					// Keep only code and name for each country
					selectivityData = selectivityData.map(function(point) {
						return {
							id: point["iso-a2"],
							text: point.name
						}
					});

					// Sort countries by their names
					selectivityData = _.sortBy(selectivityData, "text");

					return selectivityData;
				};

				/**
				 * Initialize Selectivity dropdown for country selection
				 */
				var initializeSelectivity = function() {
					// Use jQuery to initialize Selectivity
					var dropdownContainer = _.first(angular.element(elem[0].querySelector('.country-selection-container')));

					selectivity = $(dropdownContainer).selectivity({
						items: getSelectivityItemsFromPoints(),
						multiple: true,
						placeholder: 'Type to search a country'
					});

					// Add listener for when something in Selectivity is added or removed
					$(selectivity).on("change", function(e) {
						var points = scope.heatmap.series[0].data;

						if (_.has(e, "added") && !_.isUndefined(e.added)) {
							var countryToSelect = e.added.id;

							var pointToSelect = _.findWhere(points, {
								"iso-a2": countryToSelect
							});

							pointToSelect.select(true, true);
						}

						if (_.has(e, "removed") && !_.isUndefined(e.removed)) {
							var countryToDeselect = e.removed.id;

							var pointToDeselect = _.findWhere(points, {
								"iso-a2": countryToDeselect
							});

							pointToDeselect.select(false, true);
						}
					});
				};

				/**
				 * Creates the heatmap on the page if it doesn't exist, or updates it
				 * with the new data if it is initialized already
				 * @param response	Server response from heatmap API
				 */
				var visualizeHeatmap = function(response) {
					// Initialize heatmap if it's not initialized
					if (!heatmapOptions.initialized) {
						// Create empty heatmap
						scope.heatmap = new Highcharts.Map(heatmapOptions);

						heatmapOptions.initialized = true;
                    }

					// If view has color axis use that instead of default one
					if (colorAxis == "true") {
						var view = _.first(response.view);

						if (_.has(view, "colorAxis")) {
							scope.heatmap.colorAxis[0].update(view.colorAxis);
						}
					}

					if (_.isEmpty(scope.heatmap.series)) {
						var mapData = Highcharts.maps['custom/world'];
						if (europeOnly == "true") {
                            mapData = Highcharts.maps['custom/europe'];
						}

						// Create new series object
						var newSeries = {
							name: 'Country',
							mapData: mapData,
							data: response.data,
							mapZoom: 2,
							joinBy: ['iso-a2', 'code'],
							dataLabels: {
								enabled: true,
								color: '#FFFFFF',
								formatter: function () {
									if (this.point.value) {
										return this.point.name;
									}
								}
							},
							tooltip: {
								headerFormat: '',
								pointFormat: '{point.name}'
							}
						};

						if (countrySelection == "true") {
                            // Country selection enabled, set more properties to the series before adding it to heatmap
							newSeries.allowPointSelect = true;
							newSeries.cursor = "pointer";

							newSeries.states = {
								select: {
									color: '#a4edba',
									borderColor: 'black',
									dashStyle: 'shortdot'
								}
							};

							newSeries.point = {
								events: {
									select: function () {
                                        // Get selected points
										var points = scope.heatmap.getSelectedPoints();
										points.push(this);

										points = formatPoints(points);

										// Give new selected countries to the service (sets the cookie too)
										DashboardService.setCountries(viewType, points);

										// Set new selected points in Selectivity
										setSelectivityData(selectivity, points);
									},
									unselect: function() {
                                        // Get selected points
										var points = scope.heatmap.getSelectedPoints();

										// Remove unselected points from points
										var pIndex = points.indexOf(this);
										if (pIndex > -1 ) {
											points.splice(pIndex, 1);
										}

										points = formatPoints(points);

										// Give new selected countries to the service (sets the cookie too)
										DashboardService.setCountries(viewType, points);

										// Set new selected points in Selectivity
										setSelectivityData(selectivity, points);
									}
								}
							};

							// Add new series to the heatmap
							scope.heatmap.addSeries(newSeries);

							// Highcharts chart is initialized, create data for Selectivity dropdown
							initializeSelectivity();
						} else {
							// Add new series to the heatmap
							scope.heatmap.addSeries(newSeries);
						}
					} else {
						// Heatmap already has a series, update it with new data
						scope.heatmap.series[0].setData(response.data);

						// In the new data, select the points that were selected before, if they exist
						var prevSelectedCountries = $(selectivity).selectivity("value");
						var heatmapCountries = scope.heatmap.series[0].data;

						_.each(prevSelectedCountries, function(country) {
							// Get the Highcharts point for this country
							var countryPoint = _.findWhere(heatmapCountries, { "iso-a2": country });

							// If the point value is not null, select it, otherwise deselect it
							countryPoint.select(!_.isNull(countryPoint.value), true);
						});

						// Update the available options in Selectivity
						$(selectivity).selectivity("setOptions", {
							items: getSelectivityItemsFromPoints()
						});
					}

					if (firstLoad) {
                        // On first load, restore selected countries from cookie
                        var cookieCountries = DashboardService.getCookieObject(cookieKey);

                        if (!_.isEmpty(cookieCountries)) {
                            // Get points of heatmap
                            var points = scope.heatmap.series[0].points;

                            // For each cookie country, try to find it in the heatmap series and select it
                            _.each(cookieCountries, function (point) {
                                var pointToSelect = _.findWhere(points, {
                                    "iso-a2": point.code
                                });

                                // Select the point if found (selected check not needed with firstLoad variable)
                                if (!_.isUndefined(pointToSelect) && !pointToSelect.selected) {
                                    pointToSelect.select(true, true);
                                }
                            });
                        }

                        firstLoad = false;
                    }
                };

				/**
				 * Get formatted points from the heatmap and add them as the selection in Selectivity
				 * @param selectivity	Selectivity instance
				 * @param points		Points to select
				 */
				var setSelectivityData = function(selectivity, points) {
					$(selectivity).selectivity("data", points.map(function(country) {
						return {
							id: country.code,
							text: country.name
						}
					}), {
						triggerChange: false
					});

					$(selectivity).selectivity("rerenderSelection");
				};

				/**
				 * Shows an error to the user (for when heatmap API returns error)
				 * @param error
				 */
				var createHeatmapError = function(error) {
					if (_.isNull(error) || _.isUndefined(error) || _.isUndefined(error.message))
						scope.ydsAlert = "An error has occurred, please check the configuration of the component";
					else
						scope.ydsAlert = error.message;
				};

				/**
				 * Get extra parameters if needed, fetch data and call the function to render the heatmap component
				 */
				var createHeatmap = function() {
					// If the map should use variables from DashboardService, add them to extra params
					if (useDashboardParams == "true") {
						var newExtraParams = DashboardService.getApiOptions(dashboardId);

						// Check if any parameters changed before continuing
						if (_.isEqual(extraParams, newExtraParams)) {
							// Nothing changed, do not refresh heatmap
							return;
						} else {
							extraParams = newExtraParams;
						}
                    }

					// Get heatmap data
					Data.getProjectVis("heatmap", projectId, viewType, lang, extraParams)
						.then(visualizeHeatmap, createHeatmapError);
				};
			}
		}
	}
]);
