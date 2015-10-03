/// <reference path='ref/jquery.d.ts' />
/// <reference path='ref/VSS.d.ts' />

import WorkItemContracts = require("TFS/WorkItemTracking/Contracts");
import TestClient = require("TFS/TestManagement/RestClient");
import WorkItemClient = require("TFS/WorkItemTracking/RestClient");
import TreeView = require("VSS/Controls/TreeView");



export interface ITestCaseFilter {
    initialize(): IPromise<any>,
    filter(data: any[]): any[];
}

export class orphanTestCasesFilter implements ITestCaseFilter {
    private _listTC:any[]
    public initialize(): IPromise<any>{

        var deferred = $.Deferred<any>();
        var workItemClient = WorkItemClient.getClient();

        var wiqlOrphaneTC: string = "SELECT [Source].[System.Id] FROM WorkItemLinks WHERE ([Source].[System.TeamProject] = @project AND  [Source].[System.WorkItemType] IN GROUP 'Test Case Category') And ([System.Links.LinkType] <> '') And ([Target].[System.WorkItemType] IN GROUP 'Requirement Category') ORDER BY [Source].[System.Id] mode(DoesNotContain)"
        wiqlOrphaneTC = wiqlOrphaneTC.replace("@project", "'" + VSS.getWebContext().project.name + "'");
        
        workItemClient.queryByWiql({ query: wiqlOrphaneTC }, VSS.getWebContext().project.name).then(result => {
            if (result.queryResultType== 1) {
                this._listTC = result.workItems.map(i=> { return i.id });
            }
            deferred.resolve(result);
        },
        err => {
            deferred.reject(err);
        });
        
        return deferred.promise();
    }
    public filter(data: any[]): any[]
    {
        var flt = this;
        return data.filter(function (i) { return flt._listTC.indexOf(i["System.Id"])>=0 });
    }
}


export function getTestCasesByProjectStructure(structureType: WorkItemContracts.TreeNodeStructureType, path: string): IPromise < any > {
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
    return getTestCasesByWiql(["System.Id"], wiqlWhere);
}

export function getTestCasesByPriority(priority: string): IPromise < any > {
    var wiqlWhere: string;
    if(priority != "any") {
        wiqlWhere = "[Microsoft.VSTS.Common.Priority] = " + priority
    }

        return getTestCasesByWiql(["System.Id"], wiqlWhere);
}

export function getTestCasesByState(state: string): IPromise < any > {
    var wiqlWhere: string;
    if(state != "any") {
        wiqlWhere = "[System.State] = '" + state + "'";
    }

        return getTestCasesByWiql(["System.Id"], wiqlWhere);
}

export function getTestCasesByTestPlan(planId: number, suiteId: number): IPromise < any > {
    var deferred = $.Deferred<any[]>();
    var testClient = TestClient.getClient();

    testClient.getTestCases(VSS.getWebContext().project.name, planId, suiteId).then(result => {
        var ids = result.map(function (item) {
            return item.testCase.id;
        }).map(Number);

        getTestCases(ids).then(testCases => {
            deferred.resolve(testCases);
        });
    });

    return deferred.promise();
}

function getTestCases(workItemIds: number[]): IPromise<any> {
    var deferred = $.Deferred<any[]>();
    var workItemClient = WorkItemClient.getClient();

    workItemClient.getWorkItems(workItemIds, this._fields).then(result => {

        deferred.resolve(result.map(function (i) { i.fields["System.Id"] = i.id; return i.fields; }));
    });

    return deferred.promise();
}

function getTestCasesByWiql(fields: string[], wiqlWhere: string): IPromise<any> {
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

        getTestCases(ids).then(testCases => {
            deferred.resolve(testCases);
        });
    });

    return deferred.promise();
}
