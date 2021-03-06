angular.module("yds").directive("ydsDashboardUpdater", ["Data", "DashboardService", "$timeout", "$location",
    function (Data, DashboardService, $timeout, $location) {
        return {
            restrict: "E",
            scope: {
                type: "@",                  // What type of component to show (grid, info etc.)
                projectId: "@",             // Project ID
                viewType: "@",              // Type to give to component
                lang: "@",                  // Language of component
                dashboardId: "@",           // ID used for getting selected year range from DashboardService
                dynamicDashboard: "@",      // Set to true if you are using this in a Dashboard with dynamic filters

                aggregateSetOnInit: "@",    // If the component shown is an aggregate, this indicates if it"s the first
                aggregateIconSize: "@",     // Aggregate icon size (used only if component shown is aggregate)
                aggregateShowButton: "@",   // If true, the aggregate will show the "View details" button
                aggregateValueObj: "=",     // If set, the aggregate should save its value in this object

                addToBasket: "@",           // If true, will show basket button in the components that support it
                selectionId: "@",           // ID for saving the selection for the specified dashboardId (used for grid)
                selectionType: "@",         // Selection type for grid (single or multiple)
                ignoreOwnSelection: "@",    // Ignore own selection (for some grids)
                enableAdvSearch: "@",       // Enable/disable advanced search in Search Tabs component (default: true)
                groupedData: "@",           // Used for grid, set to true if the data from the API will be grouped
                numberOfItems: "@",         // Number of items for the grid, if needed
                baseUrl: "@",               // Base URL to send to API
                aggregateType: "@",         // Type of aggregation that the displayed chart should make (count/amount)
                normaliseType: "@",         // Type of normalisation that the displayed chart should make (gdp/per capita)
                timeseries: "@",            // Set to true to use timeseries API calls on components that support it

                embeddable: "@",            // Set to true to enable the embed functionality
                disableExplanation: "@",    // Set to true to disable the explanation button
                subtitle: "@",              // Set a subtitle for the chart (only for Sunburst for now)
                exporting: "@",             // Set to true to enable exporting of charts
                barVertical: "@",           // Set to true to enable vertical bar chart
                comboboxTitle: "@",         // Title of combobox selector (only applies to combobox-filter type)

                quickFiltering: "@",        // Enable or disable quick filtering in selection grid
                enableGridViewBtn: "@",     // Enable or disable the view button in grid-paging
                enableSelection: "@",       // Enable or disable day selection in traffic-observation component
                minHeight: "@",             // Minimum height of this component's container
                enableRating: "@"           // Enable rating buttons (not supported for all components)
            },
            templateUrl: Data.templatePath + "templates/dashboard/dashboard-updater.html",
            link: function (scope) {
                var dashboardId = scope.dashboardId;
                var baseUrl = scope.baseUrl;
                var minHeight = parseInt(scope.minHeight);
                var originalType = scope.type;
                var filterSubscriptions = [];
                scope.showInfo = false;

                // Variables needed in case Search Tabs are shown
                var initialized = false;
                var requestType = "";
                var searchParams = {};

                // Keep previous parameter values, to check if the component needs to be re-rendered
                var prevParams = null;
                var prevAggregateType = "amount";
                var prevNormaliseType = "no";

                // If projectId is undefined, set default value (none)
                if (_.isUndefined(scope.projectId) || scope.projectId.trim() === "")
                    scope.projectId = "none";

                // If type is undefined, set default value
                if (_.isUndefined(scope.type) || scope.type.trim() === "")
                    scope.type = "info";

                // If viewType is undefined, set default value
                if (_.isUndefined(scope.viewType) || scope.viewType.trim() === "")
                    scope.viewType = "default";

                // If lang is undefined, set default value
                if (_.isUndefined(scope.lang) || scope.lang.trim() === "")
                    scope.lang = "en";

                // If addToBasket is undefined, set default value
                if (_.isUndefined(scope.addToBasket) || scope.addToBasket.trim() === "")
                    scope.addToBasket = "false";

                // If aggregateShowButton is undefined, set default value
                if (_.isUndefined(scope.aggregateShowButton) || (scope.aggregateShowButton !== "true" && scope.aggregateShowButton !== "false"))
                    scope.aggregateShowButton = "true";

                // If enableAdvSearch is undefined, set default value
                if (_.isUndefined(scope.enableAdvSearch) || (scope.enableAdvSearch !== "true" && scope.enableAdvSearch !== "false"))
                    scope.enableAdvSearch = "true";

                // If dynamicDashboard is undefined, set default value
                if (_.isUndefined(scope.dynamicDashboard) || (scope.dynamicDashboard !== "true" && scope.dynamicDashboard !== "false"))
                    scope.dynamicDashboard = "false";

                // If enableGridViewBtn is undefined, set default value
                if (_.isUndefined(scope.enableGridViewBtn) || (scope.enableGridViewBtn !== "true" && scope.enableGridViewBtn !== "false"))
                    scope.enableGridViewBtn = "false";

                // If enableSelection is undefined, set default value
                if (_.isUndefined(scope.enableSelection) || (scope.enableSelection !== "true" && scope.enableSelection !== "false"))
                    scope.enableSelection = "true";

                // If embeddable is undefined, set default value
                if (_.isUndefined(scope.embeddable) || (scope.embeddable !== "true" && scope.embeddable !== "false"))
                    scope.embeddable = "true";

                // If dashboardId is undefined, set default value
                if (_.isUndefined(dashboardId) || dashboardId.trim() === "") {
                    dashboardId = "default";
                }

                // If minHeight is undefined, set default value
                if (_.isUndefined(minHeight) || _.isNaN(minHeight)) {
                    minHeight = 0;
                }

                // Set minimum height of container so when component is being refreshed, the container's
                // height does not become 0 which causes the page to scroll up
                scope.containerStyle = {
                    "min-height": minHeight + "px"
                };

                // Create list of Dashboard IDs that contain grid selection
                var gridDashboards = [
                    "comparison",
                    "comparison1",
                    "comparison2",
                    "comparison_details_1",
                    "comparison_details_2",
                    "country_page",
                    "public_project"
                ];

                // Create list of Dashboard IDs that contain object selection
                var objDashboards = [
                    "comparison",
                    "comparison1",
                    "comparison2",
                    "comparison_details_1",
                    "comparison_details_2",
                    "country_producing_heatmap",
                    "dianeosis_students",
                    "public_project",
                    "traffic_observation",
                    "traffic_observation_line1",
                    "traffic_observation_line2"
                ];

                /**
                 * Cause a refresh of the component by setting the type to an empty string and then back to the original
                 */
                var rerenderComponent = function () {
                    scope.type = "";                // Make type empty to hide component

                    $timeout(function () {
                        scope.type = originalType;  // At end of digest show component again
                    });
                };

                var updateExtraParams = function () {
                    // Keep old parameters for comparison and get new parameters from DashboardService
                    var newParams;
                    if (scope.dynamicDashboard === "true") {
                        // Get options for the enabled filters
                        newParams = DashboardService.getApiOptionsDynamic(dashboardId);
                    } else {
                        newParams = DashboardService.getApiOptions(dashboardId);
                    }

                    // If something changed in the parameters, update component
                    var differentAggregateType = !_.isUndefined(scope.aggregateType) && !_.isEqual(prevAggregateType, scope.aggregateType);
                    var differentNormaliseType = !_.isUndefined(scope.normaliseType) && !_.isEqual(prevNormaliseType, scope.normaliseType);
                    var differentParams = !_.isEqual(prevParams, newParams);

                    if (differentParams || differentAggregateType || differentNormaliseType) {
                        prevParams = _.clone(newParams);    // Keep current parameters to check equality later

                        // Add base URL to the extra params
                        if (!_.isUndefined(baseUrl) && baseUrl.length > 0) {
                            newParams = _.extend({
                                baseurl: baseUrl
                            }, newParams);
                        }

                        // If the aggregateType attribute is defined (and valid), add it to the extra parameters
                        var aggregateType = scope.aggregateType;
                        if (!_.isUndefined(aggregateType) &&
                            (aggregateType === "amount" || aggregateType === "count" || aggregateType === "budget")) {
                            newParams = _.extend({
                                aggregate: aggregateType
                            }, newParams);

                            prevAggregateType = scope.aggregateType;
                        }

                        // If the normaliseType attribute is defined (and valid), add it to the extra parameters
                        var normaliseType = scope.normaliseType;
                        if (!_.isUndefined(normaliseType) &&
                            (normaliseType === "no" || normaliseType === "gdp" || normaliseType === "percapita")) {
                            newParams = _.extend({
                                normalise: normaliseType
                            }, newParams);

                            prevNormaliseType = scope.normaliseType;
                        }

                        // If the barVertical parameter has been set, add it to the parameters
                        if (!_.isUndefined(scope.barVertical)) {
                            newParams = _.extend({
                                chart: (scope.barVertical === "true") ? "bar" : "column"
                            }, newParams);
                        }

                        // Add new parameters to scope
                        scope.extraParams = newParams;

                        switch (scope.type) {
                            case "selection-grid":
                            case "selection-paging-grid":
                            case "aggregate":
                                // Aggregates and selection grids watch their extra params for changes, so do nothing
                                break;
                            case "search":
                                if (!initialized) {
                                    // Get parameters for search component and keep requestType for later
                                    searchParams = DashboardService.getSearchParams(dashboardId);
                                    requestType = searchParams.requestType;

                                    // Add parameters for the search-tabs component to scope (requestType not needed)
                                    _.extend(scope, _.omit(searchParams, "requestType"));

                                    initialized = true;
                                }

                                // Make request to get rules for QueryBuilder
                                if (scope.enableAdvSearch === "true") {
                                    Data.getQueryBuilderRules(requestType, scope.extraParams).then(function (response) {
                                        var paramPrefix = searchParams.urlParamPrefix;
                                        var newRules = JSURL.stringify(response.data);

                                        // Set rules URL parameter with the new rules so QueryBuilder can update itself
                                        $location.search(paramPrefix + "rules", newRules);
                                    });
                                }

                                break;
                            case "grid":
                            case "grid-paging":
                                if (!initialized) {
                                    // Get concept from DashboardService so "view" button will work correctly
                                    scope.concept = DashboardService.getSearchParams(dashboardId).concept;

                                    initialized = true;
                                }
                                rerenderComponent();
                                break;
                            default:
                                // Re-render component
                                rerenderComponent();
                        }
                    }
                };

                if (scope.dynamicDashboard !== "true") {
                    // Subscribe to be notified of changes in selected countries and year range
                    DashboardService.subscribeSelectionChanges(scope, updateExtraParams);
                    DashboardService.subscribeYearChanges(scope, updateExtraParams);

                    // Check if we should also subscribe to the grid selection changes
                    if (scope.type === "selection-grid" || _.contains(gridDashboards, dashboardId)) {
                        DashboardService.subscribeGridSelectionChanges(scope, updateExtraParams);
                    }

                    // Check if we should subscribe to object changes
                    if (_.contains(objDashboards, dashboardId)) {
                        DashboardService.subscribeObjectChanges(scope, updateExtraParams);
                    }
                } else {
                    // Subscribe to changes in filters (when filters change, will subscribe only to the required filter
                    // types to watch for changes)
                    DashboardService.subscribeObjectChanges(scope, function () {
                        DashboardService.updateFilterSubscriptions(dashboardId, filterSubscriptions, scope, updateExtraParams);

                        // Check if we should update the extra parameters in case a filter type was removed
                        var newParams = DashboardService.getApiOptionsDynamic(dashboardId);

                        if (!_.isEqual(newParams, prevParams)) {
                            updateExtraParams();
                        }
                    });

                    DashboardService.updateFilterSubscriptions(dashboardId, filterSubscriptions, scope, updateExtraParams);
                }

                // If the aggregateType attribute is defined, watch it for changes and update the chart
                if (!_.isUndefined(scope.aggregateType) && _.contains(["amount", "count", "budget"], scope.aggregateType)) {
                    scope.$watch("aggregateType", updateExtraParams);
                }

                // If the normaliseType attribute is defined, watch it for changes and update the chart
                if (!_.isUndefined(scope.normaliseType) && _.contains(["no", "gdp", "percapita"], scope.normaliseType)) {
                    scope.$watch("normaliseType", updateExtraParams);
                }

                // Get initial info
                updateExtraParams();
            }
        };
    }
]);
