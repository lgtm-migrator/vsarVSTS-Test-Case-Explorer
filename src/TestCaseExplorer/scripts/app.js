/// <reference path='ref/jquery.d.ts' />
/// <reference path='ref/VSS.d.ts' />
define(["require", "exports", "VSS/Controls", "VSS/Controls/Grids", "VSS/Controls/Menus", "TFS/WorkItemTracking/RestClient", "TFS/TestManagement/RestClient"], function (require, exports, Controls, Grids, Menus, RestClient, RestTestClient) {
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
    var queryText = "SELECT [System.Id], [System.Links.LinkType], [System.WorkItemType], [System.Title], [System.AssignedTo], [System.State], [System.Tags] FROM WorkItemLinks WHERE ([Source].[System.TeamProject] = @project  AND  [Source].[System.WorkItemType] = 'Test Case'  AND  [Source].[System.State] <> '') And ([System.Links.LinkType] <> '') And ([Target].[System.WorkItemType] IN GROUP 'Requirement Category') ORDER BY [System.Id] mode(DoesNotContain)";
    //client.getWorkItems(
    client.queryByWiql({ query: queryText }, "FeaturesInc").then(function (result) {
        var x = result.workItems;
    });
    var c = RestTestClient.getClient();
    //c.getTestCases(
    //client.queryByWiql(x, "FeaturesInc");
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
    // Create the grid in a container element
    var grid = Controls.create(Grids.Grid, $("#grid-container"), options);
});
//# sourceMappingURL=app.js.map