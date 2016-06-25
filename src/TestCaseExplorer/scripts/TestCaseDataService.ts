//---------------------------------------------------------------------
// <copyright file="TestCaseDataService.ts">
//    This code is licensed under the MIT License.
//    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF 
//    ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED 
//    TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A 
//    PARTICULAR PURPOSE AND NONINFRINGEMENT.
// </copyright>
// <summary>
//    This is part of the Test Case Explorer extensions
//    from the ALM Rangers. This file implements the data 
//    services (api calls) for the test case view. 
// </summary>
//---------------------------------------------------------------------

/// <reference path='ref/jquery/jquery.d.ts' />
/// <reference path='ref/q/q.d.ts' />
/// <reference path='ref/VSS.d.ts' />

import WorkItemContracts = require("TFS/WorkItemTracking/Contracts");
import TestClient = require("TFS/TestManagement/RestClient");
import TestContracts = require("TFS/TestManagement/Contracts");
import WorkItemClient = require("TFS/WorkItemTracking/RestClient");
import TreeView = require("VSS/Controls/TreeView");
import Common = require("scripts/Common");
import Q = require("q");

export enum filterMode {
    Contains,
    NotContains
}

export interface ITestCaseFilter {
    setMode(mode: filterMode);
    initialize(value: any): IPromise<any>;
    filter(data: any[]): any[];
}

export class wiqlFilter implements ITestCaseFilter {
    private _listTC: any[]
    private _mode: filterMode;

