angular.module("yds").directive("ydsAlternativeNames", ["Data", "Translations",
    function (Data, Translations) {
        return {
            restrict: "E",
            scope: {
                projectId: "@", // Project ID to show alternative names for
                viewType: "@",  // View type of data
                lang: "@",      // Language of data
                elementH: "@"   // Height of the component
            },
            templateUrl: Data.templatePath + "templates/general-purpose/alternative-names.html",
            link: function (scope, element) {
                var altNamesPanel = _.first(angular.element(element[0].querySelector(".alternative-names-panel-body")));
                scope.ydsAlert = "";

                var elementH = parseInt(scope.elementH);

                // Check that projectId has been set, or show error
                if (_.isUndefined(scope.projectId) || scope.projectId.trim().length === 0) {
                    scope.ydsAlert = "The Project ID is a required parameter, please check the documentation!";
                    return false;
                }

                // Set default view type
                if (_.isUndefined(scope.viewType) || scope.viewType.trim().length === 0)
                    scope.viewType = "default";

                // Set default language
                if (_.isUndefined(scope.lang) || scope.lang.trim().length === 0)
                    scope.lang = "en";

                // Set default component height
                if (_.isUndefined(elementH) || _.isNaN(elementH))
                    elementH = 300;

                // Get translations
                scope.translations = {
                    title: Translations.get(scope.lang, "alternativeNamesTitle"),
                    noNames: Translations.get(scope.lang, "noAlternativeNamesMsg")
                };

                // Set component height
                altNamesPanel.style["max-height"] = elementH + "px";

                // Get alternative names
                Data.getProjectVis("info", scope.projectId, scope.viewType, scope.lang)
                    .then(function (response) {
                        scope.names = response.data.names;
                    }, function (error) {
                        scope.ydsAlert = error.data.message;
                    });
            }
        };
    }
]);
