//---------------------------------------------------------------------
// <copyright file="TreeView.ts">
//    This code is licensed under the MIT License.
//    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF 
//    ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED 
//    TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A 
//    PARTICULAR PURPOSE AND NONINFRINGEMENT.
// </copyright>
// <summary>
//    This is part of the Test Case Explorer extensions
//    from the ALM Rangers. This file contains the implementation
//    of the tree view (pivot).
// </summary>
//---------------------------------------------------------------------

/// <reference path='../typings/tsd.d.ts' />
/// <reference path="telemetryclient.ts" />

import Controls = require("VSS/Controls");
import TreeView = require("VSS/Controls/TreeView");
import StatusIndicator = require("VSS/Controls/StatusIndicator");
import Menus = require("VSS/Controls/Menus");
import CtrlCombos = require("VSS/Controls/Combos");
import TreeViewDataService = require("scripts/TreeViewDataService");
import UtilsUI = require("VSS/Utils/UI");
import Q = require("q");
import Common = require("scripts/Common");
import Context = require("VSS/Context");
import CloneTestPlan = require("scripts/CloneTestPlanForm");

export interface TreeviewSelectedCallback { (type: string, value: string, showRecursive: boolean): void }

var constAllTestPlanName = "--- All Test plans ----";

export class TreeviewView {

    private _showRecursive: boolean;
    private _menubar: Menus.MenuBar;
    public _treeview: TreeView.TreeView;
    private _callback: TreeviewSelectedCallback;
    public _currentTestPlan: string;
    public _currentNode: TreeView.TreeNode;
    private _currentSource: string;
    private _waitControl: StatusIndicator.WaitControl;
    private _cboTestPlan: CtrlCombos.Combo;
    private _testPlans: TreeView.TreeNode[];
    private _cboSource: CtrlCombos.Combo;

    public PivotSources: string[] = ["Area path", "Iteration path", "Priority", "State", "Test plan"];

    public initialize(callback: TreeviewSelectedCallback) {
        TelemetryClient.getClient().trackPageView("TreeView");
        var view = this;
        view._showRecursive = false;
        view._callback = callback;

        view._cboSource = view.initSourceCbo();
        view._cboTestPlan = view.initTestPlanCbo();

        var treeOptions: TreeView.ITreeOptions = {
            clickSelects: true,
            nodes: null
        };
       
        var treeview = Controls.create(TreeView.TreeView, $("#treeview-container"), treeOptions);

        treeview.onItemClick = function (node, nodeElement, e) {
            if ((node.text != "Test plans") || (node.text == "Test plans" && node.id)) {
                treeview.setSelectedNode(node);
                view._currentNode = node;
                view._currentSource = view._cboSource.getText();
                if (view._currentNode != null) {
                    view.RefreshGrid();
                }
                view._menubar.updateCommandStates([{ id: "clone-testplan", disabled: view._currentNode.config.type != "TestPlan" }]);
            }
        };

        view.ToggleTestPlanSelectionArea();

        view._treeview = treeview;

        //Add toolbar
        this.initMenu(this);

        //Initilaizer def value
        VSS.getService<IExtensionDataService>(VSS.ServiceIds.ExtensionData).then(function (dataService) {
            // Set value in user scope
            dataService.getValue("SelectedPivot", { scopeType: "User" }).then(function (selectedPivot: any) {
                if (selectedPivot == null || selectedPivot == "") {
                    selectedPivot = view.PivotSources[0];
                }
                
                view._currentSource = selectedPivot;
                view.ToggleTestPlanSelectionArea()
                view._cboSource.setText(selectedPivot);
                view.LoadTreeview(view._cboSource.getText(), treeview, 0);
            })
        });
    }

