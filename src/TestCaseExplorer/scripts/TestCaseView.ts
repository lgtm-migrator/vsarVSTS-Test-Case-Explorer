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
import CommonControls = require("VSS/Controls/Common");
import Navigation = require("VSS/Controls/Navigation");
//import CC = require("VSS/Controls/Combos");
import WorkItemServices = require("TFS/WorkItemTracking/Services");

export interface TestCaseViewSelectedCallback { (value: string): void }

export class TestCaseView {

    private _paneToggler: DetailsToggle.DetailsPaneToggler;
    private _grid: Grids.Grid;
    private _menubar: Menus.MenuBar;

    public RefreshGrid(pivot: string, value) {

        this._grid.setDataSource(null);
        $("#grid-title").text("");

        switch (pivot) {
            case "Area path":
                this.getTestCasesByProjectStructure(WorkItemContracts.TreeNodeStructureType.Area, value.path).then(result => {
                    this._grid.setDataSource(result);
                    $("#grid-title").text("Test cases with area path: " + value.path);
                });
                break;
            case "Iteration path":
                this.getTestCasesByProjectStructure(WorkItemContracts.TreeNodeStructureType.Iteration, value.path).then(result => {
                    this._grid.setDataSource(result);
                    $("#grid-title").text("Test cases with iteration path: " + value.path);
                });
                break;
            case "Priority":
                var priority: string = "any"; 
                if (value.name != "Priority") {
                    priority = value.name;
                }
                this.getTestCasesByPriority(priority).then(result => {
                    this._grid.setDataSource(result);
                    $("#grid-title").text("Test cases with priority: " + priority);
                });
                break;
            case "State":
                var state: string = "any";
                if (value.name != "States") {
                    state = value.name;
                }
                this.getTestCasesByState(state).then(result => {
                    this._grid.setDataSource(result);
                    $("#grid-title").text("Test cases with state: " + state);
                });
                break;
            case "Test plan":
                this.getTestCasesByTestPlan(value.testPlanId, value.suiteId).then(result => {
                    this._grid.setDataSource(result);
                    $("#grid-title").text("Test suite: " + value.name + " (Suite Id: " + value.suiteId + ")");
                });
                break;
        }
    }

    public toggle() {
    }

    private getTestCases(workItemIds: number[]): IPromise<any> {
        var deferred = $.Deferred<any[]>();
        var workItemClient = WorkItemClient.getClient();

        workItemClient.getWorkItems(workItemIds, ["System.Id", "System.Title", "System.State", "System.AssignedTo", "Microsoft.VSTS.Common.Priority", "Microsoft.VSTS.TCM.AutomationStatus"]).then(result => {
            var dataSource = [];
            result.forEach(workItem => {
                dataSource.push({ id: workItem.id, title: workItem.fields["System.Title"], state: workItem.fields["System.State"], assigned_to: workItem.fields["System.AssignedTo"], priority: workItem.fields["Microsoft.VSTS.Common.Priority"], automation_status: workItem.fields["Microsoft.VSTS.TCM.AutomationStatus"] });
            });
            deferred.resolve(dataSource);
        });

        return deferred.promise();
    }

