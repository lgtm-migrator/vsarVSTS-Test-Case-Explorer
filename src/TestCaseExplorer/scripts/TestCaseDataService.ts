/// <reference path='ref/jquery.d.ts' />
/// <reference path='ref/VSS.d.ts' />
/// <reference path='ref/q.d.ts' />

import WorkItemContracts = require("TFS/WorkItemTracking/Contracts");
import TestClient = require("TFS/TestManagement/RestClient");
import WorkItemClient = require("TFS/WorkItemTracking/RestClient");
import TreeView = require("VSS/Controls/TreeView");
import Q = require("q");



export enum filterMode {
    Contains, 
    NotContains
}

export interface ITestCaseFilter {
    setMode(mode: filterMode),
    initialize(value:any): IPromise<any>,
    filter(data: any[]): any[];
}

export class wiqlFilter implements ITestCaseFilter {
    private _listTC: any[]
    private _mode: filterMode;

    public initialize(wiql:string): IPromise<any>{

        var deferred = $.Deferred<ITestCaseFilter>();
        var workItemClient = WorkItemClient.getClient();

        
        wiql = wiql.replace("@project", "'" + VSS.getWebContext().project.name + "'");
        
        workItemClient.queryByWiql({ query: wiql }, VSS.getWebContext().project.name).then(result => {
            if (result.queryResultType== 1) {
                this._listTC = result.workItems.map(i=> { return i.id });
            }
            deferred.resolve(this);
        },
        err => {
            deferred.reject(err);
        });
        
        return deferred.promise();
    }

    public setMode(mode: filterMode) {
        this._mode = mode;
    }

    public filter(data: any[]): any[]
    {
        var flt = this;
        return data.filter(function (i) { var exist = flt._listTC.indexOf(i["System.Id"]) >= 0; return (flt._mode == filterMode.Contains) ? exist : !exist; });
    }
}

export class testSuiteFilter implements ITestCaseFilter {
    private _listTC: any[]
    private _mode: filterMode;

    public initialize(data: any[]): IPromise<any> {

        var deferred = $.Deferred<ITestCaseFilter>();

        var testClient = TestClient.getClient();

        var que: IPromise<any[]>[] = [];

        // anropa getSuitesByTestCaseId och spara tc_id, suite_count i en dictionary eller liknande
        // hur får jag synkat resultat från getSuitesByTestCaseId med rätt tc id?

        data.forEach(item => {
            que.push(testClient.getSuitesByTestCaseId(item["System.Id"]));
        });

        Q.all(que).then(results => {
            results.forEach(suites => {
                var suiteCount = suites.length;
            });
        });

        deferred.resolve(this);

        return deferred.promise();
    }

    public setMode(mode: filterMode) {
        this._mode = mode;
    }

    public filter(data: any[]): any[] {
        var flt = this;
        // TODO: filtrera på tc med suite-count == 0 eller suite-count > 1
        return data.filter(function (i) { var exist = flt._listTC.indexOf(i["System.Id"]) >= 0; return (flt._mode == filterMode.Contains) ? exist : !exist; });
    }
}

export function getTestCasesByProjectStructure(structureType: WorkItemContracts.TreeNodeStructureType, path: string, recursive:boolean): IPromise < any > {
    var typeField: string;
    switch(structureType) {
        case WorkItemContracts.TreeNodeStructureType.Area:
            typeField = "System.AreaPath";
            break;
        case WorkItemContracts.TreeNodeStructureType.Iteration:
            typeField = "System.IterationPath";
            break;
    }

    var wiqlWhere = "[" + typeField + "] " + ( recursive ? "UNDER" : "=") + " '" + path + "'";
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

function   getRecursiveChildIds(id:number , lst: any[]): number[]
{
    var ret: number[] = [];
    ret.push(id);
    lst.filter(i=> { return i.parent!=null && i.parent.id == id }).forEach(it=> {
        ret = ret.concat(getRecursiveChildIds(it.id, lst));
    });
    return ret;
}

export function getTestCasesByTestPlan(planId: number, suiteId: number, recursive: boolean): IPromise<any> {
    var deferred = $.Deferred<any[]>();
    var testClient = TestClient.getClient();
 
    if (recursive) {
        var idList = [];
        var suite_id: number = suiteId;
        

        testClient.getTestSuitesForPlan(VSS.getWebContext().project.name, planId, true).then(suites => {
            var que: IPromise<any[]>[] = [];

            getRecursiveChildIds(suiteId, suites).forEach(s => {
                que.push(testClient.getTestCases(VSS.getWebContext().project.name, planId, s));
            });
            Q.all(que).then(results => {
                results.forEach(r => {
                    idList = idList.concat(
                        r.map(i => { return i.testCase.id; })
                        );
                });
                if (idList.length > 0) {
                    getTestCases(idList).then(testCases => {
                        deferred.resolve(testCases);
                    });
                }
                else {
                    deferred.resolve([]);
                }
            });
        });
    }
    else{


        testClient.getTestCases(VSS.getWebContext().project.name, planId, suiteId).then(result => {
            var idList = result.map(function (item) {
                return item.testCase.id;
            }).map(Number);

            if (idList.length > 0) {
                getTestCases(idList).then(testCases => {
                    deferred.resolve(testCases);
                });
            }
            else {
                deferred.resolve([]);
            }
        });
    }
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
        if (result.workItems.length > 0) {
            var ids = result.workItems.map(function (item) {
                return item.id;
            }).map(Number);

            getTestCases(ids).then(testCases => {
                deferred.resolve(testCases);
            });
        }
        else {
            deferred.resolve([]);
        }
    });

    return deferred.promise();
}
