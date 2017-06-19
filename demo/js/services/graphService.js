angular.module("yds").factory("Graph", ["$http", "$q", "YDS_CONSTANTS", "Data",
    function ($http, $q, YDS_CONSTANTS, Data) {
        var numOfFinancialDecisions = 20;

        // Create data
        var fakeData = {
            "main": [
                {
                    group: "nodes",
                    data: {
                        id: "main",
                        label: "Βελτίωση οδού σύνδεσης Κομοτηνής - Καρυδιάς Ν. Ροδόπη",
                        icon: ""
                    }
                }, {
                    group: "nodes",
                    data: {
                        id: "budget",
                        label: "Budget: €978K",
                        icon: ""
                    }
                }, {
                    group: "nodes",
                    data: {
                        id: "subprojects",
                        label: "Subprojects",
                        icon: "",
                        numberOfItems: 4
                    }
                }, {
                    group: "nodes",
                    data: {
                        id: "financial_decisions",
                        label: "Financial Decisions",
                        icon: "",
                        numberOfItems: numOfFinancialDecisions
                    }
                }
            ],
            "subprojects": [
                {
                    data: {
                        id: "subproject1",
                        label: "ΒΕΛΤΙΩΣΗ ΟΔΟΥ ΣΥΝΔΕΣΗΣ ΚΟΜΟΤΗΝΗΣ – ΚΑΡΥΔΙΑΣ",
                        icon: "",
                        numberOfItems: 4
                    }
                }, {
                    data: {
                        id: "subproject2",
                        label: "ΒΕΛΤΙΩΣΗ ΟΔΟΥ ΣΥΝΔΕΣΗΣ ΚΟΜΟΤΗΝΗΣ – ΚΑΡΥΔΙΑΣ 2",
                        icon: "",
                        numberOfItems: 4
                    }
                }, {
                    data: {
                        id: "subproject3",
                        label: "ΒΕΛΤΙΩΣΗ ΟΔΟΥ ΣΥΝΔΕΣΗΣ ΚΟΜΟΤΗΝΗΣ – ΚΑΡΥΔΙΑΣ 3",
                        icon: "",
                        numberOfItems: 4
                    }
                }, {
                    data: {
                        id: "subproject4",
                        label: "ΒΕΛΤΙΩΣΗ ΟΔΟΥ ΣΥΝΔΕΣΗΣ ΚΟΜΟΤΗΝΗΣ – ΚΑΡΥΔΙΑΣ 4",
                        icon: "",
                        numberOfItems: 4
                    }
                }
            ],
            "financial_decisions": []   // this is generated below
        };

        // Generate data for each subproject
        var i;
        for (i = 1; i < 5; i++) {
            var subprojectId = "subproject" + i;

            fakeData[subprojectId] = [
                {
                    data: {
                        id: subprojectId + "_seller",
                        label: "Seller: ΓΡΑΜΜΑΤΙΚΟΠΟΥΛΟΣ ΑΝΩΝΥΜΗ ΤΕΧΝΙΚΗ ΕΤΑΙΡΙΑ",
                        icon: ""
                    }
                }, {
                    data: {
                        id: subprojectId + "_startDate",
                        label: "Start: 22/12/2010",
                        icon: ""
                    }
                }, {
                    data: {
                        id: subprojectId + "_endDate",
                        label: "End: 30/07/2014",
                        icon: ""
                    }
                }, {
                    data: {
                        id: subprojectId + "_Budget",
                        label: "Budget: €977,914.00",
                        icon: ""
                    }
                }
            ];
        }

        // Generate the nodes for the financial decisions
        for (i = 0; i < numOfFinancialDecisions; i++) {
            fakeData["financial_decisions"].push({
                data: {
                    id: "financial_decision" + i,
                    label: "Financial Decision #" + (i + 1),
                    icon: "",
                    numberOfItems: 5
                }
            })
        }

        // Generate data for each of the 100 financial_decisions
        for (i = 0; i < numOfFinancialDecisions; i++) {
            var decisionId = "financial_decision" + i;

            fakeData[decisionId] = [
                {
                    data: {
                        id: decisionId + "_seller",
                        label: "Seller: ΠΑΠΑΤΖΙΚΟΥ ΕΛΕΝΗ ΓΕΩΡΓΙΟΣ",
                        icon: ""
                    }
                }, {
                    data: {
                        id: decisionId + "_buyer",
                        label: "Buyer: ΔΗΜΟΣ ΝΑΞΟΥ ΚΑΙ ΜΙΚΡΩΝ ΚΥΚΛΑΔΩΝ",
                        icon: ""
                    }
                }, {
                    data: {
                        id: decisionId + "_date",
                        label: "Date: 19/05/2014",
                        icon: ""
                    }
                }, {
                    data: {
                        id: decisionId + "_amount",
                        label: "Amount: €9,901.50",
                        icon: ""
                    }
                }, {
                    data: {
                        id: decisionId + "_type",
                        label: "Type: ΕΓΚΡΙΣΗ ΔΑΠΑΝΗΣ",
                        icon: ""
                    }
                }
            ];
        }

        /**
         * Get the nodes & edges for a specific node ID.
         * @param id    Parent node ID
         * @returns {*} Nodes & edges for adding to the graph
         */
        var getData = function (id) {
            var nodes = fakeData[id];

            // Create edges from the given node to each new one
            var edges = [];
            _.each(nodes, function (item) {
                if (id !== item.data.id) {  // Prevent creating edge from the main node to itself
                    edges.push({
                        data: {
                            id: "edge_" + item.data.id,
                            source: id,
                            target: item.data.id
                        }
                    });
                }
            });

            return _.union(nodes, edges);
        };

        return {
            getData: getData
        };
    }
]);
