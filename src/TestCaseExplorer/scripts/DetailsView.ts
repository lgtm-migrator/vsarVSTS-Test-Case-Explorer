//---------------------------------------------------------------------
// <copyright file="DetailsView.ts">
//    This code is licensed under the MIT License.
//    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF 
//    ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED 
//    TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A 
//    PARTICULAR PURPOSE AND NONINFRINGEMENT.
// </copyright>
// <summary>
//    This is part of the Test Case Explorer extensions
//    from the ALM Rangers. This file contains the implementation
//    of the details view. 
// </summary>
//---------------------------------------------------------------------

/// <reference path='../typings/tsd.d.ts' />
/// <reference path="telemetryclient.ts" />

import Controls = require("VSS/Controls");
import TreeView = require("VSS/Controls/TreeView");
import Grids = require("VSS/Controls/Grids");
import CtrlCombos = require("VSS/Controls/Combos");
import Menus = require("VSS/Controls/Menus");
import StatusIndicator = require("VSS/Controls/StatusIndicator");
import Navigation = require("VSS/Controls/Navigation");
import Toggler = require("scripts/DetailsToggle");
import TreeViewDataService = require("scripts/TreeViewDataService");
import Common = require("scripts/Common");
import LeftTreeView = require("scripts/TreeViewView");
import CloneTestSuite = require("scripts/CloneTestSuiteForm");
import Context = require("VSS/Context");

interface IPaneRefresh {
    initialize(view: DetailsView): void;
    hide(): void;
    show(): void;
    masterIdChanged(id: string): void;
}

export class DetailsView {
    public _selectedPane: IPaneRefresh;
    public _toggler: Toggler.DetailsPaneToggler;
    public _waitControl: StatusIndicator.WaitControl;
    public _leftTreeView: LeftTreeView.TreeviewView;

    private _selectedMasterId: string
    private _PaneLst: IPaneRefresh[];

    public initialize(paneToggler: Toggler.DetailsPaneToggler, leftTreeView: LeftTreeView.TreeviewView) {

        this._PaneLst = [];
        this._toggler = paneToggler;
        this._leftTreeView = leftTreeView;
        var view = this;

        var panels = [
            { id: "TestPlan", text: "Test plans" },
            { id: "TestSuites", text: "Test suites", selected: true },
            { id: "TestResults", text: "Test results" },
            { id: "Requirements", text: "Linked requirements" }
        ];

        Controls.create(Navigation.PivotFilter, $("#details-filter-container"), {
            behavior: "dropdown",
            text: "Pane",
            items: panels,
            change: function (item) {
                var command = item.id;
                view.ShowPanel(command);
            }
        });

        Controls.create(Navigation.PivotFilter, $("#details-filter-container"), {
            behavior: "dropdown",
            text: "Position",
            items: [
                { id: "right", text: "Right", selected: true },
                { id: "bottom", text: "Bottom" }

            ],
            change: function (item) {
                var command = item.id;
                view._toggler.setPosition(command);

            }
        });

        view.ShowPanel(panels[1].id);
    }

    public selectionChanged(id: string) {
        if (this._selectedPane != null) {
            this._selectedMasterId = id;
            this._selectedPane.masterIdChanged(id);
        }
    }

    public Refresh(): void {
        this.selectionChanged(this._selectedMasterId);
    }

    private ShowPanel(panel: string) {

        if (this._selectedPane != null) {
            this._selectedPane.hide();
        }

        var pane: IPaneRefresh;

        if (this._PaneLst[panel] == null) {

            switch (panel) {
                case "TestPlan":
                    pane = new testPlanPane();
                    break;
                case "TestResults":
                    pane = new testResultsPane();
                    break;
                case "TestSuites":
                    pane = new partOfTestSuitesPane();
                    break;
                case "Requirements":
                    pane = new linkedRequirementsPane();
                    break;


            }
            pane.initialize(this);
            this._PaneLst[panel] = pane;
        } else {
            pane = this._PaneLst[panel];
        }

        this._selectedPane = pane;
        this._selectedPane.show();
        this._selectedPane.masterIdChanged(this._selectedMasterId);
    }