    private initSourceCbo(): CtrlCombos.Combo{
        var view = this;
        
        var cboOptions: CtrlCombos.IComboOptions = {
            mode: "drop",
            allowEdit: false,
            source: view.PivotSources,
            change:function () {
                view._currentSource = cbo.getText();
                view.ToggleTestPlanSelectionArea()
                view.refreshTreeView(false);
            }
        };
        var cbo = Controls.create(CtrlCombos.Combo, $("#treeview-pivot-Cbo-container "), cboOptions);

        return cbo;
    }

    private initTestPlanCbo(): CtrlCombos.Combo {
        var view = this;

        var cboOTestPlanptions: CtrlCombos.IComboOptions = {
            mode: "drop",
            allowEdit: false,
            change: function() {
                view._currentTestPlan = view._cboTestPlan.getText();
                view.refreshTreeView(false);
            }
        };

        var cboTestPlan = Controls.create(CtrlCombos.Combo, $("#left-cboTestPlan"), cboOTestPlanptions);

        TreeViewDataService.getTestPlans().then(
            data => {
                view._testPlans = data[0].children;
                var nAll = TreeView.TreeNode.create(constAllTestPlanName);

                view._testPlans.push(nAll);
                view._cboTestPlan.setSource(view._testPlans.map(i => { return i.text; }));
                view._cboTestPlan.setSelectedIndex(0);
            },
            err => {
                console.log(err);
                TelemetryClient.getClient().trackException(err);
            }
        );
        
        return cboTestPlan;
    }

    private openTestSuite() {
        var url = VSS.getWebContext().collection.uri;
        var project = VSS.getWebContext().project.name;
        var planId = this._currentNode.config.testPlanId;
        var suiteId = this._currentNode.config.suiteId
        window.parent.location.href = url + project + "/_testManagement?planId=" + planId + "&suiteId=" + suiteId;
    }

    private showNotification(message: String) {
                //this._message.setMessage(message + " is being cloned, you need to refresh to see the completed result.", Notifications.MessageAreaType.Info);
    }

