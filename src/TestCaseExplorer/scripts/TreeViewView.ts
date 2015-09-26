/// <reference path='ref/jquery.d.ts' />
/// <reference path='ref/VSS.d.ts' />

import Controls = require("VSS/Controls");
import TreeView = require("VSS/Controls/TreeView");
import CommonControls = require("VSS/Controls/Common");

import TreeViewDataService = require("scripts/TreeViewDataService");


export interface TreeviewSelectedCallback{ (type: string, value: string): void }

export class TreeviewView {
    public initialize(callback: TreeviewSelectedCallback) {
        var cboSources = ["Area path", "Iteration path", "Priority", "State", "Test plan"];

        var cbo = Controls.create(CommonControls.Combo, $("#treeview-Cbo-container"),  {
            mode: "drop",
            allowEdit: false, 
            source: cboSources
        });


        var treeOptions = {
            width: 400,
            height: "100%",
            nodes: null
        };

        var treeview = Controls.create(TreeView.TreeView, $("#treeview-container"), treeOptions);
        treeview.onItemClick = function (node, nodeElement, e) {
            callback(cbo.getText(), node.config);
        };


        //Hock up chnage for cbo to redraw treeview
        $("#treeview-Cbo-container").change(function () {
            LoadTreeview(cbo.getText(), treeview);
            VSS.getService<IExtensionDataService>(VSS.ServiceIds.ExtensionData).then(function (dataService) {
                // Set value in user scope
                dataService.setValue("SelectedPivot", cbo.getText(), { scopeType: "User" }).then(function (selectedPivot: any) {
                });
            });

        });
      
      
      

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

    
}

function LoadTreeview(pivot:string, treeview:TreeView.TreeView) {
    TreeViewDataService.getNodes(pivot).then(function (data) {
        treeview.rootNode.clear();
        treeview.rootNode.addRange(data);

        treeview._draw();

    });    
}