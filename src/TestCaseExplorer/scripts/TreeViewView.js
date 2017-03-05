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
define(["require", "exports", "VSS/Controls", "VSS/Controls/TreeView", "VSS/Controls/StatusIndicator", "VSS/Controls/Menus", "VSS/Controls/Combos", "scripts/TreeViewDataService", "VSS/Utils/UI", "scripts/Common", "VSS/Context", "scripts/TelemetryClient"], function (require, exports, Controls, TreeView, StatusIndicator, Menus, CtrlCombos, TreeViewDataService, UtilsUI, Common, Context, TelemetryClient) {
    "use strict";
    var constAllTestPlanName = "--- All Test plans ----";
    var const_Pivot_TestPlan = "Test plan";
    var const_Pivot_Priority = "Priority";
    var TreeviewView = (function () {
        function TreeviewView() {
            this.PivotSources = ["Area path", "Iteration path", const_Pivot_Priority, "State", const_Pivot_TestPlan];
        }
        TreeviewView.prototype.initialize = function (callback) {
            TelemetryClient.TelemetryClient.getClient().trackPageView("TreeView");
            var view = this;
            view._showRecursive = false;
            view._callback = callback;
            view._cboSource = view.initSourceCbo();
            view._cboTestPlan = view.initTestPlanCbo();
            var treeOptions = {
                clickSelects: true,
                nodes: null,
                droppable: {
                    scope: "test-case-scope",
                    greedy: true,
                    tolerance: "pointer",
                    over: function (e, ui) {
                        console.log("enter over with targer =" + e.target.title + "org target text" + e.originalEvent.target.textContent);
                        if (e.target.title === e.originalEvent.target.textContent) {
                            view.droppableOver($(this), e, ui);
                        }
                        var target = e.target;
                    },
                    out: function (e, ui) {
                        var target = e.target;
                        console.log("out " + target.title);
                    },
                    drop: function (event, ui) {
                        var n = view._treeview.getNodeFromElement(event.target);
                        if (view.acceptDropTest(n, ui)) {
                            var action = ui.helper.data("MODE"); // TODO: rename to action
                            var mode = view.getCurrentDragMode(event);
                            switch (action) {
                                case "TEST_CASE":
                                    view.processDropTestCase(ui, n, view._currentSource, mode);
                                    break;
                                default:
                                    console.log("treeview::drop - undefined action");
                                    break;
                            }
                        }
                    }
                },
                draggable: {
                    distance: 10,
                    cursorAt: { top: -5, left: -5 },
                    refreshPositions: true,
                    scroll: true,
                    scope: "test-case-scope",
                    containment: "",
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
                }
            };
            view._treeview = Controls.create(TreeView.TreeView, $("#treeview-container"), treeOptions);
            view._treeview.onItemClick = function (node, nodeElement, e) {
                if ((node.text != "Test plans") || (node.text == "Test plans" && node.id)) {
                    view._treeview.setSelectedNode(node);
                    view._currentNode = node;
                    view._currentSource = view._cboSource.getText();
                    if (view._currentNode != null) {
                        view.RefreshGrid();
                    }
                    view._menubar.updateCommandStates([{ id: "clone-testplan", disabled: view._currentNode.config.type != "TestPlan" }]);
                }
            };
            view.ToggleTestPlanSelectionArea();
            //Add toolbar
            this.initMenu(this);
            //Initilaizer def value
            VSS.getService(VSS.ServiceIds.ExtensionData).then(function (dataService) {
                // Set value in user scope
                dataService.getValue("SelectedPivot", { scopeType: "User" }).then(function (selectedPivot) {
                    if (selectedPivot == null || selectedPivot == "") {
                        selectedPivot = view.PivotSources[0];
                    }
                    view._currentSource = selectedPivot;
                    view.ToggleTestPlanSelectionArea();
                    view._cboSource.setText(selectedPivot);
                    view.LoadTreeview(view._cboSource.getText(), view._treeview, 0);
                });
            });
        };
        TreeviewView.prototype.acceptDropTest = function (node, ui) {
            var dropAllowed = false;
            console.log(node.text);
            console.log(node.text != this._currentSource);
            switch (this._currentSource) {
                case const_Pivot_Priority:
                    if (node && node.text != this._currentSource) {
                        dropAllowed = true;
                    }
                    break;
                case const_Pivot_TestPlan:
                    if (node && node.type === "StaticTestSuite") {
                        if (node.id !== ui.helper.data("SUITE_ID")) {
                            dropAllowed = true;
                        }
                    }
                    break;
                default:
                    dropAllowed = true;
            }
            return dropAllowed;
        };
        TreeviewView.prototype.droppableOver = function ($node, event, ui) {
            var node = this._treeview._getNode($node);
            var $dragElem = ui.helper;
            var dropAllowed = this.acceptDropTest(node, ui);
            var dropTargetTxt = "";
            if (this._currentSource == const_Pivot_TestPlan) {
                dropTargetTxt = "static suites";
            }
            else {
                dropTargetTxt = this._currentSource + " values";
            }
            if (!dropAllowed) {
                //Vi försöker släppa på nåt annat än static
                console.log("Hide");
                $dragElem.find(".drop-allowed").hide();
                $dragElem.find(".drop-not-allowed").show();
                $dragElem.find(".drop-not-allowed-message").text("You can only " + this.getCurrentDragMode(event).toLowerCase() + " to " + dropTargetTxt);
            }
            else {
                if (this._currentSource == const_Pivot_TestPlan && node.id === ui.helper.data("SUITE_ID")) {
                    $dragElem.find(".drop-allowed").hide();
                    $dragElem.find(".drop-not-allowed").show();
                    $dragElem.find(".drop-not-allowed-message").text("You can not " + this.getCurrentDragMode(event).toLowerCase() + " to self");
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
        };
        TreeviewView.prototype.initSourceCbo = function () {
            var view = this;
            var cboOptions = {
                mode: "drop",
                allowEdit: false,
                source: view.PivotSources,
                change: function () {
                    view._currentSource = cbo.getText();
                    view.ToggleTestPlanSelectionArea();
                    view.refreshTreeView(false);
                }
            };
            var cbo = Controls.create(CtrlCombos.Combo, $("#treeview-pivot-Cbo-container "), cboOptions);
            return cbo;
        };
        TreeviewView.prototype.initTestPlanCbo = function () {
            var view = this;
            var cboOTestPlanptions = {
                mode: "drop",
                allowEdit: false,
                change: function () {
                    view._currentTestPlan = view._cboTestPlan.getText();
                    view.refreshTreeView(false);
                }
            };
            var cboTestPlan = Controls.create(CtrlCombos.Combo, $("#left-cboTestPlan"), cboOTestPlanptions);
            TreeViewDataService.getTestPlans().then(function (data) {
                view._testPlans = data[0].children;
                var nAll = TreeView.TreeNode.create(constAllTestPlanName);
                view._testPlans.push(nAll);
                view._cboTestPlan.setSource(view._testPlans.map(function (i) { return i.text; }));
                view._cboTestPlan.setSelectedIndex(0);
            }, function (err) {
                console.log(err);
                TelemetryClient.TelemetryClient.getClient().trackException(err);
            });
            return cboTestPlan;
        };
        TreeviewView.prototype.openTestSuite = function () {
            var url = VSS.getWebContext().collection.uri;
            var project = VSS.getWebContext().project.name;
            var planId = this._currentNode.config.testPlanId;
            var suiteId = this._currentNode.config.suiteId;
            window.parent.location.href = url + project + "/_testManagement?planId=" + planId + "&suiteId=" + suiteId;
        };
        TreeviewView.prototype.showNotification = function (message) {
            //this._message.setMessage(message + " is being cloned, you need to refresh to see the completed result.", Notifications.MessageAreaType.Info);
        };
        TreeviewView.prototype.cloneTestPlan = function () {
            var that = this;
            var isHosted = Context.getPageContext().webAccessConfiguration.isHosted;
            if (!isHosted) {
                alert("The clone operations are currently only supported in Visual Studio Team Services.");
                return;
            }
            //var draggedNode: TreeView.TreeNode = that._treeview.getNodeFromElement(ui.draggable);
            var sourcePlanName = that._currentNode.config.name;
            VSS.getService(VSS.ServiceIds.Dialog).then(function (dialogService) {
                var cloneTestPlanForm;
                var extensionCtx = VSS.getExtensionContext();
                var contributionId = extensionCtx.publisherId + "." + extensionCtx.extensionId + ".clone-testplan-form";
                var dialogOptions = {
                    title: "Clone Test Plan",
                    width: 400,
                    height: 500,
                    okText: "Clone",
                    getDialogResult: function () {
                        return cloneTestPlanForm ? cloneTestPlanForm.getFormData() : null;
                    },
                    okCallback: function (result) {
                        //var draggedNode: TreeView.TreeNode = that._treeview.getNodeFromElement(ui.draggable);
                        TreeViewDataService.cloneTestPlan(that._currentNode.config.testPlanId, [], result.newTestPlanName, result.cloneRequirements, result.areaPath, result.iterationPath);
                        that.showNotification("Test plan " + result.newTestPlanName);
                    }
                };
                dialogService.openDialog(contributionId, dialogOptions).then(function (dialog) {
                    dialog.getContributionInstance("clone-testplan-form").then(function (cloneTestPlanFormInstance) {
                        cloneTestPlanFormInstance.init(sourcePlanName);
                        // Subscribe to form input changes and update the Ok enabled state
                        cloneTestPlanFormInstance.attachFormChanged(function (isValid) {
                            dialog.updateOkButton(isValid);
                        });
                        cloneTestPlanFormInstance.isFormValid()["then"](function (isValid) {
                            dialog.updateOkButton(isValid);
                        });
                    });
                });
            });
        };
        TreeviewView.prototype.removePlanOrSuite = function () {
            var that = this;
            if (this._currentNode.config.type == "TestPlan") {
                if (confirm("Are you sure you want to delete test plan " + this._currentNode.text + "?")) {
                    TreeViewDataService.removeTestPlan(this._currentNode.config.testPlanId).then(function (result) {
                        that.refreshTreeView(false);
                    });
                }
            }
            else {
                if (confirm("Are you sure you want to delete test suite " + this._currentNode.text + "?")) {
                    TreeViewDataService.removeTestSuite(this._currentNode.config.testPlanId, this._currentNode.config.suiteId).then(function (result) {
                        that.refreshTreeView(false);
                    });
                }
            }
        };
        TreeviewView.prototype.ToggleTestPlanSelectionArea = function () {
            if (this._currentSource === const_Pivot_TestPlan) {
                $("#left-cboTestPlan-container").show();
            }
            else {
                $("#left-cboTestPlan-container").hide();
            }
        };
        TreeviewView.prototype.getTreeviewNode = function (node, id) {
            if (node.id == id)
                return node;
            else if (node.children != null) {
                var i = 0;
                var result = null;
                for (i = 0; result == null && i < node.children.length; i++) {
                    result = this.getTreeviewNode(node.children[i], id);
                }
                return result;
            }
            return null;
        };
        TreeviewView.prototype.refreshTreeView = function (keepState) {
            var _this = this;
            this.StartLoading(true, "Loading pivot data");
            TelemetryClient.TelemetryClient.getClient().trackPageView("TreeView." + this._currentSource);
            var id = 0;
            if (keepState && this._treeview.getSelectedNode() != null) {
                id = this._treeview.getSelectedNode().id;
            }
            this.LoadTreeview(this._currentSource, this._treeview, id).then(function (a) {
                _this.DoneLoading();
            });
            VSS.getService(VSS.ServiceIds.ExtensionData).then(function (dataService) {
                // Set value in user scope
                dataService.setValue("SelectedPivot", _this._currentSource, { scopeType: "User" });
            });
        };
        TreeviewView.prototype.initMenu = function (view) {
            var menuItems = [
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
                            view._showRecursive = !view._showRecursive;
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
            var menubar = Controls.create(Menus.MenuBar, $("#treeview-menu-container"), menubarOptions);
            this._menubar = menubar;
        };
        TreeviewView.prototype.RefreshGrid = function () {
            if (this._currentNode != null) {
                this._callback(this._currentSource, this._currentNode.config, this._showRecursive);
            }
        };
        TreeviewView.prototype.StartLoading = function (longRunning, message) {
            $("body").css("cursor", "progress");
            if (longRunning) {
                var waitControlOptions = {
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
        };
        TreeviewView.prototype.DoneLoading = function () {
            $("body").css("cursor", "default");
            if (this._waitControl != null) {
                this._waitControl.cancelWait();
                this._waitControl.endWait();
                this._waitControl = null;
            }
        };
        TreeviewView.prototype.LoadTreeview = function (pivot, treeview, selectedNodeId) {
            var deferred = $.Deferred();
            var view = this;
            var disableShowRecursive = (view._currentSource == const_Pivot_Priority || view._currentSource == "State") ? true : false;
            this._menubar.updateCommandStates([{ id: "show-recursive", toggled: view._showRecursive, disabled: disableShowRecursive }]);
            var hideRemove = (view._currentSource == const_Pivot_TestPlan) ? false : true;
            this._menubar.updateCommandStates([{ id: "remove", hidden: hideRemove }]);
            var hideOpenSuite = (view._currentSource == const_Pivot_TestPlan) ? false : true;
            this._menubar.updateCommandStates([{ id: "open-testsuite", hidden: hideOpenSuite }]);
            var hideClone = (view._currentSource == const_Pivot_TestPlan) ? false : true;
            view._menubar.updateCommandStates([{ id: "clone-testplan", hidden: hideClone, disabled: true }]);
            var tp = null;
            if (this._currentTestPlan !== constAllTestPlanName) {
                tp = this._testPlans[this._cboTestPlan.getSelectedIndex()];
            }
            TreeViewDataService.getNodes(pivot, tp).then(function (data) {
                treeview.rootNode.clear();
                treeview.rootNode.addRange(data);
                treeview.updateNode(treeview.rootNode);
                //treeview._draw();
                var n = treeview.rootNode;
                var selectedNode = n.children[0];
                if (selectedNodeId != 0) {
                    selectedNode = view.getTreeviewNode(n, selectedNodeId);
                }
                if (selectedNode != null) {
                    treeview.setSelectedNode(selectedNode);
                    view._currentNode = selectedNode;
                    selectedNode.selected = true;
                    selectedNode.expanded = true;
                    if (view._currentSource == const_Pivot_TestPlan) {
                        view._menubar.updateCommandStates([{ id: "clone-testplan", disabled: view._currentNode.config.type != "TestPlan" }]);
                    }
                }
                view.RefreshGrid();
                n.expanded = true;
                var elem = treeview._getNodeElement(n);
                treeview._setNodeExpansion(n, elem, true);
                treeview.rootNode.children.forEach(function (n) {
                    var elem = treeview._getNodeElement(n);
                    treeview._setNodeExpansion(n, elem, true);
                });
                //if (view._currentSource == const_Pivot_TestPlan){ 
                //    $("#treeview-container li.node").draggable({
                //        distance: 10,
                //        cursorAt: { top: -5, left: -5 },
                //        refreshPositions: true,
                //        scroll: true,
                //        scope: "test-case-scope",
                //        //revert: "invalid",
                //        appendTo: document.body,
                //        helper: function (event, ui) {
                //            var title = event.currentTarget.title;
                //            var draggedNode = view._treeview.getNodeFromElement(event.currentTarget);
                //            var $dragItemTitle = $("<div />").addClass("node-content");
                //            var $dragItemIcon = $("<span class='icon tree-node-img' />").addClass(draggedNode.icon);
                //            $dragItemTitle.append($dragItemIcon);
                //            $dragItemTitle.append($("<span />").text(draggedNode.text));
                //            $dragItemTitle.css("width", event.currentTarget.clientWidth);
                //            var $dragTile = Common.createDragTile("MOVE", $dragItemTitle);
                //            $dragTile.data("PLAN_ID", draggedNode.config);
                //            $dragTile.data("SUITE_ID", draggedNode.id);
                //            $dragTile.data("MODE", "TEST_SUITE");
                //            return $dragTile;
                //        }
                //    });
                //} 
                deferred.resolve(data);
            });
            return deferred.promise();
        };
        // TODO: refactor to enum
        TreeviewView.prototype.getCurrentDragMode = function (event) {
            var mode = "";
            if (this._currentSource == const_Pivot_TestPlan) {
                mode = "MOVE";
                if (event.ctrlKey)
                    mode = "CLONE";
                if (event.shiftKey)
                    mode = "ADD";
            }
            else {
                mode = "Assign";
            }
            return mode;
        };
        TreeviewView.prototype.processDropTestCase = function (ui, n, pivot, mode) {
            if (pivot != const_Pivot_TestPlan) {
                this.UpdateTestCase(ui, n);
            }
        };
        TreeviewView.prototype.UpdateTestCase = function (ui, n) {
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
                case const_Pivot_Priority:
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
                tcIds.forEach(function (id) {
                    var itemDiv = ui.helper.find("." + id);
                    var txt = itemDiv.text();
                    itemDiv.text("Saving " + txt);
                    TreeViewDataService.AssignTestCasesToField(VSS.getWebContext().project.name, id, field, value).then(function (data) {
                        noRemainingAssign--;
                        if (noRemainingAssign == 0) {
                            view.RefreshGrid();
                        }
                        itemDiv.text("Saved" + txt);
                    }, function (err) {
                        alert(err);
                    });
                });
            }
            else {
                alert("Not supported in this version");
            }
        };
        return TreeviewView;
    }());
    exports.TreeviewView = TreeviewView;
    function ExpandTree(tree, nodeExpansion) {
        UtilsUI.walkTree.call(tree.rootNode, function (n) {
            var elem = tree._getNodeElement(n);
            tree._setNodeExpansion(n, elem, nodeExpansion);
        });
    }
});
//# sourceMappingURL=TreeViewView.js.map