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

import StatusIndicator = require("VSS/Controls/Common");
import CoreUtils = require("VSS/Utils/Core");



//import CC = require("VSS/Controls/Combos");
import WorkItemServices = require("TFS/WorkItemTracking/Services");

import TestCaseDataService = require("scripts/TestCaseDataService");

export interface TestCaseViewSelectedCallback { (value: string): void }

export class TestCaseView {

    private _paneToggler: DetailsToggle.DetailsPaneToggler;
    private _grid: Grids.Grid;
    private _menubar: Menus.MenuBar;
    private _fields: string[];
    private _data: any[];     
    private _waitControl:StatusIndicator.WaitControl;

    public RefreshGrid(pivot: string, value) {

        this._grid.setDataSource(null);
        $("#grid-title").text("");
        this.StartLoading(true, "Fetching data");
        var promise: IPromise<any>;
        var title: string;

        switch (pivot) {
            case "Area path":
                promise = TestCaseDataService.getTestCasesByProjectStructure(WorkItemContracts.TreeNodeStructureType.Area, value.path);
                title = "Test cases with area path: " + value.path;
                
                break;
            case "Iteration path":
                promise = TestCaseDataService.getTestCasesByProjectStructure(WorkItemContracts.TreeNodeStructureType.Iteration, value.path);
                title = "Test cases with iteration path: " + value.path;
                break;
            case "Priority":
                var priority: string = "any"; 
                if (value.name != "Priority") {
                    priority = value.name;
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
                promise = TestCaseDataService.getTestCasesByTestPlan(value.testPlanId, value.suiteId);
                title = "Test suite: " + value.name + " (Suite Id: " + value.suiteId + ")";
                break;
        }
        $("#grid-title").text(title);

        promise.then(result => {
            this._data = result;
            this._grid.setDataSource(result);
            this.DoneLoading();
        });

    }

    public toggle() {
    }

    

    public initialize(paneToggler: DetailsToggle.DetailsPaneToggler, selectCallBack: TestCaseViewSelectedCallback) {

        var view = this;

        this._paneToggler = paneToggler;
        this._fields = ["System.Id", "System.Title", "System.State", "System.AssignedTo", "Microsoft.VSTS.Common.Priority", "Microsoft.VSTS.TCM.AutomationStatus"];
        //var menuItems: Menus.IMenuItemSpec[] = [
        var menuItems: any[] = [
            { id: "new-testcase", text: "New", icon: "icon-add-small" },
            { separator: true },
            { id: "clone-testcase", text: "Clone", noIcon: true },
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
                    case "new-testcase":
                        WorkItemServices.WorkItemFormNavigationService.getService().then(workItemService => {
                            // TODO: pass additional default values from pivot
                            workItemService.openNewWorkItem("Test Case");
                            // TODO: refresh grid after add
                        });
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
            columns: this._fields.map(function (f) {
                return { text: f.substring(f.lastIndexOf(".")+1), index:f};
            })
            //    { text: "Id", index: "id", width: 50 },
            //    { text: "Title", index: "title", width: 200 },
            //    { text: "State", index: "state", width: 75 },
            //    { text: "Assigned To", index: "assigned_to", width: 150 },
            //    { text: "Priority", index: "priority", width: 50 },
            //    { text: "Automation status", index: "automation_status", width: 150 }
        //]
            ,
            draggable: true,
            droppable: true,
            openRowDetail: (index: number) => {
                // Double clicking row or hitting enter key when the row is selected
                // will cause this function to be executed
                var item = this._grid.getRowData(index);
                selectCallBack(item["System.Id"]);
                WorkItemServices.WorkItemFormNavigationService.getService().then(workItemService => {
                    workItemService.openWorkItem(item["System.Id"]);
                    // TODO: refresh grid after update
                });
            }

        };


        var menubarFilter: Menus.MenuBar = null;
        var menuFilterItems: Menus.IMenuItemSpec[] = [

            {
                id: "root", text: "Select Pane ", childItems: [
                    { id: "All", text: "All" },
                    { id: "TC_WithOUT_Requirement", text: "Tests not associated with any requirements" },
                    { id: "TestResults", text: "Tests present in multiple suites" },
                    { id: "TestResults", text: "Orphaned tests" },
                    { id: "TC_With_Requirement", text: "Tests with requirements linking" }
                ]
            },
        ];

        var menubarFilterOptions = {
            items: menuFilterItems,
            executeAction: function (args) {
                var command = args.get_commandName();
                var filter: TestCaseDataService.ITestCaseFilter = null;
                var filterMode: TestCaseDataService.filterMode;
                var filterData: any;

                switch (command) {
                    case "TC_WithOUT_Requirement":
                        filterData = wiqlOrphaneTC;
                        filter = new TestCaseDataService.wiqlFilter();
                        filterMode = TestCaseDataService.filterMode.Contains;
                        break;
                    case "TC_With_Requirement":
                        filterData = wiqlOrphaneTC;
                        filter = new TestCaseDataService.wiqlFilter();
                        filterMode = TestCaseDataService.filterMode.NotContains;
                        break;

                    default:
                        break;
                };
                if (filter != null) {
                    filter.initialize(filterData).then(function (a) {
                        view._grid.setDataSource(filter.filter(view._data, filterMode));
                    });
                }
                else {
                    view._grid.setDataSource(view._data);
                }

                menuFilterItems[0].text = args.get_commandSource()._item.text;
                menubarFilter.updateItems(menuFilterItems);

            }
        };

        menuFilterItems[0].text = menuFilterItems[0].childItems[0].text;
        menubarFilter = Controls.create<Menus.MenuBar, any>(Menus.MenuBar, $("#grid-filter-cbo"), menubarFilterOptions);
        
        //var pivCbo = Controls.create<Navigation.PivotFilter, any>(Navigation.PivotFilter, $("#grid-filter-cbo"), menubarFilterOptions);

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


    public StartLoading( longRunning, message) {
        $("body").css("cursor", "progress");

        if (longRunning) {

            if (this._waitControl == null) {
                var waitOptions = {
                    cancellable: true,
                    target: $(".wait-control-target"),
                    message: message
                };
              
                this._waitControl = new StatusIndicator.WaitControl(waitOptions);
                this._waitControl.startWait();
            }
        }
    }



    public DoneLoading () {
        $("body").css("cursor", "default");
    
        if (this._waitControl != null) {
            this._waitControl.endWait();
        }
    }
}

var wiqlOrphaneTC: string = "SELECT [Source].[System.Id] FROM WorkItemLinks WHERE ([Source].[System.TeamProject] = @project AND  [Source].[System.WorkItemType] IN GROUP 'Test Case Category') And ([System.Links.LinkType] <> '') And ([Target].[System.WorkItemType] IN GROUP 'Requirement Category') ORDER BY [Source].[System.Id] mode(DoesNotContain)"
