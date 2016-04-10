angular.module('yds').directive('ydsResults', ['YDS_CONSTANTS', '$window', '$templateCache', '$location','$compile', '$ocLazyLoad', 'Search',
    'Basket', 'Translations', function(YDS_CONSTANTS, $window, $templateCache, $location, $compile, $ocLazyLoad, Search, Basket, Translations){
    return {
        restrict: 'E',
        scope: {
            lang:'@',
            userId:'@'
        },
        templateUrl:'templates/results.html',
        link: function(scope, element, attrs) {
            var resultsContainer = angular.element(element[0].querySelector('.results-content'));
            var compiledTemplates = {};

            scope.basketEnabled = false;
            scope.showNoResultsMsg = false;
            scope.results = [];
            scope.translations = {};

            //check if the language attr is defined, else assign default value
            if(angular.isUndefined(scope.lang) || scope.lang.trim()=="")
                scope.lang = "en";


            if (!_.isUndefined(scope.userId) && scope.userId.trim()!="") {
                scope.basketEnabled = true;
            }

            //configure pagination options
            scope.pagination = {
                hidden: true,
                total: 0,
                maxSize: 5,
                perPage: 10,
                current: 1,
                firstText: Translations.get(scope.lang, "paginationFirstText"),
                lastText: Translations.get(scope.lang, "paginationLastText"),
                nextText: Translations.get(scope.lang, "paginationNextText"),
                previousText: Translations.get(scope.lang, "paginationPreviousText"),

                show: function() {
                    if (scope.pagination.hidden)
                        scope.pagination.hidden = false;

                    scope.showNoResultsMsg = false;
                },
                hide: function() {
                    if (!scope.pagination.hidden)
                        scope.pagination.hidden = true;

                    scope.showNoResultsMsg = true;
                },
                getCurrent: function() { return (scope.pagination.current - 1)*10; },
                setCurrent: function(pageNum) { scope.pagination.current = pageNum; },
                setTotal: function(resultsCount) { scope.pagination.total = resultsCount; }
            };

            //function to prepare the templates used in search results 
            var prepareTemplates = function(){
                //precompile the js templates for faster rendering
                _.templateSettings.variable = "rc";
                scope.translations = Translations.getAll(scope.lang);

                $ocLazyLoad.load ({
                    files: ['templates/search/aid-activity.html', 'templates/search/commited-item.html',
                            'templates/search/contract.html','templates/search/decision.html',
                            'templates/search/financial-decision.html','templates/search/non-financial-decision.html',
                            'templates/search/organization.html', 'templates/search/public-project.html',
                            'templates/search/subproject.html', 'templates/search/subsidy.html',
                            'templates/search/transaction.html', 'templates/search/trade-activity.html'],
                    cache: true
                }).then(function() {
                    compiledTemplates = {
                        AidActivity : _.template($templateCache.get("aid-activity.html")),
                        CommittedItem : _.template($templateCache.get("commited-item.html")),
                        Contract : _.template($templateCache.get("contract.html")),
                        Decision : _.template($templateCache.get("decision.html")),
                        FinancialDecision : _.template($templateCache.get("financial-decision.html")),
                        NonFinancialDecision : _.template($templateCache.get("non-financial-decision.html")),
                        Organization : _.template($templateCache.get("organization.html")),
                        PublicProject : _.template($templateCache.get("public-project.html")),
                        Subproject : _.template($templateCache.get("subproject.html")),
                        Subsidy : _.template($templateCache.get("subsidy.html")),
                        Transaction : _.template($templateCache.get("transaction.html")),
                        TradeActivity : _.template($templateCache.get("trade-activity.html"))
                    };
                });
            };

            var performSearch = function(searchTerm, pageLimit, pageNumber) {
                //save the keyword and perform search
                Search.setKeyword(searchTerm);
                scope.pagination.setCurrent(pageNumber);
                
                Search.performSearch(searchTerm, 10, scope.pagination.getCurrent())
                .then(function (response) {
                    var resultsCount = response.data.response.numFound;
                    scope.results = angular.copy(response.data.response.docs);

                    //clear the existing results
                    resultsContainer[0].innerHTML = "";
                    scope.pagination.setTotal(resultsCount);
                    
                    //check if the length of the results is greater than 0, and handle pagination
                    if (resultsCount>0) {
                        scope.pagination.show();
                    } else {
                        scope.pagination.hide();
                        return false;
                    }

                    //iterate through the results and get the template based on the type of the result
                    _.each(scope.results, function(result, index) {
                        result._hidden = true;

                        var templateData = {
                            attrHeaders: scope.translations,
                            lang: scope.lang,
                            result: scope.results[index],
                            index: index
                        };

                        //fill the data of the template and append it to the result list
                        var resultTemplate = "";
                        for(var j=0; j<result.type.length; j++) {
                            resultTemplate = compiledTemplates[result.type[j]];
                            if(!_.isUndefined(resultTemplate))
                                break;
                        }

                        if (!_.isUndefined(resultTemplate)) {
                            var content = $compile(resultTemplate(templateData))(scope);
                            resultsContainer.append(content);
                        }
                    });
                }, function (error) {
                    scope.pagination.hide();
                    console.log('error', error);
                });
            };

            //function to handle the clicks of the pagination element
            scope.changePage = function () {
                var newPage = scope.pagination.current;
                var keyword = Search.getKeyword();

                performSearch(keyword, 10, newPage);
                $window.scrollTo(0, 0);
            };


            //function to add a specific result in the user's basket
            scope.addToBasket = function(resourceId) {
                //initialize the basket's modal reference;
                var userId ="ydsUser";
                var basketConfig = {
                    lang: scope.lang,
                    type: "Dataset",
                    component_type: "result",
                    content_type: "default",
                    component_parent_uuid: resourceId,
                    user_id: userId,
                    filters: []
                };

                var modalRestrictions = {
                    Dataset: true,
                    Visualisation: false
                };

                Basket.checkIfItemExists(basketConfig)
                .then(function (response) {
                    debugger;
                    if(!_.isUndefined(response.status) && response.status=="NOT_EXISTS") {
                        Basket.openModal(basketConfig, modalRestrictions)
                    } else {
                        alert('item already exists')
                    }
                   debugger;
                }, function(error) {
                    debugger;
                    console.log ("error in get browse data", error);
                });
            };

            
            //watch location hash change in order to perform search query
            scope.$watch(function () { return $location.search() }, function (urlParams) {
                //get the original search term from the url
                var keyword = urlParams.q;

                if (!_.isUndefined(keyword)) {
                    //if search term is empty, stop the execution
                    if (keyword.trim() == "")
                        return false;

                    performSearch(keyword, 10, 1);
                }
            });

            scope.$on("$destroy", function() {
                Search.clearKeyword();
            });

            prepareTemplates();
        },
        controller: function($scope) {
            $scope.resultsPreview = function (project, vizType) {
                // firing an event downwards from the parent scope
                $scope.$parent.$broadcast('previsualiseResult', {
                    projectId : project.attributes['project-id'],
                    projectTitle : project.attributes.title,
                    vizType : vizType
                });
            };
            
            $scope.showMore = function (projectIndex) {
                var selectedItem = $scope.results[projectIndex];
                selectedItem._hidden = !selectedItem._hidden;
            };

            $scope.visitResult = function(projectId) {
                var resourceTypes = _.findWhere($scope.results, {id: projectId}).type.join();

                if (resourceTypes!=null || !_.isUndefined(resourceTypes)) {
                    $window.location.href = YDS_CONSTANTS.PROJECT_DETAILS_URL + '?id=' + projectId + '&type=' + resourceTypes;
                }
            };
        }
    };
}]);