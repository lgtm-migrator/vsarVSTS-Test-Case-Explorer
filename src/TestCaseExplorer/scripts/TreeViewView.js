/// <reference path='ref/jquery.d.ts' />
/// <reference path='ref/VSS.d.ts' />
define(["require", "exports", "VSS/Controls", "VSS/Controls/TreeView", "VSS/Controls/Menus", "VSS/Controls/Combos", "scripts/TreeViewDataService", "VSS/Utils/UI"], function (require, exports, Controls, TreeView, Menus, CtrlCombos, TreeViewDataService, UtilsUI) {
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
                width: 400,
                height: "100%",
                clickSelects: true,
                nodes: null
            };
            var treeview = Controls.create(TreeView.TreeView, $("#treeview-container"), treeOptions);
            treeview.onItemClick = function (node, nodeElement, e) {
                treeview.setSelectedNode(node);
                view._currentNode = node;
                view._currentSource = cbo.getText();
                view._callback(view._currentSource, view._currentNode.config, view._showRecursive);
            };
            //Hock up chnage for cbo to redraw treeview
            $("#treeview-Cbo-container").change(function () {
                LoadTreeview(cbo.getText(), treeview);
                VSS.getService(VSS.ServiceIds.ExtensionData).then(function (dataService) {
                    // Set value in user scope
                    dataService.setValue("SelectedPivot", cbo.getText(), { scopeType: "User" }).then(function (selectedPivot) {
                    });
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
                    cbo.setText(selectedPivot);
                    LoadTreeview(cbo.getText(), treeview);
                });
            });
        };
        TreeviewView.prototype.initMenu = function (view) {
            //var menuItems: Menus.IMenuItemSpec[] = [
            var menuItems = [
                { id: "show-recursive", showText: false, icon: VSS.getExtensionContext().baseUri + "/img/Child-node-icon.png" },
                { id: "expand-all", showText: false, title: "Expand all", icon: "icon-tree-expand-all" },
                { id: "collaps-all", showText: false, title: "Collapese all", icon: "icon-tree-collapse-all" },
            ];
            var menubarOptions = {
                items: menuItems,
                executeAction: function (args) {
                    var command = args.get_commandName();
                    switch (command) {
                        case "show-recursive":
                            view._showRecursive = !view._showRecursive;
                            menubar.updateCommandStates([{ id: command, toggled: view._showRecursive }]);
                            view._callback(view._currentSource, view._currentNode.config, view._showRecursive);
                            break;
                        case "expand-all":
                            ExpandTree(view._treeview, true);
                            break;
                        case "collaps-all":
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
        return TreeviewView;
    })();
    exports.TreeviewView = TreeviewView;
    function LoadTreeview(pivot, treeview) {
        TreeViewDataService.getNodes(pivot).then(function (data) {
            treeview.rootNode.clear();
            treeview.rootNode.addRange(data);
            treeview._draw();
        });
    }
    function ExpandTree(tree, nodeExpansion) {
        UtilsUI.walkTree.call(tree.rootNode, function (n) {
            var elem = tree._getNodeElement(n);
            tree._setNodeExpansion(n, elem, nodeExpansion);
        });
    }
});
//# sourceMappingURL=TreeViewView.js.map