    private cloneTestPlan() {
        var that = this;

        var isHosted: boolean = Context.getPageContext().webAccessConfiguration.isHosted;
        if (!isHosted) {
            alert("The clone operations are currently only supported in Visual Studio Team Services.");
            return;
        }

        //var draggedNode: TreeView.TreeNode = that._treeview.getNodeFromElement(ui.draggable);
        var sourcePlanName: string = that._currentNode.config.name;

        VSS.getService(VSS.ServiceIds.Dialog).then(function (dialogService: IHostDialogService) {

            var cloneTestPlanForm: CloneTestPlan.CloneTestPlanForm;
            var extensionCtx = VSS.getExtensionContext();
            var contributionId = extensionCtx.publisherId + "." + extensionCtx.extensionId + ".clone-testplan-form";

            var dialogOptions = {
                title: "Clone Test Plan",
                width: 600,
                height: 250,
                okText: "Clone",
                getDialogResult: function () {
                    return cloneTestPlanForm ? cloneTestPlanForm.getFormData() : null;
                },
                okCallback: function (result: CloneTestPlan.IFormInput) {
                    //var draggedNode: TreeView.TreeNode = that._treeview.getNodeFromElement(ui.draggable);
                    TreeViewDataService.cloneTestPlan(that._currentNode.config.testPlanId, [], result.newTestPlanName, result.cloneRequirements, result.areaPath, result.iterationPath);
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
    }

    private removePlanOrSuite() {
        var that = this;
        if (this._currentNode.config.type == "TestPlan") {
            if (confirm("Are you sure you want to delete test plan " + this._currentNode.text + "?")) {
                TreeViewDataService.removeTestPlan(this._currentNode.config.testPlanId).then(result => {
                    that.refreshTreeView(false);
                });
            }
        }
        else {
            if (confirm("Are you sure you want to delete test suite " + this._currentNode.text + "?")) {
                TreeViewDataService.removeTestSuite(this._currentNode.config.testPlanId, this._currentNode.config.suiteId).then(result => {
                    that.refreshTreeView(false);
                });
            }
        }
    }

    private ToggleTestPlanSelectionArea()
    {
        if (this._currentSource === "Test plan") {
            $("#left-cboTestPlan-container").show();
        } else {
            $("#left-cboTestPlan-container").hide();
        }
    }

    private getTreeviewNode(node: TreeView.TreeNode, id) {
        if (node.id == id) return node;
        else if (node.children != null) {
            var i = 0;
            var result = null;
            for (i = 0; result == null && i < node.children.length; i++) {
                result = this.getTreeviewNode(node.children[i], id);
            } 
            return result;
        }
        return null;
    }

    public refreshTreeView(keepState: boolean) {
        this.StartLoading(true, "Loading pivot data");
        TelemetryClient.getClient().trackPageView("TreeView." + this._currentSource);

        var id = 0;
        if (keepState && this._treeview.getSelectedNode() != null) {
            id = this._treeview.getSelectedNode().id;
        }
        this.LoadTreeview(this._currentSource, this._treeview, id).then(a => {
            this.DoneLoading();
        });

        VSS.getService<IExtensionDataService>(VSS.ServiceIds.ExtensionData).then(
            dataService => {
                // Set value in user scope
                dataService.setValue("SelectedPivot", this._currentSource, { scopeType: "User" });
            });
    }

    private initMenu(view: TreeviewView) {
        var menuItems: Menus.IMenuItemSpec[] = [
            { id: "show-recursive", showText: false, title: "Show tests from child suites", icon: Common.getToolbarIcon("show-recursive"), cssClass: Common.getToolbarCss() },
            { id: "expand-all", showText: false, title: "Expand all", icon: Common.getToolbarIcon("expand-all"), cssClass: Common.getToolbarCss() },
            { id: "collapse-all", showText: false, title: "Collapse all", icon: Common.getToolbarIcon("collapse-all"), cssClass: Common.getToolbarCss() },
            { id: "open-testsuite", showText: false, title: "Jump to test plan hub", icon: Common.getToolbarIcon("open-testsuite"), cssClass: Common.getToolbarCss() },
            { id: "clone-testplan", showText: false, title: "Clone test plan", icon: Common.getToolbarIcon("clone-testplan"), cssClass: Common.getToolbarCss() },
            { id: "remove", showText: false, title: "Delete", icon: Common.getToolbarIcon("remove"), cssClass: Common.getToolbarCss() },
            { id: "refresh", showText: false, title: "Refresh treeview", icon: Common.getToolbarIcon("refresh"), cssClass: Common.getToolbarCss() }
        ];

        var menubarOptions = {
            items: menuItems,
            executeAction: function (args) {
                var command = args.get_commandName();
                switch (command) {
                    case "show-recursive":
                        view._showRecursive = !view._showRecursive
                        menubar.updateCommandStates([{ id: command, toggled: view._showRecursive }]);
                        view.RefreshGrid();
                        break;
                    case "expand-all":
                        ExpandTree(view._treeview, true);
                        break;
                    case "collapse-all":
                        ExpandTree(view._treeview, false);
                        break;
                    case "open-testsuite":
                        view.openTestSuite();
                        break;
                    case "clone-testplan":
                        view.cloneTestPlan();
                        break;
                    case "remove":
                        view.removePlanOrSuite();
                        break;
                    case "refresh":
                        view.refreshTreeView(true);
                        break;
                    default:
                        alert("Unhandled action: " + command);
                        break;
                }
            }
        };

        var menubar = Controls.create<Menus.MenuBar, any>(Menus.MenuBar, $("#treeview-menu-container"), menubarOptions);
        this._menubar = menubar;
    }

    public RefreshGrid() {
        if (this._currentNode != null) {
            this._callback(this._currentSource, this._currentNode.config, this._showRecursive);
        }
    }

    public StartLoading(longRunning, message) {
        $("body").css("cursor", "progress");

        if (longRunning) {
            var waitControlOptions: StatusIndicator.IWaitControlOptions = {
                target: $(".wait-control-treeview-target"),
                message: message,
                cancellable: false,
                cancelTextFormat: "{0} to cancel",
                cancelCallback: function () {
                    console.log("cancelled");
                }
            };

            this._waitControl = Controls.create(StatusIndicator.WaitControl, $(".wait-control-treeview-target"), waitControlOptions);
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

    public LoadTreeview(pivot: string, treeview: TreeView.TreeView, selectedNodeId: Number): IPromise<any> {
        var deferred = $.Deferred<any>();
        var view = this;

        var disableShowRecursive = (view._currentSource == "Priority" || view._currentSource == "State") ? true : false;
        this._menubar.updateCommandStates([{ id: "show-recursive", toggled: view._showRecursive, disabled: disableShowRecursive }]);

        var hideRemove = (view._currentSource == "Test plan") ? false : true;
        this._menubar.updateCommandStates([{ id: "remove", hidden: hideRemove }]);

        var hideOpenSuite = (view._currentSource == "Test plan") ? false : true;
        this._menubar.updateCommandStates([{ id: "open-testsuite", hidden: hideOpenSuite }]);

        var hideClone = (view._currentSource == "Test plan") ? false : true;
        view._menubar.updateCommandStates([{ id: "clone-testplan", hidden: hideClone, disabled: true }]);

        var tp = null;
        if (this._currentTestPlan !== constAllTestPlanName) {
            tp = this._testPlans[this._cboTestPlan.getSelectedIndex()];
        }

        TreeViewDataService.getNodes(pivot, tp).then(function (data) {
            treeview.rootNode.clear();
            treeview.rootNode.addRange(data);
            treeview._draw();

            var n = treeview.rootNode;

            //Empty other panes 
            //var selectedIndex = (view._currentSource == "Test plan") ? 1 : 0;

            /*
            if (view._currentSource == "Test plan") {
                if (n.children[0].hasChildren) {
                    treeview.setSelectedNode(n.children[0].children[0]);
                    view._currentNode = n.children[0].children[0];
                    view._menubar.updateCommandStates([{ id: "clone-testplan", disabled: view._currentNode.config.type != "TestPlan" }]);
                }
            }
            else {
                treeview.setSelectedNode(n.children[0]);
                view._currentNode = n.children[0];
            }
            */

            var selectedNode = n.children[0];

            if (selectedNodeId != 0) {
                selectedNode = view.getTreeviewNode(n, selectedNodeId);
            }
            if (selectedNode != null) {
                treeview.setSelectedNode(selectedNode);
                view._currentNode = selectedNode;
                selectedNode.selected = true;
                selectedNode.expanded = true;
                if (view._currentSource == "Test plan") {
                    view._menubar.updateCommandStates([{ id: "clone-testplan", disabled: view._currentNode.config.type != "TestPlan" }]);
                }
            }

            view.RefreshGrid();

            n.expanded = true;
            var elem = treeview._getNodeElement(n);
            treeview._setNodeExpansion(n, elem, true);

            treeview.rootNode.children.forEach(n => {
                var elem = treeview._getNodeElement(n);
                treeview._setNodeExpansion(n, elem, true);
            });

            //$("#treeview-container > li.node").droppable({
            $("li.node").droppable({
                scope: "test-case-scope",
                greedy: true,
                tolerance: "pointer",
                //accept: function (d) {
                //    var t = this;
                //    var text = $(this).text;
                //    return true;
                //},
                //over: function (e, ui) {
                //    var target: any = e.target;
                //    console.log("over " + target.title);

                //    var n: TreeView.TreeNode = treeview.getNodeFromElement(e.target);
                    //if (n.type == "Static suite") {
                    //    $(e.target).addClass("drag-hover");
                    //}
                    //else {
                    //    $(e.target).addClass("drag-hover-invalid");
                    //}
                //},
                //out: function (e, ui) {
                //    var target: any = e.target;
                //    console.log("out " + target.title);

                //    //$(e.target).removeClass("drag-hover drag-hover-invalid");
                //},
                drop: function (event: any, ui) {

                    var n: TreeView.TreeNode = treeview.getNodeFromElement(event.target);

                    var action = ui.helper.data("MODE");  // TODO: rename to action
                    var mode = view.getCurrentDragMode(event);

                    switch (action) {
                        case "TEST_CASE":
                            view.processDropTestCase(ui, n, view._currentSource, mode);
                            break;
                        default:    // TODO: verify this should not happen
                            console.log("treeview::drop - undefined action");
                            break;
                    }
                }
            });

            if (view._currentSource == "Test plan"){ 
                $("li.node").draggable({
                    distance: 10,
                    cursorAt: { top: -5, left: -5 },
                    refreshPositions: true,
                    scroll: true,
                    scope: "test-case-scope",
                    //revert: "invalid",
                    appendTo: document.body,
                    helper: function (event, ui) {
                        var title = event.currentTarget.title;
                        var draggedNode = view._treeview.getNodeFromElement(event.currentTarget);

                        var $dragItemTitle = $("<div />").addClass("node-content");
                        var $dragItemIcon = $("<span class='icon tree-node-img' />").addClass(draggedNode.icon);
                        $dragItemTitle.append($dragItemIcon);
                        $dragItemTitle.append($("<span />").text(draggedNode.text));
                        $dragItemTitle.css("width", event.currentTarget.clientWidth);

                        var $dragTile = Common.createDragTile("MOVE", $dragItemTitle);
                        $dragTile.data("PLAN_ID", draggedNode.config);
                        $dragTile.data("SUITE_ID", draggedNode.id);
                        $dragTile.data("MODE", "TEST_SUITE");

                        return $dragTile;
                    }
                });
            } 

            deferred.resolve(data);
        });

        return deferred.promise();
    }
    
    // TODO: refactor to enum
    private getCurrentDragMode(event): string {
        var mode = "MOVE";
        if (event.ctrlKey) mode = "CLONE";
        if (event.shiftKey) mode = "ADD";
        return mode;
    }

    public processDropTestCase(ui, n, pivot, mode) {
        if (pivot != "Test plan") {
            this.UpdateTestCase(ui, n);
        }
    }

    public UpdateTestCase(ui, n) {
        var view = this;

        var tcIds = jQuery.makeArray(ui.helper.data("WORK_ITEM_IDS"));
        var field = null, value;
        switch (view._currentSource) {
            case "Area path":
                field = "System.AreaPath";
                value = n.config.path;
                break;
            case "Iteration path":
                field = "System.IterationPath";
                value = n.config.path;
                break;
            case "Priority":
                field = "Microsoft.VSTS.Common.Priority";
                value = n.config.name;
                break;
            case "State":
                field = "System.State";
                value = n.config.name;
                break;
        }

        if (field != null) {
            var noRemainingAssign = tcIds.length;

            tcIds.forEach(id => {
                var itemDiv = ui.helper.find("." + id);
                var txt = itemDiv.text();
                itemDiv.text("Saving " + txt);
                TreeViewDataService.AssignTestCasesToField(VSS.getWebContext().project.name, id, field, value).then(
                    data => {
                        noRemainingAssign--;
                        if (noRemainingAssign == 0) {
                            view.RefreshGrid();
                        }
                        itemDiv.text("Saved" + txt);
                    },
                    err => {
                        alert(err);
                    });
            });
        }
        else {

            alert("Not supported in this version");
        }
    }
}

function ExpandTree(tree: TreeView.TreeView, nodeExpansion: boolean) {
    UtilsUI.walkTree.call(tree.rootNode, n => {
        var elem = tree._getNodeElement(n);
        tree._setNodeExpansion(n, elem, nodeExpansion);
    });
}