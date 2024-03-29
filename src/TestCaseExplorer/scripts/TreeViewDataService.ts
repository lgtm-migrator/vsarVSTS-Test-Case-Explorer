﻿//---------------------------------------------------------------------
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

/// <reference path='../typings/tsd.d.ts' />

import Q = require("q");

import Contracts = require("TFS/WorkItemTracking/Contracts");
import TestClient = require("TFS/TestManagement/RestClient");
import TestContracts = require("TFS/TestManagement/Contracts");
import WITClient = require("TFS/WorkItemTracking/RestClient");
import TreeView = require("VSS/Controls/TreeView");
import VSS_Service = require("VSS/Service");
import CoreClient = require("TFS/Core/RestClient");
import CoreContracts = require("TFS/Core/Contracts");

import Common = require("scripts/Common");


var const_Pivot_TestPlan = "Test plan";
var const_Pivot_Priority = "Priority";

export function getNodes(param, testPlan, teamProject: string) {

    switch (param) {
        case "Area path":
            return getStructure(Contracts.TreeStructureGroup.Areas, teamProject);
        case "Iteration path":
            return getStructure(Contracts.TreeStructureGroup.Iterations, teamProject);
        case const_Pivot_Priority:
            return getPrioriy();
        case "State":
            return getStates();
        case const_Pivot_TestPlan:
            if (testPlan === null) {
                //Fetch All TestPlans
                return getTestPlansWithSuite();
            }
            else {
                //Fetch the TestPlan
                return getTestPlanAndSuites(testPlan.id, testPlan.text)
            }
    }
}