    public StartLoading(longRunning, message) {
        $("body").css("cursor", "progress");

        if (longRunning) {
            var waitControlOptions: StatusIndicator.IWaitControlOptions = {
                target: $(".wait-control-details-target"),
                message: message,
                cancellable: false,
                cancelTextFormat: "{0} to cancel",
                cancelCallback: function () {
                    console.log("cancelled");
                }
            };

            this._waitControl = Controls.create(StatusIndicator.WaitControl, $(".wait-control-details-target"), waitControlOptions);
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
}

class partOfTestSuitesPane implements IPaneRefresh {
    private _grid;

    public initialize(view: DetailsView) {

        var options = {
            height: "100%",
            width: "100%",
            columns: [
                {
                    text: "", index: "suiteType", width: 20, getCellContents: function (rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder) {
                        var suiteType = this.getColumnValue(dataIndex, column.index);

                        var d = $("<div class='grid-cell'/>").width(column.width || 100)
                        var dIcon = $("<div class='testpoint-outcome-shade icon'/>").addClass(TreeViewDataService.getIconFromSuiteType(suiteType));
                        d.append(dIcon);

                        return d;
                    }
                },
                { text: "Id", index: "id", width: 50 },
                { text: "Test Plan", index: "plan", width: 100 },
                { text: "Suite", index: "suite", width: 150 },

            ],
            // This data source is rendered into the Grid columns defined above
            source: null
        };

        this._grid = Controls.create<Grids.Grid, Grids.IGridOptions>(Grids.Grid, $("#details-gridTestSuites"), options);

        var menuItems: any[] = [
            { id: "refresh", showText: false, title: "Refresh grid", icon: Common.getToolbarIcon("refresh"), cssClass: Common.getToolbarCss() }
        ];

        var menubarOptions = {
            items: menuItems,
            executeAction: function (args) {
                var command = args.get_commandName();
                switch (command) {

                    case "refresh":
                        view.Refresh();
                        break;
                    default:
                        alert("Unhandled action: " + command);
                        break;
                }
            }
        };

        var menubar = Controls.create<Menus.MenuBar, any>(Menus.MenuBar, $("#detailsMenuBar-testSuite-container"), menubarOptions);
    }

    public show() {
        $("#details-testSuites").css("display", "block");
        $("#details-title").text("Associated test suites");
    }

    public hide() {
        $("#details-testSuites").css("display", "none");
    }

    public masterIdChanged(id: string) {
        TelemetryClient.getClient().trackPageView("Details.PartOfTestSuite");
        var pane = this;
        if (id == null) {
            pane._grid.setDataSource(null);
        }
        else {
            TreeViewDataService.getTestSuitesForTestCase(parseInt(id)).then(
                data=> {
                    if (data != null) {
                        $("#details-gridTestSuites").show();
                        pane._grid.setDataSource(data.map(function (i) { return { id: i.id, suite: i.name, plan: i.plan.name, suiteType: i.suiteType }; }));
                    }
                    else {
                        $("#details-gridTestSuites").hide();
                    }
                    
                },
                err => {
                    $("#details-gridTestSuites").hide();
                }
            );
        }
    }
}

class testPlanPane implements IPaneRefresh {
    private _cbo: CtrlCombos.Combo;
    private _testPlans;
    private _view: DetailsView;
    private _grid;
    private _treeView: TreeView.TreeView;

    public initialize(view: DetailsView) {
        this._view = view;
        var tpp = this;

        var cboOptions: CtrlCombos.IComboOptions = {
            mode: "drop",
            allowEdit: false,
        };

        this._cbo = Controls.create(CtrlCombos.Combo, $("#details-cboTestPlan"), cboOptions);

        TreeViewDataService.getTestPlans().then(
            data => {
                this._testPlans = data[0].children;
                this._cbo.setSource(this._testPlans.map(i => { return i.text; }));
                this._cbo.setSelectedIndex(0);
                tpp.refreshTestPlan();
            },
            err => {
                console.log(err);
                TelemetryClient.getClient().trackException(err);
            }
        );

        var that = this;
        var treeOptionsTestPlan: TreeView.ITreeOptions = {
            nodes: null,
            droppable: {
                scope: "test-case-scope",
                greedy: true,
                tolerance: "pointer",
                drop: function (event, ui) {
                    return that.droppableDrop(that, event, ui);
                }
            }            
        };

        var treeviewTestPlan = Controls.create(TreeView.TreeView, $("#details-treeviewTestPlan"), treeOptionsTestPlan);
        this._treeView = treeviewTestPlan;

        $("#details-cboTestPlan").change(function () {
            tpp.refreshTestPlan();
        });

        var menuItems: any[] = [
            { id: "refresh", showText: false, title: "Refresh grid", icon: Common.getToolbarIcon("refresh"), cssClass: Common.getToolbarCss() }
        ];

        var menubarOptions = {
            items: menuItems,
            executeAction: function (args) {
                var command = args.get_commandName();
                switch (command) {

                    case "refresh":
                        view.Refresh();
                        break;
                    default:
                        alert("Unhandled action: " + command);
                        break;
                }
            }
        };

        var menubar = Controls.create<Menus.MenuBar, any>(Menus.MenuBar, $("#detailsMenuBar-testPlan-container"), menubarOptions);

        var treeView = this._treeView;
        var leftTreeView = this._view._leftTreeView;

        $("#detailPanels").droppable({
            scope: "test-case-scope",
            greedy: true,
            tolerance: "pointer",
            drop: function (event, ui) {

                var newTestPlanName = prompt("What do you want to call the new test plan?");
                if (newTestPlanName != null) {
                    var draggedNode: TreeView.TreeNode = leftTreeView._treeview.getNodeFromElement(ui.draggable);
                    TreeViewDataService.cloneTestPlan(draggedNode.config.testPlanId, [], newTestPlanName, false);
                }

                // TODO: best way to cancel drag?
                //$("li.node").draggable({ 'revert': true }).trigger('mouseup');
            }
        });
    }

    private droppableDrop(that: testPlanPane, event, ui) {
        var n: TreeView.TreeNode = that._treeView.getNodeFromElement(event.target);

        var action = ui.helper.data("MODE");  // TODO: rename to action
        var mode = that.getCurrentDragMode(event);

        switch (action) {
            case "TEST_SUITE":
                that.processDropTestSuite(ui, n, mode);
                break;
            case "TEST_CASE":
                that.processDropTestCase(ui, n, mode);
                break;
            default:    // TODO: verify this should not happen
                console.log("treeview::drop - undefined action");
                break;
        }
    }

    private refreshTestPlan() {
        if (this._cbo.getSelectedIndex() >= 0) {

            this._view.StartLoading(true, "Fetching test plan " + this._cbo.getText());

            var treeView = this._treeView;
            var tpp = this;

            var tp = this._testPlans[this._cbo.getSelectedIndex()];
            TreeViewDataService.getTestPlanAndSuites(tp.id, tp.text).then(
                data => {
                    this._view.DoneLoading();
                    this._treeView.rootNode.clear();

                    this._treeView.rootNode.addRange(data);
                    this._treeView._draw();
                    /*
                    $("li.node").droppable({
                        scope: "test-case-scope",
                        greedy: true,
                        tolerance: "pointer",
                        drop: function (event, ui) {
                            var n: TreeView.TreeNode = treeView.getNodeFromElement(event.target);

                            var action = ui.helper.data("MODE");  // TODO: rename to action
                            var mode = tpp.getCurrentDragMode(event);

                            switch (action) {
                                case "TEST_SUITE":
                                    tpp.processDropTestSuite(ui, n, mode);
                                    break;
                                case "TEST_CASE":
                                    tpp.processDropTestCase(ui, n, mode);
                                    break;
                                default:    // TODO: verify this should not happen
                                    console.log("treeview::drop - undefined action");
                                    break;
                            }

                            // TODO: best way to cancel drag?
                            $("li.node").draggable({ 'revert': true }).trigger('mouseup');
                        }
                    });
                    */
                },
                err => {
                    console.log("Err fetching test plans");
                    console.log(err);
                });
        }
    }

    // TODO: refactor to enum
    private getCurrentDragMode(event): string {
        var mode = "MOVE";
        if (event.ctrlKey) mode = "CLONE";
        if (event.shiftKey) mode = "ADD";
        return mode;
    }

    private processDropTestSuite(ui, n, mode) {

        var draggedNode: TreeView.TreeNode = this._view._leftTreeView._treeview.getNodeFromElement(ui.draggable);
        draggedNode.config.name

        // TODO: Refactor, rename sourcePlanName to sourceSuiteName
        var sourcePlanName: string = draggedNode.config.name;
        var sourcePlanId: number = draggedNode.config.testPlanId;
        var sourceSuiteId: number = draggedNode.config.suiteId;
        var targetPlanName: string = n.config.name;
        var targetPlanId: number = n.config.testPlanId;
        var targetSuiteId: number = n.config.suiteId;

        console.log("source plan name: " + sourcePlanName);
        console.log("source plan id: " + sourcePlanId);
        console.log("source suite id: " + sourceSuiteId);
        console.log("mode: " + mode);
        console.log("target plan name: " + targetPlanName);
        console.log("target plan id: " + targetPlanId);
        console.log("target suite id: " + targetSuiteId);

        switch (mode) {
            case "MOVE":
                TreeViewDataService.addTestSuite(draggedNode, targetPlanId, targetSuiteId).then(
                    result => {
                        TreeViewDataService.removeTestSuite(sourcePlanId, sourceSuiteId).then(
                            result => {
                                this.refreshTestPlan();
                            // TODO: refresh left tree + grid
                            });
                    }
                );
                break;
            case "CLONE":
                this.showCloneTestSuite(this, sourcePlanName, sourcePlanId, sourceSuiteId, targetPlanName, targetPlanId, targetSuiteId);
                break;
            case "ADD":
                TreeViewDataService.addTestSuite(draggedNode, targetPlanId, targetSuiteId).then(
                    result => {
                        this.refreshTestPlan();
                    }
                );
                break;
        }
    }

    private cloneTestSuite(sourcePlanId, sourceSuiteId, targetPlanId, targetSuiteId, cloneChildSuites, cloneRequirements) {
        console.log("cloning test suite...");
        TreeViewDataService.cloneTestSuite(sourcePlanId, sourceSuiteId, targetPlanId, targetSuiteId, cloneChildSuites, cloneRequirements).then(result => {
            this.refreshTestPlan();
        });
    }

    private showCloneTestSuite(view: testPlanPane, sourcePlanName: string, sourcePlanId: number, sourceSuiteId: number, targetPlanName: string, targetPlanId: number, targetSuiteId: number) {

        var isHosted: boolean = Context.getPageContext().webAccessConfiguration.isHosted;
        if (!isHosted) {
            alert("The clone operations are currently only supported in Visual Studio Team Services.");
            return;
        }

        VSS.getService(VSS.ServiceIds.Dialog).then(function (dialogService: IHostDialogService) {
            
            var cloneTestSiteForm: CloneTestSuite.CloneTestSuiteForm;
            var extensionCtx = VSS.getExtensionContext();
            var contributionId = extensionCtx.publisherId + "." + extensionCtx.extensionId + ".clone-testsuite-form";

            var dialogOptions = {
                title: "Clone Test Suite",
                width: 500,
                height: 300,
                okText: "Clone",
                getDialogResult: function () {
                    return cloneTestSiteForm ? cloneTestSiteForm.getFormData() : null;
                },
                okCallback: function (result: CloneTestSuite.IFormInput) {
                    view.cloneTestSuite(sourcePlanId, sourceSuiteId, targetPlanId, targetSuiteId, result.cloneChildSuites, result.cloneRequirements);
                }
            };

            dialogService.openDialog(contributionId, dialogOptions).then(dialog => {
                dialog.getContributionInstance("clone-testsuite-form").then(function (cloneTestSiteFormInstance: CloneTestSuite.CloneTestSuiteForm) {
                    cloneTestSiteForm = cloneTestSiteFormInstance;
                    cloneTestSiteForm.setSuites(sourcePlanName, targetPlanName);
                    dialog.updateOkButton(true);
                });
            });
        });
    }

    public processDropTestCase(ui, n, mode) {
        var view = this;
        var tcIds = jQuery.makeArray(ui.helper.data("WORK_ITEM_IDS"));
        var targetPlanId: number = n.config.testPlanId;
        var targetSuiteId: number = n.config.suiteId;
        var sourcePlanId: number = this._view._leftTreeView._currentNode.config.testPlanId;
        var sourceSuiteId: number = this._view._leftTreeView._currentNode.config.suiteId;

        console.log("source plan id: " + sourcePlanId);
        console.log("source suite id: " + sourceSuiteId);
        console.log("target plan id: " + targetPlanId);
        console.log("target suite id: " + targetSuiteId);
        console.log("ids: " + tcIds.join(","));

        switch (mode) {
            case "MOVE":
                TreeViewDataService.addTestCasesToSuite(targetPlanId, targetSuiteId, tcIds.join(",")).then(
                    result => {
                        TreeViewDataService.removeTestCaseFromSuite(sourcePlanId, sourceSuiteId, tcIds.join(",")).then(
                            result => {
                                this.refreshTestPlan();
                                // TODO: refresh grid
                            });
                    }
                );
                break;
            case "ADD":
                TreeViewDataService.addTestCasesToSuite(targetPlanId, targetSuiteId, tcIds.join(",")).then(
                    result => {
                        this.refreshTestPlan();
                    });
                break;
        }
    }

    public show() {
        $("#details-TestPlan").css("display", "block");
        $("#details-title").text("Test plans");
    }

    public hide() {
        $("#details-TestPlan").css("display", "none");
    }

    public masterIdChanged(id: string) {
        TelemetryClient.getClient().trackPageView("Details.TestPlans");
    }
}

class testResultsPane implements IPaneRefresh {
    private _grid;

    public initialize(view: DetailsView) {
        var options = {
            height: "100%",
            width: "100%",
            columns: [
                { text: "Outcome", index: "Outcome", width: 75, getCellContents: Common.getTestResultCellContent },
                { text: "Configuration", index: "Configuration", width: 75 },
                { text: "Run by", index: "RunBy", width: 150 },
                { text: "Date ", index: "Date", width: 150 },
                { text: "Duration", index: "suite", width: 150 }
            ],
            // This data source is rendered into the Grid columns defined above
            source: null
        };

        this._grid = Controls.create<Grids.Grid, Grids.IGridOptions>(Grids.Grid, $("#details-gridTestResults"), options);

        var menuItems: any[] = [
            { id: "refresh", showText: false, title: "Refresh grid", icon: Common.getToolbarIcon("refresh"), cssClass: Common.getToolbarCss() }
        ];

        var menubarOptions = {
            items: menuItems,
            executeAction: function (args) {
                var command = args.get_commandName();
                switch (command) {

                    case "refresh":
                        view.Refresh();
                        break;
                    default:
                        alert("Unhandled action: " + command);
                        break;
                }
            }
        };

        var menubar = Controls.create<Menus.MenuBar, any>(Menus.MenuBar, $("#detailsMenuBar-TestResults-container"), menubarOptions);
    }

    public hide() {
        $("#details-TestResults").css("display", "none");
    }

    public show() {
        $("#details-TestResults").css("display", "block");
        $("#details-title").text("Recent test results");
    }

    public masterIdChanged(id: string) {
        TelemetryClient.getClient().trackPageView("Details.TestResults");
        var pane = this;
        if (id == null) {
            pane._grid.setDataSource(null);
        }
        else {
            TreeViewDataService.getTestResultsForTestCase(parseInt(id)).then(
                data => {
                    var ds = data.map(function (i) { return { id: i.id, Outcome: i.outcome, Configuration: i.configuration.name, RunBy: (i.runBy == null ? "" : i.runBy.displayName), Date: i.completedDate }; });
                    pane._grid.setDataSource(ds);
                },
                err => {
                    pane._grid.setDataSource(null);
                });
        }
    }
}

class linkedRequirementsPane implements IPaneRefresh {
    private _grid;

    public initialize(view: DetailsView) {
        var options: Grids.IGridOptions = {
            height: "100%",
            width: "100%",
            columns: [
                { text: "Id", index: "System.Id", width: 50 },
                { text: "State", index: "System.State", width: 75 },
                { text: "Title", index: "System.Title", width: 150 },
            ],
            // This data source is rendered into the Grid columns defined above
            source: null
        };

        this._grid = Controls.create<Grids.Grid, Grids.IGridOptions>(Grids.Grid, $("#details-gridReq"), options);

        var menuItems: any[] = [
            { id: "refresh", showText: false, title: "Refresh grid", icon: Common.getToolbarIcon("refresh"), cssClass: Common.getToolbarCss() }
        ];

        var menubarOptions = {
            items: menuItems,
            executeAction: function (args) {
                var command = args.get_commandName();
                switch (command) {

                    case "refresh":
                        view.Refresh();
                        break;
                    default:
                        alert("Unhandled action: " + command);
                        break;
                }
            }
        };

        var menubar = Controls.create<Menus.MenuBar, any>(Menus.MenuBar, $("#detailsMenuBar-linkedReq-container"), menubarOptions);
    }

    public hide() {
        $("#details-linkedReq").css("display", "none");
    }

    public show() {
        $("#details-linkedReq").css("display", "block");
        $("#details-title").text("Linked requirements");
    }

    public masterIdChanged(id: string) {
        TelemetryClient.getClient().trackPageView("Details.LinkedRequirements");
        var pane = this;
        pane._grid.setDataSource(null);
        if (id != null) {
            TreeViewDataService.getLinkedRequirementsForTestCase(parseInt(id)).then(
                data => {
                    if (data != null) {
                        pane._grid.setDataSource(data.map(r => { return r.fields; }));
                    }
                    else {
                        pane._grid.setDataSource(null);
                    }
                },
                err=> {
                    pane._grid.setDataSource(null);
                }
            );
        }
    }
}
