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

/// <reference path='ref/jquery/jquery.d.ts' />
/// <reference path='ref/VSS.d.ts' />

import Contracts = require("TFS/WorkItemTracking/Contracts");
import TestClient = require("TFS/TestManagement/RestClient");
import WITClient = require("TFS/WorkItemTracking/RestClient");
import TreeView = require("VSS/Controls/TreeView");

export function getNodes(param) {

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

export function getIconFromTestOutcome(outcome): string {
    var icon: string = "";
    switch (outcome) {
        case "NotApplicable":
            icon = "icon-tfs-tcm-not-applicable";
            break;
        case "Blocked":
            icon = "icon-tfs-tcm-block-test";
            break;
        case "Passed":
            icon = "icon-tfs-build-status-succeeded";
            break;
        case "Failed":
            icon = "icon-tfs-build-status-failed";
            break;
        case "None":
            icon = "icon-tfs-tcm-block-test";
            break;
        case "DynamicTestSuite":
            icon = "icon-tfs-build-status-succeeded";
            break
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
    // Get an instance of the client
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
    // Get an instance of the client
    var deferred = $.Deferred<TreeView.TreeNode[]>();

    var tstClient = TestClient.getClient();
    tstClient.getPlans(VSS.getWebContext().project.name).then(function (data) {

        var tRoot = convertToTreeNodes([{ name: "Test plans", children: [] }], "");

        data.forEach(function (t) {
            tRoot[0].addRange(convertToTreeNodes([{ name: t.name, id: t.id, children: [] }], ""));
        });
        tRoot[0].expanded = true;
        deferred.resolve(tRoot);
    });

    return deferred.promise();
}

export function getTestSuitesForTestCase(testCaseId: number): IPromise<any[]> {
    // Get an instance of the client
    var deferred = $.Deferred<any[]>();

    var tstClient = TestClient.getClient();
    tstClient.getSuitesByTestCaseId(testCaseId).then(
        data=> {
            deferred.resolve(data);
        },
        err=> {
            deferred.resolve(null);
        });
    return deferred.promise();
}

export function getTestResultsForTestCase(testCaseId: number): IPromise<any[]> {
    // Get an instance of the client
    var deferred = $.Deferred<any[]>();
    var tstClient = TestClient.getClient();
    var q = { query: "Select * from TestResult  WHERE TestCaseId=" + testCaseId };

    tstClient.getTestResultsByQuery(q, VSS.getWebContext().project.name, true).then(
        data=> {
            deferred.resolve(data);
        },
        err=> {
            deferred.reject(err);
        }
    );
    return deferred.promise();
}

export function getLinkedRequirementsForTestCase(testCaseId: number): IPromise<any[]> {
    // Get an instance of the client
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
    // Get an instance of the client
    var deferred = $.Deferred<TreeView.TreeNode[]>();

    var tstClient = TestClient.getClient();
    tstClient.getTestSuitesForPlan(VSS.getWebContext().project.name, planId).then(
        data=> {
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
        node.droppable = true;
        if (t.parent != null) {
            node.icon = getIconFromSuiteType(t.suiteType);
        }
        else {
            node.icon = "icon-testplan";
        }
        node.config = { name: t.name, suiteId: t.id, testPlanId: parseInt(t.plan.id) };
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
        err=> {
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
    client.getWorkItemType(VSS.getWebContext().project.name, "Test case").then(function (data) {
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
        node.config = { name: item.name, path: itemPath };

        node.expanded = item.expanded;
        if (item.children && item.children.length > 0) {
            node.addRange(convertToTreeNodes(item.children, itemPath));
        }
        a.push(node);
    });
    return a;
}
