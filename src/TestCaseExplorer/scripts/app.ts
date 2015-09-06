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

    var cboSources = ["Area path", "Iteration path", "Priority", "State", "Test plan", "Team"];

   


    var cbo = Controls.create(CommonControls.Combo, $("#treeview-Cbo-container"), {
        source: cboSources
    });
    cbo.setText(cboSources[0]);

    // Generate TreeView options
    var treeOptions = {
        width: 400,
        height: "100%",
        nodes: null
    };




    $("#treeview-Cbo-container").change(function () {
        //treeview.removeNode(treeview.rootNode);
        getNodes(cbo.getText()).then(function (data) {

            treeOptions.nodes = data;

            var treeview = Controls.create(TreeView.TreeView, $("#treeview-container"), treeOptions);
            treeview.onItemClick = function (node: TreeView.TreeNode, nodeElement: any, e?: JQueryEventObject): void {
                $("#treeview-value").text(node.text);
            };
            
            
        });

        // treeview.setDataSource(convertToTreeNodes(getNodes(cbo.getText())));

        //treeOptions.nodes = convertToTreeNodes(getNodes(cbo.getText()));

        //Controls.create(TreeView.TreeView, $("#treeview-container"), treeOptions);


    });
}


    import Contracts = require("TFS/WorkItemTracking/Contracts");

    function getNodes(param) {
        
        switch (param) {
            case "Area path":
                return getStructure(Contracts.TreeStructureGroup.Areas);
                break;
            case "Iteration path":
                return getStructure(Contracts.TreeStructureGroup.Iterations);
                break;
            case "Priority":
                return getPrioriy();
                break;
            case "State":
                return getStates();
                break;
            case "Test plan":
                return getTestPlans();
                break;
        }

    }





    import TestClient = require("TFS/TestManagement/RestClient");
    import WITClient = require("TFS/WorkItemTracking/RestClient");



function getTestPlans(): IPromise<TreeView.TreeNode[]> {
    // Get an instance of the client
    var deferred = $.Deferred<TreeView.TreeNode[]>();

    var tstClient = TestClient.getClient();
    tstClient.getPlans(VSS.getWebContext().project.name).then(function (data) {

        var d = [{
            name: "Test plans", children: $.map(data, function (item) {
                return { name: item.name };
            })
        }];
        var d2 = convertToTreeNodes(d)
        deferred.resolve(d2);
    });
    return deferred.promise();
}

function getStructure(structure: Contracts.TreeStructureGroup): IPromise<TreeView.TreeNode[]>
{
    var deferred = $.Deferred<TreeView.TreeNode[]>();

    var client = WITClient.getClient();
    client.getClassificationNode(VSS.getWebContext().project.name, structure, null, 7).then(function (data) {
        
        var d = [];

        d.push(data);
        deferred.resolve(convertToTreeNodes(d));

    });
    
    //TODO - getClasification Node doesnt work as expected with areapath

  
    return deferred.promise();
}

function getStates(): IPromise<TreeView.TreeNode[]> {
    var deferred = $.Deferred<TreeView.TreeNode[]>();

    var client = WITClient.getClient();
    var project = VSS.getWebContext().project.name;

    client.getWorkItemTypeCategory(project,  "Microsoft.TestCaseCategory").then(function (witCat) {

        client.getWorkItemType(project, witCat.defaultWorkItemType.name).then(function (data) {
            var d: any = data;

            var t = { name: "States", children: [] };
            for (var s in d.transitions) {
                t.children.push({ name: s });
            }

            var t2 = [];
            t2.push(t);
            deferred.resolve(convertToTreeNodes(t2));
        });
    });
    
      return deferred.promise();
}

function getPrioriy(): IPromise<TreeView.TreeNode[]> {
    var deferred = $.Deferred<TreeView.TreeNode[]>();

    var client = WITClient.getClient();
    client.getWorkItemType(VSS.getWebContext().project.name, "Test case").then(function (data) {
        var d = [{ name: "Priority", children: [{ name: "1" }, { name: "2" }, { name: "3" }, { name: "4" }] }];
        
        deferred.resolve(convertToTreeNodes(d));
    });
    
    return deferred.promise();
}

// Converts the source to TreeNodes
function convertToTreeNodes(items): TreeView.TreeNode[] {
    var a: TreeView.TreeNode[] = [];
    items.forEach(function (item) {
        var node = new TreeView.TreeNode(item.name);
        node.icon = item.icon;
        node.expanded = item.expanded;
        if (item.children && item.children.length > 0) {
            node.addRange(convertToTreeNodes(item.children));
        }
        a.push(node);
    });
    return a;
}