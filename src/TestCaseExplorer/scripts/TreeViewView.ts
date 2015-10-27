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

/// <reference path='ref/jquery.d.ts' />
/// <reference path='ref/VSS.d.ts' />

import Controls = require("VSS/Controls");
import TreeView = require("VSS/Controls/TreeView");
import StatusIndicator = require("VSS/Controls/StatusIndicator");

import Menus = require("VSS/Controls/Menus");
import CtrlCombos = require("VSS/Controls/Combos");
import TreeViewDataService = require("scripts/TreeViewDataService");
import UtilsUI = require("VSS/Utils/UI");

export interface TreeviewSelectedCallback{ (type: string, value: string, showRecursive: boolean): void }

export class TreeviewView {

    private _showRecursive: boolean;
    private _menubar: Menus.MenuBar;
    private _treeview: TreeView.TreeView;
    private _callback: TreeviewSelectedCallback;
    private _currentNode: TreeView.TreeNode;
    private _currentSource: string;
    private _waitControl: StatusIndicator.WaitControl;

    public initialize(callback: TreeviewSelectedCallback) {

        var view = this;
        view._showRecursive = false;
        view._callback = callback;
        var cboSources = ["Area path", "Iteration path", "Priority", "State", "Test plan"];

        var cbo = Controls.create(CtrlCombos.Combo, $("#treeview-Cbo-container"),  {
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
                view._callback(view._currentSource, view._currentNode.config, view._showRecursive);
            }
        };

        //Hock up chnage for cbo to redraw treeview
        $("#treeview-Cbo-container").change(function () {
            view.StartLoading(true, "Loading pivot data");
            LoadTreeview(cbo.getText(), treeview);
            VSS.getService<IExtensionDataService>(VSS.ServiceIds.ExtensionData).then(function (dataService) {
                // Set value in user scope
                dataService.setValue("SelectedPivot", cbo.getText(), { scopeType: "User" }).then(function (selectedPivot: any) {
                    view.DoneLoading();
                });
            });

        });
        view._treeview = treeview;
        
        //Add toolbar
        this.initMenu(this);

        //Initilaizer def value
        VSS.getService<IExtensionDataService>(VSS.ServiceIds.ExtensionData).then(function (dataService) {
            // Set value in user scope
            dataService.getValue("SelectedPivot", { scopeType: "User" }).then(function (selectedPivot: any) {
                if (selectedPivot == null || selectedPivot=="") {
                    selectedPivot = cboSources[0];
                }
                cbo.setText(selectedPivot);
                LoadTreeview(cbo.getText(), treeview);

            })
        });
    }
    
    private initMenu(view: TreeviewView) {
        //var menuItems: Menus.IMenuItemSpec[] = [
        var menuItems: any[] = [
            { id: "show-recursive", showText: false, title: "Show tests from child suites",  icon: VSS.getExtensionContext().baseUri + "/img/Child-node-icon.png" },
            { id: "expand-all", showText: false, title: "Expand all", icon: "icon-tree-expand-all" },
            { id: "collapse-all", showText: false, title:"Collapse all", icon: "icon-tree-collapse-all" },
        ];

        var menubarOptions = {
            items: menuItems,
            executeAction: function (args) {
                var command = args.get_commandName();
                switch (command) {
                    case "show-recursive":
                        view._showRecursive = !view._showRecursive
                        menubar.updateCommandStates([{ id: command, toggled: view._showRecursive }]);
                        view._callback(view._currentSource, view._currentNode.config, view._showRecursive);
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

        var menubar = Controls.create<Menus.MenuBar, any>(Menus.MenuBar, $("#treeview-menu-container"), menubarOptions);
        this._menubar = menubar;
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

}

function LoadTreeview(pivot:string, treeview:TreeView.TreeView) {
    TreeViewDataService.getNodes(pivot).then(function (data) {
        treeview.rootNode.clear();
        treeview.rootNode.addRange(data);
        treeview._draw();

        var n = treeview.rootNode;

        var elem = treeview._getNodeElement(n);
        treeview._setNodeExpansion(n, elem, true);

        treeview.rootNode.children.forEach(n=> {
            var elem = treeview._getNodeElement(n);
            treeview._setNodeExpansion(n, elem, true);
        });
        this.DoneLoading();
    });    
}

function ExpandTree(tree:TreeView.TreeView, nodeExpansion:boolean) {
    UtilsUI.walkTree.call(tree.rootNode, n=> {
        var elem = tree._getNodeElement(n);
        tree._setNodeExpansion(n, elem, nodeExpansion);
    });
}