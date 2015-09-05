/// <reference path='ref/jquery.d.ts' />
/// <reference path='ref/VSS.d.ts' />

import Controls = require("VSS/Controls");
import Grids = require("VSS/Controls/Grids");
import Menus = require("VSS/Controls/Menus");


import TreeView = require("VSS/Controls/TreeView");
import CommonControls = require("VSS/Controls/Common");

var menuItems: Menus.IMenuItemSpec[] = [
    { id: "file", text: "New", icon: "icon-add-small" },
    { separator: true }, 
    { id: "clone", text: "Clone", noIcon: true },
    { separator: true }, 
    { id: "column_options", text: "Column Options", noIcon: true },
    { id: "toggle", showText: true, icon: "icon-add-small", cssClass: "right-align" },
];

var menubarOptions = {
    items: menuItems
};

var menubar = Controls.create<Menus.MenuBar, any>(Menus.MenuBar, $("#menu-container"), menubarOptions);

var dataSource = [];
dataSource.push({ id: "5214", title: "User should be able to...", state: "Design", assigned_to: "Kapil Rata", priority: "1", automation_status: "Planned" });
dataSource.push({ id: "5215", title: "Main page of Phone should...", state: "Active", assigned_to: "Kapil Rata", priority: "1", automation_status: "Planned" });


import RestClient = require("TFS/WorkItemTracking/RestClient");
var client = RestClient.getClient();
//client.queryByWiql()
//client.queryByWiql(

var options = {
    height: "1000px", // Explicit height is required for a Grid control
    columns: [
        // text is the column header text. 
        // index is the key into the source object to find the data for this column
        // width is the width of the column, in pixels
        { text: "Id", index: "id", width: 50 },
        { text: "Title", index: "title", width: 150 },
        { text: "State", index: "state", width: 50 },
        { text: "Assigned To", index: "assigned_to", width: 75 },
        { text: "Priority", index: "priority", width: 50 },
        { text: "Automation status", index: "automation_status", width: 75 }
    ],
    // This data source is rendered into the Grid columns defined above
    source: dataSource
};


// initialise the TreeViewView 
InitTreeViewView();

// Create the grid in a container element
var grid = Controls.create<Grids.Grid, Grids.IGridOptions>(Grids.Grid, $("#grid-container"), options);


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