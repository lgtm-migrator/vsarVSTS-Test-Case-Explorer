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
    private _waitControl: StatusIndicator.WaitControl;
    private _showRecursive: boolean;
    private _currentFilter: TestCaseDataService.ITestCaseFilter = null;
    private _orphanTestCaseFilter: TestCaseDataService.wiqlFilter = null;
    private _testSuiteFilter: TestCaseDataService.testSuiteFilter = null;

    public RefreshGrid(pivot: string, value) {

        this._grid.setDataSource(null);
        $("#grid-title").text("");
        this.StartLoading(true, "Fetching data");
        var promise: IPromise<any>;
        var title: string;

        switch (pivot) {
            case "Area path":
                promise = TestCaseDataService.getTestCasesByProjectStructure(WorkItemContracts.TreeNodeStructureType.Area, value.path, this._showRecursive);
                title = "Test cases with area path: " + value.path;
                break;
            case "Iteration path":
                promise = TestCaseDataService.getTestCasesByProjectStructure(WorkItemContracts.TreeNodeStructureType.Iteration, value.path, this._showRecursive);
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
                promise = TestCaseDataService.getTestCasesByTestPlan(value.testPlanId, value.suiteId,  this._showRecursive);
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
        this._showRecursive = false;
        
        this._fields = ["System.Id", "System.Title", "System.State", "System.AssignedTo", "Microsoft.VSTS.Common.Priority", "Microsoft.VSTS.TCM.AutomationStatus"];
        this.initMenu(this, paneToggler);
        this.initFilter(this);
        this.initGrid(this, selectCallBack);
        
    }

    private initMenu(view: TestCaseView, paneToggler: DetailsToggle.DetailsPaneToggler) {
        //var menuItems: Menus.IMenuItemSpec[] = [
        var menuItems: any[] = [
            { id: "show-recursive", showText: false, icon: VSS.getExtensionContext().baseUri + "/img/Child-node-icon.png" },
            { separator: true },
            { id: "new-testcase", text: "New", icon: "icon-add-small" },
            { separator: true },
            { id: "clone-testcase", text: "Clone", noIcon: true },
            { separator: true },
            { id: "column_options", text: "Column Options", noIcon: true },
            { id: "toggle", showText: false, icon: "icon-tfs-tcm-associated-pane-toggle", cssClass: "right-align", text: "Show/hide" }
        ];

        var menubarOptions = {
            items: menuItems,
            executeAction: function (args) {
                var command = args.get_commandName();
                switch (command) {
                    case "show-recursive":
                        view._showRecursive = !view._showRecursive
                        menubar.updateCommandStates([{ id: command, toggled: view._showRecursive }]);
                        break;
                    case "toggle":
                        paneToggler.toggleDetailsPane()
                        menubar.updateCommandStates([{ id: command, toggled: view._paneToggler._isTestCaseDetailsPaneOn() }]);
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
        menubar.updateCommandStates([{ id: "toggle", toggled: view._paneToggler._isTestCaseDetailsPaneOn() }]);

  
    }

    private initFilter(view: TestCaseView) {

        var menubarFilter: Menus.MenuBar = null;
        var menuFilterItems: Menus.IMenuItemSpec[] = [

            {
                id: "root", text: "Select Pane ", childItems: [
                    { id: "All", text: "All" },
                    { id: "TC_WithOUT_Requirement", text: "Tests not associated with any requirements" },
                    { id: "TC_MultipleSuites", text: "Tests present in multiple suites" },
                    { id: "TC_OrphanedSuites", text: "Orphaned tests" },
                    { id: "TC_With_Requirement", text: "Tests with requirements linking" }
                ]
            },
        ];

        var menubarFilterOptions = {
            items: menuFilterItems,
            executeAction: function (args) {
                var command = args.get_commandName();

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
    }

    private initGrid(view:TestCaseView, selectCallBack: TestCaseViewSelectedCallback) {
        var options: Grids.IGridOptions = {
            height: "1000px", // Explicit height is required for a Grid control
            columns: this._fields.map(function (f) {
                return { text: f.substring(f.lastIndexOf(".") + 1), index: f };
            }),            
            draggable: {
                axis: "",
                containment: "",
            revert: "invalid",
            appendTo: document.body,
            helper: "clone",
            zIndex: 1000,
            cursor: "move",
            cursorAt: { top: -5, left: -5 },
            scope: "",
            //start: this._draggableStart,
            //stop: this._draggableStop,
            //helper: this._draggableHelper,
            //drag: this._draggableDrag,
            refreshPositions: true

        },
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

        // Create the grid in a container element
        this._grid = Controls.create<Grids.Grid, Grids.IGridOptions>(Grids.Grid, $("#grid-container"), options );


        $("#grid-container").bind(Grids.GridO.EVENT_SELECTED_INDEX_CHANGED, function (eventData) {
            var s = view._grid.getRowData(view._grid.getSelectedDataIndex())["System.Id"];
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

            var waitOptions = {
                cancellable: true,
                target: $(".wait-control-target"),
                message: message
            };
              
            this._waitControl = new StatusIndicator.WaitControl(waitOptions);
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

var wiqlOrphaneTC: string = "SELECT [Source].[System.Id] FROM WorkItemLinks WHERE ([Source].[System.TeamProject] = @project AND  [Source].[System.WorkItemType] IN GROUP 'Test Case Category') And ([System.Links.LinkType] <> '') And ([Target].[System.WorkItemType] IN GROUP 'Requirement Category') ORDER BY [Source].[System.Id] mode(DoesNotContain)"
