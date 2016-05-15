//---------------------------------------------------------------------
// <copyright file="TreeViewDataServices.ts">
//    This code is licensed under the MIT License.
//    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF 
//    ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED 
//    TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A 
//    PARTICULAR PURPOSE AND NONINFRINGEMENT.
// </copyright>
// <summary>
//    This is part of the Test Case Explorer extensions
//    from the ALM Rangers. This file contains the data services
//    for the tree view.
// </summary>
//---------------------------------------------------------------------
define(["require", "exports", "TFS/WorkItemTracking/Contracts", "TFS/TestManagement/RestClient", "TFS/WorkItemTracking/RestClient", "VSS/Controls/TreeView", "scripts/Common"], function (require, exports, Contracts, TestClient, WITClient, TreeView, Common) {
    function getNodes(param) {
        switch (param) {
            case "Area path":
                return getStructure(Contracts.TreeStructureGroup.Areas);
            case "Iteration path":
                return getStructure(Contracts.TreeStructureGroup.Iterations);
            case "Priority":
                return getPrioriy();
            case "State":
                return getStates();
            case "Test plan":
                return getTestPlansWithSuite();
        }
    }
    exports.getNodes = getNodes;
    function getIconFromSuiteType(suiteType) {
        var icon = "";
        switch (suiteType) {
            case "StaticTestSuite":
                icon = "icon-tfs-tcm-static-suite";
                break;
            case "RequirementTestSuite":
                icon = "icon-tfs-tcm-requirement-based-suite";
                break;
            case "DynamicTestSuite":
                icon = "icon-tfs-tcm-query-based-suite";
                break;
        }
        return icon;
    }
    exports.getIconFromSuiteType = getIconFromSuiteType;
    function mapTestCaseToSuite(project, tcId, suiteId, planId) {
        var client = TestClient.getClient();
        return client.addTestCasesToSuite(project, planId, suiteId, tcId);
    }
    exports.mapTestCaseToSuite = mapTestCaseToSuite;
    function AssignTestCasesToField(project, tcId, field, value) {
        var client = WITClient.getClient();
        var msg = { "op": "add", "path": "/fields/" + field, "value": value };
        return client.updateWorkItem([msg], tcId);
    }
    exports.AssignTestCasesToField = AssignTestCasesToField;
    function getTestPlansWithSuite() {
        // Get an instance of the client
        var deferred = $.Deferred();
        var tstClient = TestClient.getClient();
        tstClient.getPlans(VSS.getWebContext().project.name).then(function (data) {
            var tRoot = convertToTreeNodes([{ name: "Test plans", children: [] }], "");
            var i = 0;
            var noPlans = data.length;
            data.forEach(function (t) {
                getTestPlanAndSuites(t.id, t.name).then(function (n) {
                    tRoot[0].addRange(n);
                    i++;
                    if (i >= noPlans) {
                        tRoot[0].expanded = true;
                        deferred.resolve(tRoot);
                    }
                });
            });
        });
        return deferred.promise();
    }
    exports.getTestPlansWithSuite = getTestPlansWithSuite;
    function getTestPlans() {
        // Get an instance of the client
        var deferred = $.Deferred();
        var tstClient = TestClient.getClient();
        tstClient.getPlans(VSS.getWebContext().project.name).then(function (data) {
            var tRoot = convertToTreeNodes([{ name: "Test plans", children: [] }], "");
            data.forEach(function (t) {
                tRoot[0].addRange(convertToTreeNodes([{ name: t.name, id: t.id, children: [], testPlanId: t.rootSuite.id }], ""));
            });
            tRoot[0].expanded = true;
            deferred.resolve(tRoot);
        });
        return deferred.promise();
    }
    exports.getTestPlans = getTestPlans;
    function getTestSuitesForTestCase(testCaseId) {
        // Get an instance of the client
        var deferred = $.Deferred();
        var tstClient = TestClient.getClient();
        tstClient.getSuitesByTestCaseId(testCaseId).then(function (data) {
            deferred.resolve(data);
        }, function (err) {
            deferred.resolve(null);
        });
        return deferred.promise();
    }
    exports.getTestSuitesForTestCase = getTestSuitesForTestCase;
    function getTestResultsForTestCase(testCaseId) {
        // Get an instance of the client
        var deferred = $.Deferred();
        var tstClient = TestClient.getClient();
        var q = { query: "Select * from TestResult  WHERE TestCaseId=" + testCaseId };
        tstClient.getTestResultsByQuery(q, VSS.getWebContext().project.name, true).then(function (data) {
            deferred.resolve(data);
        }, function (err) {
            deferred.reject(err);
        });
        return deferred.promise();
    }
    exports.getTestResultsForTestCase = getTestResultsForTestCase;
    function getLinkedRequirementsForTestCase(testCaseId) {
        // Get an instance of the client
        var deferred = $.Deferred();
        var client = WITClient.getClient();
        var q = {
            query: "SELECT [System.Id], [System.Title], [System.AssignedTo], [System.State], [System.Tags] FROM WorkItemLinks WHERE [Target].[System.Id] = " + testCaseId + " ORDER BY [System.Id] mode(MustContain)"
        };
        client.queryByWiql(q, VSS.getWebContext().project.name).then(function (data) {
            if (data.workItemRelations.length > 0) {
                client.getWorkItems(data.workItemRelations.filter(function (i) { return (i.source != null); }).map(function (i) { return i.source.id; }), ["System.Id", "System.Title", "System.State"]).then(function (wiData) {
                    deferred.resolve(wiData);
                }, function (err) {
                    deferred.reject(err);
                });
            }
            else {
                deferred.resolve(null);
            }
        }, function (err) {
            deferred.reject(err);
        });
        return deferred.promise();
    }
    exports.getLinkedRequirementsForTestCase = getLinkedRequirementsForTestCase;
    function getTestPlanAndSuites(planId, testPlanName) {
        // Get an instance of the client
        var deferred = $.Deferred();
        var tstClient = TestClient.getClient();
        tstClient.getTestSuitesForPlan(VSS.getWebContext().project.name, planId).then(function (data) {
            var tRoot = BuildTestSuiteTree(data.filter(function (i) { return i.parent == null; }), null, data);
            deferred.resolve([tRoot]);
        }, function (err) {
            deferred.reject(err);
        });
        return deferred.promise();
    }
    exports.getTestPlanAndSuites = getTestPlanAndSuites;
    function BuildTestSuiteTree(tsList, parentNode, allTS) {
        var returnNode = null;
        tsList.forEach(function (t) {
            var node = new TreeView.TreeNode(t.name);
            node.id = t.id;
            node.type = t.suiteType;
            node.expanded = true;
            if (t.testCaseCount > 0) {
                node.text += " (" + t.testCaseCount + ")";
            }
            node.droppable = true;
            if (t.parent != null) {
                node.icon = getIconFromSuiteType(t.suiteType);
            }
            else {
                node.icon = "icon-testplan";
            }
            node.config = { name: t.name, suiteId: t.id, testPlanId: parseInt(t.plan.id) };
            BuildTestSuiteTree(allTS.filter(function (i) { return i.parent != null && i.parent.id == t.id; }), node, allTS);
            if (parentNode != null) {
                parentNode.children.push(node);
            }
            else {
                returnNode = node;
            }
        });
        return returnNode;
    }
    function getStructure(structure) {
        var deferred = $.Deferred();
        var client = WITClient.getClient();
        client.getRootNodes(VSS.getWebContext().project.name, 11).then(function (data) {
            deferred.resolve(convertToTreeNodes([data[structure]], ""));
        }, function (err) {
            deferred.reject(err);
        });
        return deferred.promise();
    }
    function getStates() {
        var deferred = $.Deferred();
        var client = WITClient.getClient();
        var project = VSS.getWebContext().project.name;
        client.getWorkItemTypeCategory(project, "Microsoft.TestCaseCategory").then(function (witCat) {
            client.getWorkItemType(project, witCat.defaultWorkItemType.name).then(function (data) {
                var d = data;
                var t = { name: "States", children: [] };
                for (var s in d.transitions) {
                    if (s != "") {
                        t.children.push({ name: s, config: s });
                    }
                }
                var t2 = [];
                t2.push(t);
                deferred.resolve(convertToTreeNodes(t2, ""));
            });
        });
        return deferred.promise();
    }
    function getPrioriy() {
        var deferred = $.Deferred();
        var client = WITClient.getClient();
        client.getWorkItemType(VSS.getWebContext().project.name, Common.WIQLConstants.getWiqlConstants().TestCaseTypeName).then(function (data) {
            var d = [{ name: "Priority", children: [{ name: "1", config: "1" }, { name: "2", config: "2" }, { name: "3", config: "3" }, { name: "4", config: "4" }] }];
            deferred.resolve(convertToTreeNodes(d, ""));
        });
        return deferred.promise();
    }
    // Converts the source to TreeNodes
    function convertToTreeNodes(items, path) {
        var a = [];
        items.sort(function (a, b) {
            if (a.name < b.name)
                return -1;
            if (a.name > b.name)
                return 1;
            return 0;
        }).forEach(function (item) {
            var itemPath = "";
            if (path == "") {
                itemPath = item.name;
            }
            else {
                itemPath = path + "\\" + item.name;
            }
            var node = new TreeView.TreeNode(item.name);
            node.icon = item.icon;
            node.id = item.id;
            node.config = { name: item.name, path: itemPath, testPlanId: item.testPlanId };
            node.expanded = item.expanded;
            if (item.children && item.children.length > 0) {
                node.addRange(convertToTreeNodes(item.children, itemPath));
            }
            a.push(node);
        });
        return a;
    }
    function cloneTestPlan(sourcePlanId, targetPlanId, targetSuiteId) {
        var deferred = $.Deferred();
        var testCaseClient = TestClient.getClient();
        var teamProjectName = VSS.getWebContext().project.name;
        testCaseClient.getPlanById(teamProjectName, targetPlanId).then(function (testPlan) {
            var cloneRequest = {
                cloneOptions: {
                    cloneRequirements: false,
                    copyAllSuites: true,
                    copyAncestorHierarchy: false,
                    overrideParameters: {},
                    destinationWorkItemType: "Test Case",
                    relatedLinkComment: "Comment"
                },
                suiteIds: [targetSuiteId],
                destinationTestPlan: testPlan
            };
            testCaseClient.cloneTestPlan(cloneRequest, teamProjectName, sourcePlanId).then(function (result) {
                console.log("Clone test plan completed: " + result.completionDate);
            });
        });
        return deferred.promise();
    }
    exports.cloneTestPlan = cloneTestPlan;
    function cloneTestSuite(sourcePlanId, sourceSuiteId, targetPlanId, targetSuiteId) {
        var deferred = $.Deferred();
        var testCaseClient = TestClient.getClient();
        var teamProjectName = VSS.getWebContext().project.name;
        var cloneRequest = {
            cloneOptions: {
                cloneRequirements: false,
                copyAllSuites: true,
                copyAncestorHierarchy: false,
                overrideParameters: {},
                destinationWorkItemType: "Test Case",
                relatedLinkComment: "Comment"
            },
            destinationSuiteId: targetSuiteId,
            destinationSuiteProjectName: teamProjectName
        };
        // TODO: check if this API is incorrectly documented, suite and plan is in opposite order
        // TODO: clone with hierarchy does not work
        testCaseClient.cloneTestSuite(cloneRequest, teamProjectName, sourcePlanId, sourceSuiteId).then(function (result) {
            console.log("Clone test suite completed: " + result.completionDate);
        });
        return deferred.promise();
    }
    exports.cloneTestSuite = cloneTestSuite;
});
//# sourceMappingURL=TreeViewDataService.js.map