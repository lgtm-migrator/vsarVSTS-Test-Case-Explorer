﻿//---------------------------------------------------------------------
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

export interface TreeviewSelectedCallback { (type: string, value: string, showRecursive: boolean): void }

export class TreeviewView {

    private _showRecursive: boolean;
    private _menubar: Menus.MenuBar;
    public _treeview: TreeView.TreeView;
    private _callback: TreeviewSelectedCallback;
    public _currentNode: TreeView.TreeNode;
    private _currentSource: string;
    private _waitControl: StatusIndicator.WaitControl;

   

    public initialize(callback: TreeviewSelectedCallback) {
        TelemetryClient.getClient().trackPageView("TreeView");
        var view = this;
        view._showRecursive = false;
        view._callback = callback;

        var cboSources = ["Area path", "Iteration path", "Priority", "State", "Test plan"];
        var cboOptions: CtrlCombos.IComboOptions = {
            mode: "drop",
            allowEdit: false,
            source: cboSources
        };
        var cbo = Controls.create(CtrlCombos.Combo, $("#treeview-Cbo-container"), cboOptions);

        var treeOptions: TreeView.ITreeOptions = {
            clickSelects: true,
            nodes: null
        };
        var treeview = Controls.create(TreeView.TreeView, $("#treeview-container"), treeOptions);

        treeview.onItemClick = function (node, nodeElement, e) {
            if ((node.text != "Test plans") || (node.text == "Test plans" && node.id)) {
                treeview.setSelectedNode(node);
                view._currentNode = node;
                view._currentSource = cbo.getText();
                if (view._currentNode != null) {
                    view.RefreshGrid();
                }
            }
        };

        $("#treeview-Cbo-container").change(function () {
            view._currentSource = cbo.getText();
            view.refreshTreeView();
        });

        view._treeview = treeview;

        //Add toolbar
        this.initMenu(this);

        //Initilaizer def value
        VSS.getService<IExtensionDataService>(VSS.ServiceIds.ExtensionData).then(function (dataService) {
            // Set value in user scope
            dataService.getValue("SelectedPivot", { scopeType: "User" }).then(function (selectedPivot: any) {
                if (selectedPivot == null || selectedPivot == "") {
                    selectedPivot = cboSources[0];
                }
                view._currentSource = selectedPivot;

                cbo.setText(selectedPivot);
                view.LoadTreeview(cbo.getText(), treeview);
            })
        });
    }
    
    private openTestSuite() {
        var url = VSS.getWebContext().collection.uri;
        var project = VSS.getWebContext().project.name;
        var planId = this._currentNode.config.testPlanId;
        var suiteId = this._currentNode.config.suiteId
        window.parent.location.href = url + project + "/_testManagement?planId=" + planId + "&suiteId=" + suiteId;
    }

    private removePlanOrSuite() {
        if (confirm("Are you sure you want to delete test suite " + this._currentNode.text + "?")) {
            TreeViewDataService.removeTestSuite(this._currentNode.config.testPlanId, this._currentNode.config.suiteId);
        }
    }

    public refreshTreeView() {
        this.StartLoading(true, "Loading pivot data");
        TelemetryClient.getClient().trackPageView("TreeView." + this._currentSource);
        this.LoadTreeview(this._currentSource, this._treeview).then(a => {
            this.DoneLoading()
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
            { id: "open-testsuite", showText: false, title: "Jump to test plan", icon: Common.getToolbarIcon("open-testsuite"), cssClass: Common.getToolbarCss() },
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
                    case "remove":
                        view.removePlanOrSuite();
                        break;
                    case "refresh":
                        view.refreshTreeView();
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

    public LoadTreeview(pivot: string, treeview: TreeView.TreeView): IPromise<any> {
        var deferred = $.Deferred<any>();
        var view = this;

        var disableShowRecursive = (view._currentSource == "Priority" || view._currentSource == "State") ? true : false;
        this._menubar.updateCommandStates([{ id: "show-recursive", toggled: view._showRecursive, disabled: disableShowRecursive }]);

        var hideRemove = (view._currentSource == "Test plan") ? false : true;
        this._menubar.updateCommandStates([{ id: "remove", hidden: hideRemove }]);

        var hideOpenSuite = (view._currentSource == "Test plan") ? false : true;
        this._menubar.updateCommandStates([{ id: "open-testsuite", hidden: hideOpenSuite }]);

        TreeViewDataService.getNodes(pivot).then(function (data) {
            treeview.rootNode.clear();
            treeview.rootNode.addRange(data);
            treeview._draw();

            var n = treeview.rootNode;

            //Empty other panes 
            var selectedIndex = (view._currentSource == "Test plan") ? 1 : 0;
            if (view._currentSource == "Test plan") {
                if (n.children[0].hasChildren) {
                    treeview.setSelectedNode(n.children[0].children[0]);
                    view._currentNode = n.children[0].children[0];
                }
            }
            else {
                treeview.setSelectedNode(n.children[0]);
                view._currentNode = n.children[0];
            }

            view.RefreshGrid();

            var elem = treeview._getNodeElement(n);
            treeview._setNodeExpansion(n, elem, true);

            treeview.rootNode.children.forEach(n => {
                var elem = treeview._getNodeElement(n);
                treeview._setNodeExpansion(n, elem, true);
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