    public initialize(wiql: string): IPromise<any> {

        var deferred = $.Deferred<ITestCaseFilter>();
        var workItemClient = WorkItemClient.getClient();

        wiql = wiql.replace("@project", "'" + VSS.getWebContext().project.name + "'");

        workItemClient.queryByWiql({ query: wiql }, VSS.getWebContext().project.name).then(result => {
            if (result.queryResultType == 1) {
                this._listTC = result.workItems.map(i => { return i.id });
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

    public filter(data: any[]): any[] {
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
        var que: IPromise<TestContracts.TestSuite[]>[] = [];

        this._listTC = [];
        var flt = this;

        data.forEach(item => {
            flt._listTC[item["System.Id"]] = data.indexOf(item);
            que.push(testClient.getSuitesByTestCaseId(item["System.Id"]));

        });

        Q.all(que).then(
            results => {
                results.forEach(suites => {
                    var id = data[results.indexOf(suites)]["System.Id"];
                    flt._listTC[id] = suites.length;
                });
                deferred.resolve(flt);
            },
            err=> {
                deferred.reject(err);
            }
        );

        return deferred.promise();
    }

    public setMode(mode: filterMode) {
        this._mode = mode;
    }

    public filter(data: any[]): any[] {
        var flt = this;
        return data.filter(function (i) {
            var cnt = flt._listTC[i["System.Id"]];
            return (flt._mode == filterMode.Contains) ?
                cnt > 1 :
                cnt == 0;
        });
    }
}



export function getTestResultsForTestCases(testCaseLst: number[]): IPromise<TestContracts.TestCaseResult[]> {
    // Get an instance of the client
    var deferred = $.Deferred<any[]>();
    var tstClient = TestClient.getClient();
    var q = { query: "Select * from TestResult  WHERE TestCaseId IN (" + testCaseLst.join(",") + ") ORDER BY CreationDate DESC" };

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

export function getTestCasesByProjectStructure(structureType: WorkItemContracts.TreeNodeStructureType, path: string, recursive: boolean, fieldLst:string[]): IPromise<any> {
    var typeField: string;
    switch (structureType) {
        case WorkItemContracts.TreeNodeStructureType.Area:
            typeField = "System.AreaPath";
            break;
        case WorkItemContracts.TreeNodeStructureType.Iteration:
            typeField = "System.IterationPath";
            break;
    }

    var wiqlWhere = "[" + typeField + "] " + (recursive ? "UNDER" : "=") + " '" + path + "'";
    return getTestCasesByWiql(fieldLst, wiqlWhere);
}

export function getTestCasesByPriority(priority: string, fieldLst: string[]): IPromise<any> {
    var wiqlWhere: string;
    if (priority != "any") {
        wiqlWhere = "[Microsoft.VSTS.Common.Priority] = " + priority
    }
    return getTestCasesByWiql(fieldLst, wiqlWhere);
}

export function getTestCasesByState(state: string,  fieldLst: string[]): IPromise<any> {
    var wiqlWhere: string;
    if (state != "any") {
        wiqlWhere = "[System.State] = '" + state + "'";
    }
    return getTestCasesByWiql(fieldLst, wiqlWhere);
}

function getRecursiveChildIds(id: number, lst: any[]): number[] {
    var ret: number[] = [];
    ret.push(id);
    lst.filter(i => { return i.parent != null && i.parent.id == id }).forEach(it => {
        ret = ret.concat(getRecursiveChildIds(it.id, lst));
    });
    return ret;
}

export function getTestCasesByTestPlan(planId: number, suiteId: number, fields: string[], recursive: boolean): IPromise<any> {
    var deferred = $.Deferred<any[]>();
    var testClient = TestClient.getClient();

    if (recursive) {
        var idList = [];
        var tcIdList = {};
        var suite_id: number = suiteId;

        testClient.getTestSuitesForPlan(VSS.getWebContext().project.name, planId, true).then(suites => {
            var que: IPromise<any[]>[] = [];
            var suitesList = suites;

            getRecursiveChildIds(suiteId, suites).forEach(s => {
                que.push(testClient.getTestCases(VSS.getWebContext().project.name, planId, s));
            });

            Q.all(que).then(
                results => {
                    for (var n = 0; n < results.length; n++) {
                        var r = results[n];

                        r.map(i => { return i.testCase.id; }).forEach(i => {

                            var x = tcIdList[i];
                            if (x == null) {
                                x = suitesList[n].name;
                            }
                            else if ($.isNumeric(x)) {
                                x++;
                            }
                            else {
                                x = 2;
                            }
                            tcIdList[i] = x;
                        });

                        idList = idList.concat(r.map(i => { return i.testCase.id; }));
                    }

                    if (idList.length > 0) {
                        getTestCases(idList, fields).then(
                            testCases => {
                                deferred.resolve(testCases.map(tc => {
                                    tc["TC::Present.In.Suite"] = tcIdList[tc["System.Id"]];
                                    return tc;
                                }));
                            },
                            err=> {
                                deferred.reject(err);
                            });
                    }
                    else {
                        deferred.resolve([]);
                    }
                },
                err=> {
                    deferred.reject(err);
                }

            );
        });
    }
    else {
        testClient.getTestCases(VSS.getWebContext().project.name, planId, suiteId).then(result => {
            var idList = result.map(function (item) {
                return item.testCase.id;
            }).map(Number);

            if (idList.length > 0) {
                getTestCases(idList, fields).then(testCases => {
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

function getTestCases(workItemIds: number[], fields:string[]): IPromise<any> {
    var deferred = $.Deferred<any[]>();
    var workItemClient = WorkItemClient.getClient();

    var size = 200;

    var fieldsToFetch = fields.filter(f => { return f.indexOf("TC::") == -1 });

    var promises: IPromise<WorkItemContracts.WorkItem[]>[] = [];
    while (workItemIds.length > 0) {
        var idsToFetch = workItemIds.splice(0, size);
        promises.push(workItemClient.getWorkItems(idsToFetch, fieldsToFetch));
    }
    
    Q.all(promises).then(
        resultSets => {
            var data = []
            resultSets.forEach(result=> {
                data = data.concat(result.map(function (i) { i.fields["System.Id"] = i.id; fixAssignedToFields(i); return i.fields; }));
            });
            deferred.resolve(data);
        },
        err=> {
            deferred.reject(err);
        }
    );

    return deferred.promise();
}

function fixAssignedToFields(wi: WorkItemContracts.WorkItem) {
    if (wi.fields["System.AssignedTo"] != null) {
        var s = wi.fields["System.AssignedTo"];
        if (s.indexOf("<") > 0) {
            wi.fields["System.AssignedTo"] = s.split("<")[0];
        }
    }
}

function getTestCasesByWiql(fields: string[], wiqlWhere: string): IPromise<any> {
    var deferred = $.Deferred<any[]>();
    var workItemClient = WorkItemClient.getClient();

    var wiql: string = "SELECT System.Id ";
    //fields.forEach(function (f) {
    //    wiql += f + ", ";
    //});
    //wiql = wiql.substr(0, wiql.lastIndexOf(", "));
    wiql += " FROM WorkItems WHERE [System.TeamProject] = '" + VSS.getWebContext().project.name + "' AND [System.WorkItemType] IN GROUP '" + Common.WIQLConstants.getWiqlConstants().TestCaseCategoryName + "'  " + (wiqlWhere ? " AND " + wiqlWhere : "") + " ORDER BY [System.Id]";

    workItemClient.queryByWiql({ query: wiql }, VSS.getWebContext().project.name).then(
        result => {
            if (result.workItems.length > 0) {
                var ids = result.workItems.map(function (item) {
                    return item.id;
                }).map(Number);

                getTestCases(ids, fields).then(
                    testCases => {
                        deferred.resolve(testCases);
                    },
                    err=>  {
                        deferred.reject(err);
                    });
            }
            else {
                deferred.resolve([]);
            }
        },
        err => {
            deferred.reject(err);
        });

    return deferred.promise();
}
