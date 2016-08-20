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
define(["require", "exports", "VSS/Controls", "VSS/Controls/TreeView", "VSS/Controls/StatusIndicator", "VSS/Controls/Menus", "VSS/Controls/Combos", "scripts/TreeViewDataService", "VSS/Utils/UI", "scripts/Common"], function (require, exports, Controls, TreeView, StatusIndicator, Menus, CtrlCombos, TreeViewDataService, UtilsUI, Common) {
    "use strict";
    var TreeviewView = (function () {
        function TreeviewView() {
        }
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
            $("#treeview-Cbo-container").change(function () {
                view._currentSource = cbo.getText();
                view.updateTreeView();
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
        TreeviewView.prototype.openTestSuite = function () {
            var url = VSS.getWebContext().collection.uri;
            var project = VSS.getWebContext().project.name;
            var planId = this._currentNode.config.testPlanId;
            var suiteId = this._currentNode.config.suiteId;
            window.parent.location.href = url + project + "/_testManagement?planId=" + planId + "&suiteId=" + suiteId;
        };
        TreeviewView.prototype.removePlanOrSuite = function () {
            if (confirm("Are you sure you want to delete test suite " + this._currentNode.text + "?")) {
                TreeViewDataService.removeTestSuite(this._currentNode.config.testPlanId, this._currentNode.config.suiteId);
            }
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
            var menuItems = [
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
                        case "remove":
                            view.removePlanOrSuite();
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
                treeview.rootNode.children.forEach(function (n) {
                    var elem = treeview._getNodeElement(n);
                    treeview._setNodeExpansion(n, elem, true);
                });
                if (view._currentSource == "Test plan") {
                    $("li.node").draggable({
                        scope: "test-case-scope",
                        revert: "invalid",
                        appendTo: document.body,
                        helper: function (event, ui) {
                            var $dragTile;
                            var title = event.currentTarget.title;
                            var draggedNode = view._treeview.getNodeFromElement(event.currentTarget);
                            $dragTile = $("<div />")
                                .addClass("drag-tile");
                            var $dragItemTitle = $("<div />")
                                .addClass("drag-tile-title")
                                .text(title);
                            var $dragType = $("<span />")
                                .addClass("drag-tile-drag-type")
                                .text("Move");
                            var $dragHead = $("<div />")
                                .addClass("drag-tile-head")
                                .append($dragType)
                                .append($dragItemTitle);
                            $dragTile.append($dragHead);
                            $dragTile.data("PLAN_ID", draggedNode.config);
                            $dragTile.data("SUITE_ID", draggedNode.id);
                            $dragTile.data("MODE", "TEST_SUITE");
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
                    },
                    out: function (e, ui) {
                        var target = e.target;
                        console.log("out " + target.title);
                        //$(e.target).removeClass("drag-hover drag-hover-invalid");
                    },
                    drop: function (event, ui) {
                        var n = treeview.getNodeFromElement(event.target);
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
        TreeviewView.prototype.processDropTestCase = function (ui, n, pivot, mode) {
            if (pivot != "Test plan") {
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