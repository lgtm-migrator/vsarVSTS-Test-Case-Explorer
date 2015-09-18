﻿/// <reference path='ref/jquery.d.ts' />
/// <reference path='ref/VSS.d.ts' />

import Contracts = require("TFS/WorkItemTracking/Contracts");
import TestClient = require("TFS/TestManagement/RestClient");
import WITClient = require("TFS/WorkItemTracking/RestClient");
import TreeView = require("VSS/Controls/TreeView");


export function getNodes(param) {

    switch (param) {
        case "Area path":
            return getStructure(Contracts.TreeStructureGroup.Areas);
            break;
        case "Iteration path":
            return getStructure(Contracts.TreeStructureGroup.Iterations);
            break;
        case "Priority":
            return getPrioriy();
            break;
        case "State":
            return getStates();
            break;
        case "Test plan":
            return getTestPlans();
            break;
    }

}

export function getIconFromSuiteType(suiteType): string
{
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

    export function getTestPlans(): IPromise<TreeView.TreeNode[]> {
        // Get an instance of the client
        var deferred = $.Deferred<TreeView.TreeNode[]>();

        var tstClient = TestClient.getClient();
        tstClient.getPlans(VSS.getWebContext().project.name).then(function (data) {

            var tRoot = convertToTreeNodes([{ name: "Test plans", children: [] }]);

            var i=0 ;
            var noPlans = data.length;
            data.forEach(function (t) {
                getTestPlanaAndSuites(t.id, t.name).then(function (n) {
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

    export function getTestSuitesForTestCase(testCaseId: number): IPromise<any[]> {
        // Get an instance of the client
        var deferred = $.Deferred<any[]>();
        
        var tstClient = TestClient.getClient();
        tstClient.getSuitesByTestCaseId(testCaseId).then(function (data) {
            

            deferred.resolve(data);
        });
        return deferred.promise();
    }

    export function getTestResultsForTestCase(testCaseId: number): IPromise<any[]> {
        // Get an instance of the client
        var deferred = $.Deferred<any[]>();

        var tstClient = TestClient.getClient();
        var q = { query: "Select * from TestResult  WHERE TestCaseId=" + testCaseId};


        tstClient.getTestResultsByQuery(q,VSS.getWebContext().project.name, true).then(function (data) {


            deferred.resolve(data);
        });
        return deferred.promise();
    }


    export function getTestPlanaAndSuites(planId:number, testPlanName:string): IPromise<TreeView.TreeNode[]> {
        // Get an instance of the client
        var deferred = $.Deferred<TreeView.TreeNode[]>();
        planId = 546;
        var tstClient = TestClient.getClient();
        tstClient.getTestSuitesForPlan(VSS.getWebContext().project.name, planId).then(function (data) {
            var tRoot = BuildTestSuiteTree(data.filter(function (i) { return i.parent == null }), null, data);
            
            deferred.resolve([tRoot]);
        });
        return deferred.promise();
    }

    function BuildTestSuiteTree(tsList: any[], parentNode: TreeView.TreeNode, allTS: any[]) : TreeView.TreeNode{
        var returnNode: TreeView.TreeNode = null;

        tsList.forEach(function (t) {
            var node = new TreeView.TreeNode(t.name);
            node.id = t.id;
            node.type = t.suiteType;
            node.expanded = true;
            node.droppable = true;
            node.icon = getIconFromSuiteType(t.suiteType);
            node.config = { suiteId: t.id, testPlanId: parseInt( t.plan.id) };
            BuildTestSuiteTree(allTS.filter(function (i) { return  i.parent!=null && i.parent.id == t.id }), node, allTS);

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
        client.getClassificationNode(VSS.getWebContext().project.name, structure, null, 7).then(function (data) {
            var p = VSS.getWebContext().project.name
            var d = [];

            //fake
            if (structure == Contracts.TreeStructureGroup.Areas) {
                var f = { name: p , path: "" + p, children: [] };
                f.children.push(
                    { name: "Mobile" , path: "" + p + "\\Mobile", children: [] }
                    );
                f.children[0].children.push(
                    { name: "iPhone" , path: "" + p + "\\Mobile\\iPhone", children: [] }
                    );
                f.children[0].children.push(
                    { name: "Android" , path: "" + p + "\\Mobile\\Android", children: [] }
                    );
                f.children[0].children.push(
                    { name: "WP" , path: "" + p + "\\Mobile\\WP", children: [] }
                    );

                d.push(f);
            }
            else {
                var f = { name: p , path: "" + p, children: [] };
                f.children.push(
                    { name: "Sprint 1", path: "" + p + "\\Sprint 1", children: [] }
                    );
                f.children.push(
                    { name: "Sprint 2" , path: "" + p + "\\Sprint 2", children: [] }
                    );
                f.children.push(
                    { name: "Sprint 3" , path: "" + p + "\\Sprint 3", children: [] }
                    );
                d.push(f);
            }

            deferred.resolve(convertToTreeNodes(d));

        });
    
        //TODO - getClasification Node doesnt work as expected with areapath

  
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
                    t.children.push({ name: s , config:s});
                }

                var t2 = [];
                t2.push(t);
                deferred.resolve(convertToTreeNodes(t2));
            });
        });

        return deferred.promise();
    }

    function getPrioriy(): IPromise<TreeView.TreeNode[]> {
        var deferred = $.Deferred<TreeView.TreeNode[]>();

        var client = WITClient.getClient();
        client.getWorkItemType(VSS.getWebContext().project.name, "Test case").then(function (data) {
            var d = [{ name: "Priority", children: [{ name: "1", config: "1" }, { name: "2", config: "2" }, { name: "3",config:"3" }, { name: "4", config:"4"}] }];

            deferred.resolve(convertToTreeNodes(d));
        });

        return deferred.promise();
    }

    // Converts the source to TreeNodes
    function convertToTreeNodes(items): TreeView.TreeNode[] {
        var a: TreeView.TreeNode[] = [];
        items.forEach(function (item) {
            var node = new TreeView.TreeNode(item.name);
            node.icon = item.icon;
            node.config = { name: item.name, path: item.path };

            node.expanded = item.expanded;
            if (item.children && item.children.length > 0) {
                node.addRange(convertToTreeNodes(item.children));
            }
            a.push(node);
        });
        return a;
    }
