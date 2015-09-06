/// <reference path='ref/jquery.d.ts' />
/// <reference path='ref/VSS.d.ts' />
/// <reference path='TreeViewDataService.ts' />
define(["require", "exports", "VSS/Controls", "VSS/Controls/Grids", "VSS/Controls/Menus", "VSS/Controls/TreeView", "VSS/Controls/Common", "TreeViewDataService", "TFS/WorkItemTracking/RestClient"], function (require, exports, Controls, Grids, Menus, TreeView, CommonControls, TreeViewDataService, RestClient) {
    var menuItems = [
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
    var menubar = Controls.create(Menus.MenuBar, $("#menu-container"), menubarOptions);
    var dataSource = [];
    dataSource.push({ id: "5214", title: "User should be able to...", state: "Design", assigned_to: "Kapil Rata", priority: "1", automation_status: "Planned" });
    dataSource.push({ id: "5215", title: "Main page of Phone should...", state: "Active", assigned_to: "Kapil Rata", priority: "1", automation_status: "Planned" });
    var client = RestClient.getClient();
    //client.queryByWiql()
    //client.queryByWiql(
    var options = {
        height: "1000px",
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
    var grid = Controls.create(Grids.Grid, $("#grid-container"), options);
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
            TreeViewDataService.getNodes(cbo.getText()).then(function (data) {
                treeOptions.nodes = data;
                var treeview = Controls.create(TreeView.TreeView, $("#treeview-container"), treeOptions);
                treeview.onItemClick = function (node, nodeElement, e) {
                    $("#treeview-value").text(node.text);
                };
            });
            // treeview.setDataSource(convertToTreeNodes(getNodes(cbo.getText())));
            //treeOptions.nodes = convertToTreeNodes(getNodes(cbo.getText()));
            //Controls.create(TreeView.TreeView, $("#treeview-container"), treeOptions);
        });
    }
});
//# sourceMappingURL=app.js.map