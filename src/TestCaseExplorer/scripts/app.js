/// <reference path='ref/jquery.d.ts' />
/// <reference path='ref/VSS.d.ts' />
define(["require", "exports", "VSS/Controls", "VSS/Controls/Grids", "VSS/Controls/Menus", "VSS/Controls/TreeView", "VSS/Controls/Common", "TFS/WorkItemTracking/RestClient", "TFS/WorkItemTracking/Contracts", "TFS/TestManagement/RestClient", "TFS/WorkItemTracking/RestClient"], function (require, exports, Controls, Grids, Menus, TreeView, CommonControls, RestClient, Contracts, TestClient, WITClient) {
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
            //treeview.removeNode(treeview.rootNode);
            getNodes(cbo.getText()).then(function (data) {
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
    function getTestPlans() {
        // Get an instance of the client
        var deferred = $.Deferred();
        var tstClient = TestClient.getClient();
        tstClient.getPlans(VSS.getWebContext().project.name).then(function (data) {
            var d = [{
                    name: "Test plans", children: $.map(data, function (item) {
                        return { name: item.name };
                    })
                }];
            var d2 = convertToTreeNodes(d);
            deferred.resolve(d2);
        });
        return deferred.promise();
    }
    function getStructure(structure) {
        var deferred = $.Deferred();
        var client = WITClient.getClient();
        client.getClassificationNode(VSS.getWebContext().project.name, structure, null, 7).then(function (data) {
            var d = [];
            d.push(data);
            deferred.resolve(convertToTreeNodes(d));
        });
        //TODO - getClasification Node doesnt work as expected with areapath
        return deferred.promise();
    }
    function getStates() {
        var deferred = $.Deferred();
        var client = WITClient.getClient();
        var project = VSS.getWebContext().project.name;
        client.getWorkItemTypeCategory(project, "Microsoft.TestCaseCategory").then(function (witCat) {
            client.getWorkItemType(project, witCat.defaultWorkItemType.name).then(function (data) {
                var d = data;
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
    function getPrioriy() {
        var deferred = $.Deferred();
        var client = WITClient.getClient();
        client.getWorkItemType(VSS.getWebContext().project.name, "Test case").then(function (data) {
            var d = [{ name: "Priority", children: [{ name: "1" }, { name: "2" }, { name: "3" }, { name: "4" }] }];
            deferred.resolve(convertToTreeNodes(d));
        });
        return deferred.promise();
    }
    // Converts the source to TreeNodes
    function convertToTreeNodes(items) {
        var a = [];
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
});
//# sourceMappingURL=app.js.map