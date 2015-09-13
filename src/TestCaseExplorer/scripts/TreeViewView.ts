/// <reference path='ref/jquery.d.ts' />
/// <reference path='ref/VSS.d.ts' />

import Controls = require("VSS/Controls");
import TreeView = require("VSS/Controls/TreeView");
import CommonControls = require("VSS/Controls/Common");

import TreeViewDataService = require("scripts/TreeViewDataService");


export interface TreeviewSelectedCallback{ (type: string, value: string): void }

export class TreeviewView {
    public initialize(callback: TreeviewSelectedCallback) {
        var cboSources = ["Area path", "Iteration path", "Priority", "State", "Test plan", "Team"];

        var cbo = Controls.create(CommonControls.Combo, $("#treeview-Cbo-container"),  {
            mode: "drop",
            allowEdit: false, 
            source: cboSources
        });
        cbo.setText(cboSources[0]);

        var treeOptions = {
            width: 400,
            height: "100%",
            nodes: null
        };

        var treeview = Controls.create(TreeView.TreeView, $("#treeview-container"), treeOptions);
        treeview.onItemClick = function (node, nodeElement, e) {
            callbackFunction(cbo.getText(), node.text);
        };

        var callbackFunction: TreeviewSelectedCallback = callback
        $("#treeview-Cbo-container").change(function () {
            TreeViewDataService.getNodes(cbo.getText()).then(function (data) {
                treeview.rootNode.clear();
                treeview.rootNode.addRange( data);
                
                treeview._draw();
            });
        });
    }
}