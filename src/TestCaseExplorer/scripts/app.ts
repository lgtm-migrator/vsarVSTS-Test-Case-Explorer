/// <reference path='ref/jquery.d.ts' />
/// <reference path='ref/VSS.d.ts' />

import Controls = require("VSS/Controls");
import TreeView = require("VSS/Controls/TreeView");
import CommonControls = require("VSS/Controls/Common");

// initialise the TreeViewView 
InitTreeViewView();

import TestCaseView = require("scripts/TestCaseView");
var tc = new TestCaseView.TestCaseView();
tc.initialize();

function InitTreeViewView() {

    var cboSources = ["Area path","Iteration path","Priority", "State", "Test plan", "Team"];

        // Converts the source to TreeNodes
    function convertToTreeNodes(items) {
        return $.map(items, function (item) {
            var node = new TreeView.TreeNode(item.name);
            node.icon = item.icon;
            node.expanded = item.expanded;
            if (item.children && item.children.length > 0) {
                node.addRange(convertToTreeNodes(item.children));
            }
            return node;
        });
    }


    var cbo = Controls.create(CommonControls.Combo, $("#treeview-Cbo-container"), {
        source: cboSources
    });
    cbo.setText(cboSources[0]);

    // Generate TreeView options
    var treeOptions = {
        width: 400,
        height: "100%",
        nodes: convertToTreeNodes(getNodes(cbo.getText()))
    };
    

    var treeview = Controls.create(TreeView.TreeView, $("#treeview-container"), treeOptions);
    treeview.onItemClick = function (node: TreeView.TreeNode, nodeElement: any, e?: JQueryEventObject): void {
        $("#treeview-value").text( node.title);
    };

        
    $("#treeview-Cbo-container").change(function () {
        //treeview.removeNode(treeview.rootNode);
        treeview.rootNode = convertToTreeNodes(getNodes(cbo.getText()));

       // treeview.setDataSource(convertToTreeNodes(getNodes(cbo.getText())));

        //treeOptions.nodes = convertToTreeNodes(getNodes(cbo.getText()));

        //Controls.create(TreeView.TreeView, $("#treeview-container"), treeOptions);


    }); 

    function getNodes(param) {

        switch (param) {
            case "Area path":
                return [
                    {
                        name: "Project", icon: "icon icon-people", children: [
                            { name: "Area 1" },
                            { name: "Area 2" },
                            { name: "Area 3" },
                            { name: "Area 4" }],
                        expanded: true
                    }
                ];
                break;
            case "Iteration path":
                return [
                    {
                        name: "Project", icon: "icon icon-people", children: [
                            { name: "Iteration 1" },
                            { name: "Iteration 2" },
                            { name: "Iteration 3" },
                            { name: "Iteration 4" }],
                        expanded: true
                    }
                ];
                break;
            case "Priority":
                return [
                    {
                        name: "1"
                    },
                    {
                        name: "2"
                    },
                    {
                        name: "3"
                    }]; 
                break;
        }

    }

}
