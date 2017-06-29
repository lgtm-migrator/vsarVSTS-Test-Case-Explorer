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
define(["require", "exports", "q", "TFS/WorkItemTracking/Contracts", "TFS/TestManagement/RestClient", "TFS/WorkItemTracking/RestClient", "VSS/Controls/TreeView", "VSS/Service", "TFS/Core/RestClient", "scripts/Common"], function (require, exports, Q, Contracts, TestClient, WITClient, TreeView, VSS_Service, CoreClient, Common) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var const_Pivot_TestPlan = "Test plan";
    var const_Pivot_Priority = "Priority";
    function getNodes(param, tp) {
        switch (param) {
            case "Area path":
                return getStructure(Contracts.TreeStructureGroup.Areas, VSS.getWebContext().project.name);
            case "Iteration path":
                return getStructure(Contracts.TreeStructureGroup.Iterations, VSS.getWebContext().project.name);
            case const_Pivot_Priority:
                return getPrioriy();
            case "State":
                return getStates();
            case const_Pivot_TestPlan:
                if (tp === null) {
                    //Fetch All TestPlans
                    return getTestPlansWithSuite();
                }
                else {
                    //Fetch the TestPlan
                    return getTestPlanAndSuites(tp.id, tp.text);
                }
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
        var deferred = $.Deferred();
        //var tstClient = TestClient.getClient(TestClient.TestHttpClient2_2);
        var tstClient = VSS_Service.getClient(TestClient.TestHttpClient2_2, undefined, undefined, undefined, null);
        var q = { query: "Select * from TestResult WHERE TestCaseId=" + testCaseId + " AND State<>'Pending'" };
        tstClient.getTestResultsByQuery(q, VSS.getWebContext().project.name).then(function (data) {
            deferred.resolve(data);
        }, function (err) {
            deferred.reject(err);
        });
        return deferred.promise();
    }
    exports.getTestResultsForTestCase = getTestResultsForTestCase;
    function getLinkedRequirementsForTestCase(testCaseId) {
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
            node["draggable"] = true;
            node.config = { name: t.name, suiteId: t.id, testPlanId: parseInt(t.plan.id) };
            if (t.parent != null) {
                node.icon = getIconFromSuiteType(t.suiteType);
                node.config.type = "TestSuite";
            }
            else {
                node.icon = "icon-testplan";
                node.config.type = "TestPlan";
            }
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
    function getStructure(structure, teamProject) {
        var deferred = $.Deferred();
        var client = WITClient.getClient();
        client.getRootNodes(teamProject, 11).then(function (data) {
            var nodes = convertToTreeNodes([data[structure]], "");
            nodes[0].expanded = true;
            deferred.resolve(nodes);
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
                var t = { name: "States", children: [], expanded: true };
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
            var d = [{ name: const_Pivot_Priority, expanded: true, config: "root", children: [{ name: "1", config: "1", type: "Prio" }, { name: "2", config: "2" }, { name: "3", config: "3" }, { name: "4", config: "4" }] }];
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
            node.droppable = true;
            node.expanded = item.expanded;
            if (item.children && item.children.length > 0) {
                node.addRange(convertToTreeNodes(item.children, itemPath));
            }
            a.push(node);
        });
        return a;
    }
    function cloneTestPlan(sourcePlanId, sourceSuiteIds, projectName, testPlanName, cloneRequirements, areaPath, iterationPath) {
        var deferred = $.Deferred();
        var testPlan = {
            name: testPlanName,
            project: { "Name": projectName }
        };
        if (areaPath == "")
            areaPath = projectName;
        if (iterationPath == "")
            iterationPath = projectName;
        var cloneRequest = {
            destinationTestPlan: testPlan,
            options: {
                cloneRequirements: cloneRequirements,
                copyAllSuites: true,
                copyAncestorHierarchy: true,
                overrideParameters: {
                    "System.AreaPath": areaPath,
                    "System.IterationPath": iterationPath
                },
                destinationWorkItemType: "Test Case",
                relatedLinkComment: "Comment"
            },
            suiteIds: sourceSuiteIds
        };
        //cloneRequest.options.overrideParameters = {
        //    "System.AreaPath": areaPath,
        //    "System.IterationPath": iterationPath 
        //};
        //if (areaPath != "") $.extend(cloneRequest.options.overrideParameters, { "System.AreaPath": areaPath });
        //if (iterationPath != "") $.extend(cloneRequest.options.overrideParameters, { "System.IterationPath": iterationPath });
        var testCaseClient = TestClient.getClient();
        testCaseClient.cloneTestPlan(cloneRequest, VSS.getWebContext().project.name, sourcePlanId).then(function (data) {
            console.log("Clone test plan completed: " + data.completionDate);
            deferred.resolve(data);
        }, function (err) {
            deferred.reject(err);
        });
        return deferred.promise();
    }
    exports.cloneTestPlan = cloneTestPlan;
    function querryCloneOperationStatus(operationId) {
        var testCaseClient = TestClient.getClient();
        var teamProjectName = VSS.getWebContext().project.name;
        return testCaseClient.getCloneInformation(teamProjectName, operationId);
    }
    exports.querryCloneOperationStatus = querryCloneOperationStatus;
    function cloneTestSuite(sourcePlanId, sourceSuiteId, targetPlanId, targetSuiteId, cloneChildSuites, cloneRequirements) {
        var deferred = $.Deferred();
        var testCaseClient = TestClient.getClient();
        var teamProjectName = VSS.getWebContext().project.name;
        var cloneRequest = {
            cloneOptions: {
                cloneRequirements: cloneRequirements,
                copyAllSuites: cloneChildSuites,
                copyAncestorHierarchy: false,
                overrideParameters: {},
                destinationWorkItemType: "Test Case",
                relatedLinkComment: "Cloned from test case explorer"
            },
            destinationSuiteId: targetSuiteId,
            destinationSuiteProjectName: teamProjectName
        };
        // TODO: clone with hierarchy does not work?
        testCaseClient.cloneTestSuite(cloneRequest, teamProjectName, sourcePlanId, sourceSuiteId).then(function (data) {
            console.log("Clone test suite started: " + data.creationDate);
            deferred.resolve(data);
        }, function (err) {
            deferred.reject(err);
        });
        return deferred.promise();
    }
    exports.cloneTestSuite = cloneTestSuite;
    function createTestSuite(suiteModel, targetPlanId, targetSuiteId) {
        var deferred = $.Deferred();
        var tstClient = TestClient.getClient();
        tstClient.createTestSuite(suiteModel, VSS.getWebContext().project.name, targetPlanId, targetSuiteId).then(function (result) {
            console.log("createTestSuite: " + suiteModel.name + ", parent: " + targetSuiteId + ", node: " + result[0].id);
            deferred.resolve(result[0]);
        }, function (err) {
            deferred.reject(err);
        });
        return deferred.promise();
    }
    function getTestCases(planId, suiteId) {
        var deferred = $.Deferred();
        var tstClient = TestClient.getClient();
        tstClient.getTestCases(VSS.getWebContext().project.name, planId, suiteId).then(function (result) {
            var idList = result.map(function (item) {
                return item.testCase.id;
            });
            deferred.resolve(idList.join());
        });
        return deferred.promise();
    }
    function createStaticSuite(suiteName, testCaseIds, targetPlanId, targetSuiteId) {
        var deferred = $.Deferred();
        var suiteModel = {
            "suiteType": "StaticTestSuite",
            "name": suiteName,
            "queryString": "",
            "requirementIds": []
        };
        createTestSuite(suiteModel, targetPlanId, targetSuiteId).then(function (testSuite) {
            if (testCaseIds != "") {
                addTestCasesToSuite(targetPlanId, testSuite.id, testCaseIds).then(function (result) {
                    deferred.resolve(testSuite);
                });
            }
            else {
                deferred.resolve(testSuite);
            }
        });
        return deferred.promise();
    }
    function createRequirementSuite(requirementId, targetPlanId, targetSuiteId) {
        var suiteModel = {
            "suiteType": "RequirementTestSuite",
            "name": "",
            "requirementIds": [
                requirementId
            ],
            "queryString": ""
        };
        return createTestSuite(suiteModel, targetPlanId, targetSuiteId);
    }
    function createQuerySuite(suiteName, suiteQuery, targetPlanId, targetSuiteId) {
        var suiteModel = {
            "suiteType": "DynamicTestSuite",
            "name": suiteName,
            "queryString": suiteQuery,
            "requirementIds": []
        };
        return createTestSuite(suiteModel, targetPlanId, targetSuiteId);
    }
    function getTestSuite(planId, suiteId) {
        var deferred = $.Deferred();
        var tstClient = TestClient.getClient();
        tstClient.getTestSuiteById(VSS.getWebContext().project.name, planId, suiteId).then(function (data) {
            deferred.resolve(data);
        }, function (err) {
            deferred.reject(err);
        });
        return deferred.promise();
    }
    function addTestSuite(sourceNode, targetPlanId, targetSuiteId) {
        var deferred = $.Deferred();
        switch (sourceNode.type) {
            case "StaticTestSuite":
                getTestCases(sourceNode.config.testPlanId, sourceNode.config.suiteId).then(function (testCaseIds) {
                    createStaticSuite(sourceNode.config.name, testCaseIds, targetPlanId, targetSuiteId).then(function (testSuite) {
                        var lst = [];
                        sourceNode.children.forEach(function (n) {
                            lst.push(addTestSuite(n, targetPlanId, testSuite.id));
                        });
                        Q.all(lst).then(function (data) {
                            deferred.resolve(testSuite);
                        });
                        //promises.push(sourceNode.config.name);
                        //deferred.resolve(testSuite);
                    });
                });
                break;
            case "RequirementTestSuite":
                getTestSuite(sourceNode.config.testPlanId, sourceNode.config.suiteId).then(function (testSuite) {
                    createRequirementSuite(testSuite.requirementId, targetPlanId, targetSuiteId).then(function (data) {
                        deferred.resolve(testSuite);
                    });
                });
                break;
            case "DynamicTestSuite":
                getTestSuite(sourceNode.config.testPlanId, sourceNode.config.suiteId).then(function (testSuite) {
                    createQuerySuite(sourceNode.config.name, testSuite.queryString, targetPlanId, targetSuiteId).then(function (data) {
                        deferred.resolve(testSuite);
                    });
                });
                break;
        }
        //Q.allResolved(promises);
        return deferred.promise();
    }
    exports.addTestSuite = addTestSuite;
    function removeTestSuite(planId, suiteId) {
        var deferred = $.Deferred();
        var tstClient = TestClient.getClient();
        tstClient.deleteTestSuite(VSS.getWebContext().project.name, planId, suiteId).then(function (data) {
            deferred.resolve(data);
        }, function (err) {
            deferred.reject(err);
        });
        return deferred.promise();
    }
    exports.removeTestSuite = removeTestSuite;
    function removeTestPlan(planId) {
        var deferred = $.Deferred();
        var tstClient = TestClient.getClient();
        tstClient.deleteTestPlan(VSS.getWebContext().project.name, planId).then(function (data) {
            deferred.resolve(data);
        }, function (err) {
            deferred.reject(err);
        });
        return deferred.promise();
    }
    exports.removeTestPlan = removeTestPlan;
    function addTestCasesToSuite(planId, suiteId, testCaseIds) {
        var deferred = $.Deferred();
        var tstClient = TestClient.getClient();
        tstClient.addTestCasesToSuite(VSS.getWebContext().project.name, planId, suiteId, testCaseIds).then(function (data) {
            deferred.resolve(data);
        }, function (err) {
            deferred.reject(err);
        });
        return deferred.promise();
    }
    exports.addTestCasesToSuite = addTestCasesToSuite;
    function removeTestCaseFromSuite(planId, suiteId, testCaseIds) {
        var deferred = $.Deferred();
        var tstClient = TestClient.getClient();
        tstClient.removeTestCasesFromSuiteUrl(VSS.getWebContext().project.name, planId, suiteId, testCaseIds).then(function (data) {
            deferred.resolve(data);
        }, function (err) {
            deferred.reject(err);
        });
        return deferred.promise();
    }
    exports.removeTestCaseFromSuite = removeTestCaseFromSuite;
    function getProjects() {
        var deferred = $.Deferred();
        var coreClient = CoreClient.getClient();
        coreClient.getProjects().then(function (data) {
            deferred.resolve(data.map(function (p) { return p.name; }).sort(function (a, b) { return a.localeCompare(b); }));
        }, function (err) {
            deferred.reject(err);
        });
        return deferred.promise();
    }
    exports.getProjects = getProjects;
});
//# sourceMappingURL=TreeViewDataService.js.map