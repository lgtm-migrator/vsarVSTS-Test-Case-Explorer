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
define(["require", "exports", "VSS/Controls", "VSS/Controls/TreeView", "VSS/Controls/StatusIndicator", "VSS/Controls/Menus", "VSS/Controls/Combos", "scripts/TreeViewDataService", "VSS/Utils/UI"], function (require, exports, Controls, TreeView, StatusIndicator, Menus, CtrlCombos, TreeViewDataService, UtilsUI) {
    "use strict";
    var TreeviewView = (function () {
        function TreeviewView() {
        }
        //private _isDragging 
        TreeviewView.prototype.listenToTheKey = function (e) {
            if (e.which === 27 || e.keyCode === 27) {
                console.log("cancelling drag...");
                $("li.node").draggable({ 'revert': true }).trigger('mouseup');
            }
            else {
                var mode = "";
                if (e.ctrlKey) {
                    console.log("clone...");
                    mode = "Clone";
                }
                else if (e.shiftKey) {
                    console.log("add...");
                    mode = "Add";
                }
                else {
                    console.log("move...");
                    mode = "Move";
                }
                var text = $(".drag-tile-drag-type").text();
                if (text != "Attach") {
                    $(".drag-tile-drag-type").text(mode);
                }
            }
        };
        TreeviewView.prototype.initialize = function (callback) {
            TelemetryClient.getClient().trackPageView("TreeView");
            var view = this;
            view._showRecursive = false;
            view._callback = callback;
            var cboSources = ["Area path", "Iteration path", "Priority", "State", "Test plan"];
            //window.onkeypress = this.listenToTheKey;
            //view._treeview.onkeydown = this.listenToTheKey;
            window.onkeydown = this.listenToTheKey;
            window.onkeyup = this.listenToTheKey;
            var cboOptions = {
                mode: "drop",
                allowEdit: false,
                source: cboSources
            };
            var cbo = Controls.create(CtrlCombos.Combo, $("#treeview-Cbo-container"), cboOptions);
            var treeOptions = {
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
            //Hook up change for cbo to redraw treeview
            $("#treeview-Cbo-container").change(function () {
                view._currentSource = cbo.getText();
                view.updateTreeView();
                //view.StartLoading(true, "Loading pivot data");
                //view._currentSource = cbo.getText();
                //TelemetryClient.getClient().trackPageView("TreeView." + cbo.getText());
                //view.LoadTreeview(view._currentSource, treeview).then(a => {
                //    view.DoneLoading()
                //});
                //VSS.getService<IExtensionDataService>(VSS.ServiceIds.ExtensionData).then(
                //    dataService => {
                //        // Set value in user scope
                //        dataService.setValue("SelectedPivot", cbo.getText(), { scopeType: "User" });
                //    });
            });
            view._treeview = treeview;
            //Add toolbar
            this.initMenu(this);
            //Initilaizer def value
            VSS.getService(VSS.ServiceIds.ExtensionData).then(function (dataService) {
                // Set value in user scope
                dataService.getValue("SelectedPivot", { scopeType: "User" }).then(function (selectedPivot) {
                    if (selectedPivot == null || selectedPivot == "") {
                        selectedPivot = cboSources[0];
                    }
                    view._currentSource = selectedPivot;
                    cbo.setText(selectedPivot);
                    view.LoadTreeview(cbo.getText(), treeview);
                });
            });
        };
        TreeviewView.prototype.updateTreeView = function () {
            var _this = this;
            this.StartLoading(true, "Loading pivot data");
            TelemetryClient.getClient().trackPageView("TreeView." + this._currentSource);
            this.LoadTreeview(this._currentSource, this._treeview).then(function (a) {
                _this.DoneLoading();
            });
            VSS.getService(VSS.ServiceIds.ExtensionData).then(function (dataService) {
                // Set value in user scope
                dataService.setValue("SelectedPivot", _this._currentSource, { scopeType: "User" });
            });
        };
        TreeviewView.prototype.initMenu = function (view) {
            //var menuItems: Menus.IMenuItemSpec[] = [
            var menuItems = [
                { id: "show-recursive", showText: false, title: "Show tests from child suites", icon: "child-node-icon" },
                { id: "expand-all", showText: false, title: "Expand all", icon: "bowtie-toggle-expand-all", cssClass: "bowtie-icon" },
                { id: "collapse-all", showText: false, title: "Collapse all", icon: "bowtie-toggle-collapse", cssClass: "bowtie-icon" },
                { id: "refresh", showText: false, title: "Refresh treeview", icon: "bowtie-navigate-refresh", cssClass: "bowtie-icon" }
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
                        case "refresh":
                            view.updateTreeView();
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
        TreeviewView.prototype.LoadTreeview = function (pivot, treeview) {
            var deferred = $.Deferred();
            var view = this;
            var disableShowRecursive = (view._currentSource == "Priority" || view._currentSource == "State") ? true : false;
            this._menubar.updateCommandStates([{ id: "show-recursive", toggled: view._showRecursive, disabled: disableShowRecursive }]);
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
                treeview.rootNode.children.forEach(function (n) {
                    var elem = treeview._getNodeElement(n);
                    treeview._setNodeExpansion(n, elem, true);
                });
                if (view._currentSource == "Test plan") {
                    $("li.node").draggable({
                        scope: "test-case-scope",
                        //           scope: "TCExplorer.TreeView",
                        revert: "invalid",
                        appendTo: document.body,
                        helper: function (event, ui) {
                            var $dragTile;
                            //var draggableItemText, numOfSelectedItems;
                            var title = event.currentTarget.title;
                            var draggedNode = view._treeview.getNodeFromElement(event.currentTarget);
                            //var dummy = {};
                            //dummy["SuiteId"] = view._treeview.getSelectedNode().id;
                            //dummy["Title"] = view._treeview.getSelectedNode().text;
                            //dummy["PlanId"] = view._treeview.getSelectedNode().config;
                            //dummy["Icon"] = view._treeview.getSelectedNode().icon;
                            //var selectedSuites = [dummy];
                            //numOfSelectedItems = selectedSuites.length;
                            $dragTile = $("<div />")
                                .addClass("drag-tile");
                            //var $dragItemCount = $("<div />")
                            //    .addClass("drag-tile-item-count")
                            //    .text(numOfSelectedItems);
                            var $dragItemTitle = $("<div />")
                                .addClass("drag-tile-title")
                                .text(title);
                            var $dragType = $("<span />")
                                .addClass("drag-tile-drag-type")
                                .text("Move");
                            //.text(event.ctrlKey == true ? "Copy" : "Clone");
                            var $dragHead = $("<div />")
                                .addClass("drag-tile-head")
                                .append($dragType)
                                .append($dragItemTitle);
                            //.append($dragItemCount);
                            $dragTile.append($dragHead);
                            //$dragTile.data("DROP_ACTION", "CLONE");
                            //$dragTile.data("PLAN_ID", selectedSuites.map(i => { return i["PlanId"]; }));
                            //$dragTile.data("SUITE_ID", selectedSuites.map(i => { return i["SuiteId"]; }));
                            $dragTile.data("PLAN_ID", draggedNode.config);
                            $dragTile.data("SUITE_ID", draggedNode.id);
                            $dragTile.data("MODE", "TEST_SUITE");
                            //$dragTile.data("MODE", event.ctrlKey == true ? "Clone" : "Attach");
                            //var $dragLst = $("<div />")
                            //    .addClass("drag-tile-list")
                            //selectedSuites.forEach(r => {
                            //    var id = r["SuiteId"];
                            //    $dragLst.append(
                            //        $("<span />").append(
                            //            $("<span />")
                            //                .addClass("icon")
                            //                .addClass("tree-node-img ")
                            //                .addClass(r["Icon"])
                            //                .text("h")
                            //        )
                            //            .text(id + " " + r["Title"])
                            //            .addClass(id)
                            //    );
                            //});
                            //$dragTile.append($dragLst);
                            return $dragTile;
                        },
                        distance: 10,
                        cursorAt: { top: -5, left: -5 },
                        refreshPositions: true,
                        scroll: true,
                        stop: function () {
                            // Set all draggable parts back to revert: false
                            // This fixes elements after drag was cancelled with ESC key
                            $("li.node").draggable("option", { revert: false });
                        }
                    });
                }
                $("li.node").droppable({
                    scope: "test-case-scope",
                    greedy: true,
                    tolerance: "pointer",
                    accept: function (d) {
                        var t = this;
                        var text = $(this).text;
                        return true;
                    },
                    //hoverClass: "drag-hover",
                    over: function (e, ui) {
                        var target = e.target;
                        console.log("over " + target.title);
                        var n = treeview.getNodeFromElement(e.target);
                        //if (n.type == "Static suite") {
                        //    $(e.target).addClass("drag-hover");
                        //}
                        //else {
                        //    $(e.target).addClass("drag-hover-invalid");
                        //}
                        //let dragInfo = getDragInfo(e, ui);
                        //if (dragInfo) {
                        //    $(e.target).addClass("accepted");
                        //} else {
                        //    $(e.target).addClass("rejected");
                        //}
                    },
                    out: function (e, ui) {
                        var target = e.target;
                        console.log("out " + target.title);
                        //$(e.target).removeClass("drag-hover drag-hover-invalid");
                    },
                    drop: function (event, ui) {
                        var n = treeview.getNodeFromElement(event.target);
                        //var draggedNode: TreeView.TreeNode = this._treeview.getNodeFromElement(ui.draggable);
                        //var action = jQuery.makeArray(ui.helper.data("DROP_ACTION")).toString();
                        var action = ui.helper.data("MODE"); // TODO: rename to action
                        //var ids = ui.helper.data("WORK_ITEM_IDS");
                        var mode = view.getCurrentDragMode(event);
                        switch (action) {
                            case "TEST_SUITE":
                                view.processDropTestSuite(ui, n, mode);
                                break;
                            case "TEST_CASE":
                                view.processDropTestCase(ui, n, view._currentSource, mode);
                                break;
                            default:
                                console.log("treeview::drop - undefined action");
                                break;
                        }
                    }
                });
                deferred.resolve(data);
            });
            return deferred.promise();
        };
        // TODO: refactor to enum
        TreeviewView.prototype.getCurrentDragMode = function (event) {
            var mode = "MOVE";
            if (event.ctrlKey)
                mode = "CLONE";
            if (event.shiftKey)
                mode = "ADD";
            return mode;
        };
        TreeviewView.prototype.processDropTestSuite = function (ui, n, mode) {
            var _this = this;
            var draggedNode = this._treeview.getNodeFromElement(ui.draggable);
            draggedNode.config.name;
            var sourcePlanName = draggedNode.config.name;
            var sourcePlanId = draggedNode.config.testPlanId;
            var sourceSuiteId = draggedNode.config.suiteId;
            var targetPlanId = n.config.testPlanId;
            var targetSuiteId = n.config.suiteId;
            console.log("source plan name: " + sourcePlanName);
            console.log("source plan id: " + sourcePlanId);
            console.log("source suite id: " + sourceSuiteId);
            console.log("mode: " + mode);
            console.log("target plan id: " + targetPlanId);
            console.log("target suite id: " + targetSuiteId);
            if (confirm("Are you sure you want to " + mode + " '" + sourcePlanName + "' to '" + n.config.name + "'?")) {
                switch (mode) {
                    case "MOVE":
                        TreeViewDataService.addTestSuite(sourcePlanId, sourceSuiteId, targetPlanId, targetSuiteId).then(function (result) {
                            TreeViewDataService.removeTestSuite(sourcePlanId, sourceSuiteId).then(function (result) {
                                //this.updateTreeView();
                                //this.updateGrid?
                            });
                        });
                        break;
                    case "CLONE":
                        TreeViewDataService.cloneTestSuite(sourcePlanId, sourceSuiteId, targetPlanId, targetSuiteId).then(function (result) {
                            // TODO: kolla om det finns target suite med samma namn?
                            var node = new TreeView.TreeNode(sourcePlanName);
                            //node.icon = icon-from-source-node?;
                            //node.id = id-from-clone-op?;
                            //node.config = { name: item.name, path: itemPath, testPlanId: item.testPlanId };
                            n.add(node);
                            _this._treeview.updateNode(n);
                            // TODO: update progress
                            // TODO: refresh tree when complete
                            //view.updateTreeView();
                        });
                        break;
                    case "ADD":
                        TreeViewDataService.addTestSuite(sourcePlanId, sourceSuiteId, targetPlanId, targetSuiteId).then(function (result) {
                            //this.updateTreeView();
                        });
                        break;
                }
            }
            else {
                // TODO: best way to cancel drag?
                $("li.node").draggable({ 'revert': true }).trigger('mouseup');
            }
        };
        TreeviewView.prototype.processDropTestCase = function (ui, n, pivot, mode) {
            if (pivot == "Test plan") {
                this.AssociateTestCase(ui, n, mode);
            }
            else {
                this.UpdateTestCase(ui, n);
            }
        };
        TreeviewView.prototype.AssociateTestCase = function (ui, n, mode) {
            var view = this;
            var tcIds = jQuery.makeArray(ui.helper.data("WORK_ITEM_IDS"));
            var targetPlanId = n.config.testPlanId;
            var targetSuiteId = n.config.suiteId;
            var sourcePlanId = view._currentNode.config.testPlanId;
            var sourceSuiteId = view._currentNode.config.suiteId;
            console.log("source plan id: " + sourcePlanId);
            console.log("source suite id: " + sourceSuiteId);
            console.log("target plan id: " + targetPlanId);
            console.log("target suite id: " + targetSuiteId);
            console.log("ids: " + tcIds.join(","));
            switch (mode) {
                case "MOVE":
                    TreeViewDataService.addTestCasesToSuite(targetPlanId, targetSuiteId, tcIds.join(",")).then(function (result) {
                        TreeViewDataService.removeTestCaseFromSuite(sourcePlanId, sourceSuiteId, tcIds.join(",")).then(function (result) {
                            view.updateTreeView();
                        });
                    });
                    break;
                case "CLONE":
                    alert("Clone tc to suite - not implemented!");
                    break;
                case "ADD":
                    TreeViewDataService.addTestCasesToSuite(targetPlanId, targetSuiteId, tcIds.join(",")).then(function (result) {
                        view.updateTreeView();
                    });
                    break;
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