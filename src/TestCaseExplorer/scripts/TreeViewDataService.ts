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

/// <reference path='../typings/tsd.d.ts' />

import Q = require("q");

import Contracts = require("TFS/WorkItemTracking/Contracts");
import TestClient = require("TFS/TestManagement/RestClient");
import TestContracts = require("TFS/TestManagement/Contracts");
import WITClient = require("TFS/WorkItemTracking/RestClient");
import TreeView = require("VSS/Controls/TreeView");
import VSS_Service = require("VSS/Service");

import Common = require("scripts/Common");

export function getNodes(param, tp) {

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
            if (tp === null) {
                //Fetch All TestPlans
                return getTestPlansWithSuite();
            }
            else {
                //Fetch the TestPlan
                return getTestPlanAndSuites(tp.id, tp.text) 
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
    var q = { query: "Select * from TestResult  WHERE TestCaseId=" + testCaseId };

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
    tstClient.getTestSuitesForPlan(VSS.getWebContext().project.name, planId).then(
        data => {
            var tRoot = BuildTestSuiteTree(data.filter(function (i) { return i.parent == null }), null, data);
            deferred.resolve([tRoot]);
        },
        err => {
            deferred.reject(err);
        }
    );

    return deferred.promise();
}

function BuildTestSuiteTree(tsList: any[], parentNode: TreeView.TreeNode, allTS: any[]): TreeView.TreeNode {
    var returnNode: TreeView.TreeNode = null;

    tsList.forEach(function (t) {
        var node = new TreeView.TreeNode(t.name);
        node.id = t.id;
        node.type = t.suiteType;
        node.expanded = true;
        if (t.testCaseCount > 0) {
            node.text += " (" + t.testCaseCount + ")";
        }
        node.droppable = true
        node.config = { name: t.name, suiteId: t.id, testPlanId: parseInt(t.plan.id) };
        if (t.parent != null) {
            node.icon = getIconFromSuiteType(t.suiteType);
            node.config.type = "TestSuite";
        }
        else {
            node.icon = "icon-testplan";
            node.config.type = "TestPlan";
        }
        BuildTestSuiteTree(allTS.filter(function (i) { return i.parent != null && i.parent.id == t.id }), node, allTS);

        if (parentNode != null) {
            parentNode.children.push(node);
        }
        else {
            returnNode = node;
        }

    });
    return returnNode;
}

function getStructure(structure: Contracts.TreeStructureGroup): IPromise<TreeView.TreeNode[]> {
    var deferred = $.Deferred<TreeView.TreeNode[]>();

    var client = WITClient.getClient();
    client.getRootNodes(VSS.getWebContext().project.name, 11).then(
        function (data: Contracts.WorkItemClassificationNode[]) {
            deferred.resolve(convertToTreeNodes([data[structure]], ""));
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

function getPrioriy(): IPromise<TreeView.TreeNode[]> {
    var deferred = $.Deferred<TreeView.TreeNode[]>();

    var client = WITClient.getClient();
    client.getWorkItemType(VSS.getWebContext().project.name, Common.WIQLConstants.getWiqlConstants().TestCaseTypeName).then(data => {
        var d = [{ name: "Priority", children: [{ name: "1", config: "1" }, { name: "2", config: "2" }, { name: "3", config: "3" }, { name: "4", config: "4" }] }];

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

export function cloneTestPlan(sourcePlanId: number, sourceSuiteIds: number[], testPlanName: string, cloneRequirements: boolean, areaPath?: string, iterationPath?: string): IPromise<TestContracts.CloneOperationInformation> {
    var deferred = $.Deferred<TestContracts.CloneOperationInformation>();

    var testPlan: any = {
        name: testPlanName,
        project: VSS.getWebContext().project.name
    };

    var cloneRequest: TestContracts.TestPlanCloneRequest = {
        destinationTestPlan: testPlan,
        options: {
            cloneRequirements: cloneRequirements,
            copyAllSuites: true,
            copyAncestorHierarchy: true,
            overrideParameters: { "System.AreaPath": areaPath, "System.IterationPath": iterationPath},
            destinationWorkItemType: "Test Case",
            relatedLinkComment: "Comment"
        },
        suiteIds: sourceSuiteIds
    };

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

            console.log("createTestSuite: " + suiteModel.name + ", parent: " + targetSuiteId + ", node: " + result[0].id);

            deferred.resolve(result[0]);
        },
        err => {
            deferred.reject(err);
        }
    );

    return deferred.promise();
}

function getTestCases(planId, suiteId): IPromise<string> {
    var deferred = $.Deferred<string>();

    var tstClient = TestClient.getClient();
    tstClient.getTestCases(VSS.getWebContext().project.name, planId, suiteId).then(result => {
        var idList = result.map(function (item) {
            return item.testCase.id;
        });
        deferred.resolve(idList.join());
    });

    return deferred.promise();
}

function createStaticSuite(suiteName: string, testCaseIds: string, targetPlanId: number, targetSuiteId: number): IPromise<TestContracts.TestSuite> {
    var deferred = $.Deferred<TestContracts.TestSuite>();

    var suiteModel: TestContracts.SuiteCreateModel = {
        "suiteType": "StaticTestSuite",
        "name": suiteName,
        "queryString": "",
        "requirementIds": []
    };

    createTestSuite(suiteModel, targetPlanId, targetSuiteId).then(testSuite => {
        if (testCaseIds != "") {
            addTestCasesToSuite(targetPlanId, testSuite.id, testCaseIds).then(result => {
                deferred.resolve(testSuite);
            });
        }
        else {
            deferred.resolve(testSuite);
        }
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

    switch (sourceNode.type) {
        case "StaticTestSuite":
            getTestCases(sourceNode.config.testPlanId, sourceNode.config.suiteId).then(testCaseIds => {
                createStaticSuite(sourceNode.config.name, testCaseIds, targetPlanId, targetSuiteId).then(testSuite => {
                    var lst = [];
                    sourceNode.children.forEach(n => {
                        lst.push(addTestSuite(n, targetPlanId, testSuite.id));
                    });
                    Q.all(lst).then(data => {
                        deferred.resolve(testSuite);
                    });
                    //promises.push(sourceNode.config.name);
                    //deferred.resolve(testSuite);
                });
            });
            break;
        case "RequirementTestSuite":
            getTestSuite(sourceNode.config.testPlanId, sourceNode.config.suiteId).then(testSuite => {
                createRequirementSuite(testSuite.requirementId, targetPlanId, targetSuiteId).then(data => {
                    deferred.resolve(testSuite);
                });
                
            });
            break;
        case "DynamicTestSuite":
            getTestSuite(sourceNode.config.testPlanId, sourceNode.config.suiteId).then(testSuite => {
                createQuerySuite(sourceNode.config.name, testSuite.queryString, targetPlanId, targetSuiteId).then(data => {
                    deferred.resolve(testSuite);
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

export function addTestCasesToSuite(planId: number, suiteId: number, testCaseIds: string): IPromise<TreeView.TreeNode[]> {
    var deferred = $.Deferred<any[]>();

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
