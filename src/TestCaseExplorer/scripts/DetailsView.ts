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
import CloneTestPlan = require("scripts/CloneTestPlanForm");
import Context = require("VSS/Context");
import Notifications = require("VSS/Controls/Notifications");



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

        var pivot= Controls.create(Navigation.PivotFilter, $("#details-filter-container"), {
            behavior: "dropdown",
            text: "Pane",
            items: panels,
            change: function (item) {
                var command = item.id;
                view.ShowPanel(command);
                VSS.getService<IExtensionDataService>(VSS.ServiceIds.ExtensionData).then(function (dataService) {
                    // Set value in user scope
                    dataService.setValue("LeftPaneSelectedPanel", command, { scopeType: "User" }).then(function (value) {
                        console.log("Saved user preference");
                    });
                });
            }
        });

        VSS.getService<IExtensionDataService>(VSS.ServiceIds.ExtensionData).then(function (dataService) {
            // Set value in user scope
            dataService.getValue("LeftPaneSelectedPanel", { scopeType: "User" }).then(function (value) {
                pivot.setSelectedItem(pivot._options.items.filter(i => { return i.id === value; })[0]);
            });
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

    public refreshTestCaseView(): void {

    }

    public refreshLeftTree() {
        this._leftTreeView.refreshTreeView()
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
    private _message: Notifications.MessageAreaControl;
    private PreventDropOverDubbelBouble = false;

    public initialize(view: DetailsView) {
        this._view = view;
        var tpp = this;

        var options: Notifications.IMessageAreaControlOptions = {
            closeable: true,
            expanded: false,
            showIcon: true
        };
        this._message = Controls.create<Notifications.MessageAreaControl, Notifications.IMessageAreaControlOptions>(Notifications.MessageAreaControl, $("#message-container"), options);

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
            droppable:  $.extend({
                scope: "test-case-scope",
                greedy: true,
                tolerance: "pointer",
                drop: function (event, ui) {
                    return that.droppableDrop(that, event, ui);
                },
                hoverClass: "accept-drop-hover", 
                over: function (event, ui) {
                    that.droppableOver($(this), event, ui);
                },
             
            })            
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

                var isHosted: boolean = Context.getPageContext().webAccessConfiguration.isHosted;
                if (!isHosted) {
                    alert("The clone operations are currently only supported in Visual Studio Team Services.");
                    return;
                }

                var draggedNode: TreeView.TreeNode = that._view._leftTreeView._treeview.getNodeFromElement(ui.draggable);
                var sourcePlanName: string = draggedNode.config.name;

                VSS.getService(VSS.ServiceIds.Dialog).then(function (dialogService: IHostDialogService) {

                    var cloneTestPlanForm: CloneTestPlan.CloneTestPlanForm;
                    var extensionCtx = VSS.getExtensionContext();
                    var contributionId = extensionCtx.publisherId + "." + extensionCtx.extensionId + ".clone-testplan-form";

                    var dialogOptions = {
                        title: "Clone Test Plan",
                        width: 600,
                        height: 300,
                        okText: "Clone",
                        getDialogResult: function () {
                            return cloneTestPlanForm ? cloneTestPlanForm.getFormData() : null;
                        },
                        okCallback: function (result: CloneTestPlan.IFormInput) {
                            var draggedNode: TreeView.TreeNode = leftTreeView._treeview.getNodeFromElement(ui.draggable);
                            TreeViewDataService.cloneTestPlan(draggedNode.config.testPlanId, [], result.newTestPlanName, result.cloneRequirements, result.areaPath, result.iterationPath);
                            that.showNotification("Test plan " + result.newTestPlanName);
                        }
                    };

                    dialogService.openDialog(contributionId, dialogOptions).then(dialog => {
                        dialog.getContributionInstance("clone-testplan-form").then(function (cloneTestPlanFormInstance: CloneTestPlan.CloneTestPlanForm) {
                            cloneTestPlanForm = cloneTestPlanFormInstance;
                            cloneTestPlanForm.init(sourcePlanName);
                            dialog.updateOkButton(true);
                        });
                    });
                });             
            },
            hoverClass:"accept-drop-hover"
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


    private areTestCasesDraggedOnQueryBasedSuite  ($draggedElement, suite) {
        var areTestCasesBeingDragged = !$draggedElement.hasClass("tree-drag-tile");
        //return areTestCasesBeingDragged && suite.type === TCMConstants.TestSuiteType.DynamicTestSuite;
    };

    private droppableOver($node, event, ui) {

        var node = this._treeView._getNode($node);
        var $dragElem = ui.helper;

        if (this.PreventDropOverDubbelBouble) {
            this.PreventDropOverDubbelBouble = false;
        }
        else {
            if (node && node.type !== "StaticTestSuite") {
                //Vi försöker släppa på nåt annat än static
                console.log("Hide");
                $dragElem.find(".drop-allowed").hide();
                $dragElem.find(".drop-not-allowed").show();
                $dragElem.find(".drop-not-allowed-message").text("You can only " + this.getCurrentDragMode(event).toLowerCase() + " to static suites")
                this.PreventDropOverDubbelBouble = true;
            } else {
                if (node.id === ui.helper.data("SUITE_ID")) {
                    $dragElem.find(".drop-allowed").hide();
                    $dragElem.find(".drop-not-allowed").show();
                    $dragElem.find(".drop-not-allowed-message").text("You can not " + this.getCurrentDragMode(event).toLowerCase()+ " to self")
                }
                else {
                    console.log("show");
                    $dragElem.find(".drop-allowed").show();
                    $dragElem.find(".drop-not-allowed").hide();
                }
            }
            $("ul.tree-children li.droppable-hover").removeClass("droppable-hover");
            $("ul.tree-children li.selected").removeClass("selected");

            event.stopPropagation();
            event.preventDefault();
        }

        //    if (this.isSuiteDraggedOnNonStaticSuite($dragElemDroppableStyle, node.type)) {
        //        $dragElemDroppableStyle.hide();
        //        $dragElemNotDroppableStyle.show();
        //    }
        //    else {
        //        $dragElemDroppableStyle.show();
        //        $dragElemNotDroppableStyle.hide();
        //    }
        //}


        //$(".drag-tile").toggleClass("invalid-drop", n.type != "StaticTestSuite")
        //if (n.type != "StaticTestSuite") {
        //    $(".drag-tile-drag-type").text("FÅR EJ");
        //}
        //var s = n.type != "StaticTestSuite" ? "Valid" : "NOT VALID";
        //console.log(n.text + " valid target..." +s );
     
        
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

    private showNotification(message: String) {
        this._message.setMessage(message + " is being cloned, you need to refresh to see the completed result.", Notifications.MessageAreaType.Info);
    }

    private processDropTestSuite(ui, n, mode) {
        var view = this;

        var draggedNode: TreeView.TreeNode = this._view._leftTreeView._treeview.getNodeFromElement(ui.draggable);

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
                                view.refreshTestPlan();
                                view._view.refreshLeftTree();
                                view._view.refreshTestCaseView();
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
                        view.refreshTestPlan();
                        view._view.refreshLeftTree();
                        view._view.refreshTestCaseView();
                    }
                );
                break;
        }
    }

    private cloneTestSuite(sourcePlanId, sourceSuiteId, targetPlanId, targetSuiteId, cloneChildSuites, cloneRequirements) {
        var view = this;
        console.log("cloning test suite...");
        TreeViewDataService.cloneTestSuite(sourcePlanId, sourceSuiteId, targetPlanId, targetSuiteId, cloneChildSuites, cloneRequirements).then(result => {
            view.refreshTestPlan();
        });
    }

    private showCloneTestSuite(view: testPlanPane, sourcePlanName: string, sourcePlanId: number, sourceSuiteId: number, targetPlanName: string, targetPlanId: number, targetSuiteId: number) {


        var isHosted: boolean = Context.getPageContext().webAccessConfiguration.isHosted;
        if (!isHosted) {
            alert("The clone operations are currently only supported in Visual Studio Team Services.");
            return;
        }

        VSS.getService(VSS.ServiceIds.Dialog).then(function (dialogService: IHostDialogService) {
            
            var cloneTestSuiteForm: CloneTestSuite.CloneTestSuiteForm;
            var extensionCtx = VSS.getExtensionContext();
            var contributionId = extensionCtx.publisherId + "." + extensionCtx.extensionId + ".clone-testsuite-form";

            var dialogOptions = {
                title: "Clone Test Suite",
                width: 500,
                height: 300,
                okText: "Clone",
                getDialogResult: function () {
                    return cloneTestSuiteForm ? cloneTestSuiteForm.getFormData() : null;
                },
                okCallback: function (result: CloneTestSuite.IFormInput) {
                    view.cloneTestSuite(sourcePlanId, sourceSuiteId, targetPlanId, targetSuiteId, result.cloneChildSuites, result.cloneRequirements);
                    view.showNotification("Test suite " + targetSuiteId);
                }
            };

            dialogService.openDialog(contributionId, dialogOptions).then(dialog => {
                dialog.getContributionInstance("clone-testsuite-form").then(function (cloneTestSiteFormInstance: CloneTestSuite.CloneTestSuiteForm) {
                    cloneTestSuiteForm = cloneTestSiteFormInstance;
                    cloneTestSuiteForm.setSuites(sourcePlanName, targetPlanName);
                    dialog.updateOkButton(true);
                });
            });
        });
    }

    public processDropTestCase(ui, n, mode) {
        var that = this;
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
                                that._view.refreshTestCaseView();
                            });
                    }
                );
                break;
            case "ADD":
                TreeViewDataService.addTestCasesToSuite(targetPlanId, targetSuiteId, tcIds.join(",")).then(
                    result => {
                        that._view.refreshTestCaseView();
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
