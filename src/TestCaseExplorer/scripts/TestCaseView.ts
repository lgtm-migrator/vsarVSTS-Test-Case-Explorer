//---------------------------------------------------------------------
// <copyright file="TestCaseView.ts">
//    This code is licensed under the MIT License.
//    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF 
//    ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED 
//    TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A 
//    PARTICULAR PURPOSE AND NONINFRINGEMENT.
// </copyright>
// <summary>
//    This is part of the Test Case Explorer extensions
//    from the ALM Rangers. This file contains the view logic
//    for the test case view.
// </summary>
//---------------------------------------------------------------------

/// <reference path='../typings/tsd.d.ts' />

import Controls = require("VSS/Controls");
import Grids = require("VSS/Controls/Grids");
import Menus = require("VSS/Controls/Menus");
import Dialogs = require("VSS/Controls/Dialogs");
import WorkItemContracts = require("TFS/WorkItemTracking/Contracts");
import WorkItemClient = require("TFS/WorkItemTracking/RestClient");
import TestClient = require("TFS/TestManagement/RestClient");
import TestContracts = require("TFS/TestManagement/Contracts");
import DetailsToggle = require("scripts/DetailsToggle");
import Navigation = require("VSS/Controls/Navigation");
import StatusIndicator = require("VSS/Controls/StatusIndicator");
import CoreUtils = require("VSS/Utils/Core");
import CtrlCombos = require("VSS/Controls/Combos");
import WorkItemServices = require("TFS/WorkItemTracking/Services");
import Notifications = require("VSS/Controls/Notifications");


import TestCaseDataService = require("scripts/TestCaseDataService");
import Common = require("scripts/Common");
import ColumnOptionsView = require("scripts/ColumnsOptionsView");
import TreeViewDataService = require("scripts/TreeViewDataService");
import LeftTreeView = require("scripts/TreeViewView");

import TelemetryClient = require("scripts/TelemetryClient");

export interface TestCaseViewSelectedCallback { (value: string): void }

var const_Pivot_TestPlan = "Test plan";
var const_Pivot_Priority = "Priority";


var msgOptions: Notifications.IMessageAreaControlOptions = {
    type: Notifications.MessageAreaType.Info,
    closeable: false,
    expanded: false,
    showIcon: true
};

export class TestCaseView {

    private _paneToggler: DetailsToggle.DetailsPaneToggler;
    private _grid: Grids.Grid;
    private _menubar: Menus.MenuBar;
    private _fields: Common.ICustomColumnDef[];
    private _showTestResults: boolean = false;


    private _commonField: Common.ICustomColumnDef[] = [
        { field: "System.Id", name: "Id", width: 75 },
        { field: "System.Title", name: "Title", width: 250 },
        { field: "System.State", name: "State", width: 75 },
        { field: "System.AssignedTo", name: "Assigned to", width: 150 },
        { field: "Microsoft.VSTS.Common.Priority", name: "Priority", width: 50 },
        { field: "Microsoft.VSTS.TCM.AutomationStatus", name: "Automation Status", width: 100 }
    ];

    private _data: any[];
    private _waitControl: StatusIndicator.WaitControl;

    private _currentFilter: TestCaseDataService.ITestCaseFilter = null;
    private _orphanTestCaseFilter: TestCaseDataService.wiqlFilter = null;
    private _testSuiteFilter: TestCaseDataService.testSuiteFilter = null;

    private _selectedPivot;
    private _selectedValue;
    private _showRecursive;
    private _selectedValueWithField;
    private _selectedRows: number[];
    private _leftTreeView: LeftTreeView.TreeviewView;

    private _interval: number;
    private _message: Notifications.MessageAreaControl;