export function getIconFromSuiteType(suiteType): string {
    var icon: string = "";
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

export function mapTestCaseToSuite(project, tcId, suiteId, planId): IPromise<any> {
    var client = TestClient.getClient();
    return client.addTestCasesToSuite(project, planId, suiteId, tcId)
}
export function AssignTestCasesToField(project, tcId: number, field, value): IPromise<any> {

    var client = WITClient.getClient();
    var msg = { "op": "add", "path": "/fields/" + field, "value": value }
    return client.updateWorkItem([msg], tcId);
}

export function updateAreaIteration(project, workItemId: number, area: string, iteration: string): IPromise<any> {

    var client = WITClient.getClient();
    var msg = [{ "op": "add", "path": "/fields/System.AreaPath", "value": area },
    { "op": "add", "path": "/fields/System.IterationPath", "value": iteration }];
    return client.updateWorkItem(msg, workItemId);
}

export function getTestPlansWithSuite(): IPromise<TreeView.TreeNode[]> {
    var deferred = $.Deferred<TreeView.TreeNode[]>();
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

export function getTestPlans(): IPromise<TreeView.TreeNode[]> {
    var deferred = $.Deferred<TreeView.TreeNode[]>();

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

export function getTestSuitesForTestCase(testCaseId: number): IPromise<any[]> {
    var deferred = $.Deferred<any[]>();

    var tstClient = TestClient.getClient();
    tstClient.getSuitesByTestCaseId(testCaseId).then(
        data => {
            deferred.resolve(data);
        },
        err => {
            deferred.resolve(null);
        });
    return deferred.promise();
}

export function getTestResultsForTestCase(testCaseId: number): IPromise<any[]> {
    var deferred = $.Deferred<any[]>();
    //var tstClient = TestClient.getClient(TestClient.TestHttpClient2_2);
    let tstClient = VSS_Service.getClient<TestClient.TestHttpClient2_2>(TestClient.TestHttpClient2_2, undefined, undefined, undefined, null);
    var q = { query: "Select * from TestResult WHERE TestCaseId=" + testCaseId + " AND State<>'Pending'" };

    tstClient.getTestResultsByQuery(q, VSS.getWebContext().project.name).then(
        data => {
            deferred.resolve(data);
        },
        err => {
            deferred.reject(err);
        }
    );
    return deferred.promise();
}

export function getLinkedRequirementsForTestCase(testCaseId: number): IPromise<any[]> {
    var deferred = $.Deferred<any[]>();
    var client = WITClient.getClient();
    var q = {
        query: "SELECT [System.Id], [System.Title], [System.AssignedTo], [System.State], [System.Tags] FROM WorkItemLinks WHERE [Target].[System.Id] = " + testCaseId + " ORDER BY [System.Id] mode(MustContain)"
    };

    client.queryByWiql(q, VSS.getWebContext().project.name).then(
        data => {
            if (data.workItemRelations.length > 0) {
                client.getWorkItems(data.workItemRelations.filter(i => { return (i.source != null); }).map(i => { return i.source.id; }), ["System.Id", "System.Title", "System.State"]).then(
                    wiData => {
                        deferred.resolve(wiData);
                    },
                    err => {
                        deferred.reject(err);
                    });
            }
            else {
                deferred.resolve(null);
            }
        },
        err => {
            deferred.reject(err);
        });
    return deferred.promise();
}

export function getTestPlanAndSuites(planId: number, testPlanName: string): IPromise<TreeView.TreeNode[]> {
    var deferred = $.Deferred<TreeView.TreeNode[]>();

    var tstClient = TestClient.getClient();
    var promises: IPromise<TestContracts.TestSuite[]>[] = [];
    //Need to make 2 call - firt for order, second for type and tc counts...
    promises.push(tstClient.getTestSuitesForPlan(VSS.getWebContext().project.name, planId, true, 0, 0, true));
    promises.push(tstClient.getTestSuitesForPlan(VSS.getWebContext().project.name, planId, true));

    Q.all(promises).then(
        data => {
            console.log(data);

            var testSuitesOrder = data[0];
            var testSuitesData = data[1];
         
            copyNodeValues(testSuitesOrder, testSuitesData);

            var tRoot = BuildTestSuiteTree(testSuitesOrder.filter(function (i) { return i.parent == null }), null);
            deferred.resolve([tRoot]);
        },
        err => {
            deferred.reject(err);
        }
    );

    return deferred.promise();
}

function copyNodeValues(testSuitesOrder: TestContracts.TestSuite[], testSuitesData: TestContracts.TestSuite[]) {
    testSuitesOrder.forEach(n => {
        console.log("Finding values for node ", n);
        var sameNodes = testSuitesData.filter(i => { return i.id == n.id });
        if (sameNodes.length >= 1) {
            n.suiteType = sameNodes[0].suiteType;
            n.testCaseCount = sameNodes[0].testCaseCount;
        }
        if(n.children!=null){
            copyNodeValues(n.children, testSuitesData);
        }
    });
}

function BuildTestSuiteTree(tsList: TestContracts.TestSuite[], parentNode: TreeView.TreeNode): TreeView.TreeNode {
    var returnNode: TreeView.TreeNode = null;

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
        if (t.children != null) {
            BuildTestSuiteTree(t.children, node);
        }
        

        if (parentNode != null) {
            parentNode.children.push(node);
        }
        else {
            returnNode = node;
        }

    });
    return returnNode;
}

function getStructure(structure: Contracts.TreeStructureGroup, teamProject: string): IPromise<TreeView.TreeNode[]> {
    var deferred = $.Deferred<TreeView.TreeNode[]>();

    var client = WITClient.getClient();
    client.getRootNodes(teamProject, 11).then(
        function (data: Contracts.WorkItemClassificationNode[]) {
            var nodes = convertToTreeNodes([data[structure]], "")
            nodes[0].expanded = true;
            deferred.resolve(nodes);
        },
        err => {
            deferred.reject(err);
        }
    );

    return deferred.promise();
}

function getStates(): IPromise<TreeView.TreeNode[]> {
    var deferred = $.Deferred<TreeView.TreeNode[]>();
    var client = WITClient.getClient();
    var project = VSS.getWebContext().project.name;

    client.getWorkItemTypeCategory(project, "Microsoft.TestCaseCategory").then(function (witCat) {

        client.getWorkItemType(project, witCat.defaultWorkItemType.name).then(function (data) {
            var d: any = data;

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

function getPrioriy(): IPromise<TreeView.TreeNode[]> {
    var deferred = $.Deferred<TreeView.TreeNode[]>();

    var client = WITClient.getClient();
    client.getWorkItemType(VSS.getWebContext().project.name, Common.WIQLConstants.getWiqlConstants().TestCaseTypeName).then(data => {
        var d = [{ name: const_Pivot_Priority, expanded: true, config: "root", children: [{ name: "1", config: "1", type: "Prio" }, { name: "2", config: "2" }, { name: "3", config: "3" }, { name: "4", config: "4" }] }];

        deferred.resolve(convertToTreeNodes(d, ""));
    });

    return deferred.promise();
}

// Converts the source to TreeNodes
function convertToTreeNodes(items, path): TreeView.TreeNode[] {
    var a: TreeView.TreeNode[] = [];

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

export function cloneTestPlan(sourcePlanId: number, sourceSuiteIds: number[], projectName: string, testPlanName: string, cloneRequirements: boolean, areaPath?: string, iterationPath?: string): IPromise<TestContracts.CloneOperationInformation> {
    var deferred = $.Deferred<TestContracts.CloneOperationInformation>();

    var testPlan: any = {
        name: testPlanName,
        project: { "Name": projectName }
    };

    if (areaPath == "") areaPath = projectName;
    if (iterationPath == "") iterationPath = projectName;

    var cloneRequest: TestContracts.TestPlanCloneRequest = {
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
    testCaseClient.cloneTestPlan(cloneRequest, VSS.getWebContext().project.name, sourcePlanId).then(
        data => {
            console.log("Clone test plan completed: " + data.completionDate);
            deferred.resolve(data);
        },
        err => {
            deferred.reject(err);
        }
    );

    return deferred.promise();
}

export function querryCloneOperationStatus(operationId: number): IPromise<TestContracts.CloneOperationInformation> {
    var testCaseClient = TestClient.getClient();

    var teamProjectName = VSS.getWebContext().project.name;

    return testCaseClient.getCloneInformation(teamProjectName, operationId);
}


export function cloneTestSuite(sourcePlanId: number, sourceSuiteId: number, targetPlanId: number, targetSuiteId: number, cloneChildSuites: boolean, cloneRequirements: boolean): IPromise<TestContracts.CloneOperationInformation> {
    var deferred = $.Deferred<TestContracts.CloneOperationInformation>();
    var testCaseClient = TestClient.getClient();

    var teamProjectName = VSS.getWebContext().project.name;

    var cloneRequest: TestContracts.TestSuiteCloneRequest = {
        cloneOptions: {
            cloneRequirements: cloneRequirements,
            copyAllSuites: cloneChildSuites,
            copyAncestorHierarchy: false,    // TODO: what does this do ???
            overrideParameters: {},
            destinationWorkItemType: "Test Case",
            relatedLinkComment: "Cloned from test case explorer"
        },
        destinationSuiteId: targetSuiteId,
        destinationSuiteProjectName: teamProjectName
    };

    // TODO: clone with hierarchy does not work?
    testCaseClient.cloneTestSuite(cloneRequest, teamProjectName, sourcePlanId, sourceSuiteId).then(
        data => {
            console.log("Clone test suite started: " + data.creationDate);

            deferred.resolve(data);
        },
        err => {
            deferred.reject(err);
        }
    );

    return deferred.promise();
}

function createTestSuite(suiteModel, targetPlanId: number, targetSuiteId: number): IPromise<TestContracts.TestSuite> {
    var deferred = $.Deferred<TestContracts.TestSuite>();

    var tstClient = TestClient.getClient();

    tstClient.createTestSuite(suiteModel, VSS.getWebContext().project.name, targetPlanId, targetSuiteId).then(
        result => {

            console.log("createTestSuite: ", suiteModel, ", parent: ", targetSuiteId, ", newId: " + result[0].id);

            deferred.resolve(result[0]);
        },
        err => {
            console.log("error creatig suite: ", suiteModel, ", parent: ", targetSuiteId, ", err: ", err);
            deferred.reject(err);
        }
    );

    return deferred.promise();
}

function getTestCases(planId, suiteId): IPromise<TestContracts.SuiteEntry[]> {
    var deferred = $.Deferred<TestContracts.SuiteEntry[]>();

    var tstClient = TestClient.getClient();
    tstClient.getSuiteEntries(VSS.getWebContext().project.name, suiteId).then(
        suiteEntries => {
            deferred.resolve(suiteEntries);
        }
    );
    return deferred.promise();
}

function createStaticSuite(suiteName: string, targetPlanId: number, targetSuiteId: number): IPromise<TestContracts.TestSuite> {
    var deferred = $.Deferred<TestContracts.TestSuite>();

    var suiteModel: TestContracts.SuiteCreateModel = {
        "suiteType": "StaticTestSuite",
        "name": suiteName,
        "queryString": "",
        "requirementIds": []
    };

    createTestSuite(suiteModel, targetPlanId, targetSuiteId).then(
        testSuite => {
            deferred.resolve(testSuite);
        });

    return deferred.promise();
}

function createRequirementSuite(requirementId: number, targetPlanId: number, targetSuiteId: number): IPromise<TestContracts.TestSuite> {

    var suiteModel: TestContracts.SuiteCreateModel = {
        "suiteType": "RequirementTestSuite",
        "name": "",
        "requirementIds": [
            requirementId
        ],
        "queryString": ""
    }

    return createTestSuite(suiteModel, targetPlanId, targetSuiteId);
}

function createQuerySuite(suiteName: string, suiteQuery: string, targetPlanId: number, targetSuiteId: number): IPromise<TestContracts.TestSuite> {

    var suiteModel: TestContracts.SuiteCreateModel = {
        "suiteType": "DynamicTestSuite",
        "name": suiteName,
        "queryString": suiteQuery,
        "requirementIds": []
    }

    return createTestSuite(suiteModel, targetPlanId, targetSuiteId);
}

function getTestSuite(planId: number, suiteId: number): IPromise<TestContracts.TestSuite> {
    var deferred = $.Deferred<TestContracts.TestSuite>();

    var tstClient = TestClient.getClient();
    tstClient.getTestSuiteById(VSS.getWebContext().project.name, planId, suiteId).then(
        data => {
            deferred.resolve(data);
        },
        err => {
            deferred.reject(err);
        }
    );
    return deferred.promise();
}

export function addTestSuite(sourceNode: TreeView.TreeNode, targetPlanId: number, targetSuiteId: number): IPromise<TestContracts.TestSuite> {
    var deferred = $.Deferred<TestContracts.TestSuite>();
    console.log("addign org suite", sourceNode.config.suiteId, sourceNode.config);
    switch (sourceNode.type) {
        case "StaticTestSuite":

            getTestCases(sourceNode.config.testPlanId, sourceNode.config.suiteId).then(
                suiteEntries => {

                    createStaticSuite(sourceNode.config.name, targetPlanId, targetSuiteId).then(
                        createdTestSuite => {
                            var sortOrderUpdate: TestContracts.SuiteEntryUpdateModel[] = [];
                            var lst: IPromise<TestContracts.TestSuite>[] = [];
                            var csEntries: TestContracts.SuiteEntry[] = [];
                            sourceNode.children.forEach(n => {
                                csEntries.push(suiteEntries.filter(se => { return se.childSuiteId == n.config.suiteId; })[0]);
                                lst.push(addTestSuite(n, targetPlanId, createdTestSuite.id));
                            });

                            Q.all(lst).then(
                                createdSuites => {

                                    csEntries.forEach((csEntry, ix) => {
                                        console.log("sortorder suite", createdSuites[ix].id, "sequence", csEntry)
                                        sortOrderUpdate.push({ childSuiteId: createdSuites[ix].id, testCaseId: 0, sequenceNumber: csEntry.sequenceNumber });
                                    });

                                    // Add test cases 
                                    var tcEntries = suiteEntries.filter(se => { return se.testCaseId > 0; });
                                    var testCaseIds = tcEntries.map(se => { return se.testCaseId }).join();
                                    console.log("adding test cases to suite", testCaseIds);

                                    addTestCasesToSuite(targetPlanId, createdTestSuite.id, testCaseIds).then(
                                        stc => {
                                            tcEntries.forEach((tcEntry, ix) => {
                                                sortOrderUpdate.push({ childSuiteId: 0, testCaseId: Number(stc[ix].testCase.id), sequenceNumber: tcEntry.sequenceNumber });
                                            });
                                            console.log("reorder suite", sortOrderUpdate);
                                            reorderTestSuite(createdTestSuite.id, sortOrderUpdate).then(
                                                data => {
                                                    deferred.resolve(createdTestSuite);
                                                }
                                            );
                                        });

                                }
                            );

                        });
                    //promises.push(sourceNode.config.name);
                    //deferred.resolve(testSuite);
                }
            );
            break;
        case "RequirementTestSuite":
            getTestSuite(sourceNode.config.testPlanId, sourceNode.config.suiteId).then(testSuite => {
                createRequirementSuite(testSuite.requirementId, targetPlanId, targetSuiteId).then(createdTestSuite => {
                    deferred.resolve(createdTestSuite);
                });

            });
            break;
        case "DynamicTestSuite":
            getTestSuite(sourceNode.config.testPlanId, sourceNode.config.suiteId).then(testSuite => {
                createQuerySuite(sourceNode.config.name, testSuite.queryString, targetPlanId, targetSuiteId).then(
                    createdTestSuite => {
                        deferred.resolve(createdTestSuite);
                    });

            });
            break;
    }

    //Q.allResolved(promises);

    return deferred.promise();
}

export function removeTestSuite(planId: number, suiteId: number): IPromise<void> {
    var deferred = $.Deferred<void>();

    var tstClient = TestClient.getClient();
    tstClient.deleteTestSuite(VSS.getWebContext().project.name, planId, suiteId).then(
        data => {
            deferred.resolve(data);
        },
        err => {
            deferred.reject(err);
        }
    );

    return deferred.promise();
}

export function removeTestPlan(planId: number): IPromise<void> {
    var deferred = $.Deferred<void>();

    var tstClient = TestClient.getClient();
    tstClient.deleteTestPlan(VSS.getWebContext().project.name, planId).then(
        data => {
            deferred.resolve(data);
        },
        err => {
            deferred.reject(err);
        }
    );

    return deferred.promise();
}

export function addTestCasesToSuite(planId: number, suiteId: number, testCaseIds: string): IPromise<TestContracts.SuiteTestCase[]> {
    var deferred = $.Deferred<TestContracts.SuiteTestCase[]>();

    var tstClient = TestClient.getClient();
    tstClient.addTestCasesToSuite(VSS.getWebContext().project.name, planId, suiteId, testCaseIds).then(
        data => {
            deferred.resolve(data);
        },
        err => {
            deferred.reject(err);
        }
    );

    return deferred.promise();
}


export function reorderTestSuite(suiteId: number, updates: TestContracts.SuiteEntryUpdateModel[]): IPromise<TestContracts.SuiteEntry[]> {
    var deferred = $.Deferred<TestContracts.SuiteEntry[]>();

    var tstClient = TestClient.getClient();

    tstClient.reorderSuiteEntries(updates, VSS.getWebContext().project.name, suiteId).then(
        data => {
            deferred.resolve(data);
        },
        err => {
            deferred.reject(err);
        }
    );

    return deferred.promise();
}

export function removeTestCaseFromSuite(planId: number, suiteId: number, testCaseIds: string): IPromise<void> {
    var deferred = $.Deferred<void>();

    var tstClient = TestClient.getClient();
    tstClient.removeTestCasesFromSuiteUrl(VSS.getWebContext().project.name, planId, suiteId, testCaseIds).then(
        data => {
            deferred.resolve(data);
        },
        err => {
            deferred.reject(err);
        }
    );

    return deferred.promise();
}

export function getProjects(): IPromise<string[]> {
    var deferred = $.Deferred<string[]>();

    var coreClient = CoreClient.getClient();
    coreClient.getProjects().then(
        data => {
            deferred.resolve(data.map(p => { return p.name }).sort(function (a, b) { return a.localeCompare(b); }));
        },
        err => {
            deferred.reject(err);
        }
    );

    return deferred.promise();
}