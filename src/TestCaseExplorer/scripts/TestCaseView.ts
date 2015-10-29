﻿//---------------------------------------------------------------------
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

/// <reference path='ref/jquery.d.ts' />
/// <reference path='ref/VSS.d.ts' />

import Controls = require("VSS/Controls");
import Grids = require("VSS/Controls/Grids");
import Menus = require("VSS/Controls/Menus");
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
import TestCaseDataService = require("scripts/TestCaseDataService");

export interface TestCaseViewSelectedCallback { (value: string): void }

export class TestCaseView {

    private _paneToggler: DetailsToggle.DetailsPaneToggler;
    private _grid: Grids.Grid;
    private _menubar: Menus.MenuBar;
    private _fields: string[];
    private _data: any[];     
    private _waitControl: StatusIndicator.WaitControl;
   
    private _currentFilter: TestCaseDataService.ITestCaseFilter = null;
    private _orphanTestCaseFilter: TestCaseDataService.wiqlFilter = null;
    private _testSuiteFilter: TestCaseDataService.testSuiteFilter = null;

    private _selectedPivot;
    private _selectedValue;
    private _showRecursive;
    private _selectedValueWithField;
    private _selectedRows:number[];

    public RefreshGrid(pivot: string, value, showRecursive:boolean) {

        this._grid.setDataSource(null);
        $("#grid-title").text("");
        this.StartLoading(true, "Fetching data");
        var promise: IPromise<any>;
        var title: string;

        this._selectedPivot = pivot;
        this._selectedValue = value;
        this._showRecursive = showRecursive;
        this._selectedValueWithField = null;

        switch (pivot) {
            case "Area path":
                promise = TestCaseDataService.getTestCasesByProjectStructure(WorkItemContracts.TreeNodeStructureType.Area, value.path, showRecursive);
                title = "Test cases with area path: " + value.path;
                this._selectedValueWithField = { "System.AreaPath": value.path };
                break;
            case "Iteration path":
                promise = TestCaseDataService.getTestCasesByProjectStructure(WorkItemContracts.TreeNodeStructureType.Iteration, value.path, showRecursive);
                title = "Test cases with iteration path: " + value.path;
                this._selectedValueWithField = { "System.IterationPath": value.path };
                break;
            case "Priority":
                var priority: string = "any"; 
                if (value.name != "Priority") {
                    priority = value.name;
                    this._selectedValueWithField = { "Priority": value.name };
                }
                promise = TestCaseDataService.getTestCasesByPriority(priority);
                title = "Test cases with priority: " + priority;
                break;
            case "State":
                var state: string = "any";
                if (value.name != "States") {
                    state = value.name;
                }
                promise = TestCaseDataService.getTestCasesByState(state)
                title = "Test cases with state: " + state;
                break;
            case "Test plan":
                promise = TestCaseDataService.getTestCasesByTestPlan(value.testPlanId, value.suiteId,  showRecursive);
                title = "Test suite: " + value.name + " (Suite Id: " + value.suiteId + ")";
                break;
        }
        $("#grid-title").text(title);

        promise.then(result => {
            this._data = result;
            this.DoRefreshGrid();
            
            this.DoneLoading();
        });

    }

    public toggle() {
    }

    public initialize(paneToggler: DetailsToggle.DetailsPaneToggler, selectCallBack: TestCaseViewSelectedCallback) {
        
        this._paneToggler = paneToggler;
        
        this._fields = ["System.Id", "System.Title", "System.State", "System.AssignedTo", "Microsoft.VSTS.Common.Priority", "Microsoft.VSTS.TCM.AutomationStatus"];
        this.initMenu(this, paneToggler);
        this.initFilter(this);
        this.initGrid(this, selectCallBack);
        
    }

    private initMenu(view: TestCaseView, paneToggler: DetailsToggle.DetailsPaneToggler) {
        //var menuItems: Menus.IMenuItemSpec[] = [
        var menuItems: any[] = [
            { id: "new-testcase", text: "New", title: "Create test case", icon: "icon-add-small" },
            { id: "refresh", showText: false, title: "Refresh grid", icon: "icon-refresh" },
            //{ id: "column_options", text: "Column Options", noIcon: true },
            { id: "toggle", showText: false, title: "Show/hide details pane", icon: "icon-tfs-tcm-associated-pane-toggle", cssClass: "right-align" }
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
                            workItemService.openNewWorkItem("Test Case", view._selectedValueWithField);
                        });
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