    private getTestCasesByWiql(wiql: string): IPromise<any> {
        var deferred = $.Deferred<any[]>();
        var workItemClient = WorkItemClient.getClient();

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

    private getTestCasesByProjectStructure(structureType: WorkItemContracts.TreeNodeStructureType, path: string): IPromise<any> {
        var typeField: string;
        switch (structureType) {
            case WorkItemContracts.TreeNodeStructureType.Area:
                typeField = "System.AreaPath";
                break;
            case WorkItemContracts.TreeNodeStructureType.Iteration:
                typeField = "System.IterationPath";
                break;
        }

        var wiql = "SELECT [System.Id] FROM WorkItems WHERE [System.TeamProject] = '" + VSS.getWebContext().project.name + "' AND [System.WorkItemType] = 'Test Case'  AND  [" + typeField + "] UNDER '" + path + "' ORDER BY [System.Id]";
        return this.getTestCasesByWiql(wiql);
    }

    private getTestCasesByPriority(priority: string): IPromise<any> {
        var wiql: string;
        if (priority == "any") {
            wiql = "SELECT [System.Id] FROM WorkItems WHERE [System.TeamProject] = '" + VSS.getWebContext().project.name + "' AND [System.WorkItemType] = 'Test Case' ORDER BY [System.Id]";
        }
        else {
            wiql = "SELECT [System.Id] FROM WorkItems WHERE [System.TeamProject] = '" + VSS.getWebContext().project.name + "' AND [System.WorkItemType] = 'Test Case'  AND  [Microsoft.VSTS.Common.Priority] = " + priority + " ORDER BY [System.Id]";
        }
        return this.getTestCasesByWiql(wiql);
    }

    private getTestCasesByState(state: string): IPromise<any> {
        var wiql: string;
        if (state == "any") {
            wiql = "SELECT [System.Id] FROM WorkItems WHERE [System.TeamProject] = '" + VSS.getWebContext().project.name + "' AND [System.WorkItemType] = 'Test Case' ORDER BY [System.Id]";
        }
        else {
            wiql = "SELECT [System.Id] FROM WorkItems WHERE [System.TeamProject] = '" + VSS.getWebContext().project.name + "' AND [System.WorkItemType] = 'Test Case'  AND  [System.State] = '" + state + "' ORDER BY [System.Id]";
        }
        return this.getTestCasesByWiql(wiql);
    }

    private getTestCasesByTestPlan(planId: number, suiteId: number): IPromise<any> {
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

    public initialize(paneToggler: DetailsToggle.DetailsPaneToggler, selectCallBack: TestCaseViewSelectedCallback) {

        this._paneToggler = paneToggler;

        //var menuItems: Menus.IMenuItemSpec[] = [
        var menuItems: any[] = [
            { id: "file", text: "New", icon: "icon-add-small" },
            { separator: true },
            { id: "clone", text: "Clone", noIcon: true },
            { separator: true },
            { id: "column_options", text: "Column Options", noIcon: true },
            { id: "toggle", showText: false, icon: "icon-tfs-tcm-associated-pane-toggle", cssClass: "right-align", text: "Show/hide" }
        ];

        var tcv = this;

        var menubarOptions = {
            items: menuItems,
            executeAction: function (args) {
                var command = args.get_commandName();
                switch (command) {
                    case "toggle":
                        paneToggler.toggleDetailsPane()
                        menubar.updateCommandStates([{ id: command, toggled: tcv._paneToggler._isTestCaseDetailsPaneOn() }]);
                        break;
                    default:
                        alert("Unhandled action: " + command);
                        break;
                }
            }
        };

        var menubar = Controls.create<Menus.MenuBar, any>(Menus.MenuBar, $("#menu-container"), menubarOptions);
        this._menubar = menubar;
        menubar.updateCommandStates([{ id: "toggle", toggled: tcv._paneToggler._isTestCaseDetailsPaneOn() }]);

        var options = {
            height: "1000px", // Explicit height is required for a Grid control
            columns: [
                { text: "Id", index: "id", width: 50 },
                { text: "Title", index: "title", width: 200 },
                { text: "State", index: "state", width: 75 },
                { text: "Assigned To", index: "assigned_to", width: 150 },
                { text: "Priority", index: "priority", width: 50 },
                { text: "Automation status", index: "automation_status", width: 150 }
            ],
            draggable: true,
            droppable: true,
            openRowDetail: (index: number) => {
                // Double clicking row or hitting enter key when the row is selected
                // will cause this function to be executed
                var item = this._grid.getRowData(index);
                selectCallBack(item.id);
                alert(item.id);
            }

        };

        //var cbo = Controls.create(CommonControls.Combo, $("#grid-filter-cbo"), {
        ////var cbo = Controls.create(Navigation.PivotFilter, $("#grid-filter-cbo"), {
        //    //behaviorType: "DropdownFilterBehavior",
        //    mode: "drop",
        //    allowEdit: false,
        //    source: ["All", "Tests not associated with any requirements", "Tests present in multiple suites", "Orphaned tests", "Tests with requirements linking"]
        //});

        var menubarFilter: Menus.MenuBar = null;
        var menuFilterItems: Menus.IMenuItemSpec[] = [

            {
                id: "root", text: "Select Pane ", childItems: [
                    { id: "All", text: "All" },
                    { id: "NoReq", text: "Tests not associated with any requirements"},
                    { id: "TestResults", text: "Tests present in multiple suites" },
                    { id: "TestResults", text: "Orphaned tests" },
                    { id: "TestResults", text: "Tests with requirements linking" }
                ]
            },
        ];

        var menubarFilterOptions = {
            items: menuFilterItems,
            executeAction: function (args) {
                var command = args.get_commandName();
                switch (command) {
              
                    default:
                        menuFilterItems[0].text = args.get_commandSource()._item.text;
                        menubarFilter.updateItems(menuFilterItems);
                        break;
                };
            }
        };

        menuFilterItems[0].text = menuFilterItems[0].childItems[0].text;
        menubarFilter = Controls.create<Menus.MenuBar, any>(Menus.MenuBar, $("#grid-filter-cbo"), menubarFilterOptions);
        

        //var pivotFilter = Controls.Enhancement.ensureEnhancement(Navigation.PivotFilter, $("#grid-filter-cbo"));

        //var cbo = Controls.create(CommonControls.ComboListDropPopup, $("#grid-filter-cbo"), {
        //    mode: "drop",
        //    allowEdit: false,
        //    source: ["All", "Tests not associated with any requirements", "Tests present in multiple suites", "Orphaned tests", "Tests with requirements linking"]
        //});

        // Create the grid in a container element
        this._grid = Controls.create<Grids.Grid, Grids.IGridOptions>(Grids.Grid, $("#grid-container"), options);

        $("#grid-container").bind(Grids.GridO.EVENT_SELECTED_INDEX_CHANGED, function (eventData) {
            var s = tcv._grid.getRowData(tcv._grid.getSelectedDataIndex()).id;
            selectCallBack(s);
        });

        this._grid.enableDragDrop();

    }

    public updateTogle(paneToggler) {
        var menubar = <Menus.MenuBar>Controls.Enhancement.getInstance(Menus.MenuBar, $("#menu-container"));

        this._menubar.updateCommandStates([{ id: "toggle", toggled: paneToggler._isTestCaseDetailsPaneOn() }]);
    }
}

