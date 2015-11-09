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
    var TreeviewView = (function () {
        function TreeviewView() {
        }
        TreeviewView.prototype.initialize = function (callback) {
            var view = this;
            view._showRecursive = false;
            view._callback = callback;
            var cboSources = ["Area path", "Iteration path", "Priority", "State", "Test plan"];
            var cbo = Controls.create(CtrlCombos.Combo, $("#treeview-Cbo-container"), {
                mode: "drop",
                allowEdit: false,
                source: cboSources
            });
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
            //Hock up chnage for cbo to redraw treeview
            $("#treeview-Cbo-container").change(function () {
                view.StartLoading(true, "Loading pivot data");
                view._currentSource = cbo.getText();
                view.LoadTreeview(view._currentSource, treeview).then(function (a) {
                    view.DoneLoading();
                });
                VSS.getService(VSS.ServiceIds.ExtensionData).then(function (dataService) {
                    // Set value in user scope
                    dataService.setValue("SelectedPivot", cbo.getText(), { scopeType: "User" });
                });
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
        TreeviewView.prototype.initMenu = function (view) {
            //var menuItems: Menus.IMenuItemSpec[] = [
            var menuItems = [
                { id: "show-recursive", showText: false, title: "Show tests from child suites", icon: "img/Child-node-icon.png" },
                { id: "expand-all", showText: false, title: "Expand all", icon: "icon-tree-expand-all" },
                { id: "collapse-all", showText: false, title: "Collapse all", icon: "icon-tree-collapse-all" },
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
            TreeViewDataService.getNodes(pivot).then(function (data) {
                treeview.rootNode.clear();
                treeview.rootNode.addRange(data);
                treeview._draw();
                var n = treeview.rootNode;
                //Empty other panes 
                treeview.setSelectedNode(n.children[0]);
                view._currentNode = n.children[0];
                view.RefreshGrid();
                var elem = treeview._getNodeElement(n);
                treeview._setNodeExpansion(n, elem, true);
                treeview.rootNode.children.forEach(function (n) {
                    var elem = treeview._getNodeElement(n);
                    treeview._setNodeExpansion(n, elem, true);
                });
                $("li.node").droppable({
                    scope: "test-case-scope",
                    greedy: true,
                    tolerance: "pointer",
                    hoverClass: "droppable-hover",
                    drop: function (event, ui) {
                        var n = treeview.getNodeFromElement(event.target);
                        var tcIds = jQuery.makeArray(ui.helper.data("WORK_ITEM_IDS"));
                        var field, value;
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
                                ;
                            }, function (err) {
                                alert(err);
                            });
                        });
                    }
                });
                deferred.resolve(data);
            });
            return deferred.promise();
        };
        return TreeviewView;
    })();
    exports.TreeviewView = TreeviewView;
    function ExpandTree(tree, nodeExpansion) {
        UtilsUI.walkTree.call(tree.rootNode, function (n) {
            var elem = tree._getNodeElement(n);
            tree._setNodeExpansion(n, elem, nodeExpansion);
        });
    }
});
//# sourceMappingURL=TreeViewView.js.map