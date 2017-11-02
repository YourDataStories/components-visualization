angular.module("yds").directive("ydsGridResults", ["Data", "Filters", "Search", "Basket", "YDS_CONSTANTS", "DashboardService", "$compile", "$location", "$q", "$uibModal",
    function (Data, Filters, Search, Basket, YDS_CONSTANTS, DashboardService, $compile, $location, $q, $uibModal) {
        return {
            restrict: "E",
            scope: {
                projectId: "@",         // Project ID of data
                viewType: "@",          // Name of the view to use for the grid
                projectDetailsType: "@",// Type to use when viewing details. If undefined, will use the viewType
                lang: "@",              // Lang of the visualised data
                extraParams: "=",       // Extra attributes to pass to the API (optional)

                useGridApi: "@",        // If true, grid will use the grid API for the request
                numberOfItems: "@",     // If grid processing is used, give the number of total items to the grid

                urlParamPrefix: "@",    // Prefix to add before all url parameters (optional)
                viewInDashboard: "@",   // If true, the view button for each row will set the clicked value in DashboardService

                sorting: "@",           // Enable or disable array sorting, values: true, false
                quickFiltering: "@",    // Enable or disable array quick filtering, values: true, false
                colResize: "@",         // Enable or disable column resize, values: true, false
                pageSize: "@",          // Set the number of rows of each page
                elementH: "@",          // Set the height of the component
                showResultsNum: "@",    // If true, will show the results number below the grid
                enableViewButton: "@",  // Enable the view button in each row (Default: true)

                addToBasket: "@",       // Enable or disable "add to basket" functionality, values: true, false
                basketBtnX: "@",        // X-axis position of the basket button
                basketBtnY: "@",        // Y-axis position of the basket button

                exporting: "@",         // Enable or disable export to CSV
                exportBtnX: "@",        // X-axis position of the exporting button
                exportBtnY: "@",        // Y-axis position of the exporting button

                embeddable: "@",        // Enable or disable the embedding of the component
                embedBtnX: "@",         // X-axis position of the embed button
                embedBtnY: "@",         // Y-axis position of the embed button
                popoverPos: "@",        // The side of the embed button from which the embed  window will appear

                enableRating: "@",      // Enable rating buttons for this component
                disableExplanation: "@" // Set to true to disable the explanation button
            },
            templateUrl: Data.templatePath + "templates/visualisation/grid-results.html",
            link: function (scope, element) {
                // Reference the DOM elements of the grid
                var gridWrapper = angular.element(element[0].querySelector(".component-wrapper"));
                var gridContainer = angular.element(element[0].querySelector(".grid-container"));

                var prevTab = "";     // Keeps the previous tab to check if the tab has changed

                // Set the variables which will be used for the creation of the grid
                scope.quickFilterValue = "";
                var grid = {
                    elementId: "grid" + Data.createRandomId(),
                    projectId: scope.projectId,
                    viewType: scope.viewType,
                    lang: scope.lang,
                    sorting: scope.sorting,
                    quickFiltering: scope.quickFiltering,
                    colResize: scope.colResize,
                    pageSize: parseInt(scope.pageSize),
                    exporting: scope.exporting,
                    exportBtnX: parseInt(scope.exportBtnX),
                    exportBtnY: parseInt(scope.exportBtnY),
                    elementH: scope.elementH
                };

                scope.loadedRows = 0;
                var query = "";
                var hasColDefs = false;     // Indicates if the column definitions have been loaded for the grid
                var dataView = null;        // The view of the grid will be kept here, to use for exporting
                var dataSampleObj = null;   // A sample object from the grid's results, for use in exporting

                var paramPrefix = scope.urlParamPrefix;
                var projectDetailsType = scope.projectDetailsType;
                var extraParams = scope.extraParams;
                var useGridApi = scope.useGridApi;
                var viewInDashboard = scope.viewInDashboard;
                var enableViewButton = scope.enableViewButton;

                // If viewType is undefined we can't show the grid
                if (_.isUndefined(grid.viewType) || grid.viewType.trim() === "") {
                    scope.ydsAlert = "The YDS component is not properly initialized " +
                        "because the viewType attribute isn't configured properly. " +
                        "Please check the corresponding documentation section";
                    return false;
                }

                // Check if the projectDetailsType attr is defined, else assign default value
                if (_.isUndefined(projectDetailsType) || projectDetailsType.trim() === "")
                    projectDetailsType = grid.viewType;

                // Check if the language attr is defined, else assign default value
                if (_.isUndefined(grid.projectId) || grid.projectId.trim() === "")
                    grid.projectId = "none";

                // Check if the language attr is defined, else assign default value
                if (_.isUndefined(grid.lang) || grid.lang.trim() === "")
                    grid.lang = "en";

                // If no url parameter prefix is defined or it is only whitespace, use not parameter prefix
                if (_.isUndefined(paramPrefix) || (paramPrefix.trim() === "" && paramPrefix.length > 0))
                    paramPrefix = "";

                // Check if the sorting attr is defined, else assign the default value
                if (_.isUndefined(grid.sorting) || (grid.sorting !== "true" && grid.sorting !== "false"))
                    grid.sorting = "true";

                // Check if the useGridApi attr is defined, else assign the default value
                if (_.isUndefined(useGridApi) || (useGridApi !== "true" && useGridApi !== "false"))
                    useGridApi = "false";

                // Check if the enableViewButton attr is defined, else assign the default value
                if (_.isUndefined(enableViewButton) || (enableViewButton !== "true" && enableViewButton !== "false"))
                    enableViewButton = "true";

                // Check if the viewInDashboard attr is defined, else assign the default value
                if (_.isUndefined(viewInDashboard) || (viewInDashboard !== "true" && viewInDashboard !== "false"))
                    viewInDashboard = "false";

                // Check if the showResultsNum attr is defined, else assign the default value
                if (_.isUndefined(scope.showResultsNum) || (scope.showResultsNum !== "true" && scope.showResultsNum !== "false"))
                    scope.showResultsNum = "false";

                // Check if the quick filtering attr is defined, else assign the default value
                if (_.isUndefined(grid.quickFiltering) || (grid.quickFiltering !== "true" && grid.quickFiltering !== "false"))
                    grid.quickFiltering = "false";

                // Check if the colResize attr is defined, else assign default value
                if (_.isUndefined(grid.colResize) || (grid.colResize !== "true" && grid.colResize !== "false"))
                    grid.colResize = "false";

                // Check if the page size attr is defined, else assign default value
                if (_.isUndefined(grid.pageSize) || _.isNaN(grid.pageSize))
                    grid.pageSize = 100;

                // Check if the exporting attr is defined, else assign default value
                if (_.isUndefined(grid.exporting) || (grid.exporting !== "true" && grid.exporting !== "false"))
                    grid.exporting = "false";

                // Check if the exportBtnX attr is defined, else assign default value
                if (_.isUndefined(grid.exportBtnX) || _.isNaN(grid.exportBtnX))
                    grid.exportBtnX = 0;

                // Check if the exportBtnY attr is defined, else assign default value
                if (_.isUndefined(grid.exportBtnY) || _.isNaN(grid.exportBtnY))
                    grid.exportBtnY = 0;

                // Check if the component's height attr is defined, else assign default value
                if (_.isUndefined(grid.elementH) || _.isNaN(grid.elementH))
                    grid.elementH = 200;

                // Set the id and the height of the grid
                gridContainer[0].id = grid.elementId;

                if (grid.quickFiltering === "true") {
                    gridWrapper[0].style.height = (grid.elementH) + "px";
                    gridContainer[0].style.height = (grid.elementH - 35) + "px";
                    gridContainer[0].style.minHeight = (grid.elementH - 35) + "px";
                } else {
                    gridWrapper[0].style.height = grid.elementH + "px";
                    gridContainer[0].style.height = grid.elementH + "px";
                    gridContainer[0].style.minHeight = grid.elementH + "px";
                }

                // If exporting is enabled, set position of export button
                if (grid.exporting === "true") {
                    scope.exportBtnPos = {
                        left: grid.exportBtnX + "px",
                        top: grid.exportBtnY + "px"
                    }
                }

                /**
                 * When a filter is updated, update the filter object of the component by using the Filters service
                 */
                var filterModifiedListener = function () {
                    var gridFilters = {};

                    //if quick filtering is enabled and has length>0, get its value and create an extra filter
                    if (grid.quickFiltering === "true")
                        gridFilters["_ydsQuickFilter_"] = scope.quickFilterValue;

                    Filters.addGridFilter(grid.elementId, gridFilters);
                };

                /**
                 * Remove filters when the component is destroyed
                 */
                scope.$on("$destroy", function () {
                    //if the grid filtering is enabled remove the filter event listener
                    if (grid.quickFiltering === "true") {
                        if (!_.isUndefined(scope.gridOptions) && _.has(scope.gridOptions, "api")) {
                            scope.gridOptions.api.removeEventListener("afterFilterChanged", filterModifiedListener);
                        }

                        Filters.remove(grid.elementId);
                    }
                });

                /**
                 * Apply the quick filter
                 */
                scope.applyComboFilters = function () {
                    var trimmedQFValue = scope.quickFilterValue.trim();
                    if (trimmedQFValue.length > 0) {
                        // Reset loaded rows, because grid will reload the data
                        scope.loadedRows = 0;

                        // Visualize the grid
                        visualizeGrid(trimmedQFValue);
                    } else {
                        scope.clearComboFilters();
                    }
                };

                /**
                 * Clear the quick filter
                 */
                scope.clearComboFilters = function () {
                    scope.loadedRows = 0;
                    scope.quickFilterValue = "";

                    visualizeGrid();
                };

                /**
                 * Hide the alert
                 */
                scope.hideAlert = function () {
                    scope.ydsAlert = "";
                };

                /**
                 * Find the first available view for a data type
                 * @param possibleViewNames
                 * @param availableViews
                 * @returns {*}
                 */
                var findView = function (possibleViewNames, availableViews) {
                    var responseView = undefined;

                    // Check if any of the possible views for the data exist
                    _.each(possibleViewNames, function (viewToFind) {
                        _.each(availableViews, function (view) {
                            if (!_.isUndefined(view[viewToFind]) && _.isUndefined(responseView)) {
                                responseView = view[viewToFind];
                            }
                        });
                    });

                    return responseView;
                };

                /**
                 * Get the current keyword from the search service
                 * @returns {*}
                 */
                var getSearchQuery = function () {
                    var deferred = $q.defer();

                    var newKeyword = $location.search()[paramPrefix + "q"];

                    if (_.isUndefined(newKeyword) || newKeyword.trim() === "") {
                        newKeyword = "*";
                    }

                    if (_.isUndefined(extraParams) || _.isEmpty(extraParams)) {
                        deferred.resolve(newKeyword);
                    } else {
                        if (query.length === 0) {
                            Data.getType2SolrQuery(grid.viewType, extraParams).then(function (response) {
                                // Remember query so we don't need to call this API every time the page changes
                                query = response.data.q;

                                // Resolve promise
                                deferred.resolve(query);
                            });
                        } else {
                            // Resolve promise with saved query from before
                            deferred.resolve(query);
                        }
                    }

                    return deferred.promise;
                };

                /**
                 * Set the project that should be selected in DashboardService.
                 * (Used only if view-in-dashboard attribute is true)
                 * @param itemId
                 */
                scope.viewBtn = function (itemId) {
                    // Set selected project ID & type in DashboardService
                    DashboardService.setSelectedProject(itemId, projectDetailsType);
                };

                /**
                 * Show modal to export grid data to CSV
                 */
                scope.exportGrid = function () {
                    if (scope.exportBtnClass !== "disabled") {
                        // Get required modal input
                        var modalInput = {
                            view: dataView,
                            lang: scope.lang,
                            title: "Export to CSV"
                        };

                        // Get any extra attributes that should be shown to export, based on an object from the results
                        if (!_.isNull(dataSampleObj)) {
                            // Get the extra object keys
                            var objKeys = _.chain(dataSampleObj)
                                .keys()
                                .map(function (attr) {
                                    return {
                                        attribute: attr,
                                        header: attr
                                    };
                                })
                                .value();

                            // Merge the view's attributes with the ones from the object, discarding any duplicates
                            modalInput.view = _.chain(modalInput.view)
                                .union(objKeys)
                                .uniq(false, function (obj) {
                                    return obj.attribute;
                                })
                                .value();
                        }

                        // Open the modal
                        var exportModal = $uibModal.open({
                            controller: "GridResultsExportModalCtrl",
                            templateUrl: Data.templatePath + "templates/visualisation/grid-results-export-modal.html",
                            size: "md",
                            resolve: {
                                modalInput: function () {
                                    return modalInput;
                                }
                            }
                        });

                        // When modal closes, export the grid
                        exportModal.result.then(function (selectedCols) {
                            getSearchQuery().then(function (searchQuery) {
                                var query = searchQuery;
                                var quickFilter = scope.quickFilterValue;

                                if (!_.isUndefined(quickFilter) && quickFilter.length > 0) {
                                    query = "" + query + " AND " + quickFilter;
                                }

                                // Get facets from URL parameters
                                var facets = $location.search()[paramPrefix + "fq"];

                                // If there are advanced search rules, get them and perform advanced search
                                var rules = $location.search()[paramPrefix + "rules"];

                                if (!_.isUndefined(rules)) {
                                    rules = JSURL.parse(rules);
                                }

                                // Download the data as a CSV file from the server
                                var viewType = grid.viewType;
                                if (!_.isUndefined(extraParams) && !_.isEmpty(extraParams)) {
                                    viewType = undefined;
                                }

                                Data.downloadGridResultDataAsCsv(query, facets, rules, viewType, grid.lang, selectedCols);
                            });
                        });
                    }
                };

                /**
                 * Adds 2 columns to the column definitions of a grid in which
                 * the "view" and "add to basket" buttons will be
                 * @param columnDefs    Column definitions array as returned by Data.prepareGridColumns()
                 * @returns {Array.<*>} New column definitions
                 */
                var addLinkRendererToColumnDefs = function (columnDefs) {
                    if (viewInDashboard === "true") {
                        _.first(columnDefs).cellRenderer = function (params) {
                            var value = params.value || "";
                            if (!_.isUndefined(params.data) && !_.isEmpty(params.data) && (_.isNull(params.value) || params.value.length === 0)) {
                                value = "(missing)";
                            }

                            var btnStr = "<a ng-click='viewBtn(\"" + (params.data.id_original || params.data.id) + "\")' target='_blank'>" + value + "</a>";

                            var compiled = $compile(btnStr)(scope);

                            return _.first(compiled);
                        };
                    } else {
                        _.first(columnDefs).cellRenderer = function (params) {
                            // Create view URL and get row text
                            var value = params.value || "";
                            if (!_.isUndefined(params.data) && !_.isEmpty(params.data) && (_.isNull(params.value) || params.value.length === 0)) {
                                value = "(missing)";
                            }
                            var viewBtnUrl = YDS_CONSTANTS.PROJECT_DETAILS_URL + "?id=" + (params.data.id_original || params.data.id) + "&type=" + projectDetailsType;

                            return "<a href='" + viewBtnUrl + "' target='_blank'>" + value + "</a>";
                        }
                    }

                    return columnDefs;
                };

                /**
                 * Function to render the grid
                 */
                var visualizeGrid = function (quickFilter) {
                    // Create grid data source
                    var dataSource = {
                        rowCount: null, // behave as infinite scroll
                        maxPagesInCache: 10,
                        overflowSize: grid.pageSize,
                        pageSize: grid.pageSize,
                        getRows: function (params) {
                            // Function to be called when grid results are retrieved successfully
                            var gridResultDataSuccess = function (response) {
                                // Extract needed variables from server response
                                var responseData = null;
                                var responseView = null;

                                // If response.data is an array, assume that results are formatted for grids directly
                                var useGridProcessing = _.isArray(response.data);

                                // If grid processing is not enabled, Solr results are expected.
                                if (!useGridProcessing) {
                                    // Sanity check: confirm that the response's query is the same as the last one
                                    if (useGridApi === "false" && query !== response.data.responseHeader.params.q) {
                                        return;
                                    }

                                    // Get grid data
                                    responseData = response.data.response.docs;

                                    // Get number of results
                                    scope.resultsNum = response.data.response.numFound;

                                    // Create array with possible view names (view type of tab should always be preferred)
                                    var resultTypes = _.isEmpty(responseData) ? [] : _.first(responseData).type;
                                    var possibleViewNames = _.union([grid.viewType], resultTypes);

                                    // Find correct view for these results and their number
                                    responseView = findView(possibleViewNames, response.view);
                                } else {
                                    // Get grid data
                                    responseData = response.data;

                                    // Get number of results
                                    scope.resultsNum = parseInt(scope.numberOfItems);

                                    // In grid processing, if the numberOfItems is not defined, but the response has
                                    // less items than the page size, we can assume that we got all the items.
                                    if (_.isNaN(scope.resultsNum) && responseData.length < grid.pageSize) {
                                        scope.resultsNum = responseData.length;
                                    }

                                    // Get view object
                                    responseView = response.view;
                                }

                                // Disable the export button if there are more than 5000 results
                                if (scope.resultsNum > 5000) {
                                    scope.exportBtnClass = "disabled";
                                } else {
                                    scope.exportBtnClass = "";
                                }

                                // Set number of loaded rows
                                if (params.endRow > scope.loadedRows) {
                                    scope.loadedRows = params.endRow;

                                    if (scope.loadedRows > scope.resultsNum) {
                                        scope.loadedRows = scope.resultsNum;
                                    }
                                }

                                // If there are no results, show empty grid
                                if (_.isEmpty(responseData)) {
                                    scope.gridOptions.api.showNoRowsOverlay();
                                    params.successCallback(responseData, 0);
                                    return;
                                } else {
                                    // Hide any "no rows" overlay that may be shown
                                    scope.gridOptions.api.hideOverlay();
                                }

                                if (!hasColDefs) {
                                    // Format the column definitions returned from the API
                                    var columnDefs = Data.prepareGridColumns(responseView);

                                    if (enableViewButton === "true") {
                                        // Make the 1st column have links to more details
                                        columnDefs = addLinkRendererToColumnDefs(columnDefs);
                                    }

                                    scope.gridOptions.api.setColumnDefs(columnDefs);
                                }

                                // Format the data returned from the API and add them to the grid
                                var rowsThisPage = Data.prepareGridData(responseData, responseView);

                                // Check if any rows have no value for some attribute
                                _.each(rowsThisPage, function (row) {
                                    // For each column of the table
                                    _.each(responseView, function (column) {
                                        var attr = column.attribute;

                                        // If it's undefined, try to find it with similar attribute name
                                        if (_.isUndefined(row[attr])) {
                                            var newValue = Data.findValueInResult(row, attr, Search.geti18nLangs(), grid.lang);

                                            if (_.isUndefined(newValue)) {
                                                newValue = "";
                                            } else if (_.isArray(newValue)) {
                                                newValue = newValue.join(", ");
                                            }

                                            // If the new value is an object, prevent nested object creation
                                            // (the grid will display "[object Object]" if we create it)
                                            if (!_.isObject(newValue)) {
                                                Data.createNestedObject(row, attr.split("."), newValue);
                                            }
                                        }
                                    });
                                });

                                var lastRow = -1;
                                if (scope.resultsNum <= params.endRow) {
                                    // We reached the end, so set the last row to the number of total results
                                    lastRow = scope.resultsNum;
                                }

                                // Save any variables needed for exporting
                                if (_.isNull(dataView)) {
                                    // Save the grid view
                                    dataView = responseView;
                                }

                                if (_.isNull(dataSampleObj) && !useGridProcessing) {
                                    // Save a sample object
                                    dataSampleObj = _.first(responseData);
                                }

                                // Notify the grid with the new rows
                                params.successCallback(rowsThisPage, lastRow);

                                // Call sizeColumnsToFit, if this grid is in the selected tab of Tabbed Search (so
                                // tab url parameter will be the same as this grid's view type) or if query length
                                // is > 0 (so this grid is using extraParams, which means it's shown in the Dashboard)
                                if (!hasColDefs && (scope.viewType === $location.search()[paramPrefix + "tab"] || query.length > 0)) {
                                    scope.gridOptions.api.sizeColumnsToFit();
                                }

                                hasColDefs = true;
                            };

                            // Function to be called when grid results retrieval fails
                            var gridResultDataError = function (error) {
                                scope.ydsAlert = error.message;
                            };

                            if (useGridApi === "false") {
                                // If extra parameters have a "q" parameter, then use that as a query. This happens when
                                // a grid is saved to the basket as a visualization and is then embedded
                                if (_.has(extraParams, "q")) {
                                    query = extraParams.q;
                                }

                                // Get the search query, and merge it with the quick filter if it's defined
                                getSearchQuery().then(function (searchQuery) {
                                    query = searchQuery;
                                    if (!_.isUndefined(quickFilter)) {
                                        query += " AND " + quickFilter;
                                    }

                                    // Try to find any selected facets
                                    var facets;
                                    if (_.has(extraParams, "fq")) {
                                        // If facets exist in extra params, get them from there
                                        facets = extraParams.fq;
                                    } else {
                                        // Get facets from URL parameters
                                        facets = $location.search()[paramPrefix + "fq"];
                                    }

                                    // Try to find advanced search rules (if no rules are found, perform normal search)
                                    var rules = undefined;
                                    if (!_.isUndefined(extraParams) && _.has(extraParams, "rules")) {
                                        // Extra params have rules in them, this happens when grid-results is embedded
                                        rules = extraParams.rules;
                                    } else {
                                        // Extra params do not have rules, try to find rules in the URL parameters
                                        rules = $location.search()[paramPrefix + "rules"];

                                        if (!_.isUndefined(rules)) {
                                            // Parse the rules with JSURL
                                            rules = JSURL.parse(rules);
                                        }
                                    }

                                    // Save parameters used to create the grid to the filters service
                                    Filters.addGridResultsFilter(grid.elementId, {
                                        q: query,
                                        fq: facets,
                                        rules: rules
                                    });

                                    if (_.isUndefined(rules)) {
                                        // Perform normal search
                                        Data.getGridResultData(query, facets, grid.viewType, params.startRow, grid.pageSize, grid.lang, params.sortModel)
                                            .then(gridResultDataSuccess, gridResultDataError);
                                    } else {
                                        // Rules were found, do an advanced search
                                        Data.getGridResultDataAdvanced(query, facets, rules, grid.viewType, params.startRow, grid.pageSize, grid.lang, params.sortModel)
                                            .then(gridResultDataSuccess, gridResultDataError);
                                    }
                                });
                            } else {
                                var paramsToSend = _.clone(extraParams);
                                if (_.isUndefined(paramsToSend)) {
                                    paramsToSend = {};
                                }

                                // Add page size, starting row and sorting parameters
                                // (paging twice because in some cases rows/start is used, in others limit/offset)
                                paramsToSend = _.extend(paramsToSend, {
                                        rows: grid.pageSize,
                                        limit: grid.pageSize,
                                        start: params.startRow,
                                        offset: params.startRow
                                    },
                                    Data.formatAgGridSortParams(params.sortModel));

                                Filters.addGridResultsFilter(grid.elementId, {
                                    projectId: grid.projectId,
                                    type: grid.viewType,
                                    lang: grid.lang,
                                    pagingGrid: true,
                                    numberOfItems: scope.numberOfItems,
                                    extraParams: extraParams
                                });

                                Data.getProjectVis("grid", grid.projectId, grid.viewType, grid.lang, paramsToSend)
                                    .then(gridResultDataSuccess, gridResultDataError);
                            }
                        }
                    };

                    // If the grid is being rendered for the first time, create it with the data source
                    if (_.isUndefined(scope.gridOptions)) {
                        // Define the options of the grid component
                        scope.gridOptions = {
                            columnDefs: [],
                            enableColResize: (grid.colResize === "true"),
                            enableServerSideSorting: (grid.sorting === "true"),
                            virtualPaging: true,
                            datasource: dataSource
                        };

                        new agGrid.Grid(gridContainer[0], scope.gridOptions);
                    } else {
                        // Add new data source to the grid
                        scope.gridOptions.api.setDatasource(dataSource);
                    }
                };

                if (_.isUndefined(extraParams) && useGridApi === "false") {
                    // If any URL parameters change act accordingly
                    scope.$watch(function () {
                        return JSON.stringify($location.search());
                    }, function () {
                        var urlParams = $location.search();

                        // Only look for changes if this grid is in the active tab
                        if (urlParams[paramPrefix + "tab"] === scope.viewType) {
                            // Update prevTab variable to the new tab
                            prevTab = urlParams[paramPrefix + "tab"];

                            // Visualize the grid
                            visualizeGrid();
                        }
                    });
                } else {
                    // Visualize grid using extra params
                    visualizeGrid();
                }
            }
        };
    }
]);