    private initFilter(view: TestCaseView) {

        Controls.create(Navigation.PivotFilter, $("#grid-filter-cbo"), {
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

                filterPromise.then(filter=> {
                    view._currentFilter = filter;
                    view.DoRefreshGrid();
                });
            }
        });
    }

    private dragableStart(event, ui) {
    //    this._clearRowMouseDownEventInfo();
    };

    private helperMultiSelectDrag(event, ui)
    {
        var $dragTile ;
        var draggableItemText, numOfSelectedItems;
        var selectedWorkItemIds = this._selectedRows;

        
        var grd = this;

     
        

        numOfSelectedItems = selectedWorkItemIds.length;
        $dragTile = $("<div />")
            .addClass("drag-tile")
            
       

        if (numOfSelectedItems === 1) {
            
            $dragTile.text("") //this.getColumnValue(dataIndex, this._getTitleColumnIndex()) || "");
        }
        else {

  
            var $dragItemCount = $("<div />")
                .addClass("drag-tile-item-count")
                .text(numOfSelectedItems);
            var $dragItemType = $("<span />")
                .addClass("drag-tile-item-type")
                .text(draggableItemText);
            $dragTile.append($dragItemCount).append($dragItemType);
        }

        $dragTile.data("WORK_ITEM_IDS", selectedWorkItemIds);
        $dragTile.data("MODE", event.ctrlKey==true?"Clone":"Attatch");
        $dragTile.text(event.ctrlKey == true ? "Clone" : "Attatch" + " " + selectedWorkItemIds.join("; "));

        return $dragTile;
    }
        

    private initGrid(view:TestCaseView, selectCallBack: TestCaseViewSelectedCallback) {
        var options: Grids.IGridOptions = {
            height: "1000px", // Explicit height is required for a Grid control
            columns: this._fields.map(function (f) {
                return { text: f.substring(f.lastIndexOf(".") + 1), index: f };
            }),            
            draggable: {
                scope: "test-case-scope",
                axis: "",
                containment: "",
                appendTo: document.body,
                revert: "invalid",
                refreshPositions: true,
                scroll: false,
                distance: 10,
                zIndex: 1000,
                cursor: "move",
                cursorAt: { top: -5, left: -5 },

                helper: function (event, ui) {
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
                        .text(event.ctrlKey == true ? "Clone" : "Attatch");

                    var $dragHead = $("<div />")
                        .addClass("drag-tile-head")
                        .append($dragType)
                        .append($dragItemCount);
             


                    $dragTile.append($dragHead);

                    $dragTile.data("WORK_ITEM_IDS", selectedWorkItemIds.map(i=> { return i["System.Id"]; }));
                    $dragTile.data("MODE", event.ctrlKey == true ? "Clone" : "Attatch");

                    var $dragLst = $("<div />")
                        .addClass("drag-tile-list")

                    selectedWorkItemIds.forEach(r=> {
                        var id = r["System.Id"];
                        $dragLst.append(
                            $("<div />")
                                .addClass(id.toString() )
                                .text(id+ " " + r["System.Title"]) 
                        );
                    });
                    $dragTile.append($dragLst);

                    return $dragTile;
                }
            },
            openRowDetail: (index: number) => {
                // Double clicking row or hitting enter key when the row is selected
                // will cause this function to be executed
                var item = this._grid.getRowData(index);
                selectCallBack(item["System.Id"]);
                WorkItemServices.WorkItemFormNavigationService.getService().then(workItemService => {
                    workItemService.openWorkItem(item["System.Id"]);
                });
            }

        };

        // Create the grid in a container element
        this._grid = Controls.create<Grids.Grid, Grids.IGridOptions>(Grids.Grid, $("#grid-container"), options );


        $("#grid-container").bind(Grids.GridO.EVENT_SELECTED_INDEX_CHANGED, function (eventData) {
            var item = view._grid.getRowData(view._grid.getSelectedDataIndex());
            view._selectedRows = getSelectedWorkItemIds(view._grid);
            var s = item["System.Id"];
            selectCallBack(s);

        });
        //this._grid.enableDragDrop();
    }

    public updateTogle(paneToggler) {
        var menubar = <Menus.MenuBar>Controls.Enhancement.getInstance(Menus.MenuBar, $("#menu-container"));

        this._menubar.updateCommandStates([{ id: "toggle", toggled: paneToggler._isTestCaseDetailsPaneOn() }]);
    }

    private getOrphanTestCaseFilter(mode: TestCaseDataService.filterMode): IPromise<TestCaseDataService.ITestCaseFilter>
    {
        if (this._orphanTestCaseFilter == null) {
            this._orphanTestCaseFilter = new TestCaseDataService.wiqlFilter();
            this._orphanTestCaseFilter.setMode(mode);
            return this._orphanTestCaseFilter.initialize(wiqlOrphaneTC);
        }
        else
        {
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

    private DoRefreshGrid() {


        if (this._currentFilter != null) {
            this._grid.setDataSource(this._currentFilter.filter(this._data));
        }
        else {
            this._grid.setDataSource(this._data);
        }

        $("#grid-count").text("Showing " + this._grid._count + " of " + this._data.length + (this._data.length == 1 ? " test case" : " test cases"));

        $(".grid-row-normal").draggable({
            revert: "invalid",
            appendTo: document.body,
            helper: "clone",
            zIndex: 1000,
            cursor: "move",
            cursorAt: { top: -5, left: -5 },
            //scope: TFS_Agile.DragDropScopes.ProductBacklog,
            //start: this._draggableStart,
            //stop: this._draggableStop,
            //helper: this._draggableHelper,
            //drag: this._draggableDrag,
            refreshPositions: true

        });
    }

    public StartLoading( longRunning, message) {
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

    public DoneLoading () {
        $("body").css("cursor", "default");
    
        if (this._waitControl != null) {
            this._waitControl.cancelWait();
            this._waitControl.endWait();
            this._waitControl = null;
        }
    }
}

function getSelectedWorkItemIds (grid:Grids.Grid):any[] {
    var i, len, ids = [],  indices = grid.getSelectedDataIndices();
    for (i = 0, len = indices.length; i < len; i++) {
        ids.push(grid._dataSource[indices[i]]);
    }
    return ids;
};
var wiqlOrphaneTC: string = "SELECT [Source].[System.Id] FROM WorkItemLinks WHERE ([Source].[System.TeamProject] = @project AND  [Source].[System.WorkItemType] IN GROUP 'Test Case Category') And ([System.Links.LinkType] <> '') And ([Target].[System.WorkItemType] IN GROUP 'Requirement Category') ORDER BY [Source].[System.Id] mode(DoesNotContain)"