    public RefreshGrid(pivot: string, value, showRecursive: boolean) {

        var view = this;

        this._grid.setDataSource(null);
        $("#grid-title").text("");
        this.StartLoading(true, "Fetching data");
        var promise: IPromise<any>;
        var title: string;
        var fields: Common.ICustomColumnDef[];

        this._selectedPivot = pivot;
        this._selectedValue = value;
        this._showRecursive = showRecursive;
        this._selectedValueWithField = null;

        var fieldLst:string[] = this._fields.map(f=> { return f.field });

        switch (pivot) {
            case "Area path":
                if (fieldLst.indexOf("System.AreaPath") == -1) {
                    fieldLst.push("System.AreaPath");
                }
                promise = TestCaseDataService.getTestCasesByProjectStructure(WorkItemContracts.TreeNodeStructureType.Area, value.path, showRecursive, fieldLst);
                title = "Test cases with area path: " + value.path;
                this._selectedValueWithField = { "System.AreaPath": value.path };
                fields =  Common.MergeColumnLists(this._fields, [{ field: "System.AreaPath", name: "Area Path", width: 200 }]);
                break;
            case "Iteration path":
                if (fieldLst.indexOf("System.IterationPath") == -1) {
                    fieldLst.push("System.IterationPath");
                }
                promise = TestCaseDataService.getTestCasesByProjectStructure(WorkItemContracts.TreeNodeStructureType.Iteration, value.path, showRecursive, fieldLst);
                title = "Test cases with iteration path: " + value.path;
                this._selectedValueWithField = { "System.IterationPath": value.path };
                fields = Common.MergeColumnLists( this._fields, [{ field: "System.IterationPath", name: "Iteration Path", width: 200 }]);
                break;
            case const_Pivot_Priority:
                if (fieldLst.indexOf("Microsoft.VSTS.Common.Priority") == -1) {
                    fieldLst.push("Microsoft.VSTS.Common.Priority");
                }
                var priority: string = "any";
                if (value.name != const_Pivot_Priority) {
                    priority = value.name;
                    this._selectedValueWithField = { const_Pivot_Priority: value.name };
                }
                promise = TestCaseDataService.getTestCasesByPriority(priority, fieldLst);
                title = "Test cases with priority: " + priority;
                fields = Common.MergeColumnLists(this._fields, [{ field: "Microsoft.VSTS.Common.Priority", name: const_Pivot_Priority, width: 200 }]);
                break;
            case "State":
                if (fieldLst.indexOf("System.State") == -1) {
                    fieldLst.push("System.State");
                }
                var state: string = "any";
                if (value.name != "States") {
                    state = value.name;
                }
                promise = TestCaseDataService.getTestCasesByState(state, fieldLst)
                title = "Test cases with state: " + state;
                fields = Common.MergeColumnLists(this._fields, [{ field: "System.State", name: "State", width: 200 }]);
                break;
            case const_Pivot_TestPlan:
                promise = TestCaseDataService.getTestCasesByTestPlan(value.testPlanId, value.suiteId, fieldLst , showRecursive);
                fields =  Common.MergeColumnLists(this._fields, [{ field: "TC::Present.In.Suite", name: "Present in suites", width: 150 }]);
                title = "Test suite: " + value.name + " (Suite Id: " + value.suiteId + ")";
                break;
        }
        $("#grid-title").text(title);

        promise.then(
            result => {
                view._data = result;

                if (view._showTestResults) {
                    var outcomeFields = [
                        { field: "Outcome", name: "Last Outcome", width: 100, getCellContents: Common.getTestResultCellContent },
                        { field: "TestedDate", name: "Last tested date", width: 150 }];

                    fields = Common.MergeColumnLists(view._fields, outcomeFields);

                    TestCaseDataService.getTestResultsForTestCases(view._data.map(i=> { return i["System.Id"]; })).then(
                        data=> {
                            data.forEach(r => {
                                var testCaseId = r.testCase.id;
                                var row = view._data.filter(i=> { return i["System.Id"] == testCaseId; })[0];
                                row["Outcome"] = r.outcome;
                                row["TestedDate"] = r.lastUpdatedDate;
                                row["TestedBy"] = r.runBy.displayName;
                                row["TestDuration"] = r.durationInMs;
                            });
                            view.DoRefreshGrid(fields);
                        },
                        err=> {
                        });
                }
                    view.DoRefreshGrid(fields);

                view.DoneLoading();
            },
            err=> {
                TelemetryClient.TelemetryClient.getClient().trackException(err);
                console.log(err);
                view.DoneLoading();
            }
        );
    }

    public toggle() {
    }

    public initialize(paneToggler: DetailsToggle.DetailsPaneToggler, selectCallBack: TestCaseViewSelectedCallback, leftTreeView: LeftTreeView.TreeviewView) {
        var view = this;
        this._leftTreeView = leftTreeView;

        TelemetryClient.TelemetryClient.getClient().trackPageView("TestCaseView");

        this._message = Controls.create<Notifications.MessageAreaControl, Notifications.IMessageAreaControlOptions>(Notifications.MessageAreaControl, $("#message-container"), msgOptions);

        this._paneToggler = paneToggler;
        this._fields = this._commonField;
        this.loadColumnsSettings().then(
            userColumns=> {
                view._fields = userColumns;
            });
        this.initMenu(this, paneToggler);
        this.initFilter(this);
        this.initGrid(this, selectCallBack);
    }

    private initMenu(view: TestCaseView, paneToggler: DetailsToggle.DetailsPaneToggler) {
        var menuItems: any[] = [
            { id: "new-testcase", text: "New", title: "Create test case", icon: Common.getToolbarIcon("new-testcase") },
            { id: "open-testcase", showText: false, title: "Open test case", icon: Common.getToolbarIcon("open-testcase"), cssClass: Common.getToolbarCss() },
            { id: "remove-testcase", showText: false, title: "Remove test case from this suite", icon: Common.getToolbarIcon("remove-testcase"), cssClass: Common.getToolbarCss() },
            { id: "refresh", showText: false, title: "Refresh grid", icon: Common.getToolbarIcon("refresh"), cssClass: Common.getToolbarCss() },
            { separator: true },
            { id: "column-options", text: "Column options", title: "Choose columns for the grid", noIcon: true },
            //{ id: "latestTestResult", text: "Show TestResults", title: "Show latest test results", icon: "test-outcome-node-icon" },
            { id: "toggle", showText: false, title: "Show/hide details pane", icon: Common.getToolbarIcon("toggle"), cssClass: Common.getToolbarCss() + " right-align" }
        ];

        var menubarOptions = {
            items: menuItems,
            executeAction: function (args) {
                var command = args.get_commandName();
                switch (command) {

                    case "toggle":
                        paneToggler.toggleDetailsPane()
                        menubar.updateCommandStates([{ id: command, toggled: view._paneToggler._isTestCaseDetailsPaneOn() }]);
                        break;
                    case "new-testcase":
                        WorkItemServices.WorkItemFormNavigationService.getService().then(workItemService => {
                            workItemService.openNewWorkItem(Common.WIQLConstants.getWiqlConstants().TestCaseTypeName, view._selectedValueWithField);
                        });
                        break;
                    case "open-testcase":
                        WorkItemServices.WorkItemFormNavigationService.getService().then(workItemService => {
                            var item = view._grid.getRowData(view._grid.getSelectedDataIndex());
                            workItemService.openWorkItem(item["System.Id"]);
                        });
                        break;
                    case "remove-testcase":
                        view.removeTestCase();
                        break;
                    case "latestTestResult":
                        view._showTestResults = !view._showTestResults ;
                        view.RefreshGrid(view._selectedPivot, view._selectedValue, view._showRecursive);
                        menubar.updateCommandStates([{ id: command, toggled: view._showTestResults }]);
                        break;
                    case "column-options":
                        view.openColumnOptionsDlg();
                        break;
                    case "refresh":
                        view.RefreshGrid(view._selectedPivot, view._selectedValue, view._showRecursive);
                        break;
                    default:
                        alert("Unhandled action: " + command);
                        break;
                }
            }
        };

        var menubar = Controls.create<Menus.MenuBar, any>(Menus.MenuBar, $("#menu-container"), menubarOptions);
        this._menubar = menubar;
        menubar.updateCommandStates([{ id: "toggle", toggled: view._paneToggler._isTestCaseDetailsPaneOn() }]);
    }

    public RefreshTestCaseView() {
        this.RefreshGrid(this._selectedPivot, this._selectedValue, this._showRecursive);
    }

    private removeTestCase() {
        var that = this;
        if (confirm("Are you sure you want to remove the selected test cases from the suite?")) {
            var testCaseIds = this._selectedRows.map(i => { return i["System.Id"]; }).join(",");
            TreeViewDataService.removeTestCaseFromSuite(this._selectedValue.testPlanId, this._selectedValue.suiteId, testCaseIds).then(result => {
                that.RefreshGrid(this._selectedPivot, this._selectedValue, this._showRecursive);
                that._leftTreeView.refreshTreeView(true);
            });
        }
    }

    private openColumnOptionsDlg() {
        var view = this;
        var extensionContext = VSS.getExtensionContext();

        var dlgContent = $("#columnOptionsDlg").clone();
        dlgContent.show();
        dlgContent.find("#columnOptionsDlg").show();
      
        var coView: ColumnOptionsView.ColumnOptionsView = new ColumnOptionsView.ColumnOptionsView();
          
        view._grid._columns.forEach(c => {
            var f = view._fields.filter(f => { return f.field === c.index })[0];
            if (f) {
                f.width = c.width;
            }
        });

        var fieldsToManage = this._fields.filter(f => { return f.field.indexOf("TC::") == -1 });
        coView.Init(dlgContent, fieldsToManage );

        var options: Dialogs.IModalDialogOptions = {
            width: 800,
            height:500,
            title: "Column Options",
            content: dlgContent,
            okCallback: (result: any) => {
                view._fields = coView.GetSelectedColumns();
                view.RefreshGrid(view._selectedPivot, view._selectedValue, view._showRecursive);
                view.saveColumnsSettings()
            }
        };

        var dialog = Dialogs.show(Dialogs.ModalDialog, options);
        dialog.updateOkButton(true);
        dialog.setDialogResult(true);
    }

    private saveColumnsSettings() {
        var view = this;
        VSS.getService<IExtensionDataService>(VSS.ServiceIds.ExtensionData).then(
            dataService => {
                // Set value in user scope
                dataService.setValue("SelectedColumns_" + VSS.getWebContext().project.id, JSON.stringify(view._fields), { scopeType: "User" });
            }
        );
    }

    private loadColumnsSettings(): IPromise<Common.ICustomColumnDef[]> {
        var view = this;
        var deferred = $.Deferred<Common.ICustomColumnDef[]>();
        VSS.getService<IExtensionDataService>(VSS.ServiceIds.ExtensionData).then(
            dataService => {
                // Set value in user scope
                dataService.getValue("SelectedColumns_" + VSS.getWebContext().project.id, { scopeType: "User" }).then(
                    data=> {
                        if (data != undefined) {
                            deferred.resolve(JSON.parse(<string>data));
                        }
                        else {
                            view.localizeCommonFields().then(
                                cmflds => {
                                    view._commonField = view._commonField;
                                    deferred.resolve(view._commonField);
                                },
                                err => {
                                    deferred.resolve(view._commonField);
                                });
                        }
                    },
                    err => {
                        view.localizeCommonFields().then(
                            cmflds => {
                                view._commonField = view._commonField;
                                deferred.resolve(view._commonField);
                            },
                            err => {
                                deferred.resolve(view._commonField);
                            });
                        
                    });
            });

        return deferred.promise();
    }

    private localizeCommonFields(): IPromise<Common.ICustomColumnDef[]> {
        var view = this;
        var deferred = $.Deferred<Common.ICustomColumnDef[]>();
        var witClient: WorkItemClient.WorkItemTrackingHttpClient2_2 = WorkItemClient.getClient();
        var ctx = VSS.getWebContext();
        witClient.getWorkItemType(ctx.project.id, Common.WIQLConstants.getWiqlConstants().TestCaseTypeName).then(
            wit => {
                view._commonField.forEach(f => {
                    f.name = wit["fieldInstances"].filter(i => { return i.field.referenceName === f.field })[0].field.name;
                })
                deferred.resolve(view._commonField);
            },
            err => {
                deferred.resolve(view._commonField);
            }
        );
        return deferred.promise();
    }

    private initFilter(view: TestCaseView) {
        TelemetryClient.TelemetryClient.getClient().trackPageView("Details.PartOfTestSuit");

        var self = this;

        Controls.create(Navigation.PivotFilter, $("#testCaseView-filter-container"), {
            behavior: "dropdown",
            text: "Filter",
            items: [
                { id: "All", text: "All", selected: true },
                { id: "TC_WithOUT_Requirement", text: "Tests not associated with any requirements" },
                { id: "TC_With_Requirement", text: "Tests with requirements linking" },
                { id: "TC_OrphanedSuites", text: "Tests not present in any suites (orphaned)" },
                { id: "TC_MultipleSuites", text: "Tests present in multiple suites" }
            ],
            change: function (item) {
                var command = item.id;

                var filterPromise: IPromise<TestCaseDataService.ITestCaseFilter>;
                var filterMode: TestCaseDataService.filterMode;
                var filterData: any;
                self.StartLoading(true, "Applying filters");
                switch (command) {
                    case "TC_WithOUT_Requirement":
                        filterPromise = view.getOrphanTestCaseFilter(TestCaseDataService.filterMode.Contains)
                        break;
                    case "TC_With_Requirement":
                        filterPromise = view.getOrphanTestCaseFilter(TestCaseDataService.filterMode.NotContains)
                        break;
                    case "TC_MultipleSuites":
                        filterPromise = view.getTestSuiteFilter(TestCaseDataService.filterMode.Contains)
                        break;
                    case "TC_OrphanedSuites":
                        filterPromise = view.getTestSuiteFilter(TestCaseDataService.filterMode.NotContains)
                        break;
                    default:
                        var deferred = $.Deferred<TestCaseDataService.ITestCaseFilter>();
                        deferred.resolve(null);
                        filterPromise = deferred.promise();
                        break;
                };

                filterPromise.then(
                    filter => {
                        view._currentFilter = filter;
                        view.DoRefreshGrid(view._fields);
                        self.DoneLoading();
                    },
                    err=> {
                        self.DoneLoading();
                        TelemetryClient.TelemetryClient.getClient().trackException(err);
                        console.log(err);
                    }
                );
            }
        });
    }
   
    private initGrid(view: TestCaseView, selectCallBack: TestCaseViewSelectedCallback) {
        var that = this;
        var options: Grids.IGridOptions = {
            height: "100%",
            width: "100%",
            columns: that._fields.map(function (f) {
                return { index: f.field, text: f.name, width: f.width };
            }),
            draggable: {
                scope: "test-case-scope",
                axis: "",
                containment: "",
                appendTo: document.body,
                //revert: "invalid",
                refreshPositions: true,
                scroll: false,
                distance: 10,
                cursorAt: { top: -5, left: -5 },
                helper: function (event, ui) { return that._draggableHelper(that, event, ui); },
                /*helper: function (event, ui) {
                    var $dragTile;
                    var draggableItemText, numOfSelectedItems;
                    var selectedWorkItemIds = view._selectedRows;

                    numOfSelectedItems = selectedWorkItemIds.length;
                    $dragTile = $("<div />")
                        .addClass("drag-tile")

                    var $dragItemCount = $("<div />")
                        .addClass("drag-tile-item-count")
                        .text(numOfSelectedItems);
                    var $dragType = $("<span />")
                        .addClass("drag-tile-drag-type")
                        .text(view._selectedPivot == const_Pivot_TestPlan ? "Move" : "Attach");

                    var $dragHead = $("<div />")
                        .addClass("drag-tile-head")
                        .append($dragType)
                        .append($dragItemCount);

                    $dragTile.append($dragHead);

                    $dragTile.data("WORK_ITEM_IDS", selectedWorkItemIds.map(i => { return i["System.Id"]; }));
                    $dragTile.data("MODE", "TEST_CASE");

                    return $dragTile;
                }*/
            },
            
            openRowDetail: (index: number) => {
                that._openRowDetails(that, index, selectCallBack);
                //var item = this._grid.getRowData(index);
                //selectCallBack(item["System.Id"]);
                //WorkItemServices.WorkItemFormNavigationService.getService().then(workItemService => {
                //    workItemService.openWorkItem(item["System.Id"]);
                //});
            }

        };

        // Create the grid in a container element
        this._grid = Controls.create<Grids.Grid, Grids.IGridOptions>(Grids.Grid, $("#grid-container"), options);

        $("#grid-container").bind(Grids.GridO.EVENT_SELECTED_INDEX_CHANGED, function (eventData) {
            var item = view._grid.getRowData(view._grid.getSelectedDataIndex());
            view._selectedRows = getSelectedWorkItemIds(view._grid);

            var id = null;
            if ((view._selectedRows.length == 1) && item != null) {
                id = item["System.Id"];
            }

            view._menubar.updateCommandStates([{ id: "open-testcase", disabled: (view._selectedRows.length != 1) }]);
            if (that._selectedPivot != const_Pivot_TestPlan) {
                view._menubar.updateCommandStates([{ id: "remove-testcase", hidden: true }]);
            }
            else {
                view._menubar.updateCommandStates([{ id: "remove-testcase", disabled: (view._selectedRows.length == 0) }]);
            }
            selectCallBack(id);
        });
    }

    private _draggableHelper(that: TestCaseView, event, ui) {
       
        var draggableItemText, numOfSelectedItems;
        var selectedWorkItemIds = that._selectedRows;

        numOfSelectedItems = selectedWorkItemIds.length;


        var $dragItemCount = $("<div />")
            .addClass("drag-tile-item-count")
            .text(numOfSelectedItems);
        

        var $dragItemTitle = $("<div style='display:table'/>").addClass("node-content");

        
        selectedWorkItemIds.forEach(i => {
            var $tr= $("<div style='display:table-row' />")

            $tr.append($("<div class='grid-cell' style='display:table-cell' />").text(i["System.Id"]));
            $tr.append($("<div class='grid-cell' style='display:table-cell' />").text(i["System.Title"]));

            $dragItemTitle.append($tr);
        });
        
  
        var $dragTile = Common.createDragTile(that._selectedPivot == const_Pivot_TestPlan ? "Move" : "Assign", $dragItemTitle);



        $dragTile.data("WORK_ITEM_IDS", selectedWorkItemIds.map(i => { return i["System.Id"]; }));
        $dragTile.data("MODE", "TEST_CASE");

        return $dragTile;
    }

    private _openRowDetails(that: TestCaseView, index: number, selectCallBack: TestCaseViewSelectedCallback) {
        var item = that._grid.getRowData(index);
        selectCallBack(item["System.Id"]);
        WorkItemServices.WorkItemFormNavigationService.getService().then(workItemService => {
            workItemService.openWorkItem(item["System.Id"]);
        });
    }

    public updateTogle(paneToggler) {
        var menubar = <Menus.MenuBar>Controls.Enhancement.getInstance(Menus.MenuBar, $("#menu-container"));
        this._menubar.updateCommandStates([{ id: "toggle", toggled: paneToggler._isTestCaseDetailsPaneOn() }]);
    }

    private getOrphanTestCaseFilter(mode: TestCaseDataService.filterMode): IPromise<TestCaseDataService.ITestCaseFilter> {
        if (this._orphanTestCaseFilter == null) {
            this._orphanTestCaseFilter = new TestCaseDataService.wiqlFilter();
            this._orphanTestCaseFilter.setMode(mode);
            return this._orphanTestCaseFilter.initialize(wiqlOrphanedTC);
        }
        else {
            var deferred = $.Deferred<TestCaseDataService.ITestCaseFilter>();
            this._orphanTestCaseFilter.setMode(mode);
            deferred.resolve(this._orphanTestCaseFilter);
            return deferred.promise();
        }
    }

    private getTestSuiteFilter(mode: TestCaseDataService.filterMode): IPromise<TestCaseDataService.ITestCaseFilter> {
        if (this._testSuiteFilter == null) {
            this._testSuiteFilter = new TestCaseDataService.testSuiteFilter();
            this._testSuiteFilter.setMode(mode);
            return this._testSuiteFilter.initialize(this._data);
        }
        else {
            var deferred = $.Deferred<TestCaseDataService.ITestCaseFilter>();
            this._testSuiteFilter.setMode(mode);
            deferred.resolve(this._testSuiteFilter);
            return deferred.promise();
        }
    }

    private DoRefreshGrid(fields) {

        var columns = fields.map(function (f) {
            return { index: f.field, text: f.name, width: f.width, getCellContents: f.getCellContents};
        });

        if (this._currentFilter != null) {
            this._grid.setDataSource(this._currentFilter.filter(this._data), null, columns);
        }
        else {
            this._grid.setDataSource(this._data, null, columns);
        }

        if (this._data.length > 0) {
            this._grid.setSelectedRowIndex(0);
        }

        $("#grid-count").text("Showing " + this._grid._count + " of " + this._data.length + (this._data.length == 1 ? " test case" : " test cases"));
    }

    public StartLoading(longRunning, message) {
        $("body").css("cursor", "progress");

        if (longRunning) {
            var waitControlOptions: StatusIndicator.IWaitControlOptions = {
                target: $(".wait-control-target"),
                message: message,
                cancellable: false,
                cancelTextFormat: "{0} to cancel",
                cancelCallback: function () {
                    console.log("cancelled");
                }
            }
            this._waitControl = Controls.create(StatusIndicator.WaitControl, $(".left-hub-content"), waitControlOptions);
            this._waitControl.startWait();
        }
    }

    public DoneLoading() {
        $("body").css("cursor", "default");

        if (this._waitControl != null) {
            this._waitControl.cancelWait();
            this._waitControl.endWait();
            this._waitControl = null;
        }
    }

    public ShowCloningMessage(opId:number):IPromise<any> {
        var deferred = $.Deferred<any>();

        var self = this;
        var s = "Cloning in progress"
        self.ShowMsg(s);
        self._interval = setInterval(
            () => {
                s = s + "...";
                self.ShowMsg(s);
                console.log(s);
                console.log("Checking clone status");
                self.checkCloneStatus( opId, s);
            },
            3000);
        return deferred.promise();
    }

    private checkCloneStatus( opId, s) {
        var self = this;
        var deferred = $.Deferred<any>();

        self.ShowMsg(s);

        TreeViewDataService.querryCloneOperationStatus(opId).then(cloneStat => {
            switch (cloneStat.state) {
                case TestContracts.CloneOperationState.Failed:
                    self.ShowErr(cloneStat.message);
                    deferred.reject(cloneStat)
                    break;
                case TestContracts.CloneOperationState.Succeeded:
                    self.ShowMsg("Cloning completed")
                    self.ShowDone();
                    clearInterval(self._interval);
                    deferred.resolve(cloneStat);
                    break;
                default:
                    console.log("   checking status of clone operation = " + cloneStat.state);

            }
        });
        return deferred.promise();

    }

    public ShowMsg(msg: string) {
        $("#message-container").show();
        this._message.clear();
        this._message.initializeOptions(msgOptions);
        this._message.setMessage(msg, Notifications.MessageAreaType.Info);
    }
    public ShowDone() {
        var view = this;
        setTimeout(() => { view.HideMsg(); }, 3000);
    }
    public ShowErr(msg) {
        var view = this;
        this._message.setError(msg);
    }


    public HideMsg() {
        $("#message-container").hide();
        this._message.clear();
    }
}

function getSelectedWorkItemIds(grid: Grids.Grid): any[] {
    var i, len, ids = [], indices = grid.getSelectedDataIndices();
    for (i = 0, len = indices.length; i < len; i++) {
        ids.push(grid._dataSource[indices[i]]);
    }
    return ids;
};
var wiqlOrphanedTC: string = "SELECT [Source].[System.Id] FROM WorkItemLinks WHERE ([Source].[System.TeamProject] = @project AND  [Source].[System.WorkItemType] IN GROUP '" + Common.WIQLConstants.getWiqlConstants().TestCaseCategoryName + "') And ([System.Links.LinkType] <> '') And ([Target].[System.WorkItemType] IN GROUP '" + Common.WIQLConstants.getWiqlConstants().RequirementsCategoryName+ "') ORDER BY [Source].[System.Id] mode(DoesNotContain)"
