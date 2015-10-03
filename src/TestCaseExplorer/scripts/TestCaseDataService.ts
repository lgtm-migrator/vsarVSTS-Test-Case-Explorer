/// <reference path='ref/jquery.d.ts' />
/// <reference path='ref/VSS.d.ts' />

import WorkItemContracts = require("TFS/WorkItemTracking/Contracts");
import TestClient = require("TFS/TestManagement/RestClient");
import WorkItemClient = require("TFS/WorkItemTracking/RestClient");
import TreeView = require("VSS/Controls/TreeView");



private function  getTestCases(workItemIds: number[]): IPromise < any > {
    var deferred = $.Deferred<any[]>();
    var workItemClient = WorkItemClient.getClient();

    workItemClient.getWorkItems(workItemIds, this._fields).then(result => {

        deferred.resolve(result.map(function (i) { return i.fields; }));
    });

    return deferred.promise();
}

private function getTestCasesByWiql(fields:string[], wiqlWhere: string): IPromise < any > {
    var deferred = $.Deferred<any[]>();
    var workItemClient = WorkItemClient.getClient();

    var wiql: string = "SELECT ";
    fields.forEach(function (f) {
        wiql += f + ", ";
    });
    wiql = wiql.substr(0, wiql.lastIndexOf(", "));
    wiql += " FROM WorkItems WHERE [System.TeamProject] = '" + VSS.getWebContext().project.name + "' AND [System.WorkItemType] IN GROUP 'Test Case Category'  " + (wiqlWhere == "" ? "" : " AND " + wiqlWhere) + " ORDER BY [System.Id]";
         

    workItemClient.queryByWiql({ query: wiql }, VSS.getWebContext().project.name).then(result => {
        var ids = result.workItems.map(function (item) {
            return item.id;
        }).map(Number);

        this.getTestCases(ids).then(testCases => {
            deferred.resolve(testCases);
        });
    });

    return deferred.promise();
}

private function getTestCasesByProjectStructure(structureType: WorkItemContracts.TreeNodeStructureType, path: string): IPromise < any > {
    var typeField: string;
    switch(structureType) {
        case WorkItemContracts.TreeNodeStructureType.Area:
            typeField = "System.AreaPath";
            break;
        case WorkItemContracts.TreeNodeStructureType.Iteration:
            typeField = "System.IterationPath";
            break;
    }

    var wiqlWhere = "[" + typeField + "] UNDER '" + path + "'";
    return this.getTestCasesByWiql(["System.Id"], wiqlWhere);
}

export function getTestCasesByPriority(priority: string): IPromise < any > {
    var wiqlWhere: string;
    if(priority != "any") {
        wiqlWhere = "[Microsoft.VSTS.Common.Priority] = " + priority
    }

        return this.getTestCasesByWiql(["System.Id"], wiqlWhere);
}

export function getTestCasesByState(state: string): IPromise < any > {
    var wiqlWhere: string;
    if(state != "any") {
        wiqlWhere = "[System.State] = '" + state + "'";
    }

        return this.getTestCasesByWiql(["System.Id"], wiqlWhere);
}

export function getTestCasesByTestPlan(planId: number, suiteId: number): IPromise < any > {
    var deferred = $.Deferred<any[]>();
    var testClient = TestClient.getClient();

    testClient.getTestCases(VSS.getWebContext().project.name, planId, suiteId).then(result => {
        var ids = result.map(function (item) {
            return item.testCase.id;
        }).map(Number);

        this.getTestCases(ids).then(testCases => {
            deferred.resolve(testCases);
        });
    });

    return deferred.promise